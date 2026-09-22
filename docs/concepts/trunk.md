---
type: Cairn Concept
title: Trunk
description: The shared branch into which accepted work is integrated.
tags: [cairn, concept, foundation, git]
timestamp: 2026-08-25T00:00:00Z
---

# Trunk

The trunk is the [repository's](./repository.md) shared integration
[branch](./branch.md), commonly named `main`.

## Build the idea

Path branches can advance independently, but the trunk provides the ordered
history that the team treats as integrated. Its remote tip is the reference
point for registration, rebase, and final reachability.

## In Cairn

A path declaration is registered on the trunk before its branch begins. A path
becomes `done` only when its accepted candidate is integrated and that fact is
recorded on the trunk.

## It does not prove

A local branch named `main` is not automatically current or authoritative. The
remote trunk must be fetched and its exact state verified.

Related: [branch](./branch.md), [trunk registration](./trunk-registration.md),
[done state](./done-state.md).
