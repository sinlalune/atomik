---
type: Atomik Index
title: CP-OPS-002 — step records
description: One file per step of CP-OPS-002, each written where it lives and complete in itself, with the commit that landed it.
tags: [cairn, ops, coding-path, steps, index, okf]
timestamp: 2026-09-01T00:00:00Z
---

# CP-OPS-002 — step records

One file per major step; sub-steps live with the step they belong to, because
that is how they were worked and how they read. A step file is written to be read
ALONE — [ADR-020](../../../../docs/adr/ADR-020-protocol-context-weight.md)
decision 4 — so deixis is a defect at authoring time rather than a casualty at
rollup time. There is no rollup: nothing here was ever summarised, because nothing
was ever moved out of a growing file after the fact.

S00–S07p came from `coding-paths/history/`, where they had been rolled under the
older convention; S07q–S08k came out of the live record at S08l. Both moves were
verbatim, and in both only relative links were repointed — a link is an address
rather than content, and the same target must keep resolving. S08l onward were
born here, one complete record per step.

## Records

- **[S00](./S00.md)** — Adopt the local repairs — the four enforcement repairs, and how they landed
- **[S01](./S01.md)** — Schema and doctrine fixes — the ceremony schema pinned, ADR-016
- **[S03](./S03.md)** — Drain the grandfather set — owner-ruled, withdrawn
- **[S04](./S04.md)** — Bound the ledger — the history/ rollup convention and advisory ledger-size
- **[S05](./S05.md)** — Backfill OKF — indexes, ADR frontmatter, the gated opening check, logs everywhere
- **[S06](./S06.md)** — Retire the drifted page, declare the enforcement tier, bind the audit, drain the leftovers
- **[S07a](./S07a.md)** — ADR-017, the path lifecycle *(ruling 5, F11 + F15)* — **COMPLETE**
- **[S07](./S07.md)** — Specification, lexicon, and the primer that makes them readable — **SUPERSEDED by S07c**
- **[S07b](./S07b.md)** — The rendered page — **SUPERSEDED by S07c**
- **[S07c](./S07c.md)** — Redo: one handbook, universal, in its own theme *(owner correction)* — **SUPERSEDED by S07e**
- **[S07d](./S07d.md)** — The binding names, and the document read downward *(owner, 2026-08-25)* — **SUPERSEDED by S07e**
- **[S07e](./S07e.md)** — Canonical top-down specification project and universal reader *(owner correction)* — **COMPLETE**
- **[S07f](./S07f.md)** — Candidate-bound closure and truthful team lifecycle — COMPLETE
- **[S07g](./S07g.md)** — Cairn v0.2: close the gaps between the promises and the predicates — COMPLETE
- **[S07h](./S07h.md)** — The v0.2 predicates, part one: the parser, the typed ledger, and the two P0 gates — COMPLETE
- **[S07i](./S07i.md)** — The v0.2 predicates, part two: the record rules — COMPLETE
- **[S07j](./S07j.md)** — The v0.2 predicates, part three: routes, the brief contract, redaction — COMPLETE
- **[S07k](./S07k.md)** — Repair: a retention ref was moved, and the rule could not see it — COMPLETE
- **[S07l](./S07l.md)** — Repair: the brief could not name its own commit — COMPLETE
- **[S07m](./S07m.md)** — Review round two: two unsound predicates and a fabricated figure — COMPLETE
- **[S07n](./S07n.md)** — The cold-resume pilot, and what it says not to do — COMPLETE
- **[S07o](./S07o.md)** — Owner review: the brief is a stone, not a hero — COMPLETE
- **[S07p](./S07p.md)** — Repair: a dead button, a low glyph, and the face that stayed old — COMPLETE
- **[S07q](./S07q.md)** — Every defect leans the same way, so name the shape — COMPLETE
- **[S07r](./S07r.md)** — Rebase onto the trunk, and find what the rebase turns off — COMPLETE
- **[S07s](./S07s.md)** — Drain a record the newer rules could not judge — COMPLETE
- **[S07t](./S07t.md)** — The catalogue could not see a level it had to compute — COMPLETE
- **[S07u](./S07u.md)** — Make the brief survive the handoff it is for — COMPLETE
- **[S08a](./S08a.md)** — The local gate and the CI gate compared different trees — COMPLETE
- **[S08b](./S08b.md)** — The rule reported eighteen refs missing while eighteen sat on the remote — COMPLETE
- **[S08c](./S08c.md)** — Read the gate instead of a run that resembles it — COMPLETE
- **[S08d](./S08d.md)** — Make the protocol's own weight a constraint it can be measured against — COMPLETE
- **[S08e](./S08e.md)** — A cap that has never bound is a count, not a constraint — COMPLETE
- **[S08f](./S08f.md)** — The sentence defining instruction parity failed it — COMPLETE
- **[S08g](./S08g.md)** — Accept ADR-020, and retire the two token counts it argues against — COMPLETE
- **[S08h](./S08h.md)** — The two live trunk defects: one was already fixed, one had no rule at all — COMPLETE
- **[S08i](./S08i.md)** — Two rules that read a name instead of a fact — COMPLETE
- **[S08j](./S08j.md)** — A rebase gives one unit two ids, and the namespace has one slot — COMPLETE
- **[S08k](./S08k.md)** — Accepted, implemented, and the branch given a generation — COMPLETE
- **[S08l](./S08l.md)** — The record moves, and three rules that knew it by its address — COMPLETE
- **[S08m](./S08m.md)** — A fifth rule dated a record by the commit that moved it — COMPLETE
- **[S08n](./S08n.md)** — An append is not a rewrite, and the baseline belongs to the record — COMPLETE
- **[S08o](./S08o.md)** — The protocol moves, and the host becomes an adapter — COMPLETE
- **[S08p](./S08p.md)** — The host binding becomes executable — COMPLETE
- **[S08q](./S08q.md)** — The seed teaches the shape the protocol states — COMPLETE
- **[S08r](./S08r.md)** — The rebase is the cause, so the rebase goes — COMPLETE

