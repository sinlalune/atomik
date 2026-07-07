---
type: Atomik Session Record
title: Speech runtime candidates — dated refresh (CP-MVP-004 S03)
description: Web-checked 2026-07-07 — versions, licenses, French support, CPU/WSL2 fit; three candidates chosen for the bench, rejections recorded.
tags: [session, evaluation, speech, candidates, investigation]
timestamp: 2026-07-07T00:00:00Z
---

# Speech runtime candidates — checked 2026-07-07

Dated capability evidence (34): true today, re-check before reuse.
Machine context: AMD Ryzen 7 8700F (8 cores), 15 GB RAM, WSL2 Ubuntu
noble, no assumed GPU. Toolchain present: gcc/cmake/python3/pip/node.

## Chosen for the bench (S04)

| candidate | version (checked 2026-07-07) | license | integration shape | why |
|---|---|---|---|---|
| whisper.cpp | v1.8.6 (2026-06-01); 1.8.3 brought iGPU gains, CPU path mature | MIT | compile once, single CLI/sidecar binary, ggml quantized models | the broadest local-first candidate in bedrock 34; cleanest Electron sidecar story (one binary, no runtime deps) |
| faster-whisper | active 2026 (CTranslate2, int8 CPU); no new base Whisper weights in 2026 — large-v3/distil remain newest | MIT | python venv; PyAV decodes m4a/webm/mp3 natively | strongest CPU throughput claims (int8); decoding built in; heavier to SHIP (python) but must be measured before being rejected on deployment grounds |
| sherpa-onnx | 1.13.3 on npm (~2026-06); node-addon with prebuilt binaries | Apache-2.0 | `npm i sherpa-onnx-node` — no compile, direct in-process Node | the natural Electron-main integration if quality/speed hold; also the streaming path for later |

Whisper-family models are multilingual (French included) — evaluation
runs `base` and `small` multilingual variants per candidate; the
correction-effort metric decides whether `base` suffices or `small`
(or larger) is needed for the owner's French.

## Rejected (dated reasons)

- **Vosk** — older Kaldi-generation models; whisper-family French
  accuracy has outclassed it; revisit only if resource limits bite.
- **NVIDIA Parakeet-TDT** — English-focused, GPU-oriented benchmark
  candidate (34); owner needs French on CPU.
- **Moonshine (sherpa models, 2026-02)** — English-only today.
- **whisperX** — adds forced alignment/diarization atop faster-whisper;
  capability not needed for short memos; cost unjustified (15).
- **OpenAI whisper (reference impl)** — the slow baseline the three
  candidates reimplement; nothing to learn from running it here.

## Decoding note

whisper.cpp and sherpa-onnx consume 16 kHz WAV; the fixtures are
m4a/webm/mp3. The harness decodes once with PyAV (same library
faster-whisper uses internally) so every candidate sees identical
input samples — a decode disagreement would otherwise contaminate the
comparison.

