---
type: Cairn Concept
title: Closing acceptance
description: An authorised decision accepting one exact implementation candidate and its declared scope.
tags: [cairn, concept, closure, governance]
timestamp: 2026-08-25T00:00:00Z
---

# Closing acceptance

Closing acceptance is a recorded decision about one exact
[implementation candidate](./implementation-candidate.md), not a general
approval of a [branch](./branch.md) name.

## In Cairn

The record contains the path, `ceremony: closing`, full `subject_commit`,
reviewer identity, UTC time, `decision: accepted`, a scope reference, and the
disposition of every advisory. Its subject must equal the coherence audit's
subject.

If implementation changes, the acceptance no longer applies and closure
repeats.

## It does not prove

The record proves that an acceptance was recorded in the required shape. It
does not prove the reviewer was authorised unless repository governance
enforces that identity.

Related: [implementation candidate](./implementation-candidate.md),
[coherence audit](./coherence-audit.md),
[administrative closure](./administrative-closure.md).
