---
type: Atomik Session Record
title: CP-MVP-010 acceptance — vault retrieval, grounded chat, and citation behavior accepted on the owner's live bench
timestamp: 2026-08-17T00:00:00Z
---

# CP-MVP-010 acceptance (2026-08-17)

Acceptance follows the cumulative owner bench recorded in the path ledger and
the final S10i/S10j corrections on the lane-isolated CP-MVP-010 app.

## Owner half — accepted

The final re-bench reused the EXISTING persisted chat, which is the stronger
case: no new conversation or migration-free fixture hid the behavior. It
confirmed all three final corrections together:

- the conversation column is centred while user turns remain right-aligned and
  Atomik turns remain left-aligned inside it;
- a decimal point such as the one in `€77.5` is not a citation boundary;
- a closing citation on a multi-sentence blockquote covers the complete quoted
  passage, while an inline citation followed by more prose remains
  sentence-scoped.

After that bench the owner answered **"ok it works"**. In the required closing
prompt, option 1 was the explicit whole-path verdict:

> **"1. A ,2. a, 3.A"**

Option 1A was **Accept CP10 for merge**. No known owner-bench behavior remains
open inside CP-MVP-010.

## Agent half — verified

- The production branch carries the pure TypeScript BM25F engine, rebuildable
  and incrementally maintained indexes, graph expansion, bounded context
  packets, coverage/omission diagnostics, retrieval traces, grounded chat,
  inspectable packets, citations, ranked search explanations, and vault-wide
  broken-link diagnostics described by the path definition of done.
- The in-repo evaluation reports 100% recall@5 (13/13) and MRR 0.955. The dated
  115-file bench remains the storage/performance baseline future retrieval
  stages must beat.
- Final pre-ceremony verification passed: 927 tests across 74 files (one
  intentionally skipped), typecheck, production build, retrieval evaluation,
  and `cairn-check`. The only protocol advisory was the expected pre-merge
  coherence-audit record.

## Accepted carry-forward boundaries

- Chat claim marks remain disabled until M6 can replace rendered-text
  re-location with a sound Truth Lens contract.
- Index storage is watched against ADR-013's 100 MB trigger; no SQLite, stemmer,
  reranker, embedding stage, or hub penalty is justified without measured
  evidence against this baseline.
- The networked/tool-loop half was deliberately split into CP-MVP-011 and is
  not a CP-MVP-010 acceptance gap.

## Merge state

Human acceptance is complete. Remaining work is mechanical: record the closing
ceremony, rebase onto the latest local trunk, rerun the gates on that exact
result, fill the coherence audit, write the merge journal entry, mark the path
`done`, and self-merge.
