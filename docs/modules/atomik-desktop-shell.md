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
  CP-OPEN-DOCK S02 adds the ONE open-target model (contract 6): four targets
  (`tab-current` / `tab-new` / `pane-right` / `pane-below`) compiled from the
  existing primitives by `openNoteAt` in `workspace/model.ts`, with the
  vocabulary, labels and shortcut grammar in `workspace/open-target.ts` and
  the `OpenTargetMenu` popover as the discovery surface. No new IPC, no new
  workspace shape — docking still reduces to `addTab` / `splitPane` /
  `updateTabParams` sequences.
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


## Typography: one proportional face, one token

`--note-text-font` in `:root` is the app's proportional stack; `--note-code-font`
beside it is the monospace one. Four rules consume the proportional token and
nothing else may restate it:

| Site | Why it needs an explicit declaration |
| :-- | :-- |
| `:root` | the document default every chrome and content surface inherits |
| `.editor-host.live .cm-scroller` | escapes the monospace `.editor-host .cm-scroller` sets for source mode |
| `.editor-host .lp-rich-limit` | a notice label rendered inside the live editor |
| `.cm-inline-ai-rendered` | escapes the monospace of the `.cm-scroller` it sits inside (S05f: bold and italic vanished under WSLg when it inherited) |

Those four were four copies of the same literal until CP-UI-TYPOGRAPHY S01. The
copies are the failure mode, not the count: changing `:root` alone moved rendered
notes to the new face and left the **live editor** on the old one, which breaks
the invariant `.editor-host.live .cm-content` states outright — *read <-> live
never shifts the text*. `note-typography.test.ts` fails if a fifth copy appears.

`font-family: inherit` is the tempting shortcut and it is wrong here. It is
correct at `.cm-scroller`, whose parent chain reaches `:root`; at
`.cm-inline-ai-rendered` the parent **is** the monospace scroller, so `inherit`
reproduces S05f exactly. One token is right at all four sites.

### What was measured, so nobody re-derives it

Resolved faces read with CDP `CSS.getPlatformFontsForNode`, not inferred from the
stack. On a WSL host with no Inter installed, every proportional stack in play —
old and new — resolves to **DejaVu Sans**, because `system-ui` maps there through
fontconfig. The stack's visible effect is on Windows 11 only, where
`ui-sans-serif` and `'Segoe UI Variable Text'` sit ahead of `'Segoe UI'` and
resolve to the newer face. The test pins that ordering; reversing it silently
reverts the change on the only platform it shows up on.

Four rendering properties were proposed alongside the stack and **all four are
inert**. Rendering the same paragraph per variant and hashing the PNG gives one
digest for all of them:

- `-webkit-font-smoothing` / `-moz-osx-font-smoothing` — macOS only;
- `font-optical-sizing: auto` — already the CSS initial value;
- `text-rendering: optimizeLegibility` — only forces on kerning and standard
  ligatures Chromium already applies.

`letter-spacing` is the one that does something, and it does not belong on
`:root`: it changes advance width by ~0.5% (measured: 555.063 → 552.141 px over
65 characters), which re-wraps existing notes, and
`docs/bedrock/36_36-ui-design-system.md` keeps content typography off the chrome
vocabulary. The test asserts `:root` carries no `letter-spacing`.

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

## Global stylesheet: source-true block spacing (CP-RICH-MARKDOWN S07)

`styles.css` is shared shell surface, so a rule change here is recorded in both
notes. `.editor-host .lp-rich-widget--display` no longer carries a fixed
`padding-block`: read mode has made block spacing mirror the author's blank
lines since S05o, and the fixed padding gave live a gap the source did not
contain (owner bench 2026-08-17). Blank lines are real lines in live and render
their own height. Rationale and the pinning test live in the editor note.

## The rich renderer smoke lane (CP-RICH-MARKDOWN S07)

