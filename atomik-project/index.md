---
type: Atomik Project
title: Atomik — knowledge and execution plane
description: The editable project bundle for building Atomik itself; consumed by humans in Atomik and by coding agents alongside the code plane.
tags: [atomik, meta, execution-state]
timestamp: 2026-07-05T00:00:00Z
---

# Atomik — knowledge and execution plane

This folder is an ordinary Atomik project bundle living beside the code plane in one repository (ADR-009).

## What is inside

- `log.md` — chronological history of this plane.
- `brainstorm/` — explicitly provisional thinking. Nothing here is a decision.
- `briefs/` — generated handoff snapshots. Disposable; regenerated from path state.
- `coding-paths/` — the execution-state plane. Start at [ACTIVE.md](./coding-paths/ACTIVE.md); the milestone → path register is [coding-paths/index.md](./coding-paths/index.md), and completed steps roll into [coding-paths/history/](./coding-paths/history/index.md).
- `sessions/` — ceremonies, owner rulings and bench passes, kept verbatim. Index: [sessions/index.md](./sessions/index.md).
- `audits/` — one coherence audit per path merge; advisory by design. Index: [audits/index.md](./audits/index.md).
- `sources/` — optional imported specs and references as source dossiers.

## Recently promoted decisions

- 2026-07-16 — **One surface, two layers**: the scene editor and the freeform drawing layer share one editing surface with two entity kinds — bound entities (Scene-IR-backed; the DSL is the serialization of the bound layer) and free ink (sidecar drawing file; no claims) — connected by a promotion gradient and a detachment path. Accepted as [ADR-010](../docs/adr/ADR-010-one-surface-two-layers.md); reserved doctrine added to bedrock 19 and 21; origin pack in [sessions/2026-07-16-one-surface-two-layers/](./sessions/2026-07-16-one-surface-two-layers/one_surface_two_layers_amendment_pack.md).

## Index and log, per OKF

[Bedrock 26](../docs/bedrock/26_26-okf-agent-context.md) gives a meaningful folder
two conventions: `index.md` says what is inside and why it matters, `log.md` records
recent meaningful changes in that scope. An agent reads the nearest index before
opening many files, and the log when recency matters. **Every folder in this plane
now carries both** (CP-OPS-002 S05c), each log seeded from that folder's real Git
history and appended newest-first in the work unit that makes the change.

The convention has taken exactly one amendment here, and it was about CONCURRENCY,
not size: several paths appending to one journal collided, so `log.md` was frozen as
the historical archive and the journal became one file per entry under
[`log/`](./log/index.md) — `YYYY-MM-DD-<path-id>.md`, two paths writing two files
never conflict. **A shared log takes that shape; a folder log was never decided
against.**

*(Correction, 2026-08-24: this section previously read "Indexes yes, per-folder logs
no" and presented it as a recorded decision. Nobody took that decision — the agent
wrote doctrine on its own authority. Retracted.)*

## Ground rules

- Bedrock and ADRs stay canonical under `docs/`; promotion from `brainstorm/` goes through reviewed patches.
- Durable decisions and dated external facts never live only in this plane's provisional folders.
- Agents: read `docs/bedrock/22_22-agent-handoff.md` before doing anything else.
