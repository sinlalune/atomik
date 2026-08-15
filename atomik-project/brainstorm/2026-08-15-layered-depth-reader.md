---
type: Atomik Brainstorm Note
title: Brainstorm — the layered depth reader: guided pedagogy as a reading surface
timestamp: 2026-08-15T00:00:00Z
status: provisional
---

# 2026-08-15 — the layered depth reader

Provisional. Nothing here is a decision. The idea surfaced while building
Cairn's day-to-day guide (`docs/cairn/workflow.html`), which the owner asked to
be built as a working prototype of something they want in Atomik itself:

> "a depth layered explanation, where at first it will surface the core ideas
> explained simply and hover and clicking parts of this text will deploy another
> deeper layer of explanation and the number of layers will depend on the
> complexity of the subject"

and, after the first attempt:

> "would have prefered colored highlighted inline that transform into colored
> highlighted blocks and that every part of it is expandable what it means =>
> it forces you to encapture the sense of the whole and then reduce each part to
> an coherent synthesis more than just expend subject for fun, the goal in
> modern guided pedagogy"

Owner verdict on the current state (2026-08-15): **"the guide is good but the
dynamic depth exploring needs a little work"** — resuming later.

## The finding worth keeping, whatever the UI becomes

The first prototype expanded phrases into *more detail*. The owner's correction
turned it into something else, and the difference is a writing rule, not an
interface:

```text
DETAIL LAYERING        each level continues the last
                       -> you must read all levels to have an answer
                       -> collapsing leaves you with half a thought

SYNTHESIS LAYERING     each level is COMPLETE at its own grain
                       -> you may stop anywhere and be correct
                       -> opening a part yields another whole, one grain finer
```

This is the durable idea. It survived into the rebuild as an enforced
convention: every expandable block opens with a single serif sentence that is
true and sufficient on its own, and only then decomposes. Writing to it made
three sections SHORTER, which is a good sign — continuation-style prose hides
padding that synthesis-style prose cannot.

Second finding: **colour should encode who acts, not how deep you are.** Depth
is already carried by nesting and indentation; spending colour on it wastes the
only channel that could teach the reader the taxonomy. In the rebuild, ochre =
human, violet = agent, teal = automated, neutral = artifact — and by the third
section a reader has absorbed the role model without being taught it.

## What exists now (prototype)

`docs/cairn/workflow.html`, published as an artifact. Mechanics:

- inline highlight (tinted background + coloured underline) expands into a block
  of the same hue; the chip stays highlighted so the origin stays visible
- blocks nest; nested blocks sit on the surface colour so depth stays readable
- closing a parent closes its children, so reopening never reveals a
  half-remembered state
- a global control — `Synthesis · + parts · Everything` — rather than depth
  numbers, because level 0 is a complete reading rather than a teaser
- real `<button>` semantics with `aria-expanded`; keyboard reachable

## What needs work before this is an Atomik surface

Recorded as the agent's own assessment; the owner's specific critique is still
pending and takes precedence when it lands.

1. **No preview of depth.** A reader cannot see that a phrase hides two more
   levels versus none. Some affordance — a dot count, a weight difference —
   would let them budget attention before clicking. This is probably the
   biggest gap.
2. **Reading position jumps.** Opening a block above the viewport anchor pushes
   the text down. Needs scroll anchoring, or expansion in place with the
   surrounding text held still.
3. **No deep links.** A reader cannot share "this idea, at this level". URL
   fragments encoding the open set would make layered documents citable — which
   matters a lot for a knowledge tool.
4. **No trace of what you have opened.** For guided pedagogy specifically, the
   reader should see their own coverage: which parts they have unfolded, which
   they skipped. That is a learning signal, not decoration.
5. **The global control is too blunt.** Per-section control ("expand this
   argument fully, leave the rest") matches how people actually study.
6. **Nested blocks lose their parent** once the chip scrolls out of view. A
   breadcrumb inside deep blocks, or a sticky parent line.
7. **Screen readers are not told what appeared.** `aria-controls` plus a live
   region, or move focus into the opened block.
8. **Mobile pushes hard.** Long blocks displace a lot of content on a small
   screen; a sheet or side panel may beat inline expansion below some width.

## Where this could land in Atomik (not decided)

- **Note rendering.** A note whose sections carry synthesis lines could be read
  at any grain — the same note serving as a summary and as the full text, with
  no second document to maintain.
- **The studio.** Recorded there already as a live-inline block backed by its
  own file; a layered reader is a natural sibling projection.
- **Generated explanations.** An agent asked to explain a subject could be
  required to emit synthesis layers rather than prose, which is a much stronger
  constraint on output quality than "be concise".
- **The graph.** A node's expansion in the relations strip is the same gesture
  at a different grain.

Nothing above is scoped, sequenced, or costed. It is a pointer for whichever
path opening decides to read it.

## Related

- Prototype: `../../docs/cairn/workflow.html` (and the earlier, superseded
  detail-layering attempt in the same file's history)
- The path that produced it: `../coding-paths/CP-OPS-001.md` S04f
- Sibling idea already recorded: `2026-08-04-brainstorm-studio.md`
