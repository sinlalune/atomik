---
type: Atomik Module Note
title: 'Module: atomik-desktop — shell'
description: Electron shell, window and security posture, the IPC contract surface, the workspace pane tree, the Dev Docs tab and the smoke hook.
tags: [module, electron, security, shell, ipc, workspace]
timestamp: 2026-08-17T00:00:00Z
---

# Module: atomik-desktop — shell

> AREA NOTE of [Module: atomik-desktop](./atomik-desktop.md), split out at
> CP-OPS-001 S02 so concurrent lanes append to different files instead of
> colliding in one 1689-line note. The root note keeps what is cross-cutting
> (public contracts, data flow, alternatives, common mistakes, tests, agent
> checklist, dependency facts); this note keeps what THIS AREA owns.

## What it owns

- The Electron shell: app lifecycle, the trusted UI window, and the
  main/preload/renderer split (`apps/desktop/electron-main/`,
  `electron-preload/`, `renderer/` — directory names per 14).
- The security posture of that window: `SECURE_WEB_PREFERENCES`
  (`electron-main/security.ts`) pins 13's required settings; the renderer's
  CSP lives in `renderer/index.html`. The window is chromeless
  (`frame: false`): a GLOBAL app header (`AppHeader` — brand "atomik",
  the `AppMenu` ☰ dropdown holding theme, generation engine switcher,
  the multi-provider settings dialog (`SettingsModal`), and
  `WindowControls`) is the top row and the drag surface
  (`-webkit-app-region`); the per-pane tabstrips sit on the row below
  and no longer carry the window controls (owner request 2026-07-14,
  reversing the MVP-001 tabstrip-is-the-top-row layout). min/max/close
  run through the allowlist-validated `window-control` channel.
  Maximize state is PUSHED (`atomik:window-state-changed`, the one
  main→renderer event; boolean payload) so the icon tracks OS-initiated
  changes too (snap, Win+Up), and `<body data-maximized>` turns the
  drag regions OFF while maximized — dragging a maximized frameless
  window glitches. The strip's overflow scrollbar is hidden (it sat
  inside the drag region); wheel scrolls overflowing tabs.
  MAXIMIZE IS REAL (owner 2026-07-14, "drop the fullscreen crutch"),
  and under WSLg it is OURS: WSLg cannot maximize borderless windows
  (wslg#1015 — Windows-side probe 2026-07-15: the WM presents the
  content +32px right/down while input stays put, so everything
  visible sits 32px from where it clicks). Off WSLg the native
  maximize runs; under WSLg (`IS_WSLG`) the window never enters the
  WM-maximized state — maximize positions the window over the TRUE
  per-monitor Windows work area (powershell-queried; Electron's
  `screen.workArea` lies there) and restore returns the saved stable
  bounds (`wslgRestoreBounds` WeakMap doubles as the maximized flag);
  snap/Win+Up converts on the 'maximize' event after its 'unmaximize'
  settles. Shadow untouched everywhere. Pure query parsing/matching in
  `wslg-workarea.ts` (unit-tested); probe method + measurements in the
  dev-env note below. Fullscreen (F11) is its own separate thing.
  Verified end-to-end 2026-07-15 (real □ click → exact work-area fit,
  taskbar visible, exact restore round-trip, input aligned) — owner
  eyeball is the final gate.
- The renderer-facing API surface: `shared/ipc-contract.ts` is the single
  source of truth (`ATOMIK_API_KEY`, `ATOMIK_CHANNELS`, `AtomikApi`,
  `DOCUMENTED_PRELOAD_SURFACE`). Twenty-six invoke channels exist today
  (the AI trio is described in its own bullets below), plus two push
  subscriptions (`onWindowStateChanged` over
  `atomik:window-state-changed`; `onVaultChanged` over
  `atomik:vault-changed`): `window-control` (frame verbs for the
  chromeless window, allowlist-validated), docs tree + doc read +
  `search-dev-docs`, workspace state
  read/write (fixed path, validated payload), the vault family —
  `open-vault` (native dialog in main; user-mediated capability),
  `get-vault`, `list-vault-files`, `search-vault` (optional validated
  scope folder), `read-note`, `read-source-asset` (read-only image
  originals for viewer tabs, S05), `write-note`, `create-note` — the
  project pair `list-projects` / `create-project` — and the capture
  family: `start-capture-session` / `stop-capture-session` /
  `get-capture-session` plus the S04 decision pair
  `import-capture-upload` / `discard-capture-upload` the S06
  `transcribe-source`, and `add-local-capture` (desktop mic recordings →
  the same inbox through the same gates; no endpoint opens).
  The S02 shell-identity channel (`get-app-info`) and its ShellHome card
  were removed on MVP-001 owner feedback ("shell relict"): saved 'home'
  tabs migrate to vault tabs at load (`migrateRetiredViews`).
