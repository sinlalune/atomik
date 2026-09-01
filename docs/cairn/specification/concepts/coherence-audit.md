---
type: Cairn Concept
title: Coherence audit
description: A recorded review of one exact implementation candidate against project knowledge and concurrent work.
tags: [cairn, concept, closure, audit]
timestamp: 2026-08-26T00:00:00Z
---

# Coherence audit

A coherence audit examines whether an exact
[implementation candidate](./implementation-candidate.md) remains consistent
with accepted [architecture](./architecture.md), decisions, module knowledge,
and other running paths.

## In Cairn

The audit record names the path, branch, base, full subject
[object id](./commit-hash.md), and verdict. It considers contradictory
decisions, duplicated concurrent work, undocumented architecture, and competing
sources of truth. If its findings change implementation, a new candidate is
audited.

The audit reads the candidate against the documents the path declared in
`governs:`, each pinned at an exact object id. That pin is what makes the
audit's reference frame checkable later: if the trunk changes one of those
documents before integration, [acceptance drift](./acceptance-drift.md) can say
so, because the audit recorded which version it reasoned from.

On the [lightweight route](./lightweight-path.md) the same questions are
answered inside the closing record rather than in a separate audit file. The
questions do not change; the number of files does. **The v0.2 reference
checker does not yet read them there**: it requires the separate audit file on
every route, and a lightweight path that answers inline is blocked at `ready`.

## It does not prove

The checker can prove binding and completeness, not the quality of the auditor's
reasoning. The verdict remains human or agent judgement.

Related: [implementation candidate](./implementation-candidate.md),
[closing acceptance](./closing-acceptance.md),
[acceptance drift](./acceptance-drift.md), [schema](./schema.md).
