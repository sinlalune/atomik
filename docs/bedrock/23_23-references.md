---
{
  "id": "23-references",
  "title": "External references and current constraints",
  "status": "supporting",
  "tags": [
    "references",
    "electron",
    "web",
    "okf",
    "git",
    "gemini",
    "grounding",
    "wikimedia",
    "truth",
    "retrieval",
    "local-models",
    "speech-to-text",
    "autocomplete",
    "observability"
  ],
  "relations": [
    {
      "to": "12-electron-mvp",
      "kind": "supports"
    },
    {
      "to": "13-electron-security",
      "kind": "supports"
    },
    {
      "to": "08-capture-source",
      "kind": "supports"
    },
    {
      "to": "26-okf-agent-context",
      "kind": "supports"
    },
    {
      "to": "27-git-compatibility",
      "kind": "supports"
    },
    {
      "to": "29-verification-grounding-router",
      "kind": "supports"
    },
    {
      "to": "30-public-knowledge-dictionary",
      "kind": "supports"
    },
    {
      "to": "32-truth-investigation-record",
      "kind": "summarized-by"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "supports"
    },
    {
      "to": "34-local-execution-investigation-record",
      "kind": "uses-dated-capability-evidence-from"
    }
  ],
  "agent": {
    "purpose": "Use official documentation as the source for platform, security, provider, pricing, licensing, and format claims; preserve checked dates and update links when they change.",
    "inputs": [
      "external docs",
      "platform change",
      "API deprecation",
      "format revision",
      "local model/runtime documentation",
      "retrieval/observability specifications"
    ],
    "outputs": [
      "updated reference note",
      "ADR update if needed"
    ],
    "invariants": [
      "Prefer official docs.",
      "Do not base security decisions on memory.",
      "Re-check Electron APIs before implementation.",
      "Re-check OKF before claiming conformance.",
      "Re-check Gemini pricing, terms, and grounding behavior before implementation and release.",
      "Re-check Wikimedia formats and licensing before pack ingestion.",
      "Keep volatile facts in dated records rather than timeless summaries.",
      "Model capability and performance facts are dated and re-evaluated on Atomik workloads and target devices."
    ]
  }
}
---

# External references and current constraints

These references should be re-checked when implementation starts.

## Electron

- Electron security documentation: https://www.electronjs.org/docs/latest/tutorial/security
- Electron context isolation documentation: https://www.electronjs.org/docs/latest/tutorial/context-isolation
- Electron IPC documentation: https://www.electronjs.org/docs/latest/tutorial/ipc
- Electron BrowserView to WebContentsView migration note: https://www.electronjs.org/blog/migrate-to-webcontentsview

## Mobile capture input

- MDN `capture` attribute: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture
- MDN `<input type="file">`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file

## Open Knowledge Format

- Google Cloud announcement: https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing
- OKF specification: https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md
- OKF repository README and proof-of-concept tools: https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf

## Git

- Git documentation: https://git-scm.com/doc
- Git LFS documentation: https://git-lfs.com/
- Git attributes documentation: https://git-scm.com/docs/gitattributes

## Important summarized constraints

```text
Electron remote content must not run with Node integration.
Context isolation should be enabled.
IPC must be explicit and narrow.
BrowserView is not the recommended new foundation; use WebContentsView for source views.
Mobile capture attribute is useful but not universally reliable, so the upload page must also support file selection fallback.
OKF v0.1 is Markdown + YAML frontmatter + directory hierarchy + optional index.md/log.md, not a required runtime.
Atomik should use OKF as an interoperability profile, not as a complete internal product spec.
Git compatibility requires stable, deterministic file writes and ignored rebuildable state.
```

## Re-check triggers

Re-check external references before changing:

```text
Electron webPreferences
preload/contextBridge policy
WebContentsView implementation
capture upload behavior
OKF conformance claims
source dossier frontmatter profile
Git LFS or ignore template defaults
```

## Gemini API and Google Search grounding

