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
      "Notes are concepts; the note-to-note link graph IS the semantic knowledge graph.",
      "Wikilinks and Markdown links are edges from birth; a typed {label} makes an edge's semantics explicit (ADR-011).",
      "Claims/evidence (28) are an OPTIONAL overlay on an edge, never its birth requirement; an edge can live its whole life without one.",
      "Graph index is rebuildable from files.",
      "Do not force graph modeling before notes are useful; labels are the owner's own language (autocomplete-converged), never an imposed ontology.",
      "When an edge carries the overlay, it inherits claim evidence, scope, status, and dispute rather than becoming an anonymous fact."
    ]
  }
}
---

# Relations and graph future

## Position

**Notes are concepts, and the link graph between notes IS the semantic knowledge graph** (owner doctrine, 2026-08-03 brainstorm session; promoted here through the 2026-08-04 ceremony gate). There is no "reference tier" that later graduates into a "knowledge tier": every wikilink or Markdown link is a real edge of the knowledge graph from the moment it is typed. A typed label makes an edge's semantics explicit — inline, in the note's own markdown (`[[target]]{label}`, ADR-011).

The claim/evidence apparatus (28) is an OPTIONAL verification overlay that the learner (or the Truth Lens) can attach to an edge that deserves scrutiny. It is never the edge's birth requirement.

```text
inline edge in the note -> rebuildable graph index -> optional claim/evidence overlay
                                                   -> optional canvas visualization
```

This keeps the workbench useful while the learner's knowledge model is still emerging.

## Untyped links first

Markdown links are enough for early MVP:

```md
[[Attention]] compares query and key vectors.
See the [Attention paper](../sources/pdf/attention-is-all-you-need/source.md).
```

This creates untyped edges with default semantics:

```text
current note --mentions--> Attention
current note --references--> source dossier
```

Untyped links are low-friction — and already full members of the graph. They do not require the user to decide a full ontology before writing a useful note; a `{label}` can be added later, or never.

## How links are born: link proposals

Links should not depend solely on the user remembering to type `[[`. Atomik proposes them, subtly, from the vault itself:

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

### 2. A relation under scrutiny may be elevated to a claim

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

When that information matters, the edge is elevated with a claim overlay carrying it. The edge itself stays a light, file-backed statement inside the note; the overlay is optional and attaches to the existing edge — never a precondition for drawing it.

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

## Typed edges: inline decoration

Decided format (ADR-011): the label decorates the link inline, inside the sentence that glosses the relation:

```md
The [[query]]{compares-with} vector is scored against the key.
Softmax [[attention]]{normalizes} the score row.
The paper is the ground: [attention paper](../sources/pdf/attention.md){grounded-at}.
```

`[[target]]{label}` · reverse assertion `[[target]]{^label}` · labels kebab-case · immediate adjacency required. This creates semantic edges that can be indexed, visualized, queried, and used by the future canvas. The earlier `relation subject -> object label` block syntax is retired in favor of context co-location: the triple lives inside the prose that explains it, so any prompt excerpt carries its semantics for free.

## Agent rule

Agents may use graph indexes for retrieval, but accepted knowledge must still patch files:

```text
relation suggestion -> review -> inline typed edge in the note (ADR-011) -> graph index rebuild
```

## Rename and link integrity

Wikilinks break on rename. A rename is therefore a **tracked refactor**: one deliberate, reviewable multi-file patch that renames the note and updates its backlinks together. This is the sanctioned exception to the one-file-diff habit — deliberate, atomic, and labeled as a refactor in the diff. Broken-link detection is a rebuildable diagnostic over the link index, never a silent auto-repair.

## Epistemic relation projection (optional overlay)

An edge is a statement by its author, not proof of anything. When an edge deserves scrutiny, a claim overlay (28) attaches to it, and the graph projects that claim's epistemic status:

```text
file-backed claim (optional overlay on an existing edge)
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
