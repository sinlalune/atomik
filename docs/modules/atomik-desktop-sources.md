---
type: Atomik Module Note
title: 'Module: atomik-desktop — sources'
description: Capture, image, transcription and OCR seats, PDF import/viewer/anchors, and the web tab, reader and import.
tags: [module, sources, capture, pdf, web, ocr, transcription]
timestamp: 2026-08-17T00:00:00Z
---

# Module: atomik-desktop — sources

> AREA NOTE of [Module: atomik-desktop](./atomik-desktop.md), split out at
> CP-OPS-001 S02 so concurrent lanes append to different files instead of
> colliding in one 1689-line note. The root note keeps what is cross-cutting
> (public contracts, data flow, alternatives, common mistakes, tests, agent
> checklist, dependency facts); this note keeps what THIS AREA owns.

## What it owns

- WIKIMEDIA LIVE SOURCE CONTRACT (CP-MVP-011 S01):
  `shared/wikimedia.ts`, pure. One fixed-host main seat will normalize four
  foreign shapes: bounded Wikipedia article text; allowlisted Wikidata
  entities/statements; Commons P18 media that cannot exist in the public type
  without creator plus concrete licence; conservative Wiktionary etymology
  whose uncertainty defaults to `unknown`. Every text/media result carries
  page/revision identity, canonical URL, access time and licence where exposed.
  Core REST is pinned for Wikipedia/Wiktionary pages; Action API for
  Wikidata/Commons. The renderer never supplies a URL and raw HTML never
  crosses IPC. These objects are TRANSIENT until explicit Save as source; a
  durable image is copied locally rather than hotlinked. Volatile facts and
  the fixture refresh ritual live in
  `docs/research/wikimedia-live-api-snapshot-2026-08-17.md`.
- WIKIPEDIA LIVE SEAT (CP-MVP-011 S02):
  `electron-main/wikimedia.ts`. `WikimediaClient` accepts injected fetch,
  clock, trace sink and numeric budgets. `searchWikipedia` validates the pure
  `search_wiki` request, constructs only `<language>.wikipedia.org` Core REST
  URLs, serially searches/reads the selected page revisions, and emits bounded
  clean text with canonical URL, revision/access/licence provenance. Response
  bytes are bounded WHILE streaming (Content-Length early gate plus chunk
  ceiling); caller abort and request timeout remain distinct typed failures;
  429 preserves Retry-After without an eager retry. Local English/French,
  empty, malformed, 429, oversize, timeout and cancel fixtures keep CI offline.
- WIKIDATA LIVE SEAT (CP-MVP-011 S03): the same client calls
  `wbsearchentities`, keeps every selected candidate ranked (an `Atom` label
  does not resolve its own ambiguity), then requests entity info in one batch.
  Main iterates ONLY `WIKIDATA_PROPERTY_ALLOWLIST`, caps per-property/entity
  statements, preserves statement ranks and typed values, and batches labels
  only for retained QID values. Results carry multilingual label/aliases/
  description, requested+English Wikipedia sitelinks, CC0, page/revision and
  access provenance. Action API `maxlag` is a typed rate-limit outcome;
  non-allowlisted claim content is fixture-proven not to cross the boundary.
- COMMONS + WIKTIONARY LIVE SEATS (CP-MVP-011 S04): retained Wikidata P18
  filenames may trigger one bounded Commons `imageinfo` lookup only when the
  caller's media policy is explicitly `remote`. Main strips HTML from selected
  extmetadata and admits a media item only with requested file/source identity,
  explicit creator, concrete licence name+URL, and HTTPS original+thumbnail on
  `upload.wikimedia.org`; incomplete attribution or unsafe URLs become a
  visible `media-withheld` warning. Private/offline mode makes no Commons
  request and returns no remote media URL. `searchWiktionary` uses Core REST
  search+`with_html`, currently pins only English and French edition/language
  headings, extracts bounded etymology text without sibling language or
  definition sections, preserves page/revision/licence/access provenance, and
  defaults source status to visible `unknown` unless an explicit attested,
  reconstructed, or disputed marker supports more. Local fixtures cover both
  editions, language isolation, text budgets, unsupported editions, missing
  sections, explicit status markers, incomplete attribution and non-HTTPS
  media. Neither seat writes a file; S08 owns explicit local persistence.