`ATOMIK_SMOKE_RICH=1` routes `did-finish-load` to `runRichSmoke` instead of
`runSmoke`, and suppresses the `dev-docs` open hash so the seeded workspace
restores instead. `apps/desktop/tools/rich-smoke.mjs` builds the fixture (temp
vault + `local-workspace.json` opening the note in read mode) and spawns the
real app; the assertions live in the main process and the verdict is the exit
code.

It exists because the unit suite runs on linkedom — no CSS engine, no CSP — and
so could not see that two renderers had never rendered (ADR-014 §8). Keep it a
SEPARATE lane from the gates: "does the software work" and "does it work in a
browser" are different questions, and a team needs to see which one failed.

S07 grew it into the path's lifecycle bench: it times first and repeat render,
resizes the window to check the page never scrolls sideways, reloads to prove
teardown leaves exactly one projection per block, and asserts the accessibility
floors. `window.setSize` and `webContents.reload()` are driven from the main
process, so the renderer still needs no test hook.

## Capability blocks ride on every send (CP-AI-CAPABILITIES S01)

The system plan gained `rendering-capabilities` and `note-conventions`. They
are ordinary overridable blocks, but they are sent EVERY request: +262 tokens
per chat send, +380 per note generation. If per-request cost is ever
investigated, these are the first thing to look at and the easiest to cut — no
code change, just a plan edit. ADR-015 carries the reasoning.

S03's owner bench added a warning about three rendering traps, taking
`rendering-capabilities` from 1,046 to 1,572 chars — roughly +131 tokens on
every request, and the asserted ceiling from 1,400 to 1,700. The traps are
worth their tokens because each one turns a correct-looking generation into a
reader who sees nothing, but they are also the first thing to trim if per-send
cost is ever squeezed: two of the three describe defects that can be FIXED, and
the drift tests fail the moment they are, which is what forces the block back
down again.

**That mechanism has now run once.** CP-RENDER-REPAIRS S01 repaired the `$$`
parser, the drift pin failed on the next test run, and the clause came out of
the block — ceiling back down 1,700 -> 1,450. Per-request cost falls as
defects are fixed, automatically, because the test makes deletion the only
correct response. The two remaining traps describe Mermaid's and Vega-Lite's
own behaviour, so they stay until those change upstream.

## A mermaid block owns its wheel only on request (CP-RENDER-REPAIRS S05)

`hydrateRichMarkdown` builds one shared control row per diagram block and hands
it to both the canvas (mermaid only) and the expand control. The shell-level
fact worth knowing: **a diagram never steals the page's scroll.** A bare wheel
over a mermaid canvas scrolls the note exactly as it does over a paragraph;
zoom requires Ctrl or Cmd. Only inside the expand overlay, where no page sits
behind the diagram, does a bare wheel zoom.

## A diagram may take the whole pane (CP-RENDER-REPAIRS S04)

`hydrateRichMarkdown` now attaches an Expand control to any `mermaid` or
`vega-lite` block that actually rendered, and the overlay is a native
`<dialog>` appended to the document body. Two consequences for the shell:

- The overlay lives OUTSIDE the editor's own DOM, so it is unaffected by pane
  layout, and the rendered SVG is moved into it and back rather than copied.
- A block showing its source gets no control — there is nothing to expand — so
  the control's presence is also a signal that the render succeeded.

## Generation defaults follow the capability blocks (CP-AI-CAPABILITIES S03)

Two owner directives on 2026-08-20, both downstream of what the blocks changed
about generation SHAPE:

- `PARAM_LIMITS.maxTokens.default` and `DEFAULT_MAX_OUTPUT_TOKENS` moved
  2000 -> 5000, and a test now pins them EQUAL. They are one budget seen from
  two sides — the renderer's "an absent field means this" and main's own
  ceiling — and a drift between them is invisible until a reader gets an
  unclosed fence. The bench cut a derivation off mid-formula at 2000; with the
  capability blocks in place, long output is the expected shape, not bad luck.
  A truncated response is worse than a short one, because the tail is an
  unterminated `$$` or fence that renders as raw source.
