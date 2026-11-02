# consensflow-site

The website of **ConsensFlow**, a desktop app for Mac and Windows that runs a software factory on
your project, staffed by AI coding agents: you give the goal to a Chief of Staff, it plans the work
on a board, and its staff (workers, advisors, reviewers, testers and an image designer) take the tasks, each in its own terminal
of Claude Code, Codex, Pi, Devin or Muse Code. Served at
[consensflow.ngvoicu.dev](https://consensflow.ngvoicu.dev); the app itself is
[ngvoicu/consensflow](https://github.com/ngvoicu/consensflow).

Sibling of [kluris-site](https://kluris.ngvoicu.dev) and [specmint-site](https://specmint.ngvoicu.dev);
same zero-build, single-file static stack.

## Stack

- **One self-contained `index.html`**: HTML, inline CSS and a few lines of vanilla JS. No framework,
  no build step, no CDN, no `node_modules`. The one other page, `status/index.html` (Supported versions,
  below), is self-contained the same way: its own inline CSS, the site's fonts and mark.
- Fonts: **Archivo** (400, 500, 700, 800) and **IBM Plex Mono** (400, 500), self-hosted as woff2 in
  `assets/fonts/` (latin subsets).
- Palette: the app's own. Ink `#08181D`, foam `#E9F1EF`, seafoam `#63C7B2`, amber `#E7B968`,
  buoy `#FF7868`, slate `#3D5B62`. On the page a colour means what it means on the app's board:
  slate is a task in the backlog, seafoam one at work, amber one waiting, foam one done, deep seafoam
  `#2B7569` one finished, buoy a warning.
- Dark and light themes via `prefers-color-scheme`. The app's board is dark-only, so the screenshots,
  the "How it works" strip and the factory diagram stay dark in both.
- The "How it works" strip plays once when it comes into view (a task card crossing the board's
  columns); with reduced motion it stays at its last step.
- The factory diagram ("A software factory": who talks to whom) is inline SVG, drawn by hand in the
  board's language: members as the board's staff rows (a lamp, a name in mono), messages as arrows
  labelled with what they carry, a question in the board's amber. All five roles are drawn: advisors,
  reviewers, workers, testers and the image designer. Two drawings of the same thing, wide
  (`.civ-wide`: the chief, and one line from it with each role off that line, workers in the middle
  with the arrow to your project) and tall (`.civ-tall`: one line down from the chief, the workers last,
  above your project), swapped by a media query at 1080px; each carries a `<title>` and a `<desc>` that
  say every exchange in words. A role's drawing is one line off the chief's own line, so the rule that
  the staff talk only to the chief shows in it: no member is joined to another. The example under it is T-2's thread from `tools/demo.mjs`, beat by beat, with the task's
  state after each beat as the square beside it (the goal and the note, which are not states, in the
  accent).

## The page

One page, top to bottom: the hero and its capture of the window; **A software factory** (who talks to
whom, and one goal from start to finish); **How it works** (a task across the board's columns);
**What it does**, a group of items beside or under the captures that show them: The staff, The
agents, switching the chief, The board, Specs (its viewer under it), History, Wake-up calls and
Project settings (beside the dialog), You stay in charge, and the staff's windows; then **The
harnesses**, **New in 3.0.7**, Install, Your data, and the source. Specs, History, Wake-up calls and Project settings are the groups added for
3.0.4 to 3.0.6; New in 3.0.7 is a section of its own, three groups (Muse Code, a meeting with the
chief, and what is steadier everywhere), whose words come from the landings of 3.0.7's first release in the app repo: D1
(`fb3037412`), the removal of a harness (`4d9c0fe9c`), D2a (`0db267189`), chief-meeting's paced
delivery (`f1500dc7c`), and D2b and the Muse Code reader fix once they land; it names what a user
notices, never a task or a branch, and never the removed harness. Muse Code's card carries a "New in
3.0.7" mark. The History viewer carries a "New in 3.0.6" mark (the chief's `cf history --find` is older, from 3.0.5 and before): the version, never its stage.

## The harnesses (`#harnesses`)

A card for each harness the app runs, in the app's order (`Harness::ALL` in `cf-proto/src/agents.rs`):
Claude Code, Codex, Pi, Devin, Muse Code. Each card has the harness's mark in a box the same size as
the others' (64 px, the mark itself about 40 px), its name, the roles it can hold as words (never a
colour: on this page a colour is a task's state), and the platforms. Under the cards, three lines say
why the roles differ. The roles are the app's, never more:

- **chief:** Claude Code, Codex, Pi and Devin. New project and Switch the chief offer a chief only on
  the harnesses of `HARNESS_NAMES` (`app/ui/core/dialogs.js`, `fillChiefs`), which has no Muse Code; the
  engine refuses an image agent as chief (`require_chief`, `crates/cf-engine/src/dispatcher.rs`).
- **worker, advisor, reviewer, tester:** every harness. A member's roles are `MEMBER_ROLES`
  (`crates/cf-ledger/src/model.rs`), which any agent that is not an image agent fits (`fits_role`),
  on any harness with an adapter (`crates/cf-harness/src/launch.rs`: all five).
- **image designer:** Codex alone. An image agent is a Codex agent (`crates/cf-catalog/src/roster/add.rs`
  refuses one on another harness: "Codex's image tool draws"), and it can be nothing else (`fits_role`).
- **Muse Code** has no ready-made agents in the catalog (`crates/cf-catalog/data/presets.json`): its
  agents are the human's own, from Settings → Agents. Its card says Mac: its Windows work is not in a
  release yet.

Change a card when the app changes one of these, and `tools/check-site.mjs` with it (`HARNESSES`).

## Supported versions (`/status/`)

Which version of each harness (Claude Code, Codex, Pi, Devin and Muse Code) each ConsensFlow release
supports, on Mac and Windows. Linked from the home page where the harnesses are named (the agents group
and Install), and listed in `sitemap.xml`. It is a page of its own because it is reference, and it
changes on its own clock, not the story's.

- **One matrix.** A row for each harness; for each supported release, newest on the right, a Mac and a
  Windows cell. A cell is the range of versions that release supports on that platform
  ("2.1.292 – 2.1.312"), coloured by its status: seafoam supported, amber supported with a known issue,
  slate newer than tested (we are testing it), buoy not supported, a muted foam not yet measured or not
  in that release (Muse before 3.0.7). The colours are the palette's own, and this is the one place on
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
  releases[]   version, channel (Stable, Alpha, Next), harnesses[]
    harnesses[]   id, platforms { mac, windows }
      platforms.*   from, to, status, issue? { text, state? }     status: supported, issues, newer,
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
  an `issue` listed, supported with a known issue; else supported. The page draws the status it is given
  and never computes one. The app's harness-window plan has a tool write the block from the app's code and
  from a check that watches each vendor's new versions, and `--check` it against the page; until then
  the block is written by hand from the live runs.
- **Known issues** are what a person would notice going wrong on the newest tested version, in plain
  words, never suite names. They leave out the test kit's own failures (a `ps` that cannot start on
  Windows, a suite's premise about a harness's record) and a red that
  one run showed and nothing explains. An issue carries `"state": "looking"` or `"fixing"` only while a
  task is on it.
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

`curl -fsSL https://consensflow.ngvoicu.dev/install.sh | sh` and
`irm https://consensflow.ngvoicu.dev/install.ps1 | iex`, shown in the Install section ("Or from a
terminal") with the update key they pin. Both files are copies of `install/install.sh` and
`install/install.ps1` in the app's repository, where they are written and tested: never edit them
here. Copy them with `npm run site:installers -- <this folder>` from the app's repository, which
refuses while this page shows another key than the scripts pin, onto the `installers` branch, then
bring the two files onto `main` as they are; `npm run site:installers -- --check <this folder>`
compares the `installers` branch with the app's. They install releases from 3.0.7 on, the first
whose SHA256SUMS is signed.

## Every page opens clean (`tools/check-site.mjs`)

The home page and Supported versions are each opened at 1280 and 390 px, light and
dark, in Chromium: nothing logged, thrown, failed or loaded from another origin, no sideways scroll,
every image loaded and shown at the shape of its file (a screenshot remade at another height needs its
`height` changed too), no page naming a harness the app has removed (in its text or its markup), and
none naming a release by its stage. On the home page, every list of the harnesses (the description, the
share and X descriptions, both JSON-LD descriptions and the software it needs, the lede and Install)
names all five, and the harnesses section has a card for each, in the app's order: its logo shown
(the vendor's file, loaded and at least 32 px, with no badge or words in its place), every mark's box
one size,
its name, and exactly the roles `HARNESSES` gives it. Each of those rules is then broken once on a copy
of the page (a mark gone, hidden, missing, small or of another size, a badge in a logo's place, words beside a
logo, an empty box, a card with
no roles or one role too many, a harness left out, a list or the JSON-LD leaving one out, the removed
harness named, a stage named), and the check must see it.

```bash
node tools/check-site.mjs ../../consensflow [folder for screenshots]   # 8 openings and 15 broken copies; a folder gets each page whole and the harnesses section
```

## Copy

The page says what the app's README and its releases support, from the user's side. "A software
factory" and the "small civilization" of the chief and its staff are the framing, not features:
every exchange the factory section and its diagram show (the goal and answers from the human, tasks,
answers and follow-ups to workers, questions and results back, questions to advisors and findings
back, reviews to reviewers and findings back) is one the app's README and role instructions
(`skill/core` in the app repo) give, and the staff never talk to each other. The testers (tests to
them, results with evidence back) and the image designer (a task naming what to draw and where to
save it, the file's path back) are drawn like the others, and their exchanges are in each drawing's
`<desc>`. The groups under What it does take their words from the releases' notes
(3.0.4 and 3.0.5 for specs, wake-up calls, Project settings and the project menu; 3.0.6 for History)
and the app's README. Install stays short:
the download, the platforms in one line, the harnesses it works with, and one link to the app's
README for the rest. On what the agents can do, it says:

- Agents work with full permissions in their windows, as they would if you ran them yourself. Your
  protection is the review, the chief's acceptance and, if you turn it on, your approval. Use
  ConsensFlow on projects kept in version control.
- Every agent, the chief and its staff alike, starts with its harness's MCP servers and connectors,
  skills, settings and customizations, as it would if you ran it yourself. The staff use them with
  full permissions while you aren't watching, so keep in a harness only what you would let any agent
  use.

## Local dev

```bash
python3 -m http.server 4500   # then open http://localhost:4500
```

`node tools/serve-site.mjs` serves the site as GitHub Pages does (a folder without its slash is sent to
the one with it); the Supported versions page is at http://localhost:4500/status/.

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

## Screenshots

The app's window is a web page (`app/ui` in the app repo) that talks to its daemon through the app's
bridge. The capture serves that page from a checkout of the app, as the app's own page tests do, and
opens it in Chromium with its real terminals (xterm, as the app has them):

```bash
# in the app repo, once: npm run build:cf   (puts the built cf in bin/)
# here, once: brew install webp             (cwebp makes the .webp files)
node tools/capture-screenshots.mjs ../../consensflow
node tools/og-image.mjs ../../consensflow
# only some captures (the page still goes through every step):
node tools/capture-screenshots.mjs ../../consensflow specs history staff project-settings
```

The path given is the app's checkout: from `sites/consensflow-site` it is `../../consensflow`, the
app repo beside the `sites` folder (the tools' default). Run with no names, the tool remakes every
capture, so none shows an older window than the text describes; they were all remade on 2026-10-25,
on the app's page of 3.0.6-alpha.2 (unchanged since). History's times are those of the day it runs.

Playwright comes from the app repo's `app/node_modules`; nothing is installed here.

- The board, a task and New project (cut after its staff, between sections, as Project settings is
  below) show the demo in `tools/demo.mjs` (a small web app,
  "pantry", with a chief on Claude Code and a staff on Codex, Pi, Claude Code and Devin), answered to
  the page by the same stand-in for the app that `app/tests/core-page.spec.mjs` uses. Its ledger
  reads as the daemon's would: messages numbered in the order they were sent, and T-2's thread (a
  brief, the worker's question and the chief's answer, a result, the chief's follow-up after a
  review, the second result) in the shape `task.get` gives it.
- The terminals show screens written for the demo in `tools/screens.mjs`: the chief's Claude Code
  putting tasks on the board with `cf task add`, and a Codex, a Pi and a Claude Code window of the staff,
  each drawn as that harness draws a session at work, with the `cf` commands and outputs the app
  really has. The stand-in hands each terminal its screen as the app hands it a window's output, for
  the size the terminal took. **No harness runs**: the screens, and what the board says of windows (a
  lamp at work, "1 terminal open", a task's 58 items), are the demo's, not a live run's.
- Switching the chief: `switch-chief.webp` is the page's Switch the chief dialog with an agent
  picked; the stand-in then switches as the daemon would, and `new-chief.webp` is the chief's new
  window, on Codex, opening on its handoff, written as `crates/cf-engine/src/handoff.rs` writes one.
- The page lays its terminals out in one row that scrolls sideways: with the board folded, the chief
  takes two thirds of it and each other window a third, so the chief and one more window show at
  once. `chief-and-staff.webp` is that row from its start, `staff-windows.webp` the same row scrolled
  to the staff's three windows.
- Specs, History and Project settings show the same demo through the same stand-in, which answers
  the page as the daemon does (`specs.tree`, `specs.file`, `history.get`, `wakeup.get`, `member.add`):
  - `specs.webp` is the specs viewer on pantry's own specs folder, written for the demo in
    `tools/specs.mjs` (a registry and four specs in Specmint's core shape; the shopping list's phases
    are the tasks of the demo's board), with the shopping list's SPEC.md chosen.
  - `history.webp` is the chief's History searched for "time zone": the chief's conversation going on
    now, in `tools/demo.mjs` (`chiefHistory`), its words, the human's and the deliveries (the advisor's
    answer, m-16, opened from its line).
  - `staff.webp` and `project-settings.webp` are one Project settings dialog cut between its
    sections: the staff above, human approval, wake-up calls (on, every two hours) and specs (on) below.
    A tester and the image designer are added through the dialog's own form, as a human would.
- The agents the pickers offer, Settings → Agents, and the version of Specmint the Specs section
  names, come from the real daemon (`cf ui`), started
  on a home made under the system's temp folder and deleted after.
- Nothing reads or writes `~/.consensflow` or the harnesses on the machine, and the demo shows no
  real name, path or account (its folders are under `/Users/demo/projects/`).

## Deploy

GitHub Pages from the repo root. `CNAME` serves `consensflow.ngvoicu.dev`. Download links point at
[/releases](https://github.com/ngvoicu/consensflow/releases), never `/releases/latest`. The site
never qualifies a release by its stage on GitHub, anywhere: copy, captions, alt text, structured
data, this README.

## Deploying (read this: Pages builds get stuck)

Push `main` to `upstream` (GitHub) and Pages builds automatically, but builds **regularly hang in
`"building"`**. After every push:

```bash
gh api repos/ngvoicu/consensflow-site/pages/builds/latest --jq .status   # expect "built" within ~1 min
gh api -X POST repos/ngvoicu/consensflow-site/pages/builds               # re-queue if it sits in "building"
```

Then confirm the change is actually live: `curl -s https://consensflow.ngvoicu.dev/ | grep '<something-from-your-change>'`.
