---
type: Atomik Learning Note
title: 'Learning: local speech and OCR seats — capability tiers, not promises'
description: Beginner-first walkthrough of CP-MVP-004/005 — how measured local runtimes took the transcription seat as demotable tiers, with an explicit cloud rung and provider keys behind main.
tags: [learning]
timestamp: 2026-07-21T00:00:00Z
---

# Learning: local speech and OCR seats — capability tiers, not promises

*Covers CP-MVP-004 and CP-MVP-005 (both shipped 2026-07-08). Backfilled 2026-07-21 while repaying the learning-layer stall (see index §Coverage debt).*

## Who this is for and what you can do afterwards

You read notes [07](./07-action-traces-and-cost-observability.md) and
[11](./11-local-http-capture-server.md). After this one you can read
`electron-main/transcription.ts`, `whisper-adapter.ts`, `sidecar.ts`,
`ocr-adapter.ts`, `mistral-ocr-adapter.ts`, and `ai-settings.ts` — and
answer: when the owner clicks **Transcribe**, which brain runs, why
THAT one, what happens when it fails, and what was measured first.

## The technologies involved, from zero

**A local model runtime.** A model is a file of numbers (weights); a
runtime is the program that executes them, offline, on your machine.
The speech seat runs **whisper.cpp** v1.8.6 — one MIT C++ binary,
`whisper-cli` — over `whisper-small` multilingual weights
(`ggml-small.bin`); it reads wav/mp3/flac only, so system `ffmpeg`
first decodes every original to 16 kHz mono WAV (Electron has no AAC).
The OCR seat runs **llama.cpp**'s `llama-mtmd-cli` over **Qwen3-VL
4B** (Apache-2.0), a vision-language model reading a page photo.

**GGUF and quantization.** The OCR weights are `qwen3vl-4b-q4.gguf`
plus an `mmproj` (vision projector) file; GGUF is the llama.cpp
family's single-file weights container (whisper's `ggml-*.bin`: same
idea, earlier format). `Q4_K_M` means quantized to ~4 bits per weight —
smaller and faster at a quality cost the bench MEASURED, not assumed.
Weights live in the STATE DIR (`.atomik/speech/`, `.atomik/ocr/` —
git-ignored, sha256 recorded), never the vault: machine state.

**In-process vs sidecar.** An npm addon runs INSIDE your process: its
crash is your crash. A **sidecar** is a separate short-lived process;
`sidecar.ts` is the whole discipline in 31 lines: `execFile`, hard
timeout with `SIGKILL`, a 32 MB output cap, and `LD_LIBRARY_PATH`
pointed at the binary's own directory so installed sidecars carry
their `.so` files. Media path in, text out, zero vault access.

**CUDA.** The same runtimes compiled for this machine's RTX 5070 — GPU
turns ~154 s of CPU OCR per dense page into ~10 s, on THIS machine: a
tier, not the product.

## The architecture concepts mobilized (named)

```text
adapter seam      one typed contract, many brains: TranscriptionAdapter
                  = { id, transcribe(job) → TranscriptionOutput };
                  identity travels IN the answering adapter's output
capability tier   a measured, per-device, demotable capability — never
                  a release-wide promise (33 device tiers, 34 dated
                  evidence): CUDA is the bonus, CPU the floor, the mock
                  the guarantee that capture never blocks (08)
fallback chain    CUDA → CPU → mock with STICKY per-session demotion:
                  the first CUDA failure demotes the tier for good
media router      routeByMedia(audio, ocr): image/* jobs go to the OCR
                  seat, everything else to speech — pure composition
cloud rung        an EXPLICIT per-capture action, never a silent
                  fallback (13); pinned model id, key held in main only
visibly derived   transcript.md declares its machine origin; an editor
                  save flips the dossier to human-corrected (08)
```

## Walkthrough of the real code

`transcription.ts` owns the pipeline. `transcribeSource` resolves the
dossier (`source.md` only), reads its `resource:`, gates the MIME by
extension, then calls whatever adapter main seated. The transcript is
written `wx` — it REFUSES to clobber an existing `transcript.md`
(corrections live there); the explicit re-run is `resetTranscription`
("Delete transcript…"), restoring bundle, dossier, and `index.md`.

