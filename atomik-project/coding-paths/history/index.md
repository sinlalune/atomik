---
type: Atomik Index
title: Coding path step history
description: Completed steps rolled out of live path files, verbatim and linked, so a path file keeps its declaration, its ledger and its next action.
tags: [coding-path, history, ledger, okf]
timestamp: 2026-08-24T00:00:00Z
---

# Coding path step history

A path file is mandatory reading for whoever resumes that path, and it grows with
every step. This directory is where completed steps go so it stops growing without
bound — introduced by CP-OPS-002 S04 against audit finding F4.

The move is **verbatim**. A rolled step is cut from the path file and pasted here
unchanged; nothing is summarized, condensed or dropped. What stays behind is one
index line per step, linking to its record. The convention, and when to roll, are
in [paths.md](../paths.md#the-ledger-has-a-boundary).

```text
atomik-project/coding-paths/CP-MVP-008.md            declaration · index · ledger · next action
atomik-project/coding-paths/history/CP-MVP-008-S04.md   the full record of S04 and its sub-steps
```

One file per MAJOR step: sub-steps live with the step they belong to, because
that is how they were worked and how they read. Naming is `<path-id>-S0N.md`.

## Records

### CP-MVP-008 — Real AI generation + the AI interaction pass (M2 completion)

Rolled 2026-08-24. The path file went from ~23.5 k tokens to ~4.7 k; the execution
record below is byte-for-byte what it contained.

- [S01 — Bootstrap](./CP-MVP-008-S01.md)
- [S02 — Mistral adapter in main, end to end](./CP-MVP-008-S02.md)
- [S03 — Prompts folders](./CP-MVP-008-S03.md) · 6 entries
- [S04 — Selection context menu](./CP-MVP-008-S04.md) · 14 entries
- [S05 — Inline live preview](./CP-MVP-008-S05.md)
- [S06 — Chat lateral panel](./CP-MVP-008-S06.md) · 22 entries
- [S07 — Bench rounds and M2 acceptance](./CP-MVP-008-S07.md) · 14 entries
