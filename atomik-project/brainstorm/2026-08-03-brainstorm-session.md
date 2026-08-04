---
type: Atomik Brainstorm Note
title: Brainstorm session — definitive-vault timing · semantic graph relations (framing, syntax, roadmap fit)
timestamp: 2026-08-03T00:00:00Z
status: provisional
---

# 2026-08-03 brainstorm session

Interactive Q/A session with the owner. Nothing here is a decision; promotion channels are listed at the end. Owner directive mid-session: brainstorms are dialogue, persisted once at the end — not per-turn transcription.

## Q1 — When can the definitive vault start (low retrocompatibility risk)?

**Owner question (verbatim):** "when do you think will be the moment where I can really start to use the app with my definitive vault (low retrocompatibility risks unlocked)?"

**Answer (from roadmap 18 + register + invariants):** essentially at CP-MVP-008's close (S07 acceptance). Risk splits in three layers:

1. **Vault content** — safe since M1 by standing invariant (Markdown-first, no hidden DB, no rewrites on open, Git-friendly diffs). No future milestone threatens it.
2. **Derived/meta files** — dossiers (M3–M5) stable; fresh formats = chats-as-files + claims/evidence session meta (008). M6 may impose ONE anchor/evidence migration. Migration = reviewable diff, never loss.
3. **Workspace state / `.atomik/`** — never at risk by construction (rebuildable-only).

The M1+M2 experiential gate (two weeks primary-tool use) makes moving in the closing mechanism, not something that waits on maturity. **Lean:** start the definitive vault at S07 acceptance, under Git from day one; WSLg comfort caveat until the packaged Windows build (reserved post-008 unit).

## Q2 — Semantic graph relations: framing (OWNER CORRECTION — supersedes the first written version of this section)

**Owner intent (verbatim):** "build knowledge and semantic graph relation between notes, (that are mostly concept and ideas content), so yes it is a reference graph but we are building a knowledge tool so it is by nature a semantic and knowledge graph"

**The corrected frame:** notes ARE concepts, so the link graph between notes IS the semantic knowledge graph. There is no "reference tier" that graduates into a "knowledge tier". Typed edges make implicit semantics explicit. The claim/evidence apparatus (bedrock 28 / M6) is an OPTIONAL verification overlay on an edge — never its birth requirement. An edge can live its whole life without it.

**Doctrine divergence flagged:** bedrock 20 currently says "relations are typed semantic claims" — the owner's frame is lighter and needs a reviewed patch to 20 (touching 26/28 wording) to become law.

**Owner UI vision (verbatim essentials):** "every links notes or other type of linked documents (web page, audio transcript, transcript anchor, pdf, pdf anchor, prompt etc..) has a color pill depending on its type and a little icon. after the link label a little plus icon that will propose to add an edge, an input field display by widening temporarly the pills."

**Prompts/anchors as node types is deliberate** — owner (verbatim): "we are building the ultime future learning tool". The graph captures provenance of understanding (concept ← unlocked-by → exact question; ← grounded-at → exact paragraph); also the substrate the deferred spaced-review projection would need.

**Literature kept from the discussion (2025–26: HippoRAG/PPR, GraphRAG variants, Zep/Graphiti, A-MEM/AriGraph, graph-memory surveys):**
- Agent advantage = graph EXPANSION (1–2 hops from lexically-found seeds), not retriever replacement — maps to OKF 26 ladder stage 'link'.
- Bi-temporal edges (created-at / superseded-at; close the interval, never delete) mechanize 20's "contradictory edges coexist".

## Q3 — Vocabulary and direction (owner answers)

- **Labels = owner's own language with autocomplete** (owner: "ok with own language autocomplete"). No imposed ontology; the input autocompletes previously-used labels so the personal vocabulary converges by use. Registry of used labels (with counts) is a rebuildable `.atomik/` index.
- **Direction best practices adopted in discussion:** always store directed, one edge stored once (subject = note being written); symmetry/inverse are properties of the LABEL, not the edge (backlink pane renders the inverse — typed backlinks, fixing Obsidian/Roam's untyped-backlink failure); label registry can later attach "inverse reads as …" metadata, optional and incremental. Broken edge targets = diagnostics, never silent repair (20's rename rule inherited).
- Pill input: default direction current-note → target; tiny ⇄ flip affordance for the rare reverse assertion.

