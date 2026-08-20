---
type: Atomik Coding Path
title: Open-target model + five-zone drag/dock — one contextual open-as interaction and native tab/pane docking with keyboard equivalents (labelled)
description: Builds one open-target interaction (current tab, new tab, new pane right, new pane below, with discoverable keyboard shortcuts) and full tab/pane drag-and-dock — five-zone smart preview, tab reorder/move/tear-out, tree-row drops to tabstrips and edges, pane-grip re-dock, cancel/invalid-drop safety — on top of the existing pure workspace model.
tags: [coding-path, feedback, workspace, tabs, panes, drag-and-drop, docking, keyboard, ui]
timestamp: 2026-08-20T00:00:00Z
atomik:
  id: CP-OPEN-DOCK
  status: running
  current_step: S07
  base_commit: 80b131a
  branch: path/cp-open-dock
  writes:
    - apps/desktop/renderer/src/workspace/model.ts
    - apps/desktop/renderer/src/workspace/Workspace.tsx
    - apps/desktop/renderer/src/workspace/open-target.ts
    - apps/desktop/renderer/src/workspace/drop-zones.ts
    - apps/desktop/renderer/src/workspace/DockPreview.tsx
    - apps/desktop/renderer/src/workspace/NewTabChooser.tsx
    - apps/desktop/renderer/src/workspace/OpenTargetMenu.tsx
    - apps/desktop/renderer/src/workspace/PaneTreePanel.tsx
    - apps/desktop/renderer/src/project/ProjectView.tsx
    - apps/desktop/renderer/src/vault/NoteTree.tsx
    - apps/desktop/renderer/src/editor/EditorPane.tsx
    - apps/desktop/renderer/src/editor/live-preview.ts
    - apps/desktop/renderer/src/vault/VaultView.tsx
    - apps/desktop/renderer/src/vault/useVaultNote.ts
    - apps/desktop/renderer/src/editor/
    - apps/desktop/renderer/src/editor/link-pills.ts
    - apps/desktop/renderer/src/icons.tsx
    - apps/desktop/renderer/src/styles.css
    - apps/desktop/tests/workspace-model.test.ts
    - apps/desktop/tests/open-target.test.ts
    - apps/desktop/tests/drop-zones.test.ts
    - docs/modules/atomik-desktop-shell.md
    - docs/modules/atomik-desktop-vault.md
    - docs/modules/atomik-desktop-editor.md
    - atomik-project/coding-paths/CP-OPEN-DOCK.md
    - atomik-project/coding-paths/ACTIVE.md
    - atomik-project/sessions/
    - atomik-project/sessions/2026-08-20-cp-open-dock-opening-check.md
---

# Goal

Reconcile the carried contracts 6 and 7 of the 2026-08-16 CP-FEEDBACK opening
check with the owner's 2026-07-25 DnD directive
(`atomik-project/brainstorm/2026-07-25-dnd-docking-and-chat-workflows.md`) as
ONE interaction system, without touching the persistence format or the
existing split/divider model:

1. One contextual open-target model exposes current tab, new tab, new pane
   right, and new pane below, with discoverable pointer AND keyboard
   shortcuts. It is reached from tree rows, links, and a tab-move modifier —
   designed with docking, not accumulated as one-off menus.
2. Native tab and pane drag/dock: a visible five-zone preview (center =
   current tab target, N/S/E/W edges = splits), tab reorder within a strip,
   tab move across panes, tear-out into edge zones, tree-row drops onto
   tabstrips and edge zones, whole-pane re-dock by dragging its grip, and
   cancellation/invalid-drop behavior that never corrupts workspace state.
3. Every move has an equivalent keyboard command.

The owner's answers and the backlog reorder (OPEN-DOCK ahead of
CP-AI-CAPABILITIES and CP-LANGUAGE-NOTES) are recorded in
`atomik-project/sessions/2026-08-20-cp-open-dock-opening-check.md`.

# Definition of done

- One open-target model with exactly four targets (current tab, new tab, new
  pane right, new pane below); pointer and keyboard equivalents are
  discoverable (visible affordances and titles/aria), and the keyboard path
  works without the pointer ever touching a menu.
- The five-zone drop preview renders during a valid drag over a pane or
  tabstrip, using the design-system tokens/glass rules, and disappears on
  cancel or invalid drop without mutating state.
- Tab reorder within a strip; tab move between panes; tear-out into an edge
  zone (new pane) — each compiles to model ops and each has a keyboard
  equivalent.
- Tree rows drop on a tabstrip (open as tab there) and on an edge zone (open
  in a new pane beside), using the existing typed payloads; drops elsewhere
  keep their current behavior.
- A pane can be re-docked by dragging its grip (tabstrip drag handle) onto a
  zone; a keyboard equivalent exists.
- New model ops (`moveTab`, `dockTab`, plus whatever a discovered root cause
  demands) are pure, unit-tested, and document their invariants; everything
  else compiles to existing ops (`addTab`, `activateTab`, `closeTab`,
  `splitPane`, `closePane`, `setFraction`).
