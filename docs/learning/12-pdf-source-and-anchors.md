---
type: Atomik Learning Note
title: 'Learning: PDF as a source — engines, extraction, and anchors that survive'
description: Beginner-first walkthrough of CP-MVP-003 — the pdf.js engine decision, rendering vs extraction as separate trusts, derived text with provenance, and page anchors a citation can return to.
tags: [learning]
timestamp: 2026-07-21T00:00:00Z
---

# Learning: PDF as a source — engines, extraction, and anchors that survive

*Covers CP-MVP-003 (shipped 2026-07-13). Backfilled 2026-07-21 while repaying the learning-layer stall (see index §Coverage debt).*

## Who this is for and what you can do afterwards

You read note [11](./11-local-http-capture-server.md); you know the vault, source
bundles, transcription, and action traces. After this note you can read
`apps/desktop/electron-main/pdf-import.ts`, `pdf-text.ts`, and `pdf-extract.ts`,
plus `apps/desktop/renderer/src/source/PdfView.tsx` and `pdf-open.ts`, end to
end — and you can explain why the app runs TWO builds of the same PDF engine in
two different processes on purpose. Scope: CP-MVP-003 S02–S07, milestone M4.

## The technologies involved, from zero

**What a PDF actually is.** Not a text document. A PDF is a program of drawing
instructions: "place this glyph shape at these coordinates". Many PDFs also
carry the text as embedded **text runs** (a *text layer*) that a parser can
read back; scanned PDFs carry only page images and no text at all. So "show
the page" and "give me the text" are two different operations that can
silently disagree — columns reordered, formulas lost, footnotes merged, while
the rendered page looks perfect (`docs/bedrock/10_10-pdf-source-tab.md`).

**The engine: pdfjs-dist 6.1.200.** Mozilla's pdf.js, decided and dated on
2026-07-08 (`atomik-project/sessions/2026-07-08-pdf-engine-decision.md`):
Apache-2.0, zero native code, worker-isolated, and one engine gives both
canvas rendering and the text layer. Rejected, with reasons: mupdf(.js)
1.28.0 (AGPL-3.0 copyleft, wrong for this public permissive repo, plus wasm
weight), pdfium bindings (native-module build weight when a zero-native peer
exists), react-pdf (a wrapper over pdfjs-dist — a layer without a job here),
and poppler's `pdftotext` (extraction-only; noted as the future extraction
alternative if the pdf.js text layer disappoints on real documents).

**The security posture around the engine.** pdf.js parses untrusted bytes, so
its parsing runs in a **web worker** loaded from the LOCAL bundle (the CSP
already forbids remote). CVE-2024-4367 — malicious PDFs executing JS through
eval'd font matrices in old pdf.js — is closed structurally: v6 removed the
eval font path entirely, and with it the `isEvalSupported` option the
decision had planned to force off (the S04 log entry absorbed that API drift).

**One system tool at the edge.** Image-only pages need a page-to-image step
before OCR: poppler's `pdftoppm`, run as a sidecar (`pdftoppmRasterizer` in
`apps/desktop/electron-main/pdf-text.ts`) — the ffmpeg precedent: used when
present, survived honestly when absent.

## The architecture concepts mobilized (named)

- **Two fidelities, two trusts.** Bedrock 10's rule — rendered fidelity and
  extracted-text fidelity are separate — became *process architecture*: the
  viewer runs the fresh pdf.js build in the sandboxed renderer (display
  only, never the source of a derived file); extraction runs the *legacy*
  build in MAIN, re-reading `original.pdf` bytes. An extraction claim
  structurally cannot come from the display path.
- **Bytes outrank labels.** The `%PDF-` magic is checked before the vault is
  touched (`pdf-import.ts`) — a `.pdf` extension proves nothing.
- **Evidence vs derived representation.** `original.pdf` is preserved
  untouched, sha256 and byte count recorded in the dossier; `extracted.md` is
  visibly derived (`derived: true`, engine identity, trace id,
  `correction_state`) — output, never truth.
- **Convention reuse.** A PDF lands as the same bundle shape as captures:
  `sources/pdf/<slug>/` with `source.md` dossier + `index.md` map, through the
  same gates (size cap, magic, `wx` writes, never an overwrite).
- **Dependency-injection seams.** `extractPdfSource` takes its reader, OCR
  adapter, and rasterizer as parameters (`PdfTextReader`, `PageRasterizer` in
  `pdf-extract.ts`) — tests run the whole pipeline with fakes.
