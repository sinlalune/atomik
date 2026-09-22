---
type: Cairn Concept
title: Trunk registration
description: Publishing an accepted path declaration on the shared trunk before implementation branches.
tags: [cairn, concept, registration, git]
timestamp: 2026-08-25T00:00:00Z
---

# Trunk registration

Trunk registration is the metadata-only [commit](./commit.md) that makes a
[coding path](./coding-path.md) visible on the [trunk](./trunk.md) to the whole
team before [branch](./branch.md) implementation begins.

## In Cairn

The registration commit contains the opening record, `running` path record, and
regenerated live view. Its first parent must equal the path's declared
`base_commit`. After it reaches the remote trunk, the path branch and worktree
are created from that registered state.

A protected transport needs a special registration route that does not require
the new path to exist on trunk before it can land.

## It does not prove

Registration records authorised intent. It is not evidence that implementation
has begun or passed checks.

Related: [opening acceptance](./opening-acceptance.md), [trunk](./trunk.md),
[integration transport](./integration-transport.md).
