---
type: Atomik Brief
title: Handoff — CP-OPS-002 S07c complete, ready for S08
timestamp: 2026-08-25T00:00:00Z
atomik:
  path: CP-OPS-002
  branch: path/cp-ops-002
  completed_step: S07c
---

# Resume CP-OPS-002 here

## Repository state

- Worktree `../4tom1k-cp-ops-002` (this checkout), branch `path/cp-ops-002`
  tracking `origin/path/cp-ops-002`. `node_modules` is symlinked from the main
  checkout.
- Registered at `base_commit: 7aa3b1d` by the trunk commit `df875e6` before this
  branch existed; `dd6e76a` is S00.
- `git worktree list` holds four entries — the owner's trunk, the two
  grandfathered in-flight paths (`cp-mvp-011`, `cp-mvp-012`) and this one. All ten
  `path/*` branches are retained.
- Gates at S07c: `npm run cairn-check` OK with one advisory — no coherence audit
  for this head, expected until the pre-merge audit. Validator suite
  `npm run cairn-check:test` 83/83. HTML structure parser-validated.
- `typecheck` / `test` / `build` are not run and their verdicts are not claimed:
  this path writes protocol tooling and doctrine only, and touches no product code.
- **The path file was rolled at S07c** and is back to ~5.7 k tokens. S00 through
  S06d live in [`history/`](../coding-paths/history/index.md), verbatim.

## What the completed step changed

**S07c — the redo, on owner correction.** S07 and S07b are superseded.

> *"I never asked you to write specifically for researchers, I said i could land on
> researcher hands, it needs to be universal without borrowing concept from research
> worlds. Redo everything."*

- **The error worth remembering:** the owner stated a *possibility* — this could
  reach a researcher — and it was read as a *specification*. The whole explanatory
  apparatus was then built from research-world concepts, which made a document
  claiming to teach from zero **depend on** a background. The analogies were
  **removed, not replaced**: substituting another profession's would reproduce the
  defect with a different dependency.
- **One file, not three.** `foundations.md`, `specification.md`, `lexicon.md` and
  `foundations.html` are deleted; `docs/cairn/handbook.md` and
  `docs/cairn/handbook.html` replace them. Each part is a `CONCEPT` block —
  general software practice from nothing — immediately followed by an `IN CAIRN`
  block with the implementation, the enforcing file, and the failure that made it
  necessary. **The IN CAIRN blocks are self-contained and carry every normative
  statement**, which is what made merging the specification into the teaching safe.
- **The teaching rests on this repository's own dated failures** and on diagrams:
  the automation that never ran where its rules applied, the ceremony gate that
  proved the wrong proposition, the piped gate that shipped a broken build, the
  derived view that was internally current and globally false, the 34 links that
  were not broken.
- **A new theme**, built for a long dense reference rather than reusing
  `index.html`'s house style — sans throughout, one accent, sticky contents, and
  five inline SVG diagrams (commit chain and hash propagation, branch divergence,
  the three enforcement states, parallel paths with self-merge, the lifecycle).
- **`SPEC_FILE` follows the file**, so the test comparing the shipped rule
  catalogue against the validator's source still runs on every CI run.
- **The ledger was rolled**, because `ledger-size` fired at ~11 k tokens while
  this file was being edited — the only moment the rule is useful. S00–S06d moved
  verbatim into `history/`, verified by extracting each record and comparing
  against `HEAD`. Two mechanical adjustments are named in every record header
  rather than made silently: deixis is left alone; relative-link depth is
  repointed one level, because a link is an address rather than content.

## Where the path stands

Steps complete: **S00** enforcement repairs · **S01** ceremony schema and ADR-016 ·
**S04** the ledger boundary · **S05 / S05b / S05c** the OKF backfill, the gated
opening check, folder logs · **S06** the drifted page retired · **S06c** the
coherence audit bound to its own commits · **S06d** stale worktrees drained,
`isFilled()` given something to measure, a C-quoted path stopped hiding from the
blocking rules · **S07a** ADR-017, the path lifecycle · **S07 / S07b** superseded ·
**S07c** the handbook. S03 was withdrawn by owner ruling; S06b was rescoped by
ruling 9 and delivered inside the handbook.

Remaining: **S08**, **S09**.

## Next action

**S08 — extract Cairn from Atomik.** The validator hardcodes `atomik-project/`,
`apps/`, its area map and its grandfather sets, so it is not portable today.

- `cairn.config.json` — plane roots, source roots, area map, trunk name, and
  `"enforcement": "local" | "ci" | "protected"`.
- `cairn-check` prints the declared tier in its header line, so "CI observes"
  versus "CI prevents" is **generated** from the repository rather than written
  into prose that drifts.
- `tools/cairn-new.mjs` — registration commit and worktree in one command, so
  the registration precondition stops depending on memory.
- A `cairn-init` seed plus the ex-nihilo bootstrap prompt, scaffolding **tiers 0
  and 1 only**: validator, config, docs skeleton, workflow file. No host
  configuration, no account, nothing to click.

The handbook's *"terms with nothing behind them yet"* table lists exactly these
four as **ASPIRATIONAL**. S08 is what drains it, and that table is the checklist.

## Blockers and decisions still open

- None. Nothing waits on host configuration: **owner ruling 9 (2026-08-24)**
  rescoped S06b from "configure branch protection" to "declare the enforcement
  tier" ([note](../sessions/2026-08-24-cp-ops-002-s06b-rescope.md)). This
  repository is tier 1, declared.

## Resume instruction for the agent

Resolve the path from this worktree's branch, verify the ledger against Git,
then execute `next action`. Do not ask the owner to restate the prior session.