- The workspace layout (03): recursive pane tree (leaf tabs / splits with
  draggable fraction), pure operations in `renderer/src/workspace/model.ts`
  (incubating workspace-core, 14), thin zustand store with debounced
  persistence, disposable state in `.atomik/local-workspace.json`
  (`electron-main/workspace-state.ts`; `ATOMIK_STATE_DIR` overrides the
  location for tests/smoke). The two HEAVY views are CODE-SPLIT
  (React.lazy in Workspace.tsx; perf audit 2026-07-15):
  SourceImageView (pulls pdf.js — its chunk is ~850 KB) and CaptureView
  (qrcode + fix-webm-duration) load on their first tab; the eager
  bundle dropped 2.98 → 2.0 MB and measured launch-to-content went
  1.7–1.8 s → ~0.71 s. Keep new heavy deps behind a lazy view — a
  plain static import from any eager module undoes the split silently.
  The eager chat view is also a workspace surface: CP-FEEDBACK S02 marks
  its chronological scroll stream as a polite `role="log"` and keeps
  assistant answers flat/left-led while user messages retain their compact
  right-side containment. CP-MVP-010 S10i puts those turns inside one
  centred `.chat-thread`: the THREAD is centred in the pane, while user and
  Atomik retain opposite alignment inside it. Detailed transcript and action
  behavior remains owned by the AI area note; the shell owns the pane
  geometry and accessible stream boundary.
  CP-FEEDBACK S03 adds one icon-first Quick note action to vault/project
  tabstrips and arms `Mod+N` only in the focused eligible pane (dialogs keep
  the chord). It creates and opens a real blank tab in one transaction; a
  `quick: '1'` tab param carries the disposable one-time naming lifecycle
  across ordinary workspace persistence. The durable file and refactor
  behavior is documented in the vault area note.
  CP-FEEDBACK S04 gives web tabs recoverable metadata-led identity without
  changing the IPC surface: `WebViewState.title` was already pushed by the
  isolated main-owned view, and the renderer now stores its sanitized value in
  the tab's open `params` map beside `url`. Both tabstrip and in-pane location
  chrome call `webPageIdentity` (title -> hostname -> URL -> `Web`), while the
  complete URL stays visible as secondary/tooltip information and as the
  focused address input. A pushed empty title deliberately overwrites stale
  state, so navigation to an untitled page falls back honestly.
  The closing bench adds Google-search fallback inside the same renderer seam:
  prose becomes an encoded HTTPS Google URL, clear hosts remain navigation,
  and unsafe schemes remain rejected. This adds no engine setting, IPC, preload
  surface, or remote-content authority; MAIN still accepts http(s) only.
  CP-FEEDBACK S05 is deliberately shell-neutral: the additive `web-source`
  graph kind changes shared renderer classification and pill presentation, but
  no workspace view id, tab param, opening route, IPC channel, or preload
  authority. Raw web links and captured dossiers keep their existing doors.
- The Dev Docs tab (16 MVP slice): grouped docs tree + rendered Markdown
  with the bedrock diagrams inlined as SVG data URIs, reading the real
  files under `docs/`. `electron-main/dev-docs.ts` holds the pure logic —
  the seam where a future dev-docs-core kernel splits off (14).
  `#dev-docs:<relPath>` deep-links a page at startup.
- The `ATOMIK_SMOKE=1` launch hook: deterministic "app starts and Dev Docs
  opens the bundle" check for M0 acceptance. Waits for the rendered view,
  honors `ATOMIK_SMOKE_DOC` (which doc to open) and `ATOMIK_SMOKE_SHOT`
  (PNG capture path), prints `ATOMIK_SMOKE_OK`, exits 0 (1 on timeout).
  Determinism rule (learned when live dogfooding changed the repo's
  layout): without an explicit `ATOMIK_STATE_DIR` fixture, smoke gets a
  scratch state dir — it must never restore the owner's real layout,
  which would win over the `#dev-docs` hash.


## The index-changed push (CP-MVP-010 S03)

- `atomik:index-changed` carries `{ reason, paths }` from main to the
  renderer after every vault mutation. It is DISTINCT from
  `vaultFilesChanged` on purpose: that one means the TREE changed, and a
  plain save changes both derived indexes without adding a file —
  refreshing every tree on every keystroke-save would be waste.
- One helper in main (`indexed(event, change)`) is the only place a
  write verb reports a change; it calls `recordVaultChange` and sends
  the push. Adding a verb without adding a maintenance call is now the
  kind of mistake that shows up as a missing push rather than as a
  silently stale projection weeks later.

## Typed choosers, docs panes, close-pane, the Import page (S07e, owner bench)

