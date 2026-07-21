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

## What it owns

- The Electron shell: app lifecycle, the trusted UI window, and the
  main/preload/renderer split (`apps/desktop/electron-main/`,
  `electron-preload/`, `renderer/` — directory names per 14).
- The security posture of that window: `SECURE_WEB_PREFERENCES`
  (`electron-main/security.ts`) pins 13's required settings; the renderer's
  CSP lives in `renderer/index.html`. The window is chromeless
  (`frame: false`): a GLOBAL app header (`AppHeader` — brand "atomik",
  the `AppMenu` ☰ dropdown holding theme + Mistral key + the S02
  generation-engine choice (mock | mistral), and
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
- Mechanical truth labels (06 §labeling rule, S10): `electron-main/truth.ts`
  (truth-core validator seat, 14 — validators never call AI). Providers
  submit ClaimCandidates that can assert FORM only (interpretive /
  needs-citation; the type admits nothing else); `labelClaims` computes
  every label: exact containment in a supplied selection → source-backed
  with hashed EvidenceRecord (quote + sha256, reproducible); no fuzzy
  matching by design (a paraphrase is model-only); derivability outranks
  asserted forms; smuggled labels fall to model-only (adversarial-tested).
  Panel UI: one chip per claim, [source] opens the anchor in the editor
  (select + scroll), [challenge] qualifies the claim inside the editable
  proposal — the repair patch preview accepted through the normal path.
- URL provenance on web-reader evidence (09/28, CP-MVP-006 S06):
  `electron-main/web-provenance.ts` resolves a `sources/web/<slug>/
  reader.md` selection to its dossier's identity (original_url,
  accessed_at, unquoted title) — CALLER-side in the `run-ai-operation`
  handler, so truth.ts/ai-mock.ts stay fs-free; `labelClaims` takes the
  resolved map and spreads it into `EvidenceRecord.source` (the
  url/dossierPath/accessedAt/title slice of 28's evidence sketch,
  renderer never asserts it). The relPath match is strict (one dot-free
  slug segment — can't climb out of sources/web/); resolution is
  best-effort by design (a broken dossier degrades to no-URL evidence,
  never a failed operation). Downstream: a new-note/append proposal
  from a web reader carries `Source: [title](url) — accessed date ·
  [dossier](relative-link)` (09 "create note with URL/provenance"; the
  dossier link is computed RELATIVE to the target note — root-absolute
  hrefs are dead clicks in the link router), and the AiPanel claim chip
  grows [page ↗] beside [source] (onOpenWebUrl threaded VaultView/
  ProjectView → EditorPane → AiPanel). E2E rung `ATOMIK_SMOKE_AI_WEB=1`
  seeds a fixture bundle and proves the whole chain on the real app.
- The ActionTrace ledger (S09, 33-minimal): `electron-main/action-trace.ts`
  (the execution-core seat, 14) — ONE JSON line per operation appended to
  `.atomik/usage/private/actions.jsonl` at DECISION time (drafts in
  memory; failures append immediately; quit flushes undecided). Exactly
  the S09 minimum in 06's ActionTrace shape: ids, deterministic location +
  provider/model identity, estimated tokens (named estimated, chars/4),
  wallMs, EUR 0 estimated external, status + decision, contentRecorded
  false — a test greps the ledger for prompt/selection text and fails if
  content ever leaks. Badge in the AI panel via `get-ai-trace-summary`;
  decision reported via `resolve-ai-trace` (fire-and-forget: telemetry
  never blocks UX).
- The AI patch loop (06, S08; REAL engines CP-MVP-008 S02): the typed
  `GenerationAdapter` seam in `electron-main/generation.ts` (the ai-core
  seat, 14) behind `atomik:run-ai-operation` — engines are PURE COMPUTE;
  identity travels in the answering adapter's output, so the renderer
  contract is unchanged from the mock era. Two engines:
  `ai-mock.ts` (S08, the deterministic offline path, still a selectable
  engine) and `mistral-generation-adapter.ts` — Mistral Small chat
  completions (model id PINNED `mistral-small-2603`, confirmed live
  2026-07-21; upgrades are a new dated decision), key via
  `readMistralKey` attached in MAIN only (13), budgets below renderer
  state (2k output tokens, 60s wall via AbortController, input token
  pre-check), and the eight-kind typed error taxonomy carried as
  `ai(<kind>): …` — offline / timeout / auth / rate-limit /
  provider-request / provider-server / cancelled / budget-exceeded —
  with NO silent fallback to the mock (13 explicit-policy rule).
  Engine selection persists in `ai-settings.json` beside the key
  (`atomik:set-ai-engine`; resolution: explicit choice, else 'mistral'
  when a key exists — the PROPOSED default until the S07 owner bench —
  else 'mock'). `atomik:cancel-ai-operation` aborts the in-flight call
  by operation id (the AiPanel shows Cancel while running). Claim
  candidates over real output are extracted deterministically
  (sentences, fences dropped, capped) and `labelClaims` runs unchanged
  — exact containment stays the only road to source-backed (28).
  Traces (33): provider-reported usage preferred over estimates, each
  labeled; external cost estimated in USD from the dated snapshot
  `docs/research/model-research.md@2026-07-20` (upper bound), snapshot
  id in the line; cloud lines wear `location: 'cloud-model'` +
  `privacy.mode: 'cloud'`, `contentRecorded` stays false. The
  env-gated `ATOMIK_SMOKE_AI_LIVE=1` rung proves the live chain
  (engine switch, one real completion, cloud trace, mid-flight cancel;
  honest `skip:no-key` without a key).
  SCOPED PROMPT FOLDERS (S03, owner amendment 2026-07-21):
  `renderer/src/editor/prompts.ts` — a `prompts/` folder may live at
  the vault root, in ANY folder, and in a project bundle (a project IS
  a folder, so ONE walk covers all scopes); resolution NEAREST-WINS
  from the note outward with same-name shadowing (a project overrides
  a root prompt), scope tags keep shadowing visible; a prompt file is
  markdown + frontmatter `kind: system | message` (+optional
  title/description), non-prompts in prompts/ are skipped (never an
  error), index/log convention files excluded; scanned through the
  EXISTING verbs (`listVaultFiles`/`readNote` injected — zero new
  IPC). Message prompts join the AiPanel preset row (click loads the
  body); system prompts feed a selector whose body rides
  `AiOperation.systemPrompt` (bounded 8k in `isValidAiOperation`) —
  it replaces the built-in IDENTITY line only; the exact-quote
  grounding rules, destination brief, and no-preamble rule are
  composed main-side REGARDLESS (no prompt file opts out of the
  mechanical contract, 28). Starters materialize ONLY via the
  explicit ☰ → "Create starter prompts" action
  (`materializeStarterPrompts` — idempotent, missing-only, createNote
  births the folder with its S07k conventions; no writes on open).
  `renderer/src/editor/AiPanel.tsx` docks the loop in the editor:
  selection (or whole note) → instruction/preset → destination
  (replace-selection / append / new-note, path prefilled beside the
  note) → bundle review → EDITABLE proposal → accept = apply to the
  buffer AND save immediately (the preview is the review; Ctrl+Z + save
  reverts) or createNote for new notes (tree refreshes, note opens);
  buffer-drift guard before apply. The AI channel has no filesystem
  path — "AI wrote my file" is structurally impossible.
- The editor (S07 + MVP-001 feedback): `renderer/src/editor/EditorPane.tsx`
  — CodeMirror 6 over the RAW note (frontmatter included, no template, no
  normalization; 11/27) with optimistic conflict detection: saves carry
  the mtime from the last read; `writeNote` refuses stale writes with a
  'conflict' error and returns the new mtime, chaining save after save.
  Save policy is AUTO by default (owner feedback): debounced 800 ms after
  typing pauses, flush when the editor unmounts (note switch/tab close),
  save-then-switch on Read — no discard prompts; the button + Mod-s stay.
  'manual' (note-bar toggle, app-wide `saveMode` workspace setting —
  the settings map also carries `theme`: system/light/dark + five soft
  pastels, picked from the top-row selector next to the window controls;
  `<html data-theme>` + color-scheme drive every light-dark() token and
  the editor's oneDark follows through a compartment)
  restores strict S07 behavior with its confirm guards. Auto-save NEVER
  forces: a conflict pauses it until the banner is resolved by a human.
  Note modes are read / live / source (`mode` param per tab; retired
  'edit' maps to source via `noteModeOf`). LIVE is the default: the
  seamless Obsidian-like surface — `editor/live-preview.ts` decorates
  the raw buffer from the syntax tree (headings sized, marks hidden,
  links collapsed, bullets, quote/fence lines; leading frontmatter
  styled as one dim unit with markdown suppressed inside), and any line
  the selection touches reveals its full syntax. Blocks render too
  (follow-up feedback): fenced code nests real language highlighting
  (js/ts/jsx/tsx/html/css packs; others plain), task markers become
  clickable checkboxes that write back through ordinary transactions
  (dirty/auto-save/undo apply; checked items struck), horizontal rules
  draw as rules, tables style mono with dimmed pipes and bold header
  cells. Ctrl/Cmd+click follows internal links (`linkHrefAt`; plain
  click places the cursor; external schemes inert until a vetted
  opener, 13). Live is gutter-free; line numbers/folding/active-line
  are SOURCE chrome (basicSetup retired, extensions composed by hand).
  Pure StateField — unit-tested headless; decoration-only, so 11/27
  byte fidelity is untouched. live<->source reconfigure ONE EditorView
  through a compartment (buffer/undo/selection survive); only the
  switch to read passes the save-first gate. GFM base.
  One EditorView per mounted pane, keyed by note path; view lives in a
  ref (mount-only).
- The capture session server (08/13 §capture, CP-MVP-002 S02):
  `electron-main/capture-session.ts` (incubating capture-core, 14) — a
  short-lived `node:http` endpoint bound to the FIRST non-internal IPv4
  (never 0.0.0.0; loopback fallback offline) that the owner's phone
  uploads originals to. One session at a time: `start` mints a random id
  + one-time token (the token IS the QR capability, carried in
  `uploadUrl`), `stop`/expiry (5 min default)/app-quit invalidate it, and
  the server listens ONLY while a session is active — no port stays open
  between sessions; a new `start` kills the previous token. The port is
  STABLE by default (`DEFAULT_CAPTURE_PORT` 41414, `ATOMIK_CAPTURE_PORT`
  overrides; taken port → ephemeral fallback): a random port per session
  would defeat any targeted firewall rule (WSL2 mirrored-networking
  finding, owner dogfooding). Uploads pass
  four gates below the renderer: token (timing-safe compare), size cap
  (Content-Length early + streamed count, 25 MB default), content SNIFFING with
  the declared MIME pinning only the media FAMILY — bytes outrank labels
  (owner report: Android declares .m4a as audio/mpeg; client labels are
  unreliable everywhere). Known signatures: images jpeg/png/webp/heic;
  audio m4a/webm/ogg/mp3/wav. ISO-BMFF splits by ftyp brand (heic-family
  brands = image, everything else = m4a audio); WAV and WEBP are both
  RIFF, split by sub-brand. Unknown content, or content whose family
  contradicts the declaration, is refused; what is stored — extension
  and canonical MIME — is what the bytes ARE, with the client's declared
  MIME kept in the meta sidecar for provenance. The phone page carries both inputs
  (photo with camera hint; audio with recorder hint), one shared upload
  path. DESKTOP MIC (owner request): CaptureView records via
  MediaRecorder in the trusted renderer and hands the bytes to main over
  `add-local-capture`, which runs the SAME gates and lands the SAME
  inbox shape (shared `storeUpload`); with no usable session a LOCAL
  record is created lazily — stopped, `uploadUrl: ''`, never reachable
  from the network. The permission posture is now EXPLICIT in main:
  only 'media' is granted, only to app content; every other permission
  request is denied outright. m4a arrives as audio/mp4, audio/x-m4a, or
  the nonstandard audio/m4a — all aliased. Accepted files land in a
  temporary inbox under the STATE DIR
  (`.atomik/capture-inbox/<sessionId>/<seq>-<uploadId>.<ext>` + a
  `.meta.json` sidecar) — never the vault; the inbox→vault import is
  S04's explicitly confirmed step in main. Client file names are display
  metadata only (sanitized); names on disk are server-chosen. Auth
  failures are a uniform 403 (no id/token/expiry oracle). The phone page
  (S03) is a self-contained HTML string served by the same endpoint —
  one `<input type="file" accept="image/*" capture="environment">` (the
  `capture` hint opens the camera where supported and DEGRADES to the
  ordinary picker elsewhere), fetch-POST of the raw file, extension
  fallback for pickers that hand over an empty MIME, human messages per
  status code; it derives its upload URL from its own address
  (`/c/` → `/u/`, token kept). The desktop side is the `capture` tab
  kind (03; `renderer/src/capture/CaptureView.tsx`): start/stop session,
  QR of `uploadUrl` (qrcode lib, rendered renderer-side — the URL is a
  display capability, not a secret from the user), live countdown +
  2 s inbox polling over `get-capture-session`, received-uploads list
  with the S04 per-item decision: Import… (prefilled editable title +
  destination) or Discard. `electron-main/capture-import.ts` is the ONLY
  inbox→vault path — explicit, in main, per 07/08 bundle conventions:
  `sources/captures/<date-slug>/` gets `original.<ext>` byte-exact,
  `source.md` (Atomik Source frontmatter: resource, capture method/mime/
  original name/received-at, `status: captured`, S06 seats in the body)
  and `index.md` (directory map); every file written `wx` and a
  destination holding any bundle file is refused before a byte lands
  (mid-write races cleaned up). Destination paths run the same
  validator as project folders (`resolveProjectDirPath`); each inbox
  item is decided exactly ONCE (`getUpload`/`resolveUpload`; both
  decisions clear the inbox files, imports record `importedTo`).
  WSL2 phone-reachability runbook (owner-walked 2026-07-07): (1)
  `networkingMode=mirrored` under `[wsl2]` in `%UserProfile%\.wslconfig`
  + `wsl --shutdown` — WSL then shares the Windows LAN address
  (verified: `detectLanHost` picks the real `192.168.x.x`, and prefers
  it over VPN interfaces only by enumeration order — revisit if a VPN
  interface ever enumerates first); (2) the Hyper-V firewall still
  blocks INBOUND LAN connections to WSL listeners by default — allow the
  capture port once, admin PowerShell:
  `New-NetFirewallHyperVRule -DisplayName "atomik capture" -Direction
  Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}'
  -Protocol TCP -LocalPorts 41414 -Action Allow` (that GUID is WSL's
  VM-creator id; on setups without the HyperV cmdlets use plain
  `New-NetFirewallRule ... -LocalPort 41414`); (3) phone on the same
  Wi-Fi, no AP isolation, phone-side VPN off. Owner-validated end to
  end 2026-07-07: phone photo → QR page → upload → confirmation import
  → bundle in the live vault.
- The image source tab (08 §MVP flow, S05): tab kind `source-image`
  (params: `dossierPath`) — `renderer/src/source/SourceImageView.tsx`
  shows the ORIGINAL (data URL from `read-source-asset`; viewer only,
  07's viewer≠extractor split) beside the rendered `source.md`, whose
  relative .md links open in place. The original is located through
  the dossier's frontmatter `resource:` line (`source/dossier.ts`,
  pure). Entry points: [View] on imported rows in the capture tab, and
  a "View original" pill in the vault read-mode note-bar whenever the
  open note declares an image resource — so bundles stay reachable
  after the capture session is gone. AUDIO originals (S08) render as an
  <audio controls> player in the same tab (same read-only data-URL
  channel; the asset/transcription extension maps gained the audio
  types; the View-original pill gates on hasMediaResource). The
  transcription pipeline is UNCHANGED for audio — same adapter
  contract; the mock decodes nothing, so the trace's audioSeconds
  stays null rather than manufacturing precision (33) until a real
  runtime reports it. Import labels links/anchors by media kind.
  ROTATION (owner correction —
  some phone photos arrive sideways): a display rotation (0/90/180/270)
  recorded in the dossier frontmatter (`atomik.capture.rotation`,
  `rotationOf`/`withDossierRotation` pure in source/dossier.ts), edited
  by ⟲/⟳ buttons on the image tab through the ordinary writeNote
  handshake. The ORIGINAL bytes are evidence (07/08) and are never
  rewritten: `read-source-asset` returns the sibling-dossier rotation
  (`sourceAssetRotation`, resource-name matched), and every viewer —
  image tab, read inline, live widget — redraws the pixels on a canvas
  at display time (`source/rotate.ts`). Read-mode notes also INLINE
  vault images: every relative `<img>` with an allowlisted extension is
  swapped for a data URL fetched through the same channel
  (`vault/note-images.ts`, pure collect/inline pair; failures keep the
  broken src — honest, like a broken link). LIVE mode renders embeds
  too (owner report): the `Image` node becomes an ImageWidget away from
  the cursor (touched line reveals raw syntax; click puts the cursor on
  the embed) — async data-URL cache + `imageCacheBump` effect recompute,
  note path supplied via `notePathFacet`; `resolveEmbedPath` accepts
  `<…>`/percent-encoded destinations and refuses root escapes.
  IMAGE BYTES live in ONE shared BOUNDED cache (`vault/image-cache.ts`,
  64 MB LRU, rotation baked into the cached data URL; perf audit
  2026-07-15): live widgets and read-mode inlining consult the same
  entries — an autosave no longer re-fetches every inline image over
  IPC — and the cache is CLEARED on vault switch (App.tsx global
  subscription; same relPath ≠ same file) and INVALIDATED per asset
  when a rotation lands (SourceImageView.rotate). Both were live-mode
  staleness BUGS before (old vault's bytes / pre-rotation pixels served
  until restart). And the
  editor gained "@" QUICK ACTIONS (`editor/quick-actions.ts`, the only
  registered autocomplete source): `@` lists every source bundle
  (folder holding source.md), filtered as you type; picking one inserts
  a ready image embed (angle-bracketed destination, space-safe) or a
  dossier link when the bundle has no image. Providers beyond captures
  can join the same menu later.
- The transcription seat (07/08/33, CP-MVP-002 S06):
  `electron-main/transcription.ts` — a REPLACEABLE adapter contract
  (`TranscriptionAdapter`: job in, markdown + full model/runtime/version
  identity out) holding a deterministic MOCK (same bytes → same output;
  it states plainly that no recognition ran — fabricating a transcript
  would be exactly the dishonesty 08 forbids). A real local runtime may
  take the seat only through a dated capability evaluation (34). The
  pipeline (`transcribeSource`, main-only): dossier → resource →
  original (containment + image allowlist) → adapter → `transcript.md`
  written `wx` and VISIBLY derived (Atomik Transcript frontmatter:
  `derived: true`, `correction_state: model-output`, full transcription
  identity + `action_trace_id`; banner heading) → dossier updated
  through the mtime handshake (status → transcribed, transcription
  block, extracted-representations link; transcript cleaned up if the
  dossier write races). It REFUSES to clobber an existing transcript —
  S07's human corrections live there. Every run appends exactly ONE
  ActionTrace line (`action: 'transcribe'`, 33 fields: runtime identity,
  input bytes + sha256 content hash — never content —, `audioSeconds`
  null until the S08 audio companion; the trace id pre-generated so the
  files can reference it). UI: a Transcribe button in the image tab's
  dossier bar when no transcript exists yet. The HUMAN CORRECTION flow
  (S07): saving a bundle's transcript.md through the ordinary editor
  save (`recordTranscriptCorrection`, hooked after `write-note` in main;
  bookkeeping never fails the save, a racing dossier retries on the
  next save) flips the DOSSIER to `correction_state: human-corrected`
  + `corrected_at`, and its transcript link says so — the transcript's
  own bytes stay exactly what the user saved (27); the dossier is where
  correction state lives (07/08). Editing keeps the original one click
  away: the editor note-bar shows the View-original pill whenever the
  open note declares an image resource (dossier AND transcript both
  do).
- The whisper CUDA tier (33 device tiers, CP-MVP-005 S02):
  `whisper-adapter.ts` takes an optional `cudaBinary` (env
  `ATOMIK_WHISPER_BIN_CUDA`, default `speech/cuda/whisper-cli` in the
  state dir) tried FIRST and demoted for the session on its first
  failure — later jobs pay no failing attempt; the CPU floor answers
  everywhere else and CPU-only machines see zero change. Which tier
  answered is visible in identity (`runtimeVersion` gains `+cuda`) and
  therefore in every trace. Sidecar installs are SELF-CONTAINED: the
  adapter exports `LD_LIBRARY_PATH=dirname(binary)` to the child
  (RUNPATH loses to LD_LIBRARY_PATH, so libs beside the binary win) —
  found because the S05 CPU install silently resolved its `.so` files
  from the BENCH BUILD TREE via runpath; both installs now carry their
  libs. Measured on the owner machine (2026-07-08): owner memo 1.83 s
  CUDA (sealed CPU transcript reproduced byte-equal with `-l auto`),
  181 s fixture 5.7 s CUDA vs 14.7 s CPU (2.6×). Trap re-met during
  verify: whisper.cpp WITHOUT `-l auto` silently TRANSLATES French to
  English — the adapter always passes it; never hand-verify without it.
- The OCR seat (07/08/33, CP-MVP-005 S03; owner decision on the
  CP-MVP-004 evaluation): `ocr-adapter.ts` seats Qwen3-VL 4B Q4_K_M
  (Apache-2.0) behind the SAME `TranscriptionAdapter` contract via
  `llama-mtmd-cli` — bounded job, 600 s timeout + SIGKILL, tmp workdir,
  image in / text out, zero vault access. `transcription.ts` gains
  `routeByMedia(audio, ocr)`: images → OCR seat, audio → whisper seat;
  identity always comes from the adapter that answered. THE PROVEN
  HARNESS from the bench is structural: main PRE-RESIZES the image to
  ≈2 500 tokens (pixels/784, dimensions multiples of 28, never
  upscaled) with Electron's own `nativeImage` (15: no new image
  dependency; the resizer is INJECTED so tests stub it — vitest has no
  Electron) — llama.cpp's `--image-max-tokens` is broken for this model
  (stalls, dated refs in the record). CUDA tier first with sticky
  per-session demotion, CPU floor fallback, mock last; runs on the
  benched PR#24975 NO_VMM builds (REQUIRED on this WSL2 — master's
  CUDA build hits the VMM bug). Installs self-contained under
  `.atomik/ocr/{cpu,cuda,models}` (sha256 recorded in the record); env
  overrides `ATOMIK_OCR_BIN[_CUDA]/MODEL/MMPROJ`. Installed-seat verify
  2026-07-08: 3.85 s CUDA on the pre-sized Leibniz page. Known honest
  gaps: HEIC/HEIF likely unreadable by nativeImage on Linux (resizer
  rejects → trace failed, no fabrication); the seat prompt is the bench
  standard FR transcription prompt.
