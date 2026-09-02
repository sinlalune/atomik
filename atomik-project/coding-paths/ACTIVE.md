---
type: Atomik Coding Path Pointer
title: Running coding paths
timestamp: 2026-08-14T00:00:00Z
---

# Running coding paths

Several coding paths run at once, each in its own worktree, each merging itself
into the trunk after its own closing ceremony. There is no integration parent
and no integrator: the convention is [paths.md](./paths.md).

## Running now

DERIVED — do not edit by hand. `npm run cairn-active` regenerates this block
from path declarations registered on the trunk before implementation branches,
and `cairn-check` fails when the trunk projection is stale. Registration makes
the inputs globally complete; derivation keeps the output single-sourced.

<!-- cairn:paths:begin -->
- **CP-OPS-002** — Cairn 2.0 · status `ready` · branch `path/cp-ops-002` · base `7aa3b1d`
<!-- cairn:paths:end -->

## Grandfathered in flight

These paths were already branched when trunk registration became a rule. They
are a finite migration list in Cairn and disappear from this section when they
merge; no new path may copy the exception.

- **CP-MVP-011** — `path/cp-mvp-011`, finishing S07 bench before save-as-source,
  hardening and closure; no blocker recorded.
- **CP-MVP-012** — `path/cp-mvp-012`, opened at S01 with no implementation;
  depends on CP-MVP-011 and must not merge before it.

## Done

- [CP-UI-TYPOGRAPHY — one bundled proportional face, defined once](./CP-UI-TYPOGRAPHY.md) — done 2026-08-27 ([opening check](../sessions/2026-08-27-cp-ui-typography-opening-check.md) · [closing](../sessions/2026-08-27-cp-ui-typography-closing-ceremony.md) · [audit](../audits/cp-ui-typography-a380f2a.md))
- [CP-WORKTREE-CLEANUP — retire a merged path's clean secondary worktree while retaining its branch](./CP-WORKTREE-CLEANUP.md) — done 2026-08-24 ([opening check](../sessions/2026-08-24-cp-worktree-cleanup-opening-check.md) · [closing](../sessions/2026-08-24-cp-worktree-cleanup-closing-ceremony.md))
- [CP-RENDER-REPAIRS — math, Vega, chat slug and diagram canvas repairs](./CP-RENDER-REPAIRS.md) — done 2026-08-20 (merge `cc78d2f`)
- [CP-OPEN-DOCK — open-target interaction and five-zone docking](./CP-OPEN-DOCK.md) — done 2026-08-20 (merge `7f8d026`)
- [CP-AI-CAPABILITIES — AI capabilities: tell the model what the surface renders](./CP-AI-CAPABILITIES.md) — done 2026-08-20 (opening check: `../sessions/2026-08-19-cp-ai-capabilities-opening-check.md`; bench: `../sessions/2026-08-20-cp-ai-capabilities-s03-bench-round1.md`; closing ceremony: `../sessions/2026-08-20-cp-ai-capabilities-closing-ceremony.md`)
- [CP-MVP-009 — Semantic graph foundation (M8 front half)](./CP-MVP-009.md) — done 2026-08-13 (acceptance: `../sessions/2026-08-13-cp-mvp-009-acceptance.md`; closing ceremony: `../sessions/2026-08-13-cp-mvp-009-closing-ceremony.md`)
- [CP-MVP-008 — Real AI generation + the AI interaction pass (M2 completion)](./CP-MVP-008.md) — done 2026-08-04 (acceptance: `../sessions/2026-08-04-cp-mvp-008-acceptance.md`); [CP-MVP-007 — Tree file management (M1 friction pass)](./CP-MVP-007.md) — done 2026-07-21 (acceptance: `../sessions/2026-07-21-cp-mvp-007-acceptance.md`); [CP-MVP-006 — Web source tab (M5)](./CP-MVP-006.md) — done 2026-07-16 (acceptance: `../sessions/2026-07-16-cp-mvp-006-acceptance.md`); [CP-MVP-003 — PDF source tab (M4)](./CP-MVP-003.md) — done 2026-07-13 (acceptance: `../sessions/2026-07-13-cp-mvp-003-acceptance.md`); [CP-MVP-005 — Seats hardening](./CP-MVP-005.md) — done 2026-07-08 (acceptance: `../sessions/2026-07-08-cp-mvp-005-acceptance.md`); [CP-MVP-004](./CP-MVP-004.md) — done 2026-07-08; [CP-MVP-002](./CP-MVP-002.md) — done 2026-07-07; [CP-MVP-001](./CP-MVP-001.md) — done 2026-07-06

## Rules

- Convention: [paths.md](./paths.md) · milestone → path register: [index.md](./index.md)
- A path is one worktree, one branch (`path/<id>`), one writer. It merges itself
  once its closing ceremony is recorded, it contains the trunk tip, and CI is
  green on the rebased result.
- After its pushed merge is verified on the remote trunk, its exact clean
  secondary worktree is removed without force from another checkout; the path
  branch remains as online history.
- After opening acceptance, the path declaration and this regenerated view land
  in a registration-only trunk commit BEFORE the implementation worktree
  branches. Cairn blocks new paths that skip it.
- Agents entering the repository follow `docs/bedrock/22_22-agent-handoff.md`,
  read `paths.md` before opening a path, and resume from the Work Ledger of
  their own path.
- **Historical bootstrap exception**: CP-OPS-001 began on the trunk because it
  built the convention. At S08 it moved to `path/cp-ops-001`; the exception is
  closed and no implementation path writes the owner's trunk worktree.
