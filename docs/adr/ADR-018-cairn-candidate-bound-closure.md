---
type: Atomik ADR
title: 'ADR-018: Cairn candidate-bound closure, truthful lifecycle, and team enforcement boundaries'
description: Preserves Cairn as a team protocol built from documented, remotely resumable coding paths while binding audit and acceptance to the exact merge candidate, making lifecycle claims truthful, failing critical unknowns closed, and stating the trust boundary.
tags: [adr, cairn, closure, lifecycle, teams, audit, acceptance, enforcement]
timestamp: 2026-08-25T00:00:00Z
adr:
  id: ADR-018
  status: proposed
  date: 2026-08-25
---

# ADR-018: Cairn candidate-bound closure, truthful lifecycle, and team enforcement boundaries

Status: proposed
Date: 2026-08-25
Amends: ADR-012, ADR-016, ADR-017

## Context

An external senior review evaluated the same Cairn protocol state through an
earlier presentation. Its central finding is accepted: Cairn already preserves
project memory and makes parallel work inspectable, but several closure and
enforcement claims are stronger than the predicates that support them.

This correction does **not** narrow Cairn to one owner and does not replace its
branch model. Cairn remains a project-documentation-based coding protocol for a
team of developers and coding agents. Each coding path is independently
navigable and every completed checkpoint is pushed to its remote path branch,
so another authorised developer or agent can pull it, read its path, ledger,
brief and governing documents, and continue without reconstructing a chat.

The defects concern what Cairn may claim about final acceptance, integration,
governance and audit—not the durable path and checkpoint model itself.

## Decision

### 1. The coding-path and remote-checkpoint model remains Cairn's core

Several paths may run concurrently, each on its own branch and worktree. One
writer is assigned to a writable worktree at a time. That is an operating
assignment, not a property Git or a worktree can enforce. The writer may change
at a completed remote checkpoint; the path is not permanently owned by the
person or agent that opened it.

Every completed step still produces one coherent code/tests/docs/ledger/brief
work unit and one immediate remote checkpoint. A step whose definition of done
includes user or reviewer testing remains a **candidate** until that pass: it is
kept uncommitted and unpushed for inspection, then committed and pushed
immediately after explicit acceptance. This places acceptance before the word
“complete” without weakening the remote-resume guarantee for completed work.

### 2. Closure is bound to one exact implementation candidate

The closing sequence is:

```text
rebase on current trunk
  → produce implementation candidate C
  → run product and protocol checks on C
  → audit exactly C
  → resolve findings; if implementation changes, produce a new C and repeat
  → an authorised reviewer accepts exactly C
  → create one administrative closure commit A after C
  → A may change closure records and path metadata only
  → run the final protocol check on A
  → integrate through the repository's declared transport
  → record `done` only in the integrating trunk change
```

The closing record MUST declare:

```yaml
path: CP-EXAMPLE-001
ceremony: closing
subject_commit: 0123456789abcdef0123456789abcdef01234567
accepted_by: reviewer-identity
accepted_at: 2026-01-15T14:30:00Z
decision: accepted
scope_ref: project/coding-paths/CP-EXAMPLE-001.md#definition-of-done
```

The audit MUST declare the same full `subject_commit`. An audit for an earlier
path commit does not satisfy closure for a later candidate. Administrative
commit `A` solves the self-reference problem: the records can name parent `C`
without pretending to audit or accept the commit that contains themselves.

Only configured closure surfaces may differ between `C` and `A`: the path
record, its handoff brief, its closing record and its audit record. Any product,
architecture or implementation change invalidates the acceptance and requires a
new candidate.

### 3. `ready` and `done` state different facts

The lifecycle becomes:

```text
draft → running ↔ blocked → ready → done → archived
           │          ▲       │
           └──────────┘       └→ running   candidate invalidated

running | blocked → archived   resolution: abandoned | superseded
done              → archived   resolution: completed
```

- `running` means accepted, registered and being executed.
- `blocked` means execution is paused by a named condition. It retains
  `branch` and `base_commit`, because dormant work needs traceability.
- `ready` means exact candidate `C` has passed its checks, audit and acceptance;
  the path branch has not yet claimed integration.
- `done` means the accepted candidate is integrated on the trunk.
- `archived` is terminal and requires
  `resolution: completed | abandoned | superseded`.

A path branch MUST NOT set itself to `done`. The integrating trunk change or
transport records that fact. If `ready` becomes stale because the trunk or
implementation changes, the path returns to `running` and repeats closure.

Where a previous version of a path file is available, the validator compares it
with the proposed state and enforces the transition. A missing required previous
state is `inconclusive`, not evidence that any transition was valid.

### 4. Critical checks have three outcomes

Every critical predicate has one of three outcomes:

```text
pass          the predicate is proved
fail          the predicate is disproved
inconclusive  a required input is unavailable
```

