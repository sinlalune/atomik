# AGENTS.md — Atomik bootloader

This file is deliberately tiny. It points; it does not contain project memory.
Durable knowledge lives in `docs/`; durable execution state lives in `atomik-project/`.

## Start here, in order

1. `docs/bedrock/22_22-agent-handoff.md` — the bootstrap protocol. Follow it completely.
2. `atomik-project/coding-paths/ACTIVE.md` — the active coding path and its work ledger.
3. `docs/bedrock/00_00-orientation.md` — the constitution, if this is your first session.

## Absolute rules (survive even a truncated read)

- No implementation work outside an accepted coding path (`docs/bedrock/35_35-coding-path-execution-state.md`).
- Never invent architecture outside `docs/bedrock/`; decisions live in `docs/adr/`.
- Every executed step updates code, tests, docs, the work ledger, and `log.md` in the same work unit.
- Electron/IPC work obeys `docs/bedrock/13_13-electron-security.md`; provider keys never enter the renderer.
- AI writes are proposed patches with preview; no silent file mutation; no mass rewrites.
- Progress persists in files, never in this conversation.

## Layout

```text
docs/bedrock/    constitution and architecture (what should be)
docs/adr/        accepted decisions
docs/modules/    module learning notes
atomik-project/  knowledge + execution plane (brainstorm/ is provisional)
.atomik/         rebuildable only; never canonical
```

Generate a brief into `atomik-project/briefs/` only when handing work to another session or agent.
