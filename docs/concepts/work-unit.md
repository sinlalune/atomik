---
type: Cairn Concept
title: Work unit
description: One coherent, independently verifiable increment of a coding path, whose required parts are set by its declared type.
tags: [cairn, concept, execution]
timestamp: 2026-08-26T00:00:00Z
---

# Work unit

A work unit is the smallest piece of path execution that Cairn permits a writer
to call complete.

## Build the idea

"Code, tests and documents move together" is the right instinct and the wrong
rule. Applied literally it demands a module note and a path edit from a work
unit that changed neither behaviour nor structure — a typo fix, a document
rewrite, a repair. What an agent learns from that rule is not coherence; it is
to produce a meaningless documentation delta so the gate goes quiet.

Typing the unit fixes it. The requirement becomes exact instead of universal,
and "where relevant" stops being a judgement the checker has to guess at.

## In Cairn

Every work unit declares a type in its ledger entry, and the type fixes which
parts MUST move together:

| Type | Parts that must move together |
| :-- | :-- |
| `implementation` | source, its tests, affected [module note](./module-note.md), ledger entry, brief |
| `documentation` | the documents and their indexes, ledger entry, brief |
| `decision` | the [decision record](./decision-record.md), every document it amends, ledger entry, brief |
| `foundation` | documents plus `draft` path records, ledger entry, brief — see [foundation path](./foundation-path.md) |
| `repair` | the corrective change, a superseding record where one is owed, ledger entry naming the violation, brief |
| `closure` | only the [administrative closure](./administrative-closure.md) surface |

Every type requires the ledger entry, the refreshed brief, and a recorded
verification result; no type may omit those. After any required inspection
passes, the parts become one coherent commit and an immediate push.

Work that is not yet complete is not a work unit. It is committed and pushed as
a [provisional commit](./provisional-commit.md) instead of being held in a
working tree.

A work unit should leave the path at a safe session boundary with one exact next
action.

## It does not prove

Small commits are not automatically coherent, and a declared type is a claim by
the writer. The unit is defined by one verifiable outcome, not by line count,
elapsed time, or the word in its ledger entry.

Related: [commit](./commit.md), [work ledger](./work-ledger.md),
[remote checkpoint](./remote-checkpoint.md),
[provisional commit](./provisional-commit.md).
