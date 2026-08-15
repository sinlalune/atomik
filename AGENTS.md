# AGENTS.md — Atomik bootloader

This file is deliberately tiny. It points; it does not contain project memory.
Durable knowledge lives in `docs/`; durable execution state lives in `atomik-project/`.

## Start here, in order

1. `atomik-project/coding-paths/paths.md` — **how work runs**: parallel coding
   paths, one per worktree, each merging itself. Read it before opening or
   resuming any path.
2. `atomik-project/coding-paths/ACTIVE.md` — which paths are running now, and
   where each stands. The running list is generated; do not hand-edit it.
3. `docs/bedrock/22_22-agent-handoff.md` — the per-step protocol (read the
   documents your path lists, execute one step at a time, persist progress).
4. `docs/bedrock/00_00-orientation.md` — the constitution, if this is your
   first session.

> **Precedence, until CP-OPS-001 S06 ratifies.** `paths.md` supersedes bedrock
> 22 and 35 wherever they disagree: those pages still describe a single active
> path with no branching model, which is how this project ran until 2026-08-14.
> Everything else in them still holds. The same applies to the coding-path
> template in bedrock 24 — take the frontmatter block from `paths.md` instead,
> since a path now declares its own `status`, `branch` and `base_commit`.

## The mechanical contract

These run locally with the same command CI runs. The exit code is the verdict —
never pipe gate output through `grep` or `head`.

```bash
npm run cairn-check     # protocol: 7 blocking rules, 4 advisory
npm run cairn-active    # regenerate the running-paths view (never edit it)
npm run cairn-audit     # scaffold the coherence audit before merging
npm run typecheck && npm test && npm run build
```

## Absolute rules (survive even a truncated read)

- No implementation work outside an accepted coding path (`docs/bedrock/35_35-coding-path-execution-state.md`).
- Never invent architecture outside `docs/bedrock/`; decisions live in `docs/adr/`.
- Every executed step updates code, tests, docs, and the path's own work ledger
  in the same work unit.
- The journal is ONE FILE PER ENTRY in `atomik-project/log/`, written at merge
  time. `atomik-project/log.md` is a FROZEN archive — never append to it.
- A path branch is `path/<id>`, in its own worktree, with one writer. Run the
  app there with `ATOMIK_LANE=<slug>` so two instances never share a profile.
- Electron/IPC work obeys `docs/bedrock/13_13-electron-security.md`; provider keys never enter the renderer.
- UI work obeys `docs/bedrock/36_36-ui-design-system.md`: tokens, themes, glass rules, and accessibility floors — read it before touching renderer markup or styles.
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