- Owner bench report on S07d: the (+) chooser still offered pane-type
  choices inside a typed pane. S07e separates the two surfaces: a fresh
  split (or the root after its ✕) is UNTYPED and shows the **New Pane**
  chooser — Vault / Projects / Docs — whose pick is the pane's standing
  tree type; the (+) **New tab** chooser inside a typed pane offers only
  views served from that tree: **Note** (a vault/project note tab of the
  pane's kind; a doc tab in docs panes), **Import**, **Web**. Docs left
  the tab chooser entirely — a docs tree is a pane type. Picking
  Projects opens the picker tab and the pane stays untyped until a real
  bundle is opened (onProjectOpened carries the projectPath).
- **Docs panes**: 'docs' joins the pane-tree kinds; the documentation
  tree (groups, search, fold state) moved OUT of the DevDocs view into
  `PaneTreePanel` (DocsTreePanel branch — same chrome, the app's docs
  corpus instead of the vault). DevDocs renders one doc and follows its
  docPath param; doc clicks route like notes (active dev-docs tab, else
  a new one). The default layout is now ONE vault pane (docs are a New
  Pane away); the `#dev-docs` smoke/deep-link hash builds a docs-typed
  pane, and migration types leaves with an active dev-docs tab 'docs'.
- **Close pane**: ✕ in the tabstrip actions right of the split buttons
  (`closePane`): a non-root pane collapses into its sibling, tabs and
  all (web views destroyed by the caller); the root pane empties AND
  loses its type — back to the New Pane chooser, the workspace never
  disappears.
- **Import page** (formerly "Capture" — view id stays 'capture' so
  saved layouts keep opening): one surface for every source entry path —
  Import PDF… (moved off the tree panel's ＋PDF button, now gone),
  the web route (opens an isolated Web tab; pages import from there),
  the phone-capture QR session, and the desktop recorder. Same gates,
  same inbox, same explicit confirmation as before.

## Lane runtime isolation (CP-OPS-001 S01)

- `electron-main/lane.ts` (NEW, pure, env-injected) decides what a
  concurrent execution lane must NOT share with another instance of the
  app. Concurrent lanes each run this app from their own worktree
  (`atomik-project/coding-paths/paths.md`), so two Electron processes are
  alive at once.
- What was already safe: `resolveStateDir` puts `.atomik/` BESIDE the
  checkout, so a worktree inherits its own workspace layout, AI settings,
  graph index and traces for free. State keyed on the DIRECTORY isolates
  itself.
- What was NOT safe, and is the reason this module exists: Electron's
  `userData` profile is keyed on the package name (`atomik-desktop`), so
  every worktree resolved to the SAME directory — one cookie jar, one
  `localStorage`, one network/GPU cache, one web-view partition, two
  writers. For an app with a web source tab that means one lane's logins
  leaking into another's. `ATOMIK_LANE=<slug>` claims
  `<default>-lane-<slug>` via `app.setPath('userData', …)`, called at
  MODULE SCOPE in `electron-main/index.ts` — `setPath` must land before
  ready, and before anything else touches the profile.
- `ATOMIK_LANE_PORT` pins the renderer dev-server port
  (`electron.vite.config.ts` reads the same resolver, port half only) so
  CDP pinning stays predictable across lanes. `strictPort` stays false —
  a busy port should still start, just noisily.
- A lane takes an EPHEMERAL capture port rather than the stable 41414: the
  capture manager already falls back on `EADDRINUSE`, but a lane should
  not have to lose a race first. An explicit `ATOMIK_CAPTURE_PORT` still
  wins — a lane benching the phone flow needs its one firewall rule as
  much as the main tree does.
- Unset `ATOMIK_LANE` = unchanged behaviour to the byte: the owner's
  dogfooding instance, the tests, smoke and CI all keep the default
  profile and the default ports. Lane ids are directory-safe by
  construction (lowercase alphanumerics and dashes, capped); garbage reads
  as "not a lane" rather than throwing, because a mistyped environment
  variable must never stop the app from starting.
- Tests: `tests/lane.test.ts` (6) — profile uniqueness across two lane
  ids, ephemeral-vs-explicit capture port, port validation, id
  sanitization including `../escape`.

## Rich Markdown projection lifecycle (CP-RICH-MARKDOWN S02)

- `RichMarkdownBody` is the shared post-mount lifecycle boundary for every
  `noteMarkdown` DOM consumer, including eager Chat messages and AI previews.
  It hydrates inert escaped placeholders only after React commits the DOM and
  disposes every renderer handle on content, theme, or component teardown.
- Renderer modules stay behind dynamic adapter imports. Against rebased trunk,
  the S02 shell entry increased by 14,865 bytes (+0.63%) while KaTeX, Mermaid,
  Vega-Lite, and Shiki emitted no eager runtime chunk; later steps must preserve
  that split.
- S03 keeps that boundary: math host/live wiring adds 8,626 bytes to the entry,
  while KaTeX ships as its own 485,408-byte JS and 28,946-byte CSS chunk with
  local fonts. A note with no math does not load that runtime.
