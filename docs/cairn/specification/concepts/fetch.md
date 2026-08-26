---
type: Cairn Concept
title: Fetch
description: The Git operation that updates knowledge of remote commits and refs.
tags: [cairn, concept, foundation, git]
timestamp: 2026-08-25T00:00:00Z
---

# Fetch

Fetch downloads [remote](./remote.md) [Git](./git.md) objects and updates
remote-tracking refs without changing the current working files.

## In Cairn

Participants fetch before registration, rebase, resumption, and remote
verification. Critical ancestry checks become inconclusive when the required
remote ref or history is unavailable; the repair is to fetch the complete
input, not to assume success.

## It does not prove

Fetching does not integrate remote work into the current branch.

Related: [remote](./remote.md), [rebase](./rebase.md),
[inconclusive finding](./inconclusive-finding.md).
