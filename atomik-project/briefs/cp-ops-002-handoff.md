---
type: Atomik Brief
title: Handoff — CP-OPS-002
timestamp: 2026-09-01T00:00:00Z
atomik:
  path: CP-OPS-002
  written_by: cp-ops-002-writer
  branch: path/cp-ops-002
  checkpoint: 6d92077e519f56b6699d6b53efedb8340920623d
  checkpoint_unit: 28
  checkpoint_pushed: true
  base_commit: 7aa3b1d
  trunk_seen: dfcd09d
  writes:
    - tools/cairn-*.mjs
    - .github/workflows/cairn.yml
    - AGENTS.md
    - atomik-project/coding-paths/paths.md
    - docs/cairn/**
    - docs/adr/**
    - atomik-project/coding-paths/CP-OPS-002.md
    - atomik-project/coding-paths/history/**
    - atomik-project/briefs/**
    - atomik-project/log/**
  governs:
    - atomik-project/coding-paths/paths.md@468a922f03c2e7a8a1c737b8fc909292d6bc8e34
    - docs/bedrock/22_22-agent-handoff.md@c10ed0a11bc501336f449be204b57408f80c196e
    - docs/cairn/cairn-audit-2026-08-24.md@319d54d2035b03dddb03f379cc7874bcbc448154
    - docs/cairn/cairn-s08-opening-brief-2026-08-31.md@7f52feaa8d1e5ded7514a2f39127f755c39d40b2
  verify:
    - npm run cairn-check
    - npm run cairn-check:test
    - npm run cairn-spec:build
---

# Resume CP-OPS-002 here

## Outcome

Close Cairn's enforcement gaps, drain the state that predates each rule, and
extract the protocol from Atomik as a portable specification and init kit.

## State

The specification is v0.2 and its predicates are implemented. The work since is
about whether the rules are honest, not whether there are enough.

**The finding that organises everything else:** every enforcement defect here is
a proxy predicate substituted for the sentence the rule states. **All of them are
now closed.** The last, `unretainedCheckpoints`, reported "nothing orphaned" once
the retained set stopped intersecting the branch — which is what the mandatory
pre-merge rebase causes — and is repaired under `ADR-021`.

**S08 so far — eleven units.** Full records in the path file; what a resuming
session needs from them:

- The local gate defaults to the **trunk** base on a path branch (S08a).
  `--working-tree` is the opt-out and raises `base-parity`. **Every verdict
  recorded before unit 19 is the narrow one.**
- An **empty ref namespace is inconclusive, not absent** (S08b). CI fetches
  `+refs/cairn/*:refs/cairn/*`; without that step retention cannot be judged.
- **CI is read, not reproduced** (S08c). `gh run view --log` is the source for any
  claim about what CI reported.
- **[`ADR-020`](../../docs/adr/ADR-020-protocol-context-weight.md) is `accepted`**
  (S08d–S08g). Read it rather than a summary. What binds a resuming session:
  **no token counts anywhere**; what will not fit is **linked, never compressed**;
  and the **queued ledger roll is deliberately not done**, superseded by stage 2.
- **All four live trunk defects are closed** (S08h, S08i). `journal-entry` is new
  and blocks a record **reaching** `done` with no entry declaring it, with no
  migration exemption — so this path owes its own entry at closure. `hasCeremony`
  and `derived-view` were repaired on this branch and are broken only on the
  trunk, where merging repairs them.
- **Three plans did not survive contact, and every record says so** (S08i, S08j).
  Item 3's recorded fix — key `derived-view` on the declared `status` — was
  correct and unnecessary; the exemption was deleted instead. Item 3c's proposed
  rule was measured against the records that motivated it and could not see them,
  so `record-date` blocks on author agreement and **advises** on divergence from
  the adding commit's author date. Item 4's figure had lost its date in transit
  and was three weeks out of true; the ADR was written on a fresh measurement.
- **[`ADR-021`](../../docs/adr/ADR-021-checkpoint-retention-generations.md) is
  `accepted` and implemented** (S08j designed it, S08k landed it). Retention refs
  carry a generation, `.../g<NN>/<n>`. What binds a resuming session: **the
  current generation is derived from ancestry, never recorded** — do not add a
  `generation:` field anywhere; **no retention ref is ever moved**, including the
  flat pre-notation ones; **an empty current generation beside older ones is
  blocking and definite**, distinct from an unreadable namespace or range, which
  stay inconclusive; and the retention range is `merge-base(trunk, HEAD)..HEAD`,
  not `base_commit..HEAD`. Read the ADR rather than a summary.
- **This branch runs on `g01`, 28 refs from `53b11f0`** (S08k). The 28 flat refs
  are untouched and stay that way. **After the next rebase, opening `g02` is part
  of that rebase's work unit** — the gate will say so, and say it definitely.

Flat refs 01–28 and `g01/01`–`g01/28` on the remote; flat 01–13 hold PRE-rebase
commits and no ref has ever been moved. Checker suite 221, specification suite 33.

## Next action

**ADR-020 stage 2** — the `CP-OPS-002` folder migration. It supersedes the queued
ledger roll and is what `ledger-size` has been advising about; the record is
~19.9 k tokens against a 10 k budget.

Then stages 3–5 (the checker's shape, the artefact classification, `cairn-init`)
and S08 Part 2: an adversarial fixture for every blocking rule, one gate run in
both invocation contexts asserting one verdict, and a generated conformance
matrix. `cairn-init` must scaffold generation-aware retention from the start — a
flat namespace handed to an adopter is a migration handed to an adopter.

## Blockers

None. Both owner questions are settled: `CP-MVP-008` by the named migration
exception (S07s), and the CP-UI-TYPOGRAPHY dates by record immutability — which
S08i acted on without touching those records, by binding the rule to the change
that ADDS a record.

## Tried and rejected

- **`remote_trunk == T` at integration.** Every landing would invalidate every
  other open acceptance; the drift predicate replaces it.
- **A YAML dependency for the extended parser.** The control plane must install
  with no network, which `cairn-init` needs.
- **Grandfathering by date or forward scope**, and **retention checked per
  declared unit.** Both agree too easily; the exception set is now named, finite
  and self-deleting, and the branch is walked directly.
- **Trusting a local run that resembles CI.** How the S08 brief came to attribute
  findings to CI that CI never reported.
- **Renaming `atomik-project/` now.** 736 occurrences, 120 files, two paths
  branched against it; owner ruled documents-only, folder at S08.
- **A self-sufficient brief, and an `objective:` field in it.** Both make it a
  second copy of the path record, drifting from the day it is written.
- **Keying `derived-view` on the declared `status`** (S08i). Correct, and it
  replaces an exemption that has nothing left to protect: the view is already the
  projection of those statuses. Deleted instead.
- **Filename date equals frontmatter `timestamp:` as the whole of `record-date`**
  (S08i). Measured first: all three misdated CP-UI-TYPOGRAPHY records agree with
  themselves, and 67 dated records corpus-wide disagree zero times. It would have
  shipped green and closed the finding without touching it.
- **Blocking on divergence from the adding commit's date** (S08i). A note taken
  on one day and committed two days later is dated correctly; blocking it teaches
  the author to write a false date to pass a gate.
- **Repointing a retention ref to its rebased copy** (S08j). The obvious fix, and
  the exact violation S07k committed by hand: it orphans the commit the ledger row
  was verified against while every declared unit still resolves.
- **Landing ADR-021's range floor without its generations** (S08j). Measured:
  31 of 45 commits report unretained and no conforming way to retain one exists
  until generations do. A red gate with no green move is how a gate gets switched
  off.

## Reading order

1. `docs/cairn/cairn-s08-opening-brief-2026-08-31.md@7f52feaa` — **first.** The
   five findings that reorder S08, the owner rulings, the teaching axis, and a
   dated correction where it got CI wrong. Its Finding 4 proposes the rule S08i
   then measured and replaced, and its Finding 3 carries a retention measurement
   labelled *"immediately after its rebase"* that no longer describes the branch
   and two namespace candidates `ADR-021` rules out; read the S08i and S08j
   records beside it.
2. `atomik-project/coding-paths/paths.md@468a922f` — how paths run.
3. `docs/bedrock/22_22-agent-handoff.md@c10ed0a1` — the per-step protocol.
4. `docs/cairn/cairn-audit-2026-08-24.md@319d54d2` — the audit that opened this
   path and named its failure mode.

`proxy-predicate`, `unsound-gate`, `adversarial-fixture`, `gate-parity`,
`record-integrity` under `specification/concepts/` are this path's vocabulary.
`specification/index.md` is normative; completed steps live in
`coding-paths/history/`.

## Verification

`npm run cairn-check` — branch against trunk by default since S08a — reports OK
with pre-existing advisories: nine grandfathered `CP-MVP-008` findings carrying
their reason, two `single-truth` notes on generated files, `ledger-size`, and the
newest unit's retention ref, written after the commit that declares it. A run
reporting `base-parity` is NARROWED, and one reporting an inconclusive
`checkpoint-retention` has not fetched `refs/cairn/*`: neither is recordable.

`npm run cairn-check:test` passes 214 subtests. `npm run cairn-spec:build`
reproduces the checked-in HTML byte-for-byte. `npm run typecheck`, `npm test`
(1109 passing) and `npm run build` all pass.
