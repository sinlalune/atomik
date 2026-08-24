---
type: Atomik Session Record
title: CP-MVP-005 acceptance run — seats hardening
timestamp: 2026-07-08T15:10:00Z
path: CP-MVP-005
ceremony: closing
---

# CP-MVP-005 acceptance (2026-07-08)

## Definition-of-done sweep

- **Speech CUDA tier** ✓ — installed self-contained (`.atomik/speech/cuda/`),
  owner memo 1.83 s with the sealed S04 transcript reproduced byte-equal;
  CUDA → CPU → mock chain proven by tests (works / fails-and-demotes /
  absent); tier visible in `runtimeVersion` (+cuda) and every trace;
  CPU-only machines unchanged.
- **OCR seat** ✓ — Qwen3-VL 4B Q4_K_M (Apache) as bounded llama-mtmd-cli
  sidecar behind the same contract; media router images→OCR, audio→whisper;
  the PROVEN harness structural (EXIF upright + dossier rotation + scan
  filter + pre-resize ≈2 500 tokens /28 — flags never used); CUDA attempt
  fail-fast 90 s; `-n 3000` loop bound; weights sha256-recorded;
  **production validation: trace_8cabc37d — Pascal 2 in 12.6 s,
  `+cuda`, completed** (same file failed at 652 s in the morning);
  scan.jpg lands upright in the dossier, linked from transcript, dossier
  and index; mock stays the fallback.
- **Cloud rung** ✓ — Mistral OCR pinned `mistral-ocr-4-0` behind the
  explicit Cloud OCR button only (typed channel; never a fallback);
  key main-process only (Settings → AI store, 0600, masked hint;
  .env.local retired); absent key = explanatory refusal (owner hit it,
  message pointed to Settings → AI); result visibly cloud-derived.
  **OWNER VALIDATED 2026-07-08.**
- **13 §IPC** ✓ — new channels all typed and minimal: transcribe-source-cloud,
  reset-transcription, get-ai-settings, set-mistral-api-key,
  vault-files-changed (push).
- Gates ✓ — 247 tests / 25 suites, typecheck, build, smoke green at close.
- Records ✓ — module notes, the 34 record (S07 addenda 1–5 + S02/S03
  entries), ledger and log.md updated per unit; eleven commits today.

## M3 intents touched

The transcription seat swap stayed invisible except for output quality:
the same Transcribe button now produces a real French transcript from a
real phone photo in 12.6 s. Correction flow mechanism unchanged
(owner-validated in CP-MVP-002/004; same recordTranscriptCorrection hook).

## Dogfooding findings fixed same-day (owner session)

tree refresh on landed files (vaultFilesChanged push) · transcribe
buttons scoped to the source note · index.md maps derived files ·
Delete transcript… re-run affordance (round-trip tested) · Mistral key
store migration · rotation inheritance (orientation is the dossier's
state; rotate buttons dossier-only) · scan viewer toggle.

## Honest gaps carried forward

- HEIC/HEIF unreadable by nativeImage on Linux (clean traced failure).
- whisper CUDA attempt shares the 600 s timeout (no tier cap — long
  audio could legitimately need minutes; revisit if a whisper stall
  ever shows).
- GPU numbers are WSL2-with-NO_VMM numbers; re-bench on native builds
  before trusting elsewhere.
- Upstream llama.cpp 4B large-image bug not yet reported.
- Qwen3.5 pointer stays a refresh-round candidate (owner confirmed the
  seat directive meant Qwen3; no pending intent).

## Verdict

All DoD items met, owner validations in. CP-MVP-005 CLOSES 2026-07-08.
Next per register + owner directive: CP-MVP-003 (M4, PDF source tab).
