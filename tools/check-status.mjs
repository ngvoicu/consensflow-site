#!/usr/bin/env node
/**
 * Checks the Supported versions page (status/index.html) in Chromium (Playwright
 * comes from a ConsensFlow checkout, as capture-screenshots.mjs has it):
 *
 *   node tools/check-status.mjs ../../consensflow [folder for screenshots]
 *
 * It reads the page's data block (#status-data) and checks its shape, its dates
 * and that no release is qualified by its stage; checks that the table has a row
 * for each harness and platform, in order, and that each row's status is the one
 * the rule gives for the data, in its words and in its colour class (the rule is
 * written out a second time here, so a renderer that drifts from the legend
 * fails); that the legend lists the five statuses; that every pill's text has at
 * least 4.5:1 against its fill in light and dark; that the page loads nothing
 * from another origin and logs nothing; that hostile data (and a link that is not
 * https) is put on the page as text and nothing else; that an unreadable data
 * block gives the one sentence; that the home page and the sitemap link it; and
 * that at 390 px nothing scrolls sideways and each row is a card with its fields.
 * With a folder, it also takes the page at 1280 and 390 px, light and dark. It
 * starts no harness and reads nothing from the machine. Exits 1 on the first
 * failure.
 */
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { serveSite } from './serve-site.mjs'

const SITE = resolve(fileURLToPath(new URL('..', import.meta.url)))
const checkout = resolve(process.argv[2] ?? '../../consensflow')
const shots = process.argv[3] && resolve(process.argv[3])
const { chromium } = createRequire(join(checkout, 'app', 'package.json'))('playwright')

const HTML = readFileSync(join(SITE, 'status', 'index.html'), 'utf8')
const BLOCK = /(<script type="application\/json" id="status-data">\n)([\s\S]*?)(\n<\/script>)/
const data = JSON.parse(HTML.match(BLOCK)[2])

const ORDER = ['claude-code', 'codex', 'pi', 'devin', 'muse-code']
const NAMES = ['Claude Code', 'Codex', 'Pi', 'Devin', 'Muse Code']
const PLATFORMS = ['mac', 'windows']
const LABELS = { mac: 'Mac', windows: 'Windows' }
const COLUMNS = ['Harness', 'Platform', 'Oldest supported', 'Newest tested', 'Vendor’s newest', 'Status', 'Known issues']
const STATES = ['supported', 'issues', 'newer', 'unsupported', 'unmeasured']
const WORDS = {
  supported: 'Supported',
  issues: 'Supported, with known issues',
  newer: 'Newer than tested',
  unsupported: 'Not supported',
  unmeasured: 'Not yet measured',
}
const SENTENCE = "The list of supported versions can't be shown right now. The releases are at github.com/ngvoicu/consensflow/releases."
const ISO = /^\d{4}-\d{2}-\d{2}$/
const CONTRAST = 4.5

const ok = (what) => console.log(`ok  ${what}`)

/** The rule, as the legend gives it (not copied from the page's script). */
const numbers = (version) => String(version).replace(/-R/i, '.').split('.').map((part) => Number.parseInt(part, 10) || 0)
function newerThan(a, b) {
  const [x, y] = [numbers(a), numbers(b)]
  for (let at = 0; at < Math.max(x.length, y.length); at += 1) {
    const diff = (x[at] ?? 0) - (y[at] ?? 0)
    if (diff) return diff > 0
  }
  return false
}
function expected(harness, platform) {
  const tested = harness.tested?.[platform]
  if (!tested?.version) return 'unmeasured'
  if (harness.vendor?.verdict === 'broken') return 'unsupported'
  if (harness.vendor?.version && newerThan(harness.vendor.version, tested.version)) return 'newer'
  return (tested.issues ?? []).length ? 'issues' : 'supported'
}

