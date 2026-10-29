#!/usr/bin/env node
/**
 * Checks that the two pages (the home page and Supported versions) open clean, at 1280 and 390 px, light and dark, in Chromium
 * (Playwright comes from a ConsensFlow checkout, as capture-screenshots.mjs has
 * it):
 *
 *   node tools/check-site.mjs ../../consensflow [folder for screenshots]
 *
 * Each page logs no error or warning, throws nothing, fails no request, loads
 * nothing from another origin, and does not scroll sideways. Every image on it
 * loads, and shows at the shape of its file (a screenshot remade at another
 * height must change its `height` too). No page names a
 * harness the app has removed, but Supported versions in its one line about it.
 * With a folder, it also takes each page whole. It starts no harness and reads
 * nothing from the machine. Exits 1 on the first failure.
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { serveSite } from './serve-site.mjs'

const checkout = resolve(process.argv[2] ?? '../../consensflow')
const shots = process.argv[3] && resolve(process.argv[3])
const { chromium } = createRequire(join(checkout, 'app', 'package.json'))('playwright')

const PAGES = [
  { path: '/', name: 'home', ready: 'h1' },
  { path: '/status/', name: 'status', ready: '.matrix' },
]
const VIEWPORTS = [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
]
const SCHEMES = ['light', 'dark']
/** The harness the app removed, which no page names but the one line of Supported versions. */
const REMOVED = ['open', 'code'].join('')
const SAID = 'OpenCode: supported up to 3.0.6; ConsensFlow 3.0.7 removed it.'

const ok = (what) => console.log(`ok  ${what}`)

const browser = await chromium.launch()
const server = await serveSite()
try {
  if (shots) mkdirSync(shots, { recursive: true })
  for (const page of PAGES) {
    for (const viewport of VIEWPORTS) {
      for (const colorScheme of SCHEMES) {
        const where = `${page.name} at ${viewport.width} px, ${colorScheme}`
        const context = await browser.newContext({ viewport, colorScheme })
        const tab = await context.newPage()
        const problems = []
        tab.on('console', (m) => {
          if (['error', 'warning'].includes(m.type())) problems.push(`console ${m.type()}: ${m.text()}`)
        })
        tab.on('pageerror', (e) => problems.push(`page error: ${e.message}`))
        tab.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`))
        tab.on('request', (r) => {
          if (!r.url().startsWith(server.url) && !r.url().startsWith('data:')) problems.push(`left the site: ${r.url()}`)
        })
        await tab.goto(`${server.url}${page.path}`)
        await tab.waitForSelector(page.ready)
        // A lazy image loads as it nears the screen: ask for every one, and wait for each to end.
        await tab.evaluate(() =>
          Promise.all(
            [...document.images].filter((img) => img.getAttribute('src')).map((img) => {
              img.loading = 'eager'
              return img.complete ? null : new Promise((done) => ['load', 'error'].forEach((event) => img.addEventListener(event, done, { once: true })))
            }),
          ),
        )
        await tab.waitForLoadState('networkidle')

        assert.deepEqual(problems, [], `${where}: logged or loaded something it should not`)
        const sideways = await tab.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        assert.ok(sideways <= 1, `${where}: scrolls sideways by ${sideways} px`)
        const images = await tab.evaluate(() =>
          [...document.images].filter((img) => img.getAttribute('src')).map((img) => ({
            src: img.getAttribute('src'),
            loaded: img.complete && img.naturalWidth > 0,
            declared: [Number(img.getAttribute('width')) || 0, Number(img.getAttribute('height')) || 0],
            natural: [img.naturalWidth, img.naturalHeight],
          })),
        )
        for (const img of images) {
          assert.ok(img.loaded, `${where}: ${img.src} did not load`)
          const [dw, dh] = img.declared
          const [nw, nh] = img.natural
          if (dw && dh) assert.ok(Math.abs(dw * nh - dh * nw) <= Math.max(dw, dh), `${where}: ${img.src} is ${nw}x${nh}, declared ${dw}x${dh}`)
        }
        const text = (await tab.locator('body').innerText()).replaceAll(SAID, '')
        assert.ok(!new RegExp(REMOVED, 'i').test(text), `${where}: names the removed harness`)
        const source = (await tab.content()).replace(/<script type="application\/json" id="status-data">[\s\S]*?<\/script>/, '').replaceAll(SAID, '')
        assert.ok(!new RegExp(REMOVED, 'i').test(source), `${where}: its markup names the removed harness`)
        if (page.name === 'status') assert.equal(await tab.locator('.other').innerText(), SAID, `${where}: the one line`)
        if (shots) await tab.screenshot({ path: join(shots, `${page.name}-${viewport.width}-${colorScheme}.png`), fullPage: true })
        await context.close()
        ok(`${where}: clean, ${images.length} images in shape`)
      }
    }
  }
} finally {
  await browser.close()
  await server.close()
}
