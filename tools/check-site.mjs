#!/usr/bin/env node
/**
 * Checks that the two pages (the home page and Supported versions) open clean,
 * at 1280 and 390 px, light and dark, in Chromium (Playwright comes from a
 * ConsensFlow checkout, as capture-screenshots.mjs has it):
 *
 *   node tools/check-site.mjs ../../consensflow [folder for screenshots]
 *
 * Each page logs no error or warning, throws nothing, fails no request, loads
 * nothing from another origin, and does not scroll sideways. Every image on it
 * loads, and shows at the shape of its file (a screenshot remade at another
 * height must change its `height` too). No page names a harness the app has
 * removed, in its text or its markup, and none qualifies a release by its stage.
 *
 * The home page names the five harnesses wherever it lists them (its meta and
 * share descriptions, both JSON-LD descriptions and the software it needs, and
 * the first section's row of them), and that row has each, in order: its logo
 * shown (the vendor's file, loaded, and no badge in its place), every box the
 * same size, and its name. The first section's two download buttons lead to
 * the installers of one release on GitHub (tools/downloads.mjs --check says
 * whether it is the alpha feed's), its two install lines are the alpha's, each
 * with a Copy that copies it, and no page says anything of keys or of
 * uninstalling. Each of those rules is then broken once on a copy of the page,
 * and the check must see it. The release's stage is named only in the download
 * links and the install lines, which are the alpha's (Gabriel, 2026-11-02).
 *
 * With a folder, it also takes each page whole, and the first section on its
 * own. It starts no harness and reads nothing from the machine. Exits 1 on
 * the first failure.
 */
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { serveSite } from './serve-site.mjs'

const checkout = resolve(process.argv[2] ?? '../../consensflow')
const shots = process.argv[3] && resolve(process.argv[3])
const { chromium } = createRequire(join(checkout, 'app', 'package.json'))('playwright')
const HOME = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8')

const PAGES = [
  { path: '/', name: 'home', ready: 'h1' },
  { path: '/status/', name: 'status', ready: '.matrix' },
]
const VIEWPORTS = [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
]
const SCHEMES = ['light', 'dark']
/** The harness the app removed, which no page names. */
const REMOVED = new RegExp(['open', 'code'].join(''), 'i')
/** A release qualified by its stage, which the site never does. */
const STAGE = /\b(alpha|beta|rc)\.\d|pre-?release/i

/** The harnesses the app runs, in its order (`Harness::ALL`). */
const HARNESSES = [
  { id: 'claude-code', name: 'Claude Code' },
  { id: 'codex', name: 'Codex' },
  { id: 'pi', name: 'Pi' },
  { id: 'devin', name: 'Devin' },
  { id: 'muse-code', name: 'Muse Code' },
]
/** The install lines, the alpha's, each in its own box with a Copy. */
const COMMANDS = [
  'curl -fsSL https://consensflow.ngvoicu.dev/install.sh | sh -s -- --alpha',
  "$env:CONSENSFLOW_CHANNEL = 'alpha'; irm https://consensflow.ngvoicu.dev/install.ps1 | iex",
]
/** Each download button's installer, in a release of the app on GitHub. */
const DOWNLOADS = {
  mac: /^https:\/\/github\.com\/ngvoicu\/consensflow\/releases\/download\/(v[^/]+)\/ConsensFlow_[^/]+_aarch64\.dmg$/,
  windows: /^https:\/\/github\.com\/ngvoicu\/consensflow\/releases\/download\/(v[^/]+)\/ConsensFlow_[^/]+_x64-setup\.exe$/,
}
/** What the page no longer says: the install scripts' key, their checks, uninstalling. */
const UNSAID = /uninstall|signing key|SHA256SUMS|RW[A-Za-z0-9+/]{50}/i
/** The places the home page lists the harnesses, each of which names all five. */
const LISTS = [
  ['the description', 'meta[name="description"]', 'content'],
  ['the share description', 'meta[property="og:description"]', 'content'],
  ['the X description', 'meta[name="twitter:description"]', 'content'],
  ['the first section\'s row', '.hero .harnesses'],
]
/** The smallest a mark may show, in CSS px: none is a dot. */
const SMALLEST = 32

const ok = (what) => console.log(`ok  ${what}`)

