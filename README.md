# consensflow-site

The website of **ConsensFlow**, a desktop app for Mac and Windows that runs a team of AI coding agents
on your project: you talk to a Chief of Staff, it plans the work on a board, and its staff (workers,
advisors and reviewers) take the tasks, each in its own terminal of Claude Code, Codex, OpenCode, Pi
or Devin. Served at [consensflow.ngvoicu.dev](https://consensflow.ngvoicu.dev); the app itself is
[ngvoicu/consensflow](https://github.com/ngvoicu/consensflow).

Sibling of [kluris-site](https://kluris.ngvoicu.dev) and [specmint-site](https://specmint.ngvoicu.dev);
same zero-build, single-file static stack.

## Stack

- **One self-contained `index.html`**: HTML, inline CSS and a few lines of vanilla JS. No framework,
  no build step, no CDN, no `node_modules`.
- Fonts: **Archivo** (400, 500, 700, 800) and **IBM Plex Mono** (400, 500), self-hosted as woff2 in
  `assets/fonts/` (latin subsets).
- Palette: the app's own. Ink `#08181D`, foam `#E9F1EF`, seafoam `#63C7B2`, amber `#E7B968`,
  buoy `#FF7868`, slate `#3D5B62`. On the page a colour means what it means on the app's board:
  slate is a task in the backlog, seafoam one at work, amber one waiting, foam one done, deep seafoam
  `#2B7569` one finished, buoy a warning.
- Dark and light themes via `prefers-color-scheme`. The app's board is dark-only, so the screenshots
  and the "How it works" strip stay dark in both.
- The "How it works" strip plays once when it comes into view (a task card crossing the board's
  columns); with reduced motion it stays at its last step.

## Copy

The page says what the app's README and its releases support, from the user's side. On what the
agents can do, it says:

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
node tools/capture-screenshots.mjs ../consensflow
node tools/og-image.mjs ../consensflow
```

Playwright comes from the app repo's `app/node_modules`; nothing is installed here.

- The board, a task, the staff and New project show the demo in `tools/demo.mjs` (a small web app,
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
- The agents the pickers offer, and Settings → Agents, come from the real daemon (`cf ui`), started
  on a home made under the system's temp folder and deleted after.
- Nothing reads or writes `~/.consensflow` or the harnesses on the machine, and the demo shows no
  real name, path or account (its folders are under `/Users/demo/projects/`).

## Deploy

GitHub Pages from the repo root. `CNAME` serves `consensflow.ngvoicu.dev`. Every release of the app
so far is a prerelease, so download links point at
[/releases](https://github.com/ngvoicu/consensflow/releases), not `/releases/latest`.

## Deploying (read this: Pages builds get stuck)

Push `main` to `upstream` (GitHub) and Pages builds automatically, but builds **regularly hang in
`"building"`**. After every push:

```bash
gh api repos/ngvoicu/consensflow-site/pages/builds/latest --jq .status   # expect "built" within ~1 min
gh api -X POST repos/ngvoicu/consensflow-site/pages/builds               # re-queue if it sits in "building"
```

Then confirm the change is actually live: `curl -s https://consensflow.ngvoicu.dev/ | grep '<something-from-your-change>'`.