- `resolveGenerationEngine` now leads its fallback order with `google`
  (`gemini-3.7-flash` is already that engine's `defaultModel`). The order only
  matters when there is no explicit `generationEngine` and more than one key is
  present, but that is exactly the first-run case, and the default engine is
  the one that gets asked for a diagram before anyone has chosen anything. An
  explicit choice in the settings file still wins.

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
- S04 keeps Mermaid behind a second static dynamic-import target. The eager
  entry grows only 1,114 bytes from S03; Mermaid core (1,097,914 B) and its
  per-diagram definitions remain lazy. No IPC/preload channel, provider key,
  web-view capability, or CSP exception is added: diagrams receive only source,
  theme, budgets, an abort signal, and a temporary renderer-owned DOM node.
- S05 adds a two-stage chart boundary: 15,357 B of lazy validation/lifecycle
  code loads for an accepted fence, then the 618,083 B Vega-Lite compiler and
  940,911 B Vega runtime load only after inline-data preflight. The eager entry
  grows 443 B and CSS 271 B from S04. Charts add no IPC/preload/CSP exception;
  their View receives a deny-all loader and is finalized before its sanitized
  static SVG becomes the note projection.
- S06 adds ordinary fenced-code placeholders plus broad CodeMirror metadata to
  the eager editor, but keeps source lint and every Shiki runtime/theme/grammar
  behind dynamic imports. The renderer entry is 2,454,528 B (+125,030 B from
  S01, 28,570 B below the 150 KiB ceiling), CSS is 140,228 B, and the first
  code doors are a 23,033 B adapter and 35,017 B diagnostic chunk. Shiki core
  (226,275 B), JavaScript regex engine (111,669 B), two ~14 KiB themes, and all
  reviewed grammar chunks remain absent from a no-code startup. No IPC/preload,
  worker, CSP exception, network, filesystem, or execution capability is added.
- Two mounted note bodies receive different rich render generations, so
  identical Mermaid/Vega SVGs cannot collide in the shared renderer document.
  Live widgets and every React read consumer still use the same hydration
  ownership: timeout, theme change, rerender, and unmount abort and detach the
  old generation; late third-party output cannot publish into the replacement.

## The open-target model (CP-OPEN-DOCK S02)

- `workspace/open-target.ts` is the ONE vocabulary for opening a note from a
  tree row, a link pill, or (S05) a tab move: `tab-current` / `tab-new` /
  `pane-right` / `pane-below`, each with its label and shortcut hint
  (`OPEN_TARGET_SPECS`) and a pure shortcut grammar (`openTargetForKey`:
  Enter = here, Mod+Enter = new tab, Mod+Shift+Enter = pane right,
  Mod+Alt+Enter = pane below).
- `openNoteAt(state, paneId, relPath, scope, target)` in `workspace/model.ts`
  compiles the four targets from existing primitives only: `updateTabParams`
  (adoption), `addTab`, and the generalized `openNoteInNewPaneAt` (the S06b
  convention function delegates to it with 'horizontal'). A chat scope keeps
  its reveal convention for `tab-current` and splits VAULT-typed panes beside
  the chat for the two pane targets. Ghost panes are identity.
- `OpenTargetMenu` is the discoverable surface: Mod+click on a tree row or
  rel pill opens a glass popover (36 tokens, `--z-menu`) whose four
  `role="menuitem"` entries show their shortcuts; Escape/arrows work, the
  first item is autofocused, and direct shortcuts (Mod+Enter / Shift / Alt,
  plus 1-4 number keys) execute immediately when the menu is open. Plain
  click, right-click, and Enter behavior are unchanged everywhere.
- All four targets leave the workspace SHAPE alone — no new state fields, no
  persistence change, no IPC. Docking (S03–S06) rides the same vocabulary.

## Move and dock primitives (CP-OPEN-DOCK S03)

- `pullTab(state, tabId)` is the ONE removal discipline now shared by
  `closeTab`, `moveTab` and `dockTab`: same collapse rule (an emptied leaf
  collapses into its sibling), same S06c12 guard (the last tree-bearing pane
  empties in place instead of vanishing), same S06c11 total-collapse landing
  (an empty VAULT-typed pane). `closeTab` behavior is unchanged — its 79
  existing tests pass unmodified.
- `moveTab(state, tabId, targetPaneId, index?)` is the only new primitive the
  2026-07-25 brainstorm named: moves a tab into another pane at a clamped
  index (append when absent), activates it there, focuses the target pane. A
  same-pane reorder is a same-pane move; a no-op slot move is identity.
- `dockTab(state, tabId, targetPaneId, side)` tears a tab out into a FRESH
  pane on `left`/`right`/`top`/`bottom` of the target: left/right split
  horizontally, top/bottom vertically, the fresh pane lands first or second
  so the side is real. The fresh pane INHERITS the source pane's tree (a
  project tab keeps its project panel; a chat tab a chat pane) and takes
  focus. A vanished target (the pull collapsed it) never loses the tab.
