---
type: Atomik Index
title: Cairn — canonical specification, implementation records, and audits
description: The entry map for the canonical Cairn specification project, its universal standalone reader, live protocol records, and dated design history.
tags: [cairn, protocol, specification, index, audit, okf]
timestamp: 2026-08-25T00:00:00Z
---

# Cairn

Cairn is a repository-native protocol for parallel coding paths: one path, one
branch, one worktree, one writer; durable step checkpoints; recorded opening and
closing decisions; deterministic gates; and self-merge on the current trunk.

## Start here

- [**Canonical specification project**](./specification/index.md) — the normative
  entry point. It begins with the whole protocol, then moves through the project
  model, path record, lifecycle, opening, execution, parallelism, closure,
  enforcement, operations, and limits. Prerequisite concepts are explained at
  first use and link to deeper foundation notes. Copy-ready implementation
  references live beside them.
- [**Universal HTML edition**](./specification.html) — the complete standalone
  reader to share outside the repository. It has a project tree on the left, the
  top-down specification in the centre, and contextual foundation/reference
  notes in a right-hand pane. It is self-contained, responsive, keyboard
  operable, theme-aware, printable, and usable without network access.

`docs/cairn/specification/` is itself an Atomik-ready project. Open that folder:
`index.md` is the main reading surface, `foundations/` and `reference/` form the
tree, and ordinary Markdown links can open the deeper note beside the canonical
document. The HTML packages the same reading model into one file.

## Canonical sources and implementation

- [specification/index.md](./specification/index.md) — protocol semantics and
  every normative rule.
- [specification/foundations/](./specification/foundations/index.md) — newcomer
  explanations; they clarify but do not add requirements.
- [specification/reference/](./specification/reference/index.md) — canonical
  layout, templates, configuration, commands, and glossary.
- [`tools/cairn-check.mjs`](../../tools/cairn-check.mjs) — deterministic checker.
- [`tools/cairn-rules.mjs`](../../tools/cairn-rules.mjs) — generates the rule
  catalogue embedded in the canonical Markdown specification.
- [`project/coding-paths/paths.md`](../../atomik-project/coding-paths/paths.md) —
  this repository's live operating detail and configured bindings.
- [ADR-012](../adr/ADR-012-parallel-paths-self-merge.md),
  [ADR-016](../adr/ADR-016-cairn-enforcement-integrity.md), and
  [ADR-017](../adr/ADR-017-coding-path-lifecycle.md) — the decisions governing
  this implementation.

## Other live views

- [index.html](./index.html) — compact visual overview.
- [workflow.html](./workflow.html) — day-to-day role and handoff sequence.
- [cairn.md](./cairn.md) — extraction brief.
- [cairn-audit-2026-08-24.md](./cairn-audit-2026-08-24.md) — evidence-anchored
  implementation audit.
- [cairn-opening-check-agenda.md](./cairn-opening-check-agenda.md) — accepted
  execution agenda for the current extraction path.

## Dated design records

The research and round documents below are retained as design history. They are
not operator instructions and do not override the canonical specification.

- [Initial diagnostic](./cairn-protocol-research-and-diagnostic.md)
- [Second diagnostic](./cairn-protocol-research-and-diagnostic-round-2.md)
- [Round-three deliverables](./cairn-protocol-round-3.md)
- [Round-three brief](./cairn-round-3-brief.md)
- [Round-four brief](./cairn-round-4-brief.md)
