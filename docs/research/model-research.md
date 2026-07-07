# AI Model Market Research for atomik: On-Device + Cheap Cloud Stack (mid-2026)

## TL;DR
- **On-device:** For OCR use Apple Vision (iOS) or PaddleOCR PP-OCRv5 / RapidOCR (Android/laptop) for plain text, and a small vision-language model (Qwen2.5-VL 3B, dots.ocr, or SmolDocling-256M) for layout/tables; for transcription use whisper.cpp (large-v3-turbo on laptops, small/base on phones) with Voxtral or Parakeet-v3 for French; for atomik DSL generation use Qwen3-4B (laptop/flagship) and Gemma 3 1B / LFM2-1.2B / Qwen3-1.7B (mid-range), **always with llama.cpp GBNF grammars** for guaranteed-valid output.
- **Cheap cloud:** DeepSeek V4 Flash ($0.14/$0.28) and Gemini 2.5 Flash-Lite ($0.10/$0.40) are the cheapest capable agentic APIs; Gemini 2.5 Flash and Claude Haiku 4.5 are the best-quality "cheap" tier (Haiku 4.5 = 73.3% SWE-bench Verified, 83.2% τ²-Retail). Recommended primary = Gemini 2.5 Flash-Lite / DeepSeek V4 Flash for bulk; fallback = Claude Haiku 4.5 for hard tool-use.
- **French + licensing:** Qwen3 (Apache 2.0), Gemma 3 (Gemma terms), Voxtral (Apache 2.0), docTR (Apache 2.0, French-origin) all handle French well; flag Llama 3.2 (700M-MAU cap + EU multimodal restriction) and Gemma custom terms; Qwen3/SmolLM/Phi-4-mini/PaddleOCR/Whisper/Tesseract are cleanest for commercial use.

## Key Findings

### Part 1 — On-device models

**1. OCR.** There is a clear split between traditional engines and VLM-based OCR. Traditional engines (Tesseract, PaddleOCR, RapidOCR, Surya, docTR, EasyOCR) flatten layout but are cheap and fast; VLM-based OCR (Qwen2.5-VL, dots.ocr, SmolDocling) preserves structure and tables at higher compute cost with some hallucination risk. Tesseract 5 runs a page in ~0.77s on CPU with a 10MB binary (runs on a Raspberry Pi). PaddleOCR PP-OCRv5 (Apache 2.0, released May 2025) is the CPU-friendly accuracy pick with 100+ languages, but peaks around 4.5GB RAM, making the full pipeline impractical on mid-range phones (use the mobile models there). **dots.ocr scores 88.41 Overall on OmniDocBench v1.5** (TEDS 86.78, TextEdit 0.048), per the Agentar-Fin-OCR arXiv report (2603.11044); note dots.ocr is actually a 1.7B-LLM-based model (rednote-hilab GitHub), not 3B as often cited. Apple's Vision framework is free, on-device, and excellent on printed Latin/CJK text (40+ languages including French) but is Apple-only and weaker on handwriting (72% vs Google Cloud Vision's 91% on handwritten receipts in one test). docTR is French-origin (built by Mindee) with particularly strong English/French recognition — a natural fit given the user works in French.

**2. Transcription.** Whisper (MIT license) remains the multilingual default. whisper.cpp GGUF footprints: tiny 75MB / ~390MB RAM, base 142MB / ~500MB, small 466MB / ~1GB, medium 1.5GB / ~2.6GB, large-v3 ~1.2–2.9GB / ~3.9–4.7GB. **Whisper large-v3-turbo is a distilled large-v3 with decoder layers cut from 32 to 4 (809M params vs 1.55B); on an NVIDIA A40 it transcribed the S&I eval set in 47 min vs Whisper Small's 65 min** (arXiv 2506.04076) — it keeps strong multilingual quality, unlike distil-whisper which is English-only.

