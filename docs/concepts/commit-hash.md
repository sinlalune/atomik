---
type: Cairn Concept
title: Object id
description: The content-derived identifier of one Git object, and why Cairn names it by role rather than by digest length.
tags: [cairn, concept, foundation, git, identity]
timestamp: 2026-08-26T00:00:00Z
---

# Object id

An object id is the identifier [Git](./git.md) derives from an object's own
content — for a [commit](./commit.md), from its tree and its parent ids.

## Build the idea

Because the id covers the parents, changing recorded content *or* ancestry
changes the id. That is what makes an id a usable name for "this exact state and
everything behind it".

Short prefixes are convenient for human display and can collide as a repository
grows. The full id names one exact subject.

## In Cairn

Every candidate-bound record — [coherence audit](./coherence-audit.md),
[closing acceptance](./closing-acceptance.md),
[checkpoint retention](./checkpoint-retention.md) refs, `governs:` pins — uses
the **full object id in the repository's configured object format**.

Cairn deliberately does not say "forty hexadecimal characters". Git's object
format is configurable: SHA-1 produces forty hex characters, SHA-256 produces
sixty-four, and a protocol that hard-codes the first excludes the second for no
protocol reason. The requirement is *full and unabbreviated*, and the length
follows from the repository.

A base commit may appear in prose or a ledger in an unambiguous short form for
readability, but no closure record relies on a prefix.

## It does not prove

Knowing an id does not establish who approved it, or whether a remote still
protects the history containing it. Digest strength is also a property of the
chosen object format, not of Cairn: Cairn inherits whatever collision resistance
the repository configured.

Related: [commit](./commit.md), [tamper evidence](./tamper-evidence.md),
[closing acceptance](./closing-acceptance.md).
