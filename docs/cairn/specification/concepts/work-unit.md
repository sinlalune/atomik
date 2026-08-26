---
type: Cairn Concept
title: Work unit
description: One coherent, independently verifiable increment of a coding path.
tags: [cairn, concept, execution]
timestamp: 2026-08-25T00:00:00Z
---

# Work unit

A work unit is the smallest piece of path execution that Cairn permits a writer
to call complete.

## In Cairn

It contains the relevant implementation, tests, documentation, path-ledger
entry, handoff update, and verification result. After any required user
inspection passes, these parts become one coherent commit and immediate remote
push.

A work unit should leave the path at a safe session boundary with one exact next
action.

## It does not prove

Small commits are not automatically coherent. The unit is defined by one
verifiable outcome, not by line count or elapsed time.

Related: [commit](./commit.md), [work ledger](./work-ledger.md),
[remote checkpoint](./remote-checkpoint.md).