`whisper-adapter.ts`: ffmpeg decode, then `whisper-cli` with `-l auto`
(see lessons) and `-oj`, whose JSON becomes the optional `segments.json`
time-anchor sidecar via `parseWhisperSegments`; `audioSeconds` comes
from the decoded WAV bytes — measured, never guessed. CUDA runs first
while healthy; `runtimeVersion` reads `v1.8.6+cuda` or `v1.8.6`.

`ocr-adapter.ts`, same contract: effective uprighting = EXIF
orientation (`exifOrientationDegrees`, `exif.ts`) + dossier rotation,
mod 360, then an INJECTED `ImageResizer`. The real one
(`nativeImageResizer` in `index.ts`) is the proven harness: scale so
pixels/784 ≈ 2 500 tokens, dimensions multiples of 28, never upscale,
then `rotateRgba` + `scanCleanRgba` (`scan-filter.ts`). The sidecar
runs `--temp 0`, `-n 3000` (bounds degeneration loops), a 90 s
CUDA-attempt timeout, 600 s on the CPU floor; the cleaned image the
model read returns as `scanJpeg` and lands as `scan.jpg` — the
ORIGINAL stays the evidence. `index.ts` seats adapters at startup by
existence checks (`whisperSeatReady`, `ocrSeatReady`): state-dir
defaults, `ATOMIK_WHISPER_BIN`-style env overrides, mock otherwise.

The cloud rung: the `transcribeSourceCloud` handler reads the key in
MAIN — `readMistralKey(stateDir)` first, `MISTRAL_API_KEY` env as dev
override — and with no key throws `"cloud ocr: no Mistral API key
configured (Settings → AI) — nothing was sent"`. With one,
`createMistralOcrAdapter` posts the image to `api.mistral.ai/v1/ocr`
with the PINNED id `mistral-ocr-4-0` (upgrades are new dated
decisions, never alias drift), bounded by a 180 s `AbortController`;
the result rides the ordinary pipeline as `location: 'cloud-model'`.
`ai-settings.ts` is the key store: `ai-settings.json` in the state
dir, mode 0600; `publicAiSettings` returns only presence + a masked
hint (`••••1234`) — the raw key never crosses back (13).

