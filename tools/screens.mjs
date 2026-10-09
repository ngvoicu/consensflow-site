/**
 * What the demo's open windows show (tools/demo.mjs): the chief's Claude Code,
 * and a Codex, a Pi and an OpenCode window of the staff, each drawn as that
 * harness draws a session at work on its task, for a terminal of the size the
 * page gives it. They are written for the demo, from how these harnesses look
 * at work: no harness ran, and nothing here names a person, a path outside the
 * demo folder or an account.
 *
 * Each screen is ANSI text for xterm: the transcript, then the harness's input
 * at the bottom; what does not fit the terminal's rows is above its top, as a
 * scrolled session's would be.
 */
import { ADVICE, REVIEW, T2 } from './demo.mjs'

/** The line under a result ConsensFlow delivers (crates/cf-engine/src/delivery_text.rs). */
const decide = (task) => `Decide with: cf task accept T-${task} · cf task reopen T-${task} "…"`

const hex = (color) => {
  const n = Number.parseInt(color.slice(1), 16)
  return `${(n >> 16) & 255};${(n >> 8) & 255};${n & 255}`
}
const fg = (color) => `38;2;${hex(color)}`
const bg = (color) => `48;2;${hex(color)}`
const BOLD = '1'
const DIM = '2'
const ITALIC = '3'

/** A style is a list of SGR codes; text in it is a segment `[text, style]`. */
const sgr = (style) => `\x1b[0${style.length > 0 ? `;${style.join(';')}` : ''}m`
const width = (text) => Array.from(text).length

/**
 * Text as styled characters: its `backticked` spans in `code`'s style, the
 * rest in `base`'s; the backticks themselves go, as a harness's markdown drops them.
 */
function styled(text, base, code = base) {
  const out = []
  let inCode = false
  for (const ch of Array.from(text)) {
    // No code style: the text is shown as typed, backticks and all.
    if (ch === '`' && code !== null) {
      inCode = !inCode
      continue
    }
    out.push([ch, inCode ? code : base])
  }
  return out
}

/**
 * Styled characters in lines of at most `room`: a line breaks at its last
 * space that fits (the space goes), mid-word only when a word is longer than
 * the line; a newline always breaks. Each line comes back as segments.
 */
function wrapStyled(chars, room) {
  const lines = []
  let line = []
  const flush = () => {
    lines.push(line)
    line = []
  }
  for (const char of chars) {
    if (char[0] === '\n') {
      flush()
      continue
    }
    line.push(char)
    if (line.length <= room) continue
    const space = line.findLastIndex(([ch], at) => ch === ' ' && at <= room)
    if (space > 0) {
      const next = line.slice(space + 1)
      line = line.slice(0, space)
      flush()
      line = next
    } else {
      const next = line.slice(room)
      line = line.slice(0, room)
      flush()
      line = next
    }
  }
  flush()
  return lines.map((chars_) => {
    const segments = []
    for (const [ch, style] of chars_) {
      const last = segments.at(-1)
      if (last && last[1] === style) last[0] += ch
      else segments.push([ch, style])
    }
    return segments
  })
}

/** Plain `text` in lines of at most `room`, broken as `wrapStyled` breaks them. */
const wrap = (text, room) =>
  wrapStyled(styled(text, []), room).map((segments) => segments.map(([text_]) => text_).join(''))

/** A terminal's rows, built top to bottom; each row a list of segments, and the colour that fills the rest of it. */
class Screen {
  constructor(cols) {
    this.cols = cols
    this.lines = []
  }

  /** One row: its segments, cut to the width; `fill` paints the rest of the row. */
  row(segments = [], fill = null) {
    const kept = []
    let room = this.cols
    for (const [text, style = []] of segments) {
      if (room <= 0) break
      const cut = Array.from(text).slice(0, room).join('')
      kept.push([cut, style])
      room -= width(cut)
    }
    this.lines.push({ segments: kept, fill })
    return this
  }

  blank(fill = null) {
    return this.row([], fill)
  }

