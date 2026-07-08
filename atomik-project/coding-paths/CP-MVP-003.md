---
type: Atomik Coding Path
title: PDF source tab — open, view, extract, anchor (M4)
description: Give PDFs the full source treatment per the owner's 2026-07-08 directive — "as source and as a viewer and text extraction" — plus the roadmap's strong anchors; scanned pages ride the OCR seat CP-MVP-005 just proved.
tags: [coding-path, m4, pdf, source, viewer, extraction, anchors]
timestamp: 2026-07-08T15:15:00Z
atomik:
  id: CP-MVP-003
  status: active
  current_step: S02
  base_commit: 35ec031
---

# Goal

Milestone 4 (18 §M4): a PDF becomes a first-class source — imported as
a capture-style bundle (original preserved as evidence), viewed
page-by-page in its own tab, its text extracted as a derived
representation with real provenance, and anchored so a citation can
lead back to the exact page. The owner's scope emphasis: **source +
viewer + text extraction** first; anchors complete the milestone.

Dividends this path inherits from CP-MVP-005: scanned/image-only PDF
pages are EXACTLY the input class the seated Qwen3-VL 4B OCR pipeline
was proven on (clean-scan tier, 9.5 s GPU/page) — the extraction
fallback is already benched, seated, and traced.

# Definition of done

- **PDF as source**: importing a PDF (file pick and/or capture inbox)
  creates the standard bundle — `original.pdf` untouched (evidence),
  `source.md` dossier with identity/status, `index.md` map — through
  the same gates as other captures (size/MIME/magic; bytes outrank
  labels).
- **Viewer**: a PDF tab (new view kind per 03) renders pages with
  next/prev + page N/M, restores from the tab param, and stays inside
  the security posture (12/13): no remote content, workers local,
  renderer fidelity is display-only — the original stays the truth.
- **Text extraction**: per-page text lands as a derived representation
  (visibly derived frontmatter, extraction identity + trace id, 28)
  through the adapter seam; text-layer PDFs extract locally
  (dependency decision per 15, dated); image-only pages go through the
  SEATED OCR pipeline (05's pre-resize harness; per-page scan.jpg
  optional); every extraction emits ONE ActionTrace (33) with
  runtime-reported counts; the correction flow works unchanged on the
  extracted text.
- **Anchors**: page (and where cheap, text-span) anchors survive note
  creation; selection → AI → note carries the anchor; the citation's
  return path opens the viewer AT the anchored page. Renderer fidelity
  and extraction fidelity stay separate claims (M4 truth slice).
- Every new IPC channel obeys 13 §IPC; no new heavy dependency without
  a dated 15 decision; tests/typecheck/build/smoke green per unit;
  module notes + ledger + log.md in the same work unit as each step.

# Documentation coverage

Completeness rule (35): every bedrock page 00–35 accounted for.

## Required

- `docs/bedrock/00_00-orientation.md`
- `docs/bedrock/02_02-learning-loop.md` (correction effort on extracted text)
- `docs/bedrock/03_03-workspace-tabs.md` (the PDF tab IS a new view kind)
- `docs/bedrock/04_04-file-first-model.md` (bundle shape, derived files)
- `docs/bedrock/05_05-resource-selection-model.md` (page/text anchors)
- `docs/bedrock/06_06-ai-patch-pipeline.md` (selection → AI → note)
- `docs/bedrock/07_07-source-adapters.md` (extraction behind the seam)
- `docs/bedrock/08_08-capture-source.md` (truth treatment, original = evidence)
- `docs/bedrock/10_10-pdf-source-tab.md` (THE page for this path)
- `docs/bedrock/12_12-electron-mvp.md` (view/service boundaries)
- `docs/bedrock/13_13-electron-security.md` (viewer isolation, workers, §IPC — re-read before the viewer step)
- `docs/bedrock/14_14-app-kernels.md`
- `docs/bedrock/15_15-maintainability.md` (the PDF engine is a heavy dependency — dated decision)
- `docs/bedrock/17_17-self-evolving-docs.md`
- `docs/bedrock/18_18-roadmap.md` §M4 (+ M5/M6 boundaries)
- `docs/bedrock/22_22-agent-handoff.md`
- `docs/bedrock/27_27-git-compatibility.md` (PDFs and derived files in the vault)
- `docs/bedrock/28_28-truth-evidence-model.md` (extraction provenance)
- `docs/bedrock/33_33-retrieval-local-execution-cost.md` (extraction traces/cost)
- `docs/bedrock/34_34-local-execution-investigation-record.md` (if an extraction-engine comparison is run)
- `docs/bedrock/35_35-coding-path-execution-state.md`
- `docs/agents/agent_documentation_contract.md`

## Conditional