- Both compile to existing tree shapes — still no new state fields, no
  persistence format change, no IPC.

## Five-zone docking preview (CP-OPEN-DOCK S04)

- `workspace/drop-zones.tsx` owns the pure five-zone geometry (`computeDockZone`)
  and the translucent preview overlay (`DockPreview`). During dragover, hovering
  within 25% of any outer boundary previews a split on that side (`top` / `bottom`
  / `left` / `right`); hovering the inner 50% previews the `center` tab
  destination. Corners resolve deterministically to the closest edge; zero or
  negative dimensions fall back safely to `center`.
- `DockPreview` is a purely visual, `aria-hidden="true"`, `pointer-events: none`
  overlay that consumes bedrock 36 glass tokens (`--glass-pop`, `--accent`,
  `--radius-lg`, `--shadow-pop`, with `@supports not (backdrop-filter)` fallback).
  It renders the active destination boundary with a dashed accent frame and pill
  label before the drop commits, and cleans up completely on cancel or dragleave.

## Tree and tab docking (CP-OPEN-DOCK S05)

- Tree-row dragging (`TREE_DRAG_MIME`) and tab dragging (`TAB_DRAG_MIME`) are
  unified with five-zone docking. Dropping a tree row on a tabstrip opens it as a
  new tab in that pane (`openNoteAt` `tab-new`); dropping on an outer pane zone
  splits and docks a new note pane on that edge (`dockNote`).
- Tabstrip drops support reordering within the same pane and moving across panes
  with visual drop insertion indicators (`.tab.drop-before` / `.tab.drop-after`).
  Holding `Alt` during a tab drop duplicates the tab into the target pane (`addTab`).
- Keyboard equivalents are exposed directly on the tab titles: `Mod+Enter` moves/opens,
  `Mod+Shift+Left`/`PageUp` and `Mod+Shift+Right`/`PageDown` reorder within the strip,
  `Mod+Shift+Up`/`Down` and `Mod+Alt+Arrows` dock the tab into a new pane in all four
  directions (`top`, `bottom`, `left`, `right`).

## Pane-grip re-dock (CP-OPEN-DOCK S06)

- Each pane header includes a six-dot grip handle (`.pane-grip`, `GripVerticalIcon`)
  that is draggable (`PANE_DRAG_MIME`) and keyboard-operable.
- Dragging a pane grip onto an edge zone of another pane invokes `dockPane(state, sourcePaneId, targetPaneId, side)`,
  which tears the entire source pane (preserving its tabs, active tab, and tree configuration)
  and docks it beside the target pane along the requested side.
- In a two-pane workspace, dragging a pane grip to switch split orientation (horizontal ↔ vertical)
  projects an accurate 1/2 rectangle preview spanning the full width/height of the workspace container
  rather than a local 1/4 square, accurately matching the resulting collapsed-and-resplit layout.
- Dragging a pane grip onto the center zone (or tabstrip) of another pane merges all tabs into
  the target pane and closes the source pane (`mergePane`), inheriting tree configuration if the
  target was untyped.
- Keyboard equivalents on the pane grip (`Mod+Alt+Shift+Arrows`) re-dock the entire pane in any of the
  four directions relative to the workspace.


