---
type: Cairn Concept
title: Implementation candidate
description: The exact commit proposed as the final product result of a coding path.
tags: [cairn, concept, closure, commit]
timestamp: 2026-08-25T00:00:00Z
---

# Implementation candidate

An implementation candidate, written `C`, is the exact post-[rebase](./rebase.md)
[commit](./commit.md) whose product content is proposed for integration.

## In Cairn

Product checks, protocol checks, coherence audit, and closing acceptance all
name the same full hash. If code, tests, architecture, or implementation
documentation changes, the old `C` is no longer the candidate and the sequence
repeats.

One later administrative commit may record acceptance without changing `C`.

## It does not prove

Calling a commit a candidate does not make it acceptable. Its identity only
makes every piece of evidence refer to the same object.

Related: [commit hash](./commit-hash.md), [coherence audit](./coherence-audit.md),
[administrative closure](./administrative-closure.md).
