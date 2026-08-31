---
type: Atomik Folder Log
title: Log — docs/adr
description: Recent meaningful changes to accepted decision records, per the OKF folder convention.
tags: [log, okf, adr]
timestamp: 2026-08-24T00:00:00Z
---

# Log — `docs/adr`

Recent meaningful changes in this scope: accepted decision records. The companion map is
[index.md](./index.md). An agent reads the index before opening many files, and
this log when recency matters or when re-entering after time away
([bedrock 26](../../docs/bedrock/26_26-okf-agent-context.md)).

Seeded 2026-08-24 (CP-OPS-002 S05c) from Git history: the 15 most recent of 20 commits that touched this folder, newest first, merges omitted because a merge names the path rather than the change.

**Append newest-first, at the top, in the same work unit as the change.** Git
remains the complete record; this is the readable one. If two paths ever start
colliding on this file, it takes the amendment the journal already took — one file
per entry in a `log/` subfolder — which was a concurrency fix, never a size one.

## 2026-08-31

- `S08d` proposes `ADR-020`, which makes protocol context weight a first-order
  constraint rather than an afterthought. Measured for one running path, the
  cold-resume read is ~23.9 k tokens before any work begins, and the path record
  is half of it. The `history/` rollup answered the growth with discipline — grow,
  then move steps out verbatim — and the measurement found what it cannot reach:
  the Work Ledger, a 42-row table that is the file's largest section, is not a
  step and does not roll. Almost every row is a fact about one step, held in the
  parent because the parent used to be the only file.
- The decision generalises past the path record on owner directive: slicing and
  indexing every artefact becomes the maxim, tested by separation rather than by
  a token budget — *the must-do is the index, the why is linked, and a reader who
  follows only the index executes correctly.* A budget would be satisfiable by
  compression, and compressing an explanation is how a record starts saying
  something slightly untrue.
- Two findings landed with it. The entry chain is protocol wearing a host
  wrapper: `bedrock 22`'s body carries exactly one host-specific line, while
  `bedrock 00` is entirely the product's constitution and sits in front of every
  first session. And the same text produces different behaviour in different
  harnesses — named here as **instruction parity**, the reader-side twin of gate
  parity, distinct because it breaks on a document's own volume and interleaving
  rather than on an environment value.
- The concept wiki is at its hard cap of 71, so the new article is deferred to
  acceptance rather than added quietly: the cap exists to make vocabulary growth
  a visible decision.

## 2026-08-26

- `S07g` proposes `ADR-019`, the Cairn v0.2 revision. Two of its nineteen items
  are places where the protocol broke its own promises: rebase-before-close
  orphaned every checkpoint the ledger named, and the rule keeping pre-acceptance
  work unpushed forbade publishing the most losable state in the system. Both are
  fixed — retention refs under `refs/cairn/checkpoints/`, and a marked provisional
  commit excluded from candidate identity. The handoff brief gains a real contract
  with a cold-resume metric; closure is restricted field by field; scope is bound
  by digest; drift is decided by a predicate over `writes:` ∪ `governs:` rather
  than by trunk equality, which would livelock. The lightweight route becomes the
  default, which is the counterweight that makes the rest affordable rather than
  polish. No checker rule lands: every added requirement carries a matrix row that
  says `not implemented`.

## 2026-08-25

- `S07f` proposes `ADR-018`: preserve Cairn's team/path/remote-checkpoint model,
  bind audit and acceptance to one exact candidate, add truthful `ready` and
  terminal-resolution semantics, fail critical unknowns closed, and state the
  control-plane trust boundary. It remains proposed until the owner's review
  pass over the uncommitted correction.

- `S07a` `ADR-017` settles the path lifecycle three documents described differently:
  `archived` is the single terminal state and the exit an abandoned path takes too
  (`running → archived`, no fifth word), `done` is a completion rather than an end,
  `active` leaves the vocabulary, and staleness is noticed by an advisory signal.
  It also states the honest limit — a validator sees one commit, so transitions are
  doctrine and only per-state invariants are enforced.

## 2026-08-24

- `3df9073` CP-OPS-002 S05: backfill OKF — five indexes, ADR frontmatter, schema over the decision plane
- `de57b3c` CP-OPS-002: rescope S06b to the enforcement tier model (owner ruling 9)
- `c4a9670` CP-OPS-002 S01: pin the ceremony schema, unify the registration doctrine
- `382ba30` CP-WORKTREE-CLEANUP S01: retire worktree after verified merge
- `9ea45db` CP-OPS-001 S09: push every step as a session boundary

## 2026-08-20

- `6deb103` CP-OPS-001 S08: register paths before branching
- `d7bc91b` CP-RENDER-REPAIRS S06 — close the render repairs path

## 2026-08-19

- `81d2fa7` CP-AI-CAPABILITIES S01: tell the model what the surface renders

## 2026-08-18

- `d137e19` CP-RICH-MARKDOWN S07: a real-Electron smoke lane for the renderers

## 2026-08-17

- `9336af4` CP-RICH-MARKDOWN S07: make the renderers work in the real app
- `b9d54b3` CP-RICH-MARKDOWN S06: render rich code with decoration-only diagnostics
- `9ccc036` CP-RICH-MARKDOWN S05: render secure Vega-Lite charts
- `66c7bda` CP-RICH-MARKDOWN S04: render secure Mermaid diagrams
- `92d78f6` CP-RICH-MARKDOWN S03: render safe KaTeX math
- `b0a85e9` CP-RICH-MARKDOWN S01: pin renderer architecture and baseline
