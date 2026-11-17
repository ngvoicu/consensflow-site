#!/usr/bin/env node
/**
 * Makes assets/screenshots/ from the app itself, against a ConsensFlow
 * checkout whose app/ has its packages installed:
 *
 *   node tools/capture-screenshots.mjs ../../consensflow
 *
 * The app's window is a web page (app/ui) that talks to the daemon through
 * the app's bridge. Here the page is served from the checkout, as the app's
 * own page tests serve it, and opened in Chromium with its real terminals
 * (xterm, as the app has them):
 *
 * - The board, a task, the staff, the dialogs and the models their pickers
 *   offer show the demo in tools/demo.mjs, answered to the page by a stand-in
 *   for the app like the one the page tests use. The staff's roles are the
 *   checkout's own (app/tests/fixtures/roles.json, written from the daemon's
 *   table).
 * - The open windows show the screens in tools/screens.mjs, written for the
 *   demo as each harness draws a session at work: the stand-in hands each
 *   terminal its screen as the app hands it a window's output, for the size
 *   the terminal took. No harness runs.
 * - The specs viewer, History (with a search) and Project settings show the
 *   demo's specs folder (tools/specs.mjs), the chief's history and its settings.
 * - "Do with your own hands" is turned on from the chief's card, and the
 *   stand-in keeps it as the daemon would; then it is turned off again.
 * - Last, the chief is switched from its card, and the stand-in moves it as
 *   the daemon would: its new window opens on the handoff.
 *
 * No daemon runs, and nothing reads or writes ~/.consensflow or the real
 * harnesses.
 *
 * Names after the checkout limit what is written to those captures
 * (`node tools/capture-screenshots.mjs ../../consensflow specs history`); the
 * page goes through all of its steps either way.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { demo, names, panes, SWITCH } from './demo.mjs'
import { claudeOwnHands, codexChief, SCREENS } from './screens.mjs'

const checkout = resolve(process.argv[2] ?? '../../consensflow')
const only = new Set(process.argv.slice(3))
const OUT = fileURLToPath(new URL('../assets/screenshots/', import.meta.url))
const { chromium } = createRequire(join(checkout, 'app', 'package.json'))('playwright')
const { serveUi } = await import(pathToFileURL(join(checkout, 'app', 'tests', 'serve-ui.mjs')))
const roles = JSON.parse(readFileSync(join(checkout, 'app', 'tests', 'fixtures', 'roles.json'), 'utf8'))

/**
 * The app's window for the board beside the chief's terminal: wide enough
 * that the board's cards lie flat, at twice the pixels for sharp text.
 */
const HERO = { width: 1840, height: 1270 }
/** The app's window for its terminals, the board folded. */
const WINDOW = { width: 1600, height: 1000 }
/** The app's window for the specs viewer, which has a tree beside the file. */
const VIEWER = { width: 1280, height: 1180 }
/**
 * The window narrowed for the dialogs, which take its width (less a margin):
 * their text then reads at the size the page shows them. The app's own
 * narrowest is 560 (app/src-tauri/tauri.conf.json).
 */
const NARROW = { width: 640, height: 1000 }
/** The role groups open on the board in the first capture: the rest show folded, with their counts. */
const OPEN_FIRST = ['worker']

/**
 * The app as the page sees it (`window.__TAURI__`): `daemon_request` answers
 * the demo as the daemon would; the output subscription is kept, for the
 * windows' screens to come through it, and each terminal's size is kept as
 * the app would pass it to its window. Adapted from
 * consensflow/app/tests/core-page.spec.mjs.
 */
