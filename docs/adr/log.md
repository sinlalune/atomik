---
type: Atomik Folder Log
title: Log — docs/adr
description: Recent meaningful changes to accepted decision records, per the OKF folder convention.
tags: [log, okf, adr]
timestamp: 2026-08-24T00:00:00Z
---

# Log — `docs/adr`

Recent meaningful changes in this scope: accepted decision records. The companion map is
[index.md](./index.md). An agent reads the index before opening many files, and
this log when recency matters or when re-entering after time away
([bedrock 26](../../docs/bedrock/26_26-okf-agent-context.md)).

Seeded 2026-08-24 (CP-OPS-002 S05c) from Git history: the 15 most recent of 20 commits that touched this folder, newest first, merges omitted because a merge names the path rather than the change.

**Append newest-first, at the top, in the same work unit as the change.** Git
remains the complete record; this is the readable one. If two paths ever start
colliding on this file, it takes the amendment the journal already took — one file
per entry in a `log/` subfolder — which was a concurrency fix, never a size one.

## 2026-08-24

- `3df9073` CP-OPS-002 S05: backfill OKF — five indexes, ADR frontmatter, schema over the decision plane
- `de57b3c` CP-OPS-002: rescope S06b to the enforcement tier model (owner ruling 9)
- `c4a9670` CP-OPS-002 S01: pin the ceremony schema, unify the registration doctrine
- `382ba30` CP-WORKTREE-CLEANUP S01: retire worktree after verified merge
- `9ea45db` CP-OPS-001 S09: push every step as a session boundary

## 2026-08-20

- `6deb103` CP-OPS-001 S08: register paths before branching
- `d7bc91b` CP-RENDER-REPAIRS S06 — close the render repairs path

## 2026-08-19

- `81d2fa7` CP-AI-CAPABILITIES S01: tell the model what the surface renders

## 2026-08-18

- `d137e19` CP-RICH-MARKDOWN S07: a real-Electron smoke lane for the renderers

## 2026-08-17

- `9336af4` CP-RICH-MARKDOWN S07: make the renderers work in the real app
- `b9d54b3` CP-RICH-MARKDOWN S06: render rich code with decoration-only diagnostics
- `9ccc036` CP-RICH-MARKDOWN S05: render secure Vega-Lite charts
- `66c7bda` CP-RICH-MARKDOWN S04: render secure Mermaid diagrams
- `92d78f6` CP-RICH-MARKDOWN S03: render safe KaTeX math
- `b0a85e9` CP-RICH-MARKDOWN S01: pin renderer architecture and baseline
