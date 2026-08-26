---
type: Cairn Concept
title: Ready state
description: A path whose exact candidate is checked, audited, and accepted but not yet integrated.
tags: [cairn, concept, state, closure]
timestamp: 2026-08-26T00:00:00Z
---

# Ready state

`ready` is the final state a path branch may declare.

It requires the running identity, the full `subject_commit`
[object id](./commit-hash.md) of candidate `C`, completed checks, a
[coherence audit](./coherence-audit.md) of `C`,
[closing acceptance](./closing-acceptance.md) of `C`, and exactly one
field-restricted [administrative closure](./administrative-closure.md)
[commit](./commit.md) after `C`.

`ready` is not a resting place with only one exit. A ready path leaves it three
ways:

- to [`done`](./done-state.md), when the [trunk](./trunk.md) integrates it;
- to [`running`](./running-state.md), when the candidate is invalidated by a
  finding or by [acceptance drift](./acceptance-drift.md);
- to [`blocked`](./blocked-state.md), when acceptance or integration stalls on a
  named external condition — an unavailable reviewer, a frozen trunk — which is
  a fact worth stating rather than hiding behind a stale `ready`.

It does not mean [merge](./merge.md) or integration has occurred.

Related: [administrative closure](./administrative-closure.md),
[done state](./done-state.md), [acceptance drift](./acceptance-drift.md),
[implementation candidate](./implementation-candidate.md).
