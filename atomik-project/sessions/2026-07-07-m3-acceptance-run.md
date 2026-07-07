---
type: Atomik Session Record
title: M3 acceptance run — capture sources + local speech baseline
description: Line-by-line evidence for the Milestone 3 acceptance intents (18 §M3), recorded at CP-MVP-002 S09.
tags: [session, acceptance, m3, capture, transcription]
timestamp: 2026-07-07T00:00:00Z
---

# M3 acceptance run — 2026-07-07

Gate state at run time: **220 tests / 23 suites green; typecheck, build,
smoke green** (smoke marker includes the AI proof and the capture
lifecycle with QR render). Repository at `893f735` (S08). Verdict
vocabulary from the S11 practice: PASS (evidenced), STRUCTURAL
(architecturally guaranteed, no live exercise yet), DEFERRED (explicitly
not built, with its re-entry point).

## Build items (18 §M3)

| Intent | Verdict | Evidence |
|---|---|---|
| QR local upload for phone images | PASS | S02–S03; OWNER-VALIDATED on real hardware 2026-07-07 (phone photo → QR page → upload after the WSL2 mirrored-networking + Hyper-V firewall runbook + stable port 41414); `capture-session.test.ts` covers every 13 §capture gate against the real HTTP surface |
| … and short audio | PASS (code) / pending (owner device) | S08: same session, same gates; m4a/webm/ogg/mp3/wav with magic sniffers (WAV/WEBP RIFF collision adversarially tested); phone page audio input. Owner has not yet uploaded audio from a real phone — same QR flow, no new network path, so no blocking risk |
| Save original image/audio | PASS | Byte-exact assertions in `capture-session.test.ts` / `capture-import.test.ts`; owner bundles live in the vault (sources/captures/Pascal, Pascal 2) |
| Create source.md dossier | PASS | S04 per 07/08 conventions (frontmatter, anchors, extracted-representations seat); wx discipline — occupied destinations refuse before the first byte |
| Image source tab | PASS | S05: original beside rendered dossier, verified on the owner's real capture (screenshot); audio originals play in the same tab (S08) |
| Replaceable OCR/transcription adapter | PASS (mock-first, by design) | S06: `TranscriptionAdapter` contract + deterministic mock; a REAL runtime enters only through a dated 34 evaluation — exactly the path's definition of done |
| transcript.md | PASS | S06: written wx, visibly derived; owner produced and corrected one live |
| Optional timestamp sidecar | DEFERRED | `segments.json` is 07's optional sidecar; meaningless for a mock that decodes nothing. Re-entry: the 34 evaluation that seats a real audio runtime |
| Human correction flow | PASS | S07: editor save of transcript.md flips the dossier to human-corrected + corrected_at, exactly once; OWNER exercised the gap live before the step existed (flywheel) |

## Truth and execution slice (18 §M3)

| Intent | Verdict | Evidence |
|---|---|---|
| Original media remains evidence | PASS | Originals never rewritten anywhere: import wx, rotation stored as dossier metadata with display-only canvas redraw, viewers read-only (data URL) |
| OCR/transcript is visibly derived | PASS | Transcript frontmatter (`derived: true`, `correction_state`, full transcription identity, `action_trace_id`) + "model output, uncorrected" banner; dossier records the same |
| Model cleanup ≠ verbatim transcription | PASS | The mock REFUSES to fabricate: it states no recognition ran and shows only verifiable facts (name/mime/bytes/sha256). `transcription.test.ts` pins the honesty |
| Execution location/runtime/model/latency/cost recorded | PASS | One `action: 'transcribe'` trace line per run: location, model+version, runtime+version, wallMs, EUR 0 estimated, bytes + sha256, contentRecorded=false (content-leak grep in tests). `audioSeconds` stays null for the mock — 33: no manufactured precision |

## Security posture (13 §capture, path definition of done)

One-time expiring tokens (timing-safe, uniform 403), size + MIME limits
with magic validation, temporary inbox under the state dir, explicit
desktop confirmation before any vault write, no new renderer write
powers (import/transcription run in main) — all covered by tests
against the real server; endpoint closed outside sessions.

## Honest gaps carried forward

- Owner-device audio upload not yet exercised (same flow as images).
- Inbox items orphaned by an app restart are invisible until a recovery
  listing exists (recorded at S04).
- Widget async DOM paths (live image cache, canvas rotation) verified
  visually, not unit-tested.
- External edits of transcript.md (outside atomik) don't flip the
  dossier; in-app saves do.

## Priority observations for the review

1. The mock transcript is now the daily-use ceiling: the owner captures
   real pages and voice memos but gets placeholder transcripts. The
   34-gated LOCAL RUNTIME EVALUATION (images: OCR; audio: speech) is the
   highest-value next investment — it fills `audioSeconds`, the optional
   sidecar, and the real daily value of M3.
2. CP-MVP-003 (PDF source, M4) is the register's next path; the capture
   seams (source tab, asset channel, adapter pattern) were built to be
   reused by it.
3. Dogfooding pressure this path absorbed (21 pre-S02 units + 5 in-path
   units) suggests keeping the continuous-gate practice unchanged.

## Addendum — same day, after the dogfooding batch

Owner-device AUDIO is now VALIDATED end to end, both directions: phone
recording (URecorder m4a, accepted after the bytes-outrank-labels fix)
and desktop mic (audible take after selecting the right Windows default
input — WSLg exposes exactly one bridge device, so the physical mic is
chosen in Windows; recorded in the module note). Audio playback fixed
en route (CSP `media-src`). The only remaining honest gaps are the
deliberately deferred ones (timestamp sidecar → 34 evaluation; inbox
recovery listing).

## Review and close

Per the continuous-gate practice, the PATH CLOSE is the owner's
decision. This record is the agent-side half; the owner review seals it.

SEALED 2026-07-07: owner reviewed and closed the path, choosing the
LOCAL SPEECH RUNTIME EVALUATION (priority observation 1) as the next
path — CP-MVP-004. CP-MVP-003 (PDF) stays reserved for M4.
