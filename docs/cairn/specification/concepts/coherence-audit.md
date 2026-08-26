---
type: Cairn Concept
title: Coherence audit
description: A recorded review of one exact implementation candidate against project knowledge and concurrent work.
tags: [cairn, concept, closure, audit]
timestamp: 2026-08-25T00:00:00Z
---

# Coherence audit

A coherence audit examines whether an exact
[implementation candidate](./implementation-candidate.md) remains consistent
with accepted [architecture](./architecture.md), decisions, module knowledge,
and other running paths.

## In Cairn

The audit record names the path, branch, base, full subject commit, and verdict.
It considers contradictory decisions, duplicated concurrent work, undocumented
architecture, and competing sources of truth. If its findings change
implementation, a new candidate is audited.

## It does not prove

The checker can prove binding and completeness, not the quality of the
auditor's reasoning. The verdict remains human or agent judgement.

Related: [implementation candidate](./implementation-candidate.md),
[closing acceptance](./closing-acceptance.md), [schema](./schema.md).
