---
type: Atomik Folder Log
title: Log — docs/agents
description: Recent meaningful changes to the agent documentation contract, per the OKF folder convention.
tags: [log, okf, agents]
timestamp: 2026-08-24T00:00:00Z
---

# Log — `docs/agents`

Recent meaningful changes in this scope: the agent documentation contract. The companion map is
[index.md](./index.md). An agent reads the index before opening many files, and
this log when recency matters or when re-entering after time away
([bedrock 26](../../docs/bedrock/26_26-okf-agent-context.md)).

Seeded 2026-08-24 (CP-OPS-002 S05c) from Git history: the 2 most recent of 2 commits that touched this folder, newest first, merges omitted because a merge names the path rather than the change.

**Append newest-first, at the top, in the same work unit as the change.** Git
remains the complete record; this is the readable one. If two paths ever start
colliding on this file, it takes the amendment the journal already took — one file
per entry in a `log/` subfolder — which was a concurrency fix, never a size one.

## 2026-09-01

- `CP-OPS-002 S08o` repoints the live agent index and first-session prompt from
  the former bedrock-owned procedure to the portable Cairn execution protocol,
  portable path convention and explicit Atomik binding.

## 2026-08-24

- `d6b29f1` CP-OPS-002 S05b: gate the opening check, finish the OKF backfill

## 2026-07-06

- `4675233` v0.6 bedrock: dual-plane repository seed (ADR-009)
