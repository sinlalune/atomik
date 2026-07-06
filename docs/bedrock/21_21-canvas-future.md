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
      "Canvas emphasis and spatial proximity must not imply stronger evidence unless explicitly represented."
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
