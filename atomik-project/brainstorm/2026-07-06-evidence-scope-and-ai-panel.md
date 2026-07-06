---
type: Atomik Brainstorm Note
title: Evidence beyond the selection, and where the AI panel lives
description: Owner S10 dogfooding signals — the instinct that evidence should look vault-wide, and AI panel ergonomics. Provisional; nothing here is a decision.
tags: [brainstorm, truth, evidence, retrieval, ai-panel, ux]
timestamp: 2026-07-06T00:00:00Z
---

# Evidence beyond the selection, and where the AI panel lives

Owner signals from S10 dogfooding (2026-07-06), promoted from chat per 17.

## Signal: "I wrote the same sentence in ANOTHER note — why doesn't
## source point there?"

The owner deliberately duplicated a sentence across two notes and expected
the source-backed evidence to acknowledge the other note. Current
semantics are correct and deliberate (S10: derivable from the SUPPLIED
selection only; claiming vault-backing without looking would be the exact
confidence theater the checker forbids) — but the instinct is the roadmap:

```text
reuse loop (02)        term encountered -> deterministic vault lookup
                       (titles/aliases/headings) -> propose the existing
                       note as a link — the vault is rung zero
hybrid retrieval (M8)  lexical/link/structural retrieval feeding context
                       packets; evidence can then cite OTHER notes, and
                       the 26 trigger (context beyond selection-first)
                       formally fires
```

Priority hint from real use: cross-note recognition may deserve early M8
attention — it is the first thing a real user reached for. Keep the S10
guarantee intact when it arrives: vault-wide evidence must still be
mechanically derived (exact/anchored), never "the model remembers".

## Signal: AI panel ergonomics

Fixed 44% bottom dock is crude. Owner asks: height resize + a right-column
dock inside the pane. Agreed and implemented same-day (local panel state:
drag-resize both docks, bottom ↔ right toggle; 03's cockpit sketch names
the right side for AI). The larger evolution stays reserved: the AI panel
as its own TAB KIND, so any pane can host it and one panel can serve the
focused editor (couples with 26/M8 context work and the keep-signal on
per-pane tab groups).
