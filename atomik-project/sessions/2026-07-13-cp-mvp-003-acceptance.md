---
type: Atomik Session Record
title: CP-MVP-003 acceptance run — PDF source tab (M4)
timestamp: 2026-07-13T10:15:00Z
path: CP-MVP-003
ceremony: closing
---

# CP-MVP-003 acceptance (2026-07-13)

Machine sweep of 18 §M4 + the path's definition of done, run at S07
after the same-day ledger reconciliation (S06c–S06h backfill). Owner
validation on the real JF_Quote PDF is the remaining gate — checklist
at the end.

## §M4 intents sweep

- **open PDF** ✓ — `import-pdf-source` (main dialog) + ＋PDF in the
  sources tree; `%PDF-` magic outranks the label and is checked BEFORE
  the vault is touched; 200 MB cap; numbered siblings, never an
  overwrite (`pdf-import.test.ts`).
- **page viewer** ✓ — pdf.js 6 in the sandboxed renderer, LOCAL
  worker, ‹ page N/M ›, first render waits for the ResizeObserver's
  real measurement (S06d), one render at a time (S06g), one scrollbar
  with sticky nav (S06h). Display-only by construction.
- **create source.md dossier** ✓ — standard bundle
  `sources/pdf/<slug>/` (original.pdf evidence + source.md with
  sha256/bytes + index.md map), same gates as captures.
- **extract text** ✓ — per-page `## Page N` into a visibly DERIVED
  extracted.md (engine identity, trace id, correction_state);
  image-only pages ride the SEATED OCR pipeline via pdftoppm (poppler
  installed on this machine 2026-07-08); honest placeholder when the
  rasterizer is absent; wx no-clobber; Delete extraction… round trip
  (`pdf-extract.test.ts`). REAL-FILE verify (S05): owner's JF_Quote —
  2 pages, ~5.1k chars/page, 125 ms, French intact.
- **page/text/region anchors** ◐ — PAGE anchors shipped: "⚓ anchor
  page N" writes a durable, clickable Useful-anchors row
  (`withPageAnchor`, pure, idempotent; pre-S06-fix rows in the owner
  vault were migrated). Text-span/region anchors NOT shipped — the
  path's DoD said "where cheap"; they weren't cheap (canvas renderer,
  no text layer in the view). Recorded as an honest gap for a later
  slice; `anchors.json` sidecar (10) stays unneeded until then.
- **selection → AI → note** ✓ — extracted.md is an ordinary note:
  selection → AiPanel → labelClaims evidence carries
  {relPath, range, quote, quoteSha256} into the created note
  (mechanism unchanged since M2, unit-covered in `truth.test.ts`);
  the @ menu closes the source-reference loop: complete PDF citations
  with the page digit pre-selected, every recorded anchor as an exact
  citation, derived-text quote blocks read at apply
  (`quick-actions.test.ts`).
- **return from citation to original page** ✓ — any
  `…/original.pdf#page=N` click (dossier-internal AND cross-note)
  opens the SOURCE VIEW at that page via the pending-page registry
  (`pdf-open.ts`, `pdf-anchors.test.ts`); bare original.pdf and
  dossier links route to the source view too (S06e).

## Truth slice

- **renderer fidelity ≠ extraction fidelity** ✓ — structural, not
  procedural: viewer = pdf.js FRESH build in the sandboxed renderer;
  extraction = LEGACY build in MAIN re-reading original.pdf bytes.
  Extraction claims can never come from the display path.
- **page anchor survives note creation** ✓ — the anchor is a durable
  dossier-table row (a file edit, not view state); @ citations embed
  `#page=N` in the note text itself; both survive restart and travel
  with the files.
- **citation-support check can compare claim with quote/page** ✓ with
  a precision note — `labelClaims` compares claim text against the
  selection by exact containment and hashes the quote; the page rides
  the evidence's relPath+range into extracted.md, whose per-page
  `## Page N` structure attributes it. The page number is NOT a
  first-class field on EvidenceRecord — adequate for M4's check,
  noted for the M6 Truth Lens slice.
- **extraction emits an ActionTrace** ✓ — exactly ONE per run,
  `deterministic` (pure text-layer) vs `local-model` (OCR pages ran),
  sha256 + inputBytes + wallMs; failures land a trace too
  (`pdf-extract.test.ts` asserts both).

## Found and fixed BY this acceptance run

- **Page-in-tab-param restore was missing** — S04 deferred it to S06;
  S06 built the in-session jump (pending-page registry) but the page
  never entered the tab params, so reopening the app lost your page.
  Fixed: page turns persist as the tab's `page` param (03 recoverable
  UI state — like mode/treeW/treeOpen; pure `pdfPageOf` +
  `initialPage`/`onPageChange` through SourceImageView; citation
  return outranks the restored page). Tests 260→262.
- **Module note had ZERO CP-MVP-003 coverage** — no docs/ file was
  touched in the entire path (CP-MVP-005 updated the note every step;
  this path missed it every step). Fixed: `docs/modules/atomik-desktop.md`
  absorbed PDF import / viewer / extraction / anchors bullets, the
  extraction data flow, the four test suites, pdfjs-dist 6.1.200 dated
  dependency facts (+ poppler in the dev-env note), and the stale
  "28 tests, 6 suites" example.

## Honest gaps carried forward

- Text-span/region anchors (see intents sweep) — page-level only.
- extracted.md's `## Page N` headers are plain text, not links to
  `./original.pdf#page=N` — returning from a derived-text passage to
  the exact original page takes the anchors table or an @ citation,
  one step more than ideal.
- 10 §Git note allows committing small PDFs; after the 2026-07-09
  incident (personal documents nearly committed to a public repo)
  `sources/pdf/` is fully `.gitignore`d — bundles stay local, hashes
  and metadata are the committed record. Deliberate deviation, stands
  until a vault/repo split exists.
- Provider key store was found EMPTY on 2026-07-09 (probable Clear) —
  cloud rungs (Voxtral speech, Mistral OCR) need the key re-entered
  via ⚙ before any cloud check.
- The extraction engine offers no per-page re-run — delete + re-extract
  is whole-document (acceptable at 125 ms/2 pages; revisit on big
  books).

## Gates at sweep close

262 tests / 28 suites, typecheck, build, smoke `ATOMIK_SMOKE_OK` — all
green on this machine (WSL2), 2026-07-13.

## Owner validation checklist (the remaining gate)

On the real JF_Quote PDF (or any personal PDF):

1. Import a PDF (＋PDF), open its dossier — sha256/bytes present.
2. View it — first render immediate, ONE scrollbar, sticky page nav.
3. Turn to a page, close the app, reopen — the tab returns to that
   page (NEW since this sweep).
4. Extract text — French intact, per-page sections.
5. ⚓ anchor a page; from a knowledge note, @ -> cite that anchor.
6. Click the citation — the source VIEW opens at the page.
7. Edit extracted.md — dossier flips human-corrected.
8. Delete extraction… → extract again — clean round trip.

## Verdict

All machine-verifiable DoD items met; two acceptance findings fixed in
this work unit; gaps recorded honestly.

**OWNER VALIDATED 2026-07-13** — "all ok" on the 8-point checklist.
CP-MVP-003 CLOSED 2026-07-13; M4 done. Bedrock 10 flipped
planned→mvp; register updated; no active path — next per register:
M5 (web source tab), to be proposed as a new path.
