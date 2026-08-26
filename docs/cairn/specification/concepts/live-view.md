---
type: Cairn Concept
title: Live view
description: A generated index of paths whose execution or integration state still matters.
tags: [cairn, concept, generated, navigation]
timestamp: 2026-08-25T00:00:00Z
---

# Live view

A live view is a generated navigation [file](./project-memory.md), canonically
`project/coding-paths/ACTIVE.md`. The
[reference binding](../reference/repository-layout.md#portable-roles-and-installed-names)
uses `atomik-project/coding-paths/ACTIVE.md`.

## In Cairn

It derives from path records and lists `running`, `blocked`, and `ready` paths
with the information needed to find them. The generator rewrites it
deterministically and the checker compares the result with its source records.

## It does not prove

The live view is not a second state store. Hand edits can agree locally while
disagreeing with the path corpus, so they are prohibited.

Related: [path record](./path-record.md), [running state](./running-state.md),
[ready state](./ready-state.md).
