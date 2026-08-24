---
type: Atomik Index
title: Research records — dated external evidence
description: Investigations into things outside this repository, each pinned to the date it was true, with the trigger that says when to look again.
tags: [research, evidence, index, dated, okf]
timestamp: 2026-08-24T00:00:00Z
---

# Research

Evidence about the world outside this repository: providers, prices, models,
libraries, measurements. Two properties separate a research note from a decision:

```text
DATED      a volatile fact carries the date it was checked
TRIGGERED  and the condition that says when to look again
```

A research note never decides anything. When one changes what Atomik does, the
decision is recorded in [`docs/adr/`](../adr/index.md) and the doctrine in
[`docs/bedrock/`](../bedrock/index.md); the note stays as the evidence behind it.
Prices and model ids in particular are quoted with their snapshot date, and an
ActionTrace that reports a cost names the snapshot it used (ADR-008).

## Records

- [model-research.md](./model-research.md) — provider models, context windows,
  dated price snapshots and residency. Cited by the generation adapters for the
  `priceSnapshotId` in every cloud trace.
- [openrouter-vs-direct-providers.md](./openrouter-vs-direct-providers.md) —
  aggregator versus direct provider accounts: pricing, terms and data handling.
- [retrieval-baseline-2026-08-16.md](./retrieval-baseline-2026-08-16.md) — the
  first dated measurement of recall and ranking on the in-repo evaluation set;
  the baseline ADR-013 defers SQLite/FTS5 against.
- [ai-chat-ui-practices.md](./ai-chat-ui-practices.md) — how other chat surfaces
  handle context, cost display and transcript structure.