## Q4 — Serialization: inline decoration (owner lean, confirmed by collision testing)

**Owner (verbatim):** "for me it is maybe best to be directy inline decoration because it follows the flow and it is easy template rule to grab on, but in the hand I will favor the solution that is the easiest to be exploited by agent, prompt, and ontology reconstruction"

**Analysis:** inline wins on the owner's own criterion — context co-location welds the triple to the prose sentence that glosses it (best substrate for ontology reconstruction); raw markdown carries semantics into any prompt excerpt for free; parsing is one pass (link + adjacent decoration).

**Collision tests (run through the app's real stack — markdown-it 14 `{html:false, linkify:false, breaks:true}`; Lezer/CM6 braces inert; wikilinks are greenfield, M8 not opened):**
- `[[attention]]{normalizes}` — ZERO collisions; degrades informatively (visible text) in GitHub/Obsidian/pandoc.
- `<!--rel:label-->` — ELIMINATED: `html:false` renders comments as escaped visible junk in Atomik's own preview.
- `{.label}` pandoc-attr — ELIMINATED: pandoc export would silently consume it (knowledge lost). Bare-word braces survive pandoc.
- `::label` — works but no closing delimiter + `std::vector`-class prose collisions; braces preferred.

**Resulting spec sketch:** `[[target]]{label}` · reverse `[[target]]{^label}` (NOT `{<label}` — gets HTML-escaped) · labels kebab-case `[a-z0-9-]` (kills emphasis-parsing collisions in foreign renderers; autocomplete normalizes "part of" → `part-of`) · immediate adjacency required (space = prose, no false positives) · same decoration after standard md links (`[att](x.md){label}` tested clean → covers pdf/web/transcript/prompt pills) · inline stays light forever — any future evidence/status overlay goes in a sidecar keyed by the triple.

## Q5 — Pills scope

**Owner:** pills render every existing link in every rendered surface of the app; chat surfaces do NOT get the "+" (edge authoring) for now — think later. → pill component built once; authoring is a per-surface capability flag. Edge lifecycle rule applies from day one: create + edit label + flip + delete in the same unit (label chip on the pill is the reverse gesture).

**Open questions (recorded, not decided):** pill density in citation-heavy notes — always-on vs dress-on-hover/read-mode; what edge-birth from chat answers looks like (deferred deliberately).

## Q6 — Roadmap fit

**Owner POV (verbatim):** "strenghten the the app foundation before landing an agent harness that is gonna manipulate all the apps possibilities, to manage, curate and expand my knowledge"

**Fit:** the graph slice IS the foundation-strengthening — the agent harness needs a map (OKF), traversable edges, scoped retrieval with inspectable packets (M8), and the patch pipeline (exists since M2). Proposed sequence: 008 closes → definitive vault + experiential gate → packaged Windows build (reserved) → post-008 path FRONT HALF = graph foundation (wikilink grammar + `{label}` + pills + rebuildable nodes/edges index + backlinks — early, because the definitive vault accumulates `[[links]]` from day one that currently wouldn't render) → BACK HALF = retrieval over the graph (FTS5 + link expansion, context packets) → Wikidata slice joins the SAME nodes/edges tables → M6 overlay → agent harness on top, by which time the vault has real edges + a converged vocabulary.

## How this session impacts implementation (promotion channels)

1. **008 closing ceremony** — this session arrives as a concrete amendment proposal to the recorded post-008 candidate (graph foundation as its front half, before the Wikidata half).
2. **Bedrock/ADR patches (owner-gated)** — (a) bedrock 20 doctrine patch: edges are light semantic structure, claims optional overlay; (b) ADR for the edge grammar (`[[target]]{label}` spec + collision evidence) — a format the definitive vault will depend on.
3. **Next coding path steps** — grammar built once across markdown-it + Lezer; pills with per-surface authoring flag; edge lifecycle complete; autocomplete registry. Confirmed feature-by-feature at the opening check.

Until those gates pass, nothing here binds.
