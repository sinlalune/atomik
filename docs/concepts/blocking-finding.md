---
type: Cairn Concept
title: Blocking finding
description: A report that a required objective predicate was disproved.
tags: [cairn, concept, enforcement]
timestamp: 2026-08-25T00:00:00Z
---

# Blocking finding

A blocking finding means a required condition is known to be false.

## In Cairn

Blocking rules are admitted only when a deterministic repository predicate can
decide them. Examples include an invalid path identity, a stale trunk ancestry,
a rewritten immutable record, or acceptance bound to the wrong commit. Any
blocking finding makes the checker return non-zero.

## It does not prove

Absence of blocking findings is not a general proof of product quality or sound
judgement.

Related: [advisory finding](./advisory-finding.md),
[inconclusive finding](./inconclusive-finding.md), [exit code](./exit-code.md).

