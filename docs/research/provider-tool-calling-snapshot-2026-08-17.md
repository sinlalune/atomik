---
type: Atomik Research Snapshot
title: Provider tool-calling dialects — observed shapes, dated 2026-08-17
description: What each provider's tool-call wire actually looks like, probed live where a key was available. Feeds CP-MVP-011's provider work and the adapter layering the owner asked for on 2026-08-17.
tags: [research, providers, tool-use, gemini, openai, anthropic, openrouter, dated]
timestamp: 2026-08-17T00:00:00Z
---

# Provider tool-calling — dated snapshot (2026-08-17)

Facts below are either (a) observed against the live endpoint on this date, or
(b) read from official documentation on this date. Anything not marked
OBSERVED has not been proven in this repository yet.

## The dialect map

```text
openai-chat-completions   Mistral · Google · OpenAI · OpenRouter · DeepSeek
anthropic-messages        Anthropic
```

Google belongs to the first group because `google-generation-adapter.ts`
targets Gemini's OpenAI-compatibility endpoint
(`generativelanguage.googleapis.com/v1beta/openai/chat/completions`), not the
native `generateContent` API. Google's documentation states the compatibility
layer accepts the standard OpenAI `tools` schema, and notes the shim "is still
in beta while we extend feature support"; it does not document the tool-call
RESPONSE shape, which is why the probe below was run instead of assumed.

## OBSERVED — Gemini `gemini-3.7-flash`, two-turn round trip

One probe, owner's key, 2026-08-17. Request carried a single `search_wiki`
function in OpenAI schema; the continuation echoed the assistant turn and one
`role: "tool"` message.

```text
turn 1  finish_reason : "tool_calls"
        message keys  : role, tool_calls        <- NO `content` key at all
        tool_calls[0] : { id: "call_4103380", type: "function",
                          function: { name, arguments: "<JSON string>" },
                          extra_content: { google: { thought_signature: "…" } } }
        parallel      : 1 call returned
turn 2  role:"tool" + tool_call_id accepted; finish_reason "stop"; prose returned
        usage         : { prompt_tokens: 277, completion_tokens: 229,
                          total_tokens: 614 }
```

Three findings that change implementation:

1. **The envelope matches S06's codec.** `id` / `type` / `function.name` /
   `function.arguments`-as-JSON-string, `finish_reason: "tool_calls"`, and
   `role: "tool"` + `tool_call_id` continuation are exactly what the Mistral
   codec already parses and emits. The dialect claim is now proven, not assumed.
2. **`message.content` is absent, not empty.** Code that reads content on a
   tool-call turn must treat the key as optional; a `?? ''` guard is required
   and an "empty completion" rejection must not fire on a tool turn.
3. **Google attaches `extra_content.google.thought_signature` to the tool
   call.** This is an opaque provider field carrying reasoning continuity. The
   probe round-tripped it because it echoed the assistant message VERBATIM.
   S06's Mistral wire RECONSTRUCTS the assistant turn from normalized fields
   (`{id, type, function:{name, arguments}}`), which would silently drop it.
   **Design rule for the shared codec: preserve the provider's assistant
   message verbatim for continuation; never rebuild it from normalized
   fields.** Normalization is for Atomik's authority layer, not for the wire.

Cost note: `total_tokens` (614) exceeds `prompt + completion` (506). The
~108-token remainder is unbilled-as-completion thinking. Any cost estimate that
computes from prompt+completion will UNDERSTATE Gemini spend; use
`total_tokens` where the provider reports it.

## Documentation-only, not yet observed

- **OpenAI "luna"** — the owner's named target resolves to **GPT-5.6 Luna**,
  API id `gpt-5.6-luna`: OpenAI's fast/low-cost tier, generally available
  2026-07-09, repriced 2026-07-30 to $0.20 per 1M input and $1.20 per 1M
  output, ~1.05M context, 128K max output, knowledge cutoff 2026-02-16. A
  `gpt-5.6-luna-pro` tier also exists. Pricing must be re-checked and pinned
  into a price snapshot before it reaches a cost estimate.
- **Anthropic** — the second codec. `tool_use` / `tool_result` content blocks
  rather than `tool_calls` / `role:"tool"` messages. The owner's target is
  `claude-fable-5`, which additionally has thinking always on (the `thinking`
  parameter must be omitted; an explicit disable is rejected) and refuses
  assistant prefill. Both constrain how that adapter builds a turn.
- **OpenRouter** — same OpenAI envelope, but the owner's stated purpose is
  BENCHMARKING other providers and open models before implementing them
  natively, which makes it a measurement seat rather than a daily driver.

## Method

The probe script is disposable and was not committed: it read the key from the
gitignored `.env.local`, printed structure only, and never echoed the secret.
No live response became a canonical file — fixtures are minimal hand-reduced
records, per the same rule the Wikimedia snapshot follows.