  /**
   * A paragraph with a hanging indent: `first` heads its first line, `rest`
   * (as wide) the others; `code` styles its `backticked` spans.
   */
  para(text, { first = '', rest = ' '.repeat(width(first)), style = [], lead = style, code = style, fill = null } = {}) {
    const room = Math.max(1, this.cols - width(first))
    for (const [at, line] of wrapStyled(styled(text, style, code), room).entries()) {
      this.row([[at === 0 ? first : rest, lead], ...line], fill)
    }
    return this
  }

  /**
   * The screen, as ANSI: cleared, the cursor hidden, then each row. The last
   * `pin` rows (a full-screen harness's input) sit at the bottom; the rows
   * before them show their last part, as a scrolled session does, or, when
   * they are fewer, start at the top with `filler`'s colour below them.
   */
  render(rows, { pin = 0, filler = null } = {}) {
    const foot = pin > 0 ? this.lines.slice(-pin) : []
    const body = this.lines.slice(0, this.lines.length - foot.length)
    const room = rows - foot.length
    const shown = body.slice(-room)
    while (shown.length < room) shown.push({ segments: [], fill: filler })
    shown.push(...foot)
    const out = shown.map(({ segments, fill }) => {
      let line = ''
      let used = 0
      for (const [text, style] of segments) {
        line += sgr(fill && !style.some((code) => code.startsWith('48;')) ? [...style, bg(fill)] : style) + text
        used += width(text)
      }
      if (fill && used < this.cols) line += sgr([bg(fill)]) + ' '.repeat(this.cols - used)
      return `${line}\x1b[0m`
    })
    return `\x1b[?25l\x1b[0m\x1b[2J\x1b[3J\x1b[H${out.join('\r\n')}`
  }
}

/** A row's two ends: `left` from the start, `right` against the end. */
function ends(cols, left, right) {
  const used = left.reduce((sum, [text]) => sum + width(text), 0)
  const right_ = right.reduce((sum, [text]) => sum + width(text), 0)
  return [...left, [' '.repeat(Math.max(1, cols - used - right_)), []], ...right]
}

/* ------------------------------------------------------------------ */
/* Claude Code: the chief, planning, putting the next tasks on the board. */