For **French specifically**, two open options beat Whisper large-v3: **Mistral's Voxtral Mini Transcribe V2 reports ~4% WER on FLEURS vs ~10.3% for Whisper large-v3, and the Voxtral paper (arXiv 2507.13264) states Voxtral Mini "surpass[es] GPT-4o mini Transcribe and Gemini 2.5 Flash across all tasks"** (Apache 2.0 for the Realtime weights; French is one of its 13 supported languages). **NVIDIA Parakeet-TDT-0.6B-v3 achieves 6.34% average WER on the HuggingFace Open ASR Leaderboard at ~3,333× realtime (RTFx 3,332.74), covering 25 European languages with auto language detection, CC-BY-4.0, trained on NVIDIA's Granary dataset (~660K–670K hours)** per its model card — extremely fast but requires attribution. Moonshine is the smallest for edge/short utterances. On Apple hardware, **MacStories measured Apple's SpeechAnalyzer/SpeechTranscriber (via the Yap CLI) transcribing a 34-min file in 45s vs 1:41 for MacWhisper Large V3 Turbo — "a full 2.2× faster … with no noticeable difference in transcription quality"**, though 9to5Mac found Whisper still marginally more accurate (WER ~1%).

**3. Web-search support (embeddings / rerank / query rewriting).** **The 308M-parameter EmbeddingGemma runs in <200MB RAM with QAT quantization and generates embeddings in <15ms for 256 tokens on EdgeTPU, trained on 100+ languages — Google calls it "the highest ranking open multilingual text embedding model under 500M on MTEB"** (Google Developers Blog). Qwen3-Embedding-0.6B (639MB, Apache 2.0) outscores every other sub-1GB model on Ollama's multilingual track while supporting a 32K context window (64× longer than mxbai's 512 tokens). bge-m3 (568M, MIT, 100+ languages) and nomic-embed are lighter but weaker, and lightweight models degrade sharply at 4K+ tokens. Use bge-reranker-v2-m3 for reranking and a small LLM (Qwen3-1.7B / LFM2) for query rewriting and snippet summarization.

**4. atomik DSL generation (structured output).** This is where constrained decoding matters most. **llama.cpp's GBNF grammars plus its JSON-schema-to-grammar converter guarantee ~100% syntactically valid output even on tiny models** — this is the single most important lever for a custom DSL like atomik, because raw prompting yields only ~70–80% valid output and schema-guidance ~90–95%, while grammar constraints reach ~100% syntactic correctness. Grammar constraints let you drop to smaller, cheaper local models while still getting reliable structured output. Q4_K_M GGUF sizes and RAM (subagent-verified against HuggingFace cards): Qwen3-4B 2.5GB/~3–3.5GB; Qwen3-1.7B ~1.1–1.3GB; Qwen3-0.6B ~0.48GB; Gemma 3 1B 806MB/~1.5GB; Gemma 3 4B 2.49GB/~3.5GB; Llama 3.2 1B 808MB; Llama 3.2 3B ~1.9GB; Phi-4-mini 2.5GB; SmolLM2-1.7B 1.06GB; SmolLM3-3B ~1.8GB; LFM2-1.2B 731MB/<1GB.

