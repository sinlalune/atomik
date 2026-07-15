---
type: Atomik Session Record
title: Performance audit — global metrics + every component
timestamp: 2026-07-15T14:30:00Z
tags: [performance, audit, electron, renderer, main-process, editor]
base_commit: 1e66314
---

# Performance audit (2026-07-15)

Owner request: "assess app perf both globally and inside every component."
Method: measured numbers first (real modules, real machine), code-level
audit second (three parallel read passes over renderer, editor/content
pipeline, and main process — every component read), findings merged and
magnitudes CALIBRATED against the measurements. No code was changed.

## Verdict

The app is healthy at current dogfooding scale: idle CPU is exactly 0%,
launch-to-content < 2 s, the editor hot path is sub-frame for normal
notes, saves/writes are cheap and well debounced, and there are no
runaway loops. The real perf debt sits in five structural patterns that
will bite as vaults, notes, and media grow — plus one environment fact
that dwarfs all app code on the dev machine (WSLg renders everything in
software). Ranked actions at the end.

## Global metrics (measured on the owner machine, WSL2/WSLg, warm cache)

| Metric | Value |
| --- | --- |
| Bare Electron floor (window shown, trivial page) | boot 48–62 ms, +72–90 ms window loaded, ~0.5 s process wall |
| App launch → Dev Docs rendered (smoke marker, prebuilt, 4 runs) | 1.70–1.82 s |
| Renderer bundle (eager, single chunk) | 2 977 KB JS + 49 KB CSS (+1 255 KB pdf.worker fetched lazily) |
| Idle CPU (all processes, 10 s sample) | 0 ticks — literally zero |
| Memory, one app instance at rest (RSS sum; shared pages double-counted) | ≈ 630–680 MB: main ~153, GPU ~146, renderer 115–184, utility ~74, zygotes ~120 |
| Memory, empty-Electron floor same machine | ≈ 435–455 MB → app adds ~180–230 MB |
| IPC round-trip floor (invoke, sandboxed preload) | 311–330 µs |
| GPU features under WSLg | ALL software: gpu_compositing disabled_software, rasterization/webgl/opengl unavailable, 2d_canvas software |

Bundle attribution (sourcemap, share of original source): editor stack
(CodeMirror + lezer) ≈ 38 %, pdf.js ≈ 24 %, react-dom ≈ 15 %, markdown
pipeline (markdown-it + entities + linkify) ≈ 7 %, app code ≈ 7 %,
qrcode ≈ 2 %. Zero `import()` anywhere — everything parses at startup.

## Measured operation costs (real modules, node, warm cache)

| Operation | Cost |
| --- | --- |
| listVaultFiles — repo-as-vault (~330 md) / synthetic 1000 notes | 3.1 ms / 3.4 ms |
| searchVault — hit w/ caps ("atomik", 1000 notes) | 4.2 ms |
| searchVault — MISS = full scan of 26 MB corpus | 57–64 ms |
| searchVault — repo corpus, "electron" (47 files hit) | 10–13 ms |
| readNote — 1 MB / 8.7 MB (near cap) | 0.9 ms / 9.5 ms |
| readSourceAsset — 8 MB binary → base64 | ~15 ms (+IPC clone) |
| readerFromHtml — 650 KB article (web reader/import path) | **826–834 ms, synchronous in main** |
| markdown-it render — rich 200 KB / 1 MB (read mode) | 33 ms / 138 ms |
| lezer full parse — rich 200 KB / 1 MB (editor open, amortized) | 77 ms / 210 ms |
| Full-tree iterate (live-preview per-recompute walk shape) | 4.8 ms @200 KB (31 k nodes) / 21 ms @1 MB (157 k nodes) |
| writeWorkspaceState — 40-tab layout | 0.2 ms |

Bench gotcha recorded for future sessions: in a HEADLESS EditorState,
`ensureSyntaxTree` stalls at ~3 000 chars no matter the budget — parse
big docs via `markdownLanguage.parser.parse()` directly. (The existing
live-preview tests use < 3 KB docs and are unaffected.)

## Findings — main process (blocks ALL IPC + window verbs while it runs)

- **MP1 (HIGH, measured).** Web reader extraction is one synchronous
  slab in main: `extractWebReader` (index.ts:408) and the live "Aa
  reader" (`webViewReaderText`, index.ts:849) run readFileSync → up to
  THREE linkedom DOM builds (web-reader.ts:142,161,175) → Readability →
  turndown → sha256 with zero await points. Measured 834 ms for a
  650 KB page; MB-class snapshots ⇒ multi-second full-app freezes. The
  inner mhtml quoted-printable decoder amplifies it (mhtml.ts:26-44:
  per-byte number[] pushes → tens of MB transient for a 3 MB part).
  Fix direction: move parse+convert into a `utilityProcess` (Electron's
  own worker seat); pre-size the QP decode into a Buffer.
