---
type: Atomik Session Record
title: CP-MVP-010 opening check — the whole retrieval vision ruled in, then split in two; chat RAG is the first consumer; pure-TS BM25 overrides the SQLite pin
timestamp: 2026-08-16T00:00:00Z
path: CP-MVP-010
branch: path/cp-mvp-010
ceremony: opening
---

# CP-MVP-010 opening check (2026-08-16)

Run per 22 §Around every path, on the path the CP-MVP-009 closing
ceremony (2026-08-13) named as next. Draft written before the check;
the answers below amended it BEFORE its base commit pinned. Ten
prompted confirmations across four rounds; owner answers recorded
verbatim where they were free text.

## Round 1 — scope, engine, index, diagnostics

1. **Scope / consumer** → **"Also the Wikidata slice"** — the widest
   option: retrieval + packet + the Wikidata slice joining the same
   nodes/edges tables. Agent flagged that this made the path roughly
   twice CP-MVP-009's size, and built the rest of the check around
   pinning its depth.
2. **Engine + storage** → **"Pure TS BM25 core, zero dep"** —
   a dependency-free field-aware inverted index in `shared/`, same
   discipline as `graph-core`: unit-testable without a DOM, no native
   module rebuilt per Electron version, rebuildable `.atomik/`
   artifact. This **overrides CP-MVP-009's S01 pin** ("SQLite arrives
   with the retrieval/Wikidata path"), which was re-decided here
   rather than inherited. Rebuildable indexes make a later migration
   free, so the pin cost nothing to reverse.
3. **Index upkeep** → **"Both, early at S03"** — per-file patching on
   save/create/delete/relocate for BOTH indexes, plus the
   index-changed push channel. Closes closing-ceremony deviations 2
   and 3; the relations strip's stale refresh dies as a side effect.
4. **Broken-links list (deviation 4 re-raise)** → **"Ride the scan
   now"** — the deferral trigger the ceremony set ("the back half
   builds a vault-wide scan anyway") has fired. Starts as a clean-bill
   panel: the real vault reports 0 broken links today.

## Round 2 — grounding, Wikidata depth, surface, evaluation

5. **AI-panel grounding** → **"No — packet stays inspectable only"**
   (superseded in substance by answer 7: the owner's grounding target
   is the CHAT, not the patch panel).
6. **Wikidata depth** → **"Live lookup → nodes/edges"** — entity
   lookup returning QID, labels, description and key claims, attached
   as a typed edge with provenance; the entity becomes a node in the
   same tables. No multi-GB dump, no re-introduced SQLite.
7. **Surface** → free text, verbatim: *"The first use is definitally
   the RAG, in chat discussion for exemple, the agent harness (current
   state and future true harness) should be able from a given question
   to trigger search or that the user enable the tool wikisearch for
   exemple so that every term is search and context is provided to the
   agent, or that the agent trigger search on specific terms, but it
   need at least to know if : we already have knowledge as note or
   source in the vault or that we need to gather more from wikisearch,
   we should also use externat link source citation of wikipedia or
   other portal. Image, quotation, ethimology, etc every kind of
   augmentation will help us build better attractive and pedagogical
   answer. Then inside the answer it would be cool to directly link
   source or page in the generated text, and same for wikidata
   knowledge, like a AI search engine UI we start to see with google
   AI overview"*.
   This redirected the path: the first consumer is the chat harness,
   not a search panel, and it added a tool loop, four Wikimedia
   augmentations and a citation UI to the scope.
8. **Evaluation corpus** → **"Fixture vault in-repo + a dated bench on
   the real vault"** — the fixture runs in CI and never drifts; the
   bench says what actually happens on real French notes.

## Round 3 — the chat shape

9. **Retrieval trigger** → **"Deterministic pre-pass first, tool loop
   after"** — every chat message retrieves vault context (per-thread
   toggle, packet visible before send) on any model; the model-driven
   `search_vault` / `search_wiki` loop follows over the SAME tool
   contract, so the second is an upgrade rather than a rewrite.
10. **Wikimedia augmentations** → **all four selected**: Wikipedia
    search + article extract · Wikidata entity (QID + claims) ·
    Commons image P18 (with licence + attribution) · Wiktionary
    etymology.
11. **Citations** → **"Both — phrase links plus a source list"**:
    phrase-level links where the model emits them, numbered markers
    otherwise, plus a sources block. Every marker renders as a
    CP-MVP-009 pill.
12. **External material** → **"Transient by default, persist on your
    gesture"** — a "save as source" action turns consulted material
    into a real dossier with revision + accessed_at through the
    existing web-source machinery; no auto-persist (the recorded
    transient-search / fetch-your-own-evidence rule).

## Round 4 — sequencing and activation

13. **Sequencing** → **"Split in two, back-to-back"**. The ruled scope
    was ~13 steps against CP-MVP-009's 8, over the two files the
    convention names as hot (`ipc-contract.ts`, the chat surface), so:

```text
CP-MVP-010  vault retrieval · index upkeep + broadcast · link
            expansion · context packet · traces · chat RAG pre-pass ·
            citations to vault notes · search surface + broken-links ·
            evaluation set        — merges as soon as it is green
CP-MVP-011  Wikimedia augmentation (Wikipedia · Wikidata · Commons ·
            Wiktionary) · the model-driven tool loop · web citations ·
            save-as-source        — opens immediately after, short
                                    opening check (this note already
                                    records its rulings)
```

14. **Activation** → **"Activate now"**. Base commit pinned at
    `2370546`, branch `path/cp-mvp-010`, worktree
    `../4tom1k-cp-mvp-010`, S01 started in the same session.

## Consequences recorded in the path file

- Two rulings bind CP-MVP-010 because of what CP-MVP-011 will do: the
  retrieval entry point is shaped as a TOOL CONTRACT from the start
  (the `search_vault` a model could call, mirroring the shape session
  C reserved for `search_web`), and the citation renderer treats an
  external source as a new source KIND rather than a second renderer.
- The packet reports a COVERAGE VERDICT — "the vault answers this" vs
  "the vault is thin here" — because that is the signal the owner
  named as the minimum the harness must know, and the branch point
  CP-MVP-011's external half will read.
- No roadmap amendment proposed: M8's back half is this path, and the
  Wikimedia slice lands as a labelled-in-substance numbered follow-up
  on the same tables, which is where the register already pointed it.

## State

Both ceremonies of the gap are recorded (closing:
`2026-08-13-cp-mvp-009-closing-ceremony.md`; opening: this note). The
path is ACTIVE as of this note, on its own branch and worktree.
