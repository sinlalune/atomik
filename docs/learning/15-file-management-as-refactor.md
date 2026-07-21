---
type: Atomik Learning Note
title: 'Learning: file management as refactor — trash seams, relocate previews, and DnD over a proven verb'
description: Beginner-first walkthrough of CP-MVP-007 — why delete means the OS trash behind a seam, why rename/move is a previewed backlink refactor with rollback, and how DnD and pane trees ride the proven verbs.
tags: [learning]
timestamp: 2026-07-21T00:00:00Z
---

# Learning: file management as refactor — trash seams, relocate previews, and DnD over a proven verb

*Covers CP-MVP-007 (accepted 2026-07-16; S07 owner bench still open at backfill time). Backfilled 2026-07-21 while repaying the learning-layer stall (see index §Coverage debt).*

## Who this is for and what you can do afterwards

You read [03 — vault IO](./03-vault-io-and-file-trust.md) and
[04 — project bundles](./04-project-bundles-and-conventions.md): a vault
is a plain folder, the app a guest in it. This note covers how the tree
panel — collapse/expand/open only, before — learned to MANAGE files:
create, delete, rename, move, drag-and-drop. Afterwards you can read
`apps/desktop/electron-main/file-manage.ts` end to end and change any
guard with the tests proving you changed the right thing.

## The technologies involved, from zero

**The OS trash.** Every desktop OS has a recoverable delete (Recycle Bin,
macOS Trash, freedesktop trash); Electron exposes it as
`shell.trashItem(path)`, while `fs.rmSync`/`unlink` destroy bytes forever.
Owner decision 2026-07-16: user files ONLY ever go to the trash — hard
deletion stays reserved for rebuildable derived files.

**Filesystem primitives.** `renameSync` moves a file in one OS call;
`writeFileSync(..., { flag: 'wx' })` creates exclusively (the TOCTOU-proof
create from note 03); `mkdirSync(..., { recursive: true })` makes parents.

**Markdown relative links.** `[text](../notes/a.md)` resolves relative to
the file CONTAINING the link, so moving a note breaks arrows BOTH ways —
links to it, and its outgoing links — and a bare `fs.rename` silently
corrupts a linked vault.

**Native HTML5 drag-and-drop.** Browsers ship dragging with zero
libraries: `draggable`, a `dataTransfer` payload under a custom MIME type,
`dragover`/`drop` events. An input mechanism only; it decides nothing.

**The gates**, all in `apps/desktop/`: `npm test` (vitest node suite),
`npm run typecheck` (bare `tsc`), `npm run smoke` (real-app check rungs).

## The architecture concepts mobilized (named)

- **Test seam** — a parameter where production injects the real effect
  and tests a fake: the `TrashFn` taken by `deleteNote(..., trash)`.
- **Fail loudly, never degrade destructively** — a failing trash ERRORS; a
  "helpful" hard-delete fallback would silently turn recoverable into gone.
- **Rename as refactor** — as in IDEs: the file moves AND its references
  update in one atomic labeled operation (27), never mixed with content.
- **Preview as the acceptance gate** — no silent auto-repair (bedrock 20):
  the exact change list is computed and shown BEFORE a byte is written.
- **Atomicity and rollback** — apply = rename, then link rewrites; a
  midway failure undoes both. The vault never ends half-moved.
- **Bundle contract** — a folder directly containing `source.md` is a
  bundle root; its contract files only move/delete with it, as a unit.
- **Input binding** — DnD is a second way to REQUEST the move, never a
  second write path: a drop runs the same preview/confirm/verb flow.
- **Pane chrome** — the tree belongs to the PANE, typed vault/project/docs;
  tabs are views served from it. UI state, not knowledge (bedrock 03).
- **State migration** — saved layouts predate pane trees; the model derives
  the new shape from the old at load instead of discarding it.
- **Trust boundary re-validation** — renderer pre-checks are UX comfort;
  main-process validators remain the only real gate (bedrock 13).

## Walkthrough of the real code

**Create** — `createFolder` in `electron-main/project.ts` (all paths under
`apps/desktop/`): option D means a folder is born WITH its `index.md` map
(type `Atomik Folder Index`), written `wx` so a racing index surfaces;
`resolveProjectDirPath` gates the path. Every creating handler pushes
`vaultFilesChanged` to ALL trees.

