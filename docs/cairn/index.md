---
type: Atomik Index
title: Cairn — canonical specification, implementation records, and audits
description: The entry map for Cairn's canonical team-protocol specification, concept wiki, implementation reference, universal reader, and dated design records.
tags: [cairn, protocol, specification, index, audit, okf]
timestamp: 2026-08-25T00:00:00Z
---

# Cairn

Cairn is a repository-native protocol for teams of developers and coding
agents. Each bounded coding path has durable project records and a remote branch
whose completed checkpoints can be inspected, fetched, handed over, and resumed.
Each path also carries its accepted result through the repository's declared
integration transport; there is no standing central integrator.

## Start here

- [Canonical specification](./specification/index.md) — the authoritative v0.1
  protocol, taught from simple durable objects through paths, team concurrency,
  exact-candidate closure, lifecycle, governance, and conformance.
- [Concept wiki](./specification/concepts/index.md) — one article for every
  specialised Git or Cairn concept used by the specification.
- [Implementation reference](./specification/reference/index.md) — exact layout,
  templates, record schemas, commands, configuration status, and conformance
  checklist.
- [Universal HTML edition](./specification.html) — the same article graph in one
  self-contained, flat research-paper-style reader with a tree, two equal
  independently scrolling panes, and cross-pane wiki navigation.

`docs/cairn/specification/` is an Atomik-ready documentation project:
`index.md` is the main learning route, `concepts/` is the linked object wiki,
and `reference/` carries operational forms. Ordinary Markdown links provide the
same navigation as the standalone HTML reader.

## Executable implementation

- [`tools/cairn-check.mjs`](../../tools/cairn-check.mjs) — deterministic
  reference checker.
- [`tools/cairn-audit.mjs`](../../tools/cairn-audit.mjs) — exact-candidate audit
  scaffolding and binding checks.
- [`tools/cairn-active.mjs`](../../tools/cairn-active.mjs) — generated live-path
  view.
- [`tools/cairn-rules.mjs`](../../tools/cairn-rules.mjs) — generated rule
  catalogue.
- [ADR-018](../adr/ADR-018-cairn-candidate-bound-closure.md) — proposed
  candidate-bound closure and team enforcement boundary.
- [Live operating detail](../../atomik-project/coding-paths/paths.md) — the
  current repository's configured workflow.

## Other views and retained design records

- [Compact overview](./index.html)
- [Workflow view](./workflow.html)
- [Extraction brief](./cairn.md)
- [Implementation audit](./cairn-audit-2026-08-24.md)
- [Opening-check agenda](./cairn-opening-check-agenda.md)
- [Initial diagnostic](./cairn-protocol-research-and-diagnostic.md)
- [Second diagnostic](./cairn-protocol-research-and-diagnostic-round-2.md)
- [Round-three deliverables](./cairn-protocol-round-3.md)
- [Round-three brief](./cairn-round-3-brief.md)
- [Round-four brief](./cairn-round-4-brief.md)

The dated records explain design history. They are not operator instructions and
do not override the canonical specification.
