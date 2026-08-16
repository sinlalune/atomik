---
type: Atomik Module Note
title: 'Module: atomik-desktop — vault and files'
description: Vault IO, lexical search, project bundles, the note trees and their fold state, and link-click routing.
tags: [module, vault, files, search, projects, tree]
timestamp: 2026-08-14T00:00:00Z
---

# Module: atomik-desktop — vault and files

> AREA NOTE of [Module: atomik-desktop](./atomik-desktop.md), split out at
> CP-OPS-001 S02 so concurrent lanes append to different files instead of
> colliding in one 1689-line note. The root note keeps what is cross-cutting
> (public contracts, data flow, alternatives, common mistakes, tests, agent
> checklist, dependency facts); this note keeps what THIS AREA owns.

## What it owns

- Vault IO (04/27, S05): `electron-main/vault.ts` (incubating vault-core,
  14) — tree listing (dot-dirs, `.git`, `.atomik`, `node_modules` skipped;
  symlinks not followed), validated vault-relative `.md` paths, byte-exact
  atomic writes, edit vs exclusive-create (`wx`) semantics, no code path
  writes on open. Last vault remembered in `.atomik/local-settings.json`,
  written by main only (no channel). `ATOMIK_VAULT_DIR` overrides for
  tests/smoke/dev.
- Lexical search (M1/S11 + MVP-001 feedback): `electron-main/search.ts` —
  case-insensitive scan over filenames/headings/body lines (kinds +
  1-based line numbers + capped excerpts), same denylist as the tree,
  hard caps (query 200, 6 matches/file, 100 files, 10 MB/file). No
  embeddings, no index by design (01/18); ripgrep/FTS5 replace the scan
  at M8 behind the same channels. Perimeters: whole vault, one project
  bundle (`search-vault` optional `scope` folder — `resolveSearchScope`
  rejects traversal/absolute/hidden/denied; a missing folder reads as
  empty), and the docs bundle (`search-dev-docs`, same scan bound to
  docsRoot). UI: every tree panel (vault / project / dev docs) has the
  debounced search box (`useTreeSearch` + `SearchResultsList` shared);
  results replace the tree; Esc clears.
- Link-click routing S04b (owner reports, same day): the shared
  note-link handler (`useVaultNote`) kills three dead-click classes —
  external http(s) links open a WEB TAB (`onOpenWebUrl`, threaded from
  Workspace to VaultView/ProjectView/SourceImageView); `.mhtml`
  snapshots open EXTERNALLY (openSourceExternally; `.mhtml` joined the
  asset allowlist for it); image/audio ORIGINALS route to the source
  view of their bundle exactly like PDFs since S06e
  (`isMediaFilePath`) — every dossier's "Original photo/audio" link
  was equally dead. mailto stays inert; no in-place navigation ever.
- Project bundles (04, S06): `electron-main/project.ts` (incubating
  project-core, 14) — manifest-detected bundles
  (`project.atomik-project.json`; scan skips denied dirs and does not
  descend into projects), `createProject` as idempotent ENSURE (creates
  only missing manifest/index.md/log.md, `wx`; adoption never touches
  existing files; manifest identity wins on re-create). Deviation from
  04's example recorded: no `root` field in the manifest (derivable,
  staleness-prone). ProjectView scopes the existing vault tree via the
  pure `findSubtree` helper — reads stay on vault channels.
- Tree fold state (owner request): every tree — vault, project, dev
  docs — opens COLLAPSED by default, and the open set is CONTROLLED and
  remembered per tab (`treeOpen` param, JSON array clamped under the
  param cap; `vault/tree-fold.ts` pure: parse/serialize/toggle/
  allFolderPaths). Expand/collapse-all buttons set the whole set; the
  toggle handler is identity-stable so the details mount event never
  churns the workspace file.
- The note trees (MVP-001 feedback): `renderer/src/vault/NoteTree.tsx` —
  ONE recursive tree for the vault and project panels (extracted from
  their twins). Any folder holding the 04 convention files shows
  [index] [log] pills on its top row and hides those files from its list
  until the row's right-docked eye reveals them; per-folder disposable
  state, `splitPillNotes` (scope.ts) is the pure tested seam. The old
  project-shortcuts row is subsumed. Dev Docs keeps its grouped list:
  the pills express the bundle convention, which the docs corpus does
  not follow.

