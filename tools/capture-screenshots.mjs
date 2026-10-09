#!/usr/bin/env node
/**
 * Makes assets/screenshots/ from the app itself, against a ConsensFlow
 * checkout with a built `cf` (`npm run build:cf` puts it in bin/):
 *
 *   node tools/capture-screenshots.mjs ../consensflow
 *
 * The app's window is a web page (app/ui) that talks to the daemon through
 * the app's bridge. Here the page is served from the checkout, as the app's
 * own page tests serve it, and opened in Chromium with its real terminals
 * (xterm, as the app has them):
 *
 * - The board, a task, the staff and New project show the demo in
 *   tools/demo.mjs, answered to the page by the same stand-in for the app the
 *   page tests use.
 * - The open windows show the screens in tools/screens.mjs, written for the
 *   demo as each harness draws a session at work: the stand-in hands each
 *   terminal its screen as the app hands it a window's output, for the size
 *   the terminal took. No harness runs.
 * - Last, the chief is switched from its card, and the stand-in moves it as
 *   the daemon would: its new window opens on the handoff.
 * - The agents the pickers offer, and the Agents screen under Settings, are
 *   the real daemon's (`cf ui`), started on a home made under the system's
 *   temp folder and thrown away after: the catalog as the app ships it.
 *
 * Nothing reads or writes ~/.consensflow or the real harnesses.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { startDaemon } from './daemon.mjs'
import { demo, panes, SWITCH } from './demo.mjs'
import { codexChief, SCREENS } from './screens.mjs'

const checkout = resolve(process.argv[2] ?? '../consensflow')
const OUT = fileURLToPath(new URL('../assets/screenshots/', import.meta.url))
const { chromium } = createRequire(join(checkout, 'app', 'package.json'))('playwright')
const { serveUi } = await import(pathToFileURL(join(checkout, 'app', 'tests', 'serve-ui.mjs')))

/**
 * The app's window for the board beside the chief's terminal: wide enough
 * that the board's cards lie flat (a column under 150px stacks them), at
 * twice the pixels for sharp text.
 */
const HERO = { width: 1840, height: 1270 }
/** The app's window for its terminals, the board folded. */
const WINDOW = { width: 1600, height: 1000 }
/**
 * The window narrowed for the dialogs, which take its width (less a margin):
 * their text then reads at the size the page shows them. The app's own
 * narrowest is 560 (app/src-tauri/tauri.conf.json).
 */
const NARROW = { width: 640, height: 1000 }

/**
 * The app as the page sees it (`window.__TAURI__`): `daemon_request` answers
 * the demo's board, and forwards what the real daemon serves (the agents);
 * the output subscription is kept, for the windows' screens to come through
 * it, and each terminal's size is kept as the app would pass it to its window.
 * Adapted from consensflow/app/tests/core-page.spec.mjs.
 */
function standIn({ data, screens, forward, layout }) {
  const answer = (value) => JSON.parse(JSON.stringify({ ok: true, ...value }))
  const operations = {
    'projects.list': () => answer({ projects: data.projects }),
    'staff.last': () => answer({ staff: data.lastStaff }),
    'board.get': ({ project }) => answer({ board: data.boards[project] }),
    'inbox.get': ({ project, unread }) => {
      const all = (data.inbox[project] ?? []).filter(
        (message) => !unread || (message.state === 'queued' && message.kind === 'note'),
      )
      return answer({ messages: all, total: all.length, shown: all.length })
    },
    'task.get': ({ project, task }) => {
      const found = data.tasks[`${project}:${task}`]
      return found === undefined
        ? { ok: false, error: `no task T-${task} in this project` }
        : answer({ task: found })
    },
    'task.transcript': ({ project, task }) => {
      const { items, total } = data.transcripts[`${project}:${task}`] ?? { items: [], total: 0 }
      return answer({ items, total, shown: items.length })
    },
    // The chief goes on the agent picked, in a new window, as the daemon's switchChief leaves it.
    'chief.switch': ({ project, agent }) => {
      const lane = data.boards[project].lanes.find((l) => l.participant.role === 'chief')
      lane.participant.agent = agent
      lane.participant.harness = data.switchTo.harness
      lane.pane = data.switchTo.pane
      lane.activity = { state: 'idle' }
      lane.switching = null
      return answer({ project: data.boards[project].project })
    },
  }
  window.__sizes = {}
  window.__acks = 0
  const invoke = async (command, args = {}) => {
    switch (command) {
      case 'daemon_request': {
        if (forward.includes(args.operation)) return window.__daemon(args.operation, args.body)
        const handle = operations[args.operation]
        return handle ? handle(args.body) : { ok: true }
      }
      case 'subscribe_output':
        window.__output = args.onOutput
        return { ok: true }
      case 'pane_resize':
        window.__sizes[`${args.id}:${args.generation}`] = { cols: args.cols, rows: args.rows }
        return { ok: true }
      case 'pane_ack':
        window.__acks += 1
        return { ok: true }
      case 'pane_input_enqueue':
      case 'pane_reply_enqueue':
        return { ok: true, ticket: 't' }
      case 'agents_screen':
        return { ok: true, url: `${screens.url}/${args.page}?token=${screens.token}` }
      default:
        return command.startsWith('update_') ? { ok: false, error: 'no updates here' } : { ok: true }
    }
  }
  class Channel {
    onmessage = null
  }
  for (const [name, value] of Object.entries(layout)) localStorage.setItem(`cf.layout.${name}`, value)
  window.__TAURI__ = {
    core: { invoke, Channel },
    event: { listen: async () => () => {} },
    dialog: { open: async () => data.newFolder },
  }
}