/** The WCAG contrast of two `rgb()` or `rgba()` colours. */
function contrast(a, b) {
  const luminance = (css) => {
    const [r, g, bl] = css.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => {
      const c = v / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** What the data says, before any browser: shape, order, dates, no stage in a name. */
function theData() {
  assert.deepEqual(data.harnesses.map((h) => h.id), ORDER, 'the five harnesses, in order')
  assert.deepEqual(data.harnesses.map((h) => h.name), NAMES, 'their names')
  assert.match(data.updated, ISO, 'updated is a date')
  for (const key of ['stable', 'alpha', 'next']) assert.match(data.app[key], /^\d+\.\d+\.\d+$/, `app.${key} is a version with no stage`)
  const dates = []
  for (const h of data.harnesses) {
    assert.match(h.link?.url ?? '', /^https:\/\//, `${h.id}: a vendor link, https`)
    assert.equal(typeof h.oldest.enforced === 'boolean' || h.oldest.enforced === 'unreleased', true, `${h.id}: enforced says how`)
    assert.ok(h.oldest.version === null || typeof h.oldest.version === 'string', `${h.id}: oldest.version`)
    assert.ok(h.oldest.version || h.oldest.short, `${h.id}: a number or a short word for the oldest`)
    assert.ok(h.oldest.text, `${h.id}: oldest says what it is`)
    assert.ok(h.vendor.version, `${h.id}: the vendor's newest`)
    assert.ok(h.vendor.feed, `${h.id}: where it was read`)
    dates.push(h.vendor.date)
    for (const platform of PLATFORMS) {
      const tested = h.tested[platform]
      assert.ok(tested, `${h.id}/${platform}: tested says something`)
      if (tested.version) {
        assert.ok(tested.suites.length > 0, `${h.id}/${platform}: suites that passed`)
        assert.equal(new Set(tested.suites).size, tested.suites.length, `${h.id}/${platform}: no suite twice`)
        assert.ok(Array.isArray(tested.issues), `${h.id}/${platform}: issues is a list, empty or not`)
        for (const issue of tested.issues) {
          assert.ok(issue.text && /[.]$/.test(issue.text), `${h.id}/${platform}: an issue is a sentence`)
          assert.ok(!issue.state || ['looking', 'fixing'].includes(issue.state), `${h.id}/${platform}: an issue's state`)
          assert.ok(!/\b(ps|opencode|test kit)\b/i.test(issue.text), `${h.id}/${platform}: an issue is not the test kit's`)
        }
        dates.push(tested.date, tested.earlier?.date)
        // The oldest supported is never newer than the newest tested.
        if (h.oldest.version) assert.ok(!newerThan(h.oldest.version, tested.version), `${h.id}/${platform}: oldest is not above tested`)
      } else {
        assert.ok(tested.why, `${h.id}/${platform}: not yet measured says why`)
      }
    }
  }
  for (const date of dates.filter(Boolean)) {
    assert.match(date, ISO, `${date} is a date`)
    assert.ok(date <= data.updated, `${date} is not after the page's date`)
  }
  assert.ok(!/alpha\.\d|beta\.\d|rc\.\d|pre-?release/i.test(JSON.stringify(data)), 'no release is qualified by its stage in the data')
  ok('the data block: five harnesses in order, links, issues, dates, no stage in a version')
}

/** The home page and the sitemap link the page. */
function theLinks() {
  const home = readFileSync(join(SITE, 'index.html'), 'utf8')
  assert.ok((home.match(/href="\.\/status\/"/g) ?? []).length >= 2, 'the home page links ./status/ where the harnesses are named')
  const sitemap = readFileSync(join(SITE, 'sitemap.xml'), 'utf8')
  assert.ok(sitemap.includes('<loc>https://consensflow.ngvoicu.dev/status/</loc>'), 'the sitemap lists /status/')
  assert.ok(sitemap.includes(`<lastmod>${data.updated}</lastmod>`), 'the sitemap dates it')
  ok('the home page and the sitemap link /status/')
}

async function withPage(check, { viewport = { width: 1280, height: 900 }, colorScheme = 'dark', route } = {}) {
  const server = await serveSite()
  const context = await browser.newContext({ viewport, colorScheme })
  const page = await context.newPage()
  const problems = []
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problems.push(`console ${m.type()}: ${m.text()}`) })
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`))
  page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`))
  page.on('request', (r) => { if (!r.url().startsWith(server.url) && !r.url().startsWith('data:')) problems.push(`left the site: ${r.url()}`) })
  if (route) await page.route('**/status/', (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: route }))
  try {
    await page.goto(`${server.url}/status/`)
    await page.waitForSelector('.versions, #unavailable:not([hidden])')
    return await check(page, problems)
  } finally {
    await context.close()
    await server.close()
  }
}

