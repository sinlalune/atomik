---
type: Cairn Reference Index
title: Cairn implementation reference
description: Copy-ready layouts, schemas, records, configuration, commands, and vocabulary for reconstructing a conforming Cairn repository.
tags: [cairn, reference, index, implementation]
timestamp: 2026-08-25T00:00:00Z
---

# Implementation reference

The [canonical specification](../index.md) explains the protocol top down. This
folder collects the exact structures needed to reconstruct it.

- [Repository layout](./repository-layout.md) — directories, filenames,
  ownership, and derived state.
- [Coding-path template](./path-template.md) — complete frontmatter, plan,
  documentation coverage, steps, and work ledger.
- [Human records](./human-records.md) — opening, closing, and coherence-audit
  templates.
- [Configuration](./configuration.md) — canonical `cairn.config.json` roles,
  defaults, and portability rules.
- [Operations](./operations.md) — opening, step completion, closing, merge
  verification, and safe cleanup commands.
- [Glossary](./glossary.md) — precise definitions in one place.

Reference pages do not add requirements. If a reference and the specification
disagree, the specification is authoritative and the disagreement must be fixed.
