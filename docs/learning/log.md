---
type: Atomik Folder Log
title: Log — docs/learning
description: Recent meaningful changes to the beginner-first learning layer, per the OKF folder convention.
tags: [log, okf, learning]
timestamp: 2026-08-24T00:00:00Z
---

# Log — `docs/learning`

Recent meaningful changes in this scope: the beginner-first learning layer. The companion map is
[index.md](./index.md). An agent reads the index before opening many files, and
this log when recency matters or when re-entering after time away
([bedrock 26](../../docs/bedrock/26_26-okf-agent-context.md)).

Seeded 2026-08-24 (CP-OPS-002 S05c) from Git history: the 15 most recent of 45 commits that touched this folder, newest first, merges omitted because a merge names the path rather than the change.

**Append newest-first, at the top, in the same work unit as the change.** Git
remains the complete record; this is the readable one. If two paths ever start
colliding on this file, it takes the amendment the journal already took — one file
per entry in a `log/` subfolder — which was a concurrency fix, never a size one.

## 2026-08-24

- `382ba30` CP-WORKTREE-CLEANUP S01: retire worktree after verified merge
- `23c1422` CP-OPS-001 S11: close path and repair done-state gate
- `9ea45db` CP-OPS-001 S09: push every step as a session boundary

## 2026-08-20

- `6deb103` CP-OPS-001 S08: register paths before branching

## 2026-08-17

- `9336af4` CP-RICH-MARKDOWN S07: make the renderers work in the real app
- `b9d54b3` CP-RICH-MARKDOWN S06: render rich code with decoration-only diagnostics
- `9ccc036` CP-RICH-MARKDOWN S05: render secure Vega-Lite charts
- `66c7bda` CP-RICH-MARKDOWN S04: render secure Mermaid diagrams
- `92d78f6` CP-RICH-MARKDOWN S03: render safe KaTeX math
- `657befd` CP-RICH-MARKDOWN S02: record rebased verification
- `ebab85e` CP-RICH-MARKDOWN S02: add lazy projection registry

## 2026-08-16

- `95edf15` CP-MVP-010 S02 — the lexical core: BM25 over six fields, no database
- `99cac04` CP-PROVIDERS — multi-provider AI generation, OpenRouter gateway, direct adapters, and settings panel

## 2026-08-15

- `92f25cb` CP-OPS-001 S01–S04f — Cairn: parallel coding paths, self-merge, and the CI that enforces it

## 2026-08-13

- `1c8c9f1` CP-MVP-009 S07b (owner bench round 11: a type filter on the strip, and titles instead of file names): TWO reports. (1) "we might need type filter to display only what we need" — folder indexes link every note and notes link sources, so the strip gains one pill per kind ACTUALLY PRESENT (never a fixed menu), each wearing its own kind's colour so the legend IS the control; hiding is a VIEW act (kindsPresent/filterNeighborhood pure — the index and the neighbourhood keep the whole truth), the bar reports the full counts plus "· N hidden" so a filtered strip can never read as an empty one, everything-hidden gets its own honest message, and the hidden kinds persist per TAB on the same 03 rung as the disclosure bit. (2) "we need to display first title of note pills instead of file name, looks like it is not always the case" — TWO causes, only one of them in the pills: (a) ROOT — firstHeadingOf was start-anchored while the owner's ethos.md opens on " # L'ethos" (ONE leading space); markdown-it renders that as an H1 (CommonMark allows three), so the reader showed the title while every title CONSUMER fell back to the stem. The rule now takes the indent the renderer takes and drops a closing hash run, which fixes the strip centre, the relation sentences and the wikilink candidates in one edit; (b) pills showed the AUTHORED text, which for every @-menu link is the file's name — pillDisplayText NEW (pure, shared by read and live) shows the target's title when the authored text NAMES THE FILE (stem/path, case-insensitive, percent-DECODED: markdown-it encodes accented hrefs, which is why the first pin still read "crédibilité"), and leaves deliberate wording alone so a pill inside a sentence keeps the sentence's words. Deviation: a bundle contract file keeps its authored text (source.md is titled "Source dossier" — swapping would lose the slug). Dev CDP pin on a fresh copy of the owner's real vault: ethos.md offers note 2 · chat 1 · folder 1 · web 1, hiding folder drops the vault-juju chip and the bar reads "1 in · 4 out · 1 hidden", the choice survives a note switch; read AND live both now show "La crédibilité"/"La fiabilité" where they showed the file names, and the strip centre reads "L'ethos". Module note + learning note 20 postscript; 732→751/63, typecheck/build green.
