---
{
  "id": "19-dsl-future",
  "title": "Atomik DSL future architecture",
  "status": "reserved",
  "tags": [
    "dsl",
    "future",
    "visual-language",
    "file-first",
    "truth",
    "claim-evidence"
  ],
  "relations": [
    {
      "to": "01-workbench-first",
      "kind": "deferred-by"
    },
    {
      "to": "20-relations-future",
      "kind": "uses"
    },
    {
      "to": "21-canvas-future",
      "kind": "feeds"
    },
    {
      "to": "14-app-kernels",
      "kind": "requires-lang-core"
    },
    {
      "to": "27-git-compatibility",
      "kind": "must-be-diffable"
    },
    {
      "to": "28-truth-evidence-model",
      "kind": "requires-scene-claim-provenance"
    },
    {
      "to": "31-truth-lens-ux",
      "kind": "inspects-scenes-through"
    }
  ],
  "agent": {
    "purpose": "Keep the DSL architecture ready but avoid implementing it before workbench usefulness.",
    "inputs": [
      "future DSL block",
      "source/note context",
      "visual explanation request"
    ],
    "outputs": [
      "scene source",
      "AST",
      "rendered learning visual",
      "diagnostics"
    ],
    "invariants": [
      "DSL is not raw HTML.",
      "DSL is not a catalog of templates.",
      "DSL source must be readable by humans and cheap LLMs.",
      "Scene renderer compiles intent into visuals.",
      "DSL files must remain stable, diffable, and patchable.",
      "A scene claim can expose provenance, interpretation, uncertainty, and dispute; visual polish must not imply truth."
    ]
  }
}
---

# Atomik DSL future architecture

## Status

Deferred from the first MVP, but still central to the long-term vision.

## Language thesis

Atomik DSL should be a universal graphical basic language for learning:

```text
scene = subject + claim + state + derive + node + relation + mark + rule + layout
```

## Canonical commands

```text
scene
claim
subject
state
derive
node
relation
mark
rule
layout
```

## Why not raw HTML

Raw HTML is too verbose, hard to inspect, hard for cheap LLMs to generate safely, and too implementation-specific. Atomik DSL should describe visual intent; the renderer handles HTML/SVG/canvas.

## Cheap-LLM constraint

The DSL must be:

```text
line-oriented
English-like
strict command names
few synonyms
easy diagnostics
repairable by low-cost models
readable by students and experts
Git-diffable
```

## Future kernel pipeline

```text
Atomik source block
  -> parser
  -> AST
  -> validator
  -> normalized scene model
  -> layout engine
  -> renderer
```

## File-first rule

A scene is not hidden runtime state. It should live in a readable file or fenced block that can be patched, reviewed, and versioned.

## Important for v0

The Workbench should reserve support for fenced blocks and future artifact kinds, but should not block daily usability on DSL implementation.

## Truth-aware scene requirement

A future scene should distinguish:

```text
claim being taught
evidence or source links
model-generated analogy
user-controlled assumptions
interpretive or normative framing
known uncertainty or disputed alternatives
```

Visual confidence is dangerous: a polished animation can make a weak claim feel inevitable. The future scene inspector should connect the scene's central claim to the same Truth Lens and source anchors used by notes.

## One surface, two layers (reserved)

The scene renderer and the freeform drawing layer share one editing surface with two
kinds of entities:

```text
bound entity   backed by the Scene IR; canonical form = the DSL lines of the fenced
               block; edits = semantic operations + projection pins, written back as
               printer-emitted line patches (one gesture, one line in the diff)
free ink       strokes, shapes, labels with no semantics; canonical form = a sidecar
               drawing file; carries no claims and no Truth-Lens obligations
```

A gradient connects them, not a wall:

```text
draw freely
  -> select shapes
  -> promote to model-plane statements
     (deterministic mapping; archetype/claim proposal through the patch pipeline)
  -> bound scene

bound scene
  -> detach as ink copy (lossy by design, provenance noted)
  -> riff freely
```

Invariants:

- The bound scene's modifiability is bounded — semantic operations and pins, never
  pixel-canonical. Unlimited modifiability is provided by detachment, **as a copy**.
- Promotion is a patch proposal, never a silent write.
- The DSL is the **serialization of the bound layer**. Typing it, generating it, and
  drawing-then-promoting are three entry paths converging on the same file form.
- Visual roughness is an honest signal: hand-drawn ink renders rough because it carries
  no claim; only bound entities expose epistemic status. This extends "polish ≠ truth":
  roughness does not mean false — it means *unclaimed*.

Drawing from scratch is itself a learning act (retrieval practice — doc 02: outputs more
durable than inputs), so the free-ink block may ship as a workbench feature independent
of, and possibly before, the DSL editing surface. Sequencing is a roadmap (18) decision.
