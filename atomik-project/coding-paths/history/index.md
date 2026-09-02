---
type: Atomik Index
title: Coding path step history
description: Completed steps rolled out of live path files, verbatim and linked, so a path file keeps its declaration, its ledger and its next action.
tags: [coding-path, history, ledger, okf]
timestamp: 2026-08-26T00:00:00Z
---

# Coding path step history

A path file is mandatory reading for whoever resumes that path, and it grows with
every step. This directory is where completed steps go so it stops growing without
bound — introduced by CP-OPS-002 S04 against audit finding F4.

The move is **verbatim**. A rolled step is cut from the path file and pasted here
unchanged; nothing is summarized, condensed or dropped. What stays behind is one
index line per step, linking to its record. The convention, and when to roll, are
in [paths.md](../paths.md#the-path-record-is-a-folder-born-sliced).

```text
atomik-project/coding-paths/CP-MVP-008.md            declaration · index · ledger · next action
atomik-project/coding-paths/history/CP-MVP-008-S04.md   the full record of S04 and its sub-steps
```

One file per MAJOR step: sub-steps live with the step they belong to, because
that is how they were worked and how they read. Naming is `<path-id>-S0N.md`.

## Records

### CP-OPS-002 — Cairn 2.0 — MOVED

These records left this directory at S08l. `CP-OPS-002` is now a folder
([ADR-020](../../../docs/adr/ADR-020-protocol-context-weight.md) decision 4), so
its steps live beside its declaration in
[`CP-OPS-002/steps/`](../CP-OPS-002/steps/index.md) rather than in a shared
rollup directory. The links below are kept and repointed rather than deleted: an
index that forgets where something went is worse than one that says.

They had been rolled here 2026-08-25 at S07c, when `ledger-size` fired on the live
file (~11 k tokens against a 10 k budget) while it was being edited — which is
exactly who the rule is meant to speak to. Two mechanical adjustments were named in
each record's header: deixis, left alone; and relative-link depth, repointed
because a link is an address rather than content, and the same target must keep
resolving. Both moves were verbatim.

- [S00 — Adopt the local repairs](../CP-OPS-002/steps/S00.md) · the four enforcement repairs and the status correction
- [S01 — Schema and doctrine fixes](../CP-OPS-002/steps/S01.md) · the ceremony schema pinned, ADR-016
- [S03 — Drain the grandfather set](../CP-OPS-002/steps/S03.md) · owner-ruled, withdrawn
- [S04 — Bound the ledger](../CP-OPS-002/steps/S04.md) · this convention, and the rule that produced this rollup
- [S05 — Backfill OKF](../CP-OPS-002/steps/S05.md) · with S05b and S05c
- [S06 — Retire the drifted page](../CP-OPS-002/steps/S06.md) · with S06b, S06c and S06d

Rolled again 2026-08-26 at S07g, when `ledger-size` fired a second time. The six
specification steps below include four superseded attempts, kept rather than deleted:
what was tried and why it was redone is the part a later reader needs most.

- [S07a — ADR-017, the path lifecycle](../CP-OPS-002/steps/S07a.md) · `archived` terminal, abandonment given a door, staleness advisory
- [S07 — Specification, lexicon, and primer](../CP-OPS-002/steps/S07.md) · superseded by S07c
- [S07b — The rendered page](../CP-OPS-002/steps/S07b.md) · superseded by S07c
- [S07c — Redo: one universal handbook](../CP-OPS-002/steps/S07c.md) · superseded by S07e
- [S07d — Binding names, read downward](../CP-OPS-002/steps/S07d.md) · superseded by S07e
- [S07e — Canonical specification project and universal reader](../CP-OPS-002/steps/S07e.md) · the shape that held

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
