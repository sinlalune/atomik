# ADR-011: Inline typed edge grammar — `[[target]]{label}`

Status: accepted
Date: 2026-08-04

## Context

Bedrock 20's corrected doctrine (owner, 2026-08-03 brainstorm session; ceremony-gated 2026-08-04) states that notes are concepts and the note-to-note link graph IS the semantic knowledge graph. Typed edges make an edge's semantics explicit; the claim/evidence apparatus (28) is an optional overlay, never a birth requirement. The definitive vault starts accumulating links now (Q1 record at CP-MVP-008's close), so the serialization of a typed edge is a format the vault will depend on permanently — it must be decided before the semantic-graph path writes its first edge.

The owner's criterion (verbatim): "I will favor the solution that is the easiest to be exploited by agent, prompt, and ontology reconstruction." Inline decoration wins on that criterion: context co-location welds the triple to the prose sentence that glosses it, raw markdown carries the semantics into any prompt excerpt for free, and parsing is one pass (link + adjacent decoration).

Collision evidence (run through the app's real stack — markdown-it 14 `{html:false, linkify:false, breaks:true}`, Lezer/CM6 braces inert; wikilinks are greenfield until the semantic-graph path opens) is recorded in `atomik-project/brainstorm/2026-08-03-brainstorm-session.md` §Q4.

## Decision

A typed edge is authored as an inline decoration immediately following a link:

```md
The [[query]]{compares-with} vector is scored against the key.
Softmax [[attention]]{normalizes} the score row.
The paper is the ground: [attention paper](../sources/pdf/attention.md){grounded-at}.
```

Grammar rules:

1. **Form** — `[[target]]{label}` for wikilinks; the same `{label}` decoration after a standard Markdown link (`[text](path){label}`) covers non-note node types (web page, PDF, transcript, anchor, prompt …).
2. **Reverse assertion** — `[[target]]{^label}` (caret, NOT `{<label}`, which gets HTML-escaped). Default direction is current-note → target; edges are always stored directed, one edge stored once (subject = the note being written). Symmetry/inverse are properties of the LABEL, not the edge; the backlink pane renders the inverse (typed backlinks).
3. **Labels** — kebab-case `[a-z0-9-]` only (kills emphasis-parsing collisions in foreign renderers); autocomplete normalizes free input ("part of" → `part-of`). Labels are the owner's own language; the label registry (with usage counts) is a rebuildable `.atomik/` index, never an imposed ontology.
4. **Adjacency** — the decoration must immediately follow the link; any whitespace between link and brace makes the brace ordinary prose (no false positives).
5. **Inline stays light forever** — any future evidence/status overlay attaches in a sidecar keyed by the triple, never as more inline syntax.

## Consequences

- The grammar degrades informatively outside Atomik: GitHub, Obsidian, and pandoc render the label as visible text next to the link — knowledge is never silently consumed.
- One parser pass serves rendering (pills + label chips), the nodes/edges index rebuild, and agent/prompt consumption.
- Bedrock 20's earlier `relation subject -> object label` block syntax is retired.
- The semantic-graph path builds the grammar once across markdown-it and Lezer; pills render on every surface, edge authoring is a per-surface capability flag; the edge lifecycle (create, edit label, flip, delete) ships complete in the same unit (03's lifecycle rule).

## Alternatives considered

- **`<!--rel:label-->` comments** — eliminated: with `html:false`, Atomik's own preview renders comments as escaped visible junk.
- **`{.label}` pandoc attributes** — eliminated: pandoc export silently consumes them; knowledge lost. Bare-word braces survive pandoc.
- **`::label` suffix** — works but has no closing delimiter and collides with `std::vector`-class prose; braces preferred.
- **Block-level relation DSL** (bedrock 20's former sketch) — retired: separates the triple from the prose that explains it, so excerpts lose their semantics.

## Migration / rollback

No migration needed: wikilinks are greenfield (no surface renders them yet). Rollback before the semantic-graph path lands is a doc change; after it lands, labels degrade to visible prose and can be stripped by a reviewable batch patch (never silently).

## Links

- Bedrock 20 (patched same day) — doctrine this grammar serializes
- `atomik-project/brainstorm/2026-08-03-brainstorm-session.md` — owner frame, collision tests, direction/vocabulary rulings
- `atomik-project/sessions/2026-08-04-cp-mvp-008-closing-ceremony.md` — the gate that approved this ADR
- ADR-007 — deterministic-first retrieval (the edge index joins that ladder)
