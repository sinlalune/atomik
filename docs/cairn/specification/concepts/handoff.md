---
type: Cairn Concept
title: Handoff brief
description: The bootstrap contract: the one document that, with AGENTS.md, must be enough to resume a path cold.
tags: [cairn, concept, execution, team, resumability]
timestamp: 2026-08-26T00:00:00Z
---

# Handoff brief

A handoff brief states where a [coding path](./coding-path.md) is, what evidence
exists, and the single next action required to continue it.

## Build the idea

The brief is the document a new participant reads first and, for the first few
minutes, the only one they have read. That makes it the protocol's bootstrap
contract — and a bootstrap contract with no specified fields is not a contract.

Its relationship to the [work ledger](./work-ledger.md) is a division of labour,
not a duplication. The ledger is append-only history: everything that happened,
in order, permanently. The brief is mutable and rewritten at every work unit: the
current situation, small enough to hold in mind. Neither can do the other's job.

## In Cairn

The brief lives at `project/briefs/<lowercase-id>-handoff.md`. Its frontmatter
carries the machine-checkable state — `checkpoint`, `checkpoint_pushed`,
`base_commit`, `trunk_seen`, `writes`, `governs` as `path@<object-id>`, `verify`
as exact runnable commands, and `budget_tokens`. Its body holds seven capped
sections: outcome, state, next action, blockers, tried and rejected, reading
order, and verification. The complete field list, caps, and template are in the
[handoff-brief reference](../reference/handoff-brief.md).

### The answerable-alone contract

A reader holding only `AGENTS.md` and the brief — no ledger, no conversation, no
prior session — MUST be able to state:

1. the outcome this path is for;
2. the exact commit to resume from;
3. the single next action;
4. what the path may write;
5. what it must read, and at which object id;
6. what is blocking, if anything;
7. what has already been tried and rejected;
8. the exact commands that verify the checkpoint.

If answering any of these requires opening the ledger, the brief has failed its
contract. That test is also the pilot's primary metric: a **cold resume**, in
which a participant with no prior context performs the next action correctly
from the brief alone, measured for success rate and time to first correct
action.

## It does not prove

A brief can drift if it is edited independently of the checkpoint it names. It
is disposable and never replaces the ledger as history — being answerable alone
is a property of the current moment, not a claim to be the record.

Related: [work ledger](./work-ledger.md),
[remote checkpoint](./remote-checkpoint.md),
[writer assignment](./writer-assignment.md), [work unit](./work-unit.md).
