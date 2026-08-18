---
type: Atomik Session Record
title: CP-AI-CAPABILITIES opening check — the model has never been told what it writes into
timestamp: 2026-08-19T00:00:00Z
tags: [opening-check, ai, prompt, capabilities, wikilink]
path: CP-AI-CAPABILITIES
branch: path/cp-ai-capabilities
---

# CP-AI-CAPABILITIES opening check

Walked with the owner 2026-08-19, feature by feature, before the base commit
pinned. Activation accepted.

## How the path was found

The owner asked whether the chat/agent benefits from the rich Markdown work —
both rendering it and GENERATING it, with "minimum is to know we render those
dsl/lib/etc.. so it can use it", and the same for direct note AI generation.

Checked rather than assumed, and the answer split cleanly in two:

```text
RENDERING   already done, everywhere
            ChatView.tsx:224       hydrateRichMarkdown(container)
            inline-ai.ts:226       hydrateRichMarkdown(rendered)
            AiNotePreview.tsx:116  <RichMarkdownBody …>

KNOWING     nothing. A grep of the whole prompt surface for mermaid, vega,
            katex, math, diagram, chart and `[[` returns ZERO matches.
```

So a model that emitted a `mermaid` fence today would have it rendered — and no
model has ever been told to. The capability is half-built, and the missing half
is prompt text, not an engine.

One thing was already correct and needs nothing: `GROUNDING_RULES` already
instructs exact character-for-character quoting, which is what feeds claim
highlighting. The truth half of this question was solved.

## Features accepted

**1. `rendering-capabilities` block — both plans.** What renders (math,
diagrams, charts, code), when to reach for each (structure → diagram, data →
chart, notation → math, never decoration), and what is REFUSED. The refusal
half matters as much: a model that does not know Vega takes inline data only
writes a `url` dataset and the reader gets a visible error.

**2. `note-conventions` block — note generation only.** The ADR-011 typed-edge
grammar (`[[target]]{label}`, reversed `{^label}`), no invented frontmatter,
markdown is the artifact. Accepted as note-only for a reason worth recording: a
chat answer emitting `[[Attention]]{depends-on}` would assert a typed edge into
the graph from a conversation that is not a note. Authoring an edge is a
note-authoring act.

**3. Chat wikilinks for POINTING — accepted; not for citation.** The owner
asked whether chat should cite retrieved notes as wikilinks. It must not:
`shared/chat-citations.ts` records the owner's own bench-round-6 ruling — *"the
idea that you should use md citation format for it is a bad assumption"*, and
*"a citation is not a link that happens to be short — borrowing the link pill
made it read as neither"*. Wikilinks render as exactly that pill.

The owner clarified the intent: *"yes it is for pointing obviously, I need
it."* Pointing — "go read that note" — genuinely has no mechanism today, and is
a different act from citation. Accepted as its own affordance, with citation
untouched.

Verified before accepting, because promising the model something broken would
be worse than silence: chat's click handler currently routes only
`a[data-citation]`, and a wikilink renders as `<a href="#" data-wiki="…">`. So
a pointing wikilink in chat is INERT today. S02 exists because of that check.

**4. Pinned to the code, not to prose.** Carried forward from the
CP-RICH-MARKDOWN coherence audit: the renderer limits will now exist in a THIRD
place, inside a prompt a model reads and believes. A wrong number there does
not fail a build — it quietly teaches the model to write blocks the app
refuses. Drift tests against `richKindForFence` and `DEFAULT_RICH_LIMITS` are
required, not optional.

## Deliberately excluded

The Atomik DSL/Scene IR stays out — reserved architecture, not a fenced
renderer (19, ADR-010). No new renderer, fence identifier or relaxed limit. The
citation mechanism is not rewritten. An unresolved pointing wikilink never
auto-creates a note. Prompt wording tuned for output quality is a bench, never
a gate.

## Cost, stated up front

These blocks ride on EVERY request. Their size is measured and recorded in S01
rather than assumed, and both are ordinary overridable blocks, so the owner can
cut them without a code change.
