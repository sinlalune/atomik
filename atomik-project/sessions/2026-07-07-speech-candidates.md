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

## S07 — OCR GO/NO-GO (dated 2026-07-07)

RapidOCR (PaddleOCR models on onnxruntime, Apache-2.0, pure CPU) on the
owner's REAL Pascal page photo (oblique, curved page, French print):
load 0.6 s, recognition 3.6 s, 20 lines — the text is genuinely usable
("Qu'est-ce que le moi ?", full sentences, accents partially dropped,
line ORDER scrambled by the oblique/rotated shot — one line came out
mirrored; the dossier rotation should be applied before recognition).

**VERDICT: GO on capability, seating DEFERRED as its own decision.**
The blocker is deployment, not quality: RapidOCR is python (the same
shipping question faster-whisper lost on). Options recorded for the
seating step: onnxruntime-node + Paddle pre/post reimplementation
(heavy), a python sidecar (revisits the S05 decision), or a VLM
candidate from the owner's research. The TranscriptionAdapter contract
is ready either way — images ride the same seat when one is chosen.
Handwriting: untested, expectations stay honest (owner research: weak
across traditional engines).

## S07 addendum — OCR comparative on the owner's research picks (2026-07-07)

Same real Pascal photo (phone, oblique, curved page, French print):

| candidate (owner research) | time | output on the REAL photo |
|---|---|---|
| RapidOCR (Paddle models, onnxruntime CPU) | 3.6 s | 20 usable lines, full sentences; accents partial, line order scrambled by the angle |
| Tesseract 5 -l fra, raw photo | 2.7 s | pure garbage — the stored image is ROTATED and Tesseract has no angle classifier |
| Tesseract 5 -l fra, pre-rotated upright | 2.6 s | still mostly noise/fragments (curved page, uneven light defeat the classic engine) |

Findings: (1) deep text-detection (Paddle/RapidOCR) decisively beats the
classic engine on real phone photos — Tesseract's niche is flat clean
scans; (2) whatever gets seated MUST apply the dossier rotation before
recognition (Tesseract went from garbage to fragments just by
uprighting). Unbenched from the research: docTR (torch, ~800 MB),
SmolDocling/VLMs — owner decides if the comparative extends before the
seating decision. The deployment-cost analysis (python sidecar
+300–500 MB vs onnxruntime-node reimplementation vs native binary) is
in the conversation record of this date and drives the seat choice.

## S07 addendum 2 — the llama.cpp VLM route (owner's question, 2026-07-07)