## One tree panel per pane (CP-MVP-007 S07d, owner directive)

- The tree panel is PANE state, not tab state: each leaf pane carries an
  optional `tree` string map (same validation as tab params, main-side
  `workspace-state.ts`) — `kind` = 'vault' (default) | 'project',
  `projectPath`/`projectTitle` for the project scope, `off`/`w`/`open`
  as panel preferences. Tabs are just VIEWS served from that tree
  (notes → note tabs, `source.md` → source tabs); switching tabs — web
  included — never changes the panel. The web view stays "free": no
  tree relationship, but the pane panel remains beside it.
- `workspace/PaneTreePanel.tsx` consolidates the three former view-owned
  trees (VaultView / ProjectView / SourcesTree, the last deleted): one
  panel per pane hosting the FULL S02–S06 verb set (create note/folder,
  rename/move behind the preview, delete-to-trash, DnD over the Move
  flow, scoped search, ＋PDF import). The bar and inputs stay put; only
  the tree list scrolls; the hide toggle is pinned BOTTOM RIGHT of the
  panel (owner directive), and the show toggle floats bottom left of
  the content when hidden. Known edge: an active web tab's native view
  paints over the show toggle — switch tabs to reach it.
- Routing (Workspace.tsx): a tree click updates the ACTIVE tab's
  `notePath`/`dossierPath` param when it is a matching view (the views
  follow their params — the S07a `noteFollowTarget` discipline), else
  opens a new tab of the pane's kind. Opening a project in a Project
  tab TYPES the pane (`setPaneTreeScope`); the project tree bar carries
  a switch-back-to-vault button; a missing project folder falls back to
  rendering the vault tree.
- The dirty-editor guards moved to the pane door: note views register a
  `PaneNoteGuard` (`dirtyPath()`, refs under a stable callback) — the
  panel confirms manual-mode navigation and refuses rename/move/delete
  of the dirty note, same messages as before.
- Deletes initiated from a pane's tree CLOSE that pane's tabs under the
  deleted path (`closeTabsWithin` — never web tabs, so no native view
  is orphaned); other panes keep the S03 humanized not-found. Renames/
  moves keep flowing through the `note-relocated` push, which now also
  rewrites `dossierPath`/`projectPath` tab params (dossier tabs did not
  follow bundle moves before) and the pane tree's scope + fold state.
- Migration (`migratePaneTrees`, load-time like `migrateRetiredViews`):
  pre-S07d leaves derive their tree from the ACTIVE tab — a project tab
  types the pane; the tab's `tree`/`treeW`/`treeOpen` params carry over
  as `off`/`w`/`open`, so saved widths and fold state survive. The
  per-tab params stay only for Dev Docs, whose docs tree browses the
  APP corpus, not the vault — it keeps its own in-content tree below
  the tabstrip.
- Layout: `.pane` grid unchanged [tree col | tabstrip/content], but the
  column now comes from the PANE tree state; `.pane-tree` is a real
  grid child spanning both rows (the S07c negative-margin pull-up is
  retired); `.pane-content` sits at (row 2, col 2) without the
  padding-top hack.

## Quick untitled notes (CP-FEEDBACK S03)

- A quick note is an ordinary vault Markdown file from birth, never a
  path-less editor or hidden record. The note-add tabstrip action and
  `Mod+N` create an explicit empty string through the existing exclusive
  `createNote` verb. Placement is deterministic: active note parent, then
  current project root, then vault root. Source dossiers are excluded so a
  thought cannot accidentally become a source-bundle contract file.
- `workspace/quick-note.ts` owns the pure naming policy: case-insensitive
  collision scans choose `Untitled.md`, `Untitled 2.md`, …; the first H1
  outside fenced code yields a portable sanitized title, with collision and
  Windows/convention-name guards. Tests cover nested trees, lower headings,
  fences, collisions, and a real blank-create → save → relocate round trip.
- Pending auto-naming is recoverable tab state (`quick: '1'`), not note
  metadata. After a successful save, `VaultView`/`ProjectView` report the
  content to Workspace, which runs `relocatePreview` then the ordinary atomic
  `relocateApply`; the relocation push updates every open tab. The folder's
  one managed `index.md` link is expected and follows without a modal. Any
  additional backlink still requires confirmation. Success, same-name H1, or
  decline clears the flag, so later title edits never create a rename loop.
