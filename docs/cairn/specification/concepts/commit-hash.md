---
type: Cairn Concept
title: Commit hash
description: The content-derived identifier of one Git commit and its ancestry.
tags: [cairn, concept, foundation, git]
timestamp: 2026-08-25T00:00:00Z
---

# Commit hash

A commit hash is the hexadecimal identifier [Git](./git.md) derives from a
[commit](./commit.md) object.

## Build the idea

The commit includes its tree and parent identifiers, so changing recorded
content or ancestry changes the hash. Short prefixes are convenient for human
display but can collide as a repository grows; the full identifier names one
exact subject.

## In Cairn

Candidate-bound audit and closing acceptance use the complete 40-character
hash. A base commit may use an unambiguous configured form, but closure records
never rely on a short prefix.

## It does not prove

Knowing a hash does not establish who approved it or whether a remote still
protects the history containing it.

Related: [commit](./commit.md), [tamper evidence](./tamper-evidence.md),
[closing acceptance](./closing-acceptance.md).
