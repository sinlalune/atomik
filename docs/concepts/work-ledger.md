---
type: Cairn Concept
title: Work ledger
description: The append-only execution history inside a coding path, and the counterpart to the mutable handoff brief.
tags: [cairn, concept, execution, record]
timestamp: 2026-08-26T00:00:00Z
---

# Work ledger

A work ledger is the chronological account of what a
[coding path](./coding-path.md) attempted, changed, learned, verified, reversed,
and will do next.

## In Cairn

Every [work unit](./work-unit.md) appends an entry in the same commit as its
code, tests, and documents. The entry names the unit's declared type, the exact
checkpoint [object id](./commit-hash.md) it produced, and its verification
result.

The ledger and the [handoff brief](./handoff.md) divide one job. The ledger is
append-only history and grows without bound; the brief is rewritten at every
work unit and stays small enough to read cold. Neither substitutes for the
other, and a brief that can only be understood by also reading the ledger has
failed its own contract.

Because the ledger names checkpoints by object id, those commits must stay
reachable: any rewriting push requires
[checkpoint retention](./checkpoint-retention.md) first, or the ledger's
promises become dangling references.

If the live path grows too large, a completed step moves byte-for-byte into the
portable role path `project/coding-paths/history/<ID>-SNN.md` and the path keeps
a link.

## It does not prove

The reference checker prevents an existing rolled-history file from being
rewritten and proves the prefix of a born-sliced step record by following it to
the blob that added it. It does not yet prove the prefix of a flat live ledger
or that a roll was byte-for-byte verbatim. Those remain visible conformance
gaps.

Related: [work unit](./work-unit.md), [handoff brief](./handoff.md),
[checkpoint retention](./checkpoint-retention.md),
[record integrity](./record-integrity.md).
