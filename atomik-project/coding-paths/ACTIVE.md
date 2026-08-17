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
from the path files themselves, and `cairn-check` fails on the trunk when it is
stale. Deriving it is what lets every path merge itself: there is nothing here
for two paths to disagree about.

<!-- cairn:paths:begin -->
- **CP-MVP-010** — Retrieval over the graph · branch `path/cp-mvp-010` · base `2370546`
- **CP-RICH-MARKDOWN** — Rich Markdown · branch `path/cp-rich-markdown` · base `98561b4`
<!-- cairn:paths:end -->

Next up: **CP-MVP-011** — Wikimedia augmentation over the same nodes/edges
tables (Wikipedia extract · Wikidata entity · Commons P18 · Wiktionary
etymology · the model-driven tool loop · web citations · save-as-source),
split out of CP-MVP-010 at its opening check and opening once it merges.

Declared-write overlap between the two paths running now (advisory signal,
never a lock): `shared/ipc-contract.ts`, `electron-main/index.ts`,
`electron-main/action-trace.ts`, `electron-preload/index.ts` — the hot
files `paths.md` names. Both paths rebase early and often; the resolution
is mechanical (distinct channels appended).

## In flight, on the trunk

- [CP-OPS-001 — Cairn: the protocol and its enforcement](./CP-OPS-001.md) —
  accepted 2026-08-14 (opening check: `../sessions/2026-08-14-cp-ops-001-opening-check.md`).
  Base commit 70f7e27. S01–S04f, S06 (ratification, `ADR-012`) and S07 (the
  pilot's first finding, fixed in the validator) are done. S05, the pilot, is
  half-run: two paths opened on their own worktrees on 2026-08-16, and what
  remains is the first self-merge — ceremony → rebase → CI on the rebased
  result → audit → `done` → merge. Runs on the trunk by the bootstrap
  exception below, since it is the path that builds the machinery every other
  path uses.

## Done

- [CP-MVP-009 — Semantic graph foundation (M8 front half)](./CP-MVP-009.md) — done 2026-08-13 (acceptance: `../sessions/2026-08-13-cp-mvp-009-acceptance.md`; closing ceremony: `../sessions/2026-08-13-cp-mvp-009-closing-ceremony.md`)
- [CP-MVP-008 — Real AI generation + the AI interaction pass (M2 completion)](./CP-MVP-008.md) — done 2026-08-04 (acceptance: `../sessions/2026-08-04-cp-mvp-008-acceptance.md`); [CP-MVP-007 — Tree file management (M1 friction pass)](./CP-MVP-007.md) — done 2026-07-21 (acceptance: `../sessions/2026-07-21-cp-mvp-007-acceptance.md`); [CP-MVP-006 — Web source tab (M5)](./CP-MVP-006.md) — done 2026-07-16 (acceptance: `../sessions/2026-07-16-cp-mvp-006-acceptance.md`); [CP-MVP-003 — PDF source tab (M4)](./CP-MVP-003.md) — done 2026-07-13 (acceptance: `../sessions/2026-07-13-cp-mvp-003-acceptance.md`); [CP-MVP-005 — Seats hardening](./CP-MVP-005.md) — done 2026-07-08 (acceptance: `../sessions/2026-07-08-cp-mvp-005-acceptance.md`); [CP-MVP-004](./CP-MVP-004.md) — done 2026-07-08; [CP-MVP-002](./CP-MVP-002.md) — done 2026-07-07; [CP-MVP-001](./CP-MVP-001.md) — done 2026-07-06

## Rules

- Convention: [paths.md](./paths.md) · milestone → path register: [index.md](./index.md)
- A path is one worktree, one branch (`path/<id>`), one writer. It merges itself
  once its closing ceremony is recorded, it contains the trunk tip, and CI is
  green on the rebased result.
- Agents entering the repository follow `docs/bedrock/22_22-agent-handoff.md`,
  read `paths.md` before opening a path, and resume from the Work Ledger of
  their own path.
- **Bootstrap exception**: CP-OPS-001 itself was executed on the trunk, because
  the convention it defines did not exist while it was being built and there
  was exactly one writer. It is the only path allowed to have done so; every
  path after it takes a branch.
