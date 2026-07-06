---
{
  "id": "20-relations-future",
  "title": "Relations and graph future",
  "status": "reserved",
  "tags": [
    "relations",
    "graph",
    "future",
    "okf",
    "truth",
    "evidence"
  ],
  "relations": [
    {
      "to": "11-markdown-page-model",
      "kind": "extends"
    },
    {
      "to": "19-dsl-future",
      "kind": "shares-command"
    },
    {
      "to": "21-canvas-future",
      "kind": "edges"
    },
    {
      "to": "26-okf-agent-context",
      "kind": "indexes-links-from"
    },
    {
      "to": "18-roadmap",
      "kind": "phase-6"
    },
    {
      "to": "28-truth-evidence-model",
      "kind": "projects-promoted-claims-from"
    },
    {
      "to": "31-truth-lens-ux",
      "kind": "inspects-edge-evidence-through"
    }
  ],
  "agent": {
    "purpose": "Prepare typed graph structure without prematurely forcing every note into graph-first modeling.",
    "inputs": [
      "Markdown wikilinks",
      "Markdown links",
      "relation claim block",
      "source note",
      "node/edge candidate"
    ],
    "outputs": [
      "weak graph",
      "typed graph",
      "backlinks",
      "relation diagnostics",
      "future canvas edges"
    ],
    "invariants": [
      "Wikilinks and Markdown links are weak edges.",
      "Relations are typed semantic claims that can be indexed as edges.",
      "Relation claims may need provenance, scope, confidence, and explanation.",
      "Graph index is rebuildable from files.",
      "Do not force graph modeling before notes are useful.",
      "Graph edges inherit claim evidence, scope, status, and dispute rather than becoming anonymous facts."
    ]
  }
}
---

# Relations and graph future

## Position

Typed relations are desirable. Atomik should eventually support semantic nodes and edges.

The key decision is not whether typed relations exist. The key decision is where they become canonical. In Atomik, typed relations should first be authored as readable, reviewable, file-backed claims. The graph can then index those claims as edges.

```text
file-backed relation claim -> rebuildable graph edge -> optional canvas visualization
```

This keeps the workbench useful while the learner's knowledge model is still emerging.

## Weak links first

Markdown links are enough for early MVP:

```md
[[Attention]] compares query and key vectors.
See the [Attention paper](../sources/pdf/attention-is-all-you-need/source.md).
```

This creates weak edges:

```text
current note --mentions--> Attention
current note --references--> source dossier
```

Weak links are low-friction references. They do not require the user to decide a full ontology before writing a useful note.

## How weak links are born: link proposals

Weak links should not depend solely on the user remembering to type `[[`. Atomik proposes them, subtly, from the vault itself:

```text
hover or highlight a term (or an AI answer mentions it)
  -> deterministic match against note titles, aliases, headings (FTS5/index)
  -> quiet, dismissible proposal: link to the existing note / open it beside
  -> accept = one wikilink, one clean one-line diff
  -> lifecycle-aware: archived and superseded notes are down-ranked
```

Rules:

```text
propose, never impose: no automatic insertion, no bulk rewriting of existing notes
deterministic first: no embeddings required (ADR-007); semantic matching is a later,
  evaluated addition
reuse is an epistemic upgrade: the existing note carries accepted status and evidence;
  a fresh generation is model-only content awaiting verification
every accepted proposal enriches the future graph, relations, and canvas for free
the operation receipt can honestly read: answered from your vault · €0 external
reuse rate is informational, never a quota — do not reward linking for its own sake
```

## OKF alignment

OKF-style bundles treat standard Markdown links as relationships beyond the parent/child directory hierarchy. Atomik should preserve that simplicity early:

```text
folder tree = progressive disclosure
Markdown links = graph edges
frontmatter = queryable metadata
graph index = rebuildable projection
```

## Why not graph-first immediately?

### 1. Learning granularity is discovered over time

In a learning context, the user may not yet know what should count as a node:

```text
Attention
query vector
key vector
"query compares with key"
the equation QK^T
a source excerpt
a personal explanation
a visual scene
```

All of those may be useful knowledge objects, but forcing the choice too early turns learning into ontology design.

### 2. A relation is often a claim, not just an edge

A relation such as:

```text
query --compares-with--> key
```

may need supporting information:

```text
source
anchor
confidence
scope
explanation
counterexample
created-by user or AI
review status
```

So the authored object should be richer than a hidden graph edge. The graph edge is an indexable projection of the claim.

### 3. Semantic relations and canvas edges are different

A semantic relation says something about knowledge. A canvas edge arranges or visualizes something in space.

```text
relation = claim about a connection
canvas edge = spatial/visual representation of a connection
```

A canvas edge may display, reference, or inspect a relation claim, but the canvas edge should not become the canonical knowledge record.

### 4. File-first keeps the graph rebuildable

If the canonical graph only lives in a database or runtime index, user knowledge becomes harder to inspect, migrate, repair, and version.

Atomik's graph should be rebuilt from Markdown notes, source dossiers, source references, and future relation blocks.

## Typed relations later

Future relation syntax:

```atomik
relation query -> key compares-with
relation attention -> value weights
relation softmax -> attention normalizes
```

This creates semantic edges that can be indexed, visualized, queried, and used by the future canvas.

## Agent rule

Agents may use graph indexes for retrieval, but accepted knowledge must still patch files:

```text
relation suggestion -> review -> Markdown relation claim -> graph index rebuild
```

## Rename and link integrity

Wikilinks break on rename. A rename is therefore a **tracked refactor**: one deliberate, reviewable multi-file patch that renames the note and updates its backlinks together. This is the sanctioned exception to the one-file-diff habit — deliberate, atomic, and labeled as a refactor in the diff. Broken-link detection is a rebuildable diagnostic over the link index, never a silent auto-repair.

## Epistemic relation projection

A relation edge is a projection of a claim, not proof of it.

```text
file-backed claim
  statement
  scope
  evidence
  verification state
  freshness
  counterclaims

  -> graph projection

edge
  subject
  predicate
  object
  claim ID
  visible epistemic status
```

Two contradictory edges may coexist because sources, time periods, definitions, translations, or scholarly traditions differ. The graph should let the user inspect why, not collapse them by majority count.
