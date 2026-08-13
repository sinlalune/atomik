---
type: Atomik Learning Note
title: 'Learning: drawing a graph without a graph library — pure layout, an SVG edge layer, and HTML nodes'
description: Beginner-first walkthrough of CP-MVP-009 S07 — why the relations strip computes its picture as pure data before it paints anything, how an HTML-chips-over-SVG-edges split keeps the existing pill recipe, and the small geometry facts (bezier midpoints, clientWidth includes padding) that decide whether a diagram looks right.
tags: [learning]
timestamp: 2026-08-13T00:00:00Z
---

# Learning: drawing a graph without a graph library — pure layout, an SVG edge layer, and HTML nodes

*Covers CP-MVP-009 S07 (2026-08-13). First-use rule (17): this is the
app's first rendered GRAPH — until now every surface was text, lists,
or trees. Written right after the owner rulings that chose its form.*

## Who this is for and what you can do afterwards

You can build a React view and you have used SVG in a logo or an
icon. Afterwards you can draw a small, honest diagram of your own
data without adding d3, cytoscape, or react-flow: you will know what
to compute before you paint, why the arrows and labels go in one
layer while the boxes go in another, and which three geometry facts
cause most "it looks wrong" bugs.

## The question the picture answers

A note's typed links are written INSIDE the note: `[[La
crédibilité]]{repose-sur}` lives in `L'ethos.md`. Standing in
`L'ethos` you see the relation; standing in `La crédibilité` you see
nothing — the file that mentions you is not your file. The relations
strip is the view from the receiving end: this note in the middle,
whoever points at it on the left, whatever it points at on the right.

The owner asked the obvious bigger question — "why not directly an
ontology in a canvas?" — and the honest answer shapes the design:
the canvas IS the destination, it just costs a custom engine
(selection, undo, layers, hit-testing) and it reads the SAME index.
So build the small renderer now, keep the data contract identical,
and let the big renderer replace only the painting later.

## Step 1 — compute the picture as data, paint nothing

The whole layout lives in `relations-graph.ts`, a file with no React,
no DOM, and no imports beyond types:

```ts
neighborhoodOf(index, notePath) → { center, inbound[], outbound[] }
layoutRelations(neighborhood, width) → { width, height, nodes[], links[] }
```

`nodes[]` carry pixel centres, `links[]` carry an SVG path string and
a label position. The component receives numbers and renders them.

Why bother? Three payoffs you feel immediately:

1. **You can unit-test a picture.** "Chips never overlap", "every
   chip stays inside the box", "inbound curves END on the centre
   node" are assertions over plain objects — no jsdom, no snapshot
   images.
2. **It cannot drift between renders.** No physics simulation, no
   `Math.random`, no stored positions. Same index, same picture. That
   is also what makes it a PROJECTION: delete the whole layout and it
   rebuilds identical, exactly like the index it reads.
3. **The renderer stays replaceable.** When the studio canvas arrives,
   it consumes the same `neighborhoodOf` output and does its own
   placement. Nothing about the data has to change.

## Step 2 — the direction rule is a data problem, not a drawing one

Atomik stores every edge ONCE, directed, on the note that wrote it,
and a caret flips the READING: `[[pathos]]{^illustre}` written inside
`crédibilité.md` asserts *pathos illustre crédibilité*. So "which
side of my graph does this edge belong to" has four cases, and
getting them wrong silently mirrors your diagram:

```text
subject = me, plain    → outbound (me → object)
subject = me, reverse  → inbound  (object → me)
object  = me, plain    → inbound  (subject → me)
object  = me, reverse  → outbound (me → subject)
```

Write this as one small function with a test per case. (The first
version of the test asserted the reverse case backwards — the code
was right, the expectation was wrong. When a test and its own comment
disagree, re-read the doctrine, not the code.)

## Step 3 — two layers: SVG for edges, HTML for nodes

The tempting move is to draw everything in SVG. Resist it. The app
already has a pill recipe — one CSS rule set with per-kind colours
and mask icons — and an SVG `<text>` node cannot join it. So:

