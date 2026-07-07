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