**Delete** — `electron-main/file-manage.ts`. `deleteNote`/`deleteFolder`
validate, then call the injected `TrashFn`; `electron-main/index.ts` wires
`shell.trashItem` behind typed channels (`atomik:delete-note` and friends,
`shared/ipc-contract.ts`). `bundleContractRootOf` refuses individual
deletion of a contract file (`BUNDLE_CONTRACT_FILES`: source/index/
transcript/extracted/reader.md) — the bundle root trashes as one unit.
Renderer side (`renderer/src/vault/tree-menu.ts`), `folderDeleteSummary` +
`deleteConfirmText` count notes and escalate on source bundles — computed
from the loaded tree, no extra channel; `prunedOpenFolders` cleans folds,
`closeTabsWithin` closes the pane's tabs (`renderer/src/workspace/model.ts`).

**Relocate** — the heart. `relocatePreview` and `relocateApply` share one
private `computeRelocate` (`file-manage.ts`): the preview is exactly what
apply will do, computed without writing. It walks every scannable `.md`
(`walkNotes`: symlinks and dot/denied segments skipped), matches inline
links `[t](x)`/`[t](<x>)` only (schemes and `#`-only skipped, `#hash`
preserved), resolves each target from ITS OWN note, and rewrites only
targets resolving to the moved note. The moved note's outgoing links
re-emit from its new home — except on a same-folder rename, where the
resolution base is unchanged and rewriting would be cosmetic bytes (27:
targeted replacement only). Apply renames first, then writes links, and
rolls BOTH back on midway failure. Guards: convention files
(`index.md`/`log.md`), bundle contract files and names, collisions,
same-path. `relocateFolderPreview`/`relocateFolderApply` are the same
refactor prefix-wide (riding notes re-emit, inbound targets follow via a
path map); `insideBundle` refuses bundle-interior sources and targets.

**Tabs follow** — `relocateTabPaths` (`renderer/src/workspace/model.ts`):
the `note-relocated` push rewrites `notePath`/`dossierPath`/`projectPath`
tab params, `treeOpen` folds, and the pane tree's own scope and folds,
prefix-wide in every pane — open tabs survive the rename of what they show.

**DnD** — `renderer/src/vault/NoteTree.tsx` makes nodes draggable (JSON
payload under `TREE_DRAG_MIME`, validated back by `parseTreeDrag`); folder
rows and the tree background are drop targets. `dropNode` in
`renderer/src/workspace/PaneTreePanel.tsx` runs `dropMoveTarget`
(same-parent/own-subtree = no-ops), then the SAME `menuMove` flow the menu
uses — preview, confirm, verb, guards.

**Pane chrome** — each leaf carries a `PaneTree` map (kind, projectPath,
off/w/open) validated main-side in `electron-main/workspace-state.ts`;
`paneTreeScopeOf` types the panel, `migratePaneTrees` derives it for
older layouts from the active tab, `PaneTreePanel.tsx` consolidates the
three view-owned trees — full verb set + dirty-editor guard at the door.

**Convention sync (S07k, 2026-07-21).** The verbs above also keep the
PARENT folder's convention files current — `electron-main/folder-index.ts`.
The owner revised the option-D scoping to FULL conventions: every folder
owns `index.md` + `log.md`, and the vault root seeds both once, at the
explicit open-vault dialog (never on launch restore — no writes on open).
The index carries one managed Contents block between
`<!-- atomik:contents -->` markers: your prose around it is never
touched, an unchanged block writes nothing, and a marker-less index
adopts the block on the folder's next operation. The log gains one dated
line per verb — both parents on a cross-folder move. Because the sync
lives in the verbs, the menu, DnD, and future AI file management all
leave identical records; `tests/folder-index.test.ts` is the round-trip
matrix, and the smoke rung asserts a rename repairs the parent-index
link too.

## How it was built (methodology)

**Decisions before code.** The owner took four scoping decisions on
2026-07-16, recorded verbatim in
`atomik-project/brainstorm/2026-07-16-tree-file-management-decisions.md`
(a sibling file — the original brainstorm carried live owner edits):
folders born with `index.md` (option D); delete = OS trash; rename = the
27-sanctioned refactor behind a preview; move + DnD INCLUDED, overriding
the 07-06 post-MVP fence because the rename machinery would exist.

**A bootstrap that changed the design.** S01 read and pinned the doctrine
(04/27/20/13); the guard inventory surfaced the bundle-root marker —
"folder directly containing `source.md`", location-independent — so
guards key on the marker, not a `sources/` prefix, before any code.

**Machinery first, gesture last.** S02 create → S03 delete → S04 note
relocate → S05 folder relocate and Move to… → S06 DnD as a binding — by
the time dragging existed, it could only call the gated verb.

