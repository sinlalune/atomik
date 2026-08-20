---
type: Atomik Brief
title: Handoff — CP-OPEN-DOCK S01–S04 completed, ready for S05
timestamp: 2026-08-20T00:00:00Z
---

# Resume CP-OPEN-DOCK here

## Current State

- **Branch / Worktree**: `path/cp-open-dock` at `/home/toure/projects/4tom1k-cp-open-dock`
- **Base commit**: `80b131a`, rebased on trunk tip `f58093e` (after CP-AI-CAPABILITIES merged)
- **Path file**: `atomik-project/coding-paths/CP-OPEN-DOCK.md`
- **Gates**: ALL GREEN — `cairn-check` OK, `typecheck` PASS, `vitest` 1066/1067 tests PASS (78 files, 1 skipped), production `build` PASS.

## Completed Steps

1. **S01 — Bootstrap & Baseline**: worktree initialized, required bedrock docs read (03, 36, 13, 15, 35), rebased on trunk after AI-CAPABILITIES merge, green baseline pinned.
2. **S02 — Open-Target Model (Contract 6)**:
   - Pure `openNoteAt` / `openNoteInNewPaneAt` in `workspace/model.ts`
   - Vocabulary and shortcut grammar in `workspace/open-target.ts` (`openTargetForKey`)
   - `OpenTargetMenu.tsx` popover component with direct keyboard shortcuts (`Mod+Enter`, `Mod+Shift+Enter`, `Mod+Alt+Enter`, `1`–`4`, `Enter`) and edge clamping
   - NoteTree rows: `Ctrl+click` opens popover, focused row shortcuts (`Mod+Enter` / `Shift` / `Alt`)
   - Wikilinks & markdown links: `Ctrl+click` opens popover in both Live mode (`live-preview.ts`) and Read mode (`useVaultNote.ts` `onContentClick`)
   - Tested and validated by the owner on real Electron bench.
3. **S03 — Model Primitives**:
   - `pullTab` shared removal discipline behind `closeTab`, `moveTab`, and `dockTab` (preserves all 79 existing model tests)
   - `moveTab(state, tabId, targetPaneId, index?)`: moves/reorders tab, clamped index, activation, no-op identity
   - `dockTab(state, tabId, targetPaneId, side)`: tears tab into fresh pane on `left`/`right`/`top`/`bottom` of target, inherits source pane tree, handles vanished targets.
4. **S04 — Five-Zone Drop Geometry & Preview**:
   - `workspace/drop-zones.ts`: `computeDockZone` (25% outer edge threshold vs 50% center, deterministic corner resolution, clamped bounds), `dockZoneLabel`
   - `workspace/DockPreview.tsx`: translucent overlay (`dock-preview` CSS with bedrock 36 glass/tokens, `--radius-lg`, `--accent`, `pointer-events: none`)
   - 15 unit/source-contract tests in `tests/drop-zones.test.ts`.

## Next Step to Execute

- **S05 — Tree and Tab Docking**:
  - Wire tab dragging (`TAB_DRAG_MIME`) on tabstrips and pane body (`moveTab` / `dockTab` with `DockPreview`)
  - Wire tree-row drops (`TREE_DRAG_MIME`) on tabstrips (`openNoteAt` `tab-new`) and pane edge zones
  - Tab-move modifier behavior (`Alt`/`Mod` drop modifier)
  - Keyboard equivalents for tab moves across panes / strips
  - Update `docs/modules/atomik-desktop-shell.md`, `atomik-desktop-vault.md`, and ledger checkpoint.

## Resume Instruction

To resume in a fresh chat, start with:
`Resume CP-OPEN-DOCK at S05 from brief atomik-project/briefs/2026-08-20-cp-open-dock-handoff.md in worktree /home/toure/projects/4tom1k-cp-open-dock`