/** What the table shows: a row for each harness and platform, in page order. */
const rows = (page) => page.evaluate(() => [...document.querySelectorAll('tr.plat-row')].map((tr) => ({
  harness: tr.dataset.harness,
  platform: tr.dataset.platform,
  platformCell: tr.children[1].innerText.trim(),
  state: tr.dataset.status,
  pill: tr.querySelector('td.status .pill').textContent,
  pillClass: tr.querySelector('td.status .pill').className,
  issues: [...tr.querySelectorAll('td.issues p')].map((p) => p.textContent),
  labels: [...tr.querySelectorAll('td')].map((td) => td.dataset.label),
  empty: tr.querySelector('td.issues').classList.contains('empty'),
})))

async function theTable() {
  await withPage(async (page, problems) => {
    const columns = await page.evaluate(() => [...document.querySelectorAll('.versions thead th')].map((th) => th.textContent))
    assert.deepEqual(columns, COLUMNS, 'the table has the seven columns')
    const shown = await rows(page)
    const wanted = data.harnesses.flatMap((h) => PLATFORMS.map((platform) => ({ h, platform })))
    assert.equal(shown.length, wanted.length, 'a row for each harness and platform')
    for (const [at, { h, platform }] of wanted.entries()) {
      const row = shown[at]
      assert.equal(row.harness, h.id, 'rows are grouped by harness, in order')
      assert.equal(row.platform, platform)
      assert.equal(row.platformCell, LABELS[platform])
      const state = expected(h, platform)
      assert.equal(row.state, state, `${h.name} on ${LABELS[platform]}: the row's state`)
      assert.equal(row.pill, WORDS[state], `${h.name} on ${LABELS[platform]}: the pill's words`)
      assert.ok(row.pillClass.split(' ').includes(`pill-${state}`), `${h.name} on ${LABELS[platform]}: the pill's colour class is ${state}`)
      assert.equal(row.pillClass.split(' ').filter((c) => c.startsWith('pill-')).length, 1, 'one colour class')
      const issues = h.tested[platform].issues ?? []
      assert.equal(row.issues.length, issues.length, `${h.name} on ${LABELS[platform]}: its issues are listed`)
      issues.forEach((issue, i) => assert.ok(row.issues[i].startsWith(issue.text), 'an issue is said as the data says'))
      assert.equal(row.empty, issues.length === 0, 'no issues: an empty cell')
      assert.deepEqual(row.labels, COLUMNS.slice(1), 'every cell is labelled for the card')
    }
    const cells = await page.evaluate(() => [...document.querySelectorAll('tbody[data-harness]')].map((g) => ({
      id: g.id,
      tested: [...g.querySelectorAll('tr.plat-row')].map((tr) => tr.children[3].innerText.replace(/\s+/g, ' ').trim()),
      vendor: g.querySelector('tr.plat-row').children[4].innerText.replace(/\s+/g, ' ').trim(),
      link: g.querySelector('th a')?.getAttribute('href'),
    })))
    for (const [at, h] of data.harnesses.entries()) {
      assert.equal(cells[at].link, h.link.url, `${h.name}: the vendor link`)
      assert.ok(cells[at].vendor.startsWith(h.vendor.version), `${h.name}: the vendor's newest`)
      PLATFORMS.forEach((platform, i) => {
        const tested = h.tested[platform]
        assert.ok(cells[at].tested[i].startsWith(tested.version ?? 'Not yet measured'), `${h.name} on ${LABELS[platform]}: the newest tested`)
        if (tested.date) assert.ok(cells[at].tested[i].includes(tested.date), `${h.name} on ${LABELS[platform]}: its date`)
      })
    }
    const legend = await page.evaluate(() => [...document.querySelectorAll('#legend li')].map((li) => ({ state: li.dataset.state, pill: li.querySelector('.pill').textContent, cls: li.querySelector('.pill').className })))
    assert.deepEqual(legend.map((l) => l.state), STATES, 'the legend lists the five statuses, in order')
    legend.forEach((l) => { assert.equal(l.pill, WORDS[l.state]); assert.ok(l.cls.includes(`pill-${l.state}`)) })
    assert.equal(await page.locator('#updated').innerText(), `Updated ${data.updated}`)
    assert.equal(await page.locator('.other h2').innerText(), data.opencode.name)
    assert.equal(await page.locator('.other p').innerText(), data.opencode.text)
    assert.deepEqual(problems, [], 'nothing logged, nothing loaded from elsewhere')
    const text = await page.locator('body').innerText()
    assert.ok(!/alpha\.\d|pre-?release/i.test(text), 'no release is qualified by its stage on the page')
  })
  ok('a row for each harness and platform; each row’s status, words and colour class are the rule’s; the legend; nothing else loaded or logged')
}

