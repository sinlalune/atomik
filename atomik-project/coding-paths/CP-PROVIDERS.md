---
type: Atomik Coding Path
title: Provider expansion + settings menu — OpenRouter gateway, direct adapters (OpenAI, Anthropic, DeepSeek, Mistral), multi-provider settings panel (labelled)
description: Expands Atomik's AI generation boundary beyond Mistral into a provider-neutral architecture — supporting an OpenRouter gateway adapter alongside direct first-party adapters (OpenAI, Anthropic, DeepSeek, Mistral) and the deterministic offline mock; a dedicated multi-provider settings panel with 0600 main-only key storage; curated model allowlists with dated pricing snapshots; explicit error taxonomy without silent fallbacks; and complete ActionTrace receipts.
tags: [coding-path, providers, ai, generation, openrouter, openai, anthropic, deepseek, mistral, settings, traces]
timestamp: 2026-08-16T00:00:00Z
atomik:
  id: CP-PROVIDERS
  status: running
  current_step: S01
  base_commit: 2370546
  branch: path/cp-providers
  writes:
    - apps/desktop/electron-main/generation.ts
    - apps/desktop/electron-main/ai-settings.ts
    - apps/desktop/electron-main/openrouter-generation-adapter.ts
    - apps/desktop/electron-main/openai-generation-adapter.ts
    - apps/desktop/electron-main/anthropic-generation-adapter.ts
    - apps/desktop/electron-main/deepseek-generation-adapter.ts
    - apps/desktop/electron-main/mistral-generation-adapter.ts
    - apps/desktop/electron-main/action-trace.ts
    - apps/desktop/electron-main/index.ts
    - apps/desktop/electron-preload/index.ts
    - apps/desktop/shared/ipc-contract.ts
    - apps/desktop/renderer/src/AppMenu.tsx
    - apps/desktop/renderer/src/settings/
    - apps/desktop/renderer/src/ai/
    - apps/desktop/tests/
    - docs/modules/atomik-desktop-ai.md
    - docs/modules/atomik-desktop.md
    - docs/learning/23-multi-provider-ai-generation-and-gateway.md
    - docs/adr/
    - atomik-project/coding-paths/CP-PROVIDERS.md
    - atomik-project/log/
---

# Goal

CP-MVP-008 established real AI generation using Mistral Small behind the
`GenerationAdapter` seam (`apps/desktop/electron-main/generation.ts`), while
retaining the deterministic mock as an offline fallback/test engine. However,
Atomik's secondary seams remain tightly coupled to Mistral:
- `AiEngine` is a closed union `mock | mistral`;
- `ai-settings.ts` only stores `mistralApiKey`;
- the settings UI in `AppMenu.tsx` only offers a Mistral key input and mock/mistral toggle;
- model IDs and pricing snapshots are Mistral-only;
- main dispatch and test suites branch on Mistral.

The research investigation (`docs/research/openrouter-vs-direct-providers.md`)
formulated the hybrid hypothesis: maintain Atomik's provider-neutral
`GenerationAdapter` boundary, integrate OpenRouter as a flexible gateway
for broad model evaluation and exploration, while supporting direct first-party
adapters (OpenAI, Anthropic, DeepSeek, Mistral) for direct commercial relationships,
strict privacy/residency, and native feature fidelity.

This path makes Atomik's AI generation architecture truly provider-neutral:
1. **Provider-neutral `GenerationAdapter` core** — extensible engine identifiers,
   curated model allowlists, capability descriptors, and dated pricing snapshots.
2. **OpenRouter Gateway Adapter** — compatible chat completions adapter with
   strict privacy controls (`allow_fallbacks: false`, `require_parameters: true`,
   `data_collection: deny`, `zdr: true`, disabled context compression, router metadata).
3. **Direct First-Party Adapters** — OpenAI, Anthropic (Messages API), DeepSeek,
   and Mistral adapters implementing pure-compute generation with AbortSignal
   cancellation and explicit typed error mapping (`GenerationError`).
4. **Multi-Provider Settings & Secure Storage** — main-side 0600 storage
   (`ai-settings.json`) managing keys for OpenRouter, OpenAI, Anthropic,
   DeepSeek, and Mistral, with masked hints (`sk-••••1234`) over IPC and zero key
   exposure to the renderer.
5. **Multi-Provider Settings UI** — dedicated Settings panel/modal accessible from
   `AppMenu`, with key configuration, status/presence indicators, active provider selection,
   and per-provider model selectors.
6. **ActionTraces & Observability** — full provider/model/routing provenance in
   `.atomik/usage/private/actions.jsonl` with provider-reported token usage, dated
   price snapshot cost calculation, and verified `contentRecorded: false`.

# Definition of done

- `GenerationAdapter` and `AiEngine` in `shared/ipc-contract.ts` and
  `electron-main/generation.ts` are provider-neutral, supporting `'mock'`,
  `'openrouter'`, `'openai'`, `'anthropic'`, `'deepseek'`, and `'mistral'`.
- OpenRouter gateway adapter implemented with strict parameters:
  `allow_fallbacks: false`, `require_parameters: true`, `data_collection: deny`,
  `zdr: true`, disabled context compression, and router metadata capture.
