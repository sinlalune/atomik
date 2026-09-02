---
type: Atomik Module Note
title: 'Module: atomik-desktop'
description: Electron desktop shell — the secure main/preload/renderer split every later feature builds on.
tags: [module, electron, security, shell]
timestamp: 2026-07-06T00:00:00Z
---

# Module: atomik-desktop

> Learning layer: [Learning: the Electron shell, from zero](../learning/01-electron-shell-from-zero.md)
> teaches the technologies, concepts, and methodology behind this module for
> someone who did not build it. This note states the contracts.

## Area notes

This module was ONE 1689-line note until CP-OPS-001 S02. Bedrock 22 step 9
obliges every executed step to update the module note in the same work unit,
which made this file a guaranteed merge conflict for every concurrent lane.
It is now an index over per-area notes plus the cross-cutting contracts below.

```text
area note   what an AREA owns        — the path touching that area appends here
root note   cross-cutting contracts  — any path appends here
```

> Wording repaired 2026-08-24 (CP-OPS-002 S05, found while indexing this
> directory). It said "a lane appends here / the integrator appends here"; ADR-012
> removed both the lane layer and the integrator, so the sentence described a
> structure that no longer exists. The directory map is
> [index.md](./index.md).

| area | covers |
|---|---|
| [shell](./atomik-desktop-shell.md) | Electron shell, window and security posture, the IPC contract surface, the workspace pane tree, the Dev Docs tab and the smoke hook. |
| [vault and files](./atomik-desktop-vault.md) | Vault IO, lexical search, project bundles, the note trees and their fold state, and link-click routing. |
| [AI, traces and truth](./atomik-desktop-ai.md) | The AI patch loop and its real engines, the chat pane, the ActionTrace ledger, mechanical truth labels and URL provenance. |
| [editor](./atomik-desktop-editor.md) | The CodeMirror editor pane, optimistic saves and live preview. |
| [sources](./atomik-desktop-sources.md) | Capture, image, transcription and OCR seats, PDF import/viewer/anchors, and the web tab, reader and import. |
| [semantic graph](./atomik-desktop-graph.md) | The nodes/edges index consumers: the relations strip, note titles as the graph reads them, and source bundles as graph nodes. |

## Why it exists

M0 of the roadmap (18): everything after this — Dev Docs tab, panes, vault,
AI patch loop — renders inside this shell and crosses this bridge. Getting
the trust boundary right first means later features inherit it instead of
retrofitting it.

## What it must not own

- Canonical knowledge (files are the source of record; vault IO arrives at
  S05 behind typed APIs, not ambient renderer access).
- Provider keys or billing credentials — never in renderer, preload-exposed
  values, or logs (13).
- Remote/untrusted content — the trusted window denies `window.open` and
  external navigation outright; isolated source views are an M5 concern.
- Kernel logic: `project-core`, `vault-core`, etc. stay Electron-free (14);
  this app is an adapter layer.

## Public contracts

- `shared/ipc-contract.ts` — every renderer-visible method is declared here
  first; `tests/preload-surface.test.ts` fails on drift between this contract
  and what `contextBridge` actually exposes.