/** Every pill's text against its fill, in both themes. */
async function theContrast() {
  for (const colorScheme of ['light', 'dark']) {
    await withPage(async (page) => {
      const pills = await page.evaluate(() => [...document.querySelectorAll('#legend .pill')].map((p) => {
        const style = getComputedStyle(p)
        return { state: p.parentElement.dataset.state, text: style.color, fill: style.backgroundColor }
      }))
      assert.equal(pills.length, STATES.length)
      for (const pill of pills) {
        const ratio = contrast(pill.text, pill.fill)
        assert.ok(ratio >= CONTRAST, `${pill.state} pill in ${colorScheme}: ${ratio.toFixed(2)}:1, needs ${CONTRAST}`)
      }
    }, { colorScheme })
  }
  ok(`every pill's text is at least ${CONTRAST}:1 against its fill, light and dark`)
}

/** Every status of the rule, shown, on data made for it. */
async function theRuleOnMadeData() {
  const made = structuredClone(data)
  const [one, two, three, , five] = made.harnesses
  one.vendor.version = '9.9.9'
  one.tested.windows.version = null
  one.tested.windows.why = 'made for the check'
  two.vendor.verdict = 'broken'
  three.vendor.version = '1.3.9'
  three.tested.mac.issues = [{ text: 'Made for the check.', state: 'fixing' }]
  five.vendor.version = '1.4.13-R6996.2'
  const html = HTML.replace(BLOCK, (_, a, _b, c) => a + JSON.stringify(made) + c)
  await withPage(async (page) => {
    const shown = await rows(page)
    const at = (harness, platform) => shown.find((r) => r.harness === harness && r.platform === platform)
    assert.equal(at('claude-code', 'mac').state, 'newer')
    assert.equal(at('claude-code', 'windows').state, 'unmeasured')
    assert.equal(at('codex', 'mac').state, 'unsupported')
    assert.equal(at('pi', 'mac').state, 'issues', 'a vendor release older than the newest tested, with an issue, is supported with known issues')
    assert.deepEqual(at('pi', 'mac').issues, ['Made for the check. Being fixed.'], 'an issue says it is being fixed')
    assert.equal(at('muse-code', 'mac').state, 'newer', 'a Muse build number is ordered after the three numbers')
    for (const row of shown) assert.ok(row.pillClass.includes(`pill-${row.state}`), `${row.harness}/${row.platform}: the colour class follows the state`)
  }, { route: html })
  ok('all five statuses, the order of a Muse build number and an issue’s state, on data made for them')
}