/** What is wrong with the home page's harnesses: none when it is right. */
async function harnessProblems(tab) {
  const problems = []
  const said = await tab.evaluate((lists) => {
    const read = ([, selector, attribute]) => {
      const el = document.querySelector(selector)
      return el ? (attribute ? el.getAttribute(attribute) : el.textContent) : ''
    }
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
      try { return JSON.parse(s.textContent) } catch { return {} }
    })
    const app = ld.find((d) => d['@type'] === 'SoftwareApplication') ?? {}
    const site = ld.find((d) => d['@type'] === 'WebSite') ?? {}
    return [
      ...lists.map((list) => [list[0], read(list)]),
      ['the JSON-LD description', app.description ?? ''],
      ['the software it needs', app.softwareRequirements ?? ''],
      ["the site's JSON-LD description", site.description ?? ''],
    ]
  }, LISTS)
  for (const [where, text] of said) {
    for (const h of HARNESSES) if (!text.includes(h.name)) problems.push(`${where} does not name ${h.name}`)
  }

  const cards = await tab.evaluate(() =>
    [...document.querySelectorAll('.hero .harness')].map((card) => {
      const mark = card.querySelector('.mark')
      const box = mark?.getBoundingClientRect()
      const img = mark?.querySelector('img')
      const shown = img && img.getBoundingClientRect()
      const clip = box && shown && {
        width: Math.min(box.right, shown.right) - Math.max(box.left, shown.left),
        height: Math.min(box.bottom, shown.bottom) - Math.max(box.top, shown.top),
      }
      return {
        id: card.dataset.harness,
        name: card.querySelector('.name')?.textContent.trim() ?? '',
        box: box ? [Math.round(box.width), Math.round(box.height)] : null,
        visible: !!mark && getComputedStyle(mark).visibility === 'visible' && getComputedStyle(mark).display !== 'none',
        img: img ? { src: img.currentSrc, loaded: img.complete && img.naturalWidth > 0, clip } : null,
        // Words in the box in place of a logo: a badge, which no card has.
        badge: mark ? mark.classList.contains('badge') || mark.innerText.trim() !== '' : false,
      }
    }),
  )
  if (cards.length !== HARNESSES.length) problems.push(`the first section has ${cards.length} harnesses, not ${HARNESSES.length}`)
  HARNESSES.forEach((h, i) => {
    const card = cards[i]
    if (!card || card.id !== h.id) return problems.push(`card ${i + 1} is not ${h.name}'s`)
    if (card.name !== h.name) problems.push(`${h.name}'s card is named "${card.name}"`)
    if (!card.box || !card.visible) return problems.push(`${h.name}'s card shows no mark`)
    if (card.badge) problems.push(`${h.name}'s card has a badge in place of its logo`)
    if (!card.img) return problems.push(`${h.name}'s card has no logo`)
    if (!card.img.loaded) problems.push(`${h.name}'s mark did not load`)
    const { width, height } = card.img.clip ?? { width: 0, height: 0 }
    if (Math.min(width, height) < SMALLEST) problems.push(`${h.name}'s mark shows ${Math.round(width)}x${Math.round(height)} px`)
  })
  const sizes = new Set(cards.filter((c) => c.box).map((c) => c.box.join('x')))
  if (sizes.size > 1) problems.push(`the marks' boxes are not one size: ${[...sizes].join(', ')}`)
  return problems
}

/** What is wrong with the first section's downloads and install lines: none when they are right. */
async function getProblems(tab) {
  const problems = []
  const got = await tab.evaluate(() => ({
    links: Object.fromEntries([...document.querySelectorAll('.hero a[data-download]')].map((a) => [a.dataset.download, a.getAttribute('href') ?? ''])),
    count: document.querySelectorAll('a[data-download]').length,
    commands: [...document.querySelectorAll('.hero .command')].map((box) => ({
      code: box.querySelector('code')?.textContent ?? '',
      copy: !!box.querySelector('button[data-copy]'),
    })),
    text: document.body.innerText,
  }))
  const tags = new Set()
  for (const [platform, pattern] of Object.entries(DOWNLOADS)) {
    const found = (got.links[platform] ?? '').match(pattern)
    if (!found) problems.push(`the ${platform} download leads to ${got.links[platform] || 'nothing'}, not its installer in a release`)
    else tags.add(found[1])
  }
  if (got.count !== 2) problems.push(`the page has ${got.count} download buttons, not 2`)
  if (tags.size > 1) problems.push(`the two downloads are of different releases: ${[...tags].join(', ')}`)
  if (got.commands.map((c) => c.code).join('\n') !== COMMANDS.join('\n')) problems.push(`the install lines are ${JSON.stringify(got.commands.map((c) => c.code))}`)
  got.commands.forEach((c, i) => { if (!c.copy) problems.push(`install line ${i + 1} has no Copy`) })
  if (UNSAID.test(got.text)) problems.push(`says something of keys or uninstalling: "${got.text.match(UNSAID)[0]}"`)
  return problems
}

