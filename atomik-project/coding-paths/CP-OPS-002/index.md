---
type: Atomik Coding Path
title: Cairn 2.0 — close the enforcement gaps, drain the legacy state, and extract the protocol from Atomik
description: Second operations path. Repairs the three checks that certify false statements, drains the state that predates each rule, then extracts Cairn into a portable specification and init kit.
tags: [cairn, ops, protocol, ci, enforcement, portability]
timestamp: 2026-08-24T00:00:00Z
atomik:
  id: CP-OPS-002
  route: full            # control plane + decision plane; escalation is one-way
  status: running
  current_step: S08r
  base_commit: 7aa3b1d
  branch: path/cp-ops-002
  writes:                    # ADVISORY — a signal, never a lock
    - tools/cairn-check.mjs
    - tools/cairn-check.test.mjs
    - tools/cairn-active.mjs
    - tools/cairn-active.test.mjs
    - tools/cairn-audit.mjs
    - tools/cairn-audit.test.mjs
    - tools/cairn-rules.mjs
    - tools/cairn-rules.test.mjs
    - tools/cairn-spec.test.mjs
    - tools/cairn-spec-build.mjs
    - tools/cairn-config.mjs       # S08p: executable schema-1 host binding
    - tools/cairn-config.schema.json
    - tools/cairn-config.test.mjs
    - package.json
    - tools/cairn-new.mjs
    - cairn.config.json
    - .github/workflows/cairn.yml
    - AGENTS.md               # S08i: the mechanical contract names this rule set
    - docs/agents/*.md        # S08o: live agent entry pointers follow the classified route
    - docs/index.md
    - docs/**/index.md         # S05/S05b backfill the OKF entry points
    - docs/**/log.md           # S05c: the other half of the OKF folder pair
    - atomik-project/**/index.md
    - atomik-project/**/log.md
    - docs/cairn/**
    - docs/adr/**              # S05 backfills frontmatter across every ADR
    - docs/modules/**
    - docs/bedrock/24_24-doc-templates.md
    - docs/bedrock/22_22-agent-handoff.md # S08o: host pointer replaces the portable copy
    - docs/bedrock/archive/22_22-agent-handoff-pre-cairn-extraction.md
    - atomik-project/index.md
    - atomik-project/coding-paths/paths.md
    - atomik-project/coding-paths/binding.md
    - atomik-project/coding-paths/paths-history.md
    - atomik-project/coding-paths/CP-OPS-002/index.md
    - atomik-project/coding-paths/index.md
    - atomik-project/coding-paths/history/**
    - atomik-project/coding-paths/CP-MVP-008.md
    - atomik-project/sessions/**
    - atomik-project/briefs/**            # S06d: the F7 residue lives here too
    - atomik-project/audits/index.md
    - atomik-project/log/**
  governs:                   # declared READ surface, pinned at exact blob ids
    - atomik-project/coding-paths/paths.md@468a922f03c2e7a8a1c737b8fc909292d6bc8e34
    - docs/bedrock/22_22-agent-handoff.md@c10ed0a11bc501336f449be204b57408f80c196e
    - docs/bedrock/24_24-doc-templates.md@d8d8d00d466fd5e456dece1f5a8284a5c3a8c15a
    - docs/bedrock/26_26-okf-agent-context.md@867ef9c288e036b2b69fef464d0e8f5aef9960d6
    - docs/bedrock/35_35-coding-path-execution-state.md@65e1b9abda9e1ebd7dd298a1195934b3cd20a780
    - docs/adr/ADR-009-coding-paths-work-ledger-dual-plane.md@3234eb9b1b9abb86e083998a30d58608cdc1e0e6
    - docs/adr/ADR-012-parallel-paths-self-merge.md@371c5ab3c560f9d5ab44d4bc630cff577264b5ab
    - docs/cairn/cairn-audit-2026-08-24.md@319d54d2035b03dddb03f379cc7874bcbc448154
---

# CP-OPS-002 — Cairn 2.0

> **ACTIVATED 2026-08-24** after the owner ruled all eight decisions in the opening check
> ([session note](../../sessions/2026-08-24-cp-ops-002-opening-check.md), agenda in
> [`docs/cairn/cairn-opening-check-agenda.md`](../../../docs/cairn/cairn-opening-check-agenda.md)).
> Registered at `base_commit: 7aa3b1d` before its worktree branched.

# CP-OPS-002 — Cairn 2.0

> **ACTIVATED 2026-08-24** after the owner ruled all eight decisions in the opening check
> ([session note](../../sessions/2026-08-24-cp-ops-002-opening-check.md), agenda in
> [`docs/cairn/cairn-opening-check-agenda.md`](../../../docs/cairn/cairn-opening-check-agenda.md)).
> Registered at `base_commit: 7aa3b1d` before its worktree branched.

This record is a FOLDER, born sliced under
[ADR-020](../../../docs/adr/ADR-020-protocol-context-weight.md) decision 4. What
you are reading is the required part: the declaration above, why the path exists,
the step index, the live header, and the next action. Everything else is linked.

```text
CP-OPS-002/
  index.md      <- you are here: declaration - step index - live header - next action
  plan.md       the forward plan, read when planning
  log.md        OKF folder log
  steps/S0N.md  one file per step, complete in itself
```

## Why this path exists

The audit record — `docs/cairn/cairn-audit-2026-08-24.md` — found one failure mode
wearing six faces: **Cairn writes rules forward and never drains the state that predates
them.** Three checks currently report `OK` over conditions that are false on this trunk.

Ordering follows severity, not narrative. Enforcement integrity came first, because every
later step lands through the gates that were not gating — S00 adopted the four mechanical
repairs and S01 closed the schema and doctrine drift around them. What remains is the
ledger boundary, the OKF backfill, portability, and the greenfield pilot.

## Steps

One file per step under [`steps/`](./steps/index.md), each complete in itself.
The line below is what decides whether you need to open one, so it is written to
be sufficient on its own — there is no rollup, no summary and no move: a step is
written where it lives from the moment it is worked.

- **[S00](./steps/S00.md)** — Adopt the local repairs — the four enforcement repairs, and how they landed
- **[S01](./steps/S01.md)** — Schema and doctrine fixes — the ceremony schema pinned, ADR-016
- **[S03](./steps/S03.md)** — Drain the grandfather set — owner-ruled, withdrawn
- **[S04](./steps/S04.md)** — Bound the ledger — the history/ rollup convention and advisory ledger-size
- **[S05](./steps/S05.md)** — Backfill OKF — indexes, ADR frontmatter, the gated opening check, logs everywhere
- **[S06](./steps/S06.md)** — Retire the drifted page, declare the enforcement tier, bind the audit, drain the leftovers
- **[S07a](./steps/S07a.md)** — ADR-017, the path lifecycle *(ruling 5, F11 + F15)* — **COMPLETE**
- **[S07](./steps/S07.md)** — Specification, lexicon, and the primer that makes them readable — **SUPERSEDED by S07c**
- **[S07b](./steps/S07b.md)** — The rendered page — **SUPERSEDED by S07c**
- **[S07c](./steps/S07c.md)** — Redo: one handbook, universal, in its own theme *(owner correction)* — **SUPERSEDED by S07e**
- **[S07d](./steps/S07d.md)** — The binding names, and the document read downward *(owner, 2026-08-25)* — **SUPERSEDED by S07e**
- **[S07e](./steps/S07e.md)** — Canonical top-down specification project and universal reader *(owner correction)* — **COMPLETE**
- **[S07f](./steps/S07f.md)** — Candidate-bound closure and truthful team lifecycle — COMPLETE
- **[S07g](./steps/S07g.md)** — Cairn v0.2: close the gaps between the promises and the predicates — COMPLETE
- **[S07h](./steps/S07h.md)** — The v0.2 predicates, part one: the parser, the typed ledger, and the two P0 gates — COMPLETE
- **[S07i](./steps/S07i.md)** — The v0.2 predicates, part two: the record rules — COMPLETE
- **[S07j](./steps/S07j.md)** — The v0.2 predicates, part three: routes, the brief contract, redaction — COMPLETE
- **[S07k](./steps/S07k.md)** — Repair: a retention ref was moved, and the rule could not see it — COMPLETE
- **[S07l](./steps/S07l.md)** — Repair: the brief could not name its own commit — COMPLETE
- **[S07m](./steps/S07m.md)** — Review round two: two unsound predicates and a fabricated figure — COMPLETE
- **[S07n](./steps/S07n.md)** — The cold-resume pilot, and what it says not to do — COMPLETE
- **[S07o](./steps/S07o.md)** — Owner review: the brief is a stone, not a hero — COMPLETE
- **[S07p](./steps/S07p.md)** — Repair: a dead button, a low glyph, and the face that stayed old — COMPLETE
- **[S07q](./steps/S07q.md)** — Every defect leans the same way, so name the shape — COMPLETE
- **[S07r](./steps/S07r.md)** — Rebase onto the trunk, and find what the rebase turns off — COMPLETE
- **[S07s](./steps/S07s.md)** — Drain a record the newer rules could not judge — COMPLETE
- **[S07t](./steps/S07t.md)** — The catalogue could not see a level it had to compute — COMPLETE
- **[S07u](./steps/S07u.md)** — Make the brief survive the handoff it is for — COMPLETE
- **[S08a](./steps/S08a.md)** — The local gate and the CI gate compared different trees — COMPLETE
- **[S08b](./steps/S08b.md)** — The rule reported eighteen refs missing while eighteen sat on the remote — COMPLETE
- **[S08c](./steps/S08c.md)** — Read the gate instead of a run that resembles it — COMPLETE
- **[S08d](./steps/S08d.md)** — Make the protocol's own weight a constraint it can be measured against — COMPLETE
- **[S08e](./steps/S08e.md)** — A cap that has never bound is a count, not a constraint — COMPLETE
- **[S08f](./steps/S08f.md)** — The sentence defining instruction parity failed it — COMPLETE
- **[S08g](./steps/S08g.md)** — Accept ADR-020, and retire the two token counts it argues against — COMPLETE
- **[S08h](./steps/S08h.md)** — The two live trunk defects: one was already fixed, one had no rule at all — COMPLETE
- **[S08i](./steps/S08i.md)** — Two rules that read a name instead of a fact — COMPLETE
- **[S08j](./steps/S08j.md)** — A rebase gives one unit two ids, and the namespace has one slot — COMPLETE
- **[S08k](./steps/S08k.md)** — Accepted, implemented, and the branch given a generation — COMPLETE
- **[S08l](./steps/S08l.md)** — The record moves, and three rules that knew it by its address — COMPLETE
- **[S08m](./steps/S08m.md)** — A fifth rule dated a record by the commit that moved it — COMPLETE
- **[S08n](./steps/S08n.md)** — An append is not a rewrite, and the baseline belongs to the record — COMPLETE
- **[S08o](./steps/S08o.md)** — The protocol moves, and the host becomes an adapter — COMPLETE
- **[S08p](./steps/S08p.md)** — The host binding becomes executable — COMPLETE
- **[S08q](./steps/S08q.md)** — The seed teaches the shape the protocol states — COMPLETE
- **[S08r](./steps/S08r.md)** — The rebase is the cause, so the rebase goes — COMPLETE

Forward steps — **S08** (in progress) and **S09** — are in [plan.md](./plan.md).

## Documentation coverage

**Required:** `paths.md`, bedrock 22/24/26/35, ADR-009, ADR-012,
`docs/cairn/cairn-audit-2026-08-24.md`.
**Conditional:** bedrock 17 (self-evolving docs) at S07; ADR-011 at S05.
**Deliberately excluded:** all `apps/` module notes — this path writes no product code.

## Live header

Everything here is current state. It does not grow: a fact about one step goes in
that step's file, where its `cairn-unit` block already carries the machine-readable
half of the same thing.

| Field | Value |
| :-- | :-- |
| Status | `running` on `path/cp-ops-002` |
| Base commit | `7aa3b1d` — registered on the trunk by `df875e6` before this branch existed |
| Branch | `path/cp-ops-002`, worktree `../4tom1k-cp-ops-002`, `node_modules` symlinked |
| Remaining | S08 and S09. Stage 5 still needs the transactional `cairn-init` command and explicit release identity — its seed shape is now reconciled; Part 2 still needs adversarial fixtures, invocation-parity proof and generated conformance; the teaching axis still needs the generic wiki exporter and incremental learning-note extraction. The pilot re-run gates any further brief-schema change (S03 withdrawn by owner ruling; S06b rescoped across S07 + S08 by ruling 9) |
| Opening check | accepted 2026-08-24, eight rulings ([note](../../sessions/2026-08-24-cp-ops-002-opening-check.md)) |
| Scope note | protocol tooling and doctrine only; no product code changed. The full `typecheck`, product `test`, and production `build` gates were nevertheless run and passed at the completed-step boundary |
| Widening | `writes:` gained `atomik-project/briefs/cp-ops-002-handoff.md` at S01 — the per-step handoff brief is required by bedrock 22 and the original declaration simply omitted it. **Widened again at S06d** to `atomik-project/briefs/**`: F7's residue lives in that folder, and `scope-drift` said so the moment the owner ruled on `feedback on  MVP-001.md`. Recorded here and kept going, which is what `paths.md` asks of a widening |
| Next action | **ADR-020 stage 5, second unit: implement `cairn-init`.** The seed is reconciled (S08q), so the initializer now has one correct shape to scaffold: born-sliced records, generation-aware retention, the classified PORTABLE / HOST / BINDING route, schema-1 config, reference tools, tier-1 workflow, concept-wiki index and one-concept template — installed transactionally. It must also write an explicit protocol release identity/lock so a later public Cairn can migrate an adopter rather than silently overwrite it, and honour forward-plan item 12: extraction MOVES authority and never maintains the portable protocol by hand in two places. Stage 3's last operation — retiring `ledger-size` — remains deliberately pending until `CP-MVP-008`, `CP-MVP-011` and `CP-MVP-012` are folders. S08 Part 2 also remains: an adversarial fixture for every blocking rule, one gate run in both invocation contexts asserting one verdict, and a generated conformance matrix |
| Superseded next action (S08k, done) | **ADR-020 stage 2** — the `CP-OPS-002` folder migration, which supersedes the queued ledger roll and is what `ledger-size` has been advising about at ~19.9 k tokens. Then stages 3–5 (the checker's shape, the artefact classification, `cairn-init`), and S08 Part 2 — an adversarial fixture for every blocking rule, the two-context gate-parity test, and the generated conformance matrix. `cairn-init` must scaffold generation-aware retention from the start: a flat namespace handed to an adopter is a migration handed to an adopter |
| Amendments | **2026-08-24, owner ruling 9** — S06b rescoped from "configure branch protection" to "declare the enforcement tier"; its deliverables move into S07 (specification + operator guide) and S08 (`enforcement` config field, generated header line, tier-0/1 `cairn-init`). This repository stays at tier 1, declared ([note](../../sessions/2026-08-24-cp-ops-002-s06b-rescope.md)) |
| Blockers | None. `ledger-size` retirement waits on the three flat records above, but ADR-020 says its migration stages are independent, so stage 5 can proceed |
