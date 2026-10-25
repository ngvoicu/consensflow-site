/**
 * The specs folder of the demo project, pantry: what its chief wrote when it
 * planned the shopping list and the expiry reminders as specs, in the shapes
 * Specmint's core variant writes (a registry table, a SPEC.md with frontmatter
 * and phases) and the daemon answers the page with (`specs.tree`,
 * `specs.file`; app/tests/specs-fixtures.mjs holds the app's own). The phases
 * are the tasks of tools/demo.mjs: T-2 and T-3 are the list's first phase, T-4
 * its second, T-6 to T-9 the reminders'.
 */

const REGISTRY = `# Spec Registry

| ID | Title | Status | Priority | Progress | Updated |
|----|-------|--------|----------|----------|---------|
| shopping-list | Shopping list | active | high | 2/5 | 2026-10-25 |
| expiry-reminders | Expiry reminders | active | medium | 1/6 | 2026-10-25 |
| expiry-dates | Expiry dates on items | completed | medium | 4/4 | 2026-10-24 |
| barcode-scan | Add items by barcode | paused | low | 0/2 | 2026-10-19 |
`

const SHOPPING_LIST = `---
id: shopping-list
title: Shopping list
status: active
created: 2026-10-23
updated: 2026-10-25
priority: high
tags: [api, pages]
---

# Shopping list

## Overview

The pantry app gets a shopping list: add items, check them off, clear what is
done. The list lives on the server, so every device of a household sees it. The
owner's words are in [the interview](interview-01.md); the reminders build on
this list, so [their spec](../expiry-reminders/SPEC.md) waits for it.

## Acceptance Criteria

- [x] \`POST /api/list\` adds an item, and a quantity keeps its decimals
- [x] \`DELETE /api/list/checked\` clears what is checked, in one transaction
- [ ] The page at \`/list\` adds, checks off and clears, without a reload
- [ ] The README says what the list does

## Architecture

\`\`\`mermaid
graph LR
    A[List page] --> B[/api/list/]
    B --> C[(list table)]
    D[Items] -. suggests names .-> A
\`\`\`

## Phase 1: The API [completed]

- [x] [LIST-01] Routes to add an item, check it off and clear what is checked (T-2)
- [x] [LIST-02] A review of the routes: one transaction to clear, 404 for an unknown id (T-3)

## Phase 2: The page [in-progress]

- [ ] [LIST-03] The page at \`/list\`: an input to add, a checkbox per item, a button to clear ← current (T-4)
  - [x] the input and the list
  - [ ] the checkboxes
  - [ ] the clear button
- [ ] [LIST-04] A demo household to develop against (T-7)

## Phase 3: The README [pending]

- [ ] [LIST-05] Document the list and how to run it (T-10)
`

const INTERVIEW = `# Interview 1: the shopping list

**Owner:** We buy the same things every week and forget half of them. I want a
list I can add to from my phone in the shop and tick things off as I go.

**Owner:** Clearing should just remove what is ticked. Nobody needs the old
entries; the pantry already keeps its own history.

**Owner:** It has to be there on my partner's phone too, so it lives on the
server.
`

const EXPIRY_REMINDERS = `---
id: expiry-reminders
title: Expiry reminders
status: active
created: 2026-10-24
updated: 2026-10-25
priority: medium
tags: [email, time-zones]
---

# Expiry reminders

## Overview

A morning email of what expires tomorrow, sent at 08:00 in each household's own
time zone. [The advice on time zones](research-01.md) decided how: the
household stores its zone, and an hourly job picks the households whose 08:00
has just passed.

## Acceptance Criteria

- [ ] A household with items that expire tomorrow gets one email at 08:00 its time
- [ ] A restart sends nothing twice
- [ ] [NEEDS CLARIFICATION] Whether an item expiring today is mentioned

## Phase 1: Time zones [in-progress]

- [x] [REM-01] Ask an advisor how reminders should handle time zones (T-6)
- [ ] [REM-02] Store each household's time zone, filled at sign-up ← current (T-8)

## Phase 2: Reminders [pending]

- [ ] [REM-03] The hourly job that picks the households (T-9)
- [ ] [REM-04] The email, and \`reminded_on\` per item (T-9)

## Phase 3: Documentation [pending]

- [ ] [REM-05] Document how reminders are sent and run locally (T-10)
- [ ] [REM-06] A test that fakes the clock across a time zone change
`

const REMINDERS_RESEARCH = `# Research 1: time zones

The advisor's findings (T-6):

- Send at 08:00 in each household's own time zone, the day before an item expires.
- A date is enough for the item; the household needs a time zone.
- Add \`households.time_zone\` (an IANA name, such as Europe/Lisbon), filled at sign-up from the browser.
- Run a job every hour and pick the households whose 08:00 has just passed.
- Keep \`reminded_on\` per item, so a restart sends nothing twice.
`

const EXPIRY_DATES = `---
id: expiry-dates
title: Expiry dates on items
status: completed
created: 2026-10-22
updated: 2026-10-24
priority: medium
tags: [items, migration]
---

# Expiry dates on items

## Overview

Every pantry item may carry the date it expires on.

## Phase 1: The column [completed]

- [x] [EXP-01] A nullable \`expires_on\` date and the migration that adds it (T-1)
- [x] [EXP-02] The field in the item form
- [x] [EXP-03] Show the date on the pantry page
- [x] [EXP-04] Tests for the migration and the form
`

const BARCODE_SCAN = `---
id: barcode-scan
title: Add items by barcode
status: paused
created: 2026-10-19
updated: 2026-10-19
priority: low
tags: [mobile]
---

# Add items by barcode

## Overview

Scan a barcode to add an item with its name filled in. Paused until the list
and the reminders are in.

## Phase 1: Scanning [pending]

- [ ] [BAR-01] Read a barcode from the phone's camera
- [ ] [BAR-02] Look the code up
`

const FILES = {
  'registry.md': REGISTRY,
  'shopping-list/SPEC.md': SHOPPING_LIST,
  'shopping-list/interview-01.md': INTERVIEW,
  'expiry-reminders/SPEC.md': EXPIRY_REMINDERS,
  'expiry-reminders/research-01.md': REMINDERS_RESEARCH,
  'expiry-dates/SPEC.md': EXPIRY_DATES,
  'barcode-scan/SPEC.md': BARCODE_SCAN,
}

/** The folder's tree as the daemon lists it: byte order, a file with its size. */
function treeOf(paths) {
  const root = []
  for (const path of [...paths].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)))) {
    const names = path.split('/')
    let entries = root
    for (const [at, name] of names.slice(0, -1).entries()) {
      let folder = entries.find((entry) => entry.name === name && entry.entries)
      if (folder === undefined) {
        folder = { name, path: names.slice(0, at + 1).join('/'), entries: [] }
        entries.push(folder)
      }
      entries = folder.entries
    }
    entries.push({ name: names.at(-1), path, size: Buffer.byteLength(FILES[path]) })
  }
  // Folders and files in byte order of their names, as the daemon sorts a level.
  const order = (level) => {
    level.sort((a, b) => Buffer.compare(Buffer.from(a.name), Buffer.from(b.name)))
    for (const entry of level) if (entry.entries) order(entry.entries)
    return level
  }
  return order(root)
}

/** What `specs.tree` and `specs.file` answer for the demo project. */
export const specs = {
  folder: '.specs',
  found: true,
  entries: treeOf(Object.keys(FILES)),
  files: Object.fromEntries(
    Object.entries(FILES).map(([path, text]) => [path, { path, size: Buffer.byteLength(text), text }]),
  ),
}
