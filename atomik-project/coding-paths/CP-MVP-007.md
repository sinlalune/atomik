---
type: Atomik Coding Path
title: Tree file management — create, rename, move, delete as first-class vault verbs (M1 friction pass)
description: The vault tree grows real file management — new folder (index.md convention), trash delete, rename/move as the 27-sanctioned backlink refactor with preview, drag-and-drop — every op a typed main verb, open tabs follow, bundles guarded.
tags: [coding-path, m1, vault, tree, file-management, rename, refactor, dnd, trash]
timestamp: 2026-07-16T00:00:00Z
atomik:
  id: CP-MVP-007
  status: active
  accepted: 2026-07-16
  current_step: S01
  base_commit: 9de5f01
---

# Goal

M1 friction pass (18 §M1 "file tree" + the experiential gate's
friction-driven prioritization): today the tree panel only
collapses/expands and opens on click — creation hides behind the
slash-path trick in the new-note field, and rename/move/delete do not
exist anywhere (no verbs, no channels, no UI, surveyed 2026-07-16).
This path makes the vault tree a place where files are MANAGED, not
just browsed, without breaking the file-first discipline that makes
the vault git-friendly and owner-owned.

Owner directive at proposal (2026-07-16, dogfooding session): "on peut
faire une passe de file management dans le tree panel — aujourd'hui on
ne peut que collapse/expand et ouvrir en cliquant." Four scoping
decisions taken by the owner the same day (recorded verbatim in the
brainstorm addendum, 17 §documentation loop):

1. **New folder = option D** — a folder is born WITH an `index.md` by
   convention (the project-bundle pattern generalized). Deviation from
   the 2026-07-06 brainstorm's leaning (B, pending-UI folder) — the
   owner now prefers the materialized map file. Dividend: a new folder
   is never empty, so `listVaultFiles`' prune-empty invariant stands.
2. **Delete = OS trash** (`shell.trashItem`) after confirmation —
   recoverable outside the app; hard `rmSync` stays reserved for
   derived files (existing pattern).
3. **Rename = the 27-sanctioned refactor**: renaming updates inbound
   links in the same atomic, labeled, previewed operation — never
   silent, never mixed with content edits (27 §rename refactor diffs,
   20 §rename and link integrity).
4. **Move + drag-and-drop INCLUDED** — overriding the 2026-07-06
   brainstorm's post-MVP fence, BECAUSE move reuses the rename
   machinery; the path sequences the machinery first (S04) and the
   DnD input layer last (S06).

# Definition of done

- **Context menu on tree nodes** (notes AND folders, all three trees:
  vault, project, sources): New note here, New folder…, Rename…,
  Move to…, Delete… — discoverable, keyboard-reachable, no new
  dependency (hand-rolled menu; DnD via native HTML5 drag events).
- **New folder (D)**: creates `<folder>/index.md` through a typed main
  verb (wx, path-validated like `resolveProjectDirPath`), tree
  refreshes via the `vaultFilesChanged` push (not caller-only), the
  index opens on create. Slash-path creation in the note field keeps
  working.
- **Delete to trash**: notes and folders go to the OS trash after an
  explicit confirm that names what is being deleted (note count for
  folders). Source bundles delete as a UNIT (the whole
  `sources/<kind>/<slug>/` folder — evidence + derived together, the
  ship-the-lifecycle rule) with a strengthened warning. Open tabs on
  deleted files show a friendly missing state, never a raw IPC error;
  a save into a deleted file still surfaces the existing conflict
  message.
- **Rename/move = one refactor verb** (`relocateNote`, shared): scans
  the vault for inbound links (markdown relative links resolving to
  the old path; the scan is a rebuildable diagnostic, 20), shows a
  PREVIEW (every file to be touched, per-file link counts) before
  anything is written, then applies atomically with rollback on
  partial failure — one operation = one labeled, reviewable diff (04
  §rule, 27 §required write constraints). No silent auto-repair: the
  preview IS the acceptance gate. Renames never rewrite unrelated
  bytes of touched notes (targeted link replacement only).
- **Open tabs follow**: rename/move rewrites `notePath`/`treeOpen` tab
  params so open tabs and fold state survive (the CP-MVP-003 S07
  lesson — recoverable UI state ships WITH the feature); tab labels
  update.
- **Bundle guards**: inside a source bundle (`sources/*/<slug>/`),
  rename/move of individual files is DISABLED (dossier ↔ derived ↔
  evidence relative links are bundle-internal contracts); the bundle
  root itself renames/moves as a unit through the same refactor verb.
  Vault-root conventions (`index.md`, `log.md` pills) rename-guarded
  the same way.
- **DnD move**: dragging a note/folder onto a folder triggers the SAME
  Move flow (preview included) — DnD is an input binding over the
  proven verb, nothing more. Menu "Move to…" remains the keyboard
  path.
