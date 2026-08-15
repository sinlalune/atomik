---
type: Atomik Brainstorm Note
title: Brainstorm session — parallel agent execution with one active roadmap parent
timestamp: 2026-08-14T00:00:00Z
status: provisional
---

# 2026-08-14 brainstorm session — parallel agent execution

Interactive discussion with the owner about evolving Atomik's execution-state
architecture so several agents can work concurrently without losing the coherence
provided by the active coding path. Nothing in this note is a decision. Every
proposal below remains subject to owner review and the normal promotion gates.

## Persistence boundary for this record

The owner explicitly requested that only this brainstorm session be recorded for
later judgment, without changing anything else. Consequently this record was
written without the normal brainstorm-index entry or the coding-path-register
input pointer, amending neither `ACTIVE.md`, `log.md`, Bedrock, an ADR, a coding
path, code, nor tests.

**Closed 2026-08-14**: the owner reviewed the proposal the same day and ruled on
it (see the rulings section at the end). The two missing artifacts were added
then, per the three-artifact rule in `index.md` — the index line and the
register pointer in `../coding-paths/index.md`. Bedrock and ADR remain
untouched by design: ratification waits for the CP-OPS-001 pilot.

## Owner concern

**Owner framing (verbatim):** "yes I think we have a great project architecture
with the active coding path etc.. but its hard to run mutliple agent in parallele,
working on different subject, in a worktree or not, like maybe doing feedback fine
tuning, while going forward on the roadmap, how can we adjust the structure to
make it possible N?"

The active-path discipline protects architectural coherence, documentation
coverage, resumability, and integration order. The pressure point is that the
single active path currently also behaves like a single execution lane. This makes
it difficult to continue roadmap delivery while independently diagnosing or fixing
owner feedback, running investigations, or preparing another bounded subject.

The distinction proposed during the session was:

```text
one active parent path    = one coherent strategic/integration direction
N accepted child paths   = bounded parallel execution
one integration gate     = one coherent repository history
```

This would operationalize a possibility already mentioned in Bedrock 35 — a
parent path with child paths, including one child per Git worktree — rather than
discarding the one-active-parent invariant.

## Provisional workflow

```text
                         ATOMIK ROADMAP
                               |
                               v
                 +--------------------------+
                 | ONE ACTIVE PARENT PATH   |
                 | strategy + integration   |
                 +------------+-------------+
                              |
                    opens accepted children
                              |
          +-------------------+--------------------+
          |                   |                    |
          v                   v                    v
+------------------+ +------------------+ +------------------+
| DELIVERY LANE    | | FEEDBACK LANE    | | INVESTIGATION    |
| roadmap feature  | | dogfood fixes    | | benchmark/spike  |
| child path A     | | child path B     | | child path N     |
| worktree/branch  | | worktree/branch  | | worktree/branch  |
| own ledger       | | own ledger       | | own ledger       |
| declared writes  | | declared writes  | | declared writes  |
+--------+---------+ +--------+---------+ +--------+---------+
         |                    |                    |
         +--------------------+--------------------+
                              |
                              v
                 +--------------------------+
                 | SINGLE INTEGRATION GATE  |
                 | scope and overlap check  |
                 | rebase on integration    |
                 | tests + docs + diff      |
                 | parent ledger + log      |
                 +------------+-------------+
                              |
                              v
                 +--------------------------+
                 | MASTER / DOGFOOD STATE   |
                 | stable integrated state  |
                 +------------+-------------+
                              |
                        owner feedback
                              |
                              +----> new feedback child
```

The lane names are descriptive candidates, not a settled taxonomy:

- **Delivery lane** — a bounded part of the active roadmap parent.
- **Feedback lane** — reproduction, regression test, and fine-tuning or repair
  arising from the owner's use of the latest integrated state.
- **Investigation lane** — benchmark, research, prototype, or other evidence that
  may feed a later opening and does not automatically become product code.

## Candidate child-path contract

Each concurrent writer would use an accepted child path with enough durable
metadata to make coordination inspectable:

```yaml
atomik:
  id: CP-MVP-009-S07
  parent: CP-MVP-009
  lane: delivery
  status: running
  base_commit: d4970a9
  integration_target: master
  branch: lane/cp-mvp-009-s07
  writes:
    - apps/desktop/renderer/src/backlinks/**
    - tests/backlinks*
  depends_on: []
  conflicts_with: []
```