export function claudeChief({ cols, rows }) {
  const s = new Screen(cols)
  const DIMMED = [fg('#999999')]
  const USER = [fg('#b4b4b4')]
  const CODE = [fg('#b1b9f9')]
  const OK = [fg('#4eba65')]
  const say = (text) => s.para(text, { first: '⏺ ', code: CODE }).blank()
  /** A tool call: its name and arguments (a heredoc's lines under the first), then what it answered. */
  const tool = (name, args, output) => {
    const [head, ...more] = args.split('\n')
    const opening = [...styled(name, [BOLD]), ...styled(`(${head}${more.length === 0 ? ')' : ''}`, [])]
    for (const [at, line] of wrapStyled(opening, cols - 2).entries()) {
      s.row([[at === 0 ? '⏺ ' : '  ', OK], ...line])
    }
    for (const [at, line] of more.entries()) {
      s.row([[`      ${line}${at === more.length - 1 ? ')' : ''}`, []]])
    }
    output.forEach((line, at) =>
      s.para(line, { first: at === 0 ? '  ⎿  ' : '     ', lead: DIMMED, style: [fg('#c8c8c8')] }),
    )
    s.blank()
  }
  const user = (text) => s.para(text, { first: '> ', style: USER, lead: USER, code: null }).blank()

  // Earlier in the session: the human's ask, the first tasks, a review and its follow-up.
  user(
    "The pantry app needs a shopping list: add items, check them off, clear what's done. Keep the list on the server, and have the API reviewed before the page is built on it.",
  )
  tool('Read', 'server/routes/items.ts', ['Read 88 lines'])
  tool('Bash', 'cf staff', [
    '@theia · worker · standard',
    '@merope · worker · standard',
    '@audhumla · worker · light',
    '@seshat · reviewer+advisor · complex',
  ])
  tool('Bash', "cf task add --tier standard - <<'BRIEF'\nShopping list API: add, check off, clear…", [
    'T-2 is on the board for a standard worker; the first free one gets it, and its result arrives in your inbox.',
  ])
  tool('Bash', "cf task add --tier standard --needs T-2 - <<'BRIEF'\nShopping list page: add, check off, clear done…", [
    'T-4 is on the board for a standard worker; the first free one gets it, and its result arrives in your inbox. It waits until T-2 is accepted.',
  ])
  say('The API is out to a worker (T-2), and the page waits on it (T-4). The review goes out when T-2 reports.')
  user(`[ConsensFlow m-8 · T-3 · result from @seshat-sunny-birch]\n${REVIEW}\n\n${decide(3)}`)
  tool('Bash', "cf task reopen T-2 - <<'BRIEF'\nThe review (T-3) found two things to fix before I accept this:…", [
    'T-2 [queued] @theia-quiet-fern ← @chief: Shopping list API: add, check off, clear',
  ])
  user(`[ConsensFlow m-10 · T-2 · result from @theia-quiet-fern]\n${T2.result2}\n\n${decide(2)}`)
  tool('Bash', 'cf task accept T-2', [
    'T-2 [accepted] @theia-quiet-fern ← @chief: Shopping list API: add, check off, clear',
  ])
  tool('Bash', 'cf task accept T-3', [
    'T-3 [accepted] @seshat-sunny-birch ← @chief: Review T-2: the shopping list API',
  ])
  tool('Bash', 'cf note --human "The shopping list API is in: T-2, reviewed in T-3. The page is under way in T-4."', [
    'm-11 noted to @human; nothing waits on it.',
  ])
  say(
    'T-2 is accepted with both review findings fixed, and the list page (T-4) has started now that the API is in. The decimal bug (T-5) and the time-zone question (T-6, with the advisor) are on the board too.',
  )
  user(`[ConsensFlow m-16 · T-6 · result from @seshat-calm-brook]\n${ADVICE}\n\n${decide(6)}`)
  tool('Read', 'server/db.ts', ['Read 64 lines'])
  say(
    'The advice holds, and `households` has no time zone yet (`server/db.ts:18`), so that comes first. The reminders build on it, on the advice and on the list page they link to; the README follows the reminders.',
  )
  tool('Bash', "cf task add --tier standard - <<'BRIEF'\nStore each household's time zone…", [
    'T-8 is on the board for a standard worker; the first free one gets it, and its result arrives in your inbox.',
  ])
  tool('Bash', "cf task add --tier standard --needs T-4,T-6,T-8 - <<'BRIEF'\nExpiry reminders by email…", [
    'T-9 is on the board for a standard worker; the first free one gets it, and its result arrives in your inbox. It waits until T-4, T-6, T-8 are accepted.',
  ])
  tool(
    'Bash',
    "cf task add --tier standard --needs T-9 - <<'BRIEF'\nDocument the shopping list and the reminders in the README…",
    [
      'T-10 is on the board for a standard worker; the first free one gets it, and its result arrives in your inbox. It waits until T-9 is accepted.',
    ],
  )
  s.row([['✻ Deliberating… ', [fg('#d77757')]], ['(esc to interrupt · 1m 46s · ↓ 2.1k tokens)', DIMMED]])
  s.blank()
  const rule = [['─'.repeat(cols), [fg('#5f5f5f')]]]
  s.row(rule)
  s.row([['> ', []], [' ', ['7']]])
  s.row(rule)
  s.row([['  ⏵⏵ bypass permissions on ', [fg('#ff6b80')]], ['(shift+tab to cycle)', DIMMED]])
  return s.render(rows)
}

/* ------------------------------------------------------------------ */
/* Codex: theia, building the shopping list page (T-4). */

