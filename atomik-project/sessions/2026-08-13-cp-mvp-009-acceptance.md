---
type: Atomik Session Record
title: CP-MVP-009 acceptance — owner bench validated; agent sweep of the definition-of-done intents on a copy of the real vault
timestamp: 2026-08-13T00:00:00Z
---

# CP-MVP-009 acceptance (2026-08-13)

Owner, after the S07 bench rounds: **"bench is ok, go on you half."**
This record is the closing sweep — the owner half validated against
the bench trail, the agent half re-driven with real events on a COPY
of the live vault, honest gaps carried forward in writing.

## Owner half — validated across thirteen live bench rounds

The bench was never a separate sitting: every intent was exercised
inside the rounds on the owner's real vault, then validated
cumulatively today.

- **Author edges in real notes** — rounds S05b–S05e (the "+" on the
  pill, the widening input, the dropdown), S06b (target titles in the
  sentence). Owner validation on the rendering/authoring surface was
  already recorded verbatim at S05: *"YES I LOVE U IT WORKS
  perfectly."*
- **Autocomplete convergence on the owner's own language** — S05c/S06
  (document vocabulary → vault-wide registry, most-used first).
- **Flip and delete** — S05d/S05e, the lifecycle completed in place.
- **The relations strip** — S07 (mini-graph over list, owner ruling),
  S07b (type filter + titles), S07c (one bar), S07d (source names,
  forms, the missing snapshot and original URL).
- **Rename refactor over a linked note** — benched live during
  CP-MVP-007 and re-driven by the agent half below.
- **Index delete → rebuild** — agent half below; the owner never has
  to see it work, which is the point of a rebuildable projection.

## Agent half — the definition-of-done intents, driven on a copy

Dev-mode CDP, isolated user-data-dir and state dir, a fresh copy of
`vault-juju` (133 files). The owner's own instance untouched.

| intent | evidence |
| --- | --- |
| Grammar + collision suite | 767 unit tests green, gates bare |
| Index is a rebuildable projection | 133 files → 133 nodes (103 md), 351 edges (240 external), 0 broken; two builds from the same files = **byte-identical JSON** |
| Bundle naming | "Curlew sandpiper - Wikipedia", "mml-book", "JF_Quote_00019462271-1", forms dossier · index · reader text · snapshot · media · original |
| Pill + "+" on the live surface | `orgasm+` on a real untyped md link |
| Vault-wide vocabulary in the widened pill | `["repose-sur","discute-dans","explained-in","is-opposed-to","is-written-in"]` — the owner's five labels, most-used first |
| ADD: one clean diff, kebab-normalized | typed "Explique Que" → `[orgasm](<orgasm.md>){explique-que}` |
| FLIP | → `{^explique-que}`, nothing else moved |
| EDIT | → `{cause-de}` replaced in place |
| DELETE | → `[orgasm](<orgasm.md>)` — the decoration goes, the LINK stays |
| Read ↔ live parity | same pills, same kinds on both surfaces |
| Chat surfaces render-only | no authoring affordance in the chat pane |
| Rename = previewed refactor (27) | preview counted **3 links in 3 notes** and showed them in the confirm gate; applying rewrote the md link (`(<La crédibilité.md>)`, authored text untouched) AND the wikilink (`[[La crédibilité]]{atteste}`, decoration intact); index rebuilt to 134 nodes, 0 broken |

One defect the sweep itself caught and fixed: a non-markdown form kept
its extension in its label ("original.pdf" instead of "original").

## Deviations carried out of the path (for the ceremony)

1. **No vault-wide broken-links list** — the dashed pill remains the
   only diagnostic (deferred twice by owner ruling; the real vault
   reports 0 broken).
2. **The strip has no push refresh** — it re-reads on note change and
   on content change; an edge authored in ANOTHER pane is not
   reflected until then (no push channel exists from the index seat).
3. **Live md links keep their text treatment** while read renders full
   pills — read↔live *pill* parity was deferred at S04; the sentence
   and the pill TEXT are identical since S06b/S07b.
4. **In-text pills keep the authored slug for bundle links** —
   `[curlew-sandpiper-wikipedia](…/source.md)` does not become
   "Curlew sandpiper - Wikipedia | dossier" (the graph does).
5. **Index rebuild is whole-vault** — per-file patching was recorded
   at S06 as worthwhile once M8 retrieval lands.

## What this path leaves behind

The tables the next path joins: `shared/graph-core.ts` (the pure
index), `electron-main/graph-index.ts` (the seat + one read-only IPC
channel), and a first consumer that proves the read contract
(`relations-graph.ts` — pure neighbourhood + layout, which the studio
canvas can re-render without touching the data).
