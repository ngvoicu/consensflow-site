#!/usr/bin/env node
/**
 * Makes assets/screenshots/ from the app itself, against a ConsensFlow
 * checkout with a built `cf` (`npm run build:cf` puts it in bin/):
 *
 *   node tools/capture-screenshots.mjs ../consensflow
 *
 * The app's window is a web page (app/ui) that talks to the daemon through
 * the app's bridge. Here the page is served from the checkout, as the app's
 * own page tests serve it, and opened in Chromium: the board in a wide
 * window, the dialogs in a narrow one.
 *
 * - The board, a task, the staff and New project show the demo in
 *   tools/demo.mjs, answered to the page by the same stand-in for the app the
 *   page tests use. No agent runs, so no terminal is shown: the terminals are
 *   folded.
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
import { demo } from './demo.mjs'

const checkout = resolve(process.argv[2] ?? '../consensflow')
const OUT = fileURLToPath(new URL('../assets/screenshots/', import.meta.url))
const { chromium } = createRequire(join(checkout, 'app', 'package.json'))('playwright')
const { serveUi } = await import(pathToFileURL(join(checkout, 'app', 'tests', 'serve-ui.mjs')))

/** The app's window as the board shows in it, at twice the pixels for sharp text. */
const WINDOW = { width: 1440, height: 900 }
/**
 * The window narrowed for the dialogs, which take its width (less a margin):
 * their text then reads at the size the page shows them. The app's own
 * narrowest is 560 (app/src-tauri/tauri.conf.json).
 */
const NARROW = { width: 640, height: 1000 }

/**
 * The app as the page sees it (`window.__TAURI__`): `daemon_request` answers
 * the demo's board, and forwards what the real daemon serves (the agents).
 * Adapted from consensflow/app/tests/core-page.spec.mjs.
 */
function standIn({ data, screens, forward }) {
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
  }
  const invoke = async (command, args = {}) => {
    if (command === 'daemon_request') {
      if (forward.includes(args.operation)) return window.__daemon(args.operation, args.body)
      const handle = operations[args.operation]
      return handle ? handle(args.body) : { ok: true }
    }
    if (command === 'agents_screen') {
      return { ok: true, url: `${screens.url}/${args.page}?token=${screens.token}` }
    }
    if (command.startsWith('update_')) return { ok: false, error: 'no updates here' }
    return { ok: true }
  }
  class Channel {
    onmessage = null
  }
  // The terminals start folded, as the human can leave them.
  localStorage.setItem('cf.layout.dock', 'hidden')
  window.__TAURI__ = {
    core: { invoke, Channel },
    event: { listen: async () => () => {} },
    dialog: { open: async () => data.newFolder },
    test: {
      createEmulator: (host) => ({
        host,
        write: async () => {},
        onData: () => ({ dispose() {} }),
        fit() {},
        dispose() {},
      }),
    },
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
    viewport: WINDOW,
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
  })
  await page.goto(`${ui.origin}/index.html`)
  await page.locator('body[data-ready="true"]').waitFor()
  await page.mouse.move(0, WINDOW.height - 1)

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

  // The board, every row of it: the window as tall as the board needs.
  await page.locator('.kanban').waitFor()
  const tall = await page.evaluate(() => {
    const board = document.querySelector('#board')
    return Math.ceil(board.getBoundingClientRect().top + board.scrollHeight + 2)
  })
  await page.setViewportSize({ width: WINDOW.width, height: Math.max(WINDOW.height, tall) })
  await shot('board')
  await page.setViewportSize(WINDOW)

  // A task, open: its brief and its result, down to what may be done with it.
  await page.locator('.card[data-task="2"]').click()
  const drawer = page.locator('#task-drawer:not([hidden])')
  await drawer.locator('.story').waitFor()
  const { clip } = await around(drawer)
  const actions = await drawer.locator('.drawer-actions').boundingBox()
  clip.height = Math.ceil(actions.y + actions.height + 26) - clip.y
  await shot('task', { clip })
  await drawer.getByRole('button', { name: 'Close the task' }).click()

  // The dialogs, in a narrow window.
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

  await context.close()
} finally {
  await browser.close()
  await ui.close()
  await daemon.close()
}
