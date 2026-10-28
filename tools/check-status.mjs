#!/usr/bin/env node
/**
 * Checks the Supported versions page (status/index.html) in Chromium (Playwright
 * comes from a ConsensFlow checkout, as capture-screenshots.mjs has it):
 *
 *   node tools/check-status.mjs ../../consensflow [folder for screenshots]
 *
 * The page is one matrix: a row for each agent, and for each release a Mac and a
 * Windows cell holding the range of versions that release supports, coloured by
 * the cell's status. The check reads the page's data block (#status-data) and
 * checks its shape, its dates, that releases run oldest to newest and that no
 * release is qualified by its stage; that each cell's status is the one the rule
 * gives for the facts behind the table (the rule is written out here, apart from
 * the page); that the page has each cell, in order, with its range, its colour
 * class (matching its status), and its numbered mark and line for a known issue;
 * that the key has the five colours; that the text of every cell and chip has at
 * least 4.5:1 against its fill in light and dark; that the page shows no test
 * name and no date but its own; that the page loads nothing from another origin and
 * logs nothing; that a release added to or removed from the data adds or removes a
 * column; that hostile data is put on the page as text; that an unreadable block
 * gives the one sentence; that the home page and the sitemap link it; and that at
 * 390 px each agent is a block of cells with their labels and nothing scrolls
 * sideways. With a folder, it also takes the page at 1280 and 390 px, light and
 * dark. It starts no harness and reads nothing from the machine. Exits 1 on the
 * first failure.
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
const STATES = ['supported', 'issues', 'newer', 'unsupported', 'unmeasured']
const KEY = {
  supported: 'Supported',
  issues: 'Supported, with a known issue',
  newer: 'Newer than tested (we’re testing it)',
  unsupported: 'Not supported',
  unmeasured: 'Not yet measured, or not in this release',
}
const WORDS = { unmeasured: 'Not yet measured', absent: 'Not in this release' }
const SAID = { looking: ' We’re looking into it.', fixing: ' Being fixed.' }
const SENTENCE = "The list of supported versions can't be shown right now. The releases are at github.com/ngvoicu/consensflow/releases."
const ISO = /^\d{4}-\d{2}-\d{2}$/
const CONTRAST = 4.5

const ok = (what) => console.log(`ok  ${what}`)

/** Versions as the page orders them: 1.4.14-R7309.1 is 1.4.14 build 7309.1. */
const numbers = (version) => String(version).replace(/-R/i, '.').split('.').map((part) => Number.parseInt(part, 10) || 0)
function compare(a, b) {
  const [x, y] = [numbers(a), numbers(b)]
  for (let at = 0; at < Math.max(x.length, y.length); at += 1) {
    const diff = (x[at] ?? 0) - (y[at] ?? 0)
    if (diff) return diff > 0 ? 1 : -1
  }
  return 0
}
const range = (cell) => (cell.from && cell.to && cell.from !== cell.to ? `${cell.from} – ${cell.to}` : cell.to || cell.from)

