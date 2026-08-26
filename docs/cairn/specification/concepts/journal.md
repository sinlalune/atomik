---
type: Cairn Concept
title: Journal
description: One immutable file per integrated Cairn outcome.
tags: [cairn, concept, record, integration]
timestamp: 2026-08-25T00:00:00Z
---

# Journal

The Cairn journal is the set of integrated-outcome records under the portable
role path `project/log/`; the
[reference binding](../reference/repository-layout.md#portable-roles-and-installed-names)
uses `atomik-project/log/`.

## In Cairn

Each integration creates a uniquely named file such as
`YYYY-MM-DD-cp-example-001.md`. It names the path, candidate, remote integration
identity, outcome, and remaining work. Existing entries are immutable.

One file per event avoids merge collisions and makes each record independently
addressable.

## It does not prove

A folder-wide `log.md` is a navigation view, not the append-only journal, and
the journal does not replace commit history.

Related: [done state](./done-state.md),
[record integrity](./record-integrity.md), [project memory](./project-memory.md).
