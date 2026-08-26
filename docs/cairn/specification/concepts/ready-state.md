---
type: Cairn Concept
title: Ready state
description: A path whose exact candidate is checked, audited, and accepted but not yet integrated.
tags: [cairn, concept, state, closure]
timestamp: 2026-08-25T00:00:00Z
---

# Ready state

`ready` is the final state a path branch may declare.

It requires the running identity, full `subject_commit` for candidate `C`,
completed checks, a [coherence audit](./coherence-audit.md) of `C`,
[closing acceptance](./closing-acceptance.md) of `C`, and exactly one
metadata-only [administrative closure](./administrative-closure.md)
[commit](./commit.md) after `C`.

If implementation or the relevant [trunk](./trunk.md) basis changes, the path returns to
`running` and repeats closure.

It does not mean [merge](./merge.md) or integration has occurred.

Related: [administrative closure](./administrative-closure.md),
[done state](./done-state.md), [implementation candidate](./implementation-candidate.md).
