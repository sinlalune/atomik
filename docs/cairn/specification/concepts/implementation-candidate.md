---
type: Cairn Concept
title: Implementation candidate
description: The exact commit proposed as the final product result of a coding path.
tags: [cairn, concept, closure, commit]
timestamp: 2026-08-26T00:00:00Z
---

# Implementation candidate

An implementation candidate, written `C`, is the exact post-[rebase](./rebase.md)
[commit](./commit.md) whose product content is proposed for integration.

## In Cairn

Product checks, protocol checks, [coherence audit](./coherence-audit.md), and
[closing acceptance](./closing-acceptance.md) all name the same full
[object id](./commit-hash.md). If code, tests, architecture, or implementation
documentation changes, the old `C` is no longer the candidate and the sequence
repeats.

Candidate identity excludes [provisional commits](./provisional-commit.md): work
pushed while incomplete is folded into the work unit it was drafting before `C`
exists, so no marked-incomplete commit is ever part of what was accepted.

The candidate is also bound to the state it was read against. Its closing record
names the base `T` it was rebased onto, and
[acceptance drift](./acceptance-drift.md) decides whether that acceptance still
holds when the trunk has moved on. One later field-restricted
[administrative commit](./administrative-closure.md) may record acceptance
without changing `C`.

## It does not prove

Calling a commit a candidate does not make it acceptable. Its identity only
makes every piece of evidence refer to the same object.

Related: [object id](./commit-hash.md), [coherence audit](./coherence-audit.md),
[provisional commit](./provisional-commit.md),
[administrative closure](./administrative-closure.md).
