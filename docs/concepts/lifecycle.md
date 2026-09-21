---
type: Cairn Concept
title: Lifecycle
description: The allowed states and transitions of a Cairn coding path, and what a single-commit validator can actually see.
tags: [cairn, concept, state]
timestamp: 2026-08-26T00:00:00Z
---

# Lifecycle

The lifecycle is the state machine that says which fact a path may declare at
each point.

## In Cairn

`draft` becomes `running` after acceptance and registration. Execution moves
between `running` and `blocked`. Exact candidate closure produces `ready`.
Integration records `done` on the trunk. `archived` is terminal and explains
whether the path was completed, abandoned, or superseded.

Two edges exist because reality has them, not because a diagram looked tidier
with them:

- **`ready → blocked`** — acceptance stalls. A candidate is audited and waiting
  for an authorised reviewer who is unavailable; the path is blocked on a named
  condition and says so, instead of misreporting itself as still executing.
- **`ready → running`** — the candidate is invalidated, by a finding or by
  [acceptance drift](./acceptance-drift.md), and implementation resumes.

There is deliberately no `blocked → ready`. Reaching `ready` requires producing
and auditing a candidate, which is execution; an unblocked path returns to
`running` first and reaches `ready` from there.

An unchanged state is not a transition. A validator that sees a path record
declaring the state it declared before has observed no event, and must accept
that for every state — including `archived` — provided the state's required
identity fields are still present and, for `archived`, its `resolution` is
unchanged.

## It does not prove

A status word cannot make an event happen, and each state has independent
invariants: a remote branch, an exact subject id, trunk reachability.

The honest limit is narrower still. A validator run sees **one commit**. It
reads the state a record declares now, and compares it with the state in one
comparison ref; it has never watched a path move. So the machine is doctrine,
and what a checker enforces is the set of per-state invariants plus single-step
transitions against an available comparison ref. "Which state was this in last
week" is not a question the mechanism can answer. When the comparison state is
unavailable, a critical transition check is
[inconclusive](./inconclusive-finding.md) and blocks.

Related: [path record](./path-record.md), [ready state](./ready-state.md),
[blocked state](./blocked-state.md), [done state](./done-state.md).
