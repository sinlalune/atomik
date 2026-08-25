---
type: Atomik Folder Log
title: Log — docs/cairn
description: Recent meaningful changes to the Cairn protocol as explained outside this repository, per the OKF folder convention.
tags: [log, okf, cairn]
timestamp: 2026-08-24T00:00:00Z
---

# Log — `docs/cairn`

Recent meaningful changes in this scope: the Cairn protocol as explained outside this repository. The companion map is
[index.md](./index.md). An agent reads the index before opening many files, and
this log when recency matters or when re-entering after time away
([bedrock 26](../../docs/bedrock/26_26-okf-agent-context.md)).

Seeded 2026-08-24 (CP-OPS-002 S05c) from Git history: the 9 most recent of 9 commits that touched this folder, newest first, merges omitted because a merge names the path rather than the change.

**Append newest-first, at the top, in the same work unit as the change.** Git
remains the complete record; this is the readable one. If two paths ever start
colliding on this file, it takes the amendment the journal already took — one file
per entry in a `log/` subfolder — which was a concurrency fix, never a size one.

## 2026-08-25

- `S07b` `foundations.html` renders the primer in the house style of `index.html`, with the
  analogy given its own two-column component (*in your world* → *in software*, seven of
  them) and each repository failure its own visually distinct block — evidence, not
  illustration. Glossary appendix from the lexicon's plain-language column. Dated banner
  naming what it renders and which file wins on disagreement.

- `S07` Three documents, on the owner's pedagogical amendment. `foundations.md` teaches
  version control, tests, CI and the reason for a protocol **from zero**, for someone who
  writes real code but has never worked in a production setup — every mechanism bridged to
  a rigour the reader already practises (a unit test is a positive control, TDD is
  preregistration, a generated file is a figure you do not edit in Illustrator) and taught
  through a failure this repository actually had. `specification.md` is normative and
  points into it at every section. `lexicon.md` glosses 60 terms and marks the four with
  nothing behind them yet as ASPIRATIONAL. The rule catalogue is spliced by
  `cairn-rules.mjs --write` and pinned by a test, so the page warning about hand-written
  rule tables can no longer carry one.

- `S07a` D2 §2.2 stops proposing a lifecycle of its own: a dated banner, the accepted
  ADR-017 outcome, the `active` row removed, the abandoned-path gap marked closed, and
  §2.3's rule table regenerated with `path-staleness`. Corrections register gains C16.
  `index.html` names ADR-017 in its banner and carries the new advisory rule.

## 2026-08-24

- `S06` `index.html` rewritten against ADR-012 — the integrator model it taught at
  ten sites replaced by two roles and N paths each merging itself; enforcement table
  regenerated against the rules that exist; both HTML pages given a dated status
  banner naming the ADRs they render, because the page drifted unnoticed for ten days
  with no vintage on it.

- `d6b29f1` CP-OPS-002 S05b: gate the opening check, finish the OKF backfill
- `3df9073` CP-OPS-002 S05: backfill OKF — five indexes, ADR frontmatter, schema over the decision plane
- `7e04288` CP-OPS-002 S04: bound the ledger — history/ rollup and an advisory ledger-size
- `c4a9670` CP-OPS-002 S01: pin the ceremony schema, unify the registration doctrine
- `dd6e76a` CP-OPS-002 S00: adopt the enforcement repairs into the path
- `df875e6` Register CP-OPS-002 before branching
- `382ba30` CP-WORKTREE-CLEANUP S01: retire worktree after verified merge
- `9ea45db` CP-OPS-001 S09: push every step as a session boundary

## 2026-08-15

- `92f25cb` CP-OPS-001 S01–S04f — Cairn: parallel coding paths, self-merge, and the CI that enforces it
