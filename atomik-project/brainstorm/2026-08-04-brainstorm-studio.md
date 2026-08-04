---
type: Atomik Brainstorm Note
title: Brainstorm session — the studio: unified canvas for DSL projections, vault graph, and free creation
timestamp: 2026-08-04T00:00:00Z
status: provisional
---

# 2026-08-04 brainstorm session — the studio (cross-repo: 4tom1k + atomik-dsl)

Q/A session opened by the owner, spanning both repositories. Nothing here is a decision; promotion goes through reviewed patches (bedrock/ADR, both repos). Research base: repo sweep (ADR-010, bedrock 19/21, CP-MVP-009 draft, atomik-dsl register + local-first wave) + the SVG-vs-WebGL-2D comparison argued live in session.

## Subject — a unified rendering canvas

**Owner vision (verbatim gist):** "a unified rendering canvas for dsl projections, node and edges from our vault graph, creation tools like excalidraw or custom one. All editable, with layers, groups — an interactive studio where ideas and explanation can live and evolve with the help of AI and our creativity combined." Clarified: "the same idea I was pitching last time on one surface two layers, but a new vision to better communicate it — a block that can be loaded on the rendering of a note but is a different file, that lands a canvas 2D or 3D where I can build my own diagrams, draw my own schemas, and where dsl can be projected and then finetuned/modified by me or AI iteration — the ultimate knowledge visualisation tool."

So: the studio is the **evolved articulation of ADR-010's "one surface, two layers"** — not a third surface. The record previously held two separate surfaces (page-level scene block, ADR-010; future composition canvas, bedrock 21/M13); this session unifies them.

## Converged shape (owner rulings, prompted exchange)

### Entities and canonicality — kind determines the store

Three entity kinds on one canvas; each edits through its own canonical door:

```text
bound scene   canonical = DSL lines in the fenced block (unchanged, ADR-010);
              edits = semantic ops + pin hints as printer-emitted line patches
vault graph   canonical = note files; the canvas PROJECTS the nodes/edges index
              (CP-MVP-009's tables); drawing a typed edge = a [[target]]{label}
              one-line diff in the subject note; dropping a new concept node =
              creating a real note; node LAYOUT is canvas-owned (studio file)
ink           canonical = studio-file entities of kind `ink` — OWN format;
              Excalidraw dropped entirely (optional .excalidraw IMPORT later)
```

The studio file owns only composition: positions, viewport, layer/group tree, references by id/path. Bedrock 21's invariants (never a hidden database, references not copies, moving a node never changes epistemic status) survive intact.

### Layers and groups — Illustrator mechanics, not semantics

Owner ruling: groups are the way to create **layer hierarchy as in Illustrator** — a canvas mechanic for render order and structure, owned by the studio file, "it isn't necessary to be linked with higher level of concepts." Consequence: the layer/group tree is **orthogonal to entity kind** — any entity sits anywhere in the hierarchy; kind determines the canonical store, the tree only stacks and organizes. No unified-group reconciliation problem; no promotion of visual frames into DSL groups required (draw-then-promote stays possible later but is not doctrine).

### Editing model — immediate for humans, staged for AI

Owner first leaned "all three graph edits but maybe a staging state before pushing editions," then ruled: **per-gesture immediate with undo** for human edits (each gesture = one clean canonical diff — the CP-MVP-009 pill-lifecycle discipline generalized to the canvas), while **AI iterations keep the existing proposed-patch-with-preview lane**. One asymmetry, on purpose, already law (bedrock: AI writes are proposed patches; no silent mutation).

### Engine — one custom engine, core in atomik-dsl