/** The home page as a copy with one rule broken, and the problem the check must name. */
const BROKEN = [
  ['a page that names the removed harness', (s) => s.replace('</main>', `<p>${['Open', 'Code'].join('')}</p></main>`), 'names the removed harness'],
  ['a release named by its stage', (s) => s.replace('</main>', '<p>3.0.7-alpha.1</p></main>'), 'qualifies a release by its stage'],
  ['a harness with no mark', (s) => s.replace('<span class="mark pi"><img src="./assets/harnesses/pi.svg" width="68" height="68" alt="" /></span>', ''), "Pi's card shows no mark"],
  ['a mark hidden', (s) => s.replace('<span class="mark pi">', '<span class="mark pi" style="visibility:hidden">'), "Pi's card shows no mark"],
  ['a mark that does not load', (s) => s.replace('./assets/harnesses/pi.svg', './assets/harnesses/gone.svg'), "Pi's mark did not load"],
  ['a mark shown small', (s) => s.replace('</style>', '.mark.pi img{--size:12%}</style>'), "Pi's mark shows"],
  ['a badge in place of a logo', (s) => s.replace('<span class="mark codex"><img src="./assets/harnesses/codex.png" width="49" height="49" alt="" /></span>', '<span class="mark badge" aria-hidden="true">Codex</span>'), "Codex's card has a badge in place of its logo"],
  ['a logo with words beside it', (s) => s.replace('<span class="mark muse-code"><img', '<span class="mark muse-code">Muse Code<img'), "Muse Code's card has a badge in place of its logo"],
  ['an empty box', (s) => s.replace('<span class="mark claude-code"><img src="./assets/harnesses/claude-code.svg" width="42" height="42" alt="" /></span>', '<span class="mark claude-code"></span>'), "Claude Code's card has no logo"],
  ['a harness named wrong', (s) => s.replace('<span class="name">Devin</span>', '<span class="name">Devon</span>'), `Devin's card is named "Devon"`],
  ['a harness left out', (s) => s.replace(/\n\s*<li class="harness" data-harness="muse-code">.*?<\/li>/, ''), 'harnesses, not 5'],
  ['a list that leaves one out', (s) => s.replace('takes the tasks in Claude Code, Codex, Pi, Devin or Muse Code.', 'takes the tasks in Claude Code, Codex, Pi or Devin.'), 'the description does not name Muse Code'],
  ['the JSON-LD leaving one out', (s) => s.replace('across Claude Code, Codex, Pi, Devin and Muse Code."', 'across Claude Code, Codex, Pi and Devin."'), "the site's JSON-LD description does not name Muse Code"],
  ['marks of two sizes', (s) => s.replace('</style>', '.mark.codex{width:30px}</style>'), "the marks' boxes are not one size"],
  ['a download to the releases page', (s) => s.replace(/(data-download="mac" href=")[^"]*/, '$1https://github.com/ngvoicu/consensflow/releases'), 'the mac download leads to'],
  ['a download of the wrong file', (s) => s.replace(/(data-download="windows" href="[^"]*)_x64-setup\.exe/, '$1_x64-portable.exe'), 'the windows download leads to'],
  ['downloads of two releases', (s) => s.replace(/(data-download="windows" href="[^"]*\/download\/)v[^/]+/, '$1v0.0.1'), 'the two downloads are of different releases'],
  ['a third download button', (s) => s.replace('<a class="button button-quiet" href="https://github.com/ngvoicu/consensflow">Source on GitHub</a>', '<a class="button" data-download="linux" href="#">Linux</a><a class="button button-quiet" href="https://github.com/ngvoicu/consensflow">Source on GitHub</a>'), 'download buttons, not 2'],
  ['an install line without the alpha', (s) => s.replace('install.sh | sh -s -- --alpha</code>', 'install.sh | sh</code>'), 'the install lines are'],
  ['an install line without its Copy', (s) => s.replace('</pre><button class="copy" type="button" data-copy>Copy</button></div>', '</pre></div>'), 'install line 1 has no Copy'],
  ['the signing key back', (s) => s.replace('</main>', '<p>The signing key: RWTirTrEjU6epgN2c8yV2aIfRHzcCHVBi9zddieRVM5SahwhDFJlFd7Q</p></main>'), 'says something of keys or uninstalling'],
  ['how to uninstall back', (s) => s.replace('</main>', '<p>To uninstall, move ConsensFlow.app to the Trash.</p></main>'), 'says something of keys or uninstalling'],
]

