# consensflow-site

The website of **ConsensFlow**, a desktop app for Mac and Windows that runs a software factory on
your project, staffed by AI coding agents: you give the goal to a Chief of Staff, it plans the work
on a board, and its staff in nine roles (workers, frontend designers, architects, researchers,
advisors, reviewers, testers, integrators and an image designer) take the tasks, each in its own
terminal of Claude Code, Codex, Pi, Devin or Muse Code. Served at
[consensflow.ngvoicu.dev](https://consensflow.ngvoicu.dev); the app itself is
[ngvoicu/consensflow](https://github.com/ngvoicu/consensflow).

Sibling of [kluris-site](https://kluris.ngvoicu.dev) and [specmint-site](https://specmint.ngvoicu.dev);
same zero-build, single-file static stack.

## Stack

- **One self-contained `index.html`**: HTML, inline CSS and a few lines of vanilla JS. No framework,
  no build step, no CDN, no `node_modules`. The one other page, `status/index.html` (Supported
  versions, below), is self-contained the same way: its own inline CSS, the site's fonts and mark.
- **The app's look** (3.0.7, `app/ui/page.css` in the app repo): zinc ink, white words, and violet
  for what is at work and for the one act that matters, the primary button, which glows as the app's
  does. The wordmark and the group labels are the app's: spaced Geist Mono capitals, the wordmark in
  violet with its glow.
- Fonts: **Geist** and **Geist Mono**, the app's own faces, variable (100 to 900), self-hosted as woff2
  in `assets/fonts/`, a latin and a latin-ext file each, byte for byte the app's
  (`app/ui/vendor/fonts/`), with their licence, `assets/fonts/OFL.txt` (SIL Open Font License 1.1).
- Palette (dark): ink `#09090B`, deep `#0E0E11`, panel `#18181B`, lines `#3F3F46` and `#27272A`, text
  `#FAFAFA`, muted `#A1A1AA`, links `#A5B4FC`, violet `#A78BFA` (the primary button `#7C3AED`, its
  edge `#8B5CF6`), red `#F87171` for a risk. Light, the system's other appearance, in the same zinc:
  white, panel `#F4F4F5`, lines `#D4D4D8` and `#E4E4E7`, text `#09090B`, muted `#5F5F68`, links
  `#4338CA`, violet `#6D28D9`, red `#B91C1C`; the primary button stays violet with white words. On
  the page a colour means what it means on the app's board: slate `#3F3F46` is a task open or queued,
  violet `#A78BFA` one at work (and it glows), amber `#FCD34D` one waiting, mint `#6EE7B7` one done,
  deep green `#065F46` one finished.
- Dark and light themes via `prefers-color-scheme`. The app's board is dark, so the screenshots,
  the "How it works" strip and the factory diagram stay dark in both.
- Motion: the "New in 3.0.7" pill's lamp breathes as the app's working lamp does, and the "How it
  works" strip plays once when it comes into view (a task card crossing the board's columns). With
  reduced motion nothing moves: the lamp is still, and the strip stays at its last step.
- The factory diagram ("A software factory": who talks to whom) is inline SVG, drawn by hand in the
  board's language: members as the board's rows (a lamp, a name in mono capitals), messages as arrows
  labelled with what they carry. All nine roles are drawn, in the app's order, each with what it gets
  and what comes back (the app's README, word for word). Every role has a line of its own from the
  chief, with an arrowhead at each end, and no line is shared, so no member is joined to another: the
  staff talk only to the chief. The five roles that change the project (worker, frontend designer,
  architect, integrator, image designer) have an arrow into **Your project**, and a dashed violet
  line from the chief into it is own hands. Two drawings of the same thing, wide (`.civ-wide`: the
  chief, a fan of nine lines to the roles, your project on the right) and tall (`.civ-tall`: the chief
  above, nine nested lines down its left to the roles, five nested lines down their right to your
  project), swapped by a media query at 1080px; each carries a `<title>` and a `<desc>` that say every
  exchange in words. The example under it is the shopping-list goal from `tools/demo.mjs` as far as
  it has gone, beat by beat: the goal, the messages of T-2 (the API) and T-3 (its review), and the
  chief's note, with the page, T-4, still under way. The dot beside a beat is the state of the task it
  moved (the goal and the note, which are not states, in violet).

## The page

One page, top to bottom: the first section (below) and its capture of the window; **A software
factory** (who talks to whom, and one goal under way); **How it works** (a task across the
board's columns, then the chief's terminal beside a member's); **New in 3.0.7**, twelve tiles, each a
link to the group under What it does that tells it in full; **What it does**, a group of items beside
or under the captures that show them: The staff (with the board grouped by role under its items),
Backups and Vacation, Do with your own hands, The chief (and switching it), The board, Specs (its
viewer under it), History, Project settings (with You stay in charge under it, beside the dialog),
and the staff's windows; then Your data, and the source. After the page, before the footer, comes
ngvoicu.dev's consulting band (below).

The words come from the app's README at 3.0.7: the site says what it says, no more. New in 3.0.7
names what a user notices since 3.0.6, never a task or a branch, never the removed harness, and
never a release's stage. Settings → Agents and saved agents are gone from the app: New project,
Project settings and Switch chief read each installed harness's model list as they open, and
members are named by their model, which is what the page says.

## The consulting band (`#ngv-consulting`)

Gabriel, 2026-11-17: the band "should update with the new design from ngvoicu.dev". It is a sheet of
ngvoicu.dev's paper laid on this page, for a reader who might want the same way of working for their
team: they see it comes from ngvoicu.dev and know that site when they get there, learn in a few lines
what the consulting offers, and can write, call or go on to ngvoicu.dev's Consulting page.

- **ngvoicu.dev's design, as that site has it** (its redesign of 2026-10-23): white paper, the
  green-black ink `#1D2A28`, quiet `#52615D`, rules `#D5E0DC`, the bottle-green pen `#0B6B5D` (links,
  the pill button, the focus ring, the stamp) and the sun `#F2C230` as decoration only (the hand-drawn
  line under "like this?", selection); Figtree. On top, ngvoicu.dev's header: the GV ink stamp, the
  name and the motto "Software Engineer since before AI. AI-Native Now." (verbatim), and ngvoicu.dev
  on the right (under the motto on a narrow sheet). Then its Consulting section: the name in its own
  column on a wide sheet, the text, and the workshop painting beside it (under it on a phone); the
  pencil shore runs along the sheet's bottom edge, faded at its four edges, as it opens ngvoicu.dev's
  footer.
- **Light in both themes.** ngvoicu.dev is light only, as the app's board is dark only, so each is
  shown here as it is at home. On the dark page the sheet is paper on the zinc; on the light page it
  keeps its rule and a soft shadow.
- **The words** follow ngvoicu.dev's current offer (`/consulting/`, "How I help"), shortened: the
  talks and workshops, hands-on training for developers, and setting up a team in its own
  repositories, on-site or remotely. Change them when that page changes. Its links: ngvoicu.dev,
  **More about consulting** (`https://ngvoicu.dev/consulting/`), the AI-native guide, the email
  `office@ngvoicu.dev` and the phone `+40 734 704 910`.
- **Self-contained:** its styles are in the band, under `.ngv-consult`, and lean on nothing of this
  page's; the sheet lays itself out by its own width (container queries). Nothing in it moves:
  links and the button answer the pointer with colour only, and with reduced motion not even that
  eases. Its files are in `assets/ngvoicu/` (Assets, below).
- The Kluris and Specmint sites still carry the older band, of July 2026.

## The first section (`#top`, `#download`)

Gabriel, 2026-11-02: "move install section and harnesses, with logos here in the first section; also
put install commands for alpha and not so much text; no keys no uninstall, clean and simple, download
+ install commands for mac and windows". Under the headline, in this order and nothing more:

- **The New in 3.0.7 pill** above the headline, a link to that section, and **one short paragraph** under
  it: what the app is, the chief and the staff in nine roles.
- **The harnesses**, a row of five in the app's order (`Harness::ALL` in `cf-proto/src/agents.rs`):
  Claude Code, Codex, Pi, Devin, Muse Code, each its logo in a box the same size as the others' (64 px
  at most, the mark about 40 of it; Assets, below) and its name under it. Which roles each harness can
  hold (only Codex's image designer draws) is in the app, not here.
- **Download for Mac** and **Download for Windows**, straight to the installers of the release the
  alpha update feed serves (the DMG and `x64-setup.exe`), and **Source on GitHub**. A static page cannot
  read the feed when it opens (GitHub sends no CORS headers, and the site loads nothing from another
  origin), so `tools/downloads.mjs` writes the two links from the feed and the release's own assets:
  run it after each alpha is published, and `node tools/downloads.mjs --check` refuses while they are
  not the feed's or do not answer 200. Never write them by hand.
- **The systems** in one line, with no passwords stored and no API keys, and Supported versions.
- **The two install lines, the alpha's**, each in its own box with a Copy (which copies it; where the
  clipboard is refused, it selects it). On a phone a line wraps inside its box.

Nothing about the scripts' key, their checks or uninstalling is on the page, and nothing of this
section is said again further down: the Install section and the harnesses section are gone.

## Supported versions (`/status/`)

Which version of each harness (Claude Code, Codex, Pi, Devin and Muse Code) each ConsensFlow release
supports, on Mac and Windows. Linked from the home page's first section (under the downloads), The
chief group and the footer, and listed in `sitemap.xml`. It is a page of its own because it is reference, and it
changes on its own clock, not the story's.

- **One matrix.** A row for each harness; for each supported release, newest on the right, a Mac and a
  Windows cell. A cell is the range of versions that release supports on that platform
  ("2.1.292 – 2.1.312"), coloured by its status: mint supported, amber supported with a known issue,
  indigo newer than tested (we are testing it: the app's quiet `#3730A3`, light `#E0E7FF`), red not
  supported, zinc not yet measured or not in that release (Muse before 3.0.7). The colours are the
  app's own, and this is the one place on
  the site where a colour is a status and not a task's state; each cell also says its status in words
  to a screen reader, and the text of every cell keeps at least 4.5:1 against its fill in light and
  dark. A known issue is a numbered mark in the cell, and one line under the table says what it is
  ("We're looking into it" or "Being fixed" while a task is on it). Nothing else is shown: no test names,
  no date for a cell, no vendor's newest. Above the table are the key and "Updated <date>". At 390 px each
  harness is a block, its cells two to a row, each labelled with its release and platform.
- **The data block** is the page's one source, the `<script type="application/json" id="status-data">`
  between the `status-data:begin` and `status-data:end` comments:

  ```
  updated
  releases[]   version, channel (Stable, Alpha, Next), coverage? (shown in each cell), harnesses[]
    harnesses[]   id, platforms { mac, windows }
      platforms.*   from, to, status, issues? [{ text, state? }]   status: supported, issues, newer,
                                                                  unsupported, unmeasured
  harnesses[]  (the facts behind the table)   id, name, link, oldest, vendor, tested { mac, windows }
  ```

  Adding a release is adding one entry to `releases` (newest last); a release that is no longer
  supported is removed, and its column goes. A harness missing from a release is not in it (grey). When a
  harness version is dropped, its `from` moves up. The top-level `harnesses` keep what the table does not
  show and what decides a status: the oldest supported version (and whether the app checks it when a
  window opens), the vendor's newest release with its date and where it was read, and the newest tested
  version of each platform with its date and the live suites that passed. The rule, which the check
  writes out apart from the page: no `to`, not yet measured; a vendor release found broken
  (`vendor.verdict: "broken"`), not supported; the vendor's newest newer than `to`, newer than tested;
  an `issues` list, supported with a known issue; else supported. The page draws the status it is given
  and never computes one. The app's harness-window plan has a tool write the block from the app's code and
  from a check that watches each vendor's new versions, and `--check` it against the page; until then
  the block is written by hand from the live runs.
- **Known issues** are what a person would notice going wrong on the newest tested version, in plain
  words, never suite names. They leave out the test kit's own failures (a `ps` that cannot start on
  Windows, a suite's premise about a harness's record) and a red that
  one run showed and nothing explains. An issue carries `"state": "looking"` or `"fixing"` only while a
  task is on it. A cell may have more than one, each its own mark. A release's issues are the
  ones its notes name (the tag message, in their words; "being fixed" there is `fixing`), and any
  other the release's checks found and reproduced: 3.0.7's detached command on Pi and Devin is T-1068's
  finish suite, 2 of 2 on each, which no task is on. A line the notes put under "Not checked for this
  release" is put on the cell it names, as the cell has no other place for it, and a line that names a
  build by its stage ("an alpha.1 conversation") says the build instead, as the check fails on a stage in
  the data. A line that names no harness is put on every cell of the release. An optional `coverage`
  note is shown in each cell when a release has no new live-harness checks, so its earlier tested range
  is not mistaken for a check of that release.
- **Copy.** Releases are named by the version and the channel the app's updater names (`Stable`,
  `Alpha`), never by their stage, as everywhere on this site: the check fails on `alpha.N`, `rc.N` or
  "pre-release" in the data or on the page. "Not yet measured" is said where no figure exists, never a
  guess.
- **Check and preview.** The page is checked in Chromium (the data's shape, dates and release order;
  each cell's status against the rule; every cell present, in order, with its range, colour class and
  mark, and the lines under the table; the key; the contrast of every cell and chip; no test name, vendor
  column or date but the page's own; a release added or removed adding or removing a column; hostile
  data shown as text; an unreadable block; the links; a matrix at 1280 px, a block for each harness at
  390 px with nothing scrolling sideways), and the check starts no harness:

  ```bash
  node tools/check-status.mjs ../../consensflow [folder for screenshots]   # 1280 and 390 px, light and dark
  node tools/serve-site.mjs                                                # then http://localhost:4500/status/
  ```

## The installers (`/install.sh`, `/install.ps1`)

`curl -fsSL https://consensflow.ngvoicu.dev/install.sh | sh -s -- --alpha` and
`$env:CONSENSFLOW_CHANNEL = 'alpha'; irm https://consensflow.ngvoicu.dev/install.ps1 | iex`, the alpha's,
shown in the first section. Both files are copies of `install/install.sh` and
`install/install.ps1` in the app's repository, where they are written and tested: never edit them
here. Copy them with `npm run site:installers -- <this folder>` from the app's repository onto the
`installers` branch, whose own index.html still shows the key the scripts pin (the tool refuses a page
that does not), then
bring the two files onto `main` as they are; `npm run site:installers -- --check <this folder>`
compares the `installers` branch with the app's. They install releases from 3.0.7 on, the first
whose SHA256SUMS is signed.

## Every page opens clean (`tools/check-site.mjs`)

The home page and Supported versions are each opened at 1280 and 390 px, light and dark, in
Chromium: nothing logged, thrown, failed or loaded from another origin, no sideways scroll,
every image loaded and shown at the shape of its file (a screenshot remade at another height needs its
`height` changed too), no page naming a harness the app has removed (in its text or its markup), and
none naming a release by its stage but the download links. On the home page, every list of the
harnesses (the description, the share and X descriptions, both JSON-LD descriptions and the software it
needs, and the first section's row) names all five; the row has each in the app's order, its logo
shown (the vendor's file, loaded and at least 32 px, with no badge or words in its place), every box
one size, and its name; the two downloads lead to the DMG and `x64-setup.exe` of one release; the two
install lines are the alpha's, each with a Copy that copies it whole; and nothing is said of keys or
uninstalling. Each of those rules is then broken once on a copy of the page (22 copies), and the
check must see it.

```bash
node tools/check-site.mjs ../../consensflow [folder for screenshots]   # 8 openings and 22 broken copies; a folder gets each page whole and the first section
```

## Copy

The page says what the app's README says, from the user's side, no more (The page, above). "A software
factory" and the "small civilization" of the chief and its staff are the framing, not features:
every exchange the factory section and its diagram show (the goal and answers from the human, the
chief's questions and notes back, and for each of the nine roles what it gets and what comes back) is
one the app's README gives, and the staff never talk to each other. On what the agents can do, it
says:

- Agents work with full permissions in their windows, as they would if you ran them yourself. Your
  protection is the review, the chief's acceptance and, if you turn it on, your approval. Use
  ConsensFlow on projects kept in version control.
- Every agent, the chief and its staff alike, starts with its harness's MCP servers and connectors,
  skills, settings and customizations, as it would if you ran it yourself. The staff use them with
  full permissions while you aren't watching, so keep in a harness only what you would let any agent
  use.

## Local dev

```bash
node tools/serve-site.mjs      # then open http://localhost:4500 (or python3 -m http.server 4500)
```

## Assets

- `assets/mark.png`, `assets/favicon.png`, `assets/apple-touch-icon.png`, `favicon.ico`: the
  ConsensFlow mark, resized from the app's own icons (`app/src-tauri/icons/` in the app repo).
- `assets/screenshots/*.webp`: the app, captured fresh (lossless WebP). Remake them with
  `tools/capture-screenshots.mjs` (below).
- `assets/harnesses/`: the harnesses' logos, each the vendor's own file, byte for byte as it was
  downloaded (2026-11-01), never redrawn or recoloured, shown whole in its box (a file with a margin
  round its mark is shown larger, so every mark is about 40 px). **Gabriel chose on 2026-11-01 to show
  the five marks as the products ConsensFlow works with.**
  - `claude-code.svg`: the Claude mark, `https://claude.com/icon.svg`, the icon Anthropic's own page
    for Claude Code, [claude.com/product/claude-code](https://claude.com/product/claude-code), is
    served with. Anthropic publishes no mark of Claude Code's own; its docs site
    ([code.claude.com](https://code.claude.com/docs/en/overview)) has the same mark on a dark tile, only
    as raster favicons. One file for both themes. Terms: Anthropic's
    [trademark guidelines](https://www.anthropic.com/legal/trademark-guidelines) (effective
    2024-08-01): "You may only use our trademarks as specifically permitted by us and only in materials
    we approve beforehand", no alterations of colour, font or proportion, no trademark symbol, a
    reasonable space round the mark; for a website, marketing@anthropic.com.
  - `codex.png` (250×250): the app icon at the head of Codex's own pages,
    [chatgpt.com/codex](https://chatgpt.com/codex/) and [openai.com/codex](https://openai.com/codex/)
    (`Blossom_4k_Icon_1.png`, the same bytes on both): OpenAI's Blossom on its tile. OpenAI publishes no
    other Codex mark that we found. One file for both themes. Terms: OpenAI's
    [brand guidelines](https://openai.com/brand/): a logo only where it relates directly to OpenAI's
    services, as provided, never more prominent than your own name nor part of your branding, and not
    without permission; requests to partnercomms@openai.com. (The page answers a browser only; its rules
    were read from its indexed text.)
  - `muse-code.svg`: the Muse mark (the stroke "M"), `https://muse.ai/images/favicon/app-squiggle.svg`,
    the icon of Meta's Muse site, [muse.ai](https://muse.ai/), which Meta's
    [ai.meta.com/muse](https://ai.meta.com/muse/) leads to (the same mark is `muse-logo.svg` there and
    the icon of [introducing.muse.ai](https://introducing.muse.ai/)). **Meta publishes no mark of Muse
    Code's own:** its page, [dev.meta.ai/products/muse-code](https://dev.meta.ai/products/muse-code),
    shows none and is served with Meta's own logo as its icon. So Muse Code shows the mark of Muse, the
    family it is Meta's coding agent of. One file for both themes. Terms: Meta's
    [brand resources](https://www.meta.com/brand/resources/meta/company-brand/): "Meta's trademarks are
    owned by Meta and may only be used as provided in these guidelines or with Meta's permission",
    through its Brand Review.
  - `pi.svg`: Pi's primary logo from its press kit, [pi.dev/press-kit](https://pi.dev/press-kit)
    (`https://pi.dev/logo.svg`), "vector logo for light/dark usage and editorial placements": one file
    for both themes. The kit states no other terms; Pi is MIT-licensed, by Earendil Inc. & Contributors.
  - `devin-on-light.svg` and `devin-on-dark.svg`: Devin's square avatar, white and black
    (`DEVIN_AVATAR_SQUARE_WHITE.svg`, `DEVIN_AVATAR_SQUARE_BLACK.svg`), from the Devin › SVG folder of
    "Brand Logos 2026", the Google Drive folder [cognition.ai/brand](https://cognition.ai/brand)
    opens. The folder states no terms. A `<picture>` shows the white one in the light theme and the
    black one in the dark.
- `assets/og-image.png`: the share card (1200×630), rendered from `tools/og-image.html` by
  `tools/og-image.mjs`.
- `assets/ngvoicu/`: the consulting band's files, byte for byte from ngvoicu.dev's own repository
  (`ngvoicu-site`, 2026-11-17): Figtree's latin file `figtree-latin.woff2` with its licence,
  `Figtree-OFL.txt` (SIL Open Font License 1.1); the GV ink stamp's mask, `gv-stamp-mask.png`
  (`images/brand/` there); the workshop painting, `workshop-400.webp` and `workshop-800.webp`
  (`images/consulting/`); and the shore strip, `pencil-shore-strip-1200.webp` and `-2400.webp`
  (`images/sea/`). The stamp and the paintings are Gabriel's own artwork. Copy them again when
  ngvoicu.dev changes them.

## Screenshots

The app's window is a web page (`app/ui` in the app repo) that talks to its daemon through the app's
bridge. The capture serves that page from a checkout of the app, as the app's own page tests do, and
opens it in Chromium with its real terminals (xterm, as the app has them):

```bash
# here, once: brew install webp             (cwebp makes the .webp files)
node tools/capture-screenshots.mjs ../../consensflow
node tools/og-image.mjs ../../consensflow
# only some captures (the page still goes through every step):
node tools/capture-screenshots.mjs ../../consensflow specs history staff project-settings
```

The path given is the app's checkout: from `sites/consensflow-site` it is `../../consensflow`, the
app repo beside the `sites` folder (the tools' default). Run with no names, the tool remakes every
capture, so none shows an older window than the text describes; they were all remade on 2026-11-16,
on the app's page at `f2660afd2` (3.0.7's new look, own hands and the nine roles). History's times are
those of the day it runs.

Playwright comes from the app repo's `app/node_modules`; nothing is installed here. **No daemon and no
harness runs**: everything the page is told comes from a stand-in for the app, like the one
`app/tests/core-page.spec.mjs` uses, and nothing reads or writes `~/.consensflow` or the harnesses on
the machine.

- **The demo** is `tools/demo.mjs`: a small web app, "pantry", run by a chief on Claude Code and a
  staff in all nine roles on Codex, Pi, Claude Code, Devin and Muse Code, with a task in every column
  of the board. The roles are the checkout's own (`app/tests/fixtures/roles.json`). Each member is
  named by its model and effort, as the daemon names one; one worker is out of quota and its backup
  takes its tasks, another is on Vacation. The models the pickers offer are the demo's `models.get`,
  as each installed harness would list them. Its ledger reads as the daemon's would: messages
  numbered in the order they were sent, and T-2's thread (a brief, the worker's question and the
  chief's answer, a result, the chief's follow-up after a review, the second result) in the shape
  `task.get` gives it. The demo shows no real name, path or account (its folders are under
  `/Users/demo/projects/`).
- **The terminals** show screens written for the demo in `tools/screens.mjs`: the chief's Claude Code
  reading an advisor's result and putting a plan on the board with `cf task add --plan`, and a Codex,
  a Pi and a Claude Code window of the staff, each drawn as that harness draws a session at work, with
  the `cf` commands and outputs the app really has. The stand-in hands each terminal its screen as the
  app hands it a window's output, for the size the terminal took. The screens, and what the board says
  of windows (a lamp at work, "1 terminal open", a task's 58 items), are the demo's, not a live run's.
- The captures, in the page's order:
  - `window.webp`: the whole window, the board with the workers' group open beside the chief's pane.
  - `chief-and-staff.webp` and `staff-windows.webp`: the board folded, the terminals in one row that
    scrolls sideways (the chief takes two thirds of it, each other window a third), from its start and
    scrolled to the staff's three windows.
  - `staff.webp` and `project-settings.webp`: one Project settings dialog, cut between its sections:
    the staff above (every role, the backup under its member, a worker on Vacation, Add a member), and
    below it Compaction to Specs. Rules for the staff and computer use, which the page does not tell,
    are left out.
  - `staff-groups.webp`: the board with every role's group folded, their chips on their heads.
  - `vacation-backup.webp`: the workers' group open: the worker out of quota with Try again now, its
    backup at work on T-8, and the worker on Vacation with Bring back.
  - `own-hands.webp`: the chief's pane with Do with your own hands switched on from its card, and the
    chief doing a change itself (`tools/screens.mjs`, `claudeOwnHands`); it is switched off after.
  - `new-project.webp`: New project, cut after its staff: the chief's harness, model and effort, and
    the last project's staff.
  - `switch-chief.webp` and `new-chief.webp`: the Switch the chief dialog with Codex picked; the
    stand-in then switches as the daemon would, and the chief's new window opens on its handoff,
    written as `crates/cf-engine/src/handoff.rs` writes one.
  - `task.webp`: T-2 open, its story.
  - `specs.webp`: the specs viewer on pantry's own specs folder, written for the demo in
    `tools/specs.mjs` (a registry and four specs in Specmint's core shape; the shopping list's phases
    are the tasks of the demo's board), with the shopping list's SPEC.md chosen.
  - `history.webp`: the chief's History searched for "time zone": its words, the human's and the
    deliveries (the advisor's answer, m-16), from `chiefHistory` in `tools/demo.mjs`.

## A release

What the site does when the app publishes a release, from this repo, on a branch, before the owner
pushes it to GitHub:

1. `node tools/downloads.mjs` writes the two download buttons' links from the alpha update feed and
   the release's own assets; `node tools/downloads.mjs --check` must then say both are the feed's and
   answer 200. Never write the links by hand.
2. The Supported versions data block (`status/index.html`, between `status-data:begin` and
   `status-data:end`) gets the release's column: its ranges and statuses from the release's checks,
   its known issues from its notes (Supported versions, above). A release no longer supported is
   removed.
3. `sitemap.xml`: the `lastmod` of each page that changed.
4. If the installers changed in the app repo, `npm run site:installers` there, onto the `installers`
   branch (The installers, above).
5. `node tools/check-status.mjs` and `node tools/check-site.mjs` must pass. The screenshots and the
   share card are remade only when the app's window or what the page says changes, not for every
   release.

## Deploy

GitHub Pages from the repo root. `CNAME` serves `consensflow.ngvoicu.dev`. The download buttons
lead to the alpha's installers, written by `tools/downloads.mjs` (the first section, above); the
JSON-LD's `downloadUrl` is [/releases](https://github.com/ngvoicu/consensflow/releases), never
`/releases/latest`. The site never qualifies a release by its stage on GitHub, in copy, captions,
alt text or structured data, but where Gabriel asked for the alpha (2026-11-02): the download links,
"The latest alpha", and the install lines' `--alpha` and `'alpha'`.

## Deploying (read this: Pages builds get stuck)

Push `main` to `upstream` (GitHub) and Pages builds automatically, but builds **regularly hang in
`"building"`**. After every push:

```bash
gh api repos/ngvoicu/consensflow-site/pages/builds/latest --jq .status   # expect "built" within ~1 min
gh api -X POST repos/ngvoicu/consensflow-site/pages/builds               # re-queue if it sits in "building"
```

Then confirm the change is actually live: `curl -s https://consensflow.ngvoicu.dev/ | grep '<something-from-your-change>'`.