- `docs/bedrock/01_01-workbench-first.md` — if big PDFs threaten daily-use responsiveness.
- `docs/bedrock/11_11-markdown-page-model.md` — if extracted-text shape questions arise.
- `docs/bedrock/24_24-doc-templates.md` — before new module notes.
- `docs/bedrock/26_26-okf-agent-context.md` — not expected.

## Deliberately excluded

- `09_09-web-source-tab.md` — M5 (next).
- `16_16-dev-docs-tab.md` — shipped.
- `19_19-dsl-future.md`, `20_20-relations-future.md`, `21_21-canvas-future.md` — later milestones.
- `23_23-references.md` — ad hoc.
- `25_25-use-cases.md` — narrative.
- `29_29-verification-grounding-router.md`, `30_30-public-knowledge-dictionary.md`, `31_31-truth-lens-ux.md`, `32_32-truth-investigation-record.md` — M6+.

# Execution

- [x] S01 Bootstrap (22): reconcile ledger vs repo; record `base_commit`;
      re-read 10 + 03 + 05 (the pages this path implements).
- [x] S02 PDF engine decision (15, dated): pdf.js/pdfjs-dist vs
      alternatives — rendering + text layer, worker isolation under 13,
      bundle weight; record what was NOT chosen and why.
      DONE 2026-07-08: pdfjs-dist 6.1.200 (Apache-2.0), isEvalSupported
      false always, local worker; viewer in renderer / extraction via
      legacy build in MAIN (the 10 fidelity split as process
      architecture); mupdf AGPL rejected, pdfium native-weight
      rejected, react-pdf needless, poppler noted as future extraction
      alternative. Record: sessions/2026-07-08-pdf-engine-decision.md.
- [x] S03 PDF as SOURCE: import path(s) → standard bundle (original.pdf
      + source.md + index.md) through the existing gates; dossier
      status/type for pdf; tests. DONE 2026-07-08: pdf-import.ts
      (magic %PDF- outranks label, checked BEFORE the vault is
      touched; 200 MB cap; slug dedupe; wx + cleanup; sha256 + bytes
      in the dossier per 10 §evidence); channel import-pdf-source
      (main dialog) + ＋PDF button in the sources tree (opens the new
      dossier); vaultFilesChanged emitted. Tests 247→251.
- [x] S04 Viewer tab (13 §isolation re-read first): new view kind,
      page navigation, tab param + restore, no remote content, local
      worker only; tests + screenshot. DONE 2026-07-08: .pdf enters
      the asset allowlist (same containment gates, 50 MB cap);
      PdfView.tsx — pdf.js 6.1.200 in the sandboxed renderer, worker
      from the LOCAL bundle, canvas render fitted to pane, ‹ page N/M ›
      nav; v6 removed the eval font path so the CVE-2024-4367 posture
      is structural upstream; rotation tools and transcribe buttons
      don't apply to PDFs (scoped out). DEFERRED to S06: page-in-tab-
      param restore (rides the open-at-page mechanism citation return
      needs anyway). Owner screenshot pending (his JF_Quote fixture).
- [ ] S05 Text extraction: text-layer pages → derived per-page text
      (visibly derived, identity + trace); image-only pages → the
      SEATED OCR pipeline; extraction status on the dossier; correction
      flow verified on extracted text; tests.
- [ ] S06 Anchors: page anchors recorded with notes created from
      selections (05/06); citation return path opens the viewer at the
      page; tests.
- [ ] S07 Acceptance run against 18 §M4 intents + truth slice; owner
      validation on a real PDF; review and close.

# Current checkpoint

```text
base commit : 35ec031
changed     : path opened 2026-07-08 on owner directive ("ok for PDF
              page, as source and as a viewer and text extraction")
              at CP-MVP-005 close. Inherits the proven OCR seat for
              scanned pages.
              S01 done 2026-07-08: base_commit 35ec031; 247/25 tests
              verified; tree = owner dogfooding files only; 10/03/05
              re-read — bundle shape sources/pdf/<slug>/ with
              extracted.md + anchors, "extraction is never the only
              path" (OCR seat ready), tabs are views over resources,
              selections are typed objects, renderer fidelity ≠
              extraction fidelity.
tests       : 251 passing / 26 suites
              S02 done 2026-07-08: pdfjs-dist 6.1.200 (dated decision
              record in sessions/2026-07-08-pdf-engine-decision.md);
              installed, 0 vulnerabilities.
              S03 done 2026-07-08: PDF-as-source landed (see step).
next action : S05 — extraction: pdf.js legacy in MAIN → extracted.md
              (derived, identity + trace); image-only pages via the
              seated OCR pipeline; owner's JF_Quote PDF as the real
              verification fixture
blockers    : none recorded
```

# Blockers

- None recorded.
