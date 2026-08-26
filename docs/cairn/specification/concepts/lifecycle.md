---
type: Cairn Concept
title: Lifecycle
description: The allowed states and transitions of a Cairn coding path.
tags: [cairn, concept, state]
timestamp: 2026-08-25T00:00:00Z
---

# Lifecycle

The lifecycle is the state machine that says which fact a path may declare at
each point.

## In Cairn

`draft` becomes `running` after acceptance and registration. Execution may move
between `running` and `blocked`. Exact candidate closure produces `ready`.
Integration records `done` on the trunk. `archived` is terminal and explains
whether the path was completed, abandoned, or superseded.

Observable transitions are compared with an earlier path record. Missing
comparison state makes a critical transition check inconclusive.

## It does not prove

A status word cannot make an event happen. Each state has independent
invariants, such as a remote branch, exact subject hash, or trunk reachability.

Related: [path record](./path-record.md), [ready state](./ready-state.md),
[done state](./done-state.md).

