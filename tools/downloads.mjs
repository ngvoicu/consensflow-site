#!/usr/bin/env node
/**
 * Points the home page's two download buttons at the installers of the release
 * the alpha update feed serves, the feed the app's updater and install.sh read:
 *
 *   node tools/downloads.mjs           # write the two links into index.html
 *   node tools/downloads.mjs --check   # refuse (1) while they are not the feed's, or do not answer 200
 *
 * The feed is `feed-alpha/latest.json` on the app's GitHub releases; its
 * `version` names the release, and the release's own assets give the Mac's DMG
 * (`_aarch64.dmg`) and Windows' installer (`_x64-setup.exe`). A static page can
 * read neither at run time (GitHub sends no CORS headers, and the site loads
 * nothing from another origin), so the links are written here, from the feed,
 * never by hand: run it after each alpha is published. Each button is the `<a>`
 * with `data-download="mac"` or `data-download="windows"`; only its `href` is
 * written.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const REPO = 'ngvoicu/consensflow'
const FEED = `https://github.com/${REPO}/releases/download/feed-alpha/latest.json`
const PAGE = fileURLToPath(new URL('../index.html', import.meta.url))
const ASSETS = { mac: /_aarch64\.dmg$/, windows: /_x64-setup\.exe$/ }
const BUTTON = (platform) => new RegExp(`(<a [^>]*data-download="${platform}"[^>]*href=")([^"]*)(")`)

async function json(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'consensflow-site', accept: 'application/json' } })
  if (!res.ok) throw new Error(`${url} answered ${res.status}`)
  return res.json()
}

/** The feed's release, and the download URL of each platform's installer in it. */
async function fromFeed() {
  const { version } = await json(FEED)
  if (!/^\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$/.test(version ?? '')) throw new Error(`the alpha feed names no version: ${version}`)
  const release = await json(`https://api.github.com/repos/${REPO}/releases/tags/v${version}`)
  const links = {}
  for (const [platform, name] of Object.entries(ASSETS)) {
    const found = (release.assets ?? []).filter((asset) => name.test(asset.name))
    if (found.length !== 1) throw new Error(`v${version} has ${found.length} assets matching ${name}, not one`)
    links[platform] = found[0].browser_download_url
  }
  return { version, links }
}

const check = process.argv.includes('--check')
const { version, links } = await fromFeed()
let page = readFileSync(PAGE, 'utf8')
const wrong = []
for (const [platform, url] of Object.entries(links)) {
  const match = page.match(BUTTON(platform))
  if (!match) {
    console.error(`downloads: index.html has no <a data-download="${platform}" href>`)
    process.exit(2)
  }
  if (match[2] !== url) wrong.push(`${platform} links ${match[2] || 'nothing'}, not ${url}`)
  page = page.replace(BUTTON(platform), `$1${url}$3`)
}
if (check) {
  for (const [platform, url] of Object.entries(links)) {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', headers: { 'user-agent': 'consensflow-site' } })
    if (res.status !== 200) wrong.push(`${platform}'s ${url} answers ${res.status}`)
  }
  if (wrong.length > 0) {
    console.error(`downloads: ${wrong.join('; ')}: run node tools/downloads.mjs`)
    process.exit(1)
  }
  console.log(`downloads: both buttons are the alpha feed's ${version}, and both answer 200`)
} else {
  writeFileSync(PAGE, page)
  console.log(`downloads: ${version}: ${Object.values(links).join(', ')}`)
}