## Which commit landed which step

Moved verbatim from the Work Ledger's `Steps complete` row at S08l. It is a
per-step commit index, which is what an index over steps is for; the row it came
from sat in the parent record and restated the step list in prose.

| Field | Value |
| :-- | :-- |
| Steps complete | **S00** — enforcement repairs adopted (`dd6e76a`) · **S01** — ceremony schema pinned, D1 corrected, registration doctrine unified, ADR-016 (`c4a9670`) · **S04** — ledger boundary, CP-MVP-008 rolled into `history/`, advisory `ledger-size` (`7e04288`) · **S05** — five indexes, ADR frontmatter, schema validation over the decision plane (`3df9073`) · **S05b** — the opening check gated, five more indexes (`d6b29f1`), the invented folder-log decision retracted on owner correction (`360f2be`) · **S05c** — the OKF pair completed: eighteen folder logs seeded from real Git history (`468bc24`) · **S06** — `index.html` rewritten against ADR-012, both HTML pages dated (`2a5ef35`) · **S06c** — the coherence audit bound to the commits its path contributed (`de4e0fa`) · **S06d** — the six stale worktrees and the orphan registration branch drained, `isFilled()` given something to measure, and a C-quoted path stopped hiding from the blocking rules (`9cbe605`, `6fa33e7`) · **S07a** — ADR-017 settles the path lifecycle; `active` retired, abandonment given a door, staleness noticed without blocking (`b4ef361`) · **S07 / S07b / S07c / S07d** — superseded specification attempts retained in this ledger · **S07e** — one canonical top-down specification project, linked newcomer foundations and implementation references, plus one self-contained three-pane universal reader · **S07f** — candidate-bound closure, truthful team lifecycle, the canonical concept wiki and the deterministic equal-pane universal reader, passed by the user and landed as its own checkpoint · **S07g** — the Cairn v0.2 revision: nineteen review items resolved in normative text, concept budget held at 66, ADR-019 proposed |
