---
type: Cairn Concept
title: Administrative closure
description: The metadata-only commit that records audit and acceptance after the accepted implementation candidate.
tags: [cairn, concept, closure, commit]
timestamp: 2026-08-25T00:00:00Z
---

# Administrative closure

Administrative closure is one [commit](./commit.md), `A`, immediately after
candidate `C` that records facts about `C` without changing its implementation.

## In Cairn

`A` may update only the path record, handoff, exact audit record, and exact
closing record. It sets the path to `ready` and names `C` as
`subject_commit`. This solves the self-reference problem: the records can name
their parent rather than pretending to audit the commit containing themselves.

## It does not prove

Calling a commit administrative is insufficient. Its diff and distance from
`C` must be checked.

Related: [implementation candidate](./implementation-candidate.md),
[ready state](./ready-state.md), [record integrity](./record-integrity.md).
