---
type: Cairn Concept
title: Declared write surface
description: The repository paths a coding path expects to change, and the commitment that comes with declaring them.
tags: [cairn, concept, scope, coordination]
timestamp: 2026-08-26T00:00:00Z
---

# Declared write surface

A declared write surface is the list of [file](./project-memory.md) paths or
patterns under `writes:` in a [path record](./path-record.md). Its counterpart
is `governs:`, the documents the path is bound by.

## In Cairn

The list helps participants notice likely overlap before changes collide, and it
is one of the two inputs to the [acceptance-drift](./acceptance-drift.md)
predicate — which is what makes it worth keeping accurate rather than
aspirational.

Writing outside the declaration is not forbidden; leaving the declaration stale
is. A path that discovers a wider root cause updates `writes:` in the same work
unit as the change and records why in its ledger. Drift that is not accompanied
by that update blocks, because an out-of-date surface silently weakens every
predicate computed from it.

## It does not prove

The declaration is not a lock, an ownership boundary, or a complete forecast.
Overlap can be harmless, and no overlap can still hide a semantic conflict:
path matching is a proxy for meaning, not a substitute for it.

Related: [coding path](./coding-path.md),
[acceptance drift](./acceptance-drift.md),
[advisory finding](./advisory-finding.md), [conflict](./conflict.md).