- **One custom engine** (owner ruling), replacing ADR-010's Excalidraw-embed decision. Honest cost on record: selection, undo, layers, groups, hit-testing, text editing rebuilt by hand — a multi-month track Excalidraw gave free. Payoff: ADR-010's rejected "sync the scene into a whiteboard's document model" tension dissolves — one scene graph, no sync tax, no foreign closed surface.
- **Engine core lives in atomik-dsl** (owner confirmed the recommended split): a DOM-free, dependency-free, **dimension-agnostic** core (scene graph, vec3 positions, camera, pluggable projection step) as a renderer target consuming Scene IR, benched in the local demo during the D5–D8 wave. Interaction (selection, tools, vault access) stays app-side. Fits kernel law (renderers depend on core; kernels dependency-free).
- **SVG renderer for v0** (owner: "ok lets go for SVG for v0", after the argued comparison): text via the browser's engine, bedrock-36 tokens/themes flow natively, accessibility floors nearly free, vector export = the render path itself, crisp at every zoom; at studio scale (scenes soft-capped ~40 nodes, compositions dozens-to-hundreds of entities) DOM performance is a non-issue.
- **three.js reserved as the later 3D target** against the same core — a new renderer, not a rewrite (exactly what "Scene IR stays projection-agnostic" reserved room for; MIT, app-side only, never in the kernel). Escape hatch noted: if the vault-graph layer ever renders thousands of nodes, that one layer can take a canvas2d/WebGL fast path behind the same core — per-layer renderer choice is a design benefit.

### Note embed — live interactive inline

The studio block **is** the studio inside the note render: pan/zoom/edit inline, expandable to a full tab. One surface, truly; SVG makes inline affordable.

### Sequencing — D4 reframed as studio v0

Owner ruling: **shape D4 around the studio.** D4 stays what it was — a transplantation of locally-proven parts — but the transplantation target is the unified canvas (studio v0: live inline block, layer/group tree, three entity kinds, SVG renderer), not a plain scene block. The engine core joins the local-first maturation wave in atomik-dsl so D4 remains a transplant, not a greenfield.

## Doctrine deltas to PROPOSE (owner-gated; nothing applied by this note)

- **ADR-010 amendment**: custom engine replaces the Excalidraw embed (clause 6); ink format absorbed into the studio file (sidecar clause); SVG v0 + three.js-reserved-for-3D recorded; the rest of the ADR (two entity kinds → generalized to three, DSL = serialization of the bound layer, promotion/detachment gradient) survives.
- **Bedrock 19/21 amendments**: the unified studio supersedes the two-separate-surfaces framing; M13 "canvas" = the studio at composition scale; free-ink section loses its Excalidraw component line.
- **Roadmap 18 / register**: D4 = studio v0; M12/M13 convergence articulated at the concerned ceremony.
- **atomik-dsl register**: the wave gains the engine-core work; D7's mapper input becomes the own ink format (was "Excalidraw JSON"); T3's drawing layer likewise.

## Deliberately left open (for the concerned opening ceremonies)

- The studio FILE format itself: shape, readability, diff discipline (bedrock 21's comprehensible-diff rule binds), where it lives relative to the note.
- Graph-layer scope controls: whole vault vs neighborhood-of-a-note vs query-scoped.
- The AI gesture vocabulary in the studio: generate-scene-from-selected-notes, refine-a-projection, propose-graph-edges — which land in v0.
- 3D's concrete use case (gates the three.js target).
- Engine-core package naming/placement inside atomik-dsl, and how T2/T3 grow the demo into the studio bench.

## Feeds

- **atomik-dsl wave openings (D9 → D8)**: engine-core package joins the wave (placement decided at the concerned opening, likely beside T2/T3 which grow the demo into the studio bench); **D7 and T3 openings** read this session for the ink swap — own ink entities in the studio file replace Excalidraw JSON as the mapper's input and the playground's drawing layer; D5/D6 scope unchanged, their consumer is now the studio surface.
- **D4 opening (main repo)**: this session is the path's design sketch — D4 = studio v0.
- **CP-MVP-009 opening**: scope unchanged; the studio is recorded as a later consumer of the nodes/edges index (the graph layer projects it; canvas edge-drawing reuses the same edge-lifecycle discipline and write path as the pills).
- **M13 row**: the studio subsumes it — resolved at the roadmap amendment, not by this note.
- **Next docs unit / ceremony**: the ADR-010 amendment + bedrock 19/21 patch candidates above.