Qwen2.5-VL 3B Q4 via `llama-mtmd-cli` (built from llama.cpp master) on
the UPRIGHT Pascal photo: **192 s CPU, and the quality is in another
league** — full French with accents, correct reading order (intro,
TEXTE 4 header, Pascal's flow), clean punctuation; anti-hallucination
check passed (passages corroborate RapidOCR's raw fragments verbatim).
Artifact: speech-bench-2026-07-07/OCR-qwen25vl-pascal.md.

Decision table for the OCR seat:

| route | quality (real photo) | speed | deploy | license |
|---|---|---|---|---|
| Qwen2.5-VL 3B / llama.cpp | ★★★ near-print | 192 s/page CPU | single binary + 3.3 GB models (the whisper pattern) | ⚠ 3B = Qwen Research license — 7B is Apache but ~2× slower; SmolVLM Apache fallback unbenched |
| RapidOCR (python) | ★★ usable, accents lossy, order scrambled | 3.6 s/page | +300–500 MB python shipping | Apache-2.0 |
| Tesseract | ✗ fails on phone photos | 2.6 s | trivial | Apache-2.0 |

Open question for the seating decision: license-clean VLM (Qwen2.5-VL
7B Apache, slower; or SmolVLM/SmolDocling to bench) vs fast-but-lossy
RapidOCR vs BOTH (RapidOCR for instant search-grade text, VLM for
on-demand quality transcription — 33's ladder applied to OCR).

## S07 addendum 3 — sub-4B general multimodal round + GPU discovery (2026-07-07)

Same upright Pascal photo, same prompt, CPU 8 threads:

| candidate | wall | verdict |
|---|---|---|
| Qwen2.5-VL 3B Q4 | 192 s | ★★★ near-print, anti-hallucination passed — quality reference (license: Qwen Research on 3B) |
| Gemma 3 4B Q4 | 127 s | ★★☆ real transcription, accents OK — but MEANING-CHANGING errors ("est mort à la fenêtre" for "se met à la fenêtre", "l'oplogie") — insidious for trust |
| SmolVLM2 2.2B Q4 | 23 s | ✗ DISQUALIFIED: pure hallucination (invented a 1952 journal article + offered a translation) — the exact 08 dishonesty failure mode |
| RapidOCR (ref) | 3.6 s | ★★ honest but lossy (accents, order) |

Notes: Ministral 3B is TEXT-ONLY (not a VLM candidate; Mistral vision
starts at Pixtral 12B). Meaning-changing VLM errors are worse than
RapidOCR's honest degradation for the truth model — a seated VLM needs
the correction flow AND ideally a confidence/verification story.

**GPU DISCOVERY: RTX 5070 (12 GB) is CUDA-visible in this WSL2.** A
CUDA rebuild would collapse VLM latency (~192 s → seconds) and make
Qwen2.5-VL-7B (Apache!) viable — potentially dissolving both the speed
AND license objections at once. Device-tier framing (33) stands: CPU
numbers define the floor for other laptops; GPU is the probed bonus
tier. Next candidates if the round extends: MiniCPM-V 2.0, Granite
Vision 2B, Moondream2, LFM2-VL 1.6B.

## S07 addendum 4 — les deux « pannes » résolues + tier GPU complet (2026-07-08)

### Diagnostics (les leads du brief de handoff, fermés)

1. **Qwen3-VL « stdout vide » = observation prématurée, pas une panne.**
   L'encodage image seul prend 105–107 s CPU sur la photo 12 MP ; les
   observations d'hier (25 s/87 s) tombaient PENDANT l'encodage. Les
   modèles fonctionnent parfaitement (transcriptions complètes ci-dessous).
2. **Unlimited-OCR, trois couches d'oignon :** (a) le crash
   `std::runtime_error` = chat template custom refusé sans `--jinja`
   (l'arch DeepSeek-OCR charge très bien : PR #17400 mergé au master le
   2026-03-25) ; (b) la recette du README HF (`--jinja` +
   `<|grounding|>Convert…`) → sortie **VIDE SILENCIEUSE** (exit 0,
   4 octets de blanc) sur le master stock ET sur le build PR — le mode
   d'échec dangereux ; (c) la recette de l'AUTEUR du PR marche :
   `--chat-template deepseek-ocr -p "document parsing." --temp 0
   --flash-attn off -n 4096 -c 16384` + params DRY. Le PR #24975
   (R-SWA, **DRAFT non mergé**, head 649864fc6 incl. fix V-cache F32 du
   2026-06-27) est REQUIS pour une vraie génération.
3. **Bug CUDA VMM de WSL2** : `cuMemSetAccess: device not ready` dans le
   pool VMM ggml sur les grosses allocations du mmproj Qwen3-VL →
   rebuild `-DGGML_CUDA_NO_VMM=ON` règle le crash (c'était l'autre
   moitié de la « panne GPU » d'hier). Corroboration : gemma3 et
   qwen25vl-3b sortent OCTET-IDENTIQUES sur build master et build PR.

### Tier CPU natif (8 threads, Ryzen 8700F, page redressée 3024×4032, temp 0)

| candidat | quant | wall | encode | verdict |
|---|---|---|---|---|
| RapidOCR (réf. 07-07) | onnx | 3,6 s | — | ★★ honnête/pertes |
| Unlimited-OCR (PR#24975, recette auteur) | Q4_K_M | 25,2 s | 9,6 s | ★★☆ régions typées MAIS **tronque le tiers bas** (doublon dégradé puis arrêt à ~700/4096 tokens) |
| SmolVLM2 (réf. 07-07) | Q4 | 23 s | — | ✗ hallucine |
| Gemma 3 4B (réf. 07-07) | Q4 | 127 s | — | ★★☆ erreurs de sens |
| Qwen2.5-VL 3B (réf. 07-07) | Q4_K_M | 192 s | — | ★★★ référence qualité (⚠ licence Research) |
| Qwen3-VL 2B | Q4_K_M | 291 s | 107 s | ★★★ ≈ référence ; capte la ligne « U'est-ce » que la réf. saute ; 2 typos (« périsables », « obligaement ») |
| Qwen2.5-VL 7B | Q4_K_M | 300 s | 83 s | ★★★ fidèle à la mise en page print (césures, note ¹) ; « périsposables », « obligéamment », « je le haïs » |
| Qwen3-VL 4B | Q4_K_M | 441 s | 105 s | **★★★+ meilleure qualité du banc** : seul à lire le bloc marginal Husserl + l'appel de note ¹ ; « fusent », « obligamment » |

### Tier GPU (RTX 5070 12 Go, WSL2, build PR#24975 NO_VMM, -ngl 99, résolution native)

| candidat | wall | encode | verdict |
|---|---|---|---|
| Unlimited-OCR IQ3_XXS | 7,0 s | 0,5 s | complet, sans doublon, mais dégradation de quant mesurée (« l'obze », « je le fais » contresens, régions grossières) |
| Gemma 3 4B | 8,5 s | 0,49 s | ✗ première moitié = erreurs connues, puis **effondrement** (« Vous Hilton lecouvrez… toujours million. », boucles inventées) — numérique CUDA divergente au greedy |
| **Unlimited-OCR Q4_K_M** | **8,6 s** | 0,6 s | **PAGE COMPLÈTE** (la troncature CPU disparaît) + folio « 10 » ; seul candidat à écrire « obligeamment » ; doublon présent mais la génération REPREND ; « révolé » (le CPU avait « vérole » juste) |
| Qwen2.5-VL 3B | 12,9 s | 4,3 s | complet, ≈ qualité CPU — 13× le CPU |
| Qwen2.5-VL 7B hybride `--no-mmproj-offload` | 105,5 s | 86 s (CPU) | complet du TEXTE 4 à la fin mais **perd le chapeau d'intro** que le run tout-CPU avait |
| Qwen3-VL 2B | 543 s | — | déborde les 12 Go à rés. native (activations mmproj) → paging mémoire unifiée : **plus lent que le CPU** |
| Qwen3-VL 4B | DNF (cap 600 s) | — | idem, sortie partielle |
| Qwen2.5-VL 7B -ngl 99 | DNF (cap 480 s) | 209 s+ | idem (modèle+mmproj+activations > VRAM) |

### Contrôles `--image-max-tokens 1024` — la question Unsloth de l'owner

L'owner a fait tourner Qwen3-VL 2B (unsloth/Qwen3-VL-2B-Instruct-GGUF,
**UD-Q4_K_XL**) « parfait en quelques secondes ». Décomposition :

- **La vitesse est le budget de pixels, point.** Capé à 1024 tokens
  image : 2B Q4 **9,5 s** (encode 0,27 s), 2B Q8_0 13,0 s, 4B 10,8 s —
  contre 9 min/DNF à résolution native. Les pipelines HF/LM Studio
  réduisent l'image en amont ; llama.cpp brut encode la photo 12 MP
  quasi native.
- **Mais le cap coûte des lettres à toute précision** (sur CETTE photo,
  petit corps) : 2B Q4 capé → « je le **fais** », « vous ne l'**êtes**
  point », diacritiques perdues ; Q8_0 capé récupère l'ôtez/haïssable
  mais garde « je le fais »/« l'aimé-t-il » ; 4B capé perd le bloc
  Husserl et invente « l'inconfortabilité ».
- **Le fichier unsloth n'embarque AUCUN cap** (diff des métadonnées
  mmproj : cosmétique uniquement, `image_size=768` identique) — la
  vitesse « Unsloth » vient du runtime, pas de l'artefact.
- **UD-Q4_K_XL capé (l'artefact exact de l'owner)** : encore PLUS
  d'erreurs de lettres (« l'aimer-t-il », « qui tuer », « m'aimer-t-on »)
  et exécution ~1 tok/s sur ce build CUDA (fallback CPU probable d'un
  type de tenseur UD) — « parfait en secondes » ne se reproduit pas dans
  llama.cpp brut sur cette image. Image de test différente probable
  côté owner (à vérifier : la déposer dans captures/ et on la banc-teste).
- **UD-Q4_K_XL natif CPU : 334 s (encode 107 s), transcript
  OCTET-IDENTIQUE au Q4_K_M bartowski** (mêmes deux typos) — la piste
  « la quant UD lit mieux » tombe aussi ; l'artefact est ~15 % plus
  lent, rien d'autre ne change. Sur cette page, à ce budget de pixels,
  fichier owner et fichier bench sont interchangeables.

### Licence Qwen2.5-VL 3B — VÉRIFIÉE SUR TEXTE (owner, 2026-07-08)

L'owner a produit le fichier de licence complet : « Qwen RESEARCH LICENSE
AGREEMENT » (release 2024-09-19, Alibaba Cloud). Clauses opérantes :
§2.a droits accordés « FOR NON-COMMERCIAL PURPOSES ONLY » avec §1.i
« Non-Commercial » = « research or evaluation purposes only » (plus
étroit que « pas de revenu » — même un usage produit gratuit est hors
grant) ; §2.b usage commercial = licence séparée à demander ; §3
redistribution = copie de l'accord + fichier NOTICE ; §8 droit chinois,
juridiction exclusive Hangzhou. **Verdict pratique : le bench (évaluation)
est couvert ; le SIÈGE ne peut pas être 3B dans quoi que ce soit de
livré.** Rivaux propres : Qwen3-VL 2B/4B et Qwen2.5-VL 7B (Apache-2.0),
Unlimited-OCR (MIT), RapidOCR (Apache-2.0).

### Implications pour le siège OCR (décision owner, échelle 33)

- **GPU présent** : Unlimited-OCR Q4 (MIT) à 8,6 s/page structurel
  (régions typées + folio) est le nouveau fait marquant. Réserves :
  build PR **draft non mergé** (risque maintenance/supply), le floor
  CPU tronque silencieusement (garde-fou de complétude obligatoire si
  seaté), fautes propres (« TEXT 4 », « siron », « révolé » GPU).
- **Floor CPU qualité (autres laptops)** : Qwen3-VL 4B Apache 441 s
  (le seul à tout lire) > Qwen2.5-VL 7B Apache 300 s (fidèle print) >
  Qwen3-VL 2B Apache 291 s. La réf. 3B reste sous licence Research.
- **Instantané honnête** : RapidOCR 3,6 s inchangé.
- **L'échelle 33 appliquée** : RapidOCR immédiat pour le texte
  cherchable + VLM on-demand pour la transcription qualité ; unlim-GPU
  en tier bonus quand le GPU existe.
- ⚠ Tout chiffre GPU ici = WSL2 + NO_VMM + PR draft : à re-benchmarker
  sur build natif avant de sceller un siège GPU.

Artefacts : `sources/captures/speech-bench-2026-07-08/OCR-*.md` ; runs
bruts `.atomik/speech-bench/ocr-*.{out,err,time}` ; harnais
`run-vlm.sh` ; prompt standard « Transcris fidèlement tout le texte de
cette page. » (unlim : son prompt canonique « document parsing. »).

## S07 addendum 5 — tier « scan propre » + LE harnais Qwen correct (2026-07-08)

Idée owner : bencher une entrée « scan/PDF propre » à côté de la photo
brute. ⚠ Page DIFFÉRENTE de celle du tier photo (rappel owner) : le
tier photo travaille la page du dossier Pascal (TEXTE 4, folio 10), le
tier scan la page du dossier Pascal 2 (« Conscience et inconscient »,
fin du passage Pascal + TEXTE 5 Leibniz, folio 11) — seule Pascal 2 a
un scan Adobe ; les comparaisons inter-tiers sont donc inter-pages,
les classements intra-tier à entrée identique. Deux scanners : le nôtre (`scan-clean.py` —
rotation, aplatissement d'illumination par division du fond estimé,
étirement de contraste ; 20 lignes de PIL, 12 MP) et Adobe Scan owner
(dewarp/dérotation, 3,4 MP).

### Le bug Qwen3-VL 4B et sa résolution (web + contrôles)

Sur ces fichiers scan, le 4B stalle — capé (`--image-max-tokens 1024`)
OU natif : encode ×40–100 (19–29 s au lieu de 0,2–0,5 s) puis décodage
~2 tok/s, VRAM saturée, reproduit en solo. Le terrain le connaît :
issues llama.cpp #17345 (« vl_high_resolution_images not taking
effect », 4B), #17012 (8B freeze en image processing), discussion
#17172 (« --image-max-tokens doesn't fix it » — réponse : smart-resize
EN AMONT, le comptage réel ≈ pixels/784). 2B et 2.5-VL 3B insensibles
sur les mêmes fichiers.

**LE HARNAIS CORRECT (recette datée, validée par matrice 5 runs) :
pré-redimensionner l'image soi-même au budget de tokens voulu
(≈ 2 500 tokens pour une page dense ; dimensions multiples de 28 ;
LANCZOS), `-c 8192`, et ne JAMAIS compter sur `--image-max-tokens`.**
Résultat 4B : 9,5 s GPU / 154 s CPU (encode 33,5 s) sur la même page
qui le stallait 10 min — et c'est la mécanique exacte des pipelines
HF/Unsloth/LM Studio (la question owner d'hier, refermée par la
racine).

### Résultats tier scan (GPU, build PR#24975)

| run | wall | verdict |
|---|---|---|
| **Qwen3-VL 4B @2,5k × Adobe** | **9,5 s** | **MEILLEUR TRANSCRIPT DU BANC** : structure complète (TEXTE 5, notes a/b, folio près), ancres d'appels de note inline (`aperceptiona`, `corps'`, `incontinentb`), 2 fautes de mot (« je vous vois », « habitué ») |
| Qwen3-VL 4B @2,5k × scan maison | 10,0 s | même classe (header perdu, micro-erreurs différentes au même point difficile) |
| Qwen3-VL 4B @2,5k × Adobe, CPU 8t | 154 s | même classe que GPU — le floor sans GPU passe de 441 s à 2 min 34 |
| Qwen2.5-VL 3B × Adobe (brut) | 41,7 s | excellent aussi — mais licence RESEARCH vérifiée sur texte (owner) : « research or evaluation purposes only », siège interdit |
| Qwen3-VL 2B @2,5k × Adobe | 18,4 s | complet, classe en dessous |
| Unlimited-OCR Q4 × scan maison 12 MP | 41,8 s | complet, fin dégradée + LaTeX halluciné |
| Unlimited-OCR Q4 × Adobe 3,4 MP | 16,5 s | **COLLAPSE à 40 %** (boucle sur le titre, zéro Leibniz) — sa fragilité est corrélée aux pixels BAS : exactement ce qu'un pipeline PDF lui donnerait |
| RapidOCR × scan maison / Adobe (ajout 2026-07-08, question owner) | 6,2 s / 5,8 s CPU | un scan propre NE le répare PAS : accents perdus (« haissent », « éte »), mots fusionnés (« CONSCIENCEETINCONSCIENT »), guillemets 《》, une proposition sautée — la perte est intrinsèque, pas photo-induite ; valide son exclusion du siège |

### Ce que le tier scan change au siège

Le tandem **pré-resize + Qwen3-VL 4B (Apache-2.0)** règle d'un coup
qualité (meilleur transcript du banc), licence (le 3B Research devient
inutile) et vitesse GPU (9,5 s), et ramène le floor CPU à ~2,5 min la
page dense. Le scanner maison suffit comme normalisation d'entrée
(Adobe garde l'avantage dewarp sur photos pires que celle-ci). unlim
reste l'option « OCR structurel » GPU (régions + folio) mais ne doit
JAMAIS être nourri en basse résolution. RapidOCR 3,6 s inchangé en
instantané. Décision de siège : owner.

Artefact : `OCR-pascal2-scan-tier-comparative.md` ; images
`pascal2-{scan,adobe}-{1k,2k5}.jpg` + `scan-clean.py` sous
`.atomik/speech-bench/`.

## CP-MVP-005 S02 — le tier CUDA prend le siège whisper (2026-07-08)

Directive owner exécutée. Binaire CUDA whisper.cpp v1.8.6 (build-cuda
d'hier) installé AUTO-CONTENU dans `.atomik/speech/cuda/` (binaire +
libs ; l'adaptateur exporte `LD_LIBRARY_PATH` vers le sidecar — trouvé
au passage : l'install CPU de S05 résolvait ses .so depuis l'arbre de
build du BENCH via runpath ; les deux installs portent leurs libs
désormais). Chaîne de repli AUTOMATIQUE CUDA → CPU → mock dans
`whisper-adapter.ts` (démotion collante par session ; l'identité trace
le tier : `runtimeVersion` +cuda). Mesures machine owner :

| fixture | CPU (S04) | CUDA installé |
|---|---|---|
| mémo owner (benchmark_device_long) | — (référence scellée) | **1,83 s**, transcript octet-égal au scellé (`-l auto`) |
| fx-whatsapp (181 s) | 14,7 s | **5,7 s** (2,6×) |

Piège S04 recroisé en vérification manuelle : sans `-l auto`,
whisper.cpp TRADUIT silencieusement le français en anglais —
l'adaptateur le passe toujours. Tests 231 → 234 (chaîne de repli :
CUDA répond/échoue-et-démote/absent) ; typecheck vert.

## CP-MVP-005 S03 — Qwen3-VL 4B prend le siège OCR (2026-07-08)

Directive owner exécutée sur l'évidence des addenda. `ocr-adapter.ts`
(sidecar borné llama-mtmd-cli, même contrat TranscriptionAdapter) +
`routeByMedia` (images → OCR, audio → whisper). LE HARNAIS PROUVÉ est
STRUCTUREL : pré-redimensionnement dans main via `nativeImage`
(≈2 500 tokens, multiples de 28, jamais d'upscale, resizer injecté pour
les tests) — jamais `--image-max-tokens`. Tier CUDA d'abord (démotion
collante), floor CPU, mock en dernier. Binaires = les builds BENCHÉS
PR#24975 NO_VMM (requis sur ce WSL2), installés auto-contenus sous
`.atomik/ocr/{cpu,cuda,models}` ; sha256 :
`ceb08f2f…` (qwen3vl-4b-q4.gguf), `5d5e6983…` (mmproj). Vérification du
siège installé : **3,85 s CUDA** sur la page Leibniz pré-dimensionnée
(sortie française correcte) ; vérif du tier CPU installé : **96,6 s**
sur la variante 1k (transcript complet, exit 0). Gaps honnêtes consignés :
HEIC/HEIF probablement illisible par nativeImage sous Linux (échec
propre tracé, jamais de fabrication) ; prompt du siège = le prompt FR
standard du banc. Tests 234 → 237 (budget de resize, identité, chaîne
CUDA→CPU collante, routage par média) ; typecheck vert. S04 = validation
owner in-app (bouton Transcribe sur un dossier image après redémarrage).

### Proposition owner (2026-07-08) : Mistral OCR 3.0 comme référence API

L'owner a essayé Mistral OCR 3.0 (API uniquement) et le juge fort. Deux
usages proposés : (a) **référence plafond du banc** — même statut que
Voxtral côté speech : une ligne de référence datée, PAS un candidat au
siège local — **BENCHÉE le 2026-07-08 sur clé owner (.env.local,
git-ignoré)** : id résolu `mistral-ocr-4-0` (= `latest` ; la 3.0 que
l'owner a essayée a déjà un successeur). Photo brute Pascal 1 :
meilleur transcript brut du banc (3 micro-fautes : « parier »,
« cogitationes », « pp. 16-19 »), 3,1 s API. Scans (Adobe ET maison) :
**lettre-parfait sur toutes les sondes** — y compris « je vois bien »
et « habité » où le 4B local glisse, ancres de notes en exposants
Unicode ᵃ/¹/ᵇ, folios — ~2,4–2,9 s API, sorties de même taille sur les
deux scanners. Écart local→plafond quantifié : ~2 fautes de mot
(Qwen3-VL 4B @2,5k) → ~0. Artefact : `OCR-mistral-reference.md` ;
(b) **option
in-app par API pour les scans douteux** — cohérent avec l'échelle 33
(floor local + tier cloud explicite), à instruire selon les règles
bedrock : clé provider jamais dans le renderer (13), sortie marquée
cloud-derived dans le modèle de vérité (28), opt-in par capture, pas de
silencieux. Décision d'intégration = coding path provider, pas ce banc.
