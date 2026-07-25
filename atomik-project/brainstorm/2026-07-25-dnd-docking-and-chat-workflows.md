---
type: Atomik Brainstorm
title: Drag-and-drop docking + chat-first workflows
timestamp: 2026-07-25T15:30:00Z
status: provisional — owner directive recorded verbatim, path proposal pending
---

# Drag-and-drop docking + chat-first workflows (owner, 2026-07-25)

Owner directive, verbatim (mid-S06c13 exchange):

> "Also it could happen that I start a session by just using tree
> panel + chat to generate new notes or manage folder from future
> agent harness. Chat can be either a right pane that work on a
> already opened note on the left but also can be a generator of
> artefact and be the left pane and artefact spawning on the right.
> Also I think it is maybe time as I think I am gonna start using
> daily, to extend drag and drop capability : from tree pane to new
> tab or new pane (with smart pane position preview on hovering
> future zone) same on opened tab to other position in the same pane
> or into another pane or onto create a new pane, and also smart
> pane position/split management with drag an drop position
> managment"

## What already exists (do not rebuild)

- Tree rows, note-bearing tabs, and editor selections are DRAG
  SOURCES with typed payloads (S06c5: `TREE_DRAG_MIME`,
  `SELECTION_DRAG_MIME`, `tabDragSource`); the chat context list is a
  drop TARGET; the effectAllowed/dropEffect matching rule is learned
  (docs/learning/19).
- Chat-first session shape shipped as S06c13: tree panel + chat pane
  alone; chat panes carry the vault tree (hidden by default,
  auto-shown when last visible tree). Artifacts already spawn BESIDE
  the chat wherever it sits (openNoteInNewPane splits right of the
  chat pane) — chat-left/artifact-right works today.
- Pure layout model (workspace/model.ts): splitPane / addTab /
  activateTab / closeTab / closePane, fully unit-tested — docking
  reduces to sequences of these.

## The feature block (candidate coding path after CP-MVP-008)

1. **Tree → workspace drops**: drag a tree row out of the panel; drop
   on a tabstrip = open as tab there; drop on a pane EDGE ZONE =
   split that side and open there (new pane).
2. **Tab dragging**: reorder within the strip; drop on another pane's
   strip = move tab; drop on an edge zone = tear out into a new pane.
   (Needs a tab-reorder model op — the only new model primitive.)
3. **Smart drop preview**: hover zones (center = tab, N/S/E/W edges =
   split) rendered as a translucent overlay BEFORE the drop commits —
   VS Code-style docking hints; obeys 36 glass/tokens.
4. **Split management by drag**: dragging a whole pane (grip on the
   tabstrip?) re-docks it; dividers already drag (fractions).

Notes for the path proposal: native HTML drag (established idiom in
this repo) over pointer-emulation; one shared drop-zone component
computing the 5 zones from the hovered pane's rect; every drop
compiles to existing model ops + one new `moveTab(state, tabId,
targetPaneId, index)` / `dockTab(state, tabId, targetPaneId, side)`;
CDP-drivable end to end (S06c5 precedent for real dragstarts).

## Also recorded

- Claim VERIFICATION tools (owner, decision-B exchange 2026-07-25):
  "if not sourced I imagine in the future I would be able to trigger
  the verification of the claim with different tools" — unverified
  claims (model-only / needs-citation marks, S06c17) get per-claim
  verification actions (search the vault, the web, a stronger model…).
  Relates to M6/M7 verification milestones.

- "Manage folders from future agent harness" — the chat/agent as a
  vault-management surface; relates to the roadmap's agent milestones
  (M7+), not this block.
