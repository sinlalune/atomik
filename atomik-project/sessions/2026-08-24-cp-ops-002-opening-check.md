---
type: Atomik Session Record
title: CP-OPS-002 opening check — Cairn 2.0, after three audits and one false completion claim
timestamp: 2026-08-24T00:00:00Z
tags: [opening-check, cairn, protocol, ceremony, cp-ops-002]
path: CP-OPS-002
branch: path/cp-ops-002
ceremony: opening
---

# CP-OPS-002 opening check

Run with the owner on 2026-08-24 from the agenda in
[`docs/cairn/cairn-opening-check-agenda.md`](../../docs/cairn/cairn-opening-check-agenda.md).
Eight decisions, all ruled. Activation accepted.

## Why this path exists

Three independent agents audited the Cairn protocol. The first invented its numbers; the
second reformatted the first; the third found four defects in the record produced by the
second-and-a-half. The most serious was not in any document:

> `CP-OPS-002` declared S01/S02/S02b/S02c **DONE** and **"landed on the trunk"**, while
> `HEAD` and `origin/master` were both `7aa3b1d` and every change was an uncommitted
> working-tree modification.

A path file claiming landed work that does not exist is the exact failure Cairn is built
to prevent, written by the audit that named it. `cairn-check` reported `OK` throughout,
because the defect was a claim asserted beyond its evidence — not a checkable question.
`paths.md` already admits this class: *"the rule the protocol most depends on is the one
it cannot mechanically defend."*

That is this path's premise. The mechanical layer is good and getting better; the layer
above it is held by ceremonies, which is why this one was run before anything landed.

## State at acceptance

```text
HEAD / origin/master   7aa3b1d (identical — nothing landed)
working tree           31 entries, gates green
gates                  cairn-check OK · 47/47 tests
F1 F2 F8 F9            implemented locally, uncommitted, NOT complete
backup                 scratchpad/worktree-backup-160727 (35 files, both HTML recovered)
```

## Decisions

**1 — Local repairs enter through the path.** Stash, register from a clean trunk, create
the worktree, pop inside it, and land the repairs as real S01–S02c steps. The repairs run
through the protocol they repair rather than around it. This produces the first CI run on
a path branch in this repository's history.

**2 — Session-note ceremony schema is ROOT-LEVEL.** `path:` and `ceremony:` at the top
level, which is what `ceremonyFromSessions()` reads and what all 16 backfilled notes use.
The nested `atomik: { path, ceremony }` form returns `false` from the live parser and was
wrong in both `CP-OPS-002` S02 and the D1 operator guide — an operator following the
published guide would have failed a *blocking* gate. Pinned in bedrock 24 so it is stated
once. (This note uses the ratified form.)

**3 — A registration commit is METADATA-ONLY, not "exactly two files".** `paths.md` said
only the declaration and `ACTIVE.md`; bedrock 24 said those plus the opening-check note;
the repository's last real registration (`9040417`) followed bedrock. The invariant that
matters is *no implementation in the registration commit*. `paths.md` is amended to say so.
Reported as a doctrine defect per `AGENTS.md`.

**4 — Restore `workflow.html`; archive `index.html` behind a banner.** An agent had deleted
both. `workflow.html` was never drifted — regenerated 2026-08-24, clean, and referenced
elsewhere as a live artifact; it is restored byte-identical to `master`. `index.html`
carries the rejected integrator doctrine and is retained as history behind a dated
SUPERSEDED banner pointing at ADR-012 and `paths.md`, with the tab title marked too.

**5 — The lifecycle is decided by ADR, not by a specification.** Round 3's D2 declared
`done` terminal and drew `running → archived`, contradicting bedrock 35 (*"a finished path
moves to `done`, then `archived`"*) and ADR-012 (abandoned paths have no terminal
transition). D2 §2.2 is marked **proposed**; `ADR-017` settles `done → archived`, the
abandoned-path hole, and retiring `active`; D2 then documents the accepted outcome.

**6 — Merge enforcement becomes structural: branch protection on `master`.** CI now runs on
`path/**`, but a local `git merge` still bypasses it — how all six merges here happened.
The owner will configure GitHub branch protection requiring `cairn-check` and `gates`; the
agent cannot do this from the repository. Until it is on, the specification must say CI
observes rather than prevents.

**7 — The coherence audit binds to the HEAD it REVIEWED.** `cairn-audit` named a record for
the current HEAD; committing it moved HEAD, so `--check` could never match. All nine
existing audits name a different commit from the one containing them, seven exactly the
parent. `--check` will accept a record naming HEAD or any ancestor within the path's own
commits — formalising what the nine files already do accidentally, with no renaming and no
migration.

**8 — Full scope accepted.** F7 (drain six stale worktrees and the orphan
`registration/cp-worktree-cleanup` branch), F10 (`isFilled()` beyond placeholder-absence),
S04 (ledger boundary and `history/` rollup) and S05 (OKF backfill) are all in.

## Scope boundary

No product code. This path writes protocol tooling, doctrine, ADRs, and the greenfield kit.
`apps/`, `packages/` and `shared/` are deliberately excluded, so the `same-work-unit` rule
should never fire for it.

## Acceptance

The owner accepted activation on 2026-08-24 after ruling all eight decisions. The path
registers at `base_commit: 7aa3b1d` on branch `path/cp-ops-002`.
