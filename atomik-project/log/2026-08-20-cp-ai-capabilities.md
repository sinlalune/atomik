---
type: Atomik Journal Entry
title: CP-AI-CAPABILITIES — telling the only writer in the system what it writes into
timestamp: 2026-08-20T00:00:00Z
atomik:
  path: CP-AI-CAPABILITIES
  step: S03
---

# CP-AI-CAPABILITIES — telling the only writer in the system what it writes into

CP-RICH-MARKDOWN built a rich reading surface. Nothing had ever told the model
it existed: a grep of the entire prompt surface for `mermaid`, `vega`, `katex`,
`math`, `diagram`, `chart` and `[[` returned nothing, while chat, inline AI and
the AI note preview all already hydrated through the same registry. The
capability was half-built, and the missing half was prompt text.

## What landed

Two ordinary plan blocks — no new prompt mechanism. `rendering-capabilities`
in BOTH default plans; `note-conventions` in the note plan only, because
authoring a typed edge is a note-authoring act and a chat answer must not
assert an edge into the graph from a conversation that is not a note. Both are
overridable, both appear by name in the system-plan UI, both are verbatim in
the sent-request inspector.

Chat also gained POINTING: a plain `[[wikilink]]` in an answer now resolves
through the vault's own pipeline and opens the note. Pointing is not citing —
the owner ruled against the pill treatment for citation at CP-MVP-010 round 6,
and citation keeps its numbered marker while pointing is an ordinary link pill.
Click routing runs citation first so the two can never collide.

## What the bench changed

The bench asked the only question the drift tests cannot: does the model
actually USE any of it? It does. Mermaid for structure, Vega-Lite with inline
`data.values` for data, display math for a derivation, prose where prose was
right — every choice correct on the first run.

**What broke was the render, not the prompt**, and finding that out was worth
more than the confirmation. Five defects, only one of which the prompt could
answer for:

```text
bar mark on a log scale -> zero-height bars      upstream Vega-Lite
$$…$$ in a Mermaid label -> whole diagram refused upstream + our SVG guard
multi-line $$ needs $$ alone on its own line      OUR parser
the Vega adapter swallows Vega's own warning      ours, unfixed
a large diagram cannot be explored                ours, unfixed
chatSlug does not strip <!--…-->                  ours, unfixed
```

The first three are now warned about in the block, and each warning is pinned
to the code that CAUSES it — `discoverDollarMath`, `safeSvgNode`, Vega-Lite's
own compiler. The pin direction is the point: **when a trap is fixed, its test
fails and the warning must be deleted.** A prompt that keeps describing a
repaired defect burns tokens on every request to teach the model something
untrue. Drift runs in both directions, and only one of them was guarded before.

Round 2 confirmed the warning took: every display block in the next generation
put `$$` alone on its own line.

## What it costs, stated rather than assumed

`rendering-capabilities` is 1,572 chars (~393 tokens) on EVERY request;
`note-conventions` adds ~118 more to note generation. Roughly double the
previous system message. The ceiling asserted in the tests was raised
1,400 -> 1,700 deliberately, because the test comment demands that be a
conversation rather than a quiet bump. Both blocks can be cut from the
system-plan UI with no code change.

Generation defaults followed the blocks: the output budget moved 2000 -> 5000
in main and the renderer and is now pinned EQUAL by a test — one budget seen
from two sides, whose drift would only ever surface as an unclosed `$$` in
front of a reader. The default engine leads with `google`/`gemini-3.7-flash`.

## What is left

Four defects leave unfixed and deliberately so — every one is a renderer or
plumbing repair, and this path excluded new renderers, fences and relaxed
limits from the start. They go to a follow-on labelled path whose opening
check decides how they group.

The path that repairs the `$$` parser inherits an obligation from the coherence
audit: its first failing test will be this path's drift pin, and the correct
response is to delete the warning, not to loosen the assertion.
