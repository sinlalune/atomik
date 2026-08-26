---
type: Cairn Concept
title: Path record
description: The canonical Markdown file describing one coding path and its current execution state.
tags: [cairn, concept, path, record]
timestamp: 2026-08-25T00:00:00Z
---

# Path record

A path record is `project/coding-paths/CP-<ID>.md`, the portable role path and
durable source of truth for one [coding path](./coding-path.md). The
[reference binding](../reference/repository-layout.md#portable-roles-and-installed-names)
uses `atomik-project/coding-paths/CP-<ID>.md`.

## In Cairn

Frontmatter carries identity, lifecycle state, base commit, branch, current
step, writer assignment, subject commit when ready, and declared write
surfaces. The body carries the outcome, definition of done, documentation
coverage, ordered execution plan, work ledger, checkpoint, next action, and
blockers.

The record advances with every work unit. When execution ends it is retained
and eventually archived rather than deleted.

## It does not prove

A path record can describe work that is not yet implemented. Commit ancestry,
checks, audit, and acceptance provide separate evidence.

Related: [coding path](./coding-path.md), [frontmatter](./frontmatter.md),
[work ledger](./work-ledger.md).
