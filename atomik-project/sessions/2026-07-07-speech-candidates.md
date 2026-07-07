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

## Addendum — owner research corrects the candidate set (2026-07-07)

The owner's market study (`docs/research/model-research.md`, committed)
adds two candidates the S03 refresh missed:

- **Parakeet-TDT-0.6B-v3** — the S03 rejection ("EN/GPU") was STALE:
  v3 covers 25 European languages incl. French, CC-BY-4.0, ONNX,
  reported RTFx ~3,333 and 6.34% avg WER (Open ASR leaderboard).
  Attribution required (CC-BY). Benching via sherpa-onnx transducer.
- **whisper large-v3-turbo** — 809M distilled large-v3 (MIT), the
  research's pick for CPU laptops; ~2.6 GB RAM fits this machine.
  Benching via whisper.cpp and faster-whisper.
- **Voxtral Mini Transcribe V2** (~4% FLEURS-FR WER, Apache 2.0) noted
  as the French quality reference but NOT benched: 4B/BF16 targets GPU
  (16 GB VRAM); revisit if a quantized CPU path appears.

Fixture honesty note from the owner: the current recordings were not
made with evaluation in mind (4 s name-checks + one sung note); new
30–90 s spoken memos (FR with EN technical terms) are being recorded
before the winner seals.

## Extension results — owner-research candidates (run 2026-07-07, same machine)

| candidate | model | fixture | audio s | wall ms | RTF | peak RSS MB | lang |
|---|---|---|---|---|---|---|---|
| faster-whisper | large-v3-turbo | fx-desktop-1 | 3.2 | 10455 | 3.27 | 1937 | en |
| faster-whisper | large-v3-turbo | fx-desktop-2 | 4.1 | 10934 | 2.67 | 1653 | fr |
| faster-whisper | large-v3-turbo | fx-urecorder | 3.5 | 10717 | 3.06 | 1653 | fr |
| faster-whisper | large-v3-turbo | fx-whatsapp | 181.1 | 46418 | 0.26 | 1653 | fr |
| parakeet-v3-sherpa | tdt-0.6b-v3-int8 | fx-desktop-1 | 3.2 | 183 | 0.06 | 847 | — |
| parakeet-v3-sherpa | tdt-0.6b-v3-int8 | fx-desktop-2 | 4.1 | 224 | 0.05 | 857 | — |
| parakeet-v3-sherpa | tdt-0.6b-v3-int8 | fx-urecorder | 3.5 | 188 | 0.05 | 853 | — |
| parakeet-v3-sherpa | tdt-0.6b-v3-int8 | fx-whatsapp | 181.1 | 14712 | 0.08 | 2486 | — |
| whisper.cpp | large-v3-turbo | fx-desktop-1 | 3.2 | 20883 | 6.53 | 1802 | — |
| whisper.cpp | large-v3-turbo | fx-desktop-2 | 4.1 | 21103 | 5.15 | 1802 | — |
| whisper.cpp | large-v3-turbo | fx-urecorder | 3.5 | 20876 | 5.96 | 1802 | — |
| whisper.cpp | large-v3-turbo | fx-whatsapp | 181.1 | 80942 | 0.45 | 1846 | — |

### Findings

- **Parakeet-TDT-0.6B-v3 (sherpa-onnx, int8) is the mechanical leader**:
  perfect French on the short memos in ~200 ms (RTF 0.05 — an order of
  magnitude faster than whisper-small), and a FULL coherent transcript
  of the 181 s sung fixture in 14.7 s (no 30 s transducer limit; RAM
  scales with length, 2.5 GB peak on the long one). Slightly weaker
  than faster-whisper-small on sung lyrics; equal on speech. CC-BY-4.0
  (attribution required). In-process npm integration available — still
  to be seated as an isolated worker per 13.
- **large-v3-turbo is NOT worth it on this CPU**: 10–21 s per short
  memo (incl. load), 1.6–1.9 GB RAM, quality identical to small on
  speech — and it dropped a consonant small got right ("Julie" vs
  "Julien"); whisper.cpp turbo hallucinated the classic "Sous-titrage
  Société Radio-Canada" loop on the sung fixture. The research's
  laptop-ceiling pick assumes GPU-class hardware; on this Ryzen the
  small/Parakeet tier wins.
- Standing: quality tie on trivial memos means the OWNER MEMOS
  (30–90 s spoken FR + EN technical terms) decide between
  **parakeet-v3** (speed, long audio, in-process) and
  **faster-whisper-small** (best sung/hard audio) — with
  **whisper.cpp-small** the deployment-simplicity fallback.

## FINAL ROUND — the owner's deliberate memo decides (2026-07-07)

Fixture: benchmark_device_long (30.6 s spoken French, phone m4a).

| candidate | wall ms | RTF | verdict on REAL French |
|---|---|---|---|
| faster-whisper small | 4 984 (fr 0.96) | 0.16 | near-perfect transcript, one homophone slip ("sage"/"sache") |
| whisper.cpp small | 11 758 (incl. load) | 0.38 | same text, fillers preserved — equally correct |
| parakeet-v3 (sherpa int8) | 1 524 | 0.05 | **COLLAPSED**: 8 English nonsense words for 30 s of French |

Parakeet's earlier "perfect French" on 4 s clips did not survive a real
memo: the sherpa transducer export produced English gibberish ("And
then we're gonna have a very test.") — whether the export defaults to
EN or the auto-langdetect fails, AS SEATED it cannot serve the owner's
core use. Dated finding; contradicts leaderboard expectations — which
is exactly why 34 demands on-machine evidence.

### WINNER: whisper-small, seated via whisper.cpp

Quality is identical between the two whisper implementations on the
deciding fixture; deployment decides (15): whisper.cpp is a single MIT
binary + one 487 MB model file, no python runtime to ship, server mode
available for warm loads. faster-whisper stays the recorded QUALITY
ALTERNATE (best on hard/sung audio, richer segments) should the seat
ever need it. Owner correction pass on the two FINAL-*.md transcripts
confirms (expected effort: one word).
