---
type: Atomik Folder Log
title: Log — atomik-project/coding-paths/CP-OPS-002
description: Recent meaningful changes in this scope, per the OKF folder convention.
tags: [log, okf, cairn, coding-path]
timestamp: 2026-09-02T00:00:00Z
---

# Log — `atomik-project/coding-paths/CP-OPS-002`

Recent meaningful changes in this scope. The companion map is
[index.md](./index.md); an agent reads the index before opening many files, and
this log when recency matters or when re-entering after time away
([bedrock 26](../../../docs/bedrock/26_26-okf-agent-context.md)).

**Append newest-first, at the top, in the same work unit as the change.** Git
remains the complete record; this is the readable one.

## 2026-09-02

- Closure, second candidate: `041c713` audited and accepted with CI read green;
  status `ready`, `subject_commit` bound. Administrative commit only.
- `S09d` (cont.) regenerates the view the status change invalidated; `2def1a2`
  was pushed with it stale because a script printed the gate's `FAILED` and
  went on. The regenerating commit is the candidate.
- `S09d` voids the first closure: CI had been red for seven pushes and the
  cause was in the checker. Status back to `running`; a new candidate follows.
- Closure: candidate `e409e85` audited and accepted; status `ready`, `subject_commit`
  bound. Administrative commit only — no other field moved.
- `S09c` lands the owner's rulings on the manifesto round, all accepted, and
  closes implementation on this branch: the commit is candidate `C`.
- `S09b` is the manifesto round the owner asked for before the genesis:
  the protocol measured against its own vision and against the current
  coding workflows, with the proposed Cairn 1.0 shape and the owner's
  decisions as checklists (`docs/cairn/cairn-manifesto-convergence-2026-09-02.md`).
  Closure moves to S09c.

## 2026-09-01

- `S09a` runs the greenfield pilot. The first run could not close an honest
  record; nineteen findings, ten of them predicates reading a proxy, repaired or
  stated; the second run reached `done` with zero red gates.
- `S08w` closes S08 Part 2. The matrix's prose stays human and its linkage is
  generated; the unit's own adversarial fixture found the new check satisfied by
  the artefact it produces.
- `S08v` makes rejection demonstrable. Two fixtures failed first and both were
  facts about the rules: `route` cannot fire on the trunk, and a committed
  mutation is invisible to a diff-scoped rule.
- `S08u` lands the initializer. Its value was less the installing than the
  proving: portability claims that held from inside this repository failed the
  moment a repository was created from them.
- `S08t` closes the gap S08s left: the gate said one thing and required reading
  said the opposite. Second occurrence of the S08q shape, so it ends in a
  predicate rather than another careful pass — which then caught a sentence the
  pass had missed.
- `S08s` stops rewriting. Flipping the binding also showed the retention design
  was one config field from being untested, and the `rebase` rule's remedy was
  instructing the very operation the new predicate blocks.
- `S08r` removes the cause instead of maintaining the compensation. The whole
  retention apparatus is downstream of the mandatory rebase, and the reason given
  for that rebase does not distinguish it from a merge.
- `S08q` opens ADR-020 stage 5 by reconciling the seed. The pages an adopter
  copies from taught a flat record and an ungenerated ref namespace that the
  normative text had already superseded; writing `cairn-init` against them would
  have compiled the superseded shapes into every adopter's first day.
- `S08p` makes the S08o adapter boundary executable. Atomik's concrete roots,
  trunk, remote, metadata key, area notes and retention policy now live in one
  validated schema-1 binding consumed by all three repository-reading tools.
- `S08o` applies ADR-020 migration stage 4. Required reading is now two portable
  execution documents plus one Atomik binding; the product constitution leaves
  the unconditional route, while both former combined pages remain linked as
  explanatory history.
- `S08n` resolves the `record-integrity` parity finding with the record's own
  adding blob as its baseline. A step may append and may not rewrite; the
  remaining flat-ledger and verbatim-roll proof stays explicitly partial.
- `S08l` created this folder. `CP-OPS-002.md` became `CP-OPS-002/index.md`, its
  thirty-nine steps became one file each under `steps/`, its forward plan became
  `plan.md`, and its seventy-four-row Work Ledger dissolved: ten live rows stayed
  in the header, sixty-three step-scoped rows moved to the steps they describe,
  and `Steps complete` became the commit index in `steps/index.md`. Nothing was
  summarised.
