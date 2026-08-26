---
type: Cairn Concept
title: Fetch and push
description: The two Git operations that move objects between a checkout and a remote.
tags: [cairn, concept, foundation, git]
timestamp: 2026-08-26T00:00:00Z
---

# Fetch and push

Fetch downloads [remote](./remote.md) [Git](./git.md) objects and updates
remote-tracking refs without changing the current working files. Push sends
local objects to a remote and asks it to update a [branch](./branch.md) or
other ref.

## Build the idea

The two operations are not symmetric. Fetch is safe and additive: it can only
teach the local repository about work it did not have. Push asks another
repository to change, and the remote may refuse — because the update is not a
fast-forward, because a ref is protected, or because the network failed.

## In Cairn

Participants fetch before registration, rebase, resumption, and remote
verification. Critical ancestry checks become
[inconclusive](./inconclusive-finding.md) when the required remote ref or
history is unavailable; the repair is to fetch the complete input, not to
assume success.

Commit and successful push together form the boundary of a completed step.
After a push, the writer proves that the local checkpoint is reachable from the
remote path branch. A rewriting push — the kind that follows a
[rebase](./rebase.md) — requires
[checkpoint retention](./checkpoint-retention.md) first and uses
lease-protected update where repository policy permits it.

## It does not prove

Fetching does not integrate remote work into the current branch. A push command
being attempted is not proof that the remote accepted it: check the
[exit code](./exit-code.md) and then reachability.

Related: [remote](./remote.md), [remote checkpoint](./remote-checkpoint.md),
[checkpoint retention](./checkpoint-retention.md), [rebase](./rebase.md).