- The cloud OCR rung (13/28, CP-MVP-005 S05): `mistral-ocr-adapter.ts`
  — Mistral OCR behind the SAME TranscriptionAdapter contract, invoked
  ONLY by the new typed channel `transcribe-source-cloud` behind an
  explicit renderer button ("Cloud OCR", whose title says it SENDS the
  image) — never a silent fallback (13: explicit policy before local
  falls back to cloud). Model id PINNED `mistral-ocr-4-0` (benched
  letter-perfect on the bench scans 2026-07-08); upgrades are a new
  dated decision, not alias drift. The key resolves main-process only
  (env `MISTRAL_API_KEY`, then the git-ignored `.env.local`); absent
  key = explanatory refusal, nothing leaves the machine. The result
  rides the ordinary pipeline so `location: 'cloud-model'` + provider
  identity land in transcript frontmatter, dossier, and trace; the
  no-clobber rule holds (delete the local transcript to escalate — the
  same explicit re-run rule as everywhere). fetch with AbortController
  (180 s); bytes go as a data URI, original untouched.
- PDF as source (10, CP-MVP-003 S03): `electron-main/pdf-import.ts` +
  channel `import-pdf-source` (main-process file dialog; ＋PDF button in
  the sources tree opens the new dossier). The `%PDF-` magic outranks
  the file label and is checked BEFORE the vault is touched; 200 MB cap;
  slug dedupe (numbered siblings, never overwrite); `wx` + cleanup on
  failure; sha256 + byte count land in the dossier (10 §evidence). The
  result is the standard `sources/pdf/<slug>/` bundle — `original.pdf`
  byte-untouched evidence + `source.md` dossier + `index.md` map —
  through the same gates as captures. `sources/pdf/` is `.gitignore`d
  (same personal-media class as captures; the 2026-07-09 incident fix —
  new user-media zones enter `.gitignore` at bundle-type creation).