- Direct adapters for OpenAI, Anthropic, DeepSeek, and Mistral implemented with
  pure-compute HTTP fetch (zero bulky third-party SDK dependencies, bedrock 15),
  AbortController cancellation, and input/output token bounds.
- Explicit 8-kind `GenerationError` taxonomy maintained across all adapters
  (`offline`, `timeout`, `auth`, `rate-limit`, `provider-request`,
  `provider-server`, `cancelled`, `budget-exceeded`) with zero silent fallback to mock.
- `electron-main/ai-settings.ts` securely stores API keys in `ai-settings.json`
  (mode 0600), returns masked hints over typed IPC, and resolves active engine
  and model per provider.
- Dedicated multi-provider Settings UI in the desktop renderer allowing API key
  entry, engine selection, and model selection.
- ActionTraces record provider, model, version, provider-reported usage, and
  dated snapshot pricing estimates; privacy test proves no content or secret leakage.
- Unit tests, mock suites, and live smoke tests pass bare (`npm run typecheck && npm test && npm run build`).
- Documentation, module notes (`atomik-desktop-ai.md`), learning note
  (`docs/learning/23-multi-provider-ai-generation-and-gateway.md`), and ledger
  updated in the same work units.

# Documentation coverage

## Required

- 06-ai-patch-pipeline — the generation contract, proposal validation, and patch preview
- 13-electron-security — provider keys stay main-side only (0600), typed narrow IPC channels, no remote execution
- 14-app-kernels — ai-core owns generation adapters, execution-core owns action traces
- 15-maintainability — zero-dependency bias, minimal clean HTTP fetch clients, no bulky provider SDKs
- 33-retrieval-local-execution-cost — operation cost, dated price snapshot, provider-reported usage preferred over estimates, ActionTrace
- 36-ui-design-system — settings panel UI tokens, themes, glass rules, and accessibility floors
- 17-self-evolving-docs · 22-agent-handoff · 24-doc-templates · 35-coding-path-execution-state · coding-paths/paths.md — standing execution law

## Conditional

- 28-truth-evidence-model — claim labeling over provider outputs (mechanical containment)
- 26-okf-agent-context — context packet formatting passed to provider adapters
- 27-git-compatibility — `ai-settings.json` is outside the vault in main state dir
- 25-use-cases — when scoping multi-provider workflows
- 00-orientation + 01-workbench-first — re-read if a step seems to bend the constitution

## Deliberately excluded

- 07/08/09/10 (source adapters, capture, web, PDF) — generation reads what they already wrote; no adapter changes
- 19-dsl-future · 21-canvas-future — the studio is a separate surface
- 30-public-knowledge-dictionary · 29-verification-grounding-router — M10/M7 territory
- 34-local-execution-investigation-record — local llama.cpp seat is a separate evaluated tier

# Execution

- [ ] S01 Bootstrap + pins: read Required docs, record opening-check answers, pin
      provider contracts, model catalog allowlists, pricing snapshots, and error mapping. Docs-only step.
- [ ] S02 Provider-neutral core & OpenRouter gateway adapter: refactor `generation.ts`
      and `ipc-contract.ts` for multi-provider support; implement `openrouter-generation-adapter.ts`
      with strict parameters (`zdr: true`, `allow_fallbacks: false`, etc.) and unit tests with mock responses.
- [ ] S03 Direct provider adapters: implement `openai-generation-adapter.ts`,
      `anthropic-generation-adapter.ts`, and `deepseek-generation-adapter.ts` behind `GenerationAdapter`;
      preserve existing Mistral and mock adapters; add unit test fixtures for each.
- [ ] S04 Multi-provider secure settings storage & IPC: update `ai-settings.ts` for
      multi-key 0600 storage, active engine & model configuration, masked hint IPC channels,
      and preload surface tests.
- [ ] S05 Multi-provider settings UI & model picker: build dedicated Settings panel/modal
      in renderer, integrate with `AppMenu.tsx` and `AiPanel.tsx`, supporting key management,
      provider selection, and model selection.
- [ ] S06 Observability, ActionTraces & receipts: update `action-trace.ts` for multi-provider
      metadata and pricing calculations; extend telemetry tests to guarantee `contentRecorded: false`
      and no secret leakage.
- [ ] S07 Test suite & smoke matrix: comprehensive unit tests for all adapters, error
      conditions, cancellations, and live smoke test harness (`ATOMIK_SMOKE_AI_LIVE=1`).
- [ ] S08 Learning note, module notes & documentation: create learning note
      `docs/learning/23-multi-provider-ai-generation-and-gateway.md`, update `docs/modules/atomik-desktop-ai.md`
      and `docs/modules/atomik-desktop.md`.
- [ ] S09 Owner bench rounds + acceptance record, closing ceremony, coherence audit, and self-merge.

# Current checkpoint

```text
base commit : (pins at activation)
changed     : atomik-project/coding-paths/CP-PROVIDERS.md (draft), atomik-project/sessions/2026-08-16-cp-providers-opening-check.md
tests       : not run for this path yet (trunk: 767 passing at 2370546)
next action : activate path on branch path/cp-providers in its own worktree and begin S01
blockers    : none
```

# Blockers

None recorded.