```text
<div class="relations-figure">      position: relative
  <svg class="relations-edges">     position: absolute, inset 0 — curves + labels
  <button class="link-pill link-pill--web relations-node" style="left:…;top:…">
```

The chips are ordinary HTML buttons positioned absolutely at the
centres the layout computed (`transform: translate(-50%, -50%)` turns
a centre into a box). They join the existing recipe by adding
`.relations-node` to its selector list — no fork, no second pill,
and a neighbour that is a PDF or a chat looks exactly like it does
inside the note's own text. They are also real buttons, so keyboard
focus and click both work with no extra code.

The price: HTML boxes have unknown widths, and the pure layout must
know where a curve ends. Fix it by DECIDING the width — a constant
`NODE_W`, with CSS ellipsis for long titles. A fixed box is what buys
you a layout that never has to measure the DOM.

## Step 4 — three geometry facts that decide how it looks

**A cubic bezier's midpoint is not the average of its endpoints.**
For `M P0 C C1 C2 P3`, the point at t = 0.5 is
`(P0 + 3·C1 + 3·C2 + P3) / 8`. Put the label there and it rides the
curve; put it at the endpoint average and it drifts off the line
whenever the curve bends.

**Labels need room you did not think you needed.** The first pin
showed "repose sur" printed on top of the neighbour chip. The gap
between a column and the centre had to more than double (56 → 120
px). Give the text a halo too — `paint-order: stroke` with a
surface-coloured stroke paints the background behind the glyphs
without a rectangle occluding the graph.

**`clientWidth` includes padding.** Laying the figure out at the
scroll container's `clientWidth` overflowed it by exactly the
padding, and the strip scrolled sideways. Subtract the computed
padding, or measure a child that has none.

## Step 5 — where the toggle lives

The strip is collapsible. Its open/closed bit is TAB state (a
validated string param the main process persists), like the note's
view mode — so reopening the workspace finds the surface as you left
it. The graph itself is never UI state: it is recomputed from the
index every time. The rule of thumb from note 19 holds: if losing it
on restart would surprise the owner, persist it; if it can be
derived, derive it.

## Postscript: the filter, and a bug that was not where it looked

Two owner reports arrived the same day and are worth keeping together.

**"We might need a type filter."** Folder indexes link every note, so
one kind of neighbour drowned the rest. The filter is deliberately
NOT a fixed menu: it offers only the kinds actually present, each
button wearing that kind's own colour, so the legend and the control
are the same object. And filtering never touches the data — the
neighbourhood keeps the whole truth, the figure draws a subset, and
the bar says "· N hidden" so a filtered view can never be mistaken
for an empty one. When you hide something, say that you did.

**"Pills should show the note's title, not the file name."** Half of
this was where it looked: pills showed the authored link text, which
for a generated link is the filename. The other half was not. The
owner's note opens on `" # L'ethos"` — one leading space. CommonMark
allows up to three, so markdown renders an H1, but the title rule was
anchored at the line start and saw prose. The reader displayed a
title while everything else displayed `ethos`.

Two lessons. First: when your rule and your renderer disagree about
what a heading is, the renderer is the spec — copy its tolerance.
Second: "not always the case" in a bug report usually means TWO
causes, one of which is upstream of the symptom. Fixing the heading
rule fixed the strip centre, the relation sentences, and the
autocomplete candidates in one edit, because they all read the same
title.

(A third, smaller trap: the rendered href is percent-encoded, so
`cr%C3%A9dibilit%C3%A9.md` never equals `crédibilité`. Decode before
you compare — the first pin after the "fix" still showed file names.)

## Take-over exercises

1. Add a second hop: from `neighborhoodOf`, follow each neighbour's
   own edges one more step and place them in a third column. Notice
   how quickly the fixed-column layout stops being enough — that is
   the honest boundary where a real canvas earns its cost.
2. Make the untyped curves dashed instead of merely quieter, and
   decide from looking at your own vault which reads better.
3. Break it on purpose: return the endpoint average as the label
   position and watch the labels slide off the curves. Then put the
   bezier formula back.
