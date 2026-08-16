---
type: Atomik Coding Path
title: Provider expansion + settings menu — OpenRouter gateway, direct adapters (OpenAI, Anthropic, DeepSeek, Google Gemini, Mistral), multi-provider settings panel (labelled)
description: Expands Atomik's AI generation boundary beyond Mistral into a provider-neutral architecture — supporting an OpenRouter gateway adapter alongside direct first-party adapters (OpenAI, Anthropic, DeepSeek, Google Gemini, Mistral) and the deterministic offline mock; a dedicated multi-provider settings panel with 0600 main-only key storage; curated model allowlists with dated pricing snapshots; explicit error taxonomy without silent fallbacks; and complete ActionTrace receipts.
tags: [coding-path, providers, ai, generation, openrouter, openai, anthropic, deepseek, google, gemini, mistral, settings, traces]
timestamp: 2026-08-16T00:00:00Z
atomik:
  id: CP-PROVIDERS
  status: done
  current_step: S09
  base_commit: 1ffe08b
  branch: path/cp-providers
  writes:
    - apps/desktop/electron-main/generation.ts
    - apps/desktop/electron-main/ai-settings.ts
    - apps/desktop/electron-main/openrouter-generation-adapter.ts
    - apps/desktop/electron-main/openai-generation-adapter.ts
    - apps/desktop/electron-main/anthropic-generation-adapter.ts
    - apps/desktop/electron-main/deepseek-generation-adapter.ts
    - apps/desktop/electron-main/google-generation-adapter.ts
    - apps/desktop/electron-main/mistral-generation-adapter.ts
    - apps/desktop/electron-main/action-trace.ts
    - apps/desktop/electron-main/index.ts
    - apps/desktop/electron-preload/index.ts
    - apps/desktop/shared/ipc-contract.ts
    - apps/desktop/shared/generation-params.ts
    - apps/desktop/renderer/src/AppMenu.tsx
    - apps/desktop/renderer/src/settings/SettingsModal.tsx
    - apps/desktop/renderer/src/editor/gen-options.tsx
    - apps/desktop/renderer/src/workspace/GeneratedNoteScreen.tsx
    - apps/desktop/renderer/src/styles.css
    - apps/desktop/tests/
    - docs/modules/atomik-desktop-ai.md
    - docs/modules/atomik-desktop-shell.md
    - docs/modules/atomik-desktop-editor.md
    - docs/modules/atomik-desktop.md
    - docs/learning/23-multi-provider-ai-generation-and-gateway.md
    - docs/learning/index.md
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
adapters (OpenAI, Anthropic, DeepSeek, Google Gemini, Mistral) for direct commercial relationships,
strict privacy/residency, and native feature fidelity.

This path makes Atomik's AI generation architecture truly provider-neutral:
1. **Provider-neutral `GenerationAdapter` core** — extensible engine identifiers,
   curated model allowlists, capability descriptors, and dated pricing snapshots.
2. **OpenRouter Gateway Adapter** — compatible chat completions adapter with
   strict privacy controls (`allow_fallbacks: false`, `require_parameters: true`,
   `data_collection: deny`, `zdr: true`, disabled context compression, router metadata).
3. **Direct First-Party Adapters** — OpenAI, Anthropic (Messages API), DeepSeek,
   Google (Gemini), and Mistral adapters implementing pure-compute generation with AbortSignal
   cancellation and explicit typed error mapping (`GenerationError`).
4. **Multi-Provider Settings & Secure Storage** — main-side 0600 storage
   (`ai-settings.json`) managing keys for OpenRouter, OpenAI, Anthropic,
   DeepSeek, Google, and Mistral, with masked hints (`sk-••••1234`) over IPC and zero key
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
  `'openrouter'`, `'openai'`, `'anthropic'`, `'deepseek'`, `'google'`, and `'mistral'`.
- OpenRouter gateway adapter implemented with strict parameters:
  `allow_fallbacks: false`, `require_parameters: true`, `data_collection: deny`,
  `zdr: true`, disabled context compression, and router metadata capture.
- Direct adapters for OpenAI, Anthropic, DeepSeek, Google, and Mistral implemented with
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

# S01 Pins (2026-08-16)

1. **Engine and Provider Taxonomy**:
   `AiEngine = 'mock' | 'mistral' | 'openrouter' | 'openai' | 'anthropic' | 'deepseek' | 'google'`
   - `mock`: deterministic offline mock engine (deterministic, s08/offline)
   - `mistral`: direct Mistral API (`https://api.mistral.ai/v1/chat/completions`)
   - `openrouter`: OpenRouter gateway (`https://openrouter.ai/api/v1/chat/completions`)
   - `openai`: direct OpenAI API (`https://api.openai.com/v1/chat/completions`)
   - `anthropic`: direct Anthropic Messages API (`https://api.anthropic.com/v1/messages`)
   - `deepseek`: direct DeepSeek API (`https://api.deepseek.com/chat/completions`)
   - `google`: direct Google Gemini API (`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` or native generateContent)

2. **Curated Model Allowlist & Default Models**:
   - `anthropic`: default `claude-sonnet-5` (Claude Sonnet 5, Claude Opus 5, Claude Fable 5, Claude Opus 4.8, Claude Sonnet 4.6, Claude Haiku 4.5)
   - `openai`: default `gpt-5.6` (GPT-5.6 Sol, GPT-5.6 Terra, GPT-5.6 Luna, GPT-4.1, o3, o4-mini, o3-mini, GPT-4o, GPT-4o-mini)
   - `google`: default `gemini-3.6-flash` (Gemini 3.6 Flash, Gemini 3.5 Flash, Gemini 3.5 Flash-Lite, Gemini 3.1 Pro Preview, Gemini 2.5 Pro, Gemini 2.5 Flash)
   - `deepseek`: default `deepseek-chat` (DeepSeek-V3, DeepSeek-R1)
   - `mistral`: default `mistral-large-2411` (Mistral Large 2, Mistral Small 3, Codestral 2501, Pixtral Large, Ministral 8B, Ministral 3B)
   - `openrouter`: default `anthropic/claude-sonnet-5` (Claude Sonnet 5, Claude Fable 5, Claude Opus 5, GPT-5.6 Sol/Terra/Luna, DeepSeek V4 Pro/Flash, Kimi K3, GLM 5.2, MiniMax M3, Nemotron 3 Ultra, etc.)

