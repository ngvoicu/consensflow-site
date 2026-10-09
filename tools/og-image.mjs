#!/usr/bin/env node
/**
 * Makes assets/og-image.png, the share card (1200x630), from tools/og-image.html:
 * the page's own fonts and mark, beside a crop of assets/screenshots/board.webp.
 * Run it after capture-screenshots.mjs, with the same checkout (for Playwright):
 *
 *   node tools/og-image.mjs ../consensflow
 */
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const checkout = resolve(process.argv[2] ?? '../consensflow')
const SITE = fileURLToPath(new URL('..', import.meta.url))
const { chromium } = createRequire(join(checkout, 'app', 'package.json'))('playwright')
const TYPES = { '.html': 'text/html', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' }

// The site's folder, served: a page opened from a file may not load its fonts.
const server = createServer(async (request, response) => {
  const file = resolve(SITE, decodeURIComponent(new URL(request.url, 'http://x').pathname.slice(1)))
  if (!file.startsWith(SITE.endsWith(sep) ? SITE : SITE + sep)) return response.writeHead(403).end()
  try {
    const body = await readFile(file)
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body)
  } catch {
    response.writeHead(404).end()
  }
})
await new Promise((listening) => server.listen(0, '127.0.0.1', listening))
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await page.goto(`http://127.0.0.1:${server.address().port}/tools/og-image.html`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: join(SITE, 'assets', 'og-image.png') })
  console.log('assets/og-image.png')
} finally {
  await browser.close()
  server.close()
}