- `electron-main/security.ts` — `SECURE_WEB_PREFERENCES` is asserted exactly
  (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`,
  `webSecurity: true`) by `tests/security-contract.test.ts`, which also
  checks linkage to `docs/contracts/electron_security_contract_v0_2.json`.
- Scripts: `npm run dev | build | preview | smoke | test | typecheck`
  (root `package.json` forwards to this workspace).

## Data flow

```text
renderer DevDocs.tsx
  -> window.atomik.listDevDocs() / readDevDoc(relPath)
  -> preload -> named channels
  -> main: resolveDevDocPath validates (relative-only, extension
     allowlist, traversal + symlink-escape guards) -> file from docs/
  -> renderer: markdown-it (html:false) -> relative SVG imgs inlined
     into the HTML string -> React renders the final string once

workspace layout (03: recoverable UI state, never knowledge)
  click/drag -> dispatch(pure operation from model.ts) -> new state
  -> React re-renders (identity change) -> debounced 500 ms
  -> writeWorkspaceState -> main validates shape + caps (depth<=16,
     <=64 tabs/leaf, 256 KB) -> atomic write (temp + rename, 27)
  restore: load() -> readWorkspaceState (null on missing/corrupt ->
  default layout; a broken layout file never crashes the app)

vault (04: files are the durable source of record)
  open: dialog in main -> vaultRoot held in main -> VaultInfo to renderer
  read: VaultView -> readNote(relPath) -> resolveNotePath (relative-only,
        .md-only, denylist, realpath containment) -> content + mtimeMs
  write: writeNote (target must exist) / createNote (wx, never clobbers)
        -> byte-exact atomic temp+rename; one edit = one clean Git diff
  open/list/read never write (proven: git status stays empty)
  folders (CP-MVP-007 S02, owner decision D): createFolder(relPath) in
        project.ts -> resolveProjectDirPath gate -> mkdir + index.md
        (wx, "Atomik Folder Index", YAML-quoted title from the segment)
        — a folder is born WITH its map, so listVaultFiles' prune-empty
        invariant stands; adopts an index-less existing folder, refuses
        an existing index (content is sacred). Every creating handler
        (createNote/createFolder/createProject) now pushes
        vaultFilesChanged — before S02 only main-side landings pushed
        and OTHER open trees went stale after a plain creation.
  folder conventions sync (CP-MVP-007 S07k, owner decisions 2026-07-21
        revising option D to FULL conventions): folder-index.ts owns
        the bookkeeping — every folder carries index.md AND log.md;
        the vault ROOT seeds both ONCE at explicit adoption
        (adoptVaultRoot in the openVault dialog handler; launch
        restore never writes); createFolder is born with both; a
        createNote that materializes new intermediate folders records
        each level in ITS parent (innermost first, so parent Contents
        links resolve). index.md carries ONE managed Contents block
        between <!-- atomik:contents --> markers (folders first,
        bundles as one unit line to source.md, then notes; owner text
        outside the markers is NEVER touched; a marker-less index
        adopts the block on the folder's next operation; unchanged
        bytes write NOTHING — 27). log.md gains one dated line per
        verb (created/deleted/renamed/moved — BOTH parents on a
        cross-folder move: departure + arrival). The sync lives IN
        the verbs (vault.ts createNote; project.ts createFolder +
        createProject, ensure records only when genuinely NEW;
        file-manage.ts deletes/relocates POST-success — a rolled-back
        apply leaves zero bookkeeping), so every caller (tree UI,
        DnD, future AI file management) produces identical records;
        import landings keep dossier conventions. The relocate
        scanner treats index/log as ordinary scannable notes — a
        rename's preview counts the parent-index link too (the smoke
        rung asserts 2) and the post-op re-derivation converges on
        the same bytes. Tests: folder-index.test.ts (block/entries
        matrix, adoption idempotence, no-cosmetic-writes, verb
        round-trips incl. the nested-create chain).
  tree context menu (CP-MVP-007 S02): right-click / Shift+F10 on a
        folder node or the tree background (= scope root) in ALL THREE
        trees (vault, project, sources) -> TreeMenu popup (New note
        here / New folder…; hand-rolled, zero deps) -> name input IN
        the popup, main-side validators stay the real gate
        (childRelPath in tree-menu.ts pre-checks one dot-free
        separator-free segment); errors land inside the popup; created
        folder opens its index and joins the fold state.
  delete to OS trash (CP-MVP-007 S03, owner decision): deleteNote /
        deleteFolder in file-manage.ts over a TrashFn SEAM (prod =
        shell.trashItem; a rejected trash SURFACES, never a silent
        hard delete — rmSync stays reserved for derived files).
        Bundle rule enforced MAIN-side: a note whose folder directly
        holds source.md refuses individual deletion (source.md
        included) — the bundle root trashes as ONE unit. Renderer:
        Delete note…/Delete folder… in TreeMenu (hidden on the vault
        root); confirm text from folderDeleteSummary (note count +
        bundle-count escalation, computed from the loaded tree — no
        extra channel); the open note reset()s when it leaves with the
        target; fold state pruned (prunedOpenFolders). Pills
        (index/log) carry no delete — convention files leave with
        their folder. PROVEN ON THIS WSL MACHINE: smoke rung
        vaultWrite=ok+folder+trash, file recovered from
        ~/.local/share/Trash/files/ (the WSL-trash risk is closed).
  rename/move = ONE refactor verb (CP-MVP-007 S04; 27 §rename refactor,
        20 §link integrity): relocatePreview/relocateApply in
        file-manage.ts share computeRelocate — walk every scannable
        .md (symlinks skipped), match inline links [t](x) and [t](<x>)
        (schemes/#-only skipped, #hash preserved), resolve against the
        note's own location, rewrite ONLY targets that resolve to the
        moved note; the MOVED note's outgoing links re-point from its
        new home — except on a same-folder rename (resolution basis
        unchanged → zero cosmetic bytes, 27). Preview = the acceptance
        gate (files + counts, nothing written); apply = rename first,
        then link writes, ROLLBACK of both on partial failure. Guards:
        convention files (index/log) refuse, bundle files refuse, a
        bundle folder as target refuses, collisions refuse. Channels
        relocate-preview/relocate-apply + push note-relocated →
        Workspace rewrites EVERY tab's notePath (relocateTabPaths in
        model.ts — prefix form ready for folder moves); the initiating
        view re-opens the note at its new path; a dirty open editor
        blocks its own rename. TreeMenu grows Rename… on notes
        (prefilled, .md re-appended). Known gaps recorded: reference-
        style links and wikilinks not scanned (none produced by the
        app; 20's link index will subsume), preview is a confirm list
        (a diff modal can come with 20).
  Move to… + FOLDER relocate (S05): relocateFolderPreview/Apply — the
        same refactor prefix-wide (mapPath rewrites every target under
        the moved folder; notes RIDING the move re-emit outgoing links
        from their new home, sibling links keep their bytes). Bundle
        roots move AS UNITS (the sanctioned way to move a bundle);
        folders INSIDE a bundle refuse (media/ stays put), bundle
        targets refuse, self-nesting refuses. Apply rewrites riding
        notes at their NEW paths, rollback restores both. "Move to…"
        in TreeMenu (both kinds; destination typed, '' = root —
        moveTargetRelPath validates segments, main re-validates);
        moves always confirm. The note-relocated push covers folders:
        relocateTabPaths rewrites notePath AND treeOpen fold params
        prefix-wide across every pane.
  drag-and-drop (S06): an INPUT BINDING over the proven Move flow —
        native HTML5 drag on notes and folder summaries (payload =
        TREE_DRAG_MIME JSON, parseTreeDrag validates), folder
        summaries + the tree background (= scope root) are drop
        targets (.drop-target highlight); dropMoveTarget computes the
        S05 destination (same-parent and own-subtree drops are
        no-ops); the drop runs the SAME preview + confirm + verb as
        Move to… — never a shortcut around the gate. Keyboard path =
        the context menu (unchanged). UI gesture not exercisable from
        the node suite — helpers unit-tested, chain = the proven Move
        flow; owner bench covers the gesture itself (S07).

pdf extraction (10: renderer fidelity and extraction fidelity separate)
  Extract text button -> extract-pdf-source(dossierPath) -> main
  re-reads original.pdf bytes (never the viewer's) -> pdf.js legacy
  text layer per page -> thin pages rasterized (pdftoppm) -> seated
  OCR adapter -> extracted.md written wx (derived frontmatter with
  engine + trace id) -> dossier status→extracted + index line
  -> ONE 'extract' ActionTrace (deterministic | local-model);
  failure also lands a trace; vaultFilesChanged refreshes trees
```

## Alternatives considered

- **electron-vite vs hand-rolled glue** (vite renderer + tsc/esbuild main +
  concurrently): chose electron-vite — one config, HMR for all three targets,
  maintained. Accepted risk: its vite-major coupling (see Common mistakes).
- **CommonJS vs `"type": "module"`**: CJS deliberately. Sandboxed preload
  scripts must load as CJS bundles; `sandbox: true` is contract (13), so ESM
  main/preload convenience loses.
- **npm workspaces vs pnpm**: npm — zero extra tooling for a two-package
  monorepo. Revisit only on real pain.
- **Project-references tsconfig**: rejected for now (`composite` + `noEmit`
  friction); two flat configs (`tsconfig.node.json`, `tsconfig.web.json`)
  and a two-step `typecheck` script.
- **zustand vs Jotai/Redux/Context** (12 lists zustand or Jotai): zustand —
  one store, selector subscriptions, no providers, ~1 kB; layout logic
  stays in pure `model.ts` functions so the store is replaceable.
- **Split creates an empty pane** (placeholder with +project/+vault/+docs)
  rather than auto-cloning a tab: simpler invariants, explicit user intent.
- **`.atomik/` stays fully Git-ignored** (resolves the S01 observation):
  we persist `local-workspace.json` (machine-local per 03/27); a shared
  committed `workspace.json` only becomes relevant with collaboration and
  is deferred until then.

## Common mistakes

- Re-quoting selection text without de-quoting first (S06b, owner report):
  an @ quote block is a common selection, and `excerpt`'s whitespace
  collapse turns its per-line `> ` markers into literal mid-sentence `>`.
  Compose display text via `dequote`/`quoteBlock` (ai-mock.ts) — but NEVER
  sanitize the selection, claim candidates, or evidence: the containment
  check and the 05 anchors refer to the buffer's raw bytes.
- Adding a preload method without extending `ipc-contract.ts` and the surface
  test in the same change — the test fails by design; re-read 13 §IPC first
  (CP-MVP-001 conditional trigger).
- Writing a proportional font stack literally instead of consuming
  `--note-text-font` — the read/live parity invariant depends on one
  definition, and `note-typography.test.ts` fails on any surviving copy.
- Setting `"type": "module"` in `package.json` — silently breaks the
  sandboxed preload.
- Loosening any `webPreferences` key — `security-contract.test.ts` asserts
  the object exactly, additions included.
- Upgrading `@vitejs/plugin-react` to v6 or `vitest` to v4 while
  electron-vite pairs with vite 7: both require the rolldown-based vite 8 and
  reintroduce a dual-vite type conflict (hit and fixed at S02).
- Loading any remote URL in the trusted window — denied by handlers; remote
  content gets its own isolated view at M5.
- Mutating React-owned innerHTML after render (S03 lesson): a later commit
  of the same `dangerouslySetInnerHTML` content discards manual DOM edits.
  Pre-process the HTML string instead, then render it once.
- Treating `readDevDoc` casually: its path validation IS the trust boundary
  for renderer-reachable file reads. Widening `DOC_EXTENSIONS` or pointing
  it outside `docs/` is a reviewed security decision, not a tweak.
- Capitalizing the app name in UI surfaces: the product displays itself in
  lowercase — "atomik" (owner decision, 2026-07-06). Documentation prose
  keeps "Atomik".
- Storing knowledge in workspace state: tab `params` carry view arguments
  (a doc path), never content. Deleting `.atomik/` must never lose value.
- Letting the renderer name a persistence path: the workspace file path is
  fixed in main; renderer sends payloads only.
- An effect that reacts to a prop must not re-fire on its own failure
  (DevDocs `lastRequested` guard — a bad `docPath` would retry forever).
- Deferred pane operations from 03, recorded not forgotten: move tab
  between panes, pin tab, focus mode, resize keyboard access.
- "Improving" vault bytes: any normalization (trailing newline, frontmatter
  order, timestamps-on-read) breaks the one-edit-one-diff contract (27).
  `writeNote` writes exactly what it is given, full stop.
- Creating through `writeNote` or overwriting through `createNote`: the
  verbs are deliberately split; `wx` makes create exclusive at the OS
  level (no TOCTOU window).
- Silently generating a vault `.gitignore`: 27 sketches a default template,
  but touching a user's vault uninvited violates no-silent-mutation —
  deferred to an explicit, consented flow.
- Recreating the EditorView on re-render (kills selection/undo/scroll):
  it lives in a ref, mount-only, remounted by key per note; fresh
  closures reach it through refs (saveRef pattern).
- Comparing editor content as strings on hot paths: the dirty check is
  `doc.eq(savedDoc)` on CM Text (structure-shared) — a `toString()`
  compare materializes the whole document per keystroke (perf audit
  2026-07-15). Same family: decode base64 with `base64ToBytes`
  (source/bytes.ts), never `Uint8Array.from(atob(…), cb)` (one JS call
  per byte); and every `URL.createObjectURL` needs a revoke on
  change/unmount (SourceImageView/CaptureView pattern) or the media
  bytes stay for the session.
- Breaking the mtime handshake: every successful save must adopt the
  returned mtime or the NEXT save false-conflicts. "Overwrite anyway" is
  the only sanctioned unconditional write.
- Adding save-time content "fixes" (trailing newline, frontmatter sort):
  same byte-fidelity contract as S05 — the buffer IS the file.
- Giving the AI channel any write capability, ever: accepted patches go
  through the buffer + vault verbs; a provider adapter that writes
  directly would bypass preview, mtime handshake, and wx (06 safety rule).
- Closing block kinds into a TypeScript union (06's implementation
  warning): `kind`/`role` stay open strings; unknown kinds degrade to
  rendered text.

## Tests

`apps/desktop/tests/` (vitest, node env): `security-contract.test.ts` (pinned
webPreferences + contract-file linkage), `preload-surface.test.ts` (exact
documented surface, no raw `ipcRenderer`, named-channel routing),
`dev-docs-paths.test.ts` (traversal /
absolute / NUL / extension / non-string rejections), `dev-docs-list.test.ts`
(grouping, generated-artifact exclusion, symlink-escape refusal on a fixture
bundle), `markdown-helpers.test.ts` (frontmatter strip, relative-link
resolution), `workspace-model.test.ts` (splits, collapse rules, focus
repair, fraction clamping), `workspace-state.test.ts` (atomic roundtrip, no
temp residue, forgiving reads, payload validation caps), `vault.test.ts`
(path matrix incl. denylist, tree pruning + symlink policy, byte-exact
write, wx create, optimistic-conflict matrix with deterministic mtimes,
settings memory), `project.test.ts` (folder-path matrix, slugs, manifest
scan incl. no-descend + malformed fallback, idempotent ensure,
byte-identical adoption, createFolder D-convention incl. adoption /
sacred-index refusal / traversal matrix), `tree-menu.test.ts`
(childRelPath segment gate: .md once, root paths, separators/hidden/
oversize refused; moveTargetRelPath destinations; dropMoveTarget
no-ops on same-parent/own-subtree), `file-manage.test.ts` (trash seam: note/folder
round trips, bundle-internal refusal incl. source.md itself, vault-
root/traversal/missing rejections, failed-trash-never-hard-deletes;
relocate: preview-writes-nothing, inbound updates with hash/angle
forms, scheme links untouched, moved-note outgoing re-pointing,
same-folder-rename byte fidelity, guard matrix, midway-failure
rollback),
`vault-scope.test.ts` (findSubtree),
`ai-mock.test.ts` (operation validation matrix, 06 bundle shape with
truth arrays, destination→file-change mapping, content determinism,
web-reader provenance into note text + evidence and its absence),
`web-provenance.test.ts` (dossier→provenance parse incl. quoted-title
unquote and null on no-URL, fs resolve best-effort, strict relPath),
`action-trace.test.ts` (one complete line per decision, append-only
accumulation, failure/flush paths, summary lifecycle, the
content-leak grep, and the S02 cloud lines: reported-vs-estimated
labeling, USD billing with snapshot id, cloud privacy mode, failed
engine identity), `generation-adapter.test.ts` (CP-MVP-008 S02,
fixtures only: operation→messages building, response→bundle mapping
per destination, deterministic claim-candidate extraction,
provider-reported and estimated usage with snapshot cost, truncation
uncertainty, the full error taxonomy incl. retry-after surfaced
without auto-retry, timeout-vs-cancel, the main-side input budget
pre-check, and the mock behind the seam),
`ai-helpers.test.ts` (default note paths), `prompts.test.ts` (S03:
scope-chain walk, nearest-first collection with shadowing and
convention-file exclusion, frontmatter parse with honest rejects,
injected-verb loading incl. edit→use round-trip, scope labels,
starter materialization idempotent/missing-only with starters
self-validated as prompts; S03b: layer expansion incl. nesting,
cycle/unknown/inline literals, scope-resolved override of a layer,
prompts-folder recognition, creation autofill parsing back as the
chosen kind),
`truth.test.ts` (containment + hash evidence, the no-paraphrase rule,
form honoring with evidence outranking, the smuggled-label adversarial
case, reproducibility, provenance riding matched evidence and the
unchanged no-provenance shape), `search.test.ts` (match kinds + lines,
case-insensitivity, denylist, caps, query validation),
`capture-session.test.ts` (real HTTP over loopback: token gate incl.
forged/expired/stopped, one-time token across restarts, size cap, MIME
allowlist + magic-byte mismatch, upload cap, byte-exact inbox writes +
meta sidecars, endpoint closed outside sessions, file-name sanitation,
LAN-host detection, the phone page's input/degrade/URL-derivation
contract, the capture view's pure formatting, and the decide-once
inbox lifecycle), `capture-import.test.ts` (bundle shape + byte-exact
original, wx refusal leaving pre-existing bytes untouched, destination
path/title matrices, vanished-inbox-file no-side-effects, the FULL
composed loop phone-POST→inbox→import→vault, renderer defaults),
`source-dossier.test.ts` (frontmatter resource parsing, image-extension
gate, rotation metadata round-trip), `transcription.test.ts` (mock
determinism + honesty, the full pipeline incl. dossier update and the
no-clobber rule, the transcribe trace fields with the content-leak
check, failed-adapter accounting), `pdf-import.test.ts` (honest slugs,
bundle shape with untouched original + dossier sha256 + index map,
bytes-outrank-labels refusal BEFORE the vault is touched, numbered
siblings instead of overwrites), `pdf-extract.test.ts` (per-page text
+ OCR fallback pages + dossier/index/trace, honesty without a
rasterizer, deterministic-vs-local-model trace location, no-clobber,
the extract→delete→extract lifecycle round trip),
`pdf-anchors.test.ts` (clickable idempotent anchor rows;
`#page=N`-target parsing to the sibling dossier), `quick-actions.test.ts`
(source bundle collection, relative paths, PDF citation with the page
digit pre-selected, WEB citation to the absolute live-page URL, the
full per-source choice set incl. recorded anchors, derived-text quote
blocks read at apply time incl. reader.md for web bundles),
`web-view.test.ts` (guest prefs = the four settings + partition and NO
preload asserted, the two-permission allowlist, http(s)-only URL gate,
opaque view ids, closed control-action set, bounds clamping, the
Chrome-UA normalization, the auth-host Firefox presentation incl.
lookalike-domain exclusion and client-hint stripping),
`web-urls.test.ts` (URL-bar input: bare host gains https, non-web
schemes refused), `web-import.test.ts` (honest slugs with URL
fallback, hostile-text sanitization incl. control bytes, bundle shape
with hashed snapshot + evidence table + index, frontmatter/markdown
injection defeated, non-page refusals before the vault is touched,
javascript: canonical dropped, numbered siblings, failed/empty
snapshot leaves no half bundle), `mhtml.test.ts` (QP/base64 decode,
image resource collection, missing-boundary/no-HTML throws, extension
map), `web-reader.test.ts` (title+markdown+embedded image from a
synthetic snapshot with local media rewrite, reader.md+media/ landing
with dossier flip and ONE deterministic trace, no-clobber, the
extract→delete→extract lifecycle, the pure idempotent correction-flip
functions);
`vault.test.ts` additionally covers `readSourceAsset` (base64 +
MIME happy path, extension allowlist, note-path discipline reused,
human missing-asset message). The
smoke's capture proof also drives the REAL capture tab when a state
fixture mounts one (start button → `img.capture-qr` rendered;
`qr-rendered` in the marker). The S11
acceptance run and its per-line evidence live in
`atomik-project/sessions/2026-07-06-s11-acceptance-run.md`. The
CodeMirror typing/save flow and the AI surfaces (inline preview +
chat column since the S06 AiPanel retirement) are
validated by owner dogfooding and the learning-note exercises; the
channels and logic beneath them are unit-covered, and the smoke drives
the AI channel e2e through the renderer world (ATOMIK_SMOKE_AI=1) and
the capture session lifecycle likewise (ATOMIK_SMOKE_CAPTURE=1); the
web tab has an OPT-IN probe (ATOMIK_SMOKE_WEB=<url> plus a state
fixture restoring a source-web tab — network-dependent, never part of
the default deterministic run) that waits for the URL bar to reflect
the real navigation: restore → ensure → isolated load → typed push →
DOM, verified `web=navigated(example.org)` 2026-07-13; stacking
ATOMIK_SMOKE_WEB_IMPORT=1 (+ a vault fixture) clicks the REAL
Import-as-source button once it enables and waits for the bundle on
disk — the whole S04 chain, verified `webImport=ok(example-domain)`
2026-07-13 (real Blink MHTML, hashes recorded). The smoke run proves boot + Dev Docs
rendering and reports pane/vault counts; pre-seeded `ATOMIK_STATE_DIR` /
`ATOMIK_VAULT_DIR` fixtures prove layout restore and, with
`ATOMIK_SMOKE_VAULT_WRITE=1`, the full renderer→disk write chain (verified
byte-exact via cmp + a one-file Git diff); a write-free run proves
no-rewrite-on-open (git status stays empty).

## Example usage

```bash
npm run dev          # HMR dev shell
npm test             # 262 tests, 28 suites (S07 count — grows per step)
npm run typecheck    # node + web configs
npm run smoke        # build + ATOMIK_SMOKE=1 electron .  -> ATOMIK_SMOKE_OK
# open a specific doc / capture proof:
ATOMIK_SMOKE=1 ATOMIK_SMOKE_DOC=bedrock/22_22-agent-handoff.md \
  ATOMIK_SMOKE_SHOT=/tmp/devdocs.png electron .
```

## Future extension points

- Real provider adapters (M7+) behind the same `run-ai-operation` channel;
  their claim candidates flow through the same `labelClaims` checker —
  labels beyond the MVP four (web-checked, disputed, stale) require
  reading 28 first (path trigger). The 26 "context beyond
  selection-first" trigger landed as the S06 chat COLUMN (pane
  chrome, not a tab kind); richer context assembly still reads 26
  first.
- Autosave SHIPPED as the default policy (MVP-001 feedback) on top of the
  unchanged mtime handshake; remaining seam: observing OS-level window
  close mid-debounce (quit flush) if it ever bites in practice.
- Vault switching SHIPPED (owner called "necessary" during the MVP-001
  follow-ups): a change-vault button in the vault tree-bar reuses the
  S05 `open-vault` dialog; a successful pick broadcasts
  `atomik:vault-changed` and every mounted vault/project view drops
  previous-vault state (note buffers, trees, searches, project lists).
  A tab whose `projectPath` does not exist in the new vault falls back
  to the project picker; a stale `notePath` shows the selection prompt.
  Safety came free: a stale editor flush against a same-named file in
  the new vault is REFUSED by the mtime handshake.
- Manifest `resources`/`pinned` stay empty until real membership needs
  arrive (S08+ patch destinations; 04).
- Dev Docs later modes (16): agent/architecture/context/execution views,
  search, packaged-build docs path (docs/ currently resolves relative to
  the repo checkout — packaging must bundle or relocate it).
- Provider/AI calls (S08+): trusted main/service layer only; renderer sends
  typed operations; local runtimes get a worker/sidecar boundary (12).

## Agent checklist

```text
before any new IPC channel or preload method:
  re-read 13 §IPC; update shared/ipc-contract.ts + preload + tests same unit
never expose ipcRenderer, fs, or shell to the renderer
keep SECURE_WEB_PREFERENCES exact; changes are ADR-level security decisions
never give the web guest a preload, app-session access, or a non-http(s)
  URL — web-view.test.ts asserts the gates; a "quick devtools bridge"
  into remote content is the forbidden shortcut wearing a new hat
run typecheck + test + build + smoke before committing shell changes
run every gate BARE — the exit code IS the verdict; any `| grep`/`| tail`/
  `| head` on a gate output is a red flag (2026-07-16: `typecheck | grep
  "error TS" | head` swallowed a failing exit code and shipped a
  white-screen app — two props typed but not destructured; tsc caught
  both, the pipe ate the verdict). Run `npm run typecheck && echo OK`
  first, prettify output only after the verdict is in.
update this note in the same work unit as any boundary change
```

## Dependency facts (dated)

Resolved 2026-07-06 from the npm registry (recheck on any dependency bump;
expect plugin-react/vitest to move forward together once electron-vite pairs
with vite 8):

```text
electron ^43.0.0 · electron-vite ^5.0.0 (pairs with vite ^7) · vite ^7.3.6
@vitejs/plugin-react ^5 (peers vite ^4.2–^8; v6 needs rolldown vite 8)
vitest ^3.2.7 (v4 needs vite 8) · react/react-dom ^19.2.x
typescript ^6.0.3 · @types/node ^24 · markdown-it ^14.3.0 (added S03)
zustand ^5.0.14 (added S04)
qrcode ^1.5.4 + @types/qrcode ^1.5.6 (added CP-MVP-002 S03; browser
build renders the capture QR renderer-side via toDataURL)
@codemirror/lang-markdown ^6.5.0 · @codemirror/theme-one-dark (S07) ·
@codemirror/{language,state,view,commands,search,autocomplete} +
lang-{javascript,html,css} all declared explicitly — the `codemirror`
meta-package (basicSetup) is RETIRED: the editor chrome is composed by
hand so live mode can be gutter-free while source keeps the IDE
trimmings (MVP-001 follow-up feedback); versions pin the installed ^6
line
@types/turndown ^5.0.5 (dev; turndown-plugin-gfm has no published
types — a local `turndown-plugin-gfm.d.ts` declares the Plugin members
used, CP-MVP-006 S05)
pdfjs-dist 6.1.200 EXACT (added CP-MVP-003 S02; Apache-2.0; dated
decision: atomik-project/sessions/2026-07-08-pdf-engine-decision.md —
mupdf AGPL rejected, pdfium native-weight rejected, react-pdf
needless, poppler noted as extraction alternative). Fresh build =
viewer in the sandboxed renderer; LEGACY build = extraction in main.
v6 removed the eval'd font path (the CVE-2024-4367 posture is
structural upstream; isEvalSupported retired, destroy() moved to the
loading task). Recheck on any pdfjs bump: worker bundling, the
legacy/fresh split, and the render-cancellation contract
@mozilla/readability 0.6.0 (Apache-2.0) · linkedom 0.18.13 (ISC) ·
turndown 7.2.4 + turndown-plugin-gfm 1.0.2 (MIT) — added CP-MVP-006
S02 (dated decision:
atomik-project/sessions/2026-07-13-web-engine-decision.md): reader
extraction runs in MAIN over the CAPTURED post-JS DOM (linkedom
parse), never a re-fetch; snapshot = built-in savePage MHTML (no
dep); embed = built-in WebContentsView — webview tag officially
discouraged, BrowserView deprecated (checked 2026-07-13 against the
web-embeds guide + electron.d.ts 43.0.0). Recheck all four on any
Electron major bump. 0 vulnerabilities at install
```

Dev-environment note (WSL2 Ubuntu noble): Electron needs `libnss3`,
`libnspr4`, `libasound2t64` system packages — `poppler-utils` provides
`pdftoppm` for PDF-OCR rasterizing (installed by owner 2026-07-08;
absent, scanned pages land honest placeholders, no code change to
re-enable). Two stderr lines are KNOWN WSLg noise/limits
(probe-verified 2026-07-13): `WebGL1 blocklisted` is REAL — WebGL 1
AND 2 return null contexts under WSLg's blocklisted GL (probed
directly; regular pages and Colab's editor don't care; GPU-rendered
outputs — plotly 3D, three.js — would fail). The knob, IF a page the
owner needs visibly breaks, is `ignore-gpu-blocklist` as a DATED
decision — not preemptively, GPU flags can destabilize the renderer.
`UPower ... ServiceUnknown` is the Battery Status API probing a
daemon WSL doesn't run — zero impact, no action. `atom_cache.cc: Add
application/vnd.portal.filetransfer / .files to kAtomsToCache`
(ERROR-severity but informational; owner saw it 2026-07-14 opening the
web viewer) is Chromium noting XDG desktop-portal file-transfer MIME
atoms it hit during X11 clipboard/drag-drop and suggesting it cache
them — a logging quirk, not a failure; same benign WSLg class (not
probed like WebGL, but the message content and location are
unambiguous). `GLib-GObject: gsignal.c: instance ... has no handler
with id N` (owner saw it 2026-07-14) is a GObject signal-handler
cleanup warning from the GTK layer BENEATH Electron (double-disconnect
race in dialog/window integration) — harmless, not Atomik code. General
rule for WSLg: Electron emits a steady trickle of ERROR-tagged GTK/X11/
GLib warnings that are cosmetic; treat them as noise UNLESS a visible
symptom accompanies one (a dialog crash, a hang, a blank view). Electron also needs
`libpulse0` for the
MICROPHONE (probe-verified 2026-07-07: without it Chromium sees zero
audio inputs and getUserMedia fails NotFoundError; with it, WSLg's
RDPSource — the Windows mic — appears and records; enumerate/gum only
exist in secure contexts, so probes must load file:// not data:). Without root they can be
`apt-get download`-ed and `dpkg -x`-extracted, then passed via
`LD_LIBRARY_PATH`; for daily dev install them properly with apt.
WSLg maximized gap/offset (microsoft/wslg#1015) — ROOT-CAUSED AND FIXED
2026-07-15 with a WINDOWS-SIDE probe. The method (capturePage cannot see
WM compositing; this can): from WSL, `powershell.exe` interop
screenshots the REAL Windows desktop (System.Drawing CopyFromScreen),
reads the RAIL host window rect (FindWindow/EnumWindows +
GetWindowRect/DWM), and injects clicks (SetCursorPos + mouse_event); an
Electron probe window with colored edge bands turns offsets into
numbers. MEASURED (both monitors): restored windows are pixel-exact
(host = content + ~32-36px shadow margin, correctly offset);
WM-MAXIMIZED windows keep CORRECT logical bounds (0,0,1920,1032 — why
every bounds-level probe said "fixed") but the host window grows 32px
too tall and the CONTENT presents +32px right/down with INPUT
unshifted: transparent band at left/top, content clipped right/bottom,
every click lands 32px from what it appears to hit. A manual setBounds
to the true work area (no WM state) is pixel-perfect AND click-perfect
with the shadow ON, in 0-1 ms — the earlier "lag" was the setHasShadow
toggle. Two more traps: Electron's `screen.workArea` LIES under WSLg
(full 1080, no taskbar inset, both monitors), and the naive snap
conversion (unmaximize + setBounds inside the 'maximize' event) is
beaten by the WM's async restore — the window ends 4px inset all around
(measured). THE FIX (`index.ts` + `wslg-workarea.ts`): under `IS_WSLG`
the WM-maximized state is never entered; maximize = setBounds to the
matching Windows screen's WORK AREA — queried via powershell.exe
(`WINDOWS_SCREENS_PS_COMMAND`) at startup and on display changes;
coordinate mapping Linux = Windows − virtual-screen origin
(probe-verified); parse + display matching are PURE and unit-tested;
fallback = display minus a 48px bottom strip — restore = saved STABLE
bounds (debounce-recorded; the WM dance emits junk rects), snap/Win+Up
converts after 'unmaximize' settles plus one guarded re-assert at
250 ms. Accepted dev-env quirks: Win+Down on a WSLg-maximized window
minimizes (the WM never sees a maximized state); an edge-resize while
WSLg-maximized keeps the flag until the next toggle. PLATFORM REALITY
(2026-07-15): despite `ozone-platform-hint=auto` and a live wayland-0
socket, the app runs XWAYLAND on this machine — forcing
`--ozone-platform=wayland` crashes (no DRM render node) — so the old
"native Wayland under WSLg" claim is retired; all measurements are the
X11 path, i.e. what the owner actually runs. Verified on the REAL app
by clicking its own □ Windows-side: host rect lands exactly at
content = work area (taskbar visible), restore returns the exact
original rect, the ☰ menu opens where it is drawn. Owner eyeball = the
final gate.

Agent verification & coexisting with the owner's live instance (recorded
2026-08-03 from session-tested practice; any agent working this repo
should follow these, they were each paid for in lost hours):

- RENDERER-CONTENT checks, first choice: launch the app with
  `--remote-debugging-port=<port>` (Electron consumes the flag;
  `ATOMIK_STATE_DIR`/`ATOMIK_VAULT_DIR` + a `local-workspace.json`
  fixture open any tab/mode), then over CDP (`curl :port/json` → Node's
  global WebSocket) call `Page.captureScreenshot` + `Runtime.evaluate`
  DOM probes — pixel-true capture with ZERO owner-desktop interaction.
  Prefer the app's own `ATOMIK_SMOKE_SHOT=<png> npm run smoke` rung when
  only the atomik window's rendered layout is needed. Full-desktop
  `powershell.exe CopyFromScreen` grabs the owner's LIVE screen (they
  dogfood on this machine; a 2026-07-16 capture caught personal browsing)
  — use it only when Windows-side pixel truth is the point (WSLg
  presentation bugs, above), and delete the capture after.
- THE RUNTIME-MODE BLIND SPOT: the owner runs `electron-vite dev` =
  development React = StrictMode double effects (setup→cleanup→setup per
  mount). CDP pins on `npm run build` + `electron .` are production
  React (single setup) and missed a dev-only lifecycle bug for four fix
  rounds (2026-07-25, chat wiped on tab switch: an effect ref-guard
  claimed before its read committed while cleanup cancelled the read).
  Rule: renderer lifecycle/effect fixes get at least one pin in DEV mode
  (`electron-vite dev -- --remote-debugging-port=<port>`; vite auto-picks
  a free HMR port beside the owner's instance). The owner's dev instance
  hot-reloads renderer edits — a fix may reach their screen before any
  restart; mid-edit intermediate states can also hot-reload and WEDGE
  their session (Vite server dies; the zombie Electron shell then makes
  fresh launches look dead). After a work unit, tell the owner it's a
  good moment to restart the dev server; treat live bug reports arriving
  mid-edit-batch as possibly half-applied HMR states — verify on a clean
  launch before diagnosing code.
- INSTANCE ISOLATION: agent test instances share
  `~/.config/atomik-desktop` (Chromium SingletonLock) unless given an
  isolated `--user-data-dir` — leaked instances silently block the
  owner's launches. CDP harnesses always pass an isolated user-data-dir
  and kill the process GROUP.
- THE PRESENTATION WEDGE: heavy Electron churn (many CDP
  launches/SIGKILLs in one session) can wedge WSLg's presentation
  channel — processes run, Vite/React connect, taskbar entries appear,
  but NO window ever renders. Definitive cheap test: `xmessage` also
  fails to present. Fix: `wsl --shutdown` from WINDOWS (kills the whole
  WSL session including agent processes — commit everything first); a PC
  reboot is never needed. Prevention = the isolation rule above.
