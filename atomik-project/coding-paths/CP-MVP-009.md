---
type: Atomik Coding Path
title: Semantic graph foundation — inline typed edges, link pills everywhere, rebuildable nodes/edges index, typed backlinks (M8 front half)
description: The vault's links become the visible, typed semantic knowledge graph — ADR-011's inline grammar parsed and rendered on every surface, type pills with edge authoring on link pills, an owner-vocabulary label registry with autocomplete, a rebuildable nodes/edges index, and typed backlinks — so the definitive vault accumulates real edges from day one, before the retrieval and Wikidata slices build on the same tables.
tags: [coding-path, m8, semantic-graph, wikilinks, typed-edges, pills, backlinks, index, adr-011]
timestamp: 2026-08-04T00:00:00Z
atomik:
  id: CP-MVP-009
  status: draft
  current_step: S01
  base_commit: null
---

# Goal

Bedrock 20 (recast 2026-08-04) is law: notes are concepts and the
note-to-note link graph IS the semantic knowledge graph. ADR-011 fixes
the serialization: `[[target]]{label}` inline decoration, reverse
`{^label}`, kebab labels, immediate adjacency, same decoration after
standard md links. But nothing renders a wikilink today, no surface
shows an edge, no index exists, and the definitive vault (started at
008's close, Q1 record) is already accumulating `[[links]]` that die
as plain text.

This path builds the FOUNDATION half confirmed at the 008 closing
ceremony (owner vision 2026-07-21, amended by brainstorm session A
2026-08-03, confirmed 2026-08-04):

1. **Grammar** — one parser for ADR-011's grammar shared by rendering
   (markdown-it) and editing (Lezer/CM6), collision suite from the
   session-A evidence.
2. **Pills everywhere** — every rendered link (wikilink or md link)
   carries a type-colored pill + icon per node type (note, folder,
   chat, prompt, PDF, web, anchor …); a typed edge shows its label
   chip. Owner UI vision verbatim: "every links … has a color pill
   depending on its type and a little icon."
3. **Edge authoring on the pill** — the little "+" after the link
   label proposes adding an edge; input widens the pill temporarily;
   labels autocomplete from the owner's OWN language (registry,
   kebab-normalized); ⇄ flips direction (`{^label}`); edit and delete
   complete the lifecycle (bedrock 03 rule) — each gesture one clean
   diff.
4. **Rebuildable nodes/edges index** — built main-side from vault
   files alone, incrementally maintained by the write verbs, gone =
   rebuilt identical; label registry with counts; broken targets are
   diagnostics, never silent repair or auto-create.
5. **Typed backlinks** — the backlink pane renders inbound edges with
   the label's inverse reading (fixing untyped-backlink tools);
   clicks route through revealNote.

The BACK half — retrieval over the graph (FTS5 + link expansion,
context packets, M8 proper) and the Wikidata slice joining the same
nodes/edges tables (M10 shape, verification layer B) — is the NEXT
path, per the thinness rule. This path lays the tables they join.

# Definition of done

- ADR-011 grammar parses and renders on every surface that renders a
  note (read view, AI panel blocks, inline widget, chat transcripts,
  tab simulation — the note-markdown factory is the single door);
  the collision suite (escaped-HTML comment case, pandoc-attr case,
  adjacency/whitespace, kebab validation, `{^label}`) is green.
- Every rendered link shows its type pill + icon; typed edges show
  the label chip; unresolved targets render as a visible diagnostic
  style (no silent auto-create, no auto-repair).
- Edge lifecycle complete in the same path: add (+ on the pill,
  widening input), edit label, flip direction, delete — each gesture
  lands one clean, previewable diff in the note's markdown.
- Label autocomplete offers the owner's previously used labels
  (registry with counts, rebuildable `.atomik/` artifact) and
  kebab-normalizes free input; `[[` autocompletes note titles.
- Chat surfaces render pills WITHOUT the "+" (per-surface authoring
  capability flag; owner: "think later" for edge birth from chat).
- The nodes/edges index is rebuildable from files alone: delete the
  index artifact → rebuild produces identical content (round-trip
  test, 03 lifecycle rule); no writes on app open; write verbs keep
  it incremental.
- Rename/relocate (27 tracked refactor) rewrites wikilinks with the
  same preview/rollback machinery as md links; dirty-editor guard
  holds.
- Typed backlinks pane per note shows inbound edges with inverse
  label rendering; navigation via revealNote/revealSource contracts.
- Direction doctrine holds everywhere: stored once, directed,
  subject = the authoring note; symmetry/inverse live on the LABEL.
- Module notes, learning notes (17 first-use rule), log.md, and this
  ledger updated at every step; tests/typecheck/build/smoke green at
  every step; gates run bare (24).

# Documentation coverage

## Required

- 20-relations-future (recast 2026-08-04) — the doctrine this path implements
- ADR-011 — the grammar spec and collision evidence
- 04-file-first-model — links are content; no hidden DB; index = projection
- 11-markdown-page-model — page/frontmatter model the grammar lives in
- 36-ui-design-system — pill/chip recipes, tokens, themes, accessibility floors
- 33-retrieval-local-execution-cost — rebuildable-projection discipline; the ladder the back half will climb
- 26-okf-agent-context — the 'link' ladder stage these edges feed
- 27-git-compatibility — rename refactor, one-gesture-one-diff
- 15-maintainability — zero-dep bias (hand-made grammar rules, no parser dependency)
- 03-workspace-tabs — pane-state precedent for the backlink pane + derived-artifact lifecycle rule
- 17-self-evolving-docs · 18-roadmap (M8) · 22-agent-handoff · 24-doc-templates · 35-coding-path-execution-state — standing execution law
- atomik-project/brainstorm/2026-08-03-brainstorm-session.md — owner rulings verbatim (UI vision, direction, vocabulary, pills scope)

