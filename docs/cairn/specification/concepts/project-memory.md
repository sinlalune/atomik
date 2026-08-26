---
type: Cairn Concept
title: Project memory
description: Durable knowledge and execution state stored with the repository.
tags: [cairn, concept, memory]
timestamp: 2026-08-25T00:00:00Z
---

# Project memory

Project memory is the information future participants need to understand,
verify, and continue work without access to the conversation that produced it.

## In Cairn

It has two durable planes. `docs/` records what the system is and why:
[architecture](./architecture.md), [decisions](./decision-record.md), and
[implemented-area notes](./module-note.md). The portable role path `project/`
records what bounded work is doing now: paths, sessions, audits, handoffs, and
integrated outcomes. The [reference binding](../reference/repository-layout.md#portable-roles-and-installed-names)
names that plane `atomik-project/`.

The path ledger connects them by recording which knowledge governed a concrete
work unit and which knowledge changed with it.

## It does not prove

Durability does not guarantee correctness. Canonical ownership prevents
conflicting sources, while tests and review evaluate claims.

Related: [file](./file.md), [coding path](./coding-path.md),
[work ledger](./work-ledger.md).
