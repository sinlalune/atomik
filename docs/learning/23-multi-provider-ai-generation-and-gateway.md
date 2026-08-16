---
type: Atomik Learning Note
title: 'Learning: multi-provider AI generation & gateway — OpenRouter, direct adapters, and secure settings'
description: Beginner-first walkthrough of CP-PROVIDERS — provider-neutral GenerationAdapter core, OpenRouter gateway with ZDR, direct adapters (OpenAI, Anthropic, DeepSeek, Google Gemini, Mistral), main-only 0600 key storage, and full ActionTrace observability.
tags: [learning, ai, providers, openrouter, openai, anthropic, deepseek, google, gemini, mistral, security, traces]
timestamp: 2026-08-16T00:00:00Z
---

# Learning: multi-provider AI generation & gateway — OpenRouter, direct adapters, and secure settings

*Covers CP-PROVIDERS (2026-08-16). Written per the first-use rule (17): multi-provider expansion and gateway integration is a first architectural mobilization.*

## Who this is for and what you can do afterwards

You understand single-provider LLM calling but want to architect a truly provider-neutral desktop workbench. Afterwards you can:
- Explain why a hybrid architecture (OpenRouter gateway + direct first-party adapters) balances model exploration with privacy and native feature fidelity.
- Build clean, zero-dependency `fetch`-based adapters for OpenAI, Anthropic Messages API, DeepSeek, and Google Gemini without importing heavy SDK packages.
- Enforce strict Zero Data Retention (ZDR) and disable lossy compression or silent model substitution in gateway routes.
- Store sensitive multi-provider API keys exclusively in main-process storage (mode 0600) with masked hints over IPC.
- Calculate exact token costs against dated pricing snapshots in telemetry without ever recording user prompts or notes.

## The technologies involved, from zero

**Gateway vs Direct Provider.** OpenRouter acts as an intelligent router that accepts an OpenAI-compatible request and routes it across 400+ upstream model endpoints through one unified billing credit. Direct providers (OpenAI, Anthropic, DeepSeek, Google, Mistral) talk directly to first-party APIs. Atomik adopts a **Hybrid** stance: OpenRouter enables fast evaluation and broad model bake-offs, while direct adapters guarantee exact data residency, provider terms, and full contract fidelity.

**Zero Data Retention (ZDR) & Parameter Enforcement.** By default, gateways may attempt fallbacks or context compression. Atomik enforces strict parameters:
```json
{
  "require_parameters": true,
  "allow_fallbacks": false,
  "data_collection": "deny",
  "zdr": true,
  "transforms": [],
  "usage": { "include": { "router": true } }
}
```
This guarantees that the prompt is not logged upstream, no silent fallback substitutes another model, and no lossy middle-message compression alters the payload.

**Anthropic Messages API vs OpenAI Chat Completions.** OpenAI, DeepSeek, Google, and Mistral use the standard `{ messages: [{ role, content }] }` format where system guidance is a message with role `"system"`. Anthropic Messages API separates system guidance into a top-level parameter `{ system: string, messages: [{ role: "user" | "assistant", content: string }] }` and returns `{ content: [{ type: "text", text: string }] }`. Our adapter normalizes both into the identical `AiResponseBundle`.

**Main-Side 0600 Key Storage.** In Electron, the renderer process is untrusted web content. API keys are saved directly to disk in the user data directory as `ai-settings.json` with Unix file mode `0600` (read/write only by the current OS user). Over IPC, the renderer receives only a boolean `present` and a masked hint (`sk-••••1234` or `AIza••••5678`). The raw secret never enters the renderer DOM, console, or vault files.

## The architecture concepts mobilized (named)

- **Provider-Neutral Adapter Seam (14 §ai-core):** Every engine implements `GenerationAdapter { id, generate(operation, context) }` returning a pure `GenerationResult`.
- **Mechanical Truth Labeling (06/28):** Real model outputs are split into claim candidates and labeled deterministically via exact containment against user selections.
- **Explicit Error Taxonomy (13):** Failures are mapped to 8 typed kinds (`offline`, `timeout`, `auth`, `rate-limit`, `provider-request`, `provider-server`, `cancelled`, `budget-exceeded`) with zero silent fallback to mock.
- **Content-Free Telemetry (33):** ActionTraces record execution location, model, provider-reported tokens, and dated price snapshot USD estimates, while strictly guaranteeing `contentRecorded: false`.

## Walkthrough of the real code

1. **`shared/generation-params.ts`**: Defines the `PROVIDER_CATALOG` containing model descriptors, context windows, and dated pricing rates per million tokens.
2. **`electron-main/openrouter-generation-adapter.ts`**: Implements the OpenRouter gateway adapter with privacy headers and flags.
3. **`electron-main/openai-generation-adapter.ts`**: Direct OpenAI chat completions adapter for GPT-4o and o3 models.
4. **`electron-main/anthropic-generation-adapter.ts`**: Direct Anthropic Messages API adapter for Claude 3.5 Haiku, Sonnet, and Opus.
5. **`electron-main/deepseek-generation-adapter.ts`**: Direct DeepSeek adapter for DeepSeek-V3 and DeepSeek-R1.
6. **`electron-main/google-generation-adapter.ts`**: Direct Google Gemini adapter for Gemini 2.0 Flash and 1.5 Pro.
7. **`electron-main/ai-settings.ts`**: Manages multi-provider keys in `ai-settings.json`, engine resolution, and model selection.
8. **`renderer/src/settings/SettingsModal.tsx`**: Clean, accessible Settings dialog in the desktop renderer for configuring providers, keys, and active models.

## Lessons learned the hard way

- **Never import bulky SDKs:** Standard provider SDKs add megabytes of dependencies and complex client abstractions. Writing small, pure `fetch` clients with native `AbortController` gives complete control, predictable error handling, and zero dependency overhead (bedrock 15).
- **Masking must preserve provider prefixes:** Simple string slicing can obscure whether a key is an OpenRouter key (`sk-or-`), an Anthropic key (`sk-ant-`), or a Google key (`AIza`). Provider-aware masking preserves the prefix while masking the secret body.

## Try it yourself (exercises)

1. Open the app and click the `☰` menu, then click **Configure AI Providers & Keys…**.
2. Switch between different generation engines and notice the active badge update.
3. Add a test key for your provider of choice and verify that only the masked hint is displayed.

## Vocabulary you now own

- **GenerationAdapter:** The pure-compute interface isolating model providers from editor buffers and vault files.
- **Zero Data Retention (ZDR):** Provider policy guaranteeing prompts and outputs are discarded immediately after generation.
- **Masked Hint:** A safe partial representation of a secret (`sk-••••1234`) enabling human recognition without leaking the key.
- **Provider-Reported Usage:** Authoritative token counts returned by the upstream model API, preferred over heuristic estimations.

## What arrives next

The provider boundary is now completely neutral. Next milestones can leverage these adapters for claim verification in Truth Lens (M6), web grounding (M7), and semantic graph retrieval (M8).
