# ConsensFlow dogfooding log — building consensflow-site

Building the ConsensFlow landing page doubled as a live test of ConsensFlow: the lead (Claude Code)
routed real sub-tasks to participants across **all five participant kinds**, and logged friction
("bumps") to feed back into consensflow-cc and consensflow-pi.

Date: 2026-06-25 · cc/pi version 1.2.0 (timeouts now opt-in/unbounded) · pi installed from git this session.

## 1.5.0 — per-run timeout removed (runs are unbounded)

ConsensFlow no longer caps a participant run. A run continues until the child CLI (or its upstream
provider) ends on its own — so a slow frontier model (e.g. glm-5.2 on a large review) is never
killed mid-synthesis. The only limit is the lead's own Bash-tool timeout when it shells out to `cf`;
use a generous one.

- **Gone:** `--timeout-ms <ms>` (run flag), `--timeoutMs` (participant/preset config), the presets'
  15-minute `timeoutMs: 900000` cap, `effectiveTimeoutMs`, and the participant-run `timedOut`
  surfacing path — removed across **both** hosts (cc + pi).
- **Kept:** `doctor`'s 5-second `--version` liveness probe — a health check, not a participant run;
  without it `doctor` would hang on a broken CLI. (The generic `spawnWithInput` timer remains only
  for that probe.)
- On a run with no final answer, the bounded reasoning/tool trail is still surfaced under a clear
  "no final answer" header (previously a "timed out" header).

Breaking change (a public flag and a config field were removed) → minor bump to **1.5.0**.

## 1.4.0 — read-only / safe-mode tier removed

The "read-only / safe mode" tier described in the 2026-06-25 log below no longer exists. As of 1.4.0,
participants of **all four kinds** (`pi`, `claude-code`, `codex`, `opencode`) run as standard
read-write CLI calls — exactly like running `claude` / `codex` / `pi` / `opencode` yourself. By default
they can read, edit files, and run commands.

- **Default tools policy is `workspace-write`** (confined to the project workspace). `--tools full-auto`
  is the *only* explicit escalation; it bypasses the engine's sandbox/approval checks.
- **`--rw` is still accepted but is now redundant** — it just equals the default `workspace-write`, so
  it is no longer an "escalation." Where older examples use `--rw` to mean "make it write-capable":
  write is the default; reach for `--tools full-auto` when you actually want to escalate.
- **Consulting is no longer sandboxed** — a consult *can* modify files. The lead still decides whether
  to keep or build on a participant's changes; inspect `git status` / `git diff` after a run.
- **Gone:** codex `--sandbox read-only`, claude `--disallowedTools` deny list (and
  `CLAUDE_READONLY_DISALLOWED`), the opencode `OPENCODE_PERMISSION` edit/bash deny overlay, pi's
  `read,grep,find,ls` tool restriction (pi now gets full tools), the `readonly` `toolsPolicy` value, and
  the "default safe mode / no write tools" behavior.

(Separately, shipped in 1.3.0: the session handoff is now bounded to **48 KB** by default — not the
earlier 120 KB — tunable via `CONSENSFLOW_HANDOFF_MAX_BYTES`.)

The dated log below is preserved as written; bumps tied to the old read-only tier are annotated as
superseded.

## Consults run (one at a time, as the product intends)

| # | Participant | Engine kind | Task | Result | Bump? |
|---|---|---|---|---|---|
| 1 | @pygmalion | image (gpt-image-2 via Codex login) | Generate the abstract ConsensFlow brand mark (no text) | ✅ exit 0 — excellent, on-brief mark (now the site logo/OG) | minor |
| 2 | @athena | codex (GPT 5.5 xhigh) | Hero copy + plain-language explainer + positioning critique | ✅ exit 0 — sharp critique, **applied** to the hero | none |
| 3 | @prometheus | pi (GLM 5.2) | Clarity-for-a-non-developer review | ✅ exit 0 — useful jargon rewrites | none |
| 4 | @odin | opencode (DeepSeek V4 Pro) | Accuracy / claims review | ✅ exit 0 — caught a real honesty nuance | none |
| 5 | @zeus | claude-code (Opus 4.8 max) | Structure / omissions review | ❌ exit 1 — **"Not logged in · Please run /login"** | **BUMP A** |

