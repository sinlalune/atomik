---
type: Atomik Session Record
title: CP-RENDER-REPAIRS closing ceremony — the blocks now behave like the surface promised
timestamp: 2026-08-20T00:00:00Z
tags: [closing-ceremony, renderer, math, mermaid, vega-lite, chat]
branch: path/cp-render-repairs
path: CP-RENDER-REPAIRS
ceremony: closing
---

# CP-RENDER-REPAIRS closing ceremony

Run with the owner 2026-08-20. The final verdict was explicit and covered the
whole remaining bench checklist: *"ok for all go for closure"*.

## Recall, from the repository

Derived from the path ledger, its opening check, the S03 trigger trace, the
module notes, the committed tests, and the three recorded diagram bench rounds.

```text
S01  display math accepts model-natural opening and closing delimiters in both
     scanners; the inherited prompt warning was deleted when its drift pin fired
S02  Vega and Vega-Lite warnings reach the block's existing visible status line
S03  chatSlug strips HTML comments as a unit; the stamped-heading trigger was
     traced and recorded as a paste rather than an in-app provenance defect
S04  diagrams regained natural-width scrolling and the same sanitized SVG can
     move into a full-pane dialog without cloning or reparsing
S05  Mermaid became a bounded canvas: drag pan, pointer-centred zoom, fit/reset,
     keyboard equivalents, modifier-wheel page-scroll safety, overlay retargeting,
     compact natural height, and icon actions with accessible hover/focus labels
```

## What the bench changed

The first round accepted math, Vega and chat, then corrected the diagram form:
natural-width scrolling alone was not the intended endpoint; the block itself
needed to behave as an infinite canvas while retaining Expand.

The next rounds found the kinds of defects only the live surface exposes. A
Mermaid SVG whose element box was wider than its drawing defeated Fit; then a
stylesheet margin and the JavaScript transform both tried to own centring, so
the drawing was centred twice and clipped. The final implementation pins the
SVG's intrinsic layout inline, restores every touched inline value on disposal,
and lets the transform own canvas placement. A small graph no longer receives
an acre of empty height. The owner also asked for icon actions whose labels
appear on hover and focus; those controls now share one accessible helper.

The final owner checklist covered Fit on wide and small diagrams, modifier-wheel
zoom, drag-pan, ordinary page scrolling, expanded-canvas behavior, compact
height, and the icon labels. The answer was: *"ok for all go for closure"*.

## Boundaries that remain

- Vega-Lite's zero-height bar behavior on a log scale is upstream. Atomik now
  surfaces Vega's diagnosis and the prompt warning remains pinned.
- KaTeX inside a Mermaid label remains refused because it requires
  `foreignObject`; no SVG or Mermaid security guard was relaxed.
- Charts retain natural-width scrolling. Pan/zoom is for spatial content, not
  ordinary data graphics.
- Scene IR, Excalidraw, and a general scene viewer remain roadmap questions;
  this repair path introduced no scene architecture.
- The generated `ACTIVE.md` view did not list this path while its branch ledger
  correctly said `running`; branch `cairn-check` still passed because derived
  view freshness is trunk-only. This is a Cairn pilot follow-up, not renderer
  scope and not a merge blocker.

## Roadmap

No amendment proposed. This is a labelled repair path and claims no milestone.
Its work discharges the four Atomik-owned defects carried out of
CP-AI-CAPABILITIES; the two upstream/refused behaviors above remain explicitly
described rather than silently broadened into this path.

## Verdict

Accepted. Path completes its rebase, gates, coherence audit and journal, then
merges itself.
