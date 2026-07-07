---
type: Atomik Session Record
title: Speech runtime evaluation — protocol and fixture manifest
description: CP-MVP-004 S02 — how candidates are measured, on what, and the selection rule; fixtures stay local by owner decision (public repo).
tags: [session, evaluation, speech, transcription, protocol]
timestamp: 2026-07-07T00:00:00Z
---

# Speech runtime evaluation — protocol (CP-MVP-004 S02)

## Fixture policy (owner decision, 2026-07-07)

The fixtures are the owner's real recordings. The repository is PUBLIC,
so `sources/captures/` is git-ignored in full: media, dossiers, and
transcripts all stay local. This manifest carries hashes and metadata so
the evaluation is verifiable without publishing anyone's voice.
Committed dossier/transcript publication stays possible later, per
bundle, by explicit owner move.

## Fixture manifest (initial; owner may add memos before S04)

| id | file | sha256 (16) | bytes | kind | notes |
|---|---|---|---|---|---|
| fx-urecorder | 2026-07-07-urecorder-20260707-133328/original.m4a | 24863e653a71a113 | 59 332 | phone m4a | Android URecorder; short memo |
| fx-desktop-1 | 2026-07-07-desktop-recording-2026-07-07t12-12/original.webm | e71e19d3a6f55c0f | 51 494 | desktop webm | WSLg RDP bridge mic |
| fx-desktop-2 | 2026-07-07-desktop-recording-2026-07-07t12-51/original.webm | 9c5313c358c44f28 | 66 950 | desktop webm | validated audible take |
| fx-whatsapp | 2026-07-07-aud-20200320-wa0000/original.mp3 | d2114df4d5cd9336 | 2 897 293 | phone mp3 | 2020 WhatsApp voice note — longest fixture, compressed telephony-style audio |

Durations are measured by the harness at run time (each candidate
decodes the media; a decode disagreement across candidates is itself a
finding). Language: French-first, English technical vocabulary expected.
Gap to fill before S04 if convenient: one memo with deliberately mixed
French/English technical terms (the atomik daily-use case).

The Pascal image bundles are OCR fixtures for S07, not speech.

## Metric sheet (per candidate run, per fixture — 33 §evaluation gates)

```text
identity   : model + revision + quantization · runtime + version
machine    : CPU model, cores, RAM (recorded once per session), WSL2
decode     : reported audio seconds
quality    : transcript file kept beside the run record;
             CORRECTION EFFORT = owner edits the transcript to
             acceptable, we record chars-changed / total-chars and
             minutes spent (02: correction effort IS the metric)
latency    : wall ms · real-time factor (wall / audio seconds)
             first-result ms where streaming applies
resources  : peak RSS · model file size on disk · load/startup ms
language   : FR quality notes · EN-technical terms survival ·
             code-switching behavior
timestamps : segment presence/quality (drives the S06 sidecar)
```

## Selection rule (33)

The winner minimizes **correction effort per usable transcript minute**,
subject to: RTF usable on this CPU (≲ 1.5× for short memos), peak memory
reasonable beside Electron, license compatible, French quality
acceptable to the owner. Published benchmark scores decide nothing;
ties break toward the smaller/simpler runtime (15).

## Honesty rules carried from the bedrock

- The mock stays as fallback; a missing/failed runtime must never block
  capture (08).
- `audioSeconds`/tokens reported by the runtime are recorded as
  runtime-reported, never conflated with estimates (33).
- Results are DATED capability evidence (34), not permanent truths.
