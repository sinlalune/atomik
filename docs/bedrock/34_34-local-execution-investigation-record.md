---
{
  "id": "34-local-execution-investigation-record",
  "title": "Retrieval and local execution investigation record",
  "status": "living-research",
  "eyebrow": "Research record · 2026-06-23",
  "summary": "A dated record of current hybrid retrieval, on-device embedding, local speech recognition, edit prediction, and GenAI observability candidates that informed Atomik v0.5; all capability facts require recheck.",
  "tags": [
    "research",
    "retrieval",
    "embeddings",
    "local-models",
    "speech-to-text",
    "autocomplete",
    "observability",
    "cost",
    "mobile",
    "volatile-facts"
  ],
  "relations": [
    {
      "to": "23-references",
      "kind": "extends"
    },
    {
      "to": "26-okf-agent-context",
      "kind": "informs"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "supports"
    },
    {
      "to": "18-roadmap",
      "kind": "changes"
    },
    {
      "to": "32-truth-investigation-record",
      "kind": "continues-method-from"
    }
  ],
  "agent": {
    "purpose": "Preserve current technical evidence and caveats for retrieval and local execution so future agents do not turn dated model/runtime facts into permanent architecture.",
    "inputs": [
      "official model documentation",
      "official repositories and model cards",
      "retrieval experiments",
      "observability specifications",
      "Atomik workload constraints"
    ],
    "outputs": [
      "dated findings",
      "candidate list",
      "evaluation gates",
      "volatile-fact register",
      "recheck triggers",
      "open risks"
    ],
    "invariants": [
      "Prefer primary official sources.",
      "Separate stable architectural decisions from model/runtime snapshots.",
      "Do not select a default solely from vendor benchmarks.",
      "Record device, language, workload, model revision, and runtime assumptions.",
      "Update this record before shipping or materially changing a local-model default."
    ]
  }
}
---

# Retrieval and local execution investigation record

## Record metadata

```text
Investigation date: 2026-06-23
Project timezone/context: Europe/Paris
Scope:
  whether RAG still implies embeddings/vector databases
  practical hybrid retrieval for Markdown and code
  local embedding feasibility on desktop and mobile
  local speech-to-text on desktop and mobile
  local autocomplete/edit prediction
  token, cost, privacy, and outcome observability
```

This is a dated engineering record, not a guarantee that any named model remains available, licensed identically, or optimal later.

## Executive conclusion

```text
RAG remains useful as a generation pattern.
Embedding-only RAG is not the default architecture.
Hybrid lexical/link/structural/semantic retrieval is the practical direction.
Local embeddings and speech recognition are viable enough to evaluate now.
Local autocomplete is feasible, but should be layered and aggressively budgeted.
Every action needs an outcome-aware cost receipt from the first AI loop.
```

The durable decision is strategy-pluggable retrieval and execution. The named candidates below are replaceable.

## Hybrid retrieval finding

SQLite FTS5 provides local full-text search. Tree-sitter provides incremental syntax trees, and LSP provides language-aware symbols, definitions, references, and related structure. These are directly useful for code and Markdown navigation without any embedding model.

Anthropic's published contextual-retrieval experiment reports that combining contextual embeddings with BM25 outperformed contextual embeddings alone on its tested datasets, and that reranking further reduced retrieval failures while adding latency/cost tradeoffs. This supports testing hybrid systems; it does not establish a universal ranking for Atomik's corpus.

Architectural consequence:

```text
direct + lexical + link + structural baseline first
optional semantic retrieval second
optional reranking third
external retrieval only for missing/fresh information
```

## Local embedding candidates

### EmbeddingGemma

Official documentation checked 2026-06-23 describes:

```text
308M parameters
optimized for phones, laptops, and tablets
over 100 languages
configurable output dimensions from 768 to 128
quantized execution under 200 MB RAM stated by the vendor
offline on-device embeddings
```

This makes it a plausible constrained-device candidate. The claims still require reproduction on Atomik's runtime, hardware, corpus, and languages.

### Qwen3 Embedding and rerankers

The official repository checked 2026-06-23 lists embedding and reranking models at 0.6B, 4B, and 8B, with multilingual and code-retrieval support. The 0.6B models are plausible desktop candidates; larger variants may be useful only on capable devices or servers.

Selection rule:

```text
compare against FTS5/link/structural baseline
measure cross-language and conceptual gains
record index build/update cost and storage
prefer the smallest model that materially improves accepted retrieval outcomes
```

## Local speech-to-text candidates

### whisper.cpp

The official repository checked 2026-06-23 documents CPU-only inference, integer quantization, multiple hardware backends, and support for macOS, Windows, Linux, iOS, Android, WebAssembly, and other targets. It is the broadest initial adapter candidate for local/offline integration.

### sherpa-onnx

The official repository checked 2026-06-23 positions sherpa-onnx as offline speech/audio infrastructure across embedded systems, Android, iOS, desktop/server architectures, and several programming languages. It is a useful deployment/runtime candidate, especially for streaming and mobile-oriented model choices.

### NVIDIA Parakeet-TDT-0.6B-v3

The official model card checked 2026-06-23 lists automatic punctuation/capitalization, word- and segment-level timestamps, long-audio support under stated hardware modes, and a CC BY 4.0 license. It is a desktop/GPU benchmark candidate, not an assumed mobile default.

Evaluation must include French and English technical speech, correction effort, timestamps, device thermals, and real-time factor. Published benchmark scores alone do not determine the product default.

