---
type: Atomik Journal Entry
title: CP-OPEN-DOCK — one open-target interaction and native five-zone drag/docking with keyboard equivalents
timestamp: 2026-08-20T00:00:00Z
atomik:
  path: CP-OPEN-DOCK
  step: S07
---

# CP-OPEN-DOCK — one open-target interaction and native five-zone drag/docking with keyboard equivalents

CP-OPEN-DOCK reconciled the carried contracts 6 and 7 from the CP-FEEDBACK opening check
with the owner's 2026-07-25 DnD and docking directive as ONE cohesive interaction system.

## What landed

1. **One open-target model (Contract 6)**:
   - Exactly four targets (`tab-current`, `tab-new`, `pane-right`, `pane-below`) unified under
     `workspace/open-target.ts` and compiled by `openNoteAt` in `workspace/model.ts`.
   - `OpenTargetMenu`: glass popover (`--glass-pop`, `--accent`, `--radius-lg`) discovered via `Mod+click`
     on tree rows, wikilinks, markdown links (both live and read mode), and tab headers.
   - Direct discoverable keyboard shortcuts (`Mod+Enter`, `Mod+Shift+Enter`, `Mod+Alt+Enter`, `1`–`4`, `Enter`).

2. **Move & dock primitives (Contract 7)**:
   - `pullTab`: single unified removal discipline behind `closeTab`, `moveTab`, and `dockTab`, preserving all
     existing invariants (including the S06c12 last tree-bearing pane guard).
   - `moveTab`: moves/reorders tabs within a strip or across panes with clamped slot positioning and focus handling.
   - `dockTab`: tears out a tab into a fresh pane on `left`, `right`, `top`, or `bottom` of any target pane,
     inheriting tree scope.
   - `dockNote`: pure operation for docking fresh note tabs directly from tree drops onto edge zones.
   - `dockPane`: whole-pane re-docking primitive that moves an entire pane beside another pane.
   - `mergePane`: merges all tabs from one pane into another, collapsing the source pane.

3. **Five-zone drop geometry & DockPreview**:
   - `computeDockZone`: 25% outer threshold for edge splits (`top`, `bottom`, `left`, `right`) and inner 50%
     for `center` tab landing, with deterministic corner resolution and safe zero-dimension fallback.
   - `DockPreview`: purely visual `aria-hidden="true"`, `pointer-events: none` glass overlay rendering
     the drop hint with design system tokens and cleaning up completely on cancel or dragleave.
   - 2-pane orientation shift preview: workspace-level 1/2 rectangle overlay for cross-split orientation changes.

4. **Tree & tab docking and pane-grip re-docking**:
   - Tree rows (`TREE_DRAG_MIME`) drop onto tabstrips to open as tabs and onto pane edge zones to dock.
   - Tab dragging (`TAB_DRAG_MIME`) supports reordering with insertion lines (`.tab.drop-before` / `.tab.drop-after`),
     moving between panes, and tearing out into splits.
   - Pane grip handle (`.pane-grip`, `GripVerticalIcon`, `PANE_DRAG_MIME`) in the tabstrip allows dragging
     whole panes to re-dock or merge.
   - Full keyboard equivalents on tab titles and pane grips (`Mod+Shift+Arrows`, `Mod+Alt+Arrows`, `Mod+Alt+Shift+Arrows`).

## Verification & gates

- 1080 automated tests passing (78 test files), including comprehensive unit tests for `open-target`, `drop-zones`, and `workspace-model`.
- Real Electron smoke test (`ATOMIK_SMOKE=1`) and rich smoke test (`ATOMIK_SMOKE_RICH=1`) passing cleanly.
- `cairn-check` 7 blocking rules and 4 advisory checks pass.
- Owner bench accepted on interactive Electron run.