## Conditional

- 13-electron-security + 12-electron-mvp — before ANY new IPC channel (index rebuild/query verbs)
- 14-app-kernels — if the index earns a new main-side module seat
- 05-resource-selection-model — if edge authoring hooks into selections
- 06-ai-patch-pipeline + 02-learning-loop — if AI edge suggestions land inside this path (link proposals, 20 §How links are born)
- 28-truth-evidence-model + 31-truth-lens-ux — ONLY at overlay touchpoints (naming the optional overlay in UI copy); no overlay work here
- 25-use-cases — consult when a scoping doubt needs pressure-testing
- 00-orientation + 01-workbench-first — re-read if any step seems to bend the constitution

## Deliberately excluded

- 07/08/09/10 (source adapters, capture, web, PDF tabs) — pills render over existing link types; adapters and tabs unchanged
- 16-dev-docs-tab — untouched
- 19-dsl-future — block relation DSL retired by ADR-011; DSL out of scope
- 21-canvas-future — graph visualization is a later consumer of the index, not this path
- 29-verification-grounding-router · 30-public-knowledge-dictionary — the Wikidata/verification slice is the NEXT path (back half)
- 32-truth-investigation-record — M6 territory; the overlay stays optional and absent
- 34-local-execution-investigation-record — no local model work in this path
- 23-references — no new external corpus decisions expected

# Execution

- [ ] S01 Bootstrap: read Required docs; verify ledger vs repo reality;
      record the opening-check amendments (below) and the S01 pins —
      grammar constants from ADR-011, node-type → pill taxonomy
      (note, folder, chat, prompt, pdf, pdf-anchor, web, transcript,
      built-in), index storage decision (opening-check Q4), edge
      record shape ({subject, label, object, direction, position})
      — docs-only step. INDEX STORAGE DECIDED at the opening check
      (2026-08-04, owner): JSON sidecar — main-side scan builds the
      in-memory graph, persisted as a rebuildable `.atomik/` JSON
      cache, zero new dependency (15); SQLite arrives with the
      retrieval/Wikidata path and the index migrates then
      (rebuildable = free migration).
- [ ] S02 Grammar core: one pure, dependency-free module parsing
      wikilinks + adjacent `{label}`/`{^label}` + md-link decoration
      into edge records, with serializer; the session-A collision
      suite as unit tests; markdown-it rule + Lezer extension both
      consume THIS module (grammar written once).
- [ ] S03 Pills on every rendered surface: the note-markdown factory
      renders `[[target]]` as a resolved link pill (type color +
      icon, 36 recipes) and the label chip when typed; unresolved
      target = diagnostic style; every HTML surface inherits via the
      single factory (S05g precedent); plain-click navigation routes
      revealNote/revealSource.
- [ ] S04 Editor layer: CM6/Lezer inline decoration in live editing
      (S05d transparency: same typography as the note); `[[`
      autocomplete over note titles; `{` autocomplete over the label
      registry with kebab normalization; per-surface authoring
      capability flag (chat = render-only).
- [ ] S05 Edge authoring on the pill: the "+" affordance (widening
      input, owner vision), edit label, ⇄ flip, delete — full
      lifecycle (03), each gesture one clean diff through the
      ordinary write path.
- [ ] S06 Nodes/edges index + label registry: rebuildable `.atomik/`
      artifact built from a main-side vault scan; incremental
      maintenance in the write verbs; delete→rebuild round-trip
      test; broken-target diagnostics surface; wikilinks join
      computeRelocate so rename/relocate rewrites them behind the
      existing preview (27).
- [ ] S07 Typed backlinks pane: per-note inbound edges with inverse
      label rendering (pane state per 03 precedent); counts; click
      navigates; empty state honest.
- [ ] S08 Acceptance: intents re-run + owner bench on the live vault
      (author edges in real notes, autocomplete convergence, flip,
      delete, backlinks, rename refactor over a linked note, index
      delete→rebuild); review and close (closing ceremony).

# Current checkpoint

```text
base commit : null — DRAFT; pins at owner activation after the
              opening check (22 §Between paths).
changed     : nothing yet.
tests       : n/a (draft).
next action : OPENING CHECK RUN 2026-08-04 (session note
              ../sessions/2026-08-04-cp-mvp-009-opening-check.md) —
              all four features CONFIRMED AS DRAFTED: scope =
              foundation only; grammar+pills as drafted;
              authoring+vocabulary as drafted; index storage = JSON
              sidecar (S01 pin recorded). No deltas. Awaiting the
              owner's explicit activation to pin the base commit and
              begin S01.
blockers    : none.
```

# Blockers

- None. Gap ceremonies: 008 closing ceremony recorded
  (../sessions/2026-08-04-cp-mvp-008-closing-ceremony.md); opening
  check pending below activation.
