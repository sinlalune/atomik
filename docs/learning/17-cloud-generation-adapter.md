---
type: Atomik Learning Note
title: 'Learning: the first real generation adapter — cloud LLM behind a seam'
description: Beginner-first walkthrough of CP-MVP-008 S02 — how a typed adapter seam, an error taxonomy, labeled usage, and a dated price snapshot turn "call an LLM API" into an honest, testable engine swap.
tags: [learning]
timestamp: 2026-07-21T00:00:00Z
---

# Learning: the first real generation adapter — cloud LLM behind a seam

*Covers CP-MVP-008 S02 (2026-07-21). Written the same day — the
first-use rule (17): real provider generation is a first mobilization.*

## Who this is for and what you can do afterwards

You have called an HTTP API before but never wired an LLM into an app
that must stay honest about cost, provenance, and failure. Afterwards
you can add a second provider in one file, explain why the mock is
still an engine and not dead code, and read a trace line and say
exactly what a request cost and how we know.

## The technologies involved, from zero

**Chat completions.** Every major LLM provider exposes roughly the
same POST endpoint: a JSON body with a `model` id and a `messages`
array (`system` sets behavior, `user` carries the task), returning
`choices[0].message.content` plus a `usage` object of token counts.
`mistral-generation-adapter.ts` maps our `AiOperation` (instruction +
selections + destination) onto exactly that, and the response back
onto the SAME `AiResponseBundle` the mock produced. That sameness is
the whole trick: `buildMessages` and the response mapping are pure
functions, so fixtures test them without any network.

**The adapter seam.** `generation.ts` defines
`GenerationAdapter { id, generate(operation, {signal, provenance}) }`.
The mock (S08) sits behind it unchanged; Mistral is the second
implementation; a local llama.cpp seat later is the third. The
renderer never learns which engine answered from the channel — the
identity travels IN the result (`providerMeta`), the same pattern the
transcription seats proved. That is why swapping engines changed
nothing renderer-side: the ai-mock header made that promise in S08 and
S02 held it.

**AbortController, twice.** One controller belongs to the caller (the
renderer's cancel button → `cancelAiOperation` → main aborts); one
timer belongs to the adapter (the 60 s wall budget). Both feed the
same fetch signal, and a flag remembers which one fired — that is the
entire difference between `ai(timeout)` and `ai(cancelled)`, and users
deserve to know which one happened.

**The error taxonomy.** A raw `fetch` failure is a grab bag: DNS down,
bad key, quota, provider bug, our bug. The adapter sorts them into
eight typed kinds (offline, timeout, auth, rate-limit,
provider-request, provider-server, cancelled, budget-exceeded) carried
as `ai(<kind>): …` in the message so the kind survives Electron's IPC
error flattening. The rule under the taxonomy comes from bedrock 13:
a failed cloud call SURFACES; it never silently falls back to the
mock. Fallback is a policy decision the owner makes in settings, not
a `catch` block's mood.

**Labeled usage and the dated price snapshot.** The provider reports
token counts; we prefer them and label them `provider-reported`.
When absent we estimate (chars/4) and label THAT. Cost is always
`basis: 'estimated'`, computed from a snapshot pinned by id
(`docs/research/model-research.md@2026-07-20`, upper bound of the
range — estimates must not flatter) so a future price change can
never silently rewrite history. The trace line keeps both token pairs;
the renderer badge shows the best-known one.

**Mechanical truth over real output.** The mock hand-crafted its claim
candidates; real output gets a deterministic sentence splitter
(`extractClaimCandidates`: fences dropped, short fragments dropped,
capped). The checker in `truth.ts` is UNCHANGED: exact containment in
a selection is still the only road to `source-backed`, so the system
prompt asks the model to quote exactly — a model that paraphrases
simply earns `model-only`, which is the honest label for a paraphrase.
The model never grades itself; we just changed who writes the prose.

**The model id is a pinned string.** `mistral-small-2603`, confirmed
against the provider's model list on 2026-07-21, a constant in code —
never a `-latest` alias. An alias drifts silently; a pinned id makes
an upgrade a visible, dated decision (the OCR and Voxtral seats set
the precedent).

## Decisions worth remembering

- Engine choice is EXPLICIT state (`ai-settings.json` beside the key)
  with one resolution rule: explicit choice first, else 'mistral' when
  a key exists, else 'mock'. The default is only PROPOSED until the
  owner confirms it at the S07 bench.
- Budgets live in main below renderer state: 2 k output tokens, 60 s
  wall, an input pre-check before any bytes travel. The renderer
  cannot loosen what it cannot reach.
- No live API call in the test suite. Fixtures prove mapping and
  taxonomy; the env-gated `ATOMIK_SMOKE_AI_LIVE=1` rung proves the
  real chain (engine switch → real completion → cloud trace →
  mid-flight cancel) and honestly reports `skip:no-key` otherwise.
