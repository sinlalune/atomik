---
type: Cairn Concept
title: Remote
description: A named shared Git repository used to exchange commits and refs.
tags: [cairn, concept, foundation, git]
timestamp: 2026-08-25T00:00:00Z
---

# Remote

A remote is another [Git](./git.md) [repository](./repository.md) known by a
local name, commonly `origin`.

## Build the idea

Local and remote branches are separate refs. Local work is not visible to
others until it is pushed; remote changes are not known locally until they are
fetched.

## In Cairn

The remote is the team handoff boundary. A checkpoint is complete only when the
path commit is reachable from its remote path branch. Final integration is
complete only when the accepted candidate is reachable from the remote trunk.

## It does not prove

A configured remote does not prove that a push succeeded or that its refs are
protected.

Related: [fetch and push](./fetch-and-push.md),
[remote checkpoint](./remote-checkpoint.md).
