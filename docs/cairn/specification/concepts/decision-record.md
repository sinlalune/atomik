---
type: Cairn Concept
title: Decision record
description: A durable record of an accepted architectural or protocol choice and its consequences.
tags: [cairn, concept, knowledge, decision]
timestamp: 2026-08-26T00:00:00Z
---

# Decision record

A decision record states a choice, its status, context, rationale,
consequences, and rejected alternatives.

In Cairn, decision records use stable ids and one [file](./project-memory.md) per decision
under `docs/adr/`. A path that changes
[architecture](./architecture.md) updates or adds the relevant record in the
same [work unit](./work-unit.md). Later corrections create a new decision rather
than rewriting the reason history into a different story.

Related: [architecture](./architecture.md), [record integrity](./record-integrity.md),
[work unit](./work-unit.md).