Traces: `recordTranscription` (`action-trace.ts`) appends one line per
run, completed or failed — input bytes + sha256, `audioSeconds`
runtime-reported or null (the mock reports null, no fabricated
durations), measured `wallMs`, billing typed `{ EUR, estimatedAmount:
0, basis: 'estimated' }` — external cost only; provider-reported values
get their own fields (note 07's rule). `contentRecorded: false` is
enforced by a test grepping the ledger for transcript prose.

## How it was built (methodology)

The order was the method: **protocol → candidates → bench → owner
decision → seat**. CP-MVP-004 S02 wrote the protocol first
(`atomik-project/sessions/2026-07-07-speech-eval-protocol.md`): four
real fixtures manifested by sha256 (public repo — the owner decided
FIRST that `sources/captures/` stays git-ignored; hashes travel,
voices do not), and one selection rule: minimize CORRECTION EFFORT
per usable transcript minute (02), ties to the smaller runtime.

S03 dated the candidates (`2026-07-07-speech-candidates.md`):
whisper.cpp, faster-whisper, sherpa-onnx chosen, rejections recorded
with dated reasons. S04 ran 24 mechanical rows plus 12 when the
owner's research corrected the set: `base` fails the owner's French,
`small` is the floor, the 181 s fixture discriminates, everything
hallucinates on silence. Then the FINAL ROUND on the owner's
deliberate 30 s memo: **Parakeet, the mechanical leader, collapsed
into eight English nonsense words**. Leaderboards decided nothing;
dated on-machine evidence decided everything — exactly why 34 exists.
Winner: whisper-small via whisper.cpp, by deployment tie-break (one
MIT binary, no python to ship, 15); faster-whisper the quality
alternate.

OCR rode the same discipline as an explicit GO/NO-GO: RapidOCR proved
capability, seating DEFERRED; then VLM rounds, the GPU discovery, the
clean-scan tier, the pre-resize harness that un-stalled the 4B, a
license VERIFIED ON TEXT (Qwen2.5-VL 3B: "research or evaluation
purposes only" — seat-disqualified), and a benched API ceiling
(Mistral OCR, letter-perfect on scans, ~2.4 s). Evaluation could
precede integration because the SEAT already existed — the CP-MVP-002
mock pinned the contract — so CP-MVP-005 was pure seating of the
owner's three directives. Both acceptance runs swept the definition of
done line by line (`2026-07-07-cp-mvp-004-acceptance.md`, gate 231
tests; `2026-07-08-cp-mvp-005-acceptance.md`, 247 tests / 25 suites):
the owner memo at 1.83 s on CUDA byte-equal to the sealed transcript,
and production trace_8cabc37d — Pascal 2 in 12.6 s `+cuda`, the same
file that burned 652 s that morning. Honest gaps carried in writing.

## Lessons learned the hard way

- **`-l auto`, always**: without it whisper.cpp silently TRANSLATES
  French into English — caught mid-bench, now hard-coded in the args.
- **Two truths for one file**: Chromium applies EXIF orientation
  silently; Electron's `nativeImage` does not. The page LOOKED upright,
  the model got it sideways and looped until context overflow — the
  652 s incident. Fix: `exif.ts` + dossier rotation, plus the 90 s
  CUDA cap and `-n 3000` so a future loop costs seconds.
- **Silent fallback is undiagnosable**: the owner's first in-app run
  died with no usable cause; demotions now `console.warn` their cause
  and the answering tier is in every transcript and trace.
- **Self-contained or haunted**: the CPU install silently resolved its
  `.so` files from the BENCH build tree via RUNPATH; `LD_LIBRARY_PATH`
  beside the binary (`sidecar.ts`) makes installs carry their own.
- **Fear exit-0 emptiness**: Unlimited-OCR generated 4 blank bytes,
  exit 0, under the wrong recipe; `--image-max-tokens` is silently
  broken for the 4B — main pre-resizes and never trusts the flag.

## Try it yourself (exercises)

1. `cd apps/desktop && npx vitest run tests/transcription.test.ts
   tests/ai-settings.test.ts`. Find the sticky-demotion test (the fake
   failing CUDA binary ran exactly ONCE across two jobs) and the 0600 +
   `••••1234` assertions in the settings test.
2. Trace a click: from the `transcribeSource` handler in
   `electron-main/index.ts` into `transcribeSource` → `routeByMedia` →
   adapter. Name where identity is decided (the answering adapter) and
   its three landing places (transcript, dossier, trace).
3. Read the ledger: `grep '"action":"transcribe"'
   .atomik/usage/private/actions.jsonl` — check `runtimeVersion` for
   `+cuda`, plus `audioSeconds` and `outcome.status`. Then grep any
   real transcript phrase: absent.
4. Open `atomik-project/sessions/2026-07-07-speech-candidates.md` at
   "FINAL ROUND": why did the mechanical leader lose the seat?
5. Prove the floor: launch with `ATOMIK_WHISPER_BIN=/nonexistent` and
   transcribe an audio capture — the mock answers, saying "No text
   recognition ran", `location: deterministic`. Capture never blocks.

## Vocabulary you now own

```text
GGUF / ggml        single-file weights containers of the llama.cpp family
quantization       fewer bits per weight: smaller, faster, measured cost
sidecar            a bounded child process: path in, text out, SIGKILL
adapter seat       the typed slot any transcription brain plugs into
capability tier    per-device measured capability, demotable, no promise
sticky demotion    one tier failure per session, then straight to the floor
cloud rung         explicit per-capture escalation, pinned model, key in main
runtime-reported   a measured value, never an estimate (33)
```

## What arrives next

- The cloud rung grew a SPEECH twin the day after (CP-MVP-003 S06f):
  `createVoxtralTranscribeAdapter` in `mistral-ocr-adapter.ts`, pinned
  `voxtral-mini-2602` — the cloud button routes by media too.
- PDF extraction (CP-MVP-003 S05) reuses THIS OCR seat for scans.
- Honest gaps stay on record in the 005 acceptance: HEIC unreadable by
  `nativeImage` on Linux, whisper's CUDA attempt shares the 600 s
  timeout, GPU numbers are WSL2-with-NO_VMM numbers.
- CP-MVP-008 proposes the first real GENERATION provider — the same
  seat discipline one level up.
