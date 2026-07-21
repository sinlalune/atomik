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
- [x] S03 Delete to trash end to end: `deleteNote`/`deleteFolder`
      verbs over `shell.trashItem` (never rmSync for user files),
      confirm dialogs that name the target (+ note count, bundle
      warning), bundle-as-unit rule enforced, open-tab missing state,
      fold-state cleanup; tests (round-trip with a fake-trash seam;
      tab param behavior).
      DONE 2026-07-16: file-manage.ts (TrashFn seam; failed trash
      SURFACES, never a silent hard delete). Bundle rule MAIN-side:
      any note whose folder directly holds source.md refuses
      individual deletion (source.md included) — bundle roots trash
      as ONE unit. Channels delete-note/delete-folder + preload +
      surface test + push. TreeMenu grows Delete note…/Delete
      folder… (hidden on the vault root); confirm from
      folderDeleteSummary (note count + bundle escalation, computed
      renderer-side from the loaded tree — no extra channel); the
      open note reset()s when deleted; fold state pruned. Pills
      (index/log) carry no delete — convention files leave with their
      folder. Deviation noted: "open-tab missing state" shipped as
      reset-in-initiating-view; OTHER panes still surface the
      existing humanized not-found message on next read (recorded as
      an S07 check item, not silently dropped). Tests 357→364/40.
      E2E PROVEN ON WSL: vaultWrite=ok+folder+trash — the file landed
      in ~/.local/share/Trash/files/ (the named WSL-trash risk closes
      with on-machine evidence). Typecheck/build/smoke green.
- [x] S04 The refactor verb: `relocateNote` (rename AND move share
      it) — inbound-link scan (relative-link resolution against the
      old path), preview payload (files + counts), atomic multi-file
      apply with rollback, targeted replacement only (byte-fidelity
      everywhere else), `notePath`/`treeOpen` tab-param rewrite;
      Rename… UI (inline editor + preview modal); bundle/convention
      guards live here; tests (links intact across folders, no
      unrelated byte changes, rollback on injected failure, params
      follow).
      DONE 2026-07-16: relocatePreview/relocateApply over ONE
      computeRelocate (preview writes NOTHING; apply = rename → link
      writes → rollback of both on midway failure). Inline links
      [t](x) / [t](<x>), schemes and #-only skipped, #hash preserved;
      the moved note's own outgoing links re-point EXCEPT on a
      same-folder rename (zero cosmetic bytes — 27 fidelity). Guards:
      convention files, bundle files, bundle-folder targets,
      collisions, same-path. Push note-relocated → relocateTabPaths
      in the workspace model (every pane follows; prefix form ready
      for S05 folder moves); dirty open editor blocks its own rename;
      Rename… in TreeMenu (prefilled). Preview surfaced as the
      confirm list (files + counts) — the diff modal deferred to 20's
      link-index work, recorded. treeOpen rewrite deferred to S05
      (folder moves are S05 scope). Known gaps recorded: reference-
      style/wikilinks not scanned (the app produces neither). Tests
      364→371/40 (relocate matrix incl. rollback via chmod).
      E2E PROVEN: rung → vaultWrite=…+reloc (preview counted the
      link; the citing note follows on disk).
      Typecheck/build/smoke green.
- [x] S05 Move to… (menu): folder picker over the same verb + preview;
      folder moves (recursive param + link handling); tests.
      DONE 2026-07-16: relocateFolderPreview/Apply — the refactor
      prefix-wide (inbound targets under the folder follow; riding
      notes re-emit outgoing links from their new home, sibling links
      keep their bytes; rollback restores both sides). BUNDLE ROOTS
      MOVE AS UNITS; folders inside a bundle, bundle targets, and
      self-nesting refuse. "Move to…" on notes AND folders (typed
      destination, '' = root; moveTargetRelPath gate + main
      re-validation); moves ALWAYS confirm (bigger gesture than
      rename). The note-relocated push now serves folders too:
      relocateTabPaths rewrites notePath AND treeOpen fold params
      across every pane. Deviation from the sketch: destination is
      TYPED, not a picker tree — recorded, revisit on owner feedback.
      Tests 371→378/40. E2E PROVEN: rung → vaultWrite=…+fmove (the
      pointing note follows a folder move on disk).
      Typecheck/build/smoke green.