- **MP2 (HIGH at scale).** OCR pre-resize + scan filter run in main:
  full phone-photo decode + resize + three per-pixel JS passes +
  Float64 integral image (~16 MB) + JPEG re-encode, all sync
  (index.ts:281-301, scan-filter.ts:13-114). ~0.3–1 s stall per image;
  the PDF-OCR fallback repeats it PER image-only page
  (pdf-extract.ts:182-195) — a 30-page scan = 30 freezes between model
  runs. Fix: worker_thread (RGBA buffers are transferable).
- **MP3 (HIGH at the cap).** PDF import reads the whole file BEFORE the
  200 MB cap check, then sha256 + writeFileSync of the copy — all sync
  (pdf-import.ts:97-124; extraction re-reads + re-hashes each run,
  pdf-extract.ts:165). 200 MB ⇒ ~1 s freeze; typical 10–20 MB ⇒
  50–150 ms (tolerable). Fix: stat-first, stream hash, `copyFile`.
- **MP4 (MED, measured 64 ms @26 MB).** searchVault reads + lowercases
  every candidate `.md` per call; the 100-result cap does not cap BYTES
  READ — a miss scans the whole vault (search.ts:69-121). Renderer
  debounce (250 ms) bounds frequency, not single-call stalls; linear in
  vault size (≈0.5 s at a 200 MB vault, worse on cold cache/9p). The
  M8 ripgrep/FTS5 plan already covers the endgame; interim: async walk
  + early-exit reads + cached file list.
- **MP5 (MED).** pdf.js text extraction runs in-main (legacy build, no
  worker; pdf-text.ts:14-41): event loop breathes between pages but
  each dense page is a 10–100 ms main task — long PDFs = seconds of
  accumulated stutter. Fix: utilityProcess host.
- **MP6 (MED).** Media crosses IPC as base64 strings everywhere:
  readSourceAsset ≤50 MB → ~67 MB string (vault.ts:223-234, measured
  15 ms encode @8 MB + clone), getCaptureUploadData same at ≤25 MB,
  Mistral adapter re-encodes into JSON (mistral-ocr-adapter.ts:99).
  33 % inflation × several simultaneous copies (see ED4). Fix
  direction: transferable ArrayBuffers or a custom `atomik-asset://`
  protocol stream.