- The PDF viewer (10/13, CP-MVP-003 S04 + S06d/g/h + S07):
  `renderer/src/source/PdfView.tsx` inside the source-image tab —
  pdf.js 6 in the SANDBOXED renderer, worker from the LOCAL bundle
  (CSP forbids remote), display-only (renderer fidelity and extraction
  fidelity are separate claims). First render waits for the
  ResizeObserver's real measurement (the 0-width mount race) and
  follows pane resizes; exactly ONE render at a time — the previous
  RenderTask is cancelled first, `RenderingCancelledException` is the
  mechanism working, not an error; ONE scrollbar — the parent pane
  yields scrolling via `:has(.pdf-view)`, the page nav is sticky. Page
  turns persist as the tab's `page` param (03 recoverable UI state,
  `pdfPageOf`) and restore on reopen; a citation-return jump outranks
  the restored page. Rotate tools don't apply to PDFs (rotation is a
  photo correction).
- PDF text extraction (10/28/33, CP-MVP-003 S05/S05b):
  `electron-main/pdf-extract.ts` + `pdf-text.ts`, channel
  `extract-pdf-source` — pdf.js LEGACY build in MAIN, so extraction
  claims never come from the display path. Per-page `## Page N`
  sections land in a visibly DERIVED `extracted.md` (frontmatter:
  engine identity, OCR pages, `action_trace_id`,
  `correction_state: model-output`); pages under 20 chars are
  image-only and rasterize via system `pdftoppm` (ffmpeg precedent:
  absent tool = honest per-page placeholder) into the SEATED OCR
  pipeline; ONE 'extract' ActionTrace per run — `deterministic` when
  pure text-layer, `local-model` when OCR pages ran; failures traced
  too. `wx` no-clobber: corrections live in extracted.md once a human
  touches it (editing it flips the dossier human-corrected — the same
  hook as transcript.md); `Delete extraction…` (`resetExtraction`) is
  the explicit delete/re-run affordance, round-trip tested (the
  lifecycle ships WITH the artifact — owner feedback, standing
  practice).
