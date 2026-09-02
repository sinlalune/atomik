---
type: Atomik Session Record
title: CP-MVP-009 opening check — four features confirmed as drafted; index storage decided (JSON sidecar)
timestamp: 2026-08-04T00:00:00Z
---

# CP-MVP-009 opening check (2026-08-04)

Run per 22 §Between paths, same day as the 008 closing ceremony that
confirmed this path. One prompted confirmation per major feature;
owner answers recorded verbatim. Draft committed before the check
(38cb117); deltas would have amended the path before the base commit
pins — none were needed.

## Confirmations (owner, verbatim options chosen)

1. **Scope** → **"Foundation only"** — grammar, pills, edge
   authoring, index, typed backlinks in this path; retrieval over
   the graph + the Wikidata slice open as the NEXT path on the same
   tables (thinness rule).
2. **Grammar + pills** → **"Confirmed as drafted"** — ADR-011
   inline grammar rendered on every surface via the single
   note-markdown factory; type-colored pill + icon on every rendered
   link; label chip on typed edges; unresolved targets = visible
   diagnostic, never auto-created.
3. **Edge authoring + vocabulary** → **"Confirmed as drafted"** —
   "+" on the pill with widening input; own-language label
   autocomplete (kebab-normalized registry with counts, no imposed
   ontology); ⇄ flip; edit/delete complete the lifecycle; chat
   surfaces render-only for now.
4. **Index storage** → **"JSON sidecar"** — main-side scan,
   in-memory graph, rebuildable `.atomik/` JSON cache, zero new
   dependency; SQLite arrives with the retrieval/Wikidata path and
   the index migrates then (rebuildable = free migration). Recorded
   as an S01 pin.

## State

Both gap ceremonies are now recorded (closing:
`2026-08-04-cp-mvp-008-closing-ceremony.md`; opening: this note).
The path awaits the owner's explicit activation, which pins the base
commit and starts S01.
