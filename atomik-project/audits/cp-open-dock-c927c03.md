---
type: Atomik Coherence Audit
title: Coherence audit — CP-OPEN-DOCK @ c927c03
timestamp: 2026-08-20T17:36:57.642Z
atomik:
  path: CP-OPEN-DOCK
  branch: path/cp-open-dock
  head: c927c039a385c4026b93e9ea1d81066f5d99156c
  base: 80b131a
  verdict: clean
---

# Coherence audit — CP-OPEN-DOCK @ c927c03

Run after the rebase, before the merge. ADVISORY: nothing here blocks. Its job
is to catch what no deterministic check can — two paths that each pass every
rule and still pull the architecture in different directions.

## What to read

- the rebased diff for this branch
- every bedrock page and ADR named in this path's documentation coverage
- the module area notes the diff touches
- any OTHER path currently `running` that declares an overlapping surface

## Findings

### Does the diff contradict an accepted decision?

No.

- **03 (workspace-and-tabs) held.** Workspace persistence format is unchanged;
  the open-target model (`openNoteAt`), tab reorder/move (`moveTab`), tab tear-out (`dockTab`),
  tree docking (`dockNote`), and whole-pane re-docking (`dockPane` / `mergePane`)
  compile cleanly from pure primitives in `workspace/model.ts`. All invariants —
  including the S06c12 last tree-bearing pane guard and total collapse landing on an
  empty vault pane — are preserved.
- **36 (ui-design-system) held.** The translucent `DockPreview` overlay, drop indicators
  (`.tab.drop-before` / `.tab.drop-after`), and the pane grip handle (`.pane-grip`)
  consume bedrock 36 glass, border, and token rules (`--glass-pop`, `--accent`, `--radius-lg`,
  `--shadow-pop`). `DockPreview` is an `aria-hidden="true"`, `pointer-events: none` overlay
  that cleans up on cancel/dragleave without mutating state. The owner bench refined the 2-pane
  drag preview to span the full workspace container (1/2 rectangle) rather than a local 1/4 square.
  Accessible titles and aria labels are provided for all interactive elements.
- **13 (electron-security) held.** Drag-and-drop payloads (`TAB_DRAG_MIME`, `PANE_DRAG_MIME`,
  `TREE_DRAG_MIME`) are typed and parsed narrowly through pure serialization/parsing helpers.
  No new IPC channel, preload bridge, or renderer authority was added.
- **15 (maintainability) held.** All model operations are pure functions with extensive unit
  test coverage (1080 tests total across the suite).

### Does it duplicate something another running path is building?

No — no other path currently running overlaps this surface. The reordered backlog
placed CP-OPEN-DOCK first, ahead of CP-LANGUAGE-NOTES and CP-PDF-READER, with
CP-AI-CAPABILITIES already cleanly merged to trunk.

### Did it introduce architecture that belongs in an ADR and has none?

No. The open-target vocabulary (contract 6) and five-zone docking interaction (contract 7)
were reconciled directly from the 2026-08-16 opening check and 2026-07-25 owner directive.
All operations compile to existing layout structures without altering workspace state schemas.

### Is anything now documented in two places that will drift apart?

No. `docs/modules/atomik-desktop-shell.md` is the single canonical source of truth for
the shell workspace layout, open-target interaction, five-zone drop geometry, and pane docking.

## Verdict

**Clean.**

Owner acceptance validated on interactive Electron dev bench (`ATOMIK_LANE=open-dock npm run dev`).
All 7 blocking rules and 4 advisory checks pass. The test suite is 100% green (1080 tests passing),
smoke tests (standard smoke and rich renderer smoke) pass in real headless Electron runs,
and the path is ready for self-merge.

