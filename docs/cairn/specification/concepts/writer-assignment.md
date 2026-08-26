---
type: Cairn Concept
title: Writer assignment
description: The explicit right for one participant to mutate a path's writable worktree at a time.
tags: [cairn, concept, concurrency, team]
timestamp: 2026-08-25T00:00:00Z
---

# Writer assignment

Writer assignment identifies the developer or agent currently allowed to edit
one path's writable [worktree](./worktree.md).

## Build the idea

A worktree isolates files between paths but does not stop two processes from
editing the same directory. Exclusive mutation therefore requires a social
assignment or a mechanically enforced lease.

## In Cairn

One writer is assigned at a time. Other participants may inspect, test, or
review. Assignment may pass to another developer or agent only at a completed
remote checkpoint, with the handoff and path record refreshed before the new
writer begins.

## It does not prove

The v0.1 reference tools record and expect the assignment but do not implement
a lease or allocator.

Related: [worktree](./worktree.md), [handoff](./handoff.md),
[remote checkpoint](./remote-checkpoint.md).
