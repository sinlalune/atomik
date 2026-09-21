---
type: Cairn Concept
title: Conflict
description: A point where Git cannot combine changes without a choice.
tags: [cairn, concept, foundation, git]
timestamp: 2026-08-25T00:00:00Z
---

# Conflict

A conflict is [Git's](./git.md) refusal to choose automatically between
incompatible changes.

## Build the idea

Two branches can change the same lines, rename related files, or make changes
whose meaning cannot be combined mechanically. A participant resolves the
result and records a new state.

## In Cairn

Conflict resolution occurs before the final candidate is audited and accepted.
If resolution changes implementation after acceptance, the old candidate is
invalid and closure repeats.

## It does not prove

A clean automatic merge does not prove semantic compatibility. Coherence still
requires tests and review.

Related: [rebase](./rebase.md), [merge](./merge.md),
[coherence audit](./coherence-audit.md).