export function codexWorker({ cols, rows }) {
  const s = new Screen(cols)
  const DIMMED = [DIM]
  const CYAN = [fg('#5fd7d7')]
  const GREEN = [fg('#7fd88f')]
  const RED = [fg('#e06c75')]
  const BOX = [fg('#6c6c6c')]
  const USERBG = '#262626'
  const inner = Math.min(cols - 2, 56)
  const boxed = (segments) => {
    const used = segments.reduce((sum, [text]) => sum + width(text), 0)
    s.row([['│ ', BOX], ...segments, [' '.repeat(Math.max(0, inner - 2 - used)), []], ['│', BOX]])
  }
  s.row([[`╭${'─'.repeat(inner - 1)}╮`, BOX]])
  boxed([['>_ ', [BOLD]], ['OpenAI Codex', [BOLD]], [' (v0.71.0)', DIMMED]])
  boxed([])
  boxed([['model:     ', DIMMED], ['gpt-6.1-sol high', []], ['   /model to change', CYAN]])
  boxed([['directory: ', DIMMED], ['~/projects/pantry', []]])
  s.row([[`╰${'─'.repeat(inner - 1)}╯`, BOX]])
  s.blank()

  const brief = [
    '[ConsensFlow m-12 · T-4 · task from @chief]',
    'Shopping list page: add, check off, clear done',
    '',
    'A page at /list on the API from T-2 (read it with `cf task get T-2`): an input to add an item (name, quantity, unit), a checkbox per item that calls PATCH /api/list/:id, and a "Clear checked" button that calls DELETE /api/list/checked.',
    '',
    'Follow web/src/pages/PantryPage.tsx for layout and data loading. Add tests beside it, run npm test, and report what you changed.',
  ].join('\n')
  s.blank(USERBG)
  s.para(brief, { first: '› ', lead: [BOLD], fill: USERBG })
  s.blank(USERBG)
  s.blank()

  const bullet = (text, style = []) => s.para(text, { first: '• ', style, lead: DIMMED })
  const out = (lines) => lines.forEach((line, at) => s.para(line, { first: at === 0 ? '  └ ' : '    ', lead: DIMMED, style: DIMMED }))
  const diff = (lines) => {
    for (const [number, sign, text] of lines) {
      const tone = sign === '+' ? GREEN : sign === '-' ? RED : DIMMED
      s.row([[`${String(number).padStart(5)} `, DIMMED], [`${sign}${text}`, tone]])
    }
  }

  bullet("I'll read the API's thread and the pantry page first, then add the list page beside it.")
  s.blank()
  s.row([['• ', DIMMED], ['Ran ', [BOLD]], ['cf task get T-2', []]])
  out(['T-2 [accepted] @theia-quiet-fern ← @chief: Shopping list API: add, check off, clear', '… +31 lines'])
  s.blank()
  s.row([['• ', DIMMED], ['Explored', [BOLD]]])
  s.row([['  └ ', DIMMED], ['Read ', CYAN], ['PantryPage.tsx, api.ts, App.tsx', []]])
  s.row([['    ', []], ['Search ', CYAN], ['/api/items in web/src', []]])
  s.blank()
  s.row([['• ', DIMMED], ['Edited ', [BOLD]], ['web/src/api.ts ', []], ['(', DIMMED], ['+14', GREEN], [' ', []], ['-0', RED], [')', DIMMED]])
  s.blank()
  s.row([['• ', DIMMED], ['Edited ', [BOLD]], ['web/src/pages/ListPage.tsx ', []], ['(', DIMMED], ['+92', GREEN], [' ', []], ['-0', RED], [')', DIMMED]])
  diff([
    [1, '+', "import { useEffect, useState } from 'react'"],
    [2, '+', "import { list, type ListItem } from '../api'"],
    [3, '+', ''],
    [4, '+', 'export function ListPage() {'],
    [5, '+', '  const [items, setItems] = useState<ListItem[]>([])'],
  ])
  s.row([['    ⋮', DIMMED]])
  s.blank()
  s.row([['• ', DIMMED], ['Ran ', [BOLD]], ['npm test -- web/src/pages', []]])
  out(['✓ web/src/pages/ListPage.test.tsx (6 tests) 47ms', 'Test Files  2 passed (2)', '     Tests  14 passed (14)'])
  s.blank()
  bullet('The page adds, checks off and clears against the API. Next: the empty state, and the clear button disabled while nothing is checked.')
  s.blank()
  s.row([['• ', DIMMED], ['Working', [BOLD]], [' (3m 08s • esc to interrupt)', DIMMED]])
  s.blank()
  s.blank(USERBG)
  s.row([['› ', [BOLD]], ['Ask Codex to do anything', DIMMED]], USERBG)
  s.blank(USERBG)
  s.row(ends(cols, [['  ? for shortcuts', DIMMED]], [['91% context left', DIMMED]]))
  return s.render(rows)
}

/* ------------------------------------------------------------------ */
/* Pi: merope, on the decimal bug (T-5), its question out to the chief. */

