---
{
  "id": "21-canvas-future",
  "title": "Canvas future",
  "status": "reserved",
  "tags": [
    "canvas",
    "future",
    "spatial",
    "file-first",
    "truth-lens",
    "evidence"
  ],
  "relations": [
    {
      "to": "20-relations-future",
      "kind": "uses"
    },
    {
      "to": "19-dsl-future",
      "kind": "places"
    },
    {
      "to": "04-file-first-model",
      "kind": "references"
    },
    {
      "to": "27-git-compatibility",
      "kind": "must-diff-cleanly"
    },
    {
      "to": "18-roadmap",
      "kind": "phase-8"
    },
    {
      "to": "31-truth-lens-ux",
      "kind": "inspects-canvas-claims"
    }
  ],
  "agent": {
    "purpose": "Keep canvas as a projection layer over files, not an app-owned knowledge database.",
    "inputs": [
      "note resource",
      "source dossier resource",
      "source resource",
      "scene resource",
      "relation graph"
    ],
    "outputs": [
      "canvas file",
      "spatial layout",
      "open side page interactions"
    ],
    "invariants": [
      "Canvas references notes/sources/scenes by id/path.",
      "Canvas does not duplicate canonical note content.",
      "Clicking nodes opens pages/tabs.",
      "AI-generated canvas is a patch proposal.",
      "Canvas files must remain reviewable and versionable.",
      "Canvas emphasis and spatial proximity must not imply stronger evidence unless explicitly represented.",
      "Free ink carries no epistemic status; a hand-drawn edge between bound nodes is annotation, not a relation claim."
    ]
  }
}
---

# Canvas future

## Role

Canvas is the spatial composition layer. It is where notes, source dossiers, raw sources, scenes, and relations become a navigable learning map.

## Not the canonical knowledge record

Wrong:

```text
canvas contains the knowledge
notes are exports
```

Correct:

```text
files contain the knowledge
canvas arranges references to files, sources, scenes, and relations
```

## Future canvas node kinds

```text
note node
source dossier node
raw source node
source excerpt node
Atomik scene node
AI output node
question node
relation cluster
context pack node
```

## Expected interaction

```text
click note node -> open note in side tab
click source dossier node -> inspect source.md
click raw source node -> open original source
click scene node -> render visual scene
click relation edge -> inspect claim/provenance
ask AI -> generate canvas from selected notes/sources
```

## File model

Canvas should be saved as a readable composition file that references durable resources by path/id.

The canvas may use a machine-friendly format, but it must not become a hidden database and should avoid noisy rewrites.

## Git rule

A canvas layout change should produce a comprehensible diff. A content change to a note should happen in the note file, not inside the canvas.

## Truth Lens on canvas

Canvas layout is rhetoric. Size, color, proximity, and centrality can imply authority even when the underlying claim is weak.

Future canvas nodes and edges should expose:

```text
source-backed / model-only / interpretive / disputed / stale status
open evidence
open counterclaim
verify
challenge and repair
```

The canvas remains a projection over files and claim records; moving a node never changes epistemic status.

## Free-ink layer (reserved)

The canvas (and the page-level scene surface — doc 19, "One surface, two layers") hosts
a freeform drawing layer:

```text
canonical form   sidecar drawing file beside the page (Excalidraw document), or a
                 fenced drawing block; referenced by path like any resource
component        embeddable MIT drawing editor (Excalidraw) — license verified, see
                 ADR-010's volatile-fact table; recheck before integration
semantics        none — ink is annotation and thinking surface, never knowledge record
diff discipline  pragmatic, not strict: ink carries no claims, so the comprehensible-
                 diff rule binds knowledge changes, not strokes
```

Ink may annotate *over* a rendered scene (circle a node while studying). Anchoring is an
open design question for the implementing path: entity-id anchoring survives layout
changes; absolute coordinates drift. Record the choice in the path, not here.

Promotion and detachment follow doc 19's gradient. Promotion of canvas ink into scenes
or notes flows through the AI patch pipeline as a proposal. A hand-drawn arrow between
two bound nodes *looks* like a relation but is not one — the renderer must keep the two
visually distinguishable (roughness vs rendered style), and the Truth Lens ignores ink.