- LIVE-BENCH CORRECTIONS (CP-MVP-011 S06c): two defects the fixtures could not
  show, both found by running the real rung against real Wikimedia on
  2026-08-17. (1) `auto` consulted Wikipedia then Wikidata and rethrew any
  non-`empty` failure — so a transient Wikidata error DISCARDED articles
  Wikipedia had already returned, and the caller saw a failed search where good
  results existed. A corpus that fails after the other has delivered is now a
  `corpus-unavailable` WARNING on the bundle; cancellation and budget
  exhaustion still stop the search, because those are decisions rather than
  weather. (2) `maxlag=5` on the Action API reads counted the query service's
  lag (~16s at the time) and returned an error body under HTTP 200, which this
  client correctly mapped to rate-limit — making the Wikidata seat dead in
  practice. Reads no longer send `maxlag`; the User-Agent, request/byte budgets
  and 429/`Retry-After` handling carry the etiquette. Measured effect on one
  French question: two tool calls became one, wall time 11.9s → 5.6s, and
  Wikidata returned Q7186 instead of failing.
- UNIFIED SEARCH DOOR (CP-MVP-011 S05): `WikimediaClient.search` validates one
  `SearchWikiRequest` and dispatches only to the pinned seats. `auto` consults
  Wikipedia plus Wikidata sequentially, shares one request/byte budget and one
  caller cancellation signal, and keeps each corpus's content-free child
  receipt. Its 3/2 maximum result allocation caps the worst-case HTTP path at
  eight requests; a typed empty from one corpus does not erase usable results
  from the other. This method is for the main-side tool harness, not a renderer
  network primitive.

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
  whatever the renderer asked. CP-FEEDBACK's closing bench turns the
  renderer URL field into an honest omnibox: explicit http(s) and clear bare
  hosts navigate (domains default HTTPS; localhost/IP default HTTP), while
  ordinary text is encoded into `https://www.google.com/search?q=…` only when
  submitted. Known unsafe/local schemes and any non-http `scheme://` still
  fail closed rather than becoming search text; MAIN validates the resulting
  Google URL exactly like every other navigation. The renderer reports the
  placeholder's rect (ResizeObserver + window resize + per-render check for
  divider-drag moves); geometry channels are tolerant of the
  ensure/report race; overlays that could sit under the native view
  take the `web/overlay.ts` guard (the settings panel does). The URL
  rides the tab's `url` param (03) and CP-FEEDBACK S04 persists the
  isolated surface's `page-title-updated` snapshot beside it as `title`.
  `webPageIdentity` is the renderer's one policy for the tab and the
  in-pane location surface: sanitized one-line title -> hostname -> URL
  -> `Web`; bidi/control characters drop and the stored title is capped.
  Metadata never hides destination identity — the full URL remains the
  secondary line/tooltip and becomes the editable value on focus. Empty
  title events are persisted too, clearing a previous page's title so an
  untitled navigation falls back instead of lying. Restore shows the last
  title while the isolated view wakes; tab SWITCHES only hide the view,
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

## Rich Markdown source reading (CP-RICH-MARKDOWN S02)

- The dossier article rendered by `SourceImageView` uses the same
  `RichMarkdownBody` lifecycle as ordinary note read mode. Source anchors,
  extraction provenance, original-media controls, and snapshot/native-view
  ownership are unchanged.
- Hydration is a disposable DOM projection over already-produced reader
  Markdown. Render adapters have no IPC or source-bundle authority, and a
  failure remains inspectable as escaped authored source.