Quality benchmarks: Qwen3-4B-Instruct-2507 tops small-model fine-tune leaderboards (distil labs #1 of 12). Gemma 3 4B achieves 100% JSON parse rate (87% schema compliance at Q4_K_M); Llama 3.2 3B regresses to only ~48–56% JSON parse rate; SmolLM2-1.7B is unusable for raw JSON (26% parse at Q4, 56% at Q8) — but grammar constraints neutralize these gaps. LFM2-1.2B performs competitively with Qwen3-1.7B (a 47%-larger model) at roughly 2× the CPU decode speed, and includes French among its seven benchmarked languages.

**On-device speeds (subagent-verified):** iPhone 16 Pro runs Llama 3.2 3B at ~23 tok/s (peaks 37.6 before thermal throttling); Snapdragon 8 Elite ~10 tok/s on the same model via NPU; M4 Max via MLX hits 62 tok/s on Qwen3-8B (2.1× llama.cpp); **LFM2.5-1.2B reaches 239 tok/s decode on an AMD Ryzen CPU and 82 tok/s on a mobile NPU** (Liquid AI). Runtimes: llama.cpp/Ollama (universal GGUF), MLC-LLM + Cactus + MediaPipe/LiteRT (phone-optimized), Apple MLX (fastest on Mac for <14B), ONNX Runtime, ExecuTorch (Meta, iOS).

### Part 2 — Cloud APIs (mid-2026, per 1M tokens)
- **DeepSeek V4 Flash:** $0.14/$0.28, cache-hit input $0.003, 1M context, 384K max output — the cheapest frontier-class API. Historically 50–75% off-peak discounts (16:30–00:30 UTC on V3/R1; V4 not yet confirmed). New accounts get a 5M-token grant. `deepseek-chat`/`deepseek-reasoner` aliases retire July 24 2026.
- **Gemini 2.5 Flash-Lite:** $0.10/$0.40, 1M context, ~210 tok/s, 0.30s TTFT, generous free tier. **Gemini 2.5 Flash:** $0.30/$2.50 (Anthropic-comparison trackers) to $0.15/$0.60 (older trackers) — verify current rate. Newer Gemini 3 Flash ~$0.50/$3.00; Gemini 3.1 Flash-Lite ~$0.10/$0.40 and scored 76.5% on BFCL v3.
- **Claude Haiku 4.5:** $1.00/$5.00, cache-hit $0.10, 200K context, ~300+ tok/s. **73.3% SWE-bench Verified (averaged over 50 trials, 128K thinking budget), τ²-bench Retail 83.2%, Telecom 83.0%, OSWorld computer-use 50.7%** (Anthropic launch post, Oct 15 2025) — matches Claude Sonnet 4 on coding and is the best cheap-tier tool-use/agentic model. Sonnet 4.6 reference: $3/$15.
- **OpenAI:** GPT-5.x-mini class ~$0.75/$4.50 (varies by tracker); GPT-4.1-nano/mini historically ~$0.10/$0.40 — the cheapest OpenAI tier for simple routing.
- **Mistral:** Ministral 3B $0.04–0.10 symmetric (edge-tuned); Mistral Small 3/4 $0.10–0.15 / $0.30–0.60, 128K context, EU data residency (GDPR-friendly), no prompt caching but 50%-off Batch API. Strong French given Mistral is a French lab.
- **Qwen (Alibaba):** Qwen-Flash $0.05/$0.40 (replaces the deprecated Qwen-Turbo); Qwen-Plus $0.40/$1.20. The free developer API tier ended April 15 2026, replaced by a 70M-token onboarding trial (1M/model, Singapore endpoint, 90 days). Open weights are Apache 2.0.
- **Open-weight via cheap providers:** Groq Llama 3.1 8B $0.05/$0.08 at 500+ tok/s (free tier, no card); Llama 3.3 70B $0.59/$0.79; gpt-oss-120B $0.15/$0.60; Groq Whisper v3 Turbo $0.04/hour. Cerebras ~3000 tok/s on gpt-oss-120B (subscription tiers). DeepInfra gpt-oss-120B $0.039/$0.19 (cheapest, widest open catalog). Together/Fireworks add fine-tuning; OpenRouter aggregates 400+ models (5.5% credit fee).
- **Function-calling leaderboards:** BFCL v3 (June 2026) top scores — GLM 4.5 76.7%, Claude Opus 4.7 76.6%, Gemini 3.1 Flash-Lite 76.5%. BFCL v4 (April 2026) shifted to holistic agentic evaluation (40% agentic, 30% multi-turn, 10% live, 10% non-live, plus hallucination). τ-bench measures multi-turn tool use in realistic customer-service scenarios. Of the cheap tier, Claude Haiku 4.5 is the standout for tool-calling reliability and instruction following.

## Details

### Matrix A — Local models
| Model | Task fit | Params | Q4 size | Min RAM | Mid phone | Flagship phone | 8GB CPU laptop | 16GB/Apple Silicon | Speed | Quality | Runtimes | License | French |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Apple Vision | OCR (plain + layout boxes) | n/a | built-in | low | ✓ iOS | ✓ | n/a | ✓ Mac | fast | excellent print, weak handwriting (72%) | CoreML/Vision | Apple SDK | ✓ 40+ langs |
| Google ML Kit | OCR | n/a | built-in | low | ✓ | ✓ | n/a | n/a | fast | good, Latin script only | ML Kit | free SDK | ✓ Latin |
| Tesseract 5 | OCR plain | n/a | 10MB | low | ✓ | ✓ | ✓ | ✓ | 0.77s/page CPU | good on clean text | native | Apache 2.0 | ✓ |
| PaddleOCR PP-OCRv5 | OCR + layout/tables | pipeline | mobile small / server 4.5GB | up to 4.5GB | partial (mobile) | ✓ | ✓ | ✓ | ~2.1s/img CPU | high, 100+ langs | Paddle/ONNX/RapidOCR | Apache 2.0 | ✓ |
| Surya | OCR + layout | ~ | med | med | ✗ | partial | ~290s/img CPU (slow) | ✓ GPU | slow on CPU | strong multiling layout | PyTorch | check GPL/commercial | ✓ |
| docTR | OCR structured | ~ | med | med | ✗ | partial | ✓ | ✓ | med | strong EN/FR | PyTorch/TF/ONNX | Apache 2.0 | ✓✓ (Mindee, FR) |
| SmolDocling-256M | OCR doc→structured (DocTags) | 256M | <0.5GB | <1GB | ✓ | ✓ | ✓ | ✓ | fast | doc conversion | transformers/MLX/ONNX | Apache 2.0 | partial |
| SmolVLM-256M/500M | OCR/VQA | 256/500M | <0.5GB / ~0.5GB | <1GB / 1.23GB | ✓ | ✓ | ✓ | ✓ | 80 tok/s WebGPU (M4 Max) | basic OCR/VQA | transformers/MLX/ONNX | Apache 2.0 | partial |
| Qwen2.5-VL 3B | OCR + layout/VQA | 3B | ~2GB | ~4GB | ✗ | partial | partial | ✓ | med | strong OCR/doc | transformers/llama.cpp | Qwen (3B may be research) | ✓ multiling |
| dots.ocr | OCR SOTA structure | 1.7B | ~1.3GB | ~3GB | ✗ | partial | ✓ | ✓ | med | 88.41 OmniDocBench v1.5 | transformers | check | ✓ multiling |
| whisper.cpp tiny/base | Transcription | 39/74M | 75/142MB | 390/500MB | ✓ | ✓ | ✓ | ✓ | fast | rough/usable | whisper.cpp | MIT | ✓ (lower) |
| whisper.cpp small | Transcription | 244M | 466MB | ~1GB | partial | ✓ | ✓ | ✓ | ~realtime | good | whisper.cpp | MIT | ✓ |
| whisper.cpp large-v3-turbo | Transcription | 809M | ~1.5GB | ~2.6GB | ✗ | partial | ✓ | ✓ | ~40% faster than Small (A40) | best multiling | whisper.cpp/MLX | MIT | ✓✓ |
| Voxtral Mini/Realtime | Transcription (FR) | 4B | ~2.8GB | 16GB VRAM BF16 | ✗ | partial (WebGPU 2.8GB) | partial | ✓ | realtime-optimized | ~4% FLEURS WER | transformers/API | Apache 2.0 (Realtime) | ✓✓ (13 langs) |
| Parakeet-TDT-0.6B-v3 | Transcription | 600M | ~1.2GB | ~2GB | ✗ | partial | ✓ | ✓ | RTFx ~3,333 | 6.34% WER Open ASR | ONNX/NeMo | CC-BY-4.0 | ✓ (25 EU langs) |
| Moonshine | Transcription edge | tiny | small | low | ✓ | ✓ | ✓ | ✓ | fastest short-form | good short-form | ONNX/Cactus | MIT | EN-focused |
| EmbeddingGemma | Embedding | 308M | <200MB (QAT) | <1GB | ✓ | ✓ | ✓ | ✓ | <15ms/256tok EdgeTPU | top open <500M MTEB | LiteRT/ONNX/MLX | Gemma terms | ✓ 100+ |
| Qwen3-Embedding-0.6B | Embedding | 600M | 639MB | ~1GB | ✓ | ✓ | ✓ | ✓ | fast | best sub-1GB, 32K ctx | llama.cpp/ONNX | Apache 2.0 | ✓ 100+ |
| bge-m3 | Embedding | 568M | ~0.5GB | ~1GB | partial | ✓ | ✓ | ✓ | fast | strong multiling | ONNX/transformers | MIT | ✓ 100+ |
| Qwen3-0.6B | DSL gen | 600M | 0.48GB | ~1GB | ✓ | ✓ | ✓ | ✓ | fast | weak alone, OK w/ grammar | llama.cpp/MLC/Cactus | Apache 2.0 | ✓ |
| Qwen3-1.7B | DSL gen | 1.7B | 1.1–1.3GB | ~2GB | ✓ | ✓ | ✓ | ✓ | good | solid | llama.cpp/MLC/MLX | Apache 2.0 | ✓ |
| Qwen3-4B | DSL gen | 4B | 2.5GB | ~3.5GB | ✗ | partial | ✓ | ✓ | 62 tok/s M4 (8B ref) | #1 small fine-tune | llama.cpp/MLX/Ollama | Apache 2.0 | ✓✓ |
| Gemma 3 1B | DSL gen | 1B | 806MB | ~1.5GB | ✓ | ✓ | ✓ | ✓ | fast | good, JSON-capable | llama.cpp/LiteRT/MLX | Gemma terms | ✓ 140+ |
| Gemma 3 4B | DSL gen | 4B | 2.49GB | ~3.5GB | ✗ | partial | ✓ | ✓ | med | 100% JSON parse | llama.cpp/LiteRT/MLX | Gemma terms | ✓ 140+ |
| Gemma 3n E2B | DSL/multimodal | ~5B (2B active) | ~3GB | ~3GB | partial | ✓ | ✓ | ✓ | med | multimodal on-device | LiteRT/llama.cpp | Gemma terms | ✓ 140+ |
| Llama 3.2 1B | DSL gen | 1B | 808MB | ~1.5GB | ✓ | ✓ | ✓ | ✓ | fast | weak JSON | llama.cpp/ExecuTorch | Llama 3.2 (700M-MAU) | partial |
| Llama 3.2 3B | DSL gen | 3B | 1.9GB | ~3GB | ✗ | ✓ | ✓ | ✓ | 23 tok/s iPhone 16 Pro | ~48–56% JSON parse | llama.cpp/MLC/ExecuTorch | Llama 3.2 (700M-MAU) | partial |
| Phi-4-mini | DSL gen | 3.8B | 2.5GB | ~3.5GB | ✗ | partial | ✓ | ✓ | med | strong, repetition risk | llama.cpp/ONNX | MIT | partial |
| SmolLM2-1.7B | DSL gen | 1.7B | 1.06GB | ~2GB | ✓ | ✓ | ✓ | ✓ | fast | poor raw JSON (26%) | llama.cpp/MLX/ExecuTorch | Apache 2.0 | weak |
| SmolLM3-3B | DSL gen | 3B | 1.8GB | ~3GB | ✗ | ✓ | ✓ | ✓ | good | >Llama3.2-3B, dual-mode | llama.cpp/ONNX | Apache 2.0 | ✓ (fra 57.5) |
| LFM2-1.2B | DSL gen | 1.2B | 731MB | <1GB | ✓ | ✓ | ✓ | ✓ | 239 tok/s Ryzen CPU | ≈Qwen3-1.7B | llama.cpp/MLX/ONNX/Cactus | LFM Open License | ✓ (7 langs incl FR) |

### Matrix B — Cloud APIs
| API | Input $/M | Output $/M | Cached in $/M | Context | Tool calling | Structured output | Agentic bench | Latency | Free tier | Best use in atomik |
|---|---|---|---|---|---|---|---|---|---|---|
| DeepSeek V4 Flash | 0.14 | 0.28 | 0.003 | 1M | good | JSON | — | med | 5M-token grant | cheapest bulk agentic |
| Gemini 2.5 Flash-Lite | 0.10 | 0.40 | ~0.025 | 1M | good | JSON schema | (3.1 Flash-Lite BFCL v3 76.5%) | 210 tok/s, 0.30s TTFT | yes, generous | cheapest-quality bulk |
| Gemini 2.5 Flash | 0.15–0.30 | 0.60–2.50 | 0.15 | 1M | strong | JSON schema | strong | fast | yes | balanced default |
| Claude Haiku 4.5 | 1.00 | 5.00 | 0.10 | 200K | excellent | JSON/tools | SWE 73.3%, τ²-Retail 83.2%, CU 50.7% | ~300+ tok/s | no | hard tool-use fallback |
| Mistral Small 3/4 | 0.10–0.15 | 0.30–0.60 | none | 128K | good | JSON | — | fast | eval tier | EU/GDPR + French |
| Ministral 3B | 0.04–0.10 | 0.04–0.10 | none | 128K | basic | JSON | — | fast | eval | cheap classify/extract |
| Qwen-Flash | 0.05 | 0.40 | 0.05 | 256K+ | good | JSON | — | fast | 70M trial | cheap multiling |
| Groq Llama 3.1 8B | 0.05 | 0.08 | — | 128K | good | JSON/FC | — | 500+ tok/s | yes, no card | ultra-fast cheap |
| Groq Llama 3.3 70B | 0.59 | 0.79 | — | 128K | good | JSON/FC | — | 280–394 tok/s | yes | fast open 70B |
| DeepInfra gpt-oss-120B | 0.039 | 0.19 | — | — | good | JSON | — | med | — | cheapest open frontier |
| Cerebras gpt-oss-120B | subscription | — | — | — | good | JSON | — | ~3000 tok/s | — | fastest throughput |

## Recommendations

### Default stack per device tier
- **Mid-range phone (~6GB RAM):** OCR = Apple Vision (iOS) / ML Kit or PaddleOCR mobile models (Android); Transcription = whisper.cpp small (base for speed), or Voxtral/DeepSeek-hosted for French when online; Embedding = EmbeddingGemma-308M or Qwen3-Embedding-0.6B; DSL = **Gemma 3 1B or LFM2-1.2B or Qwen3-1.7B with a GBNF grammar** (all fit comfortably under 2GB and stay valid even at low quality).
- **Flagship phone (Snapdragon 8 Elite / recent iPhone Pro, 12–16GB):** OCR = Apple Vision + Qwen2.5-VL 3B fallback for tables; Transcription = whisper.cpp small / large-v3-turbo, or Apple SpeechAnalyzer on iOS 26+; DSL = **Qwen3-4B** (Qwen3-1.7B when latency-critical) via MLC/MLX/llama.cpp with GBNF.
- **8GB CPU laptop (no GPU):** OCR = PaddleOCR/RapidOCR + Tesseract; Transcription = whisper.cpp large-v3-turbo (Q5); DSL = **Qwen3-4B Q4 or LFM2-1.2B** (fastest on CPU — 239 tok/s on Ryzen) with GBNF.
- **16GB+ / Apple Silicon:** OCR = Qwen2.5-VL 3B / dots.ocr for structure; Transcription = whisper.cpp large-v3-turbo via MLX or Parakeet-v3; DSL = **Qwen3-4B via MLX** (fastest Apple path), grammar-constrained.

### Cloud agentic operation
- **Primary:** Gemini 2.5 Flash-Lite ($0.10/$0.40, 1M context, free tier) or DeepSeek V4 Flash ($0.14/$0.28, cache hit $0.003) for high-volume cheap agentic loops with JSON-schema output and tool calls.
- **Fallback / hard multi-step tool use:** Claude Haiku 4.5 — best cheap-tier reliability (73.3% SWE-bench, 83.2% τ²-Retail). Route only the requests that fail on the cheap tier here to control cost.
- **EU/GDPR + French sensitivity:** Mistral Small 4 (EU data residency, French lab, 50%-off Batch API).
- **Bootstrapped free-tier maximization:** DeepSeek's 5M-token grant, Qwen's 70M-token trial, and Groq's no-card free tier let you prototype the entire agentic loop at zero cost before committing.

### Monthly cost estimate — student using atomik daily
Assume 20 OCR captures/day (local, $0), 15 min transcription/day (local, $0), and 30 agentic cloud calls/day at ~2K input + 500 output each ≈ 60K in + 15K out/day → ~1.8M input + 0.45M output per month:
- **Gemini 2.5 Flash-Lite:** ~$0.18 + $0.18 = **~$0.36/month**
- **DeepSeek V4 Flash:** ~$0.25 + $0.13 = **~$0.38/month** (less with cache hits / off-peak)
- **Claude Haiku 4.5 (all traffic):** ~$1.80 + $2.25 = **~$4.05/month**

**Interpretation:** A local-first architecture makes OCR and transcription effectively free, so cloud spend is dominated entirely by agentic calls. On the recommended cheap-tier stack a daily student user costs well under $1/month; even routing everything to the premium cheap model (Haiku 4.5) stays around $4/month. This validates atomik's core thesis — pushing OCR/transcription/DSL-generation on-device and reserving cloud only for agentic orchestration keeps per-user cost negligible and scalable.

### Thresholds that would change these recommendations
- If a mid-range phone can't sustain >5 tok/s on Qwen3-1.7B in your runtime, drop to Gemma 3 1B or LFM2-1.2B (both <1GB) or route DSL generation to the cloud.
- If atomik DSL validity from grammar-constrained sub-2B models falls below ~95% *semantic* correctness (grammar guarantees syntax, not semantics), step up to Qwen3-4B or route hard diagrams to Gemini Flash-Lite.
- If agentic cloud spend exceeds ~$5/user/month, add aggressive prompt caching (DeepSeek cache hit is $0.003/M) and complexity-based routing (cheap model for 70–80% of calls, Haiku only for failures).

## Caveats
- **Pricing volatility:** Cloud pricing moves monthly and several 2026 model versions (Gemini 3.x, GPT-5.x, DeepSeek V4) appear in sources with conflicting numbers (e.g., Gemini 2.5 Flash listed at both $0.15/$0.60 and $0.30/$2.50). Verify on official pricing pages before committing budget.
- **Vendor speed claims are best-case:** One Qualcomm phone benchmark of 13.1 tok/s (Llama 3.1 8B) was reproduced at only 5.1 tok/s by a user; treat all vendor tok/s numbers as ceilings, not guarantees.
- **French support:** Whisper (multilingual), Voxtral, Parakeet-v3, Qwen3, Gemma 3, and docTR all handle French well; SmolLM2 and Llama 3.2 are weaker in French; distil-whisper is English-only. Because the user works primarily in French, prefer Voxtral/Parakeet/large-v3-turbo for transcription and Qwen3/Gemma 3 for DSL generation.
- **Licensing flags for commercial use:** Llama 3.2 (700M-MAU cap + EU multimodal restriction), Gemma 3 / Gemma 3n / EmbeddingGemma (custom Gemma Terms + Prohibited Use Policy), LFM2 (LFM Open License with possible enterprise revenue gating — verify the clause), Surya (verify GPL/commercial split), and Qwen2.5-VL 3B (possible research license — the 0.5B/1.5B/7B Qwen2.5 text models are Apache 2.0, but 3B/72B historically differ). Cleanest for unrestricted commercial use: **Qwen3, SmolLM2/3, Phi-4-mini, Whisper, PaddleOCR, Tesseract, docTR, bge-m3.**
- **Structured-output reliability:** JSON/DSL reliability of sub-2B models is weak without constraints (SmolLM2 26% raw parse, Llama 3.2 3B ~48–56%). GBNF grammar-constrained decoding in llama.cpp is essential for atomik and guarantees syntactic validity — but validate semantics (correct diagram structure) separately, since grammars constrain form, not meaning.
- **Gemma 3n footprint** varies significantly depending on whether audio/vision encoders and Per-Layer Embeddings are bundled (text-only E2B can be <1GB; full ~3GB) — measure your specific build.
- **dots.ocr** is documented as a 1.7B-LLM-based model despite frequent "3B" citations; confirm parameter count and license before deployment.