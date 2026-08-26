---
type: Cairn Concept
title: Push
description: The Git operation that publishes local commits by updating a remote ref.
tags: [cairn, concept, foundation, git]
timestamp: 2026-08-25T00:00:00Z
---

# Push

Push sends local [Git](./git.md) objects to a [remote](./remote.md) and asks it
to update a [branch](./branch.md) or other ref.

## In Cairn

Commit and successful push form the boundary of a completed step. After a push,
the writer proves that the local checkpoint is reachable from the remote path
branch. Rewritten published commits use lease-protected update where repository
policy permits it.

## It does not prove

A command being attempted is not proof that the remote accepted it. Check the
exit code and reachability.

Related: [remote](./remote.md), [exit code](./exit-code.md),
[remote checkpoint](./remote-checkpoint.md).
