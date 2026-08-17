---
type: Atomik Session Record
title: CP-MVP-011 mid-path vision check — wiki tool mirrors the vault tool, and the provider order is set
timestamp: 2026-08-17T00:00:00Z
---

# CP-MVP-011 mid-path vision check (2026-08-17)

Run mid-path, between S06 and S07, at the owner's request. The owner reported
two things: no bench had been run since the path opened, and they did not feel
consulted on the framing of the feature.

## What the record showed

- The framing WAS ruled, but on 2026-08-16, inside CP-MVP-010's opening check
  (`2026-08-16-cp-mvp-010-opening-check.md`, twelve rulings — answer 7 is the
  owner's own free text and is what created this scope). CP-MVP-011's own
  opening check was deliberately short and collapsed to one confirmation,
  verbatim: *"You right"*. The gap the owner named is real: the check that
  should have walked the features about to be built did not happen.
- No bench exists for this path because **the feature is dark**: S01–S06 are
  main-process only, no renderer code sets `operation.tools`, and the loop
  therefore returns straight to the ordinary generation path. The first
  owner-visible behaviour arrives at S07. Verified in the working tree, not
  assumed.
- ADR-015 was written and accepted by the agent at S01 without the owner
  reading it, and it pins product-visible choices (two verbs only, parallel
  calls disabled, fail-closed adapter capability, budgets as constants).
  Flagged for the owner to read; no change requested yet.

## The owner's vision — verbatim

> "the same as vault tool, possibility to enable it, with options of sources
> and element as fine tune (like the reach) and a great citation surface and
> layout with the media and elements. That will be great. all provider will be
> needed to injected in the harness in the end, first I will go with Google as
> they have a decent offer in term of low cost modelsn, then open AI (specially
> luna) and anthropic for fable and OpenRouter for benchmarking other provider
> or openmodel before implementing them, if you need clearer vision we can
> discuss"

## Rulings

```text
CONTROL     the wiki tool mirrors the vault tool's shape: a per-thread ENABLE
            toggle, plus fine-tune options. Owner selected "reach + per-source
            toggles": one depth control named like the vault's `reach`, AND
            four switches (Wikipedia · Wikidata · Commons image · Wiktionary
            etymology). Not reach alone; not switches alone.
CITATION    "a great citation surface and layout with the media and elements"
            — presentation is a first-class deliverable of this path, not a
            trailing detail of S07.
PROVIDERS   every provider is wanted in the harness eventually. ORDER:
            Google (low-cost models) → OpenAI (a model the owner named
            "luna"; exact id to be confirmed before implementation) →
            Anthropic (for `claude-fable-5`) → OpenRouter, whose role is
            explicitly BENCHMARKING other providers and open models before
            deciding to implement them natively.
MISTRAL     S06's native opt-in was not a bet on Mistral as the owner's
            provider. It is the first codec of a shared dialect (below).
```

## The finding that makes the provider order cheap

The tool contract has exactly two dialects, and the repository's existing
adapters already sort themselves across them:

```text
openai-chat-completions   Mistral · Google · OpenAI · OpenRouter · DeepSeek
anthropic-messages        Anthropic
```

Google is included because `google-generation-adapter.ts` does not call
Gemini's native API — it calls Gemini's OpenAI-compatible endpoint
(`generativelanguage.googleapis.com/v1beta/openai/chat/completions`). S06's
codec was verified to be generic to that wire shape: the call normalizer
handles `tool_calls` envelopes with nothing Mistral-specific in it; only the
URL, auth, model list and pricing belong to Mistral.

Consequence for the plan: four of the owner's five priorities need a shared
codec extraction plus per-adapter plumbing and one recorded fixture each.
Anthropic is the only genuine second codec (`tool_use` / `tool_result` content
blocks), and `claude-fable-5` carries its own constraints — thinking is always
on and assistant prefill is rejected — which that adapter must respect.

## Consequences for the path

- S07 builds the control surface to the ruled shape (toggle + reach + four
  source switches) and treats the citation/media layout as a named deliverable.
- A provider step is added for the shared `openai-chat-completions` tool codec
  and Google, ahead of the remaining providers. Its position relative to S07
  was left open at the end of this session.
- The bench moves earlier than S09: it is scheduled for as soon as a surface
  exists to bench, on the owner's own provider.

## Open at the end of this session

- Sequencing of the provider step versus S07 — the owner asked what was at
  stake rather than choosing; it hinges on whether they can bench on Mistral
  in the interim.
- The exact OpenAI model id behind "luna".
- Whether ADR-015's pins survive the owner's reading of it.
