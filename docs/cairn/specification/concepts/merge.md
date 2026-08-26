---
type: Cairn Concept
title: Merge
description: A Git operation that combines histories into one result.
tags: [cairn, concept, foundation, git]
timestamp: 2026-08-25T00:00:00Z
---

# Merge

A merge combines two lines of [Git](./git.md) history. It may advance a
[branch](./branch.md) directly or create a [commit](./commit.md) with multiple
parents.

## In Cairn

Merge is one possible integration mechanism, not the whole transport. The exact
trunk candidate must contain the audited and accepted implementation commit,
permit only administrative changes after it, pass required checks, and be the
same result the remote accepts.

## It does not prove

A local merge does not prove that a protected host checked or accepted that
exact merge commit.

Related: [trunk](./trunk.md), [integration transport](./integration-transport.md),
[done state](./done-state.md).
