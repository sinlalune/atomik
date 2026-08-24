---
type: Atomik ADR
title: 'ADR-015: The model is told what the surface it writes into can do'
description: Rendering capabilities and note conventions are stated to the model as ordinary composable plan blocks, including the refusals, so it writes inside the limits the surface actually has.
tags: [adr, ai, prompts, capabilities, rendering, system-plan]
timestamp: 2026-08-19T00:00:00Z
adr:
  id: ADR-015
  status: accepted
  date: 2026-08-19
---

# ADR-015: The model is told what the surface it writes into can do

Status: accepted
Date: 2026-08-19

## Context

CP-RICH-MARKDOWN shipped a rich reading surface: KaTeX math, secure Mermaid,
inline-data Vega-Lite, broadly highlighted code, all hydrated by one registry.
Chat, inline AI and the AI note preview mount that registry, so anything the
model emits already renders.

The model was never told. A grep of the entire prompt surface
(`shared/prompt-composition.ts`, `editor/prompts.ts`, `editor/system-plan.ts`)
for `mermaid`, `vega`, `katex`, `math`, `diagram`, `chart` and `[[` returned
nothing. The renderers existed and the only writer in the system had no idea.
The same was true of ADR-011's typed-edge grammar.

This is the mirror of the defect class CP-RICH-MARKDOWN's bench found: there,
code duplicated what already existed; here, capability existed with nothing
pointing at it. Both are gaps between two halves that never met.

## Decision

### 1. Capability is stated in ordinary plan blocks, not a new mechanism

`rendering-capabilities` and `note-conventions` are entries in
`BUILTIN_BLOCK_IDS` like any other. They compose through the system plan, are
individually overridable, appear by name in the system-plan UI, and show
verbatim in the sent-request inspector. Nothing about how prompts are built
changed — the owner can reorder or delete them without touching code.

### 2. What renders, and what is refused

The capability half is obvious; the refusal half is the one that earns its
tokens. A model that does not know Vega-Lite accepts inline data only writes a
`url` dataset, and the reader gets a visible refusal instead of a chart. Being
told the limits is what keeps the model inside them, so the block states the
real caps and the real rejections beside the affordances.

### 3. Typed edges are a NOTE act; chat may only point

`note-conventions` carries the ADR-011 grammar (`[[target]]{label}`, reverse
`{^label}`) and is in the note plan only. A chat answer emitting
`[[Attention]]{depends-on}` would assert a typed edge into the graph from a
conversation that is not a note.

Chat may still POINT at a note with a plain `[[wikilink]]` — "go read that
one". Pointing is NOT citing, and citing is already solved: chat gives the
model a numbered source list and decorates `[1]` markers into citation chips.
The owner ruled on that form at the CP-MVP-010 bench — *"a citation is not a
link that happens to be short — borrowing the link pill made it read as
neither"* — and a wikilink renders as exactly that pill. So the two stay
visibly distinct affordances: numbered chip for citation, link pill for
pointing.

### 4. The text is pinned to the code, because prose cannot be trusted here

The renderer limits now live in three places: `DEFAULT_RICH_LIMITS`, ADR-014
§6, and a prompt block a model reads and believes. The third is the dangerous
one — a wrong number fails no build, it just teaches the model to write blocks
the app refuses. `tests/prompt-composition.test.ts` pins every fence identifier
against `richKindForFence` and every limit against `DEFAULT_RICH_LIMITS`, and
was validated by changing a number and watching it fail.

The block ALSO carries a size ceiling as a test. These blocks ride on every
request; measured cost is +262 tokens per chat send and +380 per note
generation, roughly doubling the system message. That is a decision, not a
measurement to quietly raise later.

### 5. What the model is NOT told

The Atomik DSL / Scene IR is reserved architecture, not a fenced renderer (19,
ADR-010); teaching the model to emit it would invite exactly the conflation
ADR-014 §1 forbids. No new renderer, fence identifier or relaxed limit enters
through a prompt. Wording tuned for output quality is a bench, never a gate:
whether the model produces a GOOD diagram cannot be gated by CI, only whether
what it was told is true.

## Consequences

The renderers become usable by the writer that was already pointed at them.
Every request costs a little more, visibly and adjustably. The blocks must be
maintained with the renderers — which the drift tests now force, rather than
hope for.

The open risk is quality, not correctness: a model told it can draw diagrams
may draw them where prose was better. The block says so in words ("never as
decoration"), and only a bench can tell whether that holds.

## Links

- ADR-014 — the renderer contract these blocks describe
- ADR-011 — the typed-edge grammar `note-conventions` carries
- ADR-010 / bedrock 19 — why the Atomik DSL stays out of it
- bedrock 28 — citation stays citation; pointing is a different act
