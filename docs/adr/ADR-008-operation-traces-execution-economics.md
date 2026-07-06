# ADR-008: Privacy-aware operation traces and explicit execution economics

Status: accepted
Date: 2026-06-23

## Context

Atomik actions can consume cloud tokens and search queries, local CPU/GPU time, memory, storage, energy, network/privacy exposure, and human correction effort. Provider-only token accounting misses retrieval, transcription, autocomplete, deterministic tools, local inference, and patch outcomes. Deferring instrumentation until a later dashboard would make early data unavailable and encourage provider-specific contracts.

## Decision

Every meaningful retrieval, transformation, embedding, reranking, transcription, autocomplete, generation, verification, tool, and patch action emits an `ActionTrace` from the first AI loop.

The trace distinguishes:

```text
execution location: deterministic / local-model / cloud-model / web
estimated vs runtime/provider-reported vs billed usage/cost
input/output/cached/reasoning tokens when exposed
non-token work units such as audio seconds or retrieval candidates
latency and optional local resource measurements
privacy mode and external transfer
completed/cancelled/failed
accepted/edited/rejected or other useful outcome
```

Raw prompts, note contents, transcripts, retrieved excerpts, and outputs are not recorded by default. Budgets, cancellation, local-only policy, and external approval are enforced in the trusted service layer below renderer state.

The private ledger is ignored by Git by default; reviewed aggregate reports may be exported explicitly.

## Consequences

- M2 includes a minimal trace even for mocks.
- Provider usage becomes a child/specialization of a cross-action trace rather than a separate architecture.
- Local actions may show `€0 external`, but also expose measurable latency/resources.
- Later dashboards can compute outcome-aware metrics from historical traces.
- Content-minimized traces reduce privacy risk and remain useful for budgets and debugging.
- Provider prices and model capabilities remain dated snapshots linked from estimates.

## Alternatives considered

- Provider usage only: excludes local and deterministic work and creates lock-in.
- Dashboard later: loses early history and requires contract migration.
- Record full prompts/outputs for debugging: unacceptable default privacy risk.
- Show only money: hides local resources and human correction effort.
- Show only tokens: cannot represent speech, search, tools, or patch usefulness.

## Migration / rollback

Older `ProviderUsage` records can map to `ActionTrace` children. Unknown fields remain optional. The local ledger can be deleted without deleting knowledge. Aggregate exports can be regenerated from retained traces.

## Links

- `06_06-ai-patch-pipeline.md`
- `29_29-verification-grounding-router.md`
- `31_31-truth-lens-ux.md`
- `33_33-retrieval-local-execution-cost.md`
- `operation_trace_contract_v0_1.json`