- PDF anchors + citation return (05/10, CP-MVP-003 S06/b/c/e): "⚓
  anchor page N" writes a durable row to the dossier's Useful-anchors
  table whose Target IS a markdown link `[page N](./original.pdf#page=N)`
  (`withPageAnchor` — pure, idempotent; the citation is a file edit).
  The @ quick-actions menu inserts complete PDF citations (relative
  link with the page digit pre-selected — bundle paths are never
  hand-typed), EVERY recorded anchor as an exact citation
  (`pageAnchorsOf`), and derived-text quote blocks (read at APPLY, not
  at menu; source link at head). Any `…/original.pdf#page=N` click —
  dossier-internal or cross-note — opens the SOURCE VIEW at that page
  via the pending-page registry (`pdf-open.ts`); bare `original.pdf`
  and dossier `source.md` links route there too (sources open in the
  source view).
- The web tab (09/13, CP-MVP-006 S03; engine decision:
  atomik-project/sessions/2026-07-13-web-engine-decision.md): tab kind
  `source-web` — the trusted UI renders only the browser CHROME
  (`renderer/src/web/WebView.tsx`: URL bar, back/forward/reload-stop,
  honest load-failure strip); the page itself is an isolated
  WebContentsView owned by MAIN (`registerWebViewHandlers` in index.ts,
  gates in `electron-main/web-view.ts`): the four required settings +
  `persist:web-sources` partition and NO preload — zero bridge surface,
  the live page can never reach the vault (13 source security rule).
  Session posture applied once: UA normalized to plain Chrome (the
  recorded login-wall mitigation), permissions deny-by-default
  (fullscreen + clipboard-sanitized-write only), downloads cancelled,
  popups denied with browse-in-place. http(s)-only is enforced in MAIN
  (`isAllowedWebUrl`) on ensure, navigate, will-navigate and popups —
  whatever the renderer asked. The renderer reports the placeholder's
  rect (ResizeObserver + window resize + per-render check for
  divider-drag moves); geometry channels are tolerant of the
  ensure/report race; overlays that could sit under the native view
  take the `web/overlay.ts` guard (the settings panel does). The URL
  rides the tab's `url` param (03) — the tab label becomes the
  hostname, restore reloads the page; tab SWITCHES only hide the view,
  so a running page (a Colab session) survives; tab CLOSE destroys it
  (both close paths call `destroyTabView`). E2E probe: ATOMIK_SMOKE_WEB
  (below). Google-auth compatibility: the exact hosts
  accounts.google.com/accounts.youtube.com get a FIREFOX presentation
  (pinned UA, Sec-CH-UA stripped, JS-visible UA switched per
  navigation) — the dated S03c mitigation, owner-validated; everywhere
  else stays normalized Chrome.