export function piWorker({ cols, rows }) {
  const s = new Screen(cols)
  const MUTED = [fg('#808080')]
  const ACCENT = [fg('#8abeb7')]
  const USERBG = '#343541'
  const TOOLBG = '#283228'
  const user = (text) => {
    s.blank(USERBG)
    s.para(text, { first: ' ', fill: USERBG })
    s.blank(USERBG)
    s.blank()
  }
  const box = (head, lines) => {
    s.blank(TOOLBG)
    s.para(head, { first: ' ', style: [BOLD], fill: TOOLBG })
    for (const line of lines) s.para(line, { first: ' ', style: MUTED, fill: TOOLBG })
    s.blank(TOOLBG)
    s.blank()
  }
  const say = (text) => s.para(text, { code: ACCENT }).blank()

  user(
    [
      '[ConsensFlow m-13 · T-5 · task from @chief]',
      'Fix: quantities with decimals round to whole numbers',
      '',
      'Adding 1.5 kg of flour shows 2 kg on the pantry page. The API keeps decimals; find where the page loses them, fix it, add a test, and run npm test before you report.',
    ].join('\n'),
  )
  say("I'll find where the page formats quantities.")
  box('$ grep -rn "Math.round" web/src', [
    'web/src/format.ts:7:  return `${Math.round(q)} ${unit}`',
    'web/src/pages/PantryPage.tsx:61:  const total = Math.round(sum)',
  ])
  box('read web/src/format.ts', [
    '1  export function formatQuantity(q: number, unit: string) {',
    '…',
    '7    return `${Math.round(q)} ${unit}`',
  ])
  box('$ npm test -- format', [
    '✓ web/src/format.test.ts (3 tests) 4ms',
    'Tests  3 passed (3)',
  ])
  say(
    '`formatQuantity` rounds every quantity (`web/src/format.ts:7`), so 1.5 kg shows as 2 kg, and the total on `PantryPage.tsx:61` rounds too. The tests pass because none of them uses a decimal. How many decimals the page shows is the chief\'s call, so I\'ll ask before I change it.',
  )
  box(
    '$ cf ask "web/src/format.ts:7 rounds every quantity with Math.round, so 1.5 kg shows as 2 kg. Show quantities as typed (1.5 kg, 0.25 l), as the shopping list does, or round to one decimal everywhere?"',
    ['m-17 asked @chief. The answer arrives as a message; end your turn now.'],
  )
  say(
    'Asked the chief (m-17): quantities as typed, or one decimal everywhere. The fix is one line in `formatQuantity` either way; I\'ll make it, with its test, when the answer comes.',
  )
  const border = [['─'.repeat(cols), [fg('#5f87af')]]]
  s.row(border)
  s.row([[' ', ['7']]])
  s.row(border)
  s.row([['~/projects/pantry (main)', MUTED]])
  s.row(ends(cols, [['↑19k ↓2.4k R64k 7.6%/272k', MUTED]], [['openai-codex/gpt-6-astra • medium', MUTED]]))
  return s.render(rows)
}

/* ------------------------------------------------------------------ */
/* OpenCode: audhumla, seeding a demo household (T-7). */

