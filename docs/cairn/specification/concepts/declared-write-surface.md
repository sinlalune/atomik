---
type: Cairn Concept
title: Declared write surface
description: The repository paths a coding path expects to change.
tags: [cairn, concept, scope, coordination]
timestamp: 2026-08-25T00:00:00Z
---

# Declared write surface

A declared write surface is the list of [file](./file.md) paths or patterns
under `writes:` in a [path record](./path-record.md).

## In Cairn

The list helps participants notice likely overlap before changes collide. The
checker may report files outside it as scope drift. A path that discovers a
wider root cause records the reason and updates the list rather than hiding the
change.

## It does not prove

The declaration is not a lock, ownership boundary, or complete forecast.
Overlap can be harmless, and no overlap can still hide a semantic conflict.

Related: [coding path](./coding-path.md), [advisory finding](./advisory-finding.md),
[conflict](./conflict.md).
