---
type: Atomik Session Record
title: CP-MVP-010 closing ceremony — retrieval accepted; CP-MVP-011 remains next; no roadmap amendment
timestamp: 2026-08-17T00:00:00Z
path: CP-MVP-010
ceremony: closing
---

# CP-MVP-010 closing ceremony (2026-08-17)

Run per `docs/bedrock/22_22-agent-handoff.md` §Around every path and
`atomik-project/coding-paths/paths.md` §Merging. The recall was derived from
the coding-path register, CP-MVP-010 ledger, opening-check record, acceptance
records, evaluation record, and repository history — never from conversation
memory.

## Recall — what this path achieved

1. **Retrieval baseline** — dependency-free, field-aware BM25F over path,
   filename, title, headings, frontmatter, link text, and body; Unicode
   diacritic folding, phrase positions, title/subject rules, and the
   `titles · linked · full` reach ladder.
2. **Projection lifecycle** — lazy rebuildable retrieval index, byte-identical
   rebuilds, per-file patching where safe, and one index-change broadcast that
   also refreshes graph consumers. Files remain canonical.
3. **Graph + packet** — budgeted typed-edge expansion; inspectable context
   packets with stage/reason/score, explicit omission reasons, missing terms,
   and a `covered · thin · empty` verdict.
4. **Grounded chat** — deterministic retrieval before generation, per-turn
   packet disclosure, persisted citation maps, clickable source markers, and a
   source list. Old chats and prompt machinery cannot become grounding
   material for their own output.
5. **Retrieval surface** — ranked search across the existing perimeters, a
   visible explanation of why each result matched, reach control, packet
   inspection, and vault-wide broken-link diagnostics.
6. **Evidence and cost** — privacy-safe retrieval ActionTrace lines and a
   14-case fixture evaluation: recall@5 100%, MRR 0.955. The real 115-file
   corpus built in 154–167 ms, queried at p95 0.4 ms, and serialized to 8.4
   MiB. D15 records the actual workflow and its external next-path branch.
7. **Owner-bench corrections** — retrieval noise, subject/title distinctions,
   conversation scope, citation rendering, exact sentence ranges, centred
   conversation geometry, decimal points, and complete multi-sentence quoted
   passages were all corrected and re-benched. Chat claim overlays were
   disabled by owner ruling until their M6 replacement can be sound.

Final branch state before rebase: 927 passing tests across 74 files, one
intentional skip; typecheck, build, retrieval evaluation, and protocol check
green.

## Backlog presented

- **Already next:** CP-MVP-011 — Wikipedia extraction, Wikidata entities in the
  same graph, Commons P18 with licence/attribution, Wiktionary etymology, the
  model-driven tool loop, web citations, and explicit save-as-source.
- **M6:** a sound Truth Lens/claim-offset contract before chat claim marks can
  return.
- **M9:** stemming, reach-default measurement, semantic retrieval, and
  reranking remain experiments that must beat CP-MVP-010's recorded baseline.
- **Measured trigger:** review index storage if it approaches 100 MB; try the
  recorded cheap position-list reductions before SQLite.
- **Still optional/unscheduled:** simple Git status/diff and structural code
  retrieval. `explore_tree` / `file_history` remain CP-MVP-011 opening input,
  not silent expansion of its scope.

## Owner rulings — verbatim

The owner answered the three prompted choices:

> **"1. A ,2. a, 3.A"**

The choices presented and therefore ruled were:

1. **CP10 acceptance → A: accept for merge.**
2. **Next path → A: CP-MVP-011 as already reserved.**
3. **Backlog/roadmap → A: keep the existing triggers and make no roadmap
   amendment.**

Capitalization has no semantic effect; all three answers select option A.

## Roadmap amendments

None proposed or applied. The register already reserves CP-MVP-011 immediately
after CP-MVP-010, while M6, M9, and the storage triggers already own the carried
questions. Adding the same decisions to bedrock 18 would duplicate state rather
than clarify it.

## Next ceremony step

After CP-MVP-010 self-merges, run CP-MVP-011's short opening check. Its major
scope rulings are already recorded in the CP-MVP-010 opening check, but the new
path still receives its own explicit activation confirmation.

## Merge state

Acceptance and the closing ceremony are complete. Remaining sequence: rebase
onto the latest local trunk, rerun every gate on the rebased result, fill the
coherence audit, write the per-entry journal, mark CP-MVP-010 `done`, and
self-merge.