/** What the page's text and markup say that no page may: none when it is right. */
async function wordProblems(tab) {
  const problems = []
  const text = await tab.locator('body').innerText()
  const source = await tab.content()
  if (REMOVED.test(text) || REMOVED.test(source)) problems.push('names the removed harness')
  // The download links lead to the alpha's installers, whose names carry its stage.
  const markup = source.replace(/<script[\s\S]*?<\/script>/g, '').replace(/(data-download="[a-z]+" href=")[^"]*"/g, '$1"')
  if (STAGE.test(text) || STAGE.test(markup)) problems.push('qualifies a release by its stage')
  return problems
}

async function openPage(context, url, route) {
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
  if (route) await tab.route(url, (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: route }))
  await tab.goto(url)
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
  return { tab, problems }
}

const browser = await chromium.launch()
const server = await serveSite()
try {
  if (shots) mkdirSync(shots, { recursive: true })
  for (const page of PAGES) {
    for (const viewport of VIEWPORTS) {
      for (const colorScheme of SCHEMES) {
        const where = `${page.name} at ${viewport.width} px, ${colorScheme}`
        const context = await browser.newContext({ viewport, colorScheme })
        const { tab, problems } = await openPage(context, `${server.url}${page.path}`)
        await tab.waitForSelector(page.ready)

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
        assert.deepEqual(await wordProblems(tab), [], `${where}: says what no page may`)
        if (page.name === 'home') {
          assert.deepEqual(await harnessProblems(tab), [], `${where}: the harnesses`)
          assert.deepEqual(await getProblems(tab), [], `${where}: the downloads and install lines`)
        }
        if (shots) {
          await tab.screenshot({ path: join(shots, `${page.name}-${viewport.width}-${colorScheme}.png`), fullPage: true })
          if (page.name === 'home') {
            // The bar stays on top as the page scrolls: out of the way, the section is seen whole.
            await tab.addStyleTag({ content: '.bar{position:static}' })
            await tab.locator('.hero').screenshot({ path: join(shots, `hero-${viewport.width}-${colorScheme}.png`) })
          }
        }
        if (page.name === 'home') {
          // Each Copy puts its line on the clipboard, whole.
          await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: server.url })
          const copies = tab.locator('.hero .command button[data-copy]')
          for (let i = 0; i < COMMANDS.length; i += 1) {
            await copies.nth(i).click()
            assert.equal(await tab.evaluate(() => navigator.clipboard.readText()), COMMANDS[i], `${where}: Copy ${i + 1} copies its line`)
          }
        }
        await context.close()
        ok(`${where}: clean, ${images.length} images in shape${page.name === 'home' ? ', five harnesses with their logos, two downloads, two install lines that copy' : ''}`)
      }
    }
  }

  // Each rule broken once, on a copy of the home page: the check must name it.
  for (const [what, breakIt, expected] of BROKEN) {
    const broken = breakIt(HOME)
    assert.notEqual(broken, HOME, `${what}: the copy is the page unchanged; its edit no longer finds its place`)
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport, colorScheme: 'light' })
      const { tab } = await openPage(context, `${server.url}/`, broken)
      const found = [...(await wordProblems(tab)), ...(await harnessProblems(tab)), ...(await getProblems(tab))]
      assert.ok(found.some((p) => p.includes(expected)), `${what} at ${viewport.width} px went unseen: ${JSON.stringify(found)}`)
      await context.close()
    }
    ok(`${what}: seen`)
  }
} finally {
  await browser.close()
  await server.close()
}