- **MP7 (LOW at owner scale, measured 3 ms @1000 notes).** listVaultFiles
  is a sync walk (Dirent-based, no per-entry stat — good) but every
  `vaultFilesChanged` push triggers 2–4 duplicate full walks (one per
  mounted tree listener: SourcesTree.tsx:46, VaultView.tsx:122,
  ProjectView.tsx:142). Only hurts on slow filesystems (9p//mnt/c) or
  5 000+ notes. Fix: one shared/memoized walk per change event.
- **MP8 (LOW-MED).** Capture uploads buffer fully in memory before the
  disk write (capture-session.ts:425-437; in-flight concurrency not
  counted against maxUploads) and openSourceExternally copyFileSync has
  no size cap (index.ts:170). Both bounded in practice (25 MB cap,
  LAN-only; 200 MB worst case).
- **MP9 (INFO).** Whisper/llama sidecars reload their model per job
  (per OCR'd page!) — deliberate isolation, but a 30-page scan pays 30
  model loads; llama server-mode is the throughput lever if it ever
  matters. Trace appends, workspace writes (0.2 ms measured), dev-docs
  scans: all healthy.

## Findings — editor & content pipeline

- **ED1 (size-conditional, calibrated).** The live-preview field
  rebuilds ALL decorations on every keystroke AND every cursor move
  (live-preview.ts:640-657 — docChanged, any selection change, image
  bump, tree advance), walking the whole syntax tree unbounded
  (:433). Measured shape: full-tree walk ≈ 4.8 ms @200 KB / 21 ms
  @1 MB + build. So: imperceptible for typical notes (≤100 KB ⇒
  ~2-3 ms), a real drag at MB-scale notes — exactly the "M8-class perf
  seam" the file's own comment admits (:32-34). Multipliers make it
  worse: each background-parse advance triggers another full recompute
  (:650), and EVERY settling image dispatches a bump ⇒ N images = N
  full recomputes on open (:148-163). Fix direction: viewport-bounded
  compute in a ViewPlugin (keep the pure kernel for tests), batch image
  bumps into one flush.
- **ED2 (HIGH, leak + correctness).** `imageDataCache`
  (live-preview.ts:96) is module-level, unbounded, never evicted, and
  never invalidated: (a) image-heavy sessions retain every full-res
  data URL until restart (50 photo-notes × 4 MB ⇒ ~270 MB of strings);
  (b) NOT cleared on vault switch — same relPath in a new vault serves
  the OLD vault's bytes; (c) rotating a photo leaves the stale
  pre-rotation image in live mode until restart. (b)/(c) are bugs, not
  just perf. Fix: byte-budget LRU + clear on vault-changed/files-changed.
- **ED3 (HIGH with media notes).** The read pipeline runs on every
  save even when invisible: `useVaultNote` recomputes markdown-it +
  re-fetches EVERY inline image (one readSourceAsset each, no cache,
  unlike live mode's permanent cache — two extremes for the same bytes)
  on each autosave, even in live/source mode where the html isn't
  displayed (useVaultNote.ts:84-125, VaultView.tsx:333). A note with
  5×5 MB photos ⇒ ~34 MB of base64 IPC per autosave pause. The inliner
  also does one full-string replaceAll per image (note-images.ts:31-40
  — quadratic churn on image-heavy notes). Fix: compute read-html only
  when mode==='read'; key fetches on relPath; share one bounded cache
  with live mode; single-pass replace.
- **ED4 (MED).** A viewed asset exists as up to 3+ simultaneous copies
  (base64 string in state, rotated second data URL, decoded bitmap /
  pdf.js copy — SourceImageView.tsx:171-214, PdfView.tsx:76), rotated
  images re-encode on the main thread per open (canvas toDataURL), and
  PdfView decodes base64 via a per-character callback
  (`Uint8Array.from(atob(...), cb)`, PdfView.tsx:76 — 10⁸ calls for a
  100 MB PDF). Pairs with MP6: one ArrayBuffer path collapses the
  whole family.
- **ED5 (MED).** Blob URLs are NEVER revoked (`revokeObjectURL` absent
  from the renderer — rotate.ts:40 says "caller revokes"): every audio
  open and capture-item render leaks the full media bytes for the
  session.
- **ED6 (MED on big notes).** EditorPane materializes the WHOLE
  document per keystroke: `doc.toString() !== savedDoc` in the update
  listener (EditorPane.tsx:349-362) — 1–2 MB alloc + compare per
  keystroke on big notes, pure GC pressure. Fix: `doc.eq(savedText)`
  (structure-shared) or length-first compare.
- **ED7 (MED).** PdfView re-renders the page at FULL resolution for
  every intermediate width during a divider/tree drag (ResizeObserver →
  render effect, PdfView.tsx:61-142; cancellation prevents overlap, not
  the burned rasters). Fix: debounce ~120 ms or CSS-scale during drag.
- **ED8 (LOW).** "@" quick-actions opens with one listVaultFiles + one
  readNote per source bundle in the vault (parallel; 5 s dossier
  cache) — 200 bundles ⇒ 200 IPC reads per menu open. Per-keystroke
  filtering is correctly client-side (`validFor`). Fix: lazy per-option
  dossier reads if bundles grow.

## Findings — workspace/React shell

- **RS1 (HIGH-in-shape, current scale OK).** Every dispatch re-renders
  the entire workspace: the root component subscribes to the whole
  store object (Workspace.tsx:483), and there is ZERO React.memo and no
  virtualization anywhere in the renderer. A fold-toggle in pane A
  re-reconciles pane B's whole view; at 2 000 notes ≈ 2 300 mounted
  tree rows re-reconciled per click (NoteTree renders collapsed
  folders' children too — hidden by CSS only, NoteTree.tsx:62-94).
  Fine at ~300 notes; the wall arrives with big vaults + multi-pane.
  Fix: memo LeafPane/TabContent + stabilize callbacks + only-render
  open folders (or virtualize).
- **RS2 (MED, drag-time).** Divider and tree-width drags dispatch per
  pointermove, unthrottled (Workspace.tsx:409-414,
  TreeResizeHandle.tsx:23-25) ⇒ ~60 full-workspace renders/s during a
  drag, under software GL. Persistence is SAFE (one debounced write
  500 ms after the burst — measured 0.2 ms/write); the cost is
  rendering. WebView tabs add a forced reflow + `webViewSetBounds` IPC
  per frame while dragging (WebView.tsx:63-143). PdfView adds ED7.
  Fix: rAF-throttle + CSS-var drag preview, commit on pointerup.
- **RS3 (MED).** Tab switches unmount/remount views with no caching:
  every switch back re-runs getVault + listVaultFiles + readNote (+ per
  image reads); a source tab re-transfers the full asset base64 and
  re-parses the PDF (I1 agent evidence; pairs with MP6/ED4). Ping-pong
  between a notes tab and a 20 MB-PDF tab = ~27 MB IPC per switch.
  Fix: small module-level caches (the nav-history/pdf-open registry
  pattern already exists) or keep inactive tabs mounted-hidden.
- **RS4 (LOW).** Per-keystroke full-view re-render from the search /
  draft-name inputs living in the same component as the tree
  (VaultView.tsx:266-281 et al.); search responses have no
  latest-wins guard (useTreeSearch.ts:20-30 — out-of-order results
  possible on a slow vault). AppMenu subscribes the whole store (tiny
  cost). CaptureView's 2 s poll is correctly scoped to active sessions
  on the mounted tab only.

## What is genuinely good (keep doing this)

- Idle discipline: zero timers/pollers at rest — measured 0 CPU ticks.
- Store dispatch skips no-op updates by identity; ONE trailing 500 ms
  persistence debounce; atomic temp+rename writes; 256 KB state cap.
- Keystrokes never route through React: one EditorView in a ref,
  Compartment reconfigure for mode/theme, 800 ms autosave debounce with
  flush-on-unmount ordering, optimistic single-IPC saves (no extra
  read), conflict pauses autosave.
- pdf.js discipline: exactly one in-flight render with
  cancel-before-start, task.destroy() teardown, lazy worker fetch.
- Caps and bounds everywhere in main (query 200 chars, 100 files/6
  matches, 10 MB notes, 50 MB assets, 8 KB dossier peek, upload gates
  enforced before/during/after) — pathological inputs are bounded by
  design; listVaultFiles avoids the N×stat trap (Dirent walk).
- Sidecar hygiene: hard timeouts + SIGKILL, 32 MB maxBuffer, no shell,
  sticky CUDA demotion; the WSLg powershell query is fully async with
  strict parsing (a maximize never waits on interop).
- ImageWidget.eq fingerprinting (one settling image redraws one DOM
  node), checkboxes resolving positions at click time, audio via Blob
  URLs (the choice is right — the missing revoke is ED5).

## The dev-environment tax (WSLg) — not app code

`getGPUFeatureStatus` on this machine: gpu compositing, rasterization,
WebGL, 2D canvas, video decode — ALL software. Every scroll and repaint
is CPU raster under WSLg (and the earlier window-management work showed
the app runs XWayland). IPC floor ~0.3 ms. None of this ships: real
Windows/macOS/Linux builds get hardware compositing. When the app
"feels heavy" on the dev machine, subtract this tax mentally before
blaming app code — and prefer the measured numbers above.

## Ranked actions (impact × effort; none started — owner picks)

1. **Move reader extraction off main** (MP1: utilityProcess for
   readerFromHtml + mhtml decode) — measured 834 ms full-app freeze per
   reader toggle/import today, multi-second on big pages.
2. **Code-split the renderer** (RS/S1): React.lazy for PdfView (+24 %
   of bundle), CaptureView (qrcode), EditorPane heavy packs — cuts a
   large slice of the 3 MB startup parse on every launch.
3. **One bounded image cache, shared by live + read, cleared on vault
   switch** (ED2+ED3) — fixes two correctness bugs and the biggest
   memory leak class in the same unit.
4. **ArrayBuffer/protocol media path** (MP6+ED4): stop base64ing media
   through IPC; collapses 3+ string copies per asset and the atob
   per-char decode.
5. **Read pipeline laziness** (ED3): compute read-html only in read
   mode; key image fetches by relPath.
6. **Drag-time throttling** (RS2+ED7): rAF-coalesce divider/tree/rect
   reporting; debounce PDF re-render — the single worst interactive
   path under software GL.
7. **Worker the OCR image pre-pass** (MP2) before the next scan-heavy
   capture batch.
8. **Stream PDF import** (MP3): stat-first cap check, stream hash,
   copyFile.
9. **Memo the workspace shell** (RS1) when vaults grow: LeafPane/
   TabContent memo + stable callbacks + open-folders-only NoteTree.
10. **Small fixes batch**: revoke blob URLs (ED5), doc.eq instead of
    toString-per-keystroke (ED6), latest-wins search guard (RS4),
    webView Map cleanup on window close, search early-exit (MP4
    interim).

## Reproduce

- Bundle: `npx electron-vite build --sourcemap` then read
  `out/renderer/assets/*.js.map` sourcesContent by package.
- Startup: `ATOMIK_SMOKE=1 electron .` timed to the marker; empty-
  Electron baseline probe for the floor.
- Ops: import the electron-main/renderer pure modules in a vitest node
  file and time them (corpora: 1 000×8 KB synthetic vault, rich 1 MB
  markdown, 650 KB HTML). Beware the headless ensureSyntaxTree stall —
  use `markdownLanguage.parser.parse()` for big docs.
- Memory/CPU: /proc RSS + utime/stime deltas per electron process.
