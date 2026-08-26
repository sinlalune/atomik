---
type: Cairn Concept
title: Work ledger
description: The append-only execution account inside a coding path.
tags: [cairn, concept, execution, record]
timestamp: 2026-08-25T00:00:00Z
---

# Work ledger

A work ledger is the chronological account of what a
[coding path](./coding-path.md) attempted, changed, learned, verified, reversed,
and will do next.

## In Cairn

Every work unit appends an entry in the same commit as its code, tests, and
documents. If the live path grows too large, a completed step moves
byte-for-byte into the portable role path
`project/coding-paths/history/<ID>-SNN.md` and the path keeps a link. The
[reference binding](../reference/repository-layout.md#portable-roles-and-installed-names)
uses `atomik-project/coding-paths/history/`.

## It does not prove

The reference checker prevents an existing rolled-history file from being
rewritten, but it does not yet prove that live ledger content was preserved as
a prefix or rolled verbatim. That remains a visible conformance gap.

Related: [work unit](./work-unit.md), [record integrity](./record-integrity.md),
[handoff](./handoff.md).
