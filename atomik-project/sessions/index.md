---
type: Atomik Index
title: Session records — ceremonies, rulings and bench passes
description: How to find a session note without reading fifty-three of them: the naming convention, the ceremony declaration a blocking gate reads, and the ceremony table by path.
tags: [sessions, ceremonies, index, okf, cairn]
timestamp: 2026-08-24T00:00:00Z
---

# Session records

Everything the owner and an agent decided together, persisted verbatim rather than
left in a chat. Fifty-three files and growing: **the naming convention is the
catalogue**, not a list here.

```text
YYYY-MM-DD-<path-id>-opening-check.md      the activation ceremony
YYYY-MM-DD-<path-id>-closing-ceremony.md   the acceptance ceremony before self-merge
YYYY-MM-DD-<path-id>-<subject>.md          rulings, bench passes, decisions mid-path
YYYY-MM-DD-<subject>.md                    work that predates or spans paths
```

## The ceremony declaration

A ceremony is DECLARED in root-level frontmatter, never inferred from a filename:

```md
path: CP-EXAMPLE-001
ceremony: closing
```

The schema is pinned in
[bedrock 24](../../docs/bedrock/24_24-doc-templates.md#session-note-and-ceremony-template).
`cairn-check`'s **blocking** `ceremony` rule refuses a path marked `done` with no
note declaring `ceremony: closing` for its exact id — with no integrator, this is
the last human guard before a merge. It used to substring-match filenames, which
made it a tautology: an opening-check note exists from a path's first hour, so the
rule verified that a path had been OPENED and reported that as proof it was CLOSED
(audit 2026-08-24, F2 · [ADR-016](../../docs/adr/ADR-016-cairn-enforcement-integrity.md)).

**Asymmetry, stated rather than hidden.** Sixteen closure notes were backfilled with
the declaration because a gate reads them. Opening checks are not machine-checked,
so most older ones carry no `ceremony: opening` key and are marked *(undeclared)*
below; new ones declare it. Nothing depends on it today.

A mid-path note that is not a ceremony carries `path:` and deliberately **no**
`ceremony:` key — for example the
[S06b rescope ruling](./2026-08-24-cp-ops-002-s06b-rescope.md).

## Ceremonies by path

| Path | Opening | Closing |
| :-- | :-- | :-- |
| CP-AI-CAPABILITIES | [opening](./2026-08-19-cp-ai-capabilities-opening-check.md) *(undeclared)* | [closing](./2026-08-20-cp-ai-capabilities-closing-ceremony.md) |
| CP-FEEDBACK | [opening](./2026-08-16-cp-feedback-opening-check.md) *(undeclared)* | [closing](./2026-08-16-cp-feedback-closing-ceremony.md) |
| CP-MVP-003 | — | [closing](./2026-07-13-cp-mvp-003-acceptance.md) |
| CP-MVP-004 | — | [closing](./2026-07-07-cp-mvp-004-acceptance.md) |
| CP-MVP-005 | — | [closing](./2026-07-08-cp-mvp-005-acceptance.md) |
| CP-MVP-006 | — | [closing](./2026-07-16-cp-mvp-006-acceptance.md) |
| CP-MVP-007 | — | [closing](./2026-07-21-cp-mvp-007-acceptance.md) |
| CP-MVP-008 | — | [closing](./2026-08-04-cp-mvp-008-closing-ceremony.md) |
| CP-MVP-009 | [opening](./2026-08-04-cp-mvp-009-opening-check.md) *(undeclared)* | [closing](./2026-08-13-cp-mvp-009-closing-ceremony.md) |
| CP-MVP-010 | [opening](./2026-08-16-cp-mvp-010-opening-check.md) *(undeclared)* | [closing](./2026-08-17-cp-mvp-010-closing-ceremony.md) |
| CP-OPEN-DOCK | [opening](./2026-08-20-cp-open-dock-opening-check.md) *(undeclared)* | [closing](./2026-08-20-cp-open-dock-closing-ceremony.md) |
| CP-OPS-001 | [opening](./2026-08-14-cp-ops-001-opening-check.md) *(undeclared)* | [closing](./2026-08-24-cp-ops-001-closing-ceremony.md) |
| CP-OPS-002 | [opening](./2026-08-24-cp-ops-002-opening-check.md) | — |
| CP-PROVIDERS | [opening](./2026-08-16-cp-providers-opening-check.md) *(undeclared)* | [closing](./2026-08-16-cp-providers-closing-ceremony.md) |
| CP-RENDER-REPAIRS | [opening](./2026-08-20-cp-render-repairs-opening-check.md) *(undeclared)* | [closing](./2026-08-20-cp-render-repairs-closing-ceremony.md) |
| CP-RICH-MARKDOWN | [opening](./2026-08-17-cp-rich-markdown-opening-check.md) *(undeclared)* | [closing](./2026-08-17-cp-rich-markdown-closing-ceremony.md) |
| CP-WORKTREE-CLEANUP | [opening](./2026-08-24-cp-worktree-cleanup-opening-check.md) *(undeclared)* | [closing](./2026-08-24-cp-worktree-cleanup-closing-ceremony.md) |

Early paths (CP-MVP-001/002) closed before session notes were a rule; the
`ceremony` gate is scoped to the paths a change touches for exactly that reason —
punishing history for a convention it predates is the fastest way to get a check
switched off.

## Everything else

Bench passes, owner rulings, decision records and investigations, in the same
directory and the same date-first naming. They are found by date and path id, or
through the path that cites them: a path file links every session note that
changed it.