async function hostileData() {
  const bad = '<img src=x onerror="window.__pwned=1">'
  const made = structuredClone(data)
  made.updated = bad
  made.harnesses[0].name = bad
  made.harnesses[0].link = { label: bad, url: 'javascript:window.__pwned=1' }
  made.harnesses[0].oldest.text = bad
  made.harnesses[0].vendor.feed = bad
  made.harnesses[0].tested.mac.suites = [bad]
  made.harnesses[0].tested.windows.issues = [{ text: bad, state: 'looking' }]
  made.opencode.text = bad
  const html = HTML.replace(BLOCK, (_, a, _b, c) => a + JSON.stringify(made).replaceAll('</', '<\\/') + c)
  await withPage(async (page) => {
    assert.equal(await page.evaluate(() => window.__pwned), undefined, 'no script ran')
    assert.equal(await page.locator('main img').count(), 0, 'no element was made from the data')
    assert.equal(await page.locator('a[href^="javascript:"]').count(), 0, 'a link that is not https is not shown')
    assert.ok((await page.locator('body').innerText()).includes(bad), 'the data is on the page as text')
  }, { route: html })
  ok('hostile data is put on the page as text, a link that is not https is dropped, and nothing else')
}

async function unreadableData() {
  const html = HTML.replace(BLOCK, (_, a, _b, c) => `${a}{ not json${c}`)
  await withPage(async (page) => {
    assert.equal(await page.locator('#unavailable').innerText(), SENTENCE)
    assert.equal(await page.locator('.versions').count(), 0)
  }, { route: html })
  ok('an unreadable data block gives the one sentence')
}

async function narrowAndShots() {
  for (const [width, height] of [[1280, 900], [390, 844]]) {
    for (const colorScheme of ['light', 'dark']) {
      await withPage(async (page) => {
        const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
        assert.equal(wide, false, `nothing scrolls sideways at ${width} px (${colorScheme})`)
        const card = await page.evaluate(() => {
          const tr = document.querySelector('tr.plat-row')
          const style = getComputedStyle(tr)
          const labels = [...tr.querySelectorAll('td:not(.empty)')].map((td) => getComputedStyle(td, '::before').content.replaceAll('"', ''))
          const head = document.querySelector('.versions thead')
          return { display: style.display, labels, headVisible: head.getBoundingClientRect().height > 2 }
        })
        if (width === 390) {
          assert.equal(card.display, 'block', 'a row is a card at 390 px')
          assert.equal(card.headVisible, false, 'the column headings give way to the cards’ labels')
          assert.deepEqual(card.labels, COLUMNS.slice(1, 6).concat(data.harnesses[0].tested.mac.issues.length ? [COLUMNS[6]] : []), 'a card has the same fields as the row')
        } else {
          assert.equal(card.display, 'table-row', 'a row is a table row at 1280 px')
        }
        if (shots) {
          mkdirSync(shots, { recursive: true })
          await page.screenshot({ path: join(shots, `status-${width}-${colorScheme}.png`) })
          await page.screenshot({ path: join(shots, `status-${width}-${colorScheme}-full.png`), fullPage: true })
        }
      }, { viewport: { width, height }, colorScheme })
    }
  }
  ok(shots ? `1280 px a table, 390 px cards, light and dark: no sideways scroll; screenshots in ${shots}` : '1280 px a table, 390 px cards, light and dark: no sideways scroll')
}

const browser = await chromium.launch()
const failures = []
try {
  theData()
  theLinks()
  await theTable()
  await theContrast()
  await theRuleOnMadeData()
  await hostileData()
  await unreadableData()
  await narrowAndShots()
} catch (error) {
  failures.push(error)
} finally {
  await browser.close()
}
if (failures.length) {
  console.error(failures[0])
  process.exit(1)
}
