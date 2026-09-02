---
type: Atomik Session Record
title: CP-RENDER-REPAIRS opening check — repairing what the capability bench found behind the prompt
timestamp: 2026-08-20T00:00:00Z
tags: [opening-check, renderer, math, mermaid, vega-lite, chat, repair]
path: CP-RENDER-REPAIRS
branch: path/cp-render-repairs
---

# CP-RENDER-REPAIRS opening check

Walked with the owner 2026-08-20, feature by feature, immediately after
CP-AI-CAPABILITIES merged (`f58093e`).

## How the path was found

Not by reading code. CP-AI-CAPABILITIES told the model what the surface
renders, the owner benched it on real generations, and the model was right
every time. What broke was the render. Four defects, all of them invisible to
every gate, all of them found by looking at the app.

Three of the four are currently WARNED ABOUT in a prompt block that ships on
every request. That is the shape of the debt: the app pays tokens, forever, to
tell a model to route around defects. Repairing them is how the payment stops.

## Features accepted

**1. Grouping — one path, all four.** The owner chose a single path over
splitting the viewer work out. They were found in one bench, three are small
and mechanical, and the `$$` repair discharges an obligation the
CP-AI-CAPABILITIES coherence audit left behind. One opening check, one closing
ceremony, one merge.

**2. Display math delimiters.** A block must open on `$$` followed by content
and close on a line ending in `$$` — in read mode (`markdown-plugin.ts:83`)
and live mode (`syntax.ts:149`) alike. Fixtures come from the owner's real
notes (`vault-juju`, 2026-08-17), not from invented ones. The two forms that
already work must keep working, and a stray `$$` mid-paragraph must not match.

**3. The drift pin is expected to fire, and the answer is deletion.** When the
parser is fixed, `tests/prompt-composition.test.ts` fails on the trap it pins
to `discoverDollarMath`. The correct response is to remove that clause from
`RENDERING_CAPABILITIES` and lower the block's asserted ceiling — never to
loosen the assertion. This was written into the audit precisely so it would not
depend on anyone remembering it, and it is the only reason the warning was
allowed to cost tokens in the first place.

**4. Vega warnings surface in the block's status line.** Reusing
`[data-rich-status]`, the slot every block already carries and the same surface
that shows "source shown" on a refusal. The chart still renders; the reader
learns why it looks wrong. The owner declined the wider audit of every adapter
for now and declined console-only, which would have left the silent empty
chart exactly as it is — the actual complaint.

**5. `chatSlug` strips HTML comments, AND the leak gets one reproduction
attempt.** The one-line fix mirrors `graph-core.ts:109`, where CP-MVP-010 S07c
solved this same defect class one layer up. But how a stamped `## you <!-- sent:
… -->` heading reached the message text is unproven — a paste from the open
source pane is the likeliest trigger, and the owner chose to find out rather
than assume. Recorded either way: an unreproduced trigger is not a fixed one.

**6. Diagram exploration: natural width, then expand.** The container already
carries `overflow: auto`; `max-width: 100%` on the SVG is what stops it ever
engaging (`styles.css:3708-3734`). Removing the cap buys panning for nothing.
An expand control then opens the diagram in a full-pane overlay. The owner
rejected wheel-zoom-and-pan: it competes with page scroll and is more machinery
than the ask.

The overlay renders the SAME sanitized node, never a re-parse — 13 is not
softened by giving a safe diagram more room.

## Deliberately excluded

Zoom and pan. Relaxing any Mermaid or SVG guard — `foreignobject` stays
refused, so math in a Mermaid label stays refused and its warning STAYS. Fixing
Vega-Lite's log-scale baseline, which is upstream; the repair is that the
reader is told, so that warning stays too. Any new renderer, fence or relaxed
limit. The Excalidraw / Scene IR question, which is roadmap material against
bedrock 19.

Two of the five warnings therefore survive this path on purpose. Only the ones
describing defects Atomik OWNS can be deleted.

## Activation

Accepted by the owner 2026-08-20. Base commit `f58093e`, worktree
`../4tom1k-cp-render-repairs`, branch `path/cp-render-repairs`.