The exact fields, status vocabulary, and naming scheme remain open. A local
worktree filesystem path should probably stay machine-local rather than becoming
canonical project state; the durable record needs the branch, base, scope,
dependencies, and integration target.

## Isolation and ownership model

The proposed safety rules were:

- Every concurrent code-writing lane uses its own Git branch and preferably its
  own worktree.
- A shared working tree has only one writer. Other agents may inspect, diagnose,
  review, or report, but unrestricted simultaneous edits in one filesystem are
  not made safe by additional Markdown bookkeeping.
- A child declares its expected write surface before execution. Discovering a
  necessary expansion requires recording and checking that expansion before the
  new files are edited.
- Declared paths are exclusive while a lane is running unless an explicit
  dependency/integration arrangement says otherwise.
- Child agents update their child ledger, code, tests, and affected module or
  learning documentation in the same work unit.
- One integrator owns writes to the parent checkpoint, `ACTIVE.md`, the register,
  and the root `log.md`. This avoids turning global coordination files into merge
  conflict hotspots.
- The current rule that every step appends the global `log.md` would need careful
  amendment: child progress remains durable in the child ledger, while the global
  log records the integrated result. This is proposed, not accepted.
- `master` remains the owner's stable dogfood state. Lane work is not visible
  there until it passes the integration gate.

## Conflict routing

```text
proposed child
      |
      v
declare files and contracts it may change
      |
      v
overlap with a running lane?
      |
      +-- no ------> execute concurrently in its worktree
      |
      +-- partial -> reproduce/research/plan concurrently;
      |              queue overlapping implementation
      |
      +-- yes -----> serialize behind the lane owning that surface
```

Therefore `N` is not a fixed provider- or machine-specific number. It is the
number of pairwise-independent write surfaces and dependency branches that the
repository can safely support at that moment, bounded by integration capacity.

## Feedback fine-tuning loop

The proposed continuous-feedback flow was:

```text
owner uses master
  -> reports friction
  -> pin exact commit + artifact/vault/configuration
  -> open a short accepted feedback child
  -> reproduce and add a regression test
  -> check overlap with running delivery children
  -> implement immediately if independent, otherwise queue the edit
  -> integrate correction into master
  -> roadmap children absorb it at a safe rebase checkpoint
```

One unresolved policy question is whether reproduced owner feedback normally has
priority for integration into `master`, forcing longer roadmap children to absorb
it, or normally waits until the current roadmap step closes.

## Candidate integration gate

A child marked ready would not merge itself. A single integration operation would:

1. confirm that the child was accepted and its branch is clean;
2. compare the actual diff with the declared write surface;
3. detect dependency or ownership conflicts;
4. update it against the latest integrated base and resolve conflicts explicitly;
5. run its gates bare, then integrate its commits;
6. run the complete relevant gates on the integrated state;
7. update the parent ledger, active-lane view, global log, and register when
   applicable;
8. mark the child integrated and only then offer recoverable worktree cleanup.

The first version should remain a Markdown-and-Git convention. Lightweight
validation may follow, but the proposal does not justify a scheduler, service, or
database.

## Possible implementation path (not opened)

If accepted later, the workflow could be introduced through a dedicated, small
process path after the current path closes rather than silently widening
CP-MVP-009:

```text
CP-OPS-001 — Concurrent execution lanes

S01  accept the concurrency doctrine and ADR
S02  amend the bootstrap, execution-state, template, and Git documents
S03  change ACTIVE.md into a parent + child pointer view without duplicated state
S04  add lightweight scope/overlap/readiness validation
S05  pilot one delivery child plus one feedback or investigation child
```

Potential promotion surfaces, only if owner-approved:

```text
docs/adr/ADR-012-concurrent-execution-lanes.md
docs/bedrock/22_22-agent-handoff.md
docs/bedrock/24_24-doc-templates.md
docs/bedrock/27_27-git-compatibility.md
docs/bedrock/35_35-coding-path-execution-state.md
AGENTS.md
atomik-project/coding-paths/ACTIVE.md
atomik-project/coding-paths/index.md
atomik-project/coding-paths/CP-OPS-001.md
atomik-project/log.md
```

The recommended entry point discussed was to complete CP-MVP-009's remaining
S07/S08 work, then offer this process path at its closing ceremony. An earlier
interruption would itself need an explicit owner-approved checkpoint and path
transition.

## Questions deliberately left open

