---
type: Cairn Reference Index
title: Cairn implementation reference
description: Exact layouts, schemas, templates, commands, and conformance claims for reconstructing or operating Cairn.
tags: [cairn, reference, index, implementation]
timestamp: 2026-08-26T00:00:00Z
---

# Implementation reference

The [canonical specification](../index.md) teaches and defines the protocol.
The [concept wiki](../concepts/index.md) explains one object per article. This
reference supplies exact forms:

- [Repository layout](./repository-layout.md) — directories, file roles, and
  naming conventions.
- [Coding-path template](./path-template.md) — a complete path record.
- [Handoff-brief contract](./handoff-brief.md) — frontmatter fields, capped body
  sections, and the answerable-alone test.
- [Human records](./human-records.md) — opening, audit, and closing schemas.
- [Operations](./operations.md) — registration, checkpoints, exact-candidate
  closure, integration, and cleanup.
- [Repair procedures](./repair.md) — what to do when a path has already
  violated the protocol.
- [Configuration](./configuration.md) — the versioned portability contract and
  its current implementation status.
- [Conformance](./conformance.md) — a checklist for claims made by a repository
  or tool implementation.

Reference pages do not add requirements. If a reference and the specification
disagree, the specification is authoritative and the disagreement is a defect.