- Live reader mode (09, CP-MVP-006 S06; owner: Obsidian-style reader on
  the web viewer): an "Aa reader" toggle in the web nav renders the
  CURRENT page as clean text IN PLACE — no file, no import. Channel
  `web-view-reader-text` → main runs `executeJavaScript` for the live
  post-JS `outerHTML` and feeds it to the SAME extraction core as the
  snapshot import (`readerFromHtml`, structure-first + tables), with an
  EMPTY resource map so remote images simply drop (a transient read is
  text+structure; durability with local media is Import-as-source). The
  renderer renders the returned markdown with markdown-it (html:false —
  never the page's own markup) into a `.web-reader` overlay on the
  content surface, and HIDES the native view while reading (the toggle
  extends the visibility rule: visible only when uncovered AND not
  reading). Reader button gates on view-EXISTS, not load-complete (some
  pages never settle); a REAL navigation (origin+path change, hash
  jitter ignored) drops the reader, an in-page anchor jump doesn't.
  E2E probed: ATOMIK_SMOKE_WEB_READER clicks "Aa reader" on live
  Wikipedia → 23 headings extracted, persists, button flips ✕ reader.
- Web import as source (09, CP-MVP-006 S04): `electron-main/web-import.ts`
  + channel `web-view-import-source` behind the EXPLICIT "Import as
  source" button in the web nav (09: never automatic). Lands
  `sources/web/<slug>/`: `snapshot.mhtml` — the page AS RENDERED via
  `savePage(…, 'MHTML')`, sha256 + bytes in the dossier — plus
  `source.md` (09 evidence metadata: original/canonical URL,
  accessed_at, author/publisher/published/updated when the page's meta
  tags offer them, license row "not reviewed" until a human fills it)
  and `index.md`. EVERY page-controlled string is hostile until
  sanitized (`cleanMetaText`: one line, control chars gone, `|`/backtick
  stripped, capped; YAML-quoted title; canonical dropped unless
  http(s)) — frontmatter/markdown-table injection dies in tests. Slug
  from title with URL fallback, numbered siblings, wx + full-bundle
  cleanup on any failure (a failed savePage leaves NOTHING). Metadata
  probe is a read-only one-shot `executeJavaScript` with a 3 s race —
  a hostile/hung page falls back to title+URL. On success the dossier
  opens in a new vault tab. `sources/web/` entered `.gitignore` in the
  SAME commit (the 2026-07-09 incident rule; snapshots of logged-in
  pages are personal). SourceImageView's web panel: "Open live page ↗"
  (→ web tab) + "Open snapshot" (external), Extract/Delete reader.
- Web reader extraction (09/28/33, CP-MVP-006 S05):
  `electron-main/web-reader.ts` (+ `mhtml.ts` for the snapshot parse),
  channels `extract-web-reader` / `reset-web-reader`. The captured
  `snapshot.mhtml` becomes a visibly DERIVED `reader.md` — the page's
  main content as Markdown, TEXT AND IMAGES: `mhtml.ts` parses the
  multipart snapshot (quoted-printable/base64 decode), linkedom builds
  the DOM, Readability picks the article (charThreshold 200; falls back
  to the full body so reader.md is never empty on app-like pages),
  turndown+gfm emits Markdown, and every article `<img>` (mhtml-part OR
  data: URI) lands in `media/` hashed with its markdown ref rewritten
  relative. Validation, file writes, the dossier handshake, and the
  trace run in MAIN over the ON-DISK snapshot — never a re-fetch
  (bedrock 09), never the display path (the 10 fidelity split) — but
  the CPU SLAB (mhtml parse + DOM builds + Readability + turndown)
  rides a utilityProcess WORKER (`reader-worker.ts`, second build
  entry; perf audit 2026-07-15: 834 ms measured in-main for a 650 KB
  page, worker-probe shows worst main stall 13 ms). `index.ts`
  `runReaderJob`: fork per job, 120 s timeout+kill, in-process fallback
  if the fork fails; `extractWebReaderAsync` takes compute INJECTED
  (unit-tested with stubs — success parity, failure cleanup + failed
  trace, same-bundle concurrency refusal); the live "Aa reader" rides
  the same worker. ONE
  deterministic 'extract' ActionTrace per run (failures traced too);
  `wx` no-clobber; `reader.md` frontmatter carries engine identity +
  trace id + `correction_state: model-output`; dossier flips
  status→extracted with `reader_text`/`reader_trace_id`; `Delete
  reader…` (`resetWebReader`) removes reader.md AND media/, restoring
  the pre-extraction shape (the owner's standing delete-with-create
  rule, round-trip tested). The correction-flip hook now serves THREE
  derived files (transcript.md, extracted.md, reader.md) — editing
  reader.md flips the dossier human-corrected. SourceImageView renders
  a web-source panel for web dossiers (live-page + snapshot buttons,
  Extract/Delete reader) instead of an image/pdf; transcribe/OCR/
  rotation are gated off web. Proven on a real Wikipedia capture:
  92 KB Markdown + 116 SVG math renders in media/ (the study-math
  case, the S02 defuddle re-bench trigger not yet needed).
  S05e (owner: "récupérer les balises de hiérarchie" + "répéter les
  en-têtes fusionnés"): STRUCTURE-FIRST extraction. Readability RASED
  every section heading on Wikipedia Parsoid HTML (h2/h3/h4 → gone, a
  149 KB flat wall) — so `findContentRoot` now picks the real content
  container (mw-parser-output / main / [role=main] / article / CMS
  wrappers; first match with ≥500 chars AND a heading) and `stripChrome`
  removes nav/toc/navbox/editsection/reflist furniture ourselves,
  keeping headings/lists/tables; Readability stays the FALLBACK for
  generic article pages with no strong container. Merged table cells
  are EXPANDED (`expandCellSpans`: colspan cloned per column, rowspan
  carried down a span-aware matrix) so spanned tables become regular
  and promote to real pipe tables instead of flattening. The G7 reader
  went from 0 headings to 7 h2 + 5 h3 + 4 h4, 4 pipe tables, no raw
  HTML — a structured note.
  S05b (owner dogfooding, three bugs): media dedup is by CONTENT hash,
  not src URL — two URLs with identical bytes (a shared icon) collapse
  to ONE media file (the EEXIST that wedged a bundle); the failure path
  AND a stale `media/` from an earlier failed run are cleared before
  writing, so extraction SELF-HEALS a bundle stuck with orphan media/
  and no reader.md (neither re-extract nor delete could proceed);
  `.svg`/`.gif` joined the asset allowlist + the inlinable set so the
  math renders actually show in reader.md (they were fetched-then-
  rejected before).
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
self-validated as prompts),
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
CodeMirror typing/save flow and the AiPanel interaction flow are
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
  reading 28 first (path trigger);
  a dedicated ai-panel tab kind when context grows beyond selection-first
  (26 trigger).
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

## Direct URL import + snapshot preview (S07e-c, owner bench)

- Owner bench on S07e-b: the Import page's web card must IMPORT, not
  open a browser — "paste a URL, click Import, it lands as a source,
  the dossier opens, and the snapshot previews like any other original".
- `importWebUrl` (typed channel): main validates the URL
  (isAllowedWebUrl), loads it in a HIDDEN guest — same partition, same
  session gates (UA normalization, auth-host Firefox profile, popups
  denied, http(s)-only navigation), 45 s load timeout + 1.5 s settle —
  then the EXACT importWebSource path lands the bundle (sanitizers,
  wx, provenance); the guest is removed and closed either way. Still
  explicit: one typed URL, one click, one bundle.
- `webViewShowSnapshot` (typed channel): renders a bundle's
  snapshot.mhtml where other sources show their original. Pure gates in
  web-view.ts (tested): `isSnapshotRelPath` (clean relative path,
  basename snapshot.mhtml, no dots/absolutes/backslashes; main still
  realpath-checks via assertInsideVault) and `snapshotWebPreferences`
  (four required settings, EPHEMERAL `snapshot-preview` partition —
  zero cookies, nothing shared with the live web session, permissions
  denied, downloads cancelled, will-navigate always prevented: evidence
  is static). The view joins the shared registry, so bounds/visibility/
  destroy work like any web view.
- Renderer: `source/SnapshotView.tsx` mirrors WebView's geometry
  discipline (rect reports, overlay guard, destroy-on-unmount);
  SourceImageView's web panel = slim identity bar (host, Live ↗,
  External) over the filling preview. The Import card drives
  importWebUrl with the pure `webImportUrl` normalization.
- E2E rungs: ATOMIK_SMOKE_WEB_URL_IMPORT=<url> (real Wikipedia import
  proven: bundle + non-empty snapshot on disk) and ATOMIK_SMOKE_SNAPSHOT
  (fixture with a web-dossier tab: bar=en.wikipedia.org, dossier text
  rendered, snapshot host sized — capturePage cannot see native views,
  so the painted pixels stay an owner-bench item).
