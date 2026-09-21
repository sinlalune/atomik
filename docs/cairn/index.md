---
type: Atomik Index
title: Cairn — canonical specification, implementation records, and audits
description: The entry map for Cairn's canonical team-protocol specification, concept wiki, implementation reference, universal reader, and dated design records.
tags: [cairn, protocol, specification, index, audit, okf]
timestamp: 2026-09-02T00:00:00Z
---

# Cairn

Cairn is a repository-native protocol for teams of developers and coding
agents. Each bounded coding path has durable project records and a remote branch
whose completed checkpoints can be inspected, fetched, handed over, and resumed.
Each path also carries its accepted result through the repository's declared
integration transport; there is no standing central integrator.

## Start here

- [Manifesto](./manifesto.md) — the owner's statement of what the protocol is
  for, verbatim (2026-09-02); the
  [project note](./cairn-project-note-2026-09-02.md) beside it says what the
  protocol must become.
- [Manifesto convergence](./cairn-manifesto-convergence-2026-09-02.md) — the
  protocol measured against that vision and against the current coding
  workflows, with the proposed Cairn 1.0 shape and the owner's decisions.
- [Canonical specification](./specification/index.md) — RETIRED. The v0.2
  protocol as it stood, taught from simple durable objects through paths, routes, team
  concurrency, exact-candidate closure, lifecycle, repair, governance, and
  conformance.
- [Concept wiki](../concepts/index.md) — one article per
  specialised idea, with the twenty-one borrowed Git and general-practice terms
  kept separate from the fifty concepts Cairn defines.
- [Implementation reference](./specification/reference/index.md) — RETIRED with it: exact layout,
  templates, record schemas, commands, configuration status, and conformance
  checklist.
- [Portable execution protocol](./specification/reference/execution-protocol.md)
  — RETIRED. The session route as v0.2 required it, separated from every host
  binding. What this repository requires now is the release linked from
  [`cairn/README.md`](../../cairn/README.md).
- [Universal HTML edition](./specification.html) — FROZEN at the 0.2 cut; its
  builder was deleted at CP-OPS-003 S02 and it cannot be regenerated. The same article graph in one
  self-contained reader: an article tree, the full specification fixed in the
  left pane, and every link or tree entry opening its object in the right.

`docs/cairn/specification/` is the RETIRED 0.2 specification, kept only so that append-only records linking six of its pages still resolve (CP-OPS-003 S02). It was an Atomik-ready documentation project:
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
- `tools/cairn-rules.mjs` (deleted at CP-OPS-003 S02) — generated rule
  catalogue.
- [ADR-018](../adr/ADR-018-cairn-candidate-bound-closure.md) — proposed
  candidate-bound closure and team enforcement boundary.
- [ADR-019](../adr/ADR-019-cairn-v0-2-revision.md) — proposed v0.2 revision:
  retention, provisional commits, the brief contract, scope digests, the drift
  predicate, and the lightweight default.
- [Portable path convention](../../atomik-project/coding-paths/paths.md) — RETIRED
  at CP-OPS-003 S03 — and [Atomik binding](../../atomik-project/coding-paths/binding.md),
  which is current. The operating route installed in this repository is the
  release and its six skills.

## Other views and retained design records

- [Cold-resume pilot, 20 trials](./cairn-cold-resume-pilot-2026-08-26.md)
- [Greenfield pilot, one lifecycle, two runs](./cairn-greenfield-pilot-2026-09-01.md)
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