- Focused regression tests cover every behavior above, including
  CDP-drivable end-to-end real dragstarts; both light and dark themes meet the
  design-system accessibility floors.
- Module notes, learning notes (first-use rule, 17), and this ledger change in
  the same step as their implementation.
- `npm run cairn-check`, `npm run typecheck`, `npm test`, and `npm run build`
  pass bare on the branch rebased onto the latest local `master`.
- Owner bench acceptance, closing ceremony, coherence audit, per-entry journal,
  `status: done`, and self-merge complete per the Cairn protocol.

# Documentation coverage

## Required

- 03-workspace-and-tabs — tab identity, activation, pane tree, and split model
- 36-ui-design-system — tokens, themes, glass rules, focus visibility, and
  accessibility floors for the preview overlay and drop affordances
- 13-electron-security — drag payloads are parsed from `dataTransfer`; mime
  validation stays narrow, no widened renderer authority
- 15-maintainability — pure model ops and small seams over component-local
  policy
- 17-self-evolving-docs · 22-agent-handoff · 24-doc-templates ·
  35-coding-path-execution-state · coding-paths/paths.md — standing execution
  law

## Conditional

- 12-electron — only if a step unexpectedly needs a main/preload IPC channel
- 14-app-kernels — only if a pure helper changes kernel ownership
- 06-ai-patch-pipeline — only if open-target touches chat presentation
- 09-web-source-strategy — only if web tabs need a move rule distinct from
  other tabs (they should move uniformly)
- 20-relations-and-graph-future — only if the link open-target entry changes
  link classification rather than opening behavior
- 00-orientation + 01-workbench-first — re-read if a step appears to bend the
  constitution

## Deliberately excluded

- Workspace persistence/serialization format changes — docking compiles to the
  existing state shape
- Divider fraction dragging, pane chooser retyping, chat context drops, and
  editor-selection drags — exist already and are not rebuilt
- CP-AI-CAPABILITIES, CP-LANGUAGE-NOTES, CP-PDF-READER — queued behind this
  path per the reordered backlog
- Note/link pill internals beyond their open action — presentation stays with
  the editor module
- Anything outside the renderer (main/preload untouched unless a Conditional
  document triggers)

# Execution

- [x] S01 Bootstrap + regression pins: create the isolated worktree, read
      every Required document, verify the pinned trunk behavior, record
      overlap boundaries, and run the baseline gates.
- [x] S02 Open-target model (contract 6): pin the four targets and their
      keyboard equivalents, implement the one contextual open-as interaction
      from tree rows and links plus the tab-move modifier, update
      shell/vault/editor notes, and checkpoint the ledger.
- [x] S03 Model primitives: pin move/reorder/tear-out invariants, implement
      `moveTab` and `dockTab` (plus any discovered primitive) as pure ops with
      focused tests, update the shell note, and checkpoint the ledger.
- [x] S04 Five-zone drop component: pin zone computation, preview, cancel and
      invalid-drop cases; implement one shared drop-zone component and its
      translucent preview; update shell note/design evidence and checkpoint
      the ledger.
- [x] S05 Tree and tab docking: wire tree-row drops to tabstrips and edge
      zones, tab reorder/move/tear-out, and the keyboard equivalent for every
      move; update vault/shell notes and checkpoint the ledger.
- [x] S06 Pane-grip re-dock: pin grip identification and zone behavior,
      implement whole-pane re-dock plus its keyboard equivalent, update shell
      note and checkpoint the ledger.
- [ ] S07 Integrated bench + closure: run responsive, keyboard, theme, cancel,
      and CDP-driven drag benches; complete owner acceptance and closing
      ceremony; rebase, run bare gates, produce the coherence audit and
      journal entry, mark the path done, and self-merge.

# Current checkpoint

```text
base commit : 80b131a
trunk pin   : f58093e (rebased after CP-AI-CAPABILITIES merged to trunk during
              S01; no conflict — activation files are path-local)
changed     : S01–S06 complete — the open-target model (openNoteAt, OpenTargetMenu,
              shortcuts), pure move/dock primitives (pullTab, moveTab, dockTab,
              dockNote, dockPane, mergePane), five-zone drop geometry and DockPreview
              overlay with workspace-level 1/2 rectangle spanning across perpendicular
              splits, tabstrip drop indicators (.tab.drop-before / .drop-after),
              tab and tree drag-and-drop, tabstrip pane grip handle (.pane-grip,
              GripVerticalIcon, PANE_DRAG_MIME), full keyboard equivalents
              (Mod+Shift+Arrows, Mod+Alt+Arrows, Mod+Alt+Shift+Arrows).
tests       : vitest 1080/1081 PASS (78 test files, 1 skipped); ATOMIK_SMOKE=1 PASS;
              ATOMIK_SMOKE_RICH=1 PASS; typecheck PASS; production build PASS.
next action : S07 — owner bench, testing & eyeball acceptance
blockers    : none
```

# Blockers

None recorded.