- Every new channel obeys 13 §IPC (typed, validated main-side,
  preload surface test extended in the same change); no new heavy
  dependency (if one becomes tempting, a dated 15 decision FIRST);
  tests round-trip every op (create→delete, rename→links intact,
  move→tabs follow) per the standing lifecycle rule;
  tests/typecheck/build/smoke green per unit; module notes + ledger +
  log.md in the same work unit as EVERY step.

# Documentation coverage

Completeness rule (35): every bedrock page 00–35 accounted for.

## Required

- `docs/bedrock/00_00-orientation.md`
- `docs/bedrock/01_01-workbench-first.md` (tree ops are daily-use
  gestures; menus/DnD must not tax the workbench feel)
- `docs/bedrock/03_03-workspace-tabs.md` (tab params follow renames;
  pane/workspace state stays disposable)
- `docs/bedrock/04_04-file-first-model.md` (THE page — one op, one
  reviewable diff; no rewrite-on-open)
- `docs/bedrock/12_12-electron-mvp.md` (view/service boundaries)
- `docs/bedrock/13_13-electron-security.md` §IPC (five-plus new
  channels; re-read before S02)
- `docs/bedrock/14_14-app-kernels.md` (vault-core owns the verbs)
- `docs/bedrock/17_17-self-evolving-docs.md` (brainstorm addendum +
  decision recording)
- `docs/bedrock/18_18-roadmap.md` §M1 + §Continuous constraints
- `docs/bedrock/20_20-relations-future.md` §Rename and link integrity
  (the refactor discipline this path implements early)
- `docs/bedrock/22_22-agent-handoff.md`
- `docs/bedrock/27_27-git-compatibility.md` §Required write
  constraints + §Rename refactor diffs (THE constraint pages)
- `docs/bedrock/35_35-coding-path-execution-state.md`
- `docs/agents/agent_documentation_contract.md`

## Conditional

- `docs/bedrock/11_11-markdown-page-model.md` — if the new-folder
  `index.md` shape raises questions beyond the project convention.
- `docs/bedrock/15_15-maintainability.md` — if any dependency (menu,
  DnD, trash) is considered; the default is zero new deps.
- `docs/bedrock/24_24-doc-templates.md` — before new module notes.
- `docs/bedrock/02_02-learning-loop.md` — if delete/rename interacts
  with correction-state flips unexpectedly.
- `docs/bedrock/07_07-source-adapters.md` /
  `docs/bedrock/08_08-capture-source.md` — if bundle guards surface
  adapter questions (bundle-internal link contracts).

## Deliberately excluded

- `05_05-resource-selection-model.md`, `06_06-ai-patch-pipeline.md`,
  `26_26-okf-agent-context.md`, `28_28-truth-evidence-model.md`,
  `29_29-verification-grounding-router.md`, `31_31-truth-lens-ux.md`,
  `32_32-truth-investigation-record.md`,
  `33_33-retrieval-local-execution-cost.md` — no AI, no claims, no
  traces in this path (mechanical refactors are not AI operations).
- `09_09-web-source-tab.md`, `10_10-pdf-source-tab.md`,
  `16_16-dev-docs-tab.md` — shipped source views; only their bundle
  GUARDS matter here (covered by 04/07 conditional).
- `19_19-dsl-future.md`, `21_21-canvas-future.md`,
  `30_30-public-knowledge-dictionary.md`,
  `34_34-local-execution-investigation-record.md` — later milestones.