`fail` and `inconclusive` both exit non-zero for registration, rebase, candidate
binding, transition and record-integrity gates. The diagnostic names the missing
input and the repair, such as fetching the complete trunk ref. Advisory questions
such as path age may remain silent when evidence is unavailable because they do
not certify merge safety.

### 5. Durable-record properties are enforced where they are objective

For new and changed records, Cairn checks objective repository properties:

- path ids and branch names are unique;
- `base_commit` resolves and equals the parent of the registration commit;
- an existing session, audit, rolled-ledger or journal entry is not rewritten,
  renamed or deleted;
- an audit and closing acceptance name the exact candidate;
- closure commits touch only their allowlisted administrative surfaces;
- ledger content declared append-only remains a prefix, or appears byte-for-byte
  in the newly added history record when rolled.

The last check requires an explicit ledger schema and markers. Until that schema
is implemented, documentation MUST describe append-only ledger integrity as a
protocol requirement rather than as an enforced property.

### 6. Cairn states its team trust boundary

Cairn's local and CI profiles protect against accidental omission,
mis-coordination and silent loss of execution state among collaborating writers.
They are not an adversarial security boundary. A writer able to change the
validator, its tests and the workflow can otherwise weaken the mechanism that
judges the change.

The control plane consists at least of the validator, configuration, schemas,
templates, generated-catalogue logic and CI workflow. A repository may claim a
protected profile only when it declares and tests both:

1. an exact-commit integration transport, such as a pull request with merge
   queue, candidate-ref fast-forward, or trusted merge bot; and
2. independent protection for control-plane changes, such as restricted
   ownership or approval by an authorised actor other than the last writer.

Without both, the repository declares `local` or `ci`; it does not claim that
the host prevents a merge. Git history is tamper-evident relative to a previously
known hash. Immutability additionally requires protected refs, signatures or an
external anchor and is never implied by Git alone.

### 7. General usability is a measured release claim

`cairn-init`, `cairn-new` and `cairn-close` are reliability mechanisms for
multi-step transactions, not cosmetic conveniences. A generally usable release
also needs documented lightweight and emergency paths plus a pilot measuring
ceremony time, ignored advisories, merge retries, documentation churn and
recovery quality.

The canonical specification may define these requirements before every profile
is implemented only if it carries an explicit conformance matrix distinguishing:

- required protocol behaviour;
- behaviour implemented by the reference tools;
- host-dependent behaviour;
- behaviour not yet implemented.

## Consequences

- Cairn remains a team protocol whose path branches are remote, inspectable and
  resumable at every completed checkpoint.
- ADR-017's pre-merge use of `done`, branchless `blocked` state and rejection of
  observable transition checks are amended.
- ADR-016's protected tier becomes a capability claim that requires a named,
  tested transport and independently protected control plane.
- Existing historical paths are records of the schema under which they closed.
  New checks are forward-scoped to new or changed transitions and records rather
  than rewriting those histories.
- Retaining a merged path branch remains allowed for navigation but is not a
  correctness requirement when its commits are proved reachable from the remote
  trunk. Running path branches remain required because they are the remote
  checkpoints from which a team resumes.
- The reference checker catalogue is an inventory of implemented predicates,
  not proof that prose descriptions are true. Predicate descriptions must cite
  executable evidence and known gaps remain visible in the conformance matrix.

## Alternatives considered

- **Scope Cairn to one owner and trusted agents.** Rejected. It confuses the
  maturity of the current implementation with Cairn's purpose. Team operation is
  the design target; incomplete team-grade enforcement is stated honestly.
- **Add a contribution-branch hierarchy inside every path.** Rejected. The
  review does not require a new branch model. Multiple paths already provide
  parallelism, and a path can change writers at a remote checkpoint.
- **Keep `done` on the path branch but redefine it as ready.** Rejected. A new
  word is clearer than making `done` mean something other than completion.
- **Accept an audit for any path commit.** Rejected. It proves that some earlier
  state was examined, not that the proposed result was examined.
- **Treat an unavailable trunk or prior state as success.** Rejected. Absence of
  evidence cannot certify a critical predicate.

## Migration / rollback

This decision is forward-scoped. Existing completed paths and their records are
not rewritten. Running paths adopt the candidate-bound closing schema when they
next close. The checker may recognise old untouched records as historical, but
any new or modified closing record uses the new schema.

Rollback would restore closure and enforcement claims that are stronger than
their predicates. It would not alter the remotely resumable coding-path model,
which this decision preserves.

## Links

- Parallel paths and self-merge: [ADR-012](./ADR-012-parallel-paths-self-merge.md)
- Enforcement integrity and tiers: [ADR-016](./ADR-016-cairn-enforcement-integrity.md)
- Existing lifecycle: [ADR-017](./ADR-017-coding-path-lifecycle.md)
- Canonical specification: [`docs/cairn/specification/index.md`](../cairn/specification/index.md)
- Operating detail: [`atomik-project/coding-paths/paths.md`](../../atomik-project/coding-paths/paths.md)
