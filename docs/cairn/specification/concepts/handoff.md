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

The brief is the **last** document on the entry route and the **first** one a
participant acts from. `AGENTS.md` points at the operating convention, the
convention points at the [live view](./live-view.md), the live view names the
path, and the [path record](./path-record.md) holds the plan and the ledger. The
brief is the stone at the top of that cairn: it is the only one you need to look
at to know where to step, and it is meaningless without the ones underneath.

That position is what makes it the protocol's bootstrap contract — and a
bootstrap contract with no specified fields is not a contract.

Its relationship to the [work ledger](./work-ledger.md) is a division of labour,
not a duplication. The ledger is append-only history: everything that happened,
in order, permanently. The brief is mutable and rewritten at every work unit: it
says which part of that history is still the situation. Neither can do the
other's job.

## In Cairn

The brief lives at `project/briefs/<lowercase-id>-handoff.md`. Its frontmatter
carries the machine-checkable state — `checkpoint`, `checkpoint_pushed`,
`base_commit`, `trunk_seen`, `writes`, `governs` as `path@<object-id>`, and
`verify` as exact runnable commands. Its body holds seven capped
sections: outcome, state, next action, blockers, tried and rejected, reading
order, and verification. The complete field list, caps, and template are in the
[handoff-brief reference](../reference/handoff-brief.md).

### The answerable-alone contract

"Alone" constrains what the reader must already know, not how many files they
may open. A reader holding `AGENTS.md`, the brief, and the repository at
`checkpoint` — with no conversation, no prior session, and no memory of how the
path got here — MUST be able to state:

1. the outcome this path is for;
2. the exact commit to resume from;
3. the single next action;
4. what the path may write;
5. what it must read, and at which object id;
6. what is blocking, if anything;
7. what has already been tried and rejected;
8. the exact commands that verify the checkpoint.

Each answer must be in the brief, or in a record the brief names at an exact
object id. An answer that lives only in a conversation, only in a previous
session, or only in a judgement the reader would have to make about which
ledger entries still hold, is unanswerable and the brief has failed.

Both directions fail. A brief too thin to name ids hands its job back to the
ledger; a brief that re-narrates the ledger to avoid needing it has become a
second ledger, and the two accounts start disagreeing about the past. The brief
points; it does not retell.

That contract is also the pilot's primary metric: a **cold resume**, in which a
participant with no prior context performs the next action correctly, measured
for success rate and time to first correct action.

## It does not prove

A brief can drift if it is edited independently of the checkpoint it names. It
is disposable and never replaces the ledger as history — being answerable alone
is a property of the current moment, not a claim to be the record.

Related: [work ledger](./work-ledger.md),
[remote checkpoint](./remote-checkpoint.md),
[writer assignment](./writer-assignment.md), [work unit](./work-unit.md).
