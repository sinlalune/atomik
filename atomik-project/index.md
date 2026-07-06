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
- `coding-paths/` — the execution-state plane. Start at [ACTIVE.md](./coding-paths/ACTIVE.md); the milestone → path register is [coding-paths/index.md](./coding-paths/index.md).
- `sessions/` — optional session notes.
- `sources/` — optional imported specs and references as source dossiers.

## Ground rules

- Bedrock and ADRs stay canonical under `docs/`; promotion from `brainstorm/` goes through reviewed patches.
- Durable decisions and dated external facts never live only in this plane's provisional folders.
- Agents: read `docs/bedrock/22_22-agent-handoff.md` before doing anything else.
