---
type: Cairn Concept
title: Scope digest
description: A content digest of the accepted definition of done, recorded at opening and re-verified at closing.
tags: [cairn, concept, acceptance, scope, evidence]
timestamp: 2026-08-26T00:00:00Z
---

# Scope digest

A scope digest is a cryptographic digest of the exact text that a
`scope_ref` names, recorded in the [opening acceptance](./opening-acceptance.md)
and re-computed at [closing acceptance](./closing-acceptance.md).

## Build the idea

Implementation is bound to an object id: a
[candidate](./implementation-candidate.md) is one exact commit and cannot
quietly become a different one. Scope had no such binding. A `scope_ref` is a
file path and a heading — a mutable pointer — so the sentence it resolves to can
be edited after opening, and nothing in the record notices.

That asymmetry is the whole problem. Acceptance compares a fixed result against
a moving target, and the comparison still reads as valid afterwards. A digest
gives scope the same kind of identity the code already had.

## In Cairn

The opening record carries:

```yaml
scope_ref: project/coding-paths/CP-EXAMPLE-001.md#definition-of-done
scope_digest: sha256:9f2c…
```

The digest covers the resolved section text — the heading and its body up to the
next heading of the same or higher level — normalised for line endings and
trailing whitespace, with no other transformation.

Closing acceptance re-computes the digest from the same `scope_ref` at candidate
`C` and records the result. If it differs, the definition of done moved after it
was accepted: closing MUST NOT proceed on the original acceptance. The path
either restores the accepted text or records a scope amendment — a new opening
acceptance, with a new digest, naming the record it supersedes.

Because a [foundation path](./foundation-path.md) already pins its governing
documents at exact object ids, its scope digests cost nothing extra to compute.

## It does not prove

A digest proves that text is unchanged, not that it was ever a good definition
of done. It also says nothing about text the `scope_ref` does not resolve to: a
path can still be scoped by a sentence too vague to bind anything.

Related: [opening acceptance](./opening-acceptance.md),
[closing acceptance](./closing-acceptance.md), [path record](./path-record.md),
[acceptance drift](./acceptance-drift.md).
