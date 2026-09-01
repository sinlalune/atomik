---
type: Atomik Folder Log
title: Log — atomik-project/coding-paths
description: Recent meaningful changes to the execution-state plane, per the OKF folder convention.
tags: [log, okf, coding-paths]
timestamp: 2026-08-24T00:00:00Z
---

# Log — `atomik-project/coding-paths`

Recent meaningful changes in this scope: the execution-state plane. The companion map is
[index.md](./index.md). An agent reads the index before opening many files, and
this log when recency matters or when re-entering after time away
([bedrock 26](../../docs/bedrock/26_26-okf-agent-context.md)).

Seeded 2026-08-24 (CP-OPS-002 S05c) from Git history: the 15 most recent of 339 commits that touched this folder, newest first, merges omitted because a merge names the path rather than the change.

**Append newest-first, at the top, in the same work unit as the change.** Git
remains the complete record; this is the readable one. If two paths ever start
colliding on this file, it takes the amendment the journal already took — one file
per entry in a `log/` subfolder — which was a concurrency fix, never a size one.

## 2026-09-01

- `CP-OPS-002 S08n` replaces file-status proxying with an adding-blob prefix
  proof for born-sliced step records. The late S08m append is conforming; a
  changed earlier byte blocks, and immutable session/audit/journal identities
  cannot use the step-relocation exemption.
- `CP-OPS-002 S08l` made `CP-OPS-002` a folder — [ADR-020](../../docs/adr/ADR-020-protocol-context-weight.md)
  migration stage 2, and the worked example it asked for. `CP-OPS-002.md` became
  `CP-OPS-002/index.md`, thirty-nine steps became one file each under `steps/`,
  the forward plan became `plan.md`, and the seventy-four-row Work Ledger
  dissolved: ten live rows stayed in the header, sixty-three step-scoped rows
  went to the steps they describe, and `Steps complete` became the commit index
  in `steps/index.md`. Nothing was summarised, and it was verified mechanically
  rather than asserted.
- The move found three rules that knew a record by its address. `registration`
  reported a path registered since August as never registered; `transition`
  reported a declaration that had moved as deleted; `record-integrity` reported
  twenty-three relocated records as destroyed. A record's identity is the id it
  declares, not the file that carries it, and all three now key on the id.
- It also found two holes that would have opened in silence: step records inside
  a path folder were not covered by `isImmutableRecord`, and work units were read
  from the declaration file, which after slicing carries none — a path with
  thirty completed units would have reported zero, disarming `work-unit` and
  `checkpoint-retention` together.
- `paths.md` §*The path record is a folder, born sliced* replaces §*The ledger has
  a boundary*. `ledger-size` is deliberately kept, against ADR-020 stage 3, for as
  long as `CP-MVP-008`, `CP-MVP-011` and `CP-MVP-012` remain flat: it is the only
  signal an unsliced record gets.

## 2026-08-25

- `S07c` The three Cairn documents become one handbook (owner correction), and this path's own
  ledger is rolled: `ledger-size` fired at ~11 k tokens while the file was being edited, so
  S00–S06d moved **verbatim** into `history/`, verified by extraction against `HEAD`. The path
  file is back to ~5.7 k. The rule fired at the only moment it is useful, and it worked.

- `S07` CP-OPS-002: the Cairn primer, specification and lexicon land in `docs/cairn/`.
  The specification supersedes round 3's D1 operator guide and D2 draft as instructions.

- `S07a` ADR-017 settles the path lifecycle: `archived` is the single terminal state and
  the exit an abandoned path takes too, `active` leaves the vocabulary, and the advisory
  `path-staleness` rule notices a running path whose branch has gone quiet. `paths.md`
  states the vocabulary by reference and moves hole 1 to its closed list — two remain.

- `S06d` CP-OPS-002: drain the leftovers — six stale secondary worktrees removed for
  already-merged paths and the orphan `registration/cp-worktree-cleanup` branch deleted,
  with every `path/*` branch retained.

## 2026-08-24

- `360f2be` CP-OPS-002 S05b: retract the invented folder-log decision (owner correction)
- `d6b29f1` CP-OPS-002 S05b: gate the opening check, finish the OKF backfill
- `3df9073` CP-OPS-002 S05: backfill OKF — five indexes, ADR frontmatter, schema over the decision plane
- `7e04288` CP-OPS-002 S04: bound the ledger — history/ rollup and an advisory ledger-size
- `de57b3c` CP-OPS-002: rescope S06b to the enforcement tier model (owner ruling 9)
- `c4a9670` CP-OPS-002 S01: pin the ceremony schema, unify the registration doctrine
- `dd6e76a` CP-OPS-002 S00: adopt the enforcement repairs into the path
- `df875e6` Register CP-OPS-002 before branching
- `170d6fe` CP-WORKTREE-CLEANUP S02: close and dogfood worktree retirement
- `382ba30` CP-WORKTREE-CLEANUP S01: retire worktree after verified merge
- `9040417` Register CP-WORKTREE-CLEANUP before branching
- `23c1422` CP-OPS-001 S11: close path and repair done-state gate
- `a495095` CP-OPS-001 S10: record owner closing ceremony
- `9ea45db` CP-OPS-001 S09: push every step as a session boundary

## 2026-08-20

- `6deb103` CP-OPS-001 S08: register paths before branching
