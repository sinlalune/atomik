---
type: Atomik Cairn Binding
title: Atomik binding appendix for Cairn execution
description: Atomik's exact role mappings, commands, worktree layout, runtime isolation, product hot files, and host-only invariants for the portable Cairn protocol.
tags: [atomik, cairn, binding, worktree, commands, electron]
timestamp: 2026-09-01T00:00:00Z
cairn:
  classification: binding
---

# Atomik binding appendix for Cairn execution

> **BINDING REQUIRED READING.** The portable rules live in
> [`paths.md`](./paths.md) and the
> [Cairn execution protocol](../../docs/cairn/specification/reference/execution-protocol.md).
> This page supplies only the Atomik names and examples those pages deliberately
> omit. The product constitution is host documentation selected by a path's
> coverage; it is not part of the protocol entry chain.

## Role bindings

| Portable role | Atomik binding |
| :-- | :-- |
| documentation plane | `docs/` |
| execution-state plane | `atomik-project/` |
| path records and live view | `atomik-project/coding-paths/` |
| accepted architecture | `docs/bedrock/` |
| decisions | `docs/adr/` |
| implemented-area notes | `docs/modules/` |
| concept wiki | `docs/cairn/specification/concepts/` |
| source roots | `apps/`, `packages/`, `shared/` |
| trunk | `master` |
| checkpoint remote | `origin` |
| metadata namespace | `atomik` |
| enforcement profile | `ci` — remote checks report; host protection is not claimed |
| generated new-path default | `lightweight` (the path record writes it explicitly) |
| path-history policy | retained at `refs/cairn/checkpoints/<id>/g<NN>/<unit>` |
| path branch | `path/<lowercase-path-id>` |

The machine-readable authority is repository-root `cairn.config.json`, schema 1,
validated by `tools/cairn-config.mjs` before the checker, active view or audit
scaffold reads repository state. This page remains the human adapter for
commands, worktree/runtime details and host-only examples that do not belong in
configuration. If the table and configuration disagree, that is a binding
defect; neither is permission to copy an Atomik name into portable protocol.

## Mechanical contract

Run gates directly. Their exit codes are the verdict; never pipe their output
through `grep`, `head`, `tail`, or another command.

```bash
npm run cairn-check
npm run cairn-active
npm run cairn-audit
npm run cairn-check:test
npm run cairn-spec:build
npm run typecheck
npm test
npm run build
```

`npm run cairn-active` is the only writer for the generated `ACTIVE.md` block.
The journal is one file per integrated outcome under `atomik-project/log/`;
`atomik-project/log.md` is a frozen archive.

## Worktree and dependency binding

The owner dogfoods `master` in the main worktree. Every implementation path uses
its own sibling worktree created from the registration commit:

```bash
git worktree add ../4tom1k-cp-example-001 \
  -b path/cp-example-001 master
cd ../4tom1k-cp-example-001
ln -s ../4tom1k/node_modules node_modules
ln -s ../4tom1k/apps/desktop/node_modules apps/desktop/node_modules
git push -u origin path/cp-example-001
```

If local `master` is ahead of `origin/master`, branch from the local registered
tip; do not silently replace it with the remote pointer.

## Runtime isolation

Run each desktop instance with its own Electron profile and port:

```bash
ATOMIK_LANE=<slug> ATOMIK_LANE_PORT=<port> npm run dev
```

The implementation is `apps/desktop/electron-main/lane.ts`. Two worktrees must
never share one profile.

## Product hot files

- `apps/desktop/electron-main/index.ts`
- `apps/desktop/shared/ipc-contract.ts`

Paths adding IPC channels commonly touch both. Conflicts are usually mechanical
append conflicts; rebase early and preserve both independently typed surfaces.

## Atomik-only invariants

- Electron and IPC work reads `docs/bedrock/13_13-electron-security.md`;
  provider keys never enter the renderer or remote views.
- UI work reads `docs/bedrock/36_36-ui-design-system.md` and preserves its
  tokens, themes, glass rules and accessibility floors.
- Core implementation updates the matching `docs/modules/` area note.
- AI-authored file changes remain proposed patches with preview; the application
  performs no silent mass rewrite.
- `docs/bedrock/00_00-orientation.md` is Atomik's product constitution. Read it
  when a path's documentation coverage selects it, not merely because a coding
  session started.

## Explanatory provenance

The [historical path-convention page](./paths-history.md) retains the pilot
rationale, owner rulings, corrections, old examples and open-hole history that
were formerly interleaved with required operating instructions. It is available
on demand and is not a second source of current rules.