Checked for the truth iteration on 2026-06-22:

- Grounding with Google Search: https://ai.google.dev/gemini-api/docs/google-search
- Gemini Developer API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini API Additional Terms of Service: https://ai.google.dev/gemini-api/terms
- Gemini API changelog: https://ai.google.dev/gemini-api/docs/changelog
- Gemini API rate limits: https://ai.google.dev/gemini-api/docs/rate-limits

Do not summarize these as timeless guarantees. Current findings and caveats live in `32_32-truth-investigation-record.md` and `verification_provider_policy_v0_1.json`.

## Wikimedia and lexicographic data

Checked for the truth iteration on 2026-06-22:

- Wikimedia downloads: https://dumps.wikimedia.org/
- Wikimedia dump licensing: https://dumps.wikimedia.org/legal.html
- Wikimedia Foundation Terms of Use: https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use
- Wikidata lexicographical data: https://www.wikidata.org/wiki/Wikidata:Lexicographical_data
- Wikimedia Enterprise: https://enterprise.wikimedia.com/
- Wikimedia Enterprise project data: https://enterprise.wikimedia.com/project-data/
- Wikimedia Enterprise docs: https://enterprise.wikimedia.com/docs/

## Additional re-check triggers

```text
provider model change
provider billing anomaly
new region/account mode
Grounding UI change
knowledge-pack release
Wikimedia dump format/parser change
license or attribution export change
lexicographic schema change
```


## Retrieval and context compilation

Checked 2026-06-23:

- SQLite FTS5: https://sqlite.org/fts5.html
- Tree-sitter: https://tree-sitter.github.io/
- Language Server Protocol: https://microsoft.github.io/language-server-protocol/
- Anthropic contextual retrieval experiment: https://www.anthropic.com/engineering/contextual-retrieval

Architectural use:

```text
FTS5/BM25, paths, headings, links, Tree-sitter, and LSP are baseline retrieval tools.
The Anthropic experiment is evidence that hybrid retrieval and reranking can improve some workloads; it is not a universal benchmark or mandate.
Atomik must evaluate retrieval on its own notes, code, languages, and device budgets.
```

## Local embedding candidates

Checked 2026-06-23:

- EmbeddingGemma: https://ai.google.dev/gemma/docs/embeddinggemma
- Qwen3 Embedding and reranking models: https://github.com/QwenLM/Qwen3-Embedding

These are dated evaluation candidates, not dependencies. Record exact model revision, quantization, dimensions, runtime, hardware, language mix, retrieval corpus, and evaluation results before selecting a default.

## Local speech-to-text candidates

Checked 2026-06-23:

- whisper.cpp: https://github.com/ggml-org/whisper.cpp
- sherpa-onnx: https://github.com/k2-fsa/sherpa-onnx
- NVIDIA Parakeet-TDT-0.6B-v3 model card: https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3

Benchmark with the user's languages, accent, microphones, technical vocabulary, noise, timestamps, correction effort, real-time factor, memory, and device energy proxy. Published leaderboards do not choose Atomik's default automatically.

## Local autocomplete and edit prediction candidates

Checked 2026-06-23:

- Zeta2.1 announcement: https://zed.dev/blog/zeta2-1
- Zeta2.1 model card: https://huggingface.co/zed-industries/zeta-2.1

Zeta is a code edit-prediction reference architecture, not a general Markdown dependency. Atomik should first implement deterministic completion and then evaluate smaller local completion/edit models with explicit or debounced invocation.

## Usage and trace conventions

Checked 2026-06-23:

- OpenTelemetry GenAI semantic-conventions repository: https://github.com/open-telemetry/semantic-conventions-genai
- GenAI attributes: https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/registry/attributes/gen-ai.md
- Agent/framework spans: https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md

Atomik should align where useful for provider/model identity and token accounting, while extending beyond model calls to retrieval, transcription, autocomplete, deterministic tools, external billing, local resources, privacy, and accepted outcomes. Content capture remains opt-in.