/** A PNG made smaller as WebP, lossless: text stays as sharp as it was drawn. */
function webp(png, name) {
  const file = join(OUT, `${name}.webp`)
  execFileSync('cwebp', ['-quiet', '-lossless', '-z', '9', '-metadata', 'none', png, '-o', file])
  rmSync(png)
  console.log(`${name}.webp  ${Math.round(statSync(file).size / 1024)} KB`)
}

const daemon = await startDaemon(join(checkout, 'bin', 'cf'))
const ui = await serveUi()
const browser = await chromium.launch()
try {
  mkdirSync(OUT, { recursive: true })
  const context = await browser.newContext({
    viewport: HERO,
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  })
  const page = await context.newPage()
  await page.exposeFunction('__daemon', (operation, body) => daemon.request(operation, body))
  await page.addInitScript(standIn, {
    data: demo,
    screens: { url: daemon.url, token: daemon.token },
    forward: ['agents.list'],
    // The projects folded to their rail: the board and the terminals have the window.
    layout: { projects: 'hidden', dock: 'shown', board: 'shown', 'dock-share-of-window': '0.37' },
  })
  await page.goto(`${ui.origin}/index.html`)
  await page.locator('body[data-ready="true"]').waitFor()
  await page.mouse.move(0, HERO.height - 1)

  const shot = async (name, options = {}) => {
    const png = join(OUT, `${name}.png`)
    await page.screenshot({ path: png, animations: 'disabled', ...options })
    webp(png, name)
  }
  /** Just `locator`, and `margin` px of the window around it: a dialog read at the size it is drawn. */
  const around = async (locator, margin = 0) => {
    const box = await locator.boundingBox()
    const { width, height } = page.viewportSize()
    const x = Math.max(0, Math.floor(box.x - margin))
    const y = Math.max(0, Math.floor(box.y - margin))
    return {
      clip: {
        x,
        y,
        width: Math.min(width, Math.ceil(box.x + box.width + margin)) - x,
        height: Math.min(height, Math.ceil(box.y + box.height + margin)) - y,
      },
    }
  }
  /**
   * Each window in the dock shown its screen, for the size its terminal took
   * once the layout settled (a terminal takes a new size 200 ms after it
   * holds, app/ui/term.js), as the app hands a window's output to the page.
   */
  let seq = 0
  const screensIn = async (handles, { windows = panes, screens = SCREENS } = {}) => {
    await page.waitForTimeout(700)
    const sizes = await page.evaluate(() => window.__sizes)
    const acked = await page.evaluate(() => window.__acks)
    for (const handle of handles) {
      const pane = windows[handle]
      const size = sizes[`${pane.id}:${pane.generation}`]
      if (!size) throw new Error(`no size for ${handle}'s terminal`)
      const bytes = Array.from(new TextEncoder().encode(screens[handle](size)))
      console.log(`  ${handle}: ${size.cols}x${size.rows}`)
      seq += 1
      await page.evaluate((message) => window.__output.onmessage(message), { ...pane, seq, bytes })
    }
    await page.waitForFunction((count) => window.__acks >= count, acked + handles.length)
    await page.waitForTimeout(150)
  }

  // The board, and the chief's terminal beside it.
  await page.locator('.kanban').waitFor()
  await page.locator('.terminal-card[data-role="chief"] .xterm').waitFor()
  await screensIn(['chief'])
  await shot('window')

  // A task, open, after some back and forth: its question and answer read too.
  await page.locator('.card[data-task="2"]').click()
  const drawer = page.locator('#task-drawer:not([hidden])')
  await drawer.locator('.story').waitFor()
  for (const kind of ['question', 'answer']) {
    await drawer.locator(`details.step[data-kind="${kind}"] > summary`).click()
  }
  // The window as tall as the drawer needs, so the whole thread is in it.
  const tall = await page.evaluate(() => {
    const open = document.querySelector('#task-drawer')
    return Math.ceil(open.getBoundingClientRect().top + open.scrollHeight + 4)
  })
  await page.setViewportSize({ width: HERO.width, height: Math.max(HERO.height, tall) })
  const { clip } = await around(drawer)
  const actions = await drawer.locator('.drawer-actions').boundingBox()
  clip.height = Math.ceil(actions.y + actions.height + 26) - clip.y
  await shot('task', { clip })
  await drawer.getByRole('button', { name: 'Close the task' }).click()
  await page.setViewportSize(WINDOW)

  // The staff's windows: shown from their rows, then the board folded for them.
  for (const [member, sessions, window_] of [
    ['theia', 2, 'theia · hazel-delta'],
    ['merope', 3, 'merope · brisk-reed'],
    ['audhumla', 1, 'audhumla · misty-glade'],
  ]) {
    await page.getByRole('button', { name: `Show @${member}'s ${sessions} session${sessions === 1 ? '' : 's'}` }).click()
    await page.getByRole('button', { name: `Show @${window_}'s terminal` }).click()
  }
  await page.locator('#toggle-board').click()
  const stage = page.locator('#stage')
  await stage.evaluate((element) => {
    element.scrollLeft = 0
  })
  await screensIn(['chief', 'theia-hazel-delta', 'merope-brisk-reed', 'audhumla-misty-glade'])
  // The chief beside the first of them; then the dock scrolled to the staff's three.
  await shot('chief-and-staff')
  await stage.evaluate((element) => {
    element.style.scrollSnapType = 'none'
    element.scrollLeft = element.scrollWidth
  })
  await page.waitForTimeout(200)
  await shot('staff-windows')

  // The dialogs, in a narrow window, the terminals folded.
  await page.locator('#toggle-dock').click()
  await page.setViewportSize(NARROW)

  // The staff: who works on the project, in which role.
  await page.getByRole('button', { name: 'Staff', exact: true }).click()
  const staff = page.getByRole('dialog', { name: 'Project staff' })
  await staff.waitFor()
  await shot('staff', await around(staff, 24))
  await staff.getByRole('button', { name: 'Close' }).click()

  // A new project: its folder, the agent its chief runs on, its staff.
  await page.getByRole('button', { name: 'New project' }).click()
  const fresh = page.getByRole('dialog', { name: 'New project' })
  await fresh.waitFor()
  const chief = fresh.locator('select[name="chief"]')
  await chief.selectOption('zeus')
  await chief.focus()
  await shot('new-project', await around(fresh, 24))
  await fresh.getByRole('button', { name: 'Cancel' }).click()

  // Settings, Agents: the daemon's own screen, the catalog as it ships.
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: 'Agents' }).click()
  const agents = page.getByRole('dialog', { name: 'Agents' })
  const screen = agents.frameLocator('iframe')
  await screen.locator('#agents .member').first().waitFor()
  // By work tier: what a task finds an agent by.
  await screen.locator('select[name="group"]').selectOption('tier')
  await screen.locator('#agents .member').first().waitFor()
  await shot('agents', await around(agents, 24))
  await agents.getByRole('button', { name: 'Close' }).click()

  // Switch the chief, from its card: to hyperion on Codex, zeus first writing down where things stand.
  await page.locator('#toggle-dock').click()
  await page.getByRole('button', { name: 'Switch the chief to another agent' }).click()
  const switching = page.getByRole('dialog', { name: 'Switch the chief' })
  await switching.waitFor()
  const picked = switching.getByLabel('The chief runs on')
  await picked.selectOption(SWITCH.agent)
  await switching.getByLabel('First ask the chief to write down where things stand').check()
  await picked.focus()
  await shot('switch-chief', await around(switching, 24))
  await switching.getByRole('button', { name: 'Switch', exact: true }).click()

  // The new chief's window, opening on its handoff: its card, beside the board, as tall as all of it.
  await page.setViewportSize({ width: 1760, height: 1052 })
  await page.locator('.terminal-card[data-role="chief"] .xterm').waitFor()
  await screensIn(['chief'], { windows: { chief: SWITCH.pane }, screens: { chief: codexChief } })
  await shot('new-chief', await around(page.locator('.terminal-card[data-role="chief"]')))

  await context.close()
} finally {
  await browser.close()
  await ui.close()
  await daemon.close()
}
