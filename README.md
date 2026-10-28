# consensflow-site

The website of **ConsensFlow**, a desktop app for Mac and Windows that runs a software factory on
your project, staffed by AI coding agents: you give the goal to a Chief of Staff, it plans the work
on a board, and its staff (workers, advisors, reviewers, testers and an image designer) take the tasks, each in its own terminal
of Claude Code, Codex, OpenCode, Pi or Devin. Served at
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
Project settings (beside the dialog), You stay in charge, and the staff's windows; then Install, Your
data, and the source. Specs, History, Wake-up calls and Project settings are the groups added for
3.0.4 to 3.0.6; The History viewer carries a "New in 3.0.6" mark (the chief's `cf history --find` is older, from 3.0.5 and before): the version, never its stage.

## Supported versions (`/status/`)

Which version of each harness (Claude Code, Codex, Pi, Devin and Muse Code) ConsensFlow works with on
Mac and Windows, the newest version it has been tested on, what is known to go wrong, and which newer
versions it has not been tested on yet. Linked from the home page where the harnesses are named (the
agents group and Install), and listed in `sitemap.xml`. It is a page of its own because it is
reference, and it changes on its own clock, not the story's.

- **One table.** A row for each harness and platform, grouped by harness, with the columns Harness (and
  the vendor's link), Platform, Oldest supported (marked "checked at launch" when the app refuses an
  older one, "not checked at launch" when it only states it), Newest tested (with the date of its last
  pass), Vendor's newest (with its date), Status (a pill) and Known issues. Under a harness's two rows
  are its notes, and the live suites that passed. A legend above the table says what each pill means.
  Stable 3.0.5 and Alpha 3.0.6 make the same version checks, so no row has a ConsensFlow column; the
  page says once that the tests ran on development builds of 3.0.6 (Muse Code: 3.0.7, not in a release
  yet). Below 1040 px each row is a card with the same fields (a `td`'s `data-label` is its card label),
  and the column headings give way to them.
- **Built to be generated.** Everything the page says about a version is in one block, the
  `<script type="application/json" id="status-data">` between the `status-data:begin` and
  `status-data:end` comments: the page's date, the releases (`app`), and per harness its link, its
  oldest supported version (and whether the app checks it when a window opens or only states it), the
  vendor's newest release with its date and where it was read, and per platform the newest tested
  version, its date, the live suites that passed and the known `issues`. The rest of the file is
  presentation: it reads the block, builds the table with `textContent` (a link only if it is https),
  and **computes each status from the block** by one rule, written out in the legend: no tested
  version on that platform, "Not yet measured"; `vendor.verdict: "broken"`, "Not supported"; the
  vendor's newest newer than the newest tested, "Newer than tested"; issues listed, "Supported, with
  known issues"; else "Supported". Nothing in the presentation names a version. The app's
  harness-window plan has a tool write the block from the app's code (each harness's oldest supported
  and newest tested versions) and from a check that watches each vendor's new versions, and `--check`
  it against the page; until then the block is written by hand from the live runs.
- **Known issues** are what a person would notice going wrong on the newest tested version, in plain
  words, never suite names. They leave out the test kit's own failures (a `ps` that cannot start on
  Windows, an OpenCode that is not installed, a suite's premise about a harness's record). An issue
  carries `"state": "looking"` or `"fixing"` only while a task is on it, and the page then adds "We're
  looking into it." or "Being fixed."
- **Colours.** The five statuses wear the palette's own colours, each pill with its words: seafoam
  Supported, amber Supported with known issues, slate Newer than tested, buoy Not supported, a muted
  foam Not yet measured. This is the one place where a colour is a status and not a task's state. Every
  pill's text keeps at least 4.5:1 against its fill in light and dark (the check measures it).
- **Copy.** Releases are named by the version and the channel the app's updater names (`Stable`,
  `Alpha`), never by their stage, as everywhere on this site: the check fails on `alpha.N`, `rc.N` or
  "pre-release" in the data or on the page. A suite is listed only if it passed; "Not yet measured" is
  said where no figure exists, never a guess.
- **Check and preview.** The page is checked in Chromium (the data's shape and dates; a row for each
  harness and platform, and each row's status, words and colour class against the rule; the legend; the
  pills' contrast; nothing loaded from another origin; hostile data shown as text and a link that is not
  https dropped; an unreadable block; the links; a table at 1280 px, cards at 390 px with nothing
  scrolling sideways), and the check starts no harness:

  ```bash
  node tools/check-status.mjs ../../consensflow [folder for screenshots]   # 1280 and 390 px, light and dark
  node tools/serve-site.mjs                                                # then http://localhost:4500/status/
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
  "pantry", with a chief on Claude Code and a staff on Codex, Pi, OpenCode and Devin), answered to
  the page by the same stand-in for the app that `app/tests/core-page.spec.mjs` uses. Its ledger
  reads as the daemon's would: messages numbered in the order they were sent, and T-2's thread (a
  brief, the worker's question and the chief's answer, a result, the chief's follow-up after a
  review, the second result) in the shape `task.get` gives it.
- The terminals show screens written for the demo in `tools/screens.mjs`: the chief's Claude Code
  putting tasks on the board with `cf task add`, and a Codex, a Pi and an OpenCode window of the staff,
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
