---
type: Atomik ADR
title: 'ADR-013: Lexical retrieval without a database — a pure BM25 core'
description: The lexical baseline is a dependency-free TypeScript core with the main process owning only I/O; SQLite/FTS5 is deferred until measurement, not preference, asks for it.
tags: [adr, retrieval, bm25, lexical, performance, dependencies]
timestamp: 2026-08-16T00:00:00Z
adr:
  id: ADR-013
  status: accepted
  date: 2026-08-16
---

# ADR-013: Lexical retrieval without a database — a pure BM25 core

Status: accepted
Date: 2026-08-16

## Context

M8's back half (CP-MVP-010) builds the retrieval baseline the whole ladder rests on. Bedrock 33 §First retrieval implementation and ADR-007 both name "ripgrep or SQLite FTS5/BM25" as the shape of that baseline, and CP-MVP-009's S01 pin recorded the expectation explicitly: *"SQLite arrives with the retrieval/Wikidata path and the index migrates then (rebuildable = free migration)."*

Three facts made that expectation worth re-deciding rather than inheriting:

- **The corpus is note-scale.** The owner's real vault at CP-MVP-009's acceptance: 133 files, 351 edges, 240 external targets. A whole-vault scan of it already runs inside a frame budget; the graph index rebuilds it byte-identical on demand.
- **SQLite is not free in Electron.** `better-sqlite3` is a native module rebuilt per Electron version (ABI churn at every upgrade, and the app currently ships zero native dependencies). Node's built-in `node:sqlite` is still flagged experimental in this runtime and its FTS5 availability depends on build flags Atomik does not control — a baseline that must not be in doubt should not rest on an unverified compile option.
- **The repository already has the shape that works.** `shared/graph-core.ts` is pure, dependency-free, and unit-tested without a DOM or an Electron host; the main-side seat only does filesystem work and persistence. A retrieval core built the same way inherits that testability, and BM25 over an inverted index is a well-specified ~200-line algorithm, not a research project.

Owner ruling at the CP-MVP-010 opening check (2026-08-16): **pure TypeScript BM25 core, zero dependency**, explicitly overriding the CP-MVP-009 pin.

## Decision

The lexical retrieval baseline is a **pure, dependency-free TypeScript core** — `apps/desktop/shared/retrieval-core.ts` — holding the tokenizer, a field-aware inverted index, BM25 ranking, phrase/exact matching, and snippet extraction. It is a sibling of `graph-core`, obeys the same rules (no filesystem, no Electron, no DOM), and is the single engine behind every search perimeter the app already exposes (vault, project bundle, docs).

The main-side seat owns only I/O: collecting files, maintaining the index incrementally on the write verbs, and persisting a rebuildable projection under `.atomik/index/` (04's layout). The index is derived state in the strict sense of 33 and 03 — delete it and the next read rebuilds it identically.

**SQLite/FTS5 is deferred, not rejected.** It becomes the right answer when measurement — not preference — says so. The evaluation set and the dated real-vault bench built in the same path are what will say it. Recorded trigger thresholds, to be checked against the bench record rather than guessed at again:

```text
cold index build      > 2 s on the owner's real vault
p95 query latency     > 50 ms
resident index size   > 100 MB
corpus                > ~5,000 notes or ~50 MB of markdown
```

Any one of them crossing is the signal to open a storage path; none of them crossing is the answer to "shouldn't this be a database?".

## Consequences

- Zero new dependencies, no native rebuild coupled to Electron upgrades, no experimental runtime flag in the critical path (15).
- The core is unit-testable without a host, so retrieval behaviour is pinned by fast tests rather than by an app run — the same property that let the graph grammar be trusted.
- Ranking is inspectable: every hit can say which field matched and with what contribution, which is what makes the packet's "why this entry" honest rather than decorative.
- Atomik owns its scoring, so field weights, diacritic folding, and the vault's own structure (titles, headings, frontmatter, link text) are first-class inputs instead of things fought against inside a general-purpose engine.
- The cost is real: BM25, tokenization and snippeting are Atomik's to maintain and to get right, and a naive implementation can be slower than a C library at scale. The evaluation set exists partly to keep that honest.
- The retrieval index and the nodes/edges index are siblings maintained by one path through the write verbs; neither is canonical, both are rebuildable.

## Alternatives considered

- **SQLite FTS5 via `better-sqlite3`** — the named default in 33/ADR-007. Rejected for now: a native dependency rebuilt per Electron version, for a corpus that does not need it.
- **`node:sqlite`** — no third-party dependency, but experimental in this runtime and with FTS5 availability dependent on build flags outside Atomik's control.
- **ripgrep subprocess** — fast on large trees, but ships a binary, is awkward to make field-aware, and still leaves ranking to be written.
- **A search library (MiniSearch, lunr, FlexSearch)** — a dependency and a foreign document model for roughly the amount of code the core needs anyway, against 15's zero-dependency bias.
- **Embeddings first** — forbidden by 33 and ADR-007 before the lexical baseline is evaluated; the evaluation set built here is exactly the gate that could unlock them later.

## Migration / rollback

Indexes are rebuildable derived state, so swapping the engine is a local change behind the `RetrievalQuery` / `RetrievalHit` / `ContextPacket` contract: delete `.atomik/index/`, change the seat, rebuild. No vault file changes, no canonical migration, no user-visible data at risk. That is precisely why deferring the database costs nothing.

## Links

- `33_33-retrieval-local-execution-cost.md` — the ladder, the evaluation gates, the cost model
- `26_26-okf-agent-context.md` — the ContextPacket shape this engine feeds
- ADR-007 — hybrid retrieval and optional semantic indexes (this ADR refines its MVP implementation note)
- `atomik-project/sessions/2026-08-16-cp-mvp-010-opening-check.md` — the ruling that overrode CP-MVP-009's SQLite pin
- `atomik-project/coding-paths/CP-MVP-010.md` — the path that implements it
