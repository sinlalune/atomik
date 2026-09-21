---
type: Cairn Concept
title: Schema
description: A machine-checkable definition of a record's fields, types, and vocabulary.
tags: [cairn, concept, foundation, metadata]
timestamp: 2026-08-25T00:00:00Z
---

# Schema

A schema defines which fields a record accepts, which are required, their
types, and allowed values.

## In Cairn

Schemas make identities and lifecycle states deterministic. A closing record,
for example, must contain an exact subject hash, actor, time, accepted decision,
scope reference, and advisory disposition. Schema versions and migrations are
required for a portable profile.

## It does not prove

A structurally valid record can contain a poor judgement. Schema validation
checks shape, not wisdom.

Related: [frontmatter](./frontmatter.md), [conformance](./conformance.md),
[closing acceptance](./closing-acceptance.md).