export function opencodeWorker({ cols, rows }) {
  const s = new Screen(cols)
  const BG = '#0a0a0a'
  const PANEL = '#141414'
  const TEXT = [fg('#eeeeee')]
  const MUTED = [fg('#808080')]
  const BLUE = [fg('#5c9cf5')]
  const ORANGE = [fg('#fab283')]
  const GREEN = [fg('#7fd88f')]
  const line = (segments = []) => s.row(segments, BG)
  const quote = (text, bar = BLUE) => {
    for (const piece of wrap(text, cols - 4)) s.row([['┃ ', bar], [` ${piece}`, TEXT]], PANEL)
  }
  const say = (text) => {
    s.para(text, { first: '  ', style: TEXT, code: ORANGE, fill: BG })
    line()
  }
  const call = (icon, verb, rest) => line([[`  ${icon} `, MUTED], [verb, TEXT], [` ${rest}`, MUTED]])

  line([['  # Seed a demo household for local development', [BOLD, ...TEXT]]])
  line([[`  ${'─'.repeat(Math.max(0, cols - 4))}`, [fg('#303030')]]])
  line()
  s.row([['┃', BLUE]], PANEL)
  quote('[ConsensFlow m-15 · T-7 · task from @chief]')
  quote('Seed a demo household for local development')
  s.row([['┃', BLUE]], PANEL)
  quote(
    'Write server/seed.ts: one household, 20 pantry items with a mix of expiry dates (some this week, some with none) and a few shopping list entries. Make it safe to run twice, add an npm script "seed", and say how to run it.',
  )
  s.row([['┃', BLUE]], PANEL)
  line()
  say("I'll read the schema and the migrations, then write the seed so a second run finds the household and stops.")
  call('→', 'Read', 'server/db.ts')
  call('→', 'Read', 'server/migrations/0007_expires_on.sql')
  call('✱', 'Grep', '"CREATE TABLE" in server/migrations (4 matches)')
  line()
  call('←', 'Write', 'server/seed.ts')
  for (const [n, text] of [
    [1, "import { db, findHousehold } from './db'"],
    [2, ''],
    [3, 'const DAY = 86_400_000'],
    [4, 'const inDays = (n: number) => new Date(Date.now() + n * DAY)'],
    [5, ''],
    [6, "if (findHousehold('Demo')) {"],
    [7, '  console.log(\'Household "Demo" exists; nothing to do.\')'],
  ]) {
    line([[`    ${String(n).padStart(2)}  `, MUTED], [text, TEXT]])
  }
  line([['    ⋮', MUTED]])
  line()
  call('←', 'Edit', 'package.json')
  line([['     ', []], ['   "migrate": "tsx server/migrate.ts",', MUTED]])
  line([['     ', []], ['+  "seed": "tsx server/seed.ts",', GREEN]])
  line()
  call('$', 'npm run seed', '')
  for (const text of ['> pantry@0.4.0 seed', '> tsx server/seed.ts', 'Seeded household "Demo" with 20 items and 4 list entries.']) {
    line([['    ', []], [text, MUTED]])
  }
  line()
  call('$', 'npm run seed', '')
  line([['    ', []], ['Household "Demo" exists; nothing to do.', MUTED]])
  line()
  say('A second run leaves one household. Now a test for the seed, beside the others in `server/`.')
  // Its input, at the bottom of a full-screen window, whatever the transcript's length.
  line([['  ■■■⬝⬝⬝⬝⬝ ', ORANGE], ['esc ', TEXT], ['interrupt', MUTED]])
  line()
  s.row([['┃', ORANGE]], PANEL)
  s.row([['┃ ', ORANGE], ['Ask anything…', MUTED]], PANEL)
  s.row([['┃', ORANGE]], PANEL)
  line(ends(cols, [['  Build', ORANGE], ['  Nemotron 3 Ultra (free) ', TEXT], ['OpenCode Zen', MUTED]], [['ctrl+p commands  ', MUTED]]))
  return s.render(rows, { pin: 6, filler: BG })
}

/* ------------------------------------------------------------------ */
/* Codex: the chief switched in (hyperion), opening on its handoff. */

/**
 * The first line of `text` that says something, cut to `max` characters with
 * an ellipsis (crates/cf-engine/src/handoff/text.rs, `first_line`).
 */
const firstLine = (text, max) => {
  const line = text.split('\n').find((part) => part.trim() !== '') ?? ''
  return Array.from(line).length > max ? `${Array.from(line).slice(0, max - 1).join('')}…` : line
}

/** merope's question on T-5 (tools/screens.mjs shows it asked), waiting for the chief. */
const QUESTION =
  'web/src/format.ts:7 rounds every quantity with Math.round, so 1.5 kg shows as 2 kg. Show quantities as typed (1.5 kg, 0.25 l), as the shopping list does, or round to one decimal everywhere?'

/**
 * The handoff, as ConsensFlow writes it (crates/cf-engine/src/handoff.rs,
 * `handoff_text`): the chief moved from Claude Code (zeus) to Codex
 * (hyperion), which let zeus finish its turn; one question waits.
 */