- **Anchors are file edits, not view state.** A page anchor is a durable
  markdown table row in the dossier — it survives restart and travels with
  the files (file-first).
- **One ActionTrace per run** (33), `deterministic` when pure text-layer,
  `local-model` when OCR pages ran; failures land a trace too.

## Walkthrough of the real code

**Import** (`apps/desktop/electron-main/pdf-import.ts`). `importPdfFromPath`
stat-checks the 200 MB cap before reading, validates the `%PDF-` magic before
any vault write, slugs the file name (`pdfSlug`: lowercase, NFKD-stripped
accents, `[a-z0-9-]`), finds a free `sources/pdf/<slug>/` by numbering
siblings, then writes `original.pdf` + `source.md` (recording
`original_sha256` and `original_bytes`) + `index.md` with the
exclusive-create `wx` flag, deleting what it wrote if any write fails. The
IPC channel `atomik:import-pdf-source` (`electron-main/index.ts`) opens the
native file dialog in main — consent lives on the trusted side — and emits
`vaultFilesChanged` so the tree refreshes.

**Viewer** (`apps/desktop/renderer/src/source/PdfView.tsx`, hosted by
`SourceImageView.tsx`). The fresh pdf.js build renders the current page to a
canvas fitted to the pane, with ‹ page N/M › navigation and an
"⚓ anchor page N" button. Three hard-won details live here: the render effect
waits for the ResizeObserver's first real width measurement (a fresh tab
mounts at width 0 — rendering into it is the blank-view bug); exactly ONE
render runs at a time (the previous `RenderTask` is cancelled first;
`RenderingCancelledException` is the mechanism working, not an error); and
page turns report through `onPageChange` so the tab's `page` param follows —
`pdfPageOf` (`renderer/src/workspace/model.ts`) restores it on reopen,
recoverable UI state like `mode`.

**Extraction** (`electron-main/pdf-extract.ts` + `pdf-text.ts`).
`extractPdfSource` refuses non-dossier paths, dossiers that don't declare
`resource: ./original.pdf`, and — crucially — an existing `extracted.md`
("corrections live there; delete it to re-run"). `readPdfTextWithPdfjs`
(legacy build, in main) returns one string per page; a page under the
20-character `TEXTLESS_THRESHOLD` is treated as image-only and either
rasterized via `pdftoppmRasterizer` and sent through the seated OCR adapter,
or given an honest placeholder ("install poppler-utils to enable the OCR
fallback"). The result is written `wx` as `extracted.md` with per-page
`## Page N` sections; the pure pair `withExtractionRecorded` /
`withExtractionCleared` flips the dossier, and `resetExtraction` is the
delete-and-re-run verb behind the "Delete extraction…" button.

**Anchors and citation return.** `withPageAnchor`
(`renderer/src/source/dossier.ts`) inserts an idempotent row whose Target is
a real clickable link: `[page 3](./original.pdf#page=3)`. Going back,
`pdfPageTarget` (`renderer/src/source/pdf-open.ts`) parses any
`…/original.pdf#page=N` click into the sibling `source.md` plus a page; the
page waits in the pending-page registry (`setPendingPdfPage` /
`takePendingPdfPage` — it cannot ride the generic open-note call) and
`PdfView` jumps via `requestedPage`, a fresh object per click so a re-click
re-navigates. The @ menu (`renderer/src/editor/quick-actions.ts`) closes the
loop: `insertionFor` emits a complete citation ending `#page=1` with the
digit pre-selected to type over, and `anchorInsertionFor` turns every
recorded anchor (`pageAnchorsOf`) into an exact citation. Editing
`extracted.md` flips the dossier to human-corrected —
`withExtractionCorrectionRecorded` in `electron-main/transcription.ts`, one
save hook serving three derived files.

## How it was built (methodology)

The order, from `atomik-project/coding-paths/CP-MVP-003.md` and the log:

1. **S01 bootstrap** (2026-07-08): reconcile ledger vs repo, pin
   `base_commit`, re-read bedrock 10/03/05 *before* code.
2. **S02 engine decision, dated, before any dependency landed** — the 15
   discipline: record chosen AND rejected, with reasons. The renderer/main
   split was decided here as architecture, not discovered later.
3. **S03 import → S04 viewer → S05 extraction → S06 anchors**, each step
   shipping its tests in the same unit (247→251→253→257 over one day):
   `pdf-import.test.ts`, then `pdf-extract.test.ts`, then
   `pdf-anchors.test.ts`, all on fake `%PDF-1.7` bytes and injected fakes.
   S05 ended with a real-file verification: the owner's JF_Quote PDF —
   2 pages, ~5.1k chars/page, 125 ms, French intact.
4. **An owner-dogfooding wave** (S06b–S06h, 2026-07-09): citation
   autocomplete, link routing, render races, scrollbars — fixed within hours.
5. **S07 acceptance** (2026-07-13,
   `atomik-project/sessions/2026-07-13-cp-mvp-003-acceptance.md`): a machine
   sweep of every §M4 intent and truth-slice line against code and tests,
   which itself found and fixed two path misses (below). Then the owner's
   8-point checklist on a real PDF — "all ok" — closed the path at 262 tests.

## Lessons learned the hard way

- **Ship the lifecycle with the artifact.** The owner's first act after
  extracting was trying to delete and re-extract — and couldn't (S05b, the
  second such gap in one day). `resetExtraction` plus the round-trip test
  extract→delete→extract is the repair; the rule is now persistent memory.
