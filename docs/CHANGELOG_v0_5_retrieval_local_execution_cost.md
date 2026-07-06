# Atomik Bedrock v0.5 — Retrieval, local execution, and cost observability

Release: 0.5.0
Date: 2026-06-23

## Summary

This iteration turns the prior retrieval/local-model/cost discussion into durable architecture.

```text
RAG is no longer treated as synonymous with embeddings.
Hybrid retrieval starts with direct, lexical, link, and structural methods.
Embeddings and rerankers are optional rebuildable stages.
Local speech-to-text and autocomplete become measured adapters.
ActionTrace begins with the first AI mock instead of a later dashboard.
Local and cloud execution expose distinct cost, privacy, and capability tradeoffs.
```

## New foundational pages

- `33_33-retrieval-local-execution-cost.md`
- `34_34-local-execution-investigation-record.md`

## New ADRs

- `ADR-007-hybrid-retrieval-optional-semantic-indexes.md`
- `ADR-008-operation-traces-execution-economics.md`

## New machine contract and fixture

- `operation_trace_contract_v0_1.json`
- `action_trace_fixture.json`

## Major updates

- Orientation now includes cost-observable, local-capable, retrieval-strategy-pluggable principles.
- AI operations include `ExecutionPolicy`, `OperationBudget`, and `ActionTrace` references.
- Source adapters include local/cloud transcription metadata and trace requirements.
- Electron architecture reserves a trusted local-runtime worker/sidecar boundary.
- `context-core` owns replaceable lexical/link/structural/semantic strategies, not a mandatory vector store.
- An incubating `execution-core` boundary owns policy, budgets, traces, and usage ledgers.
- Roadmap M2 emits traces; M3 includes local speech; M8 builds lexical/structural retrieval; M9 evaluates local autocomplete/semantic retrieval; M11 aggregates dashboards.
- Truth Lens gains compact and expanded operation receipts.
- Git policy ignores private traces, model files, and derived indexes while allowing explicit aggregate exports.
- Coding-agent instructions forbid mandatory vector infrastructure and raw-content telemetry defaults.
- Workspace, selection/scope, file-first, Electron security, maintainability, and documentation-template pages now expose the same operation-receipt and local-runtime boundary.
- The truth/evidence Markdown and machine contracts now link verification and response bundles through `actionTraceIds`, retaining provider-only fields only for migration compatibility.

## Dated candidate research

The v0.5 investigation records official references checked on 2026-06-23 for:

```text
SQLite FTS5
Tree-sitter
Language Server Protocol
Anthropic contextual retrieval experiment
EmbeddingGemma
Qwen3 Embedding/Reranker
whisper.cpp
sherpa-onnx
NVIDIA Parakeet-TDT-0.6B-v3
Zeta2.1
OpenTelemetry GenAI semantic conventions
```

These are evaluation inputs, not permanent defaults.

## Compatibility

- Existing project files remain valid.
- Existing provider usage records can map to child `ActionTrace` records.
- Embedding and vector indexes remain disposable.
- The roadmap adds M13 for Canvas after inserting measured local assistance at M9.
- Legacy machine-contract filenames are retained where applicable, with their internal version raised to `0.5`.