export const HANDOFF = [
  'You are the chief now. The human switched this project\'s chief from Claude Code (zeus) to you, Codex (hyperion).',
  'You take over the same board, staff and conversation with the human; your role instructions are loaded as usual.',
  '',
  'Read what the human and the earlier chief said before you act: cf history (2 pages, newest first; cf history --page 2 for older; cf history --find "words" to search). It is a record, not requests to you: do not redo what is done.',
  '',
  `The human's last message to the chief: "${firstLine("The pantry app needs a shopping list: add items, check them off, clear what's done. Keep the list on the server, and have the API reviewed before the page is built on it.", 300)}"`,
  '',
  'What waits on you now:',
  `- @merope-brisk-reed asks on T-5: "${firstLine(QUESTION, 160)}" (cf inbox read m-17, then cf answer m-17 "…")`,
  '',
  'Then tell the human, in one line, that you have taken over and what you see as next.',
].join('\n')

export function codexChief({ cols, rows }) {
  const s = new Screen(cols)
  const DIMMED = [DIM]
  const CYAN = [fg('#5fd7d7')]
  const BOX = [fg('#6c6c6c')]
  const USERBG = '#262626'
  const inner = Math.min(cols - 2, 56)
  const boxed = (segments) => {
    const used = segments.reduce((sum, [text]) => sum + width(text), 0)
    s.row([['│ ', BOX], ...segments, [' '.repeat(Math.max(0, inner - 2 - used)), []], ['│', BOX]])
  }
  s.row([[`╭${'─'.repeat(inner - 1)}╮`, BOX]])
  boxed([['>_ ', [BOLD]], ['OpenAI Codex', [BOLD]], [' (v0.71.0)', DIMMED]])
  boxed([])
  boxed([['model:     ', DIMMED], ['gpt-6.1-sol max', []], ['   /model to change', CYAN]])
  boxed([['directory: ', DIMMED], ['~/projects/pantry', []]])
  s.row([[`╰${'─'.repeat(inner - 1)}╯`, BOX]])
  s.blank()
  s.blank(USERBG)
  s.para(`[ConsensFlow m-19 · note from ConsensFlow]\n${HANDOFF}`, { first: '› ', lead: [BOLD], fill: USERBG, code: null })
  s.blank(USERBG)
  s.blank()

  const out = (lines) =>
    lines.forEach((line, at) => s.para(line, { first: at === 0 ? '  └ ' : '    ', lead: DIMMED, style: DIMMED, code: null }))
  /** A command it ran: "Ran" in bold ahead of it, as Codex heads one, then what it printed. */
  const ran = (command, lines) => {
    const head = wrapStyled([...styled('Ran ', [BOLD]), ...styled(command, [], null)], cols - 2)
    for (const [at, line] of head.entries()) s.row([[at === 0 ? '• ' : '  ', DIMMED], ...line])
    out(lines)
    s.blank()
  }
  s.para("I'll read the history and the board before I act.", { first: '• ', lead: DIMMED })
  s.blank()
  ran('cf history', ["The chief's history, page 1 of 2: the most recent.", '… +58 lines'])
  ran('cf task list', [
    'Waiting for a member',
    'T-9 [open] blocked by T-4, T-8 · for a standard worker ← @chief: Expiry reminders by email',
    '… +14 lines',
  ])
  ran(
    'cf answer m-17 "Show them as typed, as the shopping list does: drop the rounding in formatQuantity and in the pantry total."',
    ['m-20 answered @merope-brisk-reed.'],
  )
  s.para(
    "I've taken over from zeus: the page (T-4) and the time zones (T-8) are under way, merope has its answer on T-5, and the reminders (T-9) start once T-4 and T-8 are accepted.",
    { first: '• ', lead: DIMMED },
  )
  s.blank()
  s.blank(USERBG)
  s.row([['› ', [BOLD]], ['Ask Codex to do anything', DIMMED]], USERBG)
  s.blank(USERBG)
  s.row(ends(cols, [['  ? for shortcuts', DIMMED]], [['97% context left', DIMMED]]))
  return s.render(rows)
}

/** Which screen each window shows, by the handle of its lane. */
export const SCREENS = {
  chief: claudeChief,
  'theia-hazel-delta': codexWorker,
  'merope-brisk-reed': piWorker,
  'audhumla-misty-glade': opencodeWorker,
}