**Proof per step.** Every step shipped code + tests + docs + ledger + log
in one unit (tests 348→380 across S02–S06) and extended a real-app E2E
smoke rung to `vaultWrite=ok+folder+trash+reloc+fmove` — trash proven in
`~/.local/share/Trash/files/` on this WSL machine, reloc/fmove by citing
notes following on disk.

**Bench-driven finish.** S07 is the owner using it on the live vault; each
report became a sub-step (S07a–S07h), incl. the pane-chrome directives.

## Lessons learned the hard way

**The white app (S06b).** After merge, the app launched blank: two props
added to component TYPES but never to the destructuring (`onDropNode` in
NoteTree, `onMove` in TreeMenu) → `ReferenceError` at load. It escaped
because the pre-commit "check" piped `tsc` into `grep`, swallowing the
failing exit code; the smoke mounts dev-docs, not the vault tree; the
node suite renders no components. Hardened: NEVER pipe a gate — run it
bare, the exit code is the verdict; a React prop is one edit in two
places (type + destructuring), checked together.

**The creation flash (S07a).** Creating notes made OTHER notes flash by:
the follow-the-tab-param effect re-ran on every re-render while the param
trailed real opens by a few ticks, re-opening the old note, which wrote
the stale value back. The fix is a tested discipline: `noteFollowTarget`
(`renderer/src/vault/note-follow.ts`) follows only a genuine value
transition, never what was just requested; the flash is itself a test.

**The over-guard (S07e-e).** The S03 guard protected the whole bundle
FOLDER, so an AI-generated note living in a bundle refused deletion. The
rule protects the bundle CONTRACT: the guard rescoped to contract files
(ordinary notes in bundles delete/move freely, contract NAMES stay
reserved). Encode a guard's reason, not its approximation.

## Try it yourself (exercises)

1. **Run the brick's tests.** `cd apps/desktop && npx vitest run
   tests/file-manage.test.ts tests/tree-menu.test.ts` — read the seam at
   the top (`fakeTrash` records, `failingTrash` throws).
2. **Sabotage the seam.** In `deleteNote`, wrap `await trash(abs)` in a
   try/catch falling back to `rmSync` — watch "a failed trash surfaces and
   NEVER falls back to a hard delete" fail. Revert.
3. **Round-trip on the real app.** `npm run dev`, right-click the tree
   background → New folder… → find `<name>/index.md` on disk; delete the
   folder, recover it from `~/.local/share/Trash/files/` (WSL/Linux).
4. **Watch a refactor diff.** In a git-initialized scratch vault, create
   `b.md` containing `[a](a.md)`, rename `a.md` from the menu: the
   confirm announces 1 link in 1 note; `git status` shows exactly the
   renamed file and `b.md`. Then run `await
   window.atomik.relocatePreview('b.md', 'c.md')` in DevTools — still
   clean: the preview writes nothing.
5. **Prove DnD has no second write path.** Grep `relocateApply` under
   `renderer/src/`: only `PaneTreePanel.tsx`'s move flow calls it —
   `NoteTree.tsx` merely reports drops.

## Vocabulary you now own

```text
test seam        injected effect point (TrashFn); prod = shell.trashItem
refactor         move a file AND update its references, one labeled op
inbound link     a link in another note that resolves to the moved file
preview gate     the computed change list shown before anything writes
rollback         undo applied writes + the rename on midway failure
bundle root      folder directly containing source.md (location-free)
contract file    source/index/extracted/transcript/reader.md in a bundle
input binding    a new gesture routed into an existing proven verb flow
pane chrome      UI owned by the pane (its tree), never by a tab
state migration  deriving the new persisted shape from the old at load
managed block    the marker-bounded Contents span a verb may rewrite;
                 everything outside it is yours, forever untouched
```

## What arrives next

- **S07 owner bench** closes the path on the live vault: a real rename
  with backlinks, a bundle moved as a unit, a dragged note, a trash
  recovery. Parked for it: hover-expand on drag-over, typed destination
  vs a picker tree, a diff modal once bedrock 20's link index exists.
- **CP-MVP-008 (proposed)** swaps the deterministic AI mock for real
  generation (Mistral Small first): note 06's contracts meet a live model.
- **Learning notes [12](./12-pdf-source-and-anchors.md),
  [13](./13-local-speech-and-ocr-seats.md), and
  [14](./14-web-source-tab-isolation-and-snapshots.md)** repay the rest
  of the same coverage debt — PDF, the speech/OCR seats, and the web
  source tab — backfilled in the same 2026-07-21 unit as this note.
