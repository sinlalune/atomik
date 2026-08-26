---
type: Atomik Brief
title: Handoff — CP-OPS-002 S07f landed; S07g is the Cairn v0.2 specification revision
timestamp: 2026-08-26T00:00:00Z
atomik:
  path: CP-OPS-002
  branch: path/cp-ops-002
  candidate_step: S07g
---

# Resume CP-OPS-002 here

## Repository state

- Worktree `../4tom1k-cp-ops-002`, branch `path/cp-ops-002`, tracking
  `origin/path/cp-ops-002`.
- Registered at `base_commit: 7aa3b1d` by trunk commit `df875e6`.
- **S07f is a completed remote checkpoint.** The user passed the candidate on
  2026-08-26 and chose to land it separately so the v0.2 revision that follows
  reads as its own diff.
- `ADR-018` deliberately remains `proposed`. S07g's brief contradicts two of its
  operating rules — force-push after rebase, and pre-acceptance work staying
  unpushed — so accepting it before that revision would ratify text about to be
  amended.

## What S07f landed

- Candidate-bound closure: audit and closing acceptance bind the same exact
  implementation commit; `ready` is a path-branch fact and `done` is written
  only by trunk integration; exactly one allowlisted administrative closure
  commit may follow the candidate.
- Fail-closed critical gates: registration, registration parent, rebase,
  transition, acceptance, and record integrity return non-zero for both `fail`
  and `inconclusive`.
- The canonical specification project: `docs/cairn/specification/index.md` plus
  65 concept articles and six reference articles, rendered by
  `tools/cairn-spec-build.mjs` into one deterministic, self-contained
  `docs/cairn/specification.html` embedding 74 articles.
- Cairn stays a team protocol: several developers and several agents per
  developer, one assigned writer per writable worktree at a time, writer change
  at a pushed checkpoint, no permanent central integrator.

## S07g — the Cairn v0.2 revision

The user supplied an external nineteen-item review brief. The deliverable is
**specification text only**; no checker rule is implemented in this step.

Every item must end either resolved in normative text or listed under a
*Deliberate non-goals* section with a stated reason. Every added requirement
gains a conformance-matrix row with an honest reference-tools column. Net
concept count must stay at or under 66 — the wiki currently holds 65 concept
articles, and four thin Git-glossary articles are merged to pay for the new
normative objects.

Item groups, in the brief's own order:

- **P0 (broken promises).** Checkpoint retention under `refs/cairn/checkpoints/`
  before any force-push; a pushed, marked provisional commit excluded from
  candidate identity; a fully specified handoff-brief contract with an
  answerable-alone test and a cold-resume benchmark.
- **P1 (records mean what they claim).** Field-level closure surface; scope
  digest recorded at opening and re-verified at closing; candidate base `T` plus
  a drift predicate over `writes:`/`governs:`; structured advisory dispositions;
  per-role actor identity as an advisory; `scope-drift` blocking unless the
  declaration moves in the same commit.
- **P2 (adoption and cost).** Lightweight path becomes the default with full
  ceremony opt-in; typed work units; repair procedures; a redaction ceremony.
- **P3 (editorial).** Hash-algorithm agnostic identity; diagram and transition
  table reconciled both ways; the Git glossary split from Cairn concepts without
  adding an article.
- **Origin gap.** A foundation path for a repository's own first hour, plus an
  adoption-path variant for brownfield repositories.

Three explicit prohibitions: do not fix trunk drift with `remote_trunk == T` at
integration; do not ship P1 without P2-10; do not implement checker rules.

## Verification contract for S07g

`npm run cairn-spec:build` must reproduce the checked-in HTML byte-for-byte, and
`npm run cairn-check:test`, `npm run cairn-check`, `npm run typecheck`,
`npm test`, and `npm run build` must all pass before the step is complete.
`tools/cairn-spec.test.mjs` pins section headings and the `v0.1` string, so the
executable documentation contract moves with the specification.

## Resume instruction

Resolve the path from this worktree, compare this brief with the work ledger and
Git status, and continue from S07g. The nineteen-item brief is recorded in the
S07g ledger entry; do not ask the user to restate it.
