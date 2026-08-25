---
type: Atomik Index
title: Cairn — the protocol, its audits, and the records that produced it
description: What each file in this directory is, which are live doctrine and which are dated records of a proposal, and where the protocol itself actually lives.
tags: [cairn, protocol, index, audit, okf]
timestamp: 2026-08-24T00:00:00Z
---

# Cairn

Cairn is the protocol this repository runs on: parallel coding paths, one per
worktree, each merging itself, with the mechanical half enforced by
[`tools/cairn-check.mjs`](../../tools/cairn-check.mjs) rather than remembered.

**The protocol is not defined here.** It lives in
[`atomik-project/coding-paths/paths.md`](../../atomik-project/coding-paths/paths.md)
(operating detail), [ADR-012](../adr/ADR-012-parallel-paths-self-merge.md) and
[ADR-016](../adr/ADR-016-cairn-enforcement-integrity.md) (decisions), and bedrock
[22](../bedrock/22_22-agent-handoff.md) / [24](../bedrock/24_24-doc-templates.md) /
[35](../bedrock/35_35-coding-path-execution-state.md) (doctrine). This directory
explains it to people outside the repository, and holds the audits that repaired it.

## Start here

- [**handbook.md**](./handbook.md) — **the single entry point.** One document that
  alternates between two modes: **CONCEPT**, a piece of general software practice
  explained from nothing and true of any project, and **IN CAIRN**, exactly how this
  protocol implements that idea, which file enforces it, and the failure that made it
  necessary. Read straight through to learn the practice and the protocol together;
  read only the IN CAIRN blocks if you already know the practice — they are
  self-contained and carry every normative statement. It ends with the operator guide,
  this repository's declared properties, the known limits, the rule catalogue
  **generated from the validator's own source**, and the lexicon.
- [**handbook.html**](./handbook.html) — the same document, rendered, in its own
  minimal theme. **This is the page to send to someone outside the repository.**
  Markdown remains the source of truth and the thing CI checks.

## Live

- [cairn.md](./cairn.md) — the brief that started the extraction work.
- [cairn-audit-2026-08-24.md](./cairn-audit-2026-08-24.md) — the audit of record,
  F1–F15, each finding reproduced by a named command. It is what CP-OPS-002 executes.
- [cairn-opening-check-agenda.md](./cairn-opening-check-agenda.md) — the eight
  decisions put to the owner before CP-OPS-002 could be registered.
- [index.html](./index.html) — Cairn explained to someone outside this repository:
  the two roles, N paths each merging itself, statements of record, and the twenty
  rules the checker actually implements. Rewritten at CP-OPS-002 S06 against
  ADR-012; it had taught the rejected integrator model at ten sites.
- [workflow.html](./workflow.html) — the same protocol day to day: who acts at each
  moment and which file holds the answer afterwards.

Every HTML page here carries a **dated status banner** naming what it renders.
`index.html` drifted for ten days without anyone noticing precisely because
nothing on it claimed a vintage; a rendered page that cannot be dated cannot be
audited.

## Dated records of a proposal — read as history

Each carries a banner saying what it got wrong and where the ratified version is.
They are kept because deleting the record of a rejected proposal makes the accepted
one look inevitable.

- [cairn-protocol-research-and-diagnostic.md](./cairn-protocol-research-and-diagnostic.md)
  and [round 2](./cairn-protocol-research-and-diagnostic-round-2.md) — the first two
  research passes. Both propose a nested ceremony schema the live parser rejects (F13).
- [cairn-protocol-round-3.md](./cairn-protocol-round-3.md) — the round-3
  deliverables: corrections register C1–C15, the interim operator guide D1, the
  specification draft D2 with its generated rule table, the lexicon D3, the init kit
  D4. D1's ceremony and registration steps were corrected at CP-OPS-002 S01; D2 §2.2
  documented the accepted outcome once [ADR-017](../adr/ADR-017-coding-path-lifecycle.md)
  settled the lifecycle at S07a. D1 and D2 are superseded as instructions by
  [handbook.md](./handbook.md) and its operator guide.
- [cairn-round-3-brief.md](./cairn-round-3-brief.md) ·
  [cairn-round-4-brief.md](./cairn-round-4-brief.md) — the briefs those rounds answered.
