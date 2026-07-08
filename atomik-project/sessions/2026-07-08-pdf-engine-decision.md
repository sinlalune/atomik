---
type: Atomik Session Record
title: CP-MVP-003 S02 — PDF engine decision (dated, 15)
timestamp: 2026-07-08T16:00:00Z
---

# PDF engine decision — 2026-07-08

**CHOSEN: pdfjs-dist 6.1.200 (Apache-2.0, Mozilla).** Zero native code,
worker-isolated, canvas rendering + text layer from one engine, healthy
release cadence (Snyk), the de-facto Electron standard.

## Security posture (13)

- `isEvalSupported: false` ALWAYS (CVE-2024-4367: malicious PDFs could
  execute JS via eval'd font matrices in ≤4.1.392; patched ≥4.2.67 —
  we run 6.x and force the option off anyway; defense in depth).
- Worker loaded from the LOCAL bundle only (CSP already forbids remote).
- The viewer renders in the SANDBOXED renderer; the original PDF bytes
  arrive through the existing asset gates.

## The split that implements bedrock 10 literally

"Renderer fidelity and extracted-text fidelity are separate" becomes
process architecture:

- **Viewer** — pdf.js in the renderer: display only, never the source
  of any derived file.
- **Extraction** — pdf.js legacy build in MAIN: per-page text through
  the transcription-shaped pipeline (visibly derived `extracted.md`,
  extraction identity incl. engine version, ONE ActionTrace per run,
  33); image-only pages route to the SEATED OCR pipeline (Qwen3-VL 4B,
  the CP-MVP-005 dividend) — 10's "do not hardcode text extraction as
  the only path", honored from day one.

## Rejected, with reasons (dated)

| candidate | why not |
|---|---|
| mupdf(.js) 1.28.0 | **AGPL-3.0** — copyleft posture incompatible with this public permissive repo; also wasm weight |
| pdfium bindings | BSD but a native module: build/platform weight the 15 discipline rejects when a zero-native peer exists |
| react-pdf | wrapper over pdfjs-dist; we have our own view patterns — a layer without a job |
| poppler `pdftotext` sidecar | extraction-only (no viewer); NOTED as the future extraction alternative if the pdf.js text layer disappoints on real documents — a 34 re-bench trigger, not a seat today |
