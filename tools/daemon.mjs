import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * The app's daemon (`cf ui --json --no-open` of a built ConsensFlow) on a home
 * made for the occasion under the system's temp folder: nothing of the real
 * home (~/.consensflow) or of the real harnesses is read or written. The five
 * harness commands on its PATH are stand-ins that only answer a version, so
 * the pickers offer the catalog's agents; none of them is ever run as an agent.
 *
 * Its first line is its handle (where its own pages are served, and their
 * token); after that, stdin and stdout are the app's bridge, JSON lines of
 * `{v, id, kind, op, body}`, which `request` speaks as the app does.
 */
export async function startDaemon(cf) {
  const root = mkdtempSync(join(tmpdir(), 'cfsite-'))
  const env = {
    HOME: join(root, 'home'),
    CONSENSFLOW_HOME: join(root, 'consensflow'),
    CLAUDE_CONFIG_DIR: join(root, 'home', '.claude'),
    CODEX_HOME: join(root, 'home', '.codex'),
    XDG_CONFIG_HOME: join(root, 'home', '.config'),
    PATH: join(root, 'bin'),
    CONSENSFLOW_BIN_DIR: join(root, 'consensflow', 'bin'),
  }
  for (const folder of [env.HOME, env.CONSENSFLOW_HOME, env.PATH]) {
    mkdirSync(folder, { recursive: true })
  }
  for (const command of ['claude', 'codex', 'pi', 'opencode', 'devin']) {
    writeFileSync(join(env.PATH, command), "#!/bin/sh\nprintf '1.2.3\\n'\n", { mode: 0o755 })
  }

  const child = spawn(cf, ['ui', '--json', '--no-open'], { env, stdio: ['pipe', 'pipe', 'pipe'] })
  let errors = ''
  child.stderr.on('data', (chunk) => {
    errors += chunk
  })
  const exited = new Promise((resolve) => child.once('exit', resolve))

  const pending = new Map()
  let handle = null
  let unread = ''
  const ready = new Promise((resolve, reject) => {
    child.stdout.on('data', (chunk) => {
      unread += chunk
      for (let end = unread.indexOf('\n'); end !== -1; end = unread.indexOf('\n')) {
        const line = unread.slice(0, end)
        unread = unread.slice(end + 1)
        if (line.trim() === '') continue
        if (handle === null) {
          handle = JSON.parse(line)
          resolve(handle)
          continue
        }
        const frame = JSON.parse(line)
        if (frame.kind === 'res' && pending.has(frame.id)) {
          pending.get(frame.id)(frame.body)
          pending.delete(frame.id)
        } else if (frame.kind === 'req') {
          // Nothing here opens a window: a request for one is refused.
          child.stdin.write(
            `${JSON.stringify({ v: 1, id: frame.id, kind: 'res', op: frame.op, body: { ok: false, error: 'no windows here' } })}\n`,
          )
        }
      }
    })
    exited.then(() => reject(new Error(`the daemon ended before it was ready: ${errors}`)))
  })
  await ready

  let sent = 0
  return {
    url: handle.url.replace(/\/$/, ''),
    token: handle.token,
    /** One of the page's operations, asked over the bridge as the app asks it. */
    request(op, body = {}) {
      sent += 1
      const id = `r-${sent}`
      const answered = new Promise((resolve) => pending.set(id, resolve))
      child.stdin.write(`${JSON.stringify({ v: 1, id, kind: 'req', op, body })}\n`)
      return answered
    },
    async close() {
      child.stdin.end()
      const stuck = setTimeout(() => child.kill('SIGKILL'), 5_000)
      await exited
      clearTimeout(stuck)
      rmSync(root, { recursive: true, force: true })
    },
  }
}