1. Is a separate worktree mandatory for every concurrent writing lane?
2. Does owner feedback normally preempt roadmap integration or wait for a step
   boundary?
3. Is the integrator a fixed role for a session, and may that role rotate between
   integrations?
4. What is the minimal child status lifecycle?
5. How precise must declared write scopes be, and how are expansions approved?
6. Which global files are integrator-only?
7. Does the root log record only integrated work while child ledgers record
   pre-integration progress?
8. Should investigation lanes be accepted coding paths whenever they write code,
   even when their output is intentionally disposable?
9. How are ports, Electron user-data directories, fixtures, and other test runtime
   resources namespaced across worktrees?
10. Should the first implementation be entirely procedural, or include a small
    validation command from day one?

## Session outcome (superseded the same day — see below)

At the moment this note was written, no architecture, priority, workflow rule,
filename, or implementation path had been accepted; it preserved the proposal
for later owner judgment only. The owner judged it a few hours later.

## Owner rulings, 2026-08-14 — the note is no longer purely provisional

The proposal above was reviewed with the owner the same day. Eleven rulings
were recorded, verbatim, in
`../sessions/2026-08-14-cp-ops-001-opening-check.md`; the surviving convention
is `../coding-paths/paths.md`, drawn as `../../docs/diagrams/D13_concurrent_execution_lanes.svg`.
What changed relative to the text above:

- **Accepted as drafted**: the parent/lane/gate split; `master` as the stable
  dogfood state; one writer per working tree; the conflict routing; N as a
  count of independent write surfaces rather than a fixed number.
- **Amended — declared write surfaces are ADVISORY, not exclusive.** The
  "declared paths are exclusive while a lane is running" rule is dropped. A
  root cause is discovered, not declared (S07b's evidence). The declaration
  survives as an overlap signal at open and a diff check at the gate.
- **Amended — the write surface must include DOCUMENTATION.** The candidate
  contract above declared only code and tests, but bedrock 22 step 9 obliges
  every step to update the module note, and `docs/modules/atomik-desktop.md`
  was ONE 1689-line file — a guaranteed conflict for every lane on every step.
  It is now an index over per-area notes (CP-OPS-001 S02).
- **Amended — ceremonies stay at the PARENT** (the note never asked this, and
  three lanes would otherwise have meant six owner ceremonies), with a
  carve-out: a lane opening new architecture runs its own opening check.
- **Amended — the taxonomy gained a fourth case.** Delivery / feedback /
  investigation all assume a lane is a slice of the parent MILESTONE. Provider
  expansion is not. Such work gets its own path number, and the invariant is
  restated as *exactly one active INTEGRATION parent*; the register carries a
  `running lane` status.
- **Corrected — bedrock 27 is NOT a promotion surface.** It is the product's
  Git-compatibility contract (a user's vault inside a Git repo), not this
  repository's branching workflow. Homes are 35 and 22.
- **Closed — question 2** (feedback preempts roadmap integration, as S06b/S07b/
  S07c already did in practice) and **question 7** (the root log records
  integrated work only; lane ledgers hold pre-integration progress).
- **Closed — question 1 and question 9 together.** A worktree is not mandatory
  in doctrine, but IS required in this configuration, because the owner
  dogfoods `master` in the main tree. Question 9 turned out to be a blocker
  rather than a detail: the app could not run twice at all — no
  `app.setPath('userData', …)` anywhere and no dev-port configuration, so two
  instances shared one Electron profile (cookie jar, localStorage, caches).
  Closed by `apps/desktop/electron-main/lane.ts` (CP-OPS-001 S01).
- **Amended — the implementation path is REORDERED.** The sketch above ran
  S01 doctrine + S02 amendments first and piloted at S05. Bedrock 35 §Start as
  one file says structure follows demonstrated need, so CP-OPS-001 lands the
  working convention first, pilots it, and ratifies last. The owner's
  challenge — *"if we decide of a clean workflow together why do you want me to
  fail on a old audited workflow ?"* — settled the shape: the workflow is
  decided AND WRITTEN before anything runs; only the ADR and the bedrock
  amendments wait for the pilot.

Still open after the rulings: whether the integrator is a fixed or rotating
role, the minimal lane status lifecycle, how precise a declared surface must
be, whether disposable investigation lanes are accepted paths, and whether any
of it justifies a validation command. Those are the pilot's questions
(CP-OPS-001 S05), listed at the end of `../coding-paths/paths.md`.