- [x] S06 Drag-and-drop: native HTML5 drag on tree nodes, folder drop
      targets (hover-expand), drop → the S05 flow (preview included);
      keyboard path re-verified; tests where the DOM seam allows +
      smoke rung for the full chain.
      DONE 2026-07-16: notes and folder summaries drag (payload =
      TREE_DRAG_MIME JSON, parseTreeDrag validates); folder summaries
      + the tree background (= scope root) are drop targets with a
      .drop-target highlight; dropMoveTarget computes the destination
      (same-parent / own-subtree drops = no-ops) and the drop runs
      the EXACT Move flow — preview, confirm, verb, guards — never a
      shortcut. Keyboard path = the menu (kept). Deviations recorded:
      hover-EXPAND on drag-over not shipped (open the folder first or
      use Move to…; revisit on owner feedback); no DnD smoke rung —
      synthetic drag events can't carry a real gesture, helpers are
      unit-tested and the chain below the gesture is the proven S05
      flow, the gesture itself is an S07 owner-bench item. Tests
      378→380/40; typecheck/build/smoke green
      (vaultWrite=ok+folder+trash+reloc+fmove unchanged).
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
bench fixes : S06b white app (props typed, never destructured — the
              piped-gate lesson), S07a creation flashes (follow the
              notePath param only on real transitions —
              note-follow.ts, tested), S07b project tree missed
              creations (vaultFilesChanged subscription synced across
              all three hosts), S07c owner directive: the tree panel
              is PANE CHROME — pane grid reserves the active tab's
              tree column, tabstrip starts at its right, trees rise
              under the app header (screenshot-verified; dev-docs
              included; known edge: panes narrower than ~400px with
              no treeW param misalign by the minmax default),
              S07d owner directive: ONE tree panel PER PANE, typed by
              the pane (vault or project) — tabs are just views from
              that tree (notes → note tabs, source.md → source tabs),
              switching tabs (web included) never changes the panel,
              hide/show toggle at the panel's BOTTOM RIGHT. Pane state
              gains a validated `tree` map (migration derives it from
              the active tab, carrying tree/treeW/treeOpen); the three
              view-owned trees consolidate into PaneTreePanel (full
              S02–S06 verb set; SourcesTree deleted, ＋PDF moved to
              the panel bar); dirty-editor guards moved to the pane
              door (PaneNoteGuard bridge); deletes from the panel
              close the pane's tabs under the deleted path; the
              relocate push now also rewrites dossierPath/projectPath
              params (dossier tabs follow bundle moves — S05 gap) and
              the pane tree's scope + folds. Deviations recorded: web
              tab's native view paints over the show toggle (switch
              tabs to reach it); sources tree's sources/-scoping
              retired (full vault tree serves sources).
              Screenshot-verified: panel full height, tabs at its
              right, vault tree constant under a dev-docs tab,
              bottom-right toggle.
              S07e owner bench on S07d: TYPED CHOOSERS — a fresh split
              (or the root after its ✕) is UNTYPED and shows the New
              Pane chooser (Vault / Projects / Docs = the pane's
              standing tree type; Projects stays untyped until a real
              bundle opens); the (+) New tab chooser in a typed pane
              offers ONLY Note / Import / Web (note = a tab of the
              pane's kind; docs left the tab chooser — a docs tree is
              a pane TYPE now, the DevDocs tree lifted into
              PaneTreePanel and the view reduced to one rendered doc).
              ✕ Close pane in the tabstrip actions (non-root collapses
              with its tabs; the root empties and de-types). "Capture"
              became the IMPORT page — PDF import (the tree panel's
              ＋PDF button removed), the web route, phone capture QR,
              desktop recorder, one surface, same gates and inbox;
              view id stays 'capture' for saved layouts. Default
              layout is now ONE vault pane; #dev-docs builds a
              docs-typed pane; migration types active-dev-docs leaves
              'docs' and leaves empty panes untyped.
              S07e-b/c owner bench on the Import page: the web card
              IMPORTS — paste a URL, one click, importWebUrl loads the
              page in a HIDDEN guest (same partition/session gates,
              45 s timeout) and the existing importWebSource path
              lands the bundle; the dossier opens with the SNAPSHOT as
              its preview (webViewShowSnapshot: ephemeral isolated
              partition, path realpath-gated, navigation denied —
              evidence is static; SnapshotView mirrors WebView's
              geometry discipline). ＋two documented preload methods;
              pure gates (isSnapshotRelPath, snapshotWebPreferences,
              webImportUrl) tested. E2E: real-Wikipedia
              webUrlImport=ok + snapshotPreview=ok probes; the painted
              preview pixels stay an owner-bench item (capturePage
              cannot see native views).
              S07e-d/e (reconcile: landed same day, ledger lagged):
              rotate tools off web previews (!isWeb joins the guard);
              bundle delete-guard rescoped to CONTRACT files — ordinary
              notes in bundles delete/move normally (tests 405→407).
              S07f owner report (2026-07-20): caps lock + ctrl combos —
              ROOT-CAUSED OFF-APP: WSLg RDP lock-state sync defect,
              measured on the machine (one-way caps propagation,
              inverted base state imposed at focus-in, sync overrides
              XTEST; Ctrl chords PROVEN WORKING in a fresh instance —
              buffer duplicated via injected Ctrl+A/C/V). No app change;
              evidence + owner recovery (wsl --shutdown; in-app caps
              press realigns relative state) in
              sessions/2026-07-20-wslg-capslock-probe.md.
              S07g owner directive (2026-07-20): note content CENTERED
              horizontally — margin-inline:auto on the two
              --note-column consumers (.markdown-body, live
              .cm-content); read <-> live keep identical geometry by
              construction; source mode stays IDE-left (recorded).
              Screenshot-verified on the live layout (column centered
              in a 963px pane, balanced margins).
              S07h owner directive + clarification (2026-07-20): the @
              menu opens beyond sources — note-link entries join
              (linkableNotesOf: bundle CONTRACT files excluded, the
              S07e-e rule; edited note excluded), ordered by INVERSE
              tree hierarchy (current folder first, then up to the
              root); row format = kind pill (note/source, completion
              icon slot) + doc title (displayLabel) + action label
              (detail); selected-row action label made readable
              (inherit over muted — the "barely viewable" report).
              Deviation recorded: pill rendering + menu feel = owner
              bench (unit tests cover order/format/exclusions; the
              gesture itself is not exercisable from the node suite).
              S07h-b (owner screenshot, same day): the pill painted
              OVER the title — CM's injected `.ͼ… .cm-completionIcon
              {width:.8em}` outranked the bare class; selector now
              rides .cm-tooltip.cm-tooltip-autocomplete. Selected
              pill keeps dark text (var(--fg)) on its light chip —
              inherit vanished into it. Screenshot also CONFIRMS the
              S07h contrast half (detail readable on the blue row)
              and note-first proximity order on the real vault.
              S07i owner bench directive (2026-07-21): tab design —
              professional/modern continuity; active = the pane's
              DISPLAYED tab, not the last-clicked one. Root cause:
              the surface-fused treatment was gated on .pane.focused
              (other panes' displayed tabs stayed chrome pills) and
              the strip's border-bottom ran UNDER the active tab,
              cutting it from its content. CSS-only redesign: the
              separator became an ::after LAYER the active tab sits
              on and BREAKS; the displayed tab of EVERY pane is a
              connected tab (surface bg, top-rounded, 1px outline
              opening into the pane below); pane focus keeps the
              accent top line as its own signal; inactive tabs are
              quiet full-height segments with a hover pill; + button
              recentred; the :root two-surface doctrine comment
              updated. Screenshot-verified: tab fused with content,
              line broken beneath it, resuming at its right.
              S07j owner bench report (2026-07-21): "anything visual
              is laggy vs Obsidian, 240 Hz monitor". Attributed
              against the 07-15 perf audit (addendum written): window
              moves/global feel = the measured WSLg software-GL tax
              (Obsidian compares from native Windows; no code here
              ever sees 240 Hz on WSLg — packaged native build is the
              honest test); pane/tree RESIZE had the real app half
              (audit RS2): drags dispatched a full workspace render
              per EVENT while software frames lagged. Fix = audit
              action 6's drag half: frameCoalesced (scheduler-seam
              helper, 5 tests) — split-divider drag measures and
              dispatches once per painted frame; tree-width drag
              likewise; WebView bounds reporting dedupes already and
              follows render rate. Deferred levers recorded (CSS-var
              drag preview, RS1 memoization, RS3 caches).
              S07k owner decisions (2026-07-21, bench Q&A): option D
              REVISED to FULL conventions + deterministic sync —
              "index and log automatically updated, deterministically
              after manual file mgmt or later by agent". Revision
              recorded in the 07-16 decisions addendum; doctrine in
              04 §Vault and folder conventions. folder-index.ts:
              every folder = index.md + log.md (createFolder born
              with both; adoption on first op elsewhere); vault ROOT
              seeded ONCE at the explicit openVault dialog
              (adoptVaultRoot — launch restore never writes); managed
              Contents block between <!-- atomik:contents --> markers
              (owner text never touched, unchanged bytes write
              nothing, folders-first + bundles-as-unit + notes);
              one dated log line per verb, both parents on a
              cross-folder move; nested createNote records every
              materialized folder innermost-first so parent links
              resolve; ensure-style createProject records only when
              NEW; relocate/delete record POST-success (rollback =
              zero bookkeeping). Sync lives IN the main verbs — tree
              UI, DnD, and future AI file management produce
              identical records; import landings keep dossier
              conventions. The relocate scanner now counts parent-
              index Contents links (rung asserts totalLinks 2 and
              the re-derived index lists the new name). Docs: 04,
              module note, learning note 15, addendum revision.
              S07l owner screenshot on S07i: "more curve on the
              attachment" + "the header of the page is a different
              color". Curved SHOULDERS added (radial-gradient pseudo
              squares outside the active tab: strip through the arc,
              border ring, surface fill; radius 7→9px; scroller gains
              shoulder padding so the first tab never clips) and the
              content column's header bars now wear the SURFACE
              (.note-bar, .web-nav — the fused tab lands on its own
              color; two-surface doctrine comment updated). Same-role
              parity begun on the named example: .web-nav adopts
              --bar-h + note-bar rhythm (input compacted to fit).
              Screenshot-verified: shoulders arc into the surface,
              border rings the curve. UI AUDIT run (two parallel
              inspectors: styles.css scales/alignment/parity; markup
              icon-vs-text/a11y/divergences) — reports in scratchpad
              audit-styles.md / audit-markup.md (~95 + ~80 findings).
              S07m executed the correctness/parity wave from both:
              17 SVG icons added to icons.tsx (house grid) and EVERY
              chrome glyph swapped (× ✕ + ◫ ⬓ ‹ › ⟲ ⟳ ⚓ ● ■ ↗ Aa →
              Close/Plus/Split/Arrow/Chevron/Reload/Rotate/Anchor/
              Record/Stop/Reader/ExternalLink icons) with aria-labels
              riding along; shared <HistoryNav> replaces three
              identical ‹ › pairs; THE scoping bug fixed
              (.note-bar-button was styled only under
              .note-bar-actions — 18 buttons across web/pdf/nav/
              source bars rendered as raw UA buttons); the vestigial
              2.6rem .no-tree note-bar indent DELETED (every note bar
              sat indented vs the web bar since S07d); ~120 lines of
              dead CSS removed (.theme-picker, .ai-settings*,
              .tree-show); bar parity finished (.pdf-nav de-centered
              onto --bar-h/surface/gutter, .ai-panel-bar +
              .editor-conflict on --bar-h, .web-source-bar surfaced);
              semantic tokens (--error/-bg, --warn-fg/bg/border,
              --ok-*, --info-*) replace 20+ drifted literals incl.
              the flat #c0392b unreadable on dark; alignment
              micro-pass (baseline→center rows, symmetric paddings,
              tree folder/note rows on one left edge, + on the tab
              text line, code-bg-on-code-bg input, three focus
              regimes → accent outline); French labels translated;
              12 unnamed inputs given aria-labels; tab tooltips carry
              notePath/dossierPath; meter role on the record level.
              432/43 green, build/smoke green, screenshot-verified.
              S07n SHIPPED (same day): bedrock 36 (the design system
              — identity from the owner interview, token vocabulary,
              component rules, glass budget, a11y floors, the
              automatic contract) + AGENTS.md line ("UI work obeys
              36"); tokens LIVE in :root (--fs/-space/-radius scales,
              --control-h, --gutter, --tab-r, z-tiers, --shadow-pop,
              --glass-chrome/-pop) and applied (all five bars on
              space-1/gutter, three in-bar control kinds on one
              --control-h box, tab geometry on --tab-r, z sites on
              tiers); the FOUR organic-future themes (sage-stone,
              eucalyptus light; moss, biolum dark — ladder-checked)
              join THEMES with legacy pastels kept for a bench prune;
              glass live: body accent wash, alpha chrome tints
              (header/tabstrip/tree — no backdrop-filter, the WSLg
              budget), frosted overlays (app menu, tree menu) with
              @supports + prefers-reduced-transparency fallbacks;
              learning note 16 (first-use rule honored same day) +
              index; CP-MVP-008 coverage gains 36 as Required
              (completeness now 00–36). 432/43 green, build/smoke
              green (dev-docs corpus auto-grew to 93 files = 36
              served in-app), screenshot-verified. Remaining
              consolidation feed (unchanged, for a later unit):
              shared .pill/.btn/.input/.popover classes,
              NoteBar/InlineCreateForm/ConfirmDialog extractions,
              editor-bar nav parity, TreeMenu overlay-guard
              registration, full literal→token migration.
              S07o owner bench on S07n ("no translucid effect
              nowhere; most buttons still text — I need icons with
              label in hover; icons/buttons still not centered"):
              all three verdicts held up. (1) GLASS made visible:
              tints deepened 88→72% chrome / 82→66% pops, blur 18px,
              body wash doubled (two accent blobs 14%/9%), 1px
              --glass-edge inset highlight on header/tree/popovers —
              root cause: 88% alpha over a 6% wash ≈ invisible, and
              frosting a popover over a SAME-color surface shows
              nothing; 36 §glass revised (values + contrast-recheck
              rule). (2) ICON-FIRST enforced (36 §buttons rewritten):
              13 content-verb icons added (Sparkle/Save/Autosave/
              Book/Pen/Code/Trash/ScanText/Mic/Cloud/Image/Import/
              Play); AI · auto · Save · View original · the
              read/live/source segmented control · every source-
              dossier verb (extract/delete/transcribe/cloud/view) ·
              web Import · AI Run/Accept/Reject now carry icons with
              the label in the hover title + aria-label; morphing
              busy labels gone (disabled signals busy). (3) CENTERING
              root-caused: the button families hosting the new SVGs
              were never flex boxes — icons rode the text baseline;
              fixed structurally (`button svg { display: block }`
              global + one centered-flex rule over every chrome
              button family). 432/43 green, build/smoke green,
              screenshot: the wash visibly bleeds through the tree
              glass. Final feel (hovers, tooltips, themes) = owner
              bench.
tests       : 432 passing / 43 suites — S07j added frame-coalesce (5),
              S07k added folder-index (17: block matrix, adoption
              idempotence, no-cosmetic-writes, verb round-trips incl.
              nested-create chain); e2e rung re-proven on a scratch
              vault: vaultWrite=ok+folder+trash+reloc+fmove with the
              NEW conventions (living Contents, dated log lines, OS
              trash real). Earlier: 411/41 after the bench fixes
              (S07h: note links, proximity order, pill row format,
              contract-file exclusions; S07e-e: 407)
              — earlier detail: 405/41 after the S07d/e wave
              (S07d pane-tree matrix + S07e: docs scope, closePane,
              chooser-morph params, untyped splits, docs migration +
              S07e-c snapshot gates); typecheck/build/smoke green; e2e
              vaultWrite=ok+folder+trash+reloc+fmove re-proven on the
              S07e layout (OS trash real on WSL; rename AND
              folder-move refactors update citing notes on disk);
              real-app launches (fresh default AND restored-legacy
              migration paths) = zero Uncaught; docs-pane layout
              screenshot-verified (docs tree as pane chrome, ✕ in the
              tabstrip, bottom-right toggle); direct URL import proven
              on live Wikipedia (bundle + non-empty snapshot on disk).
              S01 done 2026-07-16 (same session as acceptance):
              doctrine pinned (04/27/20/13 — see step), decisions
              addendum in brainstorm/2026-07-16-tree-file-management-
              decisions.md, bundle-guard rule = source.md marker
              (location-independent).
              S02 done 2026-07-16 (see step): createFolder D end to
              end, creating handlers push vaultFilesChanged, TreeMenu
              on all three trees (creation half).
next action : S07 — acceptance: 18 §M1 intents (one op = one
              understandable diff; no rewrite-on-open) + the four
              owner decisions, OWNER BENCH on the live vault: a real
              folder created from the menu, a real rename with
              backlinks (check the preview), a bundle moved as a
              unit, a note dragged between folders, a delete
              recovered from the OS trash. S06 bench extras: DnD
              gesture feel, hover-expand need, typed-destination vs
              picker. S07f-h bench extras: @ pill row look/feel +
              proximity order on the real vault; centered column
              feel; caps-lock recovery awareness (wsl --shutdown —
              parity was left MISMATCHED on 2026-07-20, X-side caps
              stuck ON). S07i bench extra: connected-tab look across
              a real SPLIT — the unfocused pane's displayed tab must
              read active (connected, no accent line). S07j bench
              extra: divider/tree drag feel (app half fixed; the
              WSLg software-raster tax remains until a packaged
              native build). S07k bench extras: living conventions on
              the REAL vault (create/rename/move/delete and watch the
              parent index Contents + log follow; hand-edit an index
              outside the markers and verify it survives ops); NOTE —
              the real vault root seeds index/log at the NEXT
              explicit open-vault dialog, not before.
blockers    : none recorded.
```

# Blockers

- None recorded. (CP-MVP-006 closed 2026-07-16 before activation —
  the one-active-parent-path rule held.)