- `23_23-references.md` — ad hoc. `25_25-use-cases.md` — narrative.
- Tab drag-between-panes (03 §pane operations) — workspace-core work,
  NOT this path (the brainstorm's DnD feature #1); OS-file drop
  import (feature #3) — source-adapter work, not tree management.

# Execution

- [x] S01 Bootstrap (22): reconcile ledger vs repo; record
      `base_commit`; read 04 + 27 + 20 §rename + 03 §persistence +
      13 §IPC in full; write the brainstorm ADDENDUM recording the
      owner's four 2026-07-16 decisions (incl. the B→D and
      DnD-included deviations, 17); pin the bundle-guard inventory
      (which paths are bundle-internal, which roots move as units).
      DONE 2026-07-16: base_commit 9de5f01 (348/38 verified at S06b
      close, same session); addendum written as a SIBLING note
      (brainstorm/2026-07-16-tree-file-management-decisions.md — the
      06-07 original carries live owner edits; editing it would block
      the owner's next merge). Pins from the reads: 04 — one op, one
      meaningful reviewable diff; deleting containers must never
      delete user notes; 27 — no mass rewrites, targeted link
      replacement only, rename+backlinks = sanctioned atomic labeled
      refactor NEVER mixed with content edits; 20 — broken-link
      detection is a diagnostic, never silent auto-repair (the
      PREVIEW is the acceptance gate); 13 §IPC — explicit narrow
      channels, model output never chooses filesystem paths, every
      new channel documented with trust boundary + tests. KEY
      INVENTORY FINDING: the bundle-root marker is "folder directly
      containing source.md" — location-independent (capture bundles
      land at user-chosen paths), so guards key on the marker, not a
      sources/ prefix. Full inventory in the addendum note.
- [x] S02 Folder creation (D) end to end: `createFolder` verb +
      channel (path-validated, wx index.md, project-convention body),
      `vaultFilesChanged` push lands on ALL trees (fixing the
      caller-only refresh gap for plain creations too), context-menu
      skeleton on tree nodes with New note here / New folder…; tests
      (round-trip: create → visible → index opens; traversal guards).
      DONE 2026-07-16: createFolder in project.ts (resolveProjectDirPath
      gate, mkdir + wx index.md "Atomik Folder Index", YAML-quoted
      title from the segment; adopts an index-less folder, refuses an
      existing index). Channel atomik:create-folder + preload +
      surface test; createNote/createFolder/createProject handlers now
      PUSH vaultFilesChanged (the stale-other-trees gap closed).
      TreeMenu popup (hand-rolled, zero deps) on ALL THREE trees:
      right-click/Shift+F10 on folder nodes AND the background (=
      scope root); action → name input in place; renderer pre-check
      childRelPath (one dot-free segment), main validators stay the
      gate; errors render inside the popup; the created folder opens
      its index and joins the fold state. Tests 348→357/39.
      E2E PROVEN: vault-write rung extended → vaultWrite=ok+folder on
      the real app (channel → mkdir+index → readNote round trip).
      Typecheck/build/smoke green.
- [ ] S03 Delete to trash end to end: `deleteNote`/`deleteFolder`
      verbs over `shell.trashItem` (never rmSync for user files),
      confirm dialogs that name the target (+ note count, bundle
      warning), bundle-as-unit rule enforced, open-tab missing state,
      fold-state cleanup; tests (round-trip with a fake-trash seam;
      tab param behavior).
- [ ] S04 The refactor verb: `relocateNote` (rename AND move share
      it) — inbound-link scan (relative-link resolution against the
      old path), preview payload (files + counts), atomic multi-file
      apply with rollback, targeted replacement only (byte-fidelity
      everywhere else), `notePath`/`treeOpen` tab-param rewrite;
      Rename… UI (inline editor + preview modal); bundle/convention
      guards live here; tests (links intact across folders, no
      unrelated byte changes, rollback on injected failure, params
      follow).
- [ ] S05 Move to… (menu): folder picker over the same verb + preview;
      folder moves (recursive param + link handling); tests.
- [ ] S06 Drag-and-drop: native HTML5 drag on tree nodes, folder drop
      targets (hover-expand), drop → the S05 flow (preview included);
      keyboard path re-verified; tests where the DOM seam allows +
      smoke rung for the full chain.
- [ ] S07 Acceptance: run against 18 §M1 acceptance intents (one op =
      one understandable diff; no rewrite-on-open) + the four owner
      decisions; owner validation on the live vault (their real
      folders, a real rename with backlinks, a real bundle move);
      review and close.

# Current checkpoint

```text
base commit : 9de5f01
changed     : path PROPOSED and ACCEPTED 2026-07-16 (owner:
              "j'accepte le chemin CP-MVP-007", same message that
              closed CP-MVP-006); four scoping decisions taken by the
              owner same day (D folders, OS trash,
              rename=refactor+preview, move+DnD in). Survey recorded:
              zero existing rename/move/delete verbs or UI; no
              watcher; push-refresh only after main-side landings.
tests       : 357 passing / 39 suites — green at S02 close;
              typecheck/build/smoke green; e2e vaultWrite=ok+folder.
              S01 done 2026-07-16 (same session as acceptance):
              doctrine pinned (04/27/20/13 — see step), decisions
              addendum in brainstorm/2026-07-16-tree-file-management-
              decisions.md, bundle-guard rule = source.md marker
              (location-independent).
              S02 done 2026-07-16 (see step): createFolder D end to
              end, creating handlers push vaultFilesChanged, TreeMenu
              on all three trees (creation half).
next action : S03 — delete to trash end to end: deleteNote/
              deleteFolder over shell.trashItem (never rmSync for
              user files), confirm names the target (+ note count,
              bundle warning), bundle-as-unit rule, open-tab missing
              state, fold cleanup; tests with a fake-trash seam.
blockers    : none recorded.
```

# Blockers

- None recorded. (CP-MVP-006 closed 2026-07-16 before activation —
  the one-active-parent-path rule held.)
