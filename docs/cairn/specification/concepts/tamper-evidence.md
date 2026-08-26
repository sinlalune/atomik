---
type: Cairn Concept
title: Tamper evidence
description: The ability to detect history changes relative to a previously trusted identity.
tags: [cairn, concept, integrity, git]
timestamp: 2026-08-25T00:00:00Z
---

# Tamper evidence

Tamper evidence means a change becomes detectable when compared with a
previously known reference.

## Build the idea

Git hashes cover commit content and ancestry. Rewriting recorded history changes
the descendant hashes, so someone retaining an earlier trusted hash can detect
the difference.

## In Cairn

Exact subject hashes bind audit and acceptance to content. Independent protected
refs, signatures, or external anchors are required when writers may act
adversarially.

## It does not prove

Git history is not immutable merely because it is hashed. Without a previously
trusted reference, a rewritten history may look internally consistent.

Related: [commit hash](./commit-hash.md),
[record integrity](./record-integrity.md), [control plane](./control-plane.md).