3. **Dated Price Snapshot (`2026-08-16`) (USD per 1M tokens)**:
   - Snapshot ID: `model-research@2026-08-16`
   - `mistral-small-2603`: input $0.20, output $0.60
   - `mistral-large-2411`: input $2.00, output $6.00
   - `codestral-2501`: input $0.30, output $0.90
   - `ministral-8b-2410`: input $0.10, output $0.10
   - `ministral-3b-2410`: input $0.04, output $0.04
   - `gpt-4o-mini`: input $0.15, output $0.60
   - `gpt-4o`: input $2.50, output $10.00
   - `o3-mini`: input $1.10, output $4.40
   - `claude-3-5-haiku-20241022`: input $0.80, output $4.00
   - `claude-3-5-sonnet-20241022`: input $3.00, output $15.00
   - `claude-3-opus-20240229`: input $15.00, output $75.00
   - `deepseek-chat`: input $0.14, output $0.28 (cache hit: $0.014)
   - `deepseek-reasoner`: input $0.55, output $2.19 (cache hit: $0.14)
   - `gemini-2.0-flash`: input $0.10, output $0.40
   - `gemini-2.0-flash-lite`: input $0.075, output $0.30
   - `gemini-1.5-pro`: input $1.25, output $5.00
   - `gemini-1.5-flash`: input $0.075, output $0.30
   - OpenRouter models: base upstream rates + OpenRouter standard 5.5% platform fee

4. **Security & Credentials Seam (0600 mode)**:
   - Stored main-side in `ai-settings.json`:
     - `generationEngine?: AiEngine`
     - `selectedModels?: Partial<Record<AiEngine, string>>`
     - `mistralApiKey?: string`
     - `openrouterApiKey?: string`
     - `openaiApiKey?: string`
     - `anthropicApiKey?: string`
     - `deepseekApiKey?: string`
     - `googleApiKey?: string`
   - Renderer only receives `AiSettingsPublic` containing key presence (`boolean`), masked hint (`string | null`), active `generationEngine`, and selected models per provider. Raw keys never cross IPC (bedrock 13).

5. **OpenRouter Parameter & Privacy Enforcement**:
   - `require_parameters: true`
   - `allow_fallbacks: false`
   - `data_collection: 'deny'`
   - `zdr: true`
   - `transforms: []` (disable lossy compression)
   - `usage: { include: { router: true } }` (capture router metadata)

6. **Error Taxonomy & Boundaries**:
   - 8-kind typed `GenerationError` (`offline`, `timeout`, `auth`, `rate-limit`, `provider-request`, `provider-server`, `cancelled`, `budget-exceeded`).
   - Zero silent fallback to mock on error.
   - Pure compute HTTP client with zero heavy SDK dependencies (bedrock 15).

# Execution

- [x] S01 Bootstrap + pins: read Required docs, record opening-check answers, pin
      provider contracts, model catalog allowlists, pricing snapshots, and error mapping. Docs-only step.
- [x] S02 Provider-neutral core & OpenRouter gateway adapter: refactor `generation.ts`
      and `ipc-contract.ts` for multi-provider support; implement `openrouter-generation-adapter.ts`
      with strict parameters (`zdr: true`, `allow_fallbacks: false`, etc.) and unit tests with mock responses.
- [x] S03 Direct provider adapters: implement `openai-generation-adapter.ts`,
      `anthropic-generation-adapter.ts`, `deepseek-generation-adapter.ts`, and
      `google-generation-adapter.ts` behind `GenerationAdapter`; preserve existing Mistral and mock adapters; add unit test fixtures for each.
- [x] S04 Multi-provider secure settings storage & IPC: update `ai-settings.ts` for
      multi-key 0600 storage, active engine & model configuration, masked hint IPC channels,
      and preload surface tests.
- [x] S05 Multi-provider settings UI & model picker: build dedicated Settings panel/modal
      in renderer, integrate with `AppMenu.tsx` and `AiPanel.tsx`, supporting key management,
      provider selection, and model selection.
- [x] S06 Observability, ActionTraces & receipts: update `action-trace.ts` for multi-provider
      metadata and pricing calculations; extend telemetry tests to guarantee `contentRecorded: false`
      and no secret leakage.
- [x] S07 Test suite & smoke matrix: comprehensive unit tests for all adapters, error
      conditions, cancellations, and live smoke test harness (`ATOMIK_SMOKE_AI_LIVE=1`).
- [x] S08 Learning note, module notes & documentation: create learning note
      `docs/learning/23-multi-provider-ai-generation-and-gateway.md`, update `docs/modules/atomik-desktop-ai.md`
      and `docs/modules/atomik-desktop.md`.
- [x] S09 Owner bench rounds + acceptance record, closing ceremony, coherence audit, and self-merge.

# Current checkpoint

```text
base commit : 15a115f
changed     : all CP-PROVIDERS deliverables complete; coherence audit clean; closing ceremony recorded
tests       : 788 passed bare, build succeeded, cairn-check satisfied (2026-08-16)
next action : self-merge path/cp-providers into master
blockers    : none
```

# Blockers

None recorded.
