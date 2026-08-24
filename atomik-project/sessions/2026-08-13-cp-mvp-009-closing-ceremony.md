---
type: Atomik Session Record
title: CP-MVP-009 closing ceremony — deviations ruled by the agent at the owner's delegation; next path = the M8 back half (retrieval over the graph)
timestamp: 2026-08-13T00:00:00Z
path: CP-MVP-009
ceremony: closing
---

# CP-MVP-009 closing ceremony (2026-08-13)

Run per 22 §Between paths, immediately after the acceptance record
(`2026-08-13-cp-mvp-009-acceptance.md`). Recall derived from repo
metadata — the ledger, the acceptance record, log.md — never from
conversation memory.

## Recall — what this path did

The vault's links became the visible, typed semantic graph:

- ADR-011's inline grammar parsed by ONE shared module feeding both
  markdown-it and CodeMirror (the grammar cannot fork per surface).
- Every rendered link is a type pill with its kind icon; typed edges
  wear their label chip; unresolved targets stay a dashed diagnostic.
- The edge lifecycle lives on the pill: add · edit · flip · delete,
  each one clean diff, with autocomplete over the owner's OWN
  vocabulary (vault-wide, most-used first).
- A rebuildable nodes/edges index behind one read-only IPC channel,
  invalidated by every write verb, byte-identical on rebuild.
- Rename carries wikilinks through the same previewed refactor.
- The relations strip: the note seen from the other end of its edges,
  as a 1-hop mini-graph (owner ruling over the drafted list), with a
  type filter and source bundles that show their name and forms.

Tests 702 → 767 over the path; typecheck, build and smoke green at
every step; thirteen owner bench rounds absorbed along the way.

## Ruling 1 — the five carried deviations

Owner, asked which the next path should close: **"Fix what you think
is needed, all to nothing spectrum allowed."** The judgment, and its
reasons:

1. **Live md links keep their text treatment** → **ALREADY CLOSED, not
   debt.** The acceptance parity check found live and read rendering
   the same pills with the same kinds; S05's LinkPillWidget covers md
   links, so the S04 deviation went stale without anyone striking it.
   Recorded as closed by verification, not by work.
2. **No push refresh on the strip** → **CLOSE IN THE NEXT PATH, early.**
   Not for the strip's sake: retrieval needs a fresh index far more
   than a side panel does, so the invalidation broadcast is
   infrastructure the back half must build anyway. Doing it there
   costs almost nothing and fixes the strip as a side effect.
3. **Whole-vault index rebuild** → **CLOSE IN THE NEXT PATH.** S06
   already recorded per-file patching as "worthwhile with M8
   retrieval". That moment has arrived: a retrieval index rebuilt
   wholesale on every keystroke-save is the wrong shape.
4. **No vault-wide broken-links list** → **STAY DEFERRED, with a
   trigger.** The real vault reports 0 broken links, so there is
   nothing to hunt. The back half builds a vault-wide scan anyway —
   when it exists, the diagnostics list becomes nearly free and should
   ride it. Re-raise at the NEXT ceremony, not before.
5. **In-text pills keep the authored slug for bundle links** → **NOT
   DEBT: a design decision.** A pill inside a sentence keeps the
   sentence's words; the graph is where canonical naming belongs.
   Promoted from "deviation" to "rule" in the module note.

## Ruling 2 — the next path

Owner: **the back half — retrieval over the graph** (the recommended
sequence, per the thinness rule). The studio canvas stays on the books
as the later consumer of the same index; S07 shipped its note-scale v0
and proved the read contract, which is exactly what the studio needs
to inherit.

Scope to draft from 18 §Milestone 8, minus what CP-MVP-009 already
delivered (wikilinks/backlinks, the link index, passive-proposal
groundwork):

```text
lexical retrieval over the vault (ripgrep or FTS5/BM25 — 33's ladder,
  no vector database before the lexical baseline is evaluated)
link expansion over the nodes/edges tables this path laid
filename / path / heading / frontmatter / link retrieval
inspectable CONTEXT PACKET + omitted-entry diagnostics
retrieval traces: stages, candidates, selected entries, tokens, latency
a small retrieval evaluation set
+ the two deviations promoted above (index invalidation broadcast,
  incremental per-file index patching)
```

Truth slice, unchanged and standing: retrieval relevance is never
truth; supporting and contradicting evidence coexist.

## Roadmap amendments

None proposed. M8's front half is done and its back half is the next
path — the roadmap page needs no edit, which is the outcome the
thinness rule wants. (Roadmap amendments stay owner-gated; nothing was
applied silently.)

## Next ceremony step

The OPENING check for CP-MVP-010 — one prompted confirmation per major
feature before its base commit pins. The draft is written first, then
checked, then activated on the owner's explicit acceptance.