- **A citation must be clickable.** The first anchor rows were bare text —
  no link to click. And rows already written into the owner's vault had to
  be *migrated*: file content does not repair itself when code changes.
- **Deferrals leak.** S04 deferred page-in-tab-param restore to S06; S06
  built only the in-session jump, so reopening the app lost your page until
  the acceptance sweep caught it — acceptance is a real gate, not a ceremony
  (it also caught that no module note was touched the whole path).
- **Same-work-unit records or it didn't happen.** Three S06 commits landed
  without ledger/log entries; `current_step` sat stale at S02 for days. The
  2026-07-13 reconciliation backfilled them dated — never rewritten.
- **This note is itself a lesson**: the learning-note clause fell out of this
  path's definition of done — the beginner layer stalled for five shipped paths.

## Try it yourself (exercises)

1. **Run the suites.** From `apps/desktop`: `npx vitest run
   tests/pdf-import.test.ts tests/pdf-extract.test.ts
   tests/pdf-anchors.test.ts`. Then flip the fake's magic bytes in
   `pdf-import.test.ts` and read the failure — the test also asserts
   `sources/` was never created (the gate sits before the vault).
2. **Trace a citation click.** Start at `pdfPageTarget` in
   `renderer/src/source/pdf-open.ts`; find who calls it, where
   `setPendingPdfPage` is written, and where `PdfView` consumes
   `requestedPage`. Write down why the registry hands out a page only once.
3. **Extend the extraction fixture.** In `pdf-extract.test.ts`, give the
   fake reader a third page of real text and assert its `## Page 3` section
   lands; then make it empty and predict — before running — whether the
   trace's `execution.location` stays `local-model`.
4. **Dogfood the loop.** `npm run dev`, import any PDF (＋PDF), extract,
   edit one line of `extracted.md`, and check the dossier flipped to
   human-corrected; then "Delete extraction…" and extract again — one
   `extracted_text:` line in the dossier, never two.
5. **Anchor and return.** In the viewer, "⚓ anchor page 2"; open the dossier
   and find the row `withPageAnchor` wrote; from a note, use @ to cite that
   anchor, then click the citation — the source view must open at page 2.

## Vocabulary you now own

```text
text layer            embedded text runs a parser can read back; scans have none
magic bytes           %PDF- — content identity that outranks the file label
two fidelities        rendered page vs extracted text: separate claims and trusts
derived representation extracted.md: visibly generated, traced, correctable — never truth
page anchor           a durable dossier-table row targeting original.pdf#page=N
citation return       any #page=N click reopens the viewer AT that page
rasterizer            page → image (pdftoppm) so the OCR seat can read a scan
lifecycle with artifact create AND delete/re-run ship in the same unit
```

## What arrives next

- Notes **13** (local speech and OCR seats, CP-MVP-004/005 — the pipeline
  this path's scanned pages ride), **14** (web source tab, CP-MVP-006), and
  **15** (file management, CP-MVP-007) repay the rest of the coverage debt.
- Honest gaps carried forward from acceptance: page-level anchors only
  (text-span/region weren't cheap on a canvas renderer); `## Page N` headers
  in `extracted.md` are not yet `#page=N` links; the page number is not a
  first-class evidence field — that belongs to the M6 Truth Lens slice.
