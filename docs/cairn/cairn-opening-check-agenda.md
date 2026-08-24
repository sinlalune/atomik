---
type: Atomik Brief
title: CP-OPS-002 opening check — agenda
description: The decisions the owner must make before CP-OPS-002 can be registered, each with its evidence, options and a recommendation. Written after a third-party coherence audit corrected four defects in the audit record and its execution plane.
tags: [cairn, brief, opening-check, cp-ops-002, ceremony]
timestamp: 2026-08-24T00:00:00Z
---

# CP-OPS-002 opening check — agenda

This is the agenda for the ceremony, not a substitute for it. `paths.md` requires the
opening check to be run **with the owner, feature by feature**, and activation needs
explicit acceptance. Eight decisions below; six change what gets built.

---

## 0. The true state, stated plainly

A third-party coherence audit established what four rounds of documents had blurred:

```
HEAD          7aa3b1d
origin/master 7aa3b1d          ← identical; nothing has landed
working tree  31 entries       ← 19 modified, 10 untracked, 2 deleted
gates         cairn-check OK · 47/47 tests
```

**Nothing is complete.** F1, F2, F8 and F9 are implemented, tested, and uncommitted. The
audit record said "repaired"; `CP-OPS-002` said "DONE… landed on the trunk". Both were
false and both are now corrected to *implemented locally, uncommitted*.

That was the most consequential finding of the whole exercise, and it was **in the
execution plane, not the documents**: a path file claiming landed work that does not
exist is precisely the failure Cairn is built to prevent, committed by the audit that
named it. Worth carrying into the ceremony as the reason the ceremony exists.

Two working-tree deletions were made by an agent, not by the owner:
`docs/cairn/index.html` and `docs/cairn/workflow.html` are staged as `D`. See §6.

---

## 1. How the local repairs enter the path

You chose **"move them into the path"** earlier and then paused. Confirming it is the
first thing the ceremony needs, because everything else waits on a clean trunk.

```
git stash -u                     # 31 entries, including 2 deletions
<register CP-OPS-002 on clean trunk>
git worktree add ../4tom1k-cp-ops-002 -b path/cp-ops-002 master
git stash pop                    # inside the worktree
<commit as S01…S02c, push, CI runs on path/** for the first time>
```

Two risks worth naming before you confirm. A `stash -u` carrying 31 entries including
deletions is the single most dangerous command in this plan, and there is no checkpoint
behind it. And the stash must pop in the **new worktree**, not the main one.

- [ ] **Confirm the stash route**, or choose: land the repairs on the trunk first as an
  owner-directed protocol repair, then register from a clean trunk.
- [ ] **Authorise a scratchpad copy of the working tree first**, either way. It is free
  and it is the only thing standing between a mistyped command and 47 tests.

## 2. Session-note schema — the ceremony gate documents itself wrong *(F13)*

The repaired `ceremony` rule is **blocking**, and the published operator guide would make
an operator fail it:

```
NESTED  atomik: { path, ceremony: closing }   -> false     ← what D1 and CP-OPS-002 S02 say
ROOT    path: … / ceremony: closing           -> true      ← what ships, and all 16 backfills
```

Root-level is what ships. The defect is mine and it propagated into D1.

- [ ] **Ratify root-level** as the schema, and pin it in `docs/bedrock/24_24-doc-templates.md`
  so it is stated once rather than restated per document.
- [ ] Or choose nested, which means changing the parser and re-backfilling 16 notes.

## 3. Registration contents — bedrock and `paths.md` disagree *(F15)*

`AGENTS.md` says a disagreement between them is a defect to report. Here it is:

| Source | What a registration commit contains |
| :-- | :-- |
| `atomik-project/coding-paths/paths.md` | **ONLY** the path declaration and regenerated `ACTIVE.md` |
| `docs/bedrock/24_24-doc-templates.md` | the path file, **the opening-check session note**, and `ACTIVE.md` |
| what the repo actually did (`9040417`) | followed bedrock |

Recommendation: **metadata-only, not "exactly two files"** — the invariant that matters is
*no implementation in the registration commit*. This decision applies to CP-OPS-002's own
registration, so it must be made before, not after.

- [ ] Ratify "metadata-only", amend `paths.md`, and note the fix in the same change.

## 4. Path lifecycle — D2 invented doctrine *(F11, F15)*

