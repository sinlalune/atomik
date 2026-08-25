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
