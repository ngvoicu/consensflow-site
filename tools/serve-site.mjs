#!/usr/bin/env node
/**
 * Serves the site, as GitHub Pages does (a folder's index.html, and a folder
 * without its slash sent to the one with it), for a local look and for the
 * checks that open a page in a browser:
 *
 *   node tools/serve-site.mjs [--port N]     then open http://localhost:4500/status/
 *
 * It serves the files of this repo and nothing else, and none whose path has a
 * part that starts with a dot.
 */
import { readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = resolve(fileURLToPath(new URL('..', import.meta.url)))
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
}

/** The file `path` names inside the site, or none. */
function fileFor(path) {
  const rel = normalize(decodeURIComponent(path)).replace(/^[/\\]+/, '')
  const file = resolve(SITE, rel)
  const hidden = rel.split(sep).some((part) => part.startsWith('.'))
  return file.startsWith(SITE + sep) && !hidden ? file : null
}

/** Starts the server on `port` (0: any). Resolves to its URL and a way to stop it. */
export function serveSite({ port = 0 } = {}) {
  const server = createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost')
    try {
      let file = fileFor(pathname)
      if (!file) throw new Error('outside the site')
      if (statSync(file).isDirectory()) {
        if (!pathname.endsWith('/')) {
          res.writeHead(301, { location: `${pathname}/` }).end()
          return
        }
        file = join(file, 'index.html')
      }
      if (!statSync(file).isFile()) throw new Error('not a file')
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' })
      res.end(readFileSync(file))
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain', 'cache-control': 'no-store' }).end('not found')
    }
  })
  return new Promise((done) => {
    server.listen(port, '127.0.0.1', () => {
      const url = `http://localhost:${server.address().port}`
      done({ url, close: () => new Promise((closed) => { server.close(closed); server.closeAllConnections() }) })
    })
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const at = process.argv.indexOf('--port')
  const { url } = await serveSite({ port: Number(at > 0 ? process.argv[at + 1] : 4500) })
  console.log(`${url}/  (try ${url}/status/)`)
  process.on('SIGINT', () => process.exit(0))
  process.on('SIGTERM', () => process.exit(0))
}
