---
type: Atomik Session Record
title: CP-MVP-004 acceptance run — local speech runtime
description: Line-by-line evidence against the definition of done; close awaits the owner.
tags: [session, acceptance, speech, transcription]
timestamp: 2026-07-07T00:00:00Z
---

# CP-MVP-004 acceptance — 2026-07-07

Gate: 231 tests / 25 suites, typecheck + build green, repo at d0329f2.

| Definition-of-done line | Verdict | Evidence |
|---|---|---|
| Dated investigation record with on-machine measurements | PASS | sessions/2026-07-07-speech-candidates.md: 37 bench rows (5 candidates × sizes × fixtures incl. the owner's deliberate memo), machine identity, licenses, rejections dated |
| Winner seated as isolated sidecar (12/13) | PASS | whisper-adapter.ts: execFile + hard timeouts + SIGKILL, tmp workdir, no vault access; model in state dir (git-ignored); env-overridable paths |
| transcript.md real + visibly derived; audioSeconds + reported counts; mock fallback | PASS | OWNER-VALIDATED "perfect" on the real memo; trace carries runtime-reported audioSeconds; mock stays the fallback (capture never blocks) |
| S07 correction + capture surfaces untouched | PASS | correction flip owner-exercised; zero changes to capture flows |
| OCR evaluated with same discipline, honest GO/NO-GO | PASS | GO on capability (RapidOCR read the real Pascal photo, 3.6 s CPU); SEATING deferred as its own decision (python deployment); handwriting honestly untested |
| Fixture privacy decided before fixtures | PASS | owner decision: sources/captures/ git-ignored in full; hashes in the committed manifest |
| Segments sidecar | PASS | whisper -oj → segments.json (wx, linked, never canonical) |

Honest gaps: parakeet language-handling failure recorded (sherpa int8
export); WSLg audio bridge limits (long in-app playback freeze, capture
stall suspicion) documented with the external-player escape hatch —
absent from native builds; OCR seat open.

## Close

The owner seals. Candidate next paths: OCR seating decision,
CP-MVP-003 (PDF, M4), or dogfooding consolidation.
