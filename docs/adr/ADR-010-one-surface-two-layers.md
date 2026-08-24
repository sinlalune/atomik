---
type: Atomik ADR
title: 'ADR-010: One surface, two layers — bound scenes and free ink'
description: One editing surface carries two entity kinds: bound scenes serialized as DSL lines in a fenced block, and free ink held in a sidecar drawing file with no semantics and no claims.
tags: [adr, canvas, scene, ink, dsl, editor]
timestamp: 2026-07-15T00:00:00Z
adr:
  id: ADR-010
  status: accepted
  date: 2026-07-15
---

# ADR-010: One surface, two layers — bound scenes and free ink

Status: accepted
Date: 2026-07-15

## Context

The atomik DSL's generation path is real (CP-DSL-003 measured it; CP-DSL-005 demos it
end-to-end), but iterating by regeneration is a lottery: high cross-run structural
variance is a confirmed finding of the generability eval. Direct manipulation of the
rendered scene is the missing loop. Independently, drawing a representation from scratch
is a first-class learning act (retrieval practice) the workbench does not serve at all.
The owner challenged whether the DSL should remain canonical ("the free form of the mind
is maybe more important than the structure of abstraction"). Meanwhile, bedrock 21
forbids the canvas becoming a hidden database, and the DSL uniquely carries what no
drawing can: behavior (gated predict-then-see steps — C4 —, reactive rules), epistemics
(claim/status/misconception, refutation grammar), line-diffability, and cheap-model
tractability (GBNF-constrained generation and single-line repair). None of these are
visual properties.

## Decision

1. One editing surface, two entity kinds: **bound** (Scene-IR-backed; canonical form =
   DSL lines in the fenced block) and **free ink** (canonical form = sidecar drawing
   file; no semantics, no claims).
2. The DSL's role is restated: the **serialization of the bound layer**, reached by
   typing, generation, or drawing-then-promotion — three convergent entry paths.
3. Bound edits are semantic operations plus projection `pin` hints, written back
   exclusively as printer-emitted line patches (`parse(print(ir)) ≡ ir`; D6 provenance;
   one gesture = one line in the diff). Pixel positions never become canonical.
4. Promotion (ink → model-plane statements) is a deterministic mapping plus AI proposal
   through the patch pipeline; detachment (scene → ink) is a lossy copy with provenance.
5. Free ink carries no epistemic status; visual roughness is the honest marker of
   unclaimed content (extends invariant "polish ≠ truth").
6. The drawing layer embeds Excalidraw (MIT). tldraw is ruled out on license grounds.
   The Scene IR stays projection-agnostic so 2.5D/3D renderers remain possible as new
   layout targets without language change.

## Consequences

- atomik-dsl gains reserved milestones D5 (printer + edit operations), D6 (`pin`,
  a v0.4 surface change), D7 (sketch-promotion mapper); the workbench gains a sketch
  block shippable independently of — possibly before — M12/M13.
- Bedrock 19/21 gain the reserved doctrine sections; layout contracts later consume
  pins under the existing L5 loud-degradation rule.
- A page region may have two canonical stores (DSL block + drawing sidecar); cache
  deletion still loses nothing.
- Volatile license facts (recheck before integration):

  | Fact | Source | Checked |
  |---|---|---|
  | tldraw SDK: production requires a license key; source-available, not open source; hobby license discretionary + watermark; license includes environment-detection and usage-data clauses | tldraw.dev/legal/tldraw-license · tldraw.dev/community/license | 2026-07-15 |
  | `@excalidraw/excalidraw`: MIT, embeddable React component | github.com/excalidraw/excalidraw · npm | 2026-07-15 |
  | `@xyflow/react` (React Flow): MIT, no paywalled features — candidate for canvas M13 node-graph needs, not for the scene surface | xyflow.com/open-source | 2026-07-15 |

## Alternatives considered

### Canvas document as the canonical scene form

Rejected. It is the hidden database bedrock 21 forbids: canvas JSON diffs poorly, cannot
be grammar-constrained for cheap generation or single-line repair, and has no
serialization for behavior (gates, rules) or epistemic status. The north-star
misconception scene cannot exist as strokes.

### DSL remains the sole authoring interface

Rejected. Regeneration-as-iteration is the observed pain (eval-confirmed structural
variance), and drawing-from-scratch as comprehension validation goes unserved.

### Adopt the tldraw SDK for the surface

Rejected on license: production key requirement, source-available terms,
environment-detection and usage-data clauses conflict with the open, local-first,
file-first posture — the same class of exclusion as the Qwen2.5-VL research license.

### Sync the scene into a whiteboard's document model

Rejected. Two documents for one scene doubles the state model; every feature pays the
synchronization tax twice; drift between the whiteboard document and the IR becomes a
permanent bug class.

### Unlimited direct modifiability of the bound scene

Rejected. It deletes L1 determinism, replay, and the layout contracts. The same freedom
is provided losslessly-for-the-user via detachment-as-copy.

## Migration / rollback

Nothing ships now; every piece is a reservation. If the two-layer surface later proves
too heavy, the sketch layer degrades to a plain embedded drawing block and the DSL keeps
its render-only path (CP-DSL-004) — no file-format changes to roll back.

## Links

- `19_19-dsl-future.md`, `21_21-canvas-future.md` (amended sections)
- ADR-009 (projection principle: interactive artifacts patch files)
- atomik-dsl: language spec §2 (canonical form), §12 (reservations); render-core §1
  (print obligation), D6 (provenance), L5 (loud degradation), §11 (reservations)