**Score: 4 / 5 engines worked smoothly.** No timeouts (the 1.2.0 fix held — these ran unbounded).
The handoff + read-only consult model worked exactly as designed for the four that ran.
_(As of 1.4.0 the read-only consult tier no longer exists — consults now run read-write like a normal
CLI call; see the 1.4.0 entry below.)_

### What the participants actually said (and what I did with it)
- **@athena (codex)** flagged the biggest positioning risk: it sounded like a *gimmicky "AI council."*
  Fix applied — the hero plain-language line now leads with practical value ("a fast, approval-gated
  second opinion … without switching tools or re-explaining your code") instead of "a group chat."
- **@prometheus (pi)** flagged "CLI" and "gated behind your approval" as jargon. The hero was already
  de-jargoned per @athena; the deeper sections keep "handoff" but explain it inline.
- **@odin (opencode)** noted the "the plugin stashes your transcript and hands it off" claim reads as
  routine, but the transcript format is undocumented and a handoff can degrade to empty — "a honesty
  gap, not a falsehood." Accurate (cc treats a handoff as context, never a precondition). Left the
  marketing copy as-is; logged here.

## Bumps observed

### BUMP A — claude-code participant fails to authenticate in the spawned child  ⚠️ real
`@zeus` (kind `claude-code`) returned `Not logged in · Please run /login` (exit 1). The child is
spawned as:
`claude -p … --bare --output-format stream-json … --model claude-opus-4-8 --effort max`
with `dropEnv: ["ANTHROPIC_API_KEY"]` (runners.js:73) — a deliberate choice so the child uses the
user's **subscription/OAuth login** instead of billing an API key. In this environment the headless
`--bare` child could not find a usable OAuth login, and with the API key dropped it had **no auth at
all** → failure.
- **Hypothesis / proposed fix:** only drop `ANTHROPIC_API_KEY` when a `claude` OAuth login is actually
  present; otherwise keep the key so the child can authenticate. Or surface a clearer, participant-
  specific error ("@zeus's claude child isn't logged in — run `claude login` or keep ANTHROPIC_API_KEY").
- Affects **both** cc and pi (pi's claude-code runner makes the same dropEnv choice). Needs verifying
  against how `claude` resolves credentials for a headless `-p --bare` child.

### BUMP B — stale tool name in the read-only denylist  ✅ easy fix
> **Superseded in 1.4.0** — the read-only tier was removed entirely, so the `--disallowedTools` deny
> list (and `CLAUDE_READONLY_DISALLOWED`) no longer exists. This bump is moot; kept for history. See
> the 1.4.0 entry below.

`@zeus`'s stderr: `Permission deny rule "MultiEdit" matches no known tool — check for typos.`
`CLAUDE_READONLY_DISALLOWED` passes `Bash,Edit,MultiEdit,NotebookEdit,Write` to `--disallowedTools`,
but the current `claude` CLI no longer has a `MultiEdit` tool, so it warns. Harmless, but noisy and
wrong.
- **Fix:** drop `MultiEdit` from `CLAUDE_READONLY_DISALLOWED` in `consensflow-cc/lib/runners.js` (and
  the mirror in `consensflow-pi/.../runners.js`). Re-check the rest of the list against the installed
  `claude` tool names while there.

### Minor — @pygmalion output weight
gpt-image-2 returned a 1254×1254 / ~1.2 MB PNG. Fine, but heavy for direct web use — needed a manual
`sips` downscale to a 480px mark + a 147 KB OG jpg. Not a bug; just a note that image runs need a
post-process step before shipping to a site.

## Proposed improvements to cc / pi
1. **(BUMP B) Remove `MultiEdit` from the claude read-only denylist** — tiny, safe, removes a spurious
   warning on every claude-code consult. _Recommended first fix._ — _Superseded in 1.4.0: the read-only
   denylist is gone entirely, so there's nothing left to prune._
2. **(BUMP A) Make the claude-code child's auth robust** — detect a usable login before dropping
   `ANTHROPIC_API_KEY`, or fail with a participant-specific, actionable message. _Needs design + verify._
3. **(doc)** Note in cc/pi READMEs that a `claude-code` participant needs the child `claude` to be
   independently authenticated (subscription login or API key).
