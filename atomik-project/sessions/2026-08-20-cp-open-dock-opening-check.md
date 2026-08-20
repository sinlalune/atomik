---
type: Atomik Session Record
title: CP-OPEN-DOCK opening check — open-target model + five-zone drag/dock, backlog reordered
timestamp: 2026-08-20T00:00:00Z
---

# CP-OPEN-DOCK opening check (2026-08-20)

Run per `docs/bedrock/22_22-agent-handoff.md` §Around every path and
`atomik-project/coding-paths/paths.md` §Opening a path. CP-OPEN-DOCK is a
carried label from the CP-FEEDBACK opening check (contracts 6 and 7), which
ruled that each carried path repeats its own short opening check before
activation so new trunk evidence can refine its execution plan. This is that
check.

## Backlog reorder — owner ruling

The 2026-08-17 CP-RICH-MARKDOWN closing ceremony ruled CP-AI-CAPABILITIES next,
ahead of CP-LANGUAGE-NOTES, with CP-OPEN-DOCK third. Asked whether opening
CP-OPEN-DOCK now reorders that backlog, the owner answered:

> "Open OPEN-DOCK now"

The backlog order is now CP-OPEN-DOCK (activating) → CP-AI-CAPABILITIES →
CP-LANGUAGE-NOTES → CP-PDF-READER. This is an owner-gated, owner-made roadmap
amendment, recorded here as the durable execution state.

## Confirmed contracts (owner answers, verbatim)

Asked whether the carried scope — contracts 6 and 7 as ONE path, reconciled
with the 2026-07-25 DnD brainstorm — was confirmed, the owner answered:

> "One path, both contracts"

1. **Open-target interaction (contract 6)** — asked whether one contextual
   open-target model (current tab, new tab, new pane right, new pane below)
   with discoverable keyboard shortcuts was as designed:

   > "Yes, 4 targets + keyboard"

2. **Tab and pane drag/dock (contract 7)** — asked whether the DnD block
   (five-zone hover preview — center = tab, N/S/E/W edges = split; tab reorder
   in strip; tab move across panes; tree-row drop to tabstrip/edge; cancel and
   invalid-drop handling; keyboard equivalents for every move) should also
   include the brainstorm's pane-grip re-dock:

   > "Yes, include pane grip"

3. **Entry points** — asked what triggers the open-target interaction:

   > "Tree rows + links + tab move"

4. **Implementation approach** — asked whether native HTML5 drag (the repo
   idiom), one shared five-zone drop component, new model ops `moveTab` /
   `dockTab`, and CDP-drivable end-to-end tests were confirmed:

   > "Confirm"

## Current implementation pins

- `workspace/model.ts` exposes `makeTab`, `addTab`, `activateTab`, `closeTab`,
  `splitPane`, `closePane`, `setFraction`, `openNoteInNewPane`, `revealNote`
  and more — all unit-tested. There is **no** `moveTab`, `dockTab`, or tab
  reorder op; the brainstorm named these as the only missing primitives.
- The tabstrip (`Workspace.tsx`) renders tabs with `activateTab`/`closeTab`
  and a `+` new-tab button; note-bearing tabs are drag SOURCES toward chat
  context only (`tabDragSource`, effectAllowed `copy`). No tabstrip is a drop
  target; no reorder/move exists.
- `NewTabChooser` (typed panes) and `NewPaneChooser` (untyped pane birth)
  exist as separate buttons/flows; there is no single contextual open-as
  interaction and no open-as keyboard shortcut (only Mod+N quick note).
- Tree rows are drag sources with typed payloads (`TREE_DRAG_MIME`) that drop
  on tree folders (move) and chat context; they cannot drop on tabstrips or
  pane edges.
- Divider fraction dragging already exists (`setFraction`); pane splits are
  already reachable via `splitPane` (New pane chooser and the chat
  `openNoteInNewPane` convention). Nothing here is rebuilt.
- No five-zone drop preview exists anywhere.

## Overlap check

- `path/cp-mvp-011` (running on its own worktree): Wikimedia/shared/main work.
  No declared workspace/vault renderer surface overlaps this path's writes.
- `path/cp-ai-capabilities` (queued): touches `ChatView.tsx` only; this path
  does not declare ChatView. Advisory signal, never a lock.
- Hot files (`paths.md`): `shared/ipc-contract.ts`, `electron-main/index.ts`
  are not declared by this path unless a step discovers otherwise.
- `writes:` entries are advisory signals, not locks. Any newly discovered root
  cause is recorded in the path ledger before widening.

## State

Opening check accepted. `CP-OPEN-DOCK` is ready for activation on branch
`path/cp-open-dock` in its dedicated worktree, base commit `80b131a`.