| Source | Says |
| :-- | :-- |
| bedrock 35 | *"A finished path moves to `status: done`, then `archived` — demotion, never deletion."* |
| ADR-012 | abandoned paths have **no** terminal transition |
| round-3 D2 | `done` is **terminal**; `running → archived` |
| the validator | checks current statuses, never transitions |

D2 is a proposal wearing a specification's clothes. Add `active` (dead vocabulary,
accepted by `schema`, rejected by `branch-path`) and the abandoned-path hole, and this is
one ADR's worth of decision.

- [ ] **Label D2 §2.2 "proposed"** until an ADR lands.
- [ ] Decide whether the lifecycle ADR is in scope for this path or its own.

## 5. Merge enforcement — the F8 residual is yours to close

CI now runs on `path/**` locally, but a local `git merge` still bypasses it, which is how
all six merges in this repository happened. The gate is positional, not structural.

- [ ] **Branch protection on `master`** requiring the `cairn` check — structural, and it
  changes how you merge.
- [ ] **Or a PR convention** for path landings.
- [ ] **Or accept positional enforcement** and say so in the specification. All three are
  defensible; silence is not, because the spec currently implies prevention.

## 6. The two deleted HTML files *(F6)*

An agent deleted both. `index.html` carried the drifted integrator doctrine and deserved
retirement; `workflow.html` was **clean**, regenerated 2026-08-24, and is referenced as a
live prototype artifact elsewhere in the repo.

- [ ] **Restore `workflow.html`**, and decide `index.html`'s fate: rewrite against ADR-012,
  archive with a dated superseded banner, or delete deliberately.
- [ ] Either way the deletion should be a decision recorded in the ceremony, not a
  side effect of someone else's cleanup.

## 7. Audit binding — the coherence audit cannot match its own HEAD *(F12)*

`cairn-audit` names a record for the current HEAD; committing it changes HEAD. All nine
audits in the repository name a different commit from the one that contains them, seven of
them exactly the parent. `--check` therefore cannot recognise a committed audit.

- [ ] Bind the audit to the **pre-audit HEAD it reviewed** (which is what the files
  already do, accidentally) and make `--check` accept any ancestor within the path — or
  bind to the rebase base. A binding choice, not a patch.

## 8. Scope and dispositions

- [ ] **Steps:** S01–S02c (adopt the local repairs) + S04–S09. S03 stays withdrawn.
- [ ] **F7** — six worktrees for merged paths and an orphan `registration/cp-worktree-cleanup`
  branch: drain in this path, or a separate short labelled path?
- [ ] **F10** — `isFilled()` is "the placeholder string is absent": fix, or accept and
  document as advisory-by-design?
- [ ] **D4 is a sketch, not a kit.** It has a malformed outer fence (three backticks around
  inner fences — Steps 2–3 render outside the copyable prompt and §§5–6 are swallowed as
  code; use four), omits `LEGACY_UNREGISTERED_PATHS`, mismatches `<project-name>-project/`
  against `"projectPlane": "atomik-project"`, cannot configure the hardcoded
  `docs/modules/atomik-desktop-${area}.md` target, assumes an unscaffolded `package.json`
  and gate scripts, and has no initial commit from which a first `base_commit` could come.
  **No config-consuming tool exists.** S08 is real work, not transcription.

---

## What the ceremony should record

A session note at `atomik-project/sessions/2026-08-24-cp-ops-002-opening-check.md`,
**root-level** `path: CP-OPS-002` and `ceremony: opening`, carrying each decision above and
its ruling. Then, and only then: registration commit, worktree, adopt the local repairs as
S01–S02c, push, and let CI run on a path branch for the first time in this repository.

## What this exercise actually demonstrated

Three independent agents audited the same repository. The first invented its numbers. The
second reformatted the first. The third found four defects in the record produced by the
second-and-a-half — including a false completion claim in the execution plane, three wrong
denominators, two overstatements, and invalid frontmatter in the audit that named
machine-unreadable metadata as a finding.

Nothing detected any of that mechanically. `cairn-check` reported `OK` throughout, because
every one of those defects was a **claim asserted beyond its evidence** — which is not a
checkable question, and is the same thing `paths.md` already admits about checkpoint
accuracy:

> *The rule the protocol most depends on is the one it cannot mechanically defend.*

That is the honest headline for CP-OPS-002. The mechanical layer is good and getting
better. The layer above it is held by ceremonies, which is why they are not optional and
why this agenda exists.