function standIn({ data, layout, groups }) {
  const answer = (value) => JSON.parse(JSON.stringify({ ok: true, ...value }))
  const lanes = (project) => data.boards[project].lanes
  const operations = {
    'projects.list': () => answer({ projects: data.projects }),
    'harnesses.missing': () => answer({ missing: [], roles: data.roles }),
    'staff.last': () => answer({ staff: data.lastStaff }),
    'board.get': ({ project }) => answer({ board: data.boards[project], roles: data.roles }),
    // What a harness lists of its models, by its program's name, as the daemon reads it.
    'models.get': ({ harness }) =>
      answer({
        harness,
        read: `0123456789abcdef.${harness}`,
        listing: data.models[harness],
        default: null,
        contributorWarning: null,
        switchHelp: null,
      }),
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
    // The project's wake-up calls, as the daemon says them: the interval in the largest unit that holds it whole.
    'wakeup.get': ({ project }) => {
      const saved = data.wakeUps[project]
      const [unit, size] = Object.entries({ days: 86_400_000, hours: 3_600_000, minutes: 60_000 }).find(
        ([, ms]) => saved.everyMs % ms === 0,
      )
      const words =
        'Do you still have work to do? If tasks are left on the board or in your plan, carry on.'
      return answer({
        wakeUp: {
          on: saved.on,
          everyMs: saved.everyMs,
          every: saved.everyMs / size,
          unit,
          text: saved.text ?? words,
          defaultText: saved.text === null,
        },
      })
    },
    // What the app says of specs for every project, and the Specmint it brings.
    'specs.get': () =>
      answer({
        app: { on: false },
        applied: { folder: '.specs', variant: 'core' },
        specmint: { version: '3.0.0', variants: [{ name: 'core', version: '3.0.0', about: 'Markdown specs' }] },
      }),
    // The specs folder, as the daemon reads it (app/tests/core-page.spec.mjs and specs-viewer.spec.mjs).
    'specs.present': () => answer({ present: true }),
    'specs.tree': () =>
      answer({ specs: { folder: data.specs.folder, found: true, entries: data.specs.entries } }),
    'specs.file': ({ path }) =>
      data.specs.files[path] === undefined
        ? { ok: false, error: `no file ${path} in the specs folder` }
        : answer({ file: data.specs.files[path] }),
    // Computer use, as the daemon reads it on a Mac where nothing is granted and Claude Code's is off.
    'computer_use.get': ({ project, directory }) =>
      answer({
        system: 'macos',
        grantsOf: null,
        permissions: { accessibility: false, screenRecording: false },
        harnesses: {
          'claude-code': { on: false, folder: directory ?? data.boards[project]?.project.directory },
          codex: { setUp: false },
        },
      }),
    // "Do with your own hands", kept on the project as the daemon keeps it.
    'project.own_hands': ({ project, ownHands }) => {
      data.boards[project].project.ownHands = ownHands
      return answer({ project: data.boards[project].project })
    },
    // What ConsensFlow keeps of a participant's conversations, as the daemon pages it: one list,
    // oldest first, and a search keeps the items that hold its words in any case
    // (app/tests/history-viewer.spec.mjs).
    'history.get': ({ handle, find, tools }) => {
      const history = data.histories[handle] ?? { items: [] }
      const holds = (text) => (text ?? '').toLowerCase().includes((find ?? '').toLowerCase())
      const items = history.items
        .filter((it) => tools || it.role !== 'tool')
        .filter((it) => !find || holds(it.text) || holds(it.header))
      return answer({ history: { items, older: null, newer: null, partial: false } })
    },
    // The chief goes on the harness and model picked, in a new window, as the daemon's switchChief leaves it.
    'chief.switch': ({ project, harness, model, effort }) => {
      const lane = lanes(project).find((l) => l.participant.role === 'chief')
      Object.assign(lane.participant, { harness, model, effort, modelName: model })
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
      default:
        return command.startsWith('update_') ? { ok: false, error: 'no updates here' } : { ok: true }
    }
  }
  class Channel {
    onmessage = null
  }
  for (const [name, value] of Object.entries(layout)) localStorage.setItem(`cf.layout.${name}`, value)
  for (const project of data.projects) {
    localStorage.setItem(`cf.board.groups.${project.id}`, JSON.stringify(groups))
  }
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
  await page.addInitScript(standIn, {
    data: { ...demo, roles },
    // The projects folded to their rail: the board and the terminals have the window.
    layout: { projects: 'hidden', dock: 'shown', board: 'shown', 'dock-share-of-window': '0.37' },
    groups: OPEN_FIRST,
  })
  await page.goto(`${ui.origin}/index.html`)
  await page.locator('body[data-ready="true"]').waitFor()
  await page.mouse.move(0, HERO.height - 1)

  const shot = async (name, options = {}) => {
    if (only.size > 0 && !only.has(name)) return
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
  const board = page.locator('#board')

  // The board, grouped by role, and the chief's terminal beside it.
  await page.locator('.terminal-card[data-role="chief"] .xterm').waitFor()
  await screensIn(['chief'])
  await shot('window')

  // The board alone, the terminals folded, in a window as tall as the board: its table, from its head.
  await page.locator('#toggle-dock').click()
  await page.setViewportSize({ width: 1180, height: 1000 })
  const table = board.locator('table').first()
  const fitBoard = async () => {
    await page.waitForTimeout(300)
    const tallBoard = await board.evaluate((element) => Math.ceil(element.getBoundingClientRect().top + element.scrollHeight + 8))
    await page.setViewportSize({ width: 1180, height: Math.max(900, tallBoard) })
    await page.waitForTimeout(300)
    await board.evaluate((element) => {
      element.scrollTop = 0
    })
  }
  // The workers' group: one out of quota with its backup taking its tasks, one on Vacation.
  await fitBoard()
  const workers = board.locator('tbody', { has: page.locator('.fold-group', { hasText: 'Workers' }) })
  await shot('vacation-backup', await around(workers))
  // The staff grouped by role: every group folded to its head, its count and what waits in it.
  const open = page.locator('.fold-group[aria-expanded="true"]')
  while ((await open.count()) > 0) await open.first().click()
  await fitBoard()
  await shot('staff-groups', await around(table))
  await page.setViewportSize(HERO)
  await page.locator('#toggle-dock').click()
  // The groups whose members' windows are shown below, open again.
  for (const role of ['worker', 'frontend']) {
    const name = roles.find((one) => one.id === role)
    await page.locator('.fold-group[aria-expanded="false"]', { hasText: `${name.label}s` }).click()
  }

  // The specs viewer: the Specs button on the board opens the project's specs folder.
  await page.setViewportSize(VIEWER)
  await page.locator('#specs-button').click()
  const viewer = page.getByRole('dialog', { name: /^Specs of/ })
  await viewer.waitFor()
  // It opens on the registry; a spec is chosen from the tree.
  await viewer.locator('.specs-file *').first().waitFor()
  await viewer.locator('.tree-file[data-path="shopping-list/SPEC.md"]').click()
  await viewer.locator('.specs-file h1').waitFor()
  await page.waitForTimeout(1200)
  await shot('specs', await around(viewer))
  await viewer.getByRole('button', { name: 'Close' }).click()

  // History, from the chief's window: everything kept of its conversations, searched for "time zone".
  await page.setViewportSize({ width: NARROW.width, height: 750 })
  await page
    .locator('.terminal-card[data-role="chief"]')
    .getByRole('button', { name: "Read everything kept of Chief of Staff's conversations" })
    .click()
  const history = page.getByRole('dialog', { name: 'History', exact: true })
  await history.waitFor()
  await history.locator('[name="history-find"]').fill('time zone')
  await history.locator('[name="history-find"]').press('Enter')
  await history.locator('.history-item').first().waitFor()
  await page.waitForTimeout(300)
  await shot('history', await around(history, 24))
  await history.getByRole('button', { name: 'Close' }).click()
  await page.setViewportSize(HERO)

  // A task, open, after some back and forth: its question and answer read too.
  await page.locator('.card[data-task="2"]').first().click()
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
  for (const key of ['t4', 't5', 't7']) {
    const session = demo.boards[1].lanes.find((lane) => lane.participant.handle === names.sessions[key]).participant
    const count = demo.boards[1].lanes.filter((lane) => lane.participant.memberId === session.memberId).length
    await page
      .getByRole('button', { name: `Show @${session.member}'s ${count} session${count === 1 ? '' : 's'}` })
      .click()
    await page.getByRole('button', { name: `Show @${session.member} · ${session.session}'s terminal` }).click()
  }
  await page.locator('#toggle-board').click()
  const stage = page.locator('#stage')
  await stage.evaluate((element) => {
    element.scrollLeft = 0
  })
  await screensIn(['chief', names.sessions.t4, names.sessions.t5, names.sessions.t7])
  // The chief beside the first of them; then the dock scrolled to the staff's three.
  await shot('chief-and-staff')
  await stage.evaluate((element) => {
    element.style.scrollSnapType = 'none'
    element.scrollLeft = element.scrollWidth
  })
  await page.waitForTimeout(200)
  await shot('staff-windows')
  await stage.evaluate((element) => {
    element.scrollLeft = 0
  })

  // "Do with your own hands", from the chief's card: the switch on, and the chief at work by itself.
  const chiefCard = page.locator('.terminal-card[data-role="chief"]')
  await chiefCard.getByRole('switch', { name: 'Do with your own hands' }).click()
  await chiefCard.locator('[role="switch"][aria-checked="true"]').waitFor()
  // A window only as tall as the chief's work, and the card alone.
  await page.setViewportSize({ width: 1100, height: 660 })
  await screensIn(['chief'], { screens: { chief: claudeOwnHands } })
  await page.mouse.move(0, 659)
  await shot('own-hands', await around(chiefCard))
  await page.setViewportSize(WINDOW)
  await chiefCard.getByRole('switch', { name: 'Do with your own hands' }).click()
  await chiefCard.locator('[role="switch"][aria-checked="false"]').waitFor()
  await page.locator('#toggle-board').click()

  // The dialogs, in a narrow window, the terminals folded.
  await page.locator('#toggle-dock').click()

  // Project settings: the staff in its nine roles, with a backup and a member on Vacation, and
  // Add a member with a harness, one of its models and an effort picked; the project's other
  // sections below it.
  // Tall enough that the dialog holds every section without scrolling.
  await page.setViewportSize({ width: NARROW.width, height: 5600 })
  await page.getByRole('button', { name: 'Project settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Project settings' })
  await settings.waitFor()
  const adding = settings.locator('fieldset.staff-add')
  await adding.locator('select[name="role"]').selectOption('worker')
  await adding.locator('select[name="memberHarness"]').selectOption('codex')
  await adding.locator('select[name="memberModel"]:not([disabled])').waitFor()
  await adding.locator('select[name="memberModel"]').selectOption('gpt-6.1-sol')
  await adding.locator('select[name="memberEffort"]').selectOption('high')
  await adding.locator('select[name="memberTier"]').selectOption('complex')
  await page.waitForTimeout(300)
  // Two captures of the one dialog, cut between its sections: the staff above, and below it
  // Compaction to Specs (the rules for the staff and computer use, which the page does not
  // tell, are left out).
  const { clip: whole } = await around(settings, 24)
  const sections = settings.locator('fieldset.project-section')
  const section = (name) => sections.filter({ has: page.locator('legend', { hasText: new RegExp(`^${name}$`, 'i') }) })
  const staffBottom = await sections.nth(0).boundingBox().then((box) => Math.ceil(box.y + box.height + 14))
  const restTop = await section('Compaction').boundingBox().then((box) => Math.floor(box.y - 14))
  const restBottom = await section('Specs').boundingBox().then((box) => Math.ceil(box.y + box.height + 14))
  await shot('staff', { clip: { ...whole, height: staffBottom - whole.y } })
  await shot('project-settings', {
    clip: { ...whole, y: restTop, height: restBottom - restTop },
  })
  await settings.getByRole('button', { name: 'Close' }).click()

  // A new project: its folder, the chief's harness, model and effort, read from the harness, and
  // the last project's staff. The dialog goes on with the sections Project settings has: cut after the staff.
  await page.getByRole('button', { name: 'New project' }).click()
  const fresh = page.getByRole('dialog', { name: 'New project' })
  await fresh.waitFor()
  await fresh.locator('select[name="chiefHarness"]').selectOption('claude-code')
  await fresh.locator('select[name="chiefModel"]:not([disabled])').waitFor()
  await fresh.locator('select[name="chiefModel"]').selectOption('claude-opus-5-5')
  await fresh.locator('select[name="chiefEffort"]').selectOption('xhigh')
  await page.waitForTimeout(300)
  const { clip: dialog } = await around(fresh, 24)
  const pickBottom = await fresh
    .locator('fieldset.staff-pick')
    .boundingBox()
    .then((box) => Math.ceil(box.y + box.height + 14))
  await shot('new-project', { clip: { ...dialog, height: pickBottom - dialog.y } })
  await fresh.getByRole('button', { name: 'Cancel' }).click()
  await page.setViewportSize(NARROW)

  // Switch the chief, from its card: to Codex, on GPT-6.1 Sol at max, the chief first writing down where things stand.
  await page.locator('#toggle-dock').click()
  await page.getByRole('button', { name: 'Switch the chief to another harness or model' }).click()
  const switching = page.getByRole('dialog', { name: 'Switch the chief' })
  await switching.waitFor()
  await switching.locator('select[name="chiefHarness"]').selectOption(SWITCH.harness)
  await switching.locator('select[name="chiefModel"]:not([disabled])').waitFor()
  await switching.locator('select[name="chiefModel"]').selectOption(SWITCH.model)
  await switching.locator('select[name="chiefEffort"]').selectOption(SWITCH.effort)
  await switching.getByLabel('First ask the chief to write down where things stand').check()
  await page.waitForTimeout(300)
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
}