Sources: [whisper.cpp releases](https://github.com/ggml-org/whisper.cpp/releases), [whisper.cpp 1.8.3 performance](https://www.phoronix.com/news/Whisper-cpp-1.8.3-12x-Perf), [faster-whisper](https://github.com/SYSTRAN/faster-whisper), [sherpa-onnx npm](https://www.npmjs.com/package/sherpa-onnx), [sherpa-onnx repo](https://github.com/k2-fsa/sherpa-onnx)

## S04 mechanical results (run 2026-07-07, Ryzen 7 8700F, 8 threads, CPU)

| candidate | model | fixture | audio s | wall ms | RTF | peak RSS MB | lang |
|---|---|---|---|---|---|---|---|
| faster-whisper | base | fx-desktop-1 | 3.2 | 2484 | 0.78 | 381 | en |
| faster-whisper | base | fx-desktop-2 | 4.1 | 8885 | 2.17 | 421 | pl |
| faster-whisper | base | fx-urecorder | 3.5 | 3031 | 0.87 | 320 | fr |
| faster-whisper | base | fx-whatsapp | 181.1 | 24737 | 0.14 | 469 | fr |
| faster-whisper | small | fx-desktop-1 | 3.2 | 3406 | 1.06 | 777 | en |
| faster-whisper | small | fx-desktop-2 | 4.1 | 3674 | 0.90 | 580 | fr |
| faster-whisper | small | fx-urecorder | 3.5 | 3432 | 0.98 | 580 | fr |
| faster-whisper | small | fx-whatsapp | 181.1 | 26476 | 0.15 | 782 | fr |
| sherpa-onnx | base | fx-desktop-1 | 3.2 | 1042 | 0.33 | 378 | — |
| sherpa-onnx | base | fx-desktop-2 | 4.1 | 694 | 0.17 | 377 | — |
| sherpa-onnx | base | fx-urecorder | 3.5 | 630 | 0.18 | 371 | — |
| sherpa-onnx | base | fx-whatsapp | 181.1 | 3807 | 0.02 | 569 | — |
| sherpa-onnx | small | fx-desktop-1 | 3.2 | 3259 | 1.02 | 802 | — |
| sherpa-onnx | small | fx-desktop-2 | 4.1 | 2693 | 0.66 | 825 | — |
| sherpa-onnx | small | fx-urecorder | 3.5 | 2259 | 0.65 | 816 | — |
| sherpa-onnx | small | fx-whatsapp | 181.1 | 6024 | 0.03 | 1109 | — |
| whisper.cpp | base | fx-desktop-1 | 3.2 | 14605 | 4.56 | 284 | — |
| whisper.cpp | base | fx-desktop-2 | 4.1 | 11138 | 2.72 | 283 | — |
| whisper.cpp | base | fx-urecorder | 3.5 | 6632 | 1.89 | 284 | — |
| whisper.cpp | base | fx-whatsapp | 181.1 | 4096 | 0.02 | 310 | — |
| whisper.cpp | small | fx-desktop-1 | 3.2 | 4686 | 1.46 | 750 | — |
| whisper.cpp | small | fx-desktop-2 | 4.1 | 4515 | 1.10 | 750 | — |
| whisper.cpp | small | fx-urecorder | 3.5 | 4381 | 1.25 | 750 | — |
| whisper.cpp | small | fx-whatsapp | 181.1 | 14745 | 0.08 | 777 | — |

Notes on the numbers: whisper.cpp wallMs INCLUDES process spawn + model
load per run (a seated sidecar keeps the model warm — its server mode
exists); faster-whisper/sherpa report decode-only wall with load
measured separately (fw small load ≈ 1.9 s; sherpa small ≈ 2.6 s).

### Findings (mechanical half)

- QUALITY FLOOR: `base` fails the owner's French outright (gibberish /
  wrong-language detection at prob ≈ 0.4). `small` multilingual is the
  minimum: all three candidates produce IDENTICAL, correct text on the
  short memos ("Je m'appelle Julien. Allô ?").
- THE LONG FIXTURE discriminates: fx-whatsapp (181 s, sung voice note)
  → faster-whisper small produced the only full coherent transcript;
  whisper.cpp small emitted `*Musique*` annotations (music
  suppression); sherpa-onnx finished suspiciously fast (6 s) because
  its whisper path decodes ~30 s max per stream — a hard limit for
  long memos without app-side chunking.
- SILENCE: every candidate hallucinates on the silent take
  (" you") — confirms the level-meter guard; the seated adapter
  should consider a no-speech threshold.
- RTF is a non-issue on this CPU for `small` (0.03–1.5; long audio
  amortizes to ≈ 0.15); peak RSS ≈ 580–1100 MB during decode.

### Mechanical recommendation (owner correction pass pending)

`small` multilingual, seated via **whisper.cpp (sidecar binary, server
mode for warm loads)** IF memo-grade quality suffices — cleanest
deployment (1 MB binary + 487 MB model, MIT). **faster-whisper** wins
on long/musical audio and reports language/segments richer — at the
cost of shipping a python runtime. sherpa-onnx drops out unless we
chunk (30 s whisper limit). The owner's correction pass — especially
on the long transcript and ideally one REAL 30–90 s spoken memo (the
S02 gap) — makes the final call.

Bench artifacts: harness + raw outputs under `.atomik/speech-bench/`;
correctable transcripts as .md in `sources/captures/speech-bench-2026-07-07/`
(git-ignored with the rest of captures).