## Local autocomplete and edit prediction candidate

Zed's Zeta2.1 materials checked 2026-06-23 describe an open-weight edit-prediction model and local self-hosting path. It demonstrates that specialized next-edit models can be deployed locally and optimized for low output-token latency.

Atomik should borrow the layered architecture, not automatically adopt the model:

```text
deterministic Markdown/link/path completion first
small nearby-context completion second
explicit/debounced edit prediction on desktop third
cloud transformation only by explicit action
```

A code-specific 8B edit model is not automatically the right model for general Markdown learning notes or mobile devices.

## Observability finding

OpenTelemetry's current GenAI semantic-conventions work includes attributes for provider/model operations and input/output, cached-input, and reasoning-token counts. The documentation warns that prompt, memory query, and message content can contain sensitive data and should not be captured by default.

Architectural consequence:

```text
align token/provider/model naming where useful
prefer billed counts when a provider exposes billed and consumed counts separately
extend beyond model calls to retrieval, transcription, autocomplete, tools, and patch outcomes
keep content capture opt-in
keep estimated, reported, and billed values distinct
```

OpenTelemetry's GenAI conventions are under active development; Atomik's contract must be stable enough for its product while mapping to external conventions through adapters.

## Cost finding

Per-token billing is only one cost surface.

```text
embedding index build/update
local model startup and memory
CPU/GPU/NPU execution
battery and thermals
web queries
human transcript correction
rejected completion and patch effort
privacy/network exposure
```

Outcome-aware metrics are more useful than raw token totals. The first instrumentation belongs in M2; dashboards and optimization can arrive after real usage exists.

## Architectural decisions produced

```text
ADR-007
  Retrieval is hybrid and strategy-pluggable; embeddings are optional derived state and no vector database is required for the MVP.

ADR-008
  Every meaningful action emits a privacy-aware ActionTrace; local/cloud/tool execution and estimated/reported/billed costs remain explicit.

Roadmap
  M2 adds ActionTrace.
  M3 includes local speech baseline.
  M8 builds lexical/link/structural retrieval first.
  M9 evaluates local semantic retrieval and autocomplete.
  M11 aggregates cost/outcome dashboards from earlier traces.
```

## Evaluation fixtures required

### Retrieval

```text
exact path and heading lookup
identifier/symbol lookup
conceptual paraphrase
cross-language query
source-backed claim lookup
supporting vs contradicting evidence
```

### Speech

```text
French and English
quiet/noisy
phone/laptop microphone
technical terms and names
short note and long recording
timestamps and correction effort
```

### Autocomplete

```text
Markdown prose
wikilinks and headings
frontmatter and tags
code blocks
short pause vs explicit invocation
accept/reject/partial accept
```

## Volatile fact register

| Item | Checked | Recheck trigger |
|---|---:|---|
| EmbeddingGemma model/runtime claims | 2026-06-23 | before evaluation/default change |
| Qwen3 embedding/reranker sizes and license/runtime availability | 2026-06-23 | before evaluation/default change |
| whisper.cpp platforms and stable release | 2026-06-23 | before integration/release |
| sherpa-onnx platform/model support | 2026-06-23 | before mobile/desktop integration |
| Parakeet model card, license, language/runtime behavior | 2026-06-23 | before benchmark or distribution |
| Zeta2.1 model/version/local serving guidance | 2026-06-23 | before autocomplete prototype |
| OpenTelemetry GenAI attribute names/status | 2026-06-23 | before telemetry adapter release |
| Retrieval experiment results from third parties | 2026-06-23 | when changing default strategy |

## Open risks

```text
Which embedding model best handles mixed French/English notes and code on target laptops?
Does semantic retrieval add enough value over FTS5 + links + structure for typical project sizes?
Which speech runtime provides the best corrected-transcript economics on CPU-only hardware?
How should energy be estimated consistently across operating systems?
What minimum model can produce useful Markdown completion without distracting latency?
How should local model downloads, integrity, updates, and licenses be managed?
What operation trace fields are stable enough across providers and local runtimes?
How should accepted usefulness be measured without creating manipulative product metrics?
```

## Primary sources checked

### Retrieval and structure

- SQLite FTS5: https://sqlite.org/fts5.html
- Tree-sitter: https://tree-sitter.github.io/
- Language Server Protocol: https://microsoft.github.io/language-server-protocol/
- Anthropic contextual retrieval: https://www.anthropic.com/engineering/contextual-retrieval

### Embeddings

- EmbeddingGemma: https://ai.google.dev/gemma/docs/embeddinggemma
- Qwen3 Embedding: https://github.com/QwenLM/Qwen3-Embedding

### Speech

- whisper.cpp: https://github.com/ggml-org/whisper.cpp
- sherpa-onnx: https://github.com/k2-fsa/sherpa-onnx
- Parakeet-TDT-0.6B-v3: https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3

### Autocomplete

- Zeta2.1 announcement: https://zed.dev/blog/zeta2-1
- Zeta2.1 model card: https://huggingface.co/zed-industries/zeta-2.1

### Observability

- OpenTelemetry GenAI semantic conventions: https://github.com/open-telemetry/semantic-conventions-genai
- GenAI attribute registry: https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/registry/attributes/gen-ai.md
- GenAI agent/framework spans: https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md

All facts in this record are dated 2026-06-23 and require recheck before implementation or release decisions that depend on them.
