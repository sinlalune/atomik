---
type: Atomik Session Record
title: CP-PROVIDERS opening check — hybrid provider architecture and full multi-provider settings panel confirmed
timestamp: 2026-08-16T00:00:00Z
---

# CP-PROVIDERS opening check (2026-08-16)

Run per `docs/bedrock/22_22-agent-handoff.md` §Between paths and
`atomik-project/coding-paths/paths.md` §Opening a path. Labelled path
`CP-PROVIDERS` (provider expansion + settings menu), which was merged by
the overlap audit during CP-OPS-001 S04e because `ai-settings.ts`,
`ipc-contract.ts` and `AppMenu.tsx` share the same settings panel.

Input: `docs/research/openrouter-vs-direct-providers.md` (investigation record).
One prompted confirmation per major feature; owner answers recorded verbatim.

## Confirmations (owner, verbatim options chosen)

1. **Provider Architecture** → **"Hybrid (OpenRouter + Direct)"** —
   Provider-neutral `GenerationAdapter` core with OpenRouter gateway + direct
   Mistral, OpenAI, Anthropic, and DeepSeek adapters with a curated model
   allowlist and dated pricing snapshot.
2. **Settings UI Scope** → **"Full Multi-Provider Settings Panel"** —
   Dedicated multi-provider settings dialog/panel accessible from `AppMenu`
   to configure API keys (main-process 0600 storage), active provider, and
   per-provider model selection.
3. **Security & Credential Seam** → Main-process only storage (`ai-settings.json`
   mode 0600, `electron-main/ai-settings.ts`), masked hints over IPC (`sk-••••1234`),
   raw keys never enter the renderer (bedrock 13).
4. **Routing & Privacy Policy** → Pinned models, `allow_fallbacks: false`,
   `data_collection: deny`, `zdr: true`, no silent fallback to mock or other
   providers on failure (explicit 8-kind `GenerationError` taxonomy).
5. **Observability** → ActionTrace per generation with provider, model,
   provider-reported usage, dated price snapshot external cost, and
   `contentRecorded: false`.

## State

Opening check recorded. The coding path `atomik-project/coding-paths/CP-PROVIDERS.md`
is drafted and ready for activation on its dedicated worktree branch
`path/cp-providers`.