/** The rule behind a cell's status, from the facts (not copied from anywhere on the page). */
function ruleStatus(facts, cell) {
  if (!cell.to) return 'unmeasured'
  if (facts.vendor.verdict === 'broken') return 'unsupported'
  if (compare(facts.vendor.version, cell.to) > 0) return 'newer'
  return cell.issue ? 'issues' : 'supported'
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

/** What the data says, before any browser. */
function theData() {
  assert.match(data.updated, ISO, 'updated is a date')
  assert.deepEqual(data.harnesses.map((h) => h.id), ORDER, 'the five agents, in order')
  assert.deepEqual(data.harnesses.map((h) => h.name), NAMES, 'their names')
  const dates = []
  for (const h of data.harnesses) {
    assert.match(h.link?.url ?? '', /^https:\/\//, `${h.id}: a vendor link, https`)
    assert.equal(typeof h.oldest.enforced === 'boolean' || h.oldest.enforced === 'unreleased', true, `${h.id}: enforced says how`)
    assert.ok(h.oldest.version && h.oldest.text, `${h.id}: the oldest supported, and what it is`)
    assert.ok(h.vendor.version && h.vendor.feed, `${h.id}: the vendor's newest, and where it was read`)
    dates.push(h.vendor.date)
    for (const platform of PLATFORMS) {
      const tested = h.tested[platform]
      assert.ok(tested, `${h.id}/${platform}: tested says something`)
      if (tested.version) {
        assert.ok(tested.suites.length > 0 && new Set(tested.suites).size === tested.suites.length, `${h.id}/${platform}: the suites that passed, once each`)
        dates.push(tested.date, tested.earlier?.date)
      } else {
        assert.ok(tested.why, `${h.id}/${platform}: not yet measured says why`)
      }
    }
  }
  for (const date of dates.filter(Boolean)) {
    assert.match(date, ISO, `${date} is a date`)
    assert.ok(date <= data.updated, `${date} is not after the page's date`)
  }

  assert.ok(data.releases.length > 0, 'at least one release')
  const versions = data.releases.map((r) => r.version)
  assert.equal(new Set(versions).size, versions.length, 'a release once')
  for (const r of data.releases) {
    assert.match(r.version, /^\d+\.\d+\.\d+$/, `${r.version}: a version with no stage`)
    assert.ok(r.channel, `${r.version}: a channel`)
  }
  assert.deepEqual(versions, [...versions].sort(compare), 'releases run oldest to newest, so the newest is on the right')
  const newest = data.releases.at(-1)
  for (const r of data.releases) {
    const seen = r.harnesses.map((h) => h.id)
    assert.equal(new Set(seen).size, seen.length, `${r.version}: an agent once`)
    for (const id of seen) assert.ok(ORDER.includes(id), `${r.version}: ${id} is one of the five`)
    for (const entry of r.harnesses) {
      const facts = data.harnesses.find((h) => h.id === entry.id)
      assert.deepEqual(Object.keys(entry.platforms).sort(), [...PLATFORMS].sort(), `${r.version}/${entry.id}: Mac and Windows`)
      for (const platform of PLATFORMS) {
        const cell = entry.platforms[platform]
        const where = `${r.version}/${entry.id}/${platform}`
        assert.ok(STATES.includes(cell.status), `${where}: a status`)
        if (cell.to) {
          assert.ok(cell.from, `${where}: a range has its start`)
          assert.ok(compare(cell.from, cell.to) <= 0, `${where}: from is not above to`)
        } else {
          assert.equal(cell.status, 'unmeasured', `${where}: no range, not yet measured`)
        }
        assert.equal(cell.status, ruleStatus(facts, cell), `${where}: the status is the rule's`)
        if (cell.issue) {
          assert.ok(/[.]$/.test(cell.issue.text), `${where}: an issue is a sentence`)
          assert.ok(!cell.issue.state || ['looking', 'fixing'].includes(cell.issue.state), `${where}: an issue's state`)
          assert.ok(!/\b(ps|opencode|test kit)\b/i.test(cell.issue.text), `${where}: an issue is not the test kit's`)
        }
        if (r === newest && cell.to) {
          assert.equal(cell.from, facts.oldest.version, `${where}: the newest release starts at the oldest supported`)
          assert.equal(cell.to, facts.tested[platform].version.replace(/-R.*/, ''), `${where}: and ends at the newest tested`)
        }
      }
    }
  }
  assert.ok(!/alpha\.\d|beta\.\d|rc\.\d|pre-?release/i.test(JSON.stringify(data)), 'no release is qualified by its stage in the data')
  ok('the data block: releases oldest to newest, a range and a status for each cell, each status the rule’s, the facts behind them')
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
    await page.waitForSelector('.matrix, #unavailable:not([hidden])')
    return await check(page, problems)
  } finally {
    await context.close()
    await server.close()
  }
}

/** What the matrix shows: its headings, and for each agent its cells in page order. */
const shown = (page) => page.evaluate(() => ({
  releases: [...document.querySelectorAll('.matrix thead tr:first-child th')].map((th) => th.textContent),
  platforms: [...document.querySelectorAll('.matrix thead tr:last-child th')].map((th) => th.textContent),
  rows: [...document.querySelectorAll('.matrix tbody tr')].map((tr) => ({
    harness: tr.dataset.harness,
    name: tr.querySelector('th').textContent,
    cells: [...tr.querySelectorAll('td')].map((td) => ({
      release: td.dataset.release,
      harness: td.dataset.harness,
      platform: td.dataset.platform,
      status: td.dataset.status,
      classes: td.className.split(' ').filter((c) => c.startsWith('st-')),
      label: td.dataset.label,
      sr: td.querySelector('.sr')?.textContent ?? '',
      text: td.querySelector('.t')?.textContent ?? td.textContent,
      marks: [...td.querySelectorAll('.mark')].map((m) => m.textContent),
    })),
  })),
  issues: [...document.querySelectorAll('.issues li')].map((li) => ({ mark: li.querySelector('.mark').textContent, text: li.querySelector('span:last-child').textContent })),
}))

/** The cells a data block should give, in page order: [{ release, id, platform, expected cell or null }]. */
const wantedCells = (d) => d.harnesses.map((h) => d.releases.flatMap((r) => PLATFORMS.map((platform) => ({
  release: r,
  id: h.id,
  platform,
  entry: r.harnesses.find((e) => e.id === h.id)?.platforms[platform] ?? null,
}))))

/** Every cell, the marks and the lines under the table, against `d`. */
function matrixAgrees(page, got, d) {
  assert.deepEqual(got.releases, ['Agent', ...d.releases.map((r) => `${r.channel} ${r.version}`)], 'a column for each release, newest on the right')
  assert.deepEqual(got.platforms, d.releases.flatMap(() => ['Mac', 'Windows']), 'Mac and Windows under each release')
  assert.equal(got.rows.length, d.harnesses.length, 'a row for each agent')
  const numbered = []
  const wanted = wantedCells(d)
  for (const [at, h] of d.harnesses.entries()) {
    assert.equal(got.rows[at].harness, h.id)
    assert.equal(got.rows[at].name, h.name)
    assert.equal(got.rows[at].cells.length, d.releases.length * PLATFORMS.length, `${h.name}: a Mac and a Windows cell for each release`)
    for (const [i, want] of wanted[at].entries()) {
      const cell = got.rows[at].cells[i]
      const where = `${h.name} ${want.release.version} ${LABELS[want.platform]}`
      const status = want.entry ? want.entry.status : 'absent'
      assert.equal(cell.release, want.release.version, `${where}: its release`)
      assert.equal(cell.harness, h.id)
      assert.equal(cell.platform, want.platform)
      assert.equal(cell.label, `${want.release.channel} ${want.release.version} · ${LABELS[want.platform]}`, `${where}: its card label`)
      assert.equal(cell.status, status, `${where}: its status`)
      assert.deepEqual(cell.classes, [`st-${status}`], `${where}: its colour class is ${status}`)
      if (want.entry?.to) {
        assert.equal(cell.text, range(want.entry), `${where}: its range`)
        assert.ok(cell.sr.length > 0, `${where}: its status in words, for a screen reader`)
      } else {
        assert.equal(cell.text, WORDS[status], `${where}: its words`)
      }
      if (want.entry?.issue && want.entry.to) {
        let n = numbered.indexOf(want.entry.issue.text) + 1
        if (!n) n = numbered.push(want.entry.issue.text)
        assert.deepEqual(cell.marks, [String(n)], `${where}: its issue's mark`)
      } else {
        assert.deepEqual(cell.marks, [], `${where}: no mark without an issue`)
      }
    }
  }
  assert.equal(got.issues.length, numbered.length, 'one line under the table for each distinct issue')
  numbered.forEach((text, i) => {
    const issue = d.releases.flatMap((r) => r.harnesses.flatMap((e) => Object.values(e.platforms))).find((c) => c.issue?.text === text).issue
    assert.equal(got.issues[i].mark, String(i + 1))
    assert.equal(got.issues[i].text, text + (SAID[issue.state] ?? ''), `issue ${i + 1}: its line`)
  })
}

async function theMatrix() {
  await withPage(async (page, problems) => {
    matrixAgrees(page, await shown(page), data)
    const key = await page.evaluate(() => [...document.querySelectorAll('#key li')].map((li) => ({ state: li.dataset.state, text: li.textContent, cls: li.querySelector('.chip').className })))
    assert.deepEqual(key.map((k) => k.state), STATES, 'the key lists the five colours, in order')
    key.forEach((k) => { assert.equal(k.text, KEY[k.state]); assert.ok(k.cls.split(' ').includes(`st-${k.state}`)) })
    assert.equal(await page.locator('#updated').innerText(), `Updated ${data.updated}`)
    assert.equal(await page.locator('.other').innerText(), `${data.opencode.name}: ${data.opencode.text}`)
    assert.deepEqual(problems, [], 'nothing logged, nothing loaded from elsewhere')
    const text = await page.locator('main').innerText()
    assert.ok(!/alpha\.\d|pre-?release/i.test(text), 'no release is qualified by its stage on the page')
    assert.equal((text.match(/\d{4}-\d{2}-\d{2}/g) ?? []).length, 1, 'the only date on the page is its own')
    assert.ok(!/suite|last passed|released|vendor|tested on/i.test(text.replace(KEY.newer, '')), 'no test name, no date for a cell, no vendor column')
  })
  ok('every cell is there, in order, with its range, its colour class and its mark; the lines under the table; the key; nothing else on the page')
}

/** The text of every cell and chip against its fill, in both themes. */
async function theContrast() {
  for (const colorScheme of ['light', 'dark']) {
    await withPage(async (page) => {
      const seen = await page.evaluate(() => [...document.querySelectorAll('.matrix td, #key .chip')].map((e) => {
        const style = getComputedStyle(e)
        return { what: e.dataset.status ?? e.className, text: style.color, fill: style.backgroundColor }
      }))
      assert.ok(seen.length > STATES.length)
      const kinds = new Set()
      for (const item of seen) {
        const ratio = contrast(item.text, item.fill)
        kinds.add(item.what)
        assert.ok(ratio >= CONTRAST, `${item.what} in ${colorScheme}: ${ratio.toFixed(2)}:1, needs ${CONTRAST}`)
      }
      assert.ok(['supported', 'issues', 'newer', 'absent'].every((k) => kinds.has(k)), 'the cells measured wear the colours')
    }, { colorScheme })
  }
  ok(`the text of every cell and chip is at least ${CONTRAST}:1 against its fill, light and dark`)
}

/** Data made for the check: a release added, one removed, every status, a shared issue. */
async function theMatrixOnMadeData() {
  const made = structuredClone(data)
  const cell = (status, from, to, issue) => ({ from, to, status, ...(issue ? { issue } : {}) })
  made.releases.push({
    version: '3.0.7',
    channel: 'Next',
    harnesses: [
      { id: 'claude-code', platforms: { mac: cell('unsupported', '2.1.300', '2.1.312'), windows: cell('supported', '2.1.292', '2.1.312') } },
      { id: 'pi', platforms: { mac: cell('issues', '1.2.0', '1.4.0', { text: 'Made for the check.', state: 'fixing' }), windows: cell('issues', '1.2.0', '1.4.0', { text: 'Made for the check.' }) } },
      { id: 'muse-code', platforms: { mac: cell('newer', '1.4.13', '1.4.13'), windows: { status: 'unmeasured' } } },
    ],
  })
  made.harnesses[0].vendor.verdict = 'broken'
  const added = HTML.replace(BLOCK, (_, a, _b, c) => a + JSON.stringify(made) + c)
  await withPage(async (page) => {
    const got = await shown(page)
    assert.equal(got.releases.length, 4, 'a release added is a column added')
    assert.equal(got.releases[3], 'Next 3.0.7', 'newest on the right')
    const row = (id) => got.rows.find((r) => r.harness === id).cells
    assert.equal(row('claude-code')[4].status, 'unsupported')
    assert.equal(row('codex')[4].status, 'absent', 'an agent missing from a release is not in it')
    assert.equal(row('muse-code')[4].status, 'newer')
    assert.equal(row('muse-code')[4].text, '1.4.13', 'a range of one version is that version')
    assert.equal(row('muse-code')[5].status, 'unmeasured')
    assert.deepEqual(row('pi')[4].marks, row('pi')[5].marks, 'one issue said twice is one mark')
    assert.ok(got.issues.some((i) => i.text === 'Made for the check. Being fixed.'), 'a line under the table, with its state')
  }, { route: added })

  const removed = structuredClone(data)
  removed.releases.shift()
  const gone = HTML.replace(BLOCK, (_, a, _b, c) => a + JSON.stringify(removed) + c)
  await withPage(async (page) => {
    const got = await shown(page)
    assert.deepEqual(got.releases, ['Agent', 'Alpha 3.0.6'], 'a release removed is its column gone')
    assert.ok(got.rows.every((r) => r.cells.length === 2))
  }, { route: gone })
  ok('a release added is a column on the right, one removed is its column gone; every status, an absent agent, a shared issue and its state')
}

async function hostileData() {
  const bad = '<img src=x onerror="window.__pwned=1">'
  const made = structuredClone(data)
  made.updated = bad
  made.releases[1].channel = bad
  made.releases[1].harnesses[0].platforms.mac.from = bad
  made.releases[1].harnesses[0].platforms.windows.issue = { text: bad, state: 'fixing' }
  made.harnesses[0].name = bad
  made.opencode.text = bad
  const html = HTML.replace(BLOCK, (_, a, _b, c) => a + JSON.stringify(made).replaceAll('</', '<\\/') + c)
  await withPage(async (page) => {
    assert.equal(await page.evaluate(() => window.__pwned), undefined, 'no script ran')
    assert.equal(await page.locator('main img').count(), 0, 'no element was made from the data')
    assert.ok((await page.locator('body').innerText()).includes(bad), 'the data is on the page as text')
  }, { route: html })
  ok('hostile data is put on the page as text, and nothing else')
}

async function unreadableData() {
  const html = HTML.replace(BLOCK, (_, a, _b, c) => `${a}{ not json${c}`)
  await withPage(async (page) => {
    assert.equal(await page.locator('#unavailable').innerText(), SENTENCE)
    assert.equal(await page.locator('.matrix').count(), 0)
  }, { route: html })
  ok('an unreadable data block gives the one sentence')
}

async function narrowAndShots() {
  for (const [width, height] of [[1280, 900], [390, 844]]) {
    for (const colorScheme of ['light', 'dark']) {
      await withPage(async (page) => {
        const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
        assert.equal(wide, false, `nothing scrolls sideways at ${width} px (${colorScheme})`)
        const layout = await page.evaluate(() => {
          const row = document.querySelector('.matrix tbody tr')
          const cells = [...row.querySelectorAll('td')]
          return {
            display: getComputedStyle(row).display,
            headHeight: document.querySelector('.matrix thead').getBoundingClientRect().height,
            fits: cells.every((td) => { const r = td.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth }),
            labels: cells.map((td) => getComputedStyle(td, '::before').content.replaceAll('"', '')),
            dataLabels: cells.map((td) => td.dataset.label),
          }
        })
        assert.equal(layout.fits, true, `every cell is inside the window at ${width} px`)
        if (width === 390) {
          assert.equal(layout.display, 'grid', 'an agent is a block of cells at 390 px')
          assert.ok(layout.headHeight <= 2, 'the column headings give way to the cells’ labels')
          assert.deepEqual(layout.labels, layout.dataLabels, 'each cell shows its label')
        } else {
          assert.equal(layout.display, 'table-row', 'an agent is a table row at 1280 px')
          assert.ok(layout.headHeight > 20, 'the headings show')
        }
        if (shots) {
          mkdirSync(shots, { recursive: true })
          await page.screenshot({ path: join(shots, `status-${width}-${colorScheme}.png`) })
          await page.screenshot({ path: join(shots, `status-${width}-${colorScheme}-full.png`), fullPage: true })
        }
      }, { viewport: { width, height }, colorScheme })
    }
  }
  ok(shots ? `1280 px a matrix, 390 px a block for each agent, light and dark: no sideways scroll; screenshots in ${shots}` : '1280 px a matrix, 390 px a block for each agent, light and dark: no sideways scroll')
}

const browser = await chromium.launch()
const failures = []
try {
  theData()
  theLinks()
  await theMatrix()
  await theContrast()
  await theMatrixOnMadeData()
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
