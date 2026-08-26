---
type: Cairn Specification
title: Cairn — canonical protocol specification
description: A precise, newcomer-accessible specification of Cairn as a repository-native team protocol with durable, remotely resumable coding paths.
tags: [cairn, specification, protocol, team, coding-path, git, ci]
timestamp: 2026-08-25T00:00:00Z
cairn:
  article: specification
  kind: specification
  status: canonical
  version: 0.1
---

# Cairn

Cairn is a protocol kept inside a [Git repository](./concepts/repository.md) for
a team of developers and coding agents. It turns one bounded software change
into a durable [coding path](./concepts/coding-path.md). That path can be
inspected, checked, handed over, resumed from a
[remote checkpoint](./concepts/remote-checkpoint.md), and integrated without
reconstructing a conversation.

This document is the canonical Cairn v0.1 specification. “Canonical” means it is
the authoritative statement of the protocol. “v0.1” means its current
[conformance profile](./concepts/conformance.md) is deliberately narrow: Cairn
is ready to evaluate as a trusted-team coordination and project-memory
protocol, but it does not yet claim general-purpose governance or adversarial
security.

The specification is written as a learning route. It begins with the small
ideas that make work durable, combines them into one coding path, then adds
parallel work, evidence, closure, integration, and governance. Every specialised
[Git](./concepts/git.md) or Cairn term links to one article in the
[concept index](./concepts/index.md).
The [implementation reference](./reference/index.md) contains exact trees,
schemas, templates, and command sequences. Concept and reference articles
explain this page; they do not silently create additional requirements.

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY**
express requirements:

- **MUST / MUST NOT** — required for conformance;
- **SHOULD / SHOULD NOT** — the default, with any departure recorded;
- **MAY** — optional.

## Begin with work that survives

A [file](./concepts/file.md) is durable when it remains available after the
current person, agent, process, or conversation ends. A
[repository](./concepts/repository.md) is a directory whose history is recorded
by [Git](./concepts/git.md). A [commit](./concepts/commit.md) is one named
snapshot in that history, and a [commit hash](./concepts/commit-hash.md)
identifies that snapshot and the history leading to it.

Cairn uses those ordinary objects as
[project memory](./concepts/project-memory.md). At any time, a team member who
can read the repository SHOULD be able to answer:

1. Which pieces of work are active?
2. What result is each piece meant to produce?
3. Who or what may write each piece now?
4. What has been completed, checked, accepted, or blocked?
5. Which exact remote state can another authorised participant resume?
6. Which exact result is being proposed for integration?

The answers MUST live in repository files and Git history. A chat, local process
memory, private note, or unpushed checkout MAY help current work, but MUST NOT be
the only location of a completed decision, checkpoint, or next action.

### The complete protocol in one view

In ordinary language: agree on one change, make that work visible to the team,
advance it in recoverable pieces, evaluate the exact result, record who accepted
that result, and only then add it to the shared product. Cairn gives each action
a precise name:

| What the team does | Cairn name introduced here |
| :-- | :-- |
| Agree on the outcome, boundaries, and first writer | [opening acceptance](./concepts/opening-acceptance.md) |
| Publish the accepted plan before implementation starts | [trunk registration](./concepts/trunk-registration.md) |
| Give the change its own visible history and editable directory | path [branch](./concepts/branch.md) and [worktree](./concepts/worktree.md) |
| Advance implementation, tests, documents, and progress together | [work unit](./concepts/work-unit.md), [work ledger](./concepts/work-ledger.md), and [handoff](./concepts/handoff.md) |
| Publish every completed piece so another participant can resume it | [remote checkpoint](./concepts/remote-checkpoint.md) |
| Reapply the work to the newest shared base | [rebase](./concepts/rebase.md) |
| Name the exact product result being proposed | [implementation candidate](./concepts/implementation-candidate.md) |
| Check that exact result against software and project knowledge | [automated checks](./concepts/cairn-checker.md) and [coherence audit](./concepts/coherence-audit.md) |
| Record an authorised decision about that exact result | [closing acceptance](./concepts/closing-acceptance.md) |
| Add only records about the accepted result | [administrative closure](./concepts/administrative-closure.md), producing the [ready state](./concepts/ready-state.md) |
| Carry the checked result into shared history without changing it | [integration transport](./concepts/integration-transport.md) |
| Record that the accepted result is now on the [shared trunk](./concepts/trunk.md) | [done state](./concepts/done-state.md) |

Several paths may execute at the same time. Registration and integration are
ordered because they change the shared [trunk](./concepts/trunk.md); the work
between them remains parallel. Each path remains responsible for carrying its
accepted candidate through its declared
[integration transport](./concepts/integration-transport.md). Cairn does not
create a permanent central integrator role.

## Put one bounded change on a coding path

A [coding path](./concepts/coding-path.md) is one bounded outcome and its durable
route from accepted intent to integration. It has:

- one stable identifier, such as `CP-SEARCH`;
- one [path record](./concepts/path-record.md), such as
  `project/coding-paths/CP-SEARCH.md`;
- one [branch](./concepts/branch.md), such as `path/cp-search`;
- one dedicated [worktree](./concepts/worktree.md);
- one [assigned writer](./concepts/writer-assignment.md) for that writable
  worktree at a time;
- one ordered plan, ledger, current checkpoint, and next action.

The invariant is structural, not personal:

> One coding path maps to one path record, one path branch, and one writable
> worktree. One writer is assigned to that writable worktree at a time.

### Team roles

One path may involve several roles:

| Role | Responsibility |
| :-- | :-- |
| [Path initiator](./concepts/path-initiator.md) | frames the bounded outcome and proposes its first plan |
| [Path writer](./concepts/path-writer.md) | produces the current work unit in the assigned writable worktree |
| [Authorised reviewer](./concepts/authorised-reviewer.md) | accepts opening scope or an exact closing candidate under repository policy |
| [Auditor](./concepts/auditor.md) | evaluates candidate coherence against project knowledge and parallel paths |
| [Cairn checker](./concepts/cairn-checker.md) | evaluates deterministic repository predicates |
| [Integrator](./concepts/integrator.md) | path-scoped responsibility for operating or supervising the declared exact-commit transport |

Roles are responsibilities, not permanent identities. A developer or coding
agent may hold more than one where repository policy permits it. Stronger
[enforcement profiles](./concepts/enforcement-profile.md) can require
separation—for example, independent approval when a path changes the Cairn
[control plane](./concepts/control-plane.md).

A team may contain multiple developers and multiple agents per developer.
Different writers may work on different paths concurrently. Other participants
may read, test, review, or advise a path. The assigned writer may change at a
pushed checkpoint through a recorded [handoff](./concepts/handoff.md). A path is
therefore not permanently owned by the person or agent that opened it.

A Git worktree provides filesystem isolation; it does not establish exclusive
ownership. [Writer assignment](./concepts/writer-assignment.md) is a team
responsibility. Repositories needing a stronger guarantee require a lease or
allocator outside the v0.1 reference tools.

### The path record

The canonical path filename is:

```text
project/coding-paths/CP-<ID>.md
```

Its [Markdown](./concepts/markdown.md)
[frontmatter](./concepts/frontmatter.md) begins with an exact machine-readable
[schema](./concepts/schema.md):

```yaml
cairn:
  id: CP-EXAMPLE-001
  status: running
  current_step: S02
  base_commit: 0123456789abcdef0123456789abcdef01234567
  branch: path/cp-example-001
  assigned_writer: participant-id
  writes:
    - src/example/**
    - docs/modules/example.md
```

The path MUST describe:

- its intended outcome and definition of done;
- ordered, independently checkable steps;
- governing and conditional documents;
- deliberately excluded material;
- expected write surfaces;
- the work ledger, current checkpoint, next action, and blockers;
- the last completed remote checkpoint.

The identifier MUST use `CP-<UPPERCASE-ID>`, the filename MUST be
`<ID>.md`, and the branch MUST be `path/<lowercase-id>`. Identifiers and branch
names MUST be unique and MUST NOT be reused for unrelated work.

The `writes:` list is a [declared write surface](./concepts/declared-write-surface.md).
It makes likely overlap visible. It is an advisory signal, not a filesystem
lock: a path may discover a necessary wider change, record why, update the
declaration, and continue.

The full copy-ready form is the [coding-path template](./reference/path-template.md).

### The repository around the path

A Cairn repository separates four things before naming their folders:

- application source is the software being changed;
- the [control plane](./concepts/control-plane.md) contains the checker,
  generators, configuration, and [continuous-integration](./concepts/continuous-integration.md)
  adapter that evaluate the protocol;
- the durable knowledge plane contains
  [architecture](./concepts/architecture.md),
  [decision records](./concepts/decision-record.md),
  [module notes](./concepts/module-note.md), and this specification;
- the durable execution plane contains
  [path records](./concepts/path-record.md), immutable event records,
  [audits](./concepts/coherence-audit.md),
  [handoff briefs](./concepts/handoff.md), and integrated-outcome
  [journal entries](./concepts/journal.md).

Within a meaningful documentation folder, `index.md` explains what belongs
there and how to navigate it; `log.md` summarises recent changes in that folder.
Independent events use one file per event. Generated
[live views](./concepts/live-view.md) are rebuilt from their source records
rather than edited as another truth.

`AGENTS.md` is the small entry point that tells a new participant what to read
first. `cairn.config.json` binds portable role names to repository paths. The
workflow and `cairn-*` tools form the executable control plane. Three optional
[project-memory](./concepts/project-memory.md) spaces may accompany execution:
`brainstorm/` for explicitly provisional thinking, `sources/` for imported
references, and `projects/` for nested project bundles. These names are defined
here before they appear in the tree; none is an unexplained source of authority.

The following tree is exhaustive for the roles and files Cairn defines. Names
inside angle brackets are repeatable patterns; application-specific source and
knowledge may add other folders without changing Cairn:

```text
repository/
├── AGENTS.md
├── cairn.config.json
├── .github/
│   └── workflows/
│       └── cairn.yml
├── tools/
│   ├── cairn-check.<runtime>
│   ├── cairn-active.<runtime>
│   ├── cairn-audit.<runtime>
│   ├── cairn-rules.<runtime>
│   ├── cairn-spec-build.<runtime>
│   └── <tool-name>.test.<runtime>
├── <application-source-root>/
│   └── <application-files>
├── docs/
│   ├── architecture/
│   │   ├── index.md
│   │   ├── log.md
│   │   ├── <architecture-page>.md
│   │   └── archive/
│   │       └── <superseded-page>.md
│   ├── adr/
│   │   ├── index.md
│   │   ├── log.md
│   │   └── ADR-<NNN>-<decision>.md
│   ├── modules/
│   │   ├── index.md
│   │   ├── log.md
│   │   └── <implemented-area>.md
│   └── cairn/
│       ├── index.md
│       ├── specification.html
│       └── specification/
│           ├── index.md
│           ├── log.md
│           ├── concepts/
│           │   ├── index.md
│           │   └── <concept>.md
│           └── reference/
│               ├── index.md
│               └── <reference-article>.md
└── project/
    ├── index.md
    ├── log.md
    ├── coding-paths/
    │   ├── index.md
    │   ├── log.md
    │   ├── paths.md
    │   ├── ACTIVE.md
    │   ├── CP-<ID>.md
    │   └── history/
    │       ├── index.md
    │       ├── log.md
    │       └── CP-<ID>-S<NN>.md
    ├── sessions/
    │   ├── index.md
    │   ├── log.md
    │   ├── <date>-<path-id>-<event>.md
    │   └── <date>-<session>/
    │       └── <session-artifact>.md
    ├── audits/
    │   ├── index.md
    │   ├── log.md
    │   └── <path-id>-<full-subject-commit>.md
    ├── briefs/
    │   ├── index.md
    │   ├── log.md
    │   ├── <path-id>-handoff.md
    │   └── <date>-<subject>.md
    ├── log/
    │   ├── index.md
    │   └── <date>-<path-id>.md
    ├── brainstorm/
    │   ├── index.md
    │   ├── log.md
    │   └── <provisional-note>.md
    ├── sources/
    │   ├── index.md
    │   ├── log.md
    │   └── <source-record>.md
    └── projects/
        ├── index.md
        ├── log.md
        └── <nested-project>/
            ├── index.md
            ├── log.md
            └── <project-descriptor>.json
```

`cairn.config.json` is the specified portable binding file. It is part of the
protocol layout but is not yet loaded or installed by the v0.1 reference tools.

The protocol role name for the execution plane is `project/`. The current
reference tools bind that role to `atomik-project/` and bind
`docs/architecture/` to `docs/bedrock/`; the not-yet-implemented portable
configuration will make those bindings selectable. The exact installed tree,
file roles, naming rules, and portable mapping are in the
[repository-layout reference](./reference/repository-layout.md).

## Make progress resumable

A [work unit](./concepts/work-unit.md) is the smallest completed change Cairn
recognises. One work unit contains, where relevant:

- implementation;
- tests;
- affected architecture, decision, and module documentation;
- one appended [work-ledger](./concepts/work-ledger.md) entry;
- a refreshed handoff brief;
- verification results.

These parts MUST move together. Source changed without its affected tests,
documents, or path state is not a completed Cairn work unit.

### Check the work before calling it complete

A [test](./concepts/test.md) is an executable example whose result can be
observed. A process [exit code](./concepts/exit-code.md) is zero for success and
non-zero for failure. Gates MUST be run directly so their exit code remains the
verdict; output MUST NOT be filtered in a way that hides or replaces it.

If a work unit is explicitly delivered for a user or reviewer to test before it
is accepted, it remains an uncommitted and unpushed candidate during that
inspection. It MUST NOT be reported as complete. After an explicit pass, the
writer commits it and pushes it immediately. A failed review returns the work
unit to execution.

This inspection rule is distinct from final closing acceptance: a step review
accepts that work unit for checkpointing; closing acceptance later names the
exact final implementation commit.

### Commit and push form one completed checkpoint

A local commit is not yet shared. A [remote](./concepts/remote.md) is a shared
copy of the repository reached through Git. [Push](./concepts/push.md) publishes
local commits to it; [fetch](./concepts/fetch.md) retrieves remote refs without
changing the current working files.

Every completed work unit MUST become one coherent commit and MUST be pushed
immediately to its remote path branch. Only then is it a
[remote checkpoint](./concepts/remote-checkpoint.md). The ledger and handoff
brief MUST name that exact checkpoint and the next action.

Any authorised participant can then fetch the branch, open the path record,
read its governing documents and ledger, verify the checkpoint, and continue
from the stated next action. “Implemented locally” and “completed” are not
synonyms.

The work ledger is append-only in protocol semantics. Completed ledger sections
MAY move byte-for-byte into uniquely named files under
`project/coding-paths/history/` when the live record becomes too large.
Summarising a rolled entry is not equivalent to retaining it. The reference
checker protects existing history records from rewrite, but does not yet prove
that live ledger text remains a byte prefix or was rolled verbatim; the
[conformance matrix](#current-conformance) states this limit explicitly.

## Let paths work beside one another

A [working tree](./concepts/working-tree.md) is the checked-out files a process
can edit. A Git worktree gives another working tree for the same repository.
Each running, blocked, or ready path MUST retain its branch and base commit, and
its remote path branch MUST retain its latest completed checkpoint.

Paths avoid unnecessary collisions through structure:

- each path edits its own path record and brief;
- sessions, audits, history, and journal records use one file per event;
- shared summaries such as `ACTIVE.md` are generated from canonical records;
- expected overlap is visible through `writes:` declarations;
- integrations are serialised even though execution is parallel.

The generated [live view](./concepts/live-view.md) MUST include `running`,
`blocked`, and `ready` paths. It is navigation, not an independent source of
truth, and MUST NOT be hand-edited.

Overlapping declarations do not automatically mean a conflict. A
[conflict](./concepts/conflict.md) occurs when Git cannot combine changes
without a choice. Paths that discover semantic overlap SHOULD coordinate at
their latest remote checkpoints, record any scope change, and preserve one
writer per writable worktree.

Running path branches are required because they carry resumable checkpoints.
After integration, retaining the path branch is optional if every path commit is
proved reachable from the remote trunk. Deleting a branch name does not delete
commits already reachable from that trunk.

## Separate evidence from judgement

Cairn distinguishes facts a program can prove from judgements a person or agent
must make.

Mechanical evidence includes:

- whether a file exists and matches a [schema](./concepts/schema.md);
- whether identifiers are unique;
- whether one commit is an ancestor of another;
- whether a command returned zero;
- whether an existing record was rewritten;
- whether a diff stayed inside an allowed closure surface.

Judgement includes:

- whether the intended outcome is the right one;
- whether an architectural explanation is coherent;
- whether a known limitation is acceptable;
- whether an advisory should be fixed or deferred.

A [blocking finding](./concepts/blocking-finding.md) means a required predicate
was disproved. An [advisory finding](./concepts/advisory-finding.md) identifies
risk or drift that requires a disposition but does not mechanically forbid
progress. An [inconclusive finding](./concepts/inconclusive-finding.md) means a
required input was unavailable.

Critical gates use exactly three outcomes:

```text
pass          predicate proved
fail          predicate disproved
inconclusive  required input unavailable
```

For registration, trunk ancestry, lifecycle transition, candidate binding, and
record-integrity gates, both `fail` and `inconclusive` MUST return non-zero.
A shallow or misconfigured checkout cannot turn missing evidence into success.
An advisory such as path age MAY remain silent when its evidence is unavailable
because it does not certify integration safety.

[Continuous integration](./concepts/continuous-integration.md) can repeat the
same deterministic checks in a clean environment. CI observes and reports
unless the repository host is separately configured to require its exact
result.

## Open and register work

A path becomes shared work through [opening acceptance](./concepts/opening-acceptance.md)
followed by [trunk registration](./concepts/trunk-registration.md).

### Opening acceptance

Before implementation, the team MUST review the proposed outcome, definition of
done, steps, governing documents, expected write surfaces, exclusions, and
initial writer assignment. An authorised participant records the decision:

```yaml
path: CP-EXAMPLE-001
ceremony: opening
decision: accepted
accepted_by: participant-id
accepted_at: 2026-01-15T09:00:00Z
scope_ref: project/coding-paths/CP-EXAMPLE-001.md#definition-of-done
```

The repository's governance decides who is authorised. Cairn does not require
one permanent owner. The initiator, reviewer, writer, and integrator may be
different developers or agents, subject to repository policy.

### Registration before branching

Registration makes the path visible before implementation becomes private to a
branch:

1. Fetch the current remote trunk and require a clean registration checkout.
2. Record its exact tip as base commit `B`.
3. Add the accepted opening record and path declaration with `status: running`.
4. Regenerate the live view.
5. Create one metadata-only registration commit `R` on the trunk.
6. Prove that `parent(R) = B`.
7. Integrate and push `R` through the repository's declared transport.
8. Create `path/<id>` and its worktree from the registered trunk.
9. Push the path branch before reporting it available.

The path MUST exist on the remote trunk before implementation begins. A
protected host profile therefore needs a registration-aware transport; it MUST
NOT require the not-yet-landed declaration as a precondition for landing that
same declaration.

## Close one exact implementation candidate

Closure is about an immutable identity, not whichever files happen to be at
`HEAD` later. An [implementation candidate](./concepts/implementation-candidate.md)
is the exact commit `C` proposed as the product result.

### Produce and audit candidate C

1. Fetch the remote trunk.
2. [Rebase](./concepts/rebase.md) the path onto it, resolving every conflict.
3. Complete any required user inspection before checkpointing.
4. Commit and push the resulting implementation candidate `C`.
5. Run product checks and the Cairn checker against exactly `C`.
6. Perform a [coherence audit](./concepts/coherence-audit.md) of exactly `C`.
7. If a finding changes implementation, create a new candidate and repeat.

A rebase reconstructs path commits on a newer base and therefore normally
changes their hashes. Acceptance or audit of a pre-rebase commit cannot certify
the rebased result.

The audit record MUST use the full candidate hash in both its filename and
metadata:

```text
project/audits/cp-example-001-0123456789abcdef0123456789abcdef01234567.md
```

```yaml
cairn:
  path: CP-EXAMPLE-001
  branch: path/cp-example-001
  base: 0123456789abcdef0123456789abcdef01234567
  subject_commit: fedcba9876543210fedcba9876543210fedcba98
  verdict: clean
```

The audit records a reasoned judgement. The checker can prove that the record
exists, is complete, names `C`, and is not later rewritten; it cannot prove that
the judgement is wise.

### Accept candidate C

An authorised reviewer performs [closing acceptance](./concepts/closing-acceptance.md)
of the same candidate. The record MUST declare:

```yaml
path: CP-EXAMPLE-001
ceremony: closing
subject_commit: fedcba9876543210fedcba9876543210fedcba98
accepted_by: participant-id
accepted_at: 2026-01-15T14:30:00Z
decision: accepted
scope_ref: project/coding-paths/CP-EXAMPLE-001.md#definition-of-done
advisory_disposition: "fixed: none; accepted: scope-drift; deferred: none"
```

The subject hash MUST be all 40 hexadecimal characters. The accepted scope MUST
be identifiable. Every advisory MUST be recorded as fixed, accepted, or
deferred with a reason.

### Add only administrative closure

Recording acceptance necessarily creates a commit after `C`. Cairn resolves
that self-reference with one [administrative closure](./concepts/administrative-closure.md)
commit `A`:

```text
C  exact implementation candidate
└─ A  path status ready + audit + closing record + refreshed handoff
```

`A` MUST change only the configured closure surfaces: the path record, its
handoff brief, the exact audit, and the exact closing record. Product source,
tests, architecture, and implementation documentation MUST NOT change after
acceptance. The path record declares `status: ready` and
`subject_commit: C`. The final protocol check runs on `A`, then `A` is pushed.

If implementation changes after `C`, even during conflict resolution or audit
repair, `C` is no longer the candidate. Return the path to `running`, produce a
new candidate, and repeat audit and acceptance.

The complete schemas are in [human records](./reference/human-records.md); the
command sequence is in [operations](./reference/operations.md).

## Integrate without claiming the future

[Ready](./concepts/ready-state.md) and [done](./concepts/done-state.md) name
different facts:

- `ready` — exact candidate `C` has checks, audit, and acceptance; the path has
  not claimed integration;
- `done` — `C` is reachable from the remote trunk and the trunk records the
  completed resolution.

A path branch MUST NOT set itself to `done`. The repository's
[integration transport](./concepts/integration-transport.md) integrates the
exact ready tip `A` and records `done` in the trunk integration unit. A
[merge](./concepts/merge.md) commit is one valid transport when its exact result
is checked before the remote trunk accepts it; a host queue or trusted bot may
provide another.

This is Cairn's self-integration rule: the path carries its own accepted result
to the transport instead of handing it to a standing central integrator. The
path writer, another authorised participant, or automation may perform the
path-scoped integrator role according to repository policy.

The integrating unit MUST:

1. start from the current remote trunk;
2. contain `C` and `A` without changing their implementation;
3. change only permitted integration metadata, including `status: done`,
   `resolution: completed`, the live view, and one journal record;
4. pass the final protocol and product checks as the exact trunk candidate;
5. land that exact checked candidate;
6. be fetched back and proved reachable from the remote trunk.

If the trunk moved in a way that changes the candidate, the path returns to
`running` and repeats closure. A local merge preview is not proof that the host
accepted the same commit.

After remote verification, another checkout MAY remove the secondary worktree
only when its exact path is known and it is Git-clean. It MUST NOT use force or
remove the primary checkout. Branch cleanup is optional once reachability from
the remote trunk is proved.

## Keep lifecycle statements truthful

The [lifecycle](./concepts/lifecycle.md) records facts rather than intentions:

```text
draft → running ↔ blocked → ready → done → archived
           │          ▲       │
           └──────────┘       └→ running

draft | running | blocked → archived
```

| State | Exact meaning | Required identity |
| :-- | :-- | :-- |
| [`draft`](./concepts/draft-state.md) | proposed, not registered for execution | id |
| [`running`](./concepts/running-state.md) | accepted, registered, and executable | id, branch, base commit, writer |
| [`blocked`](./concepts/blocked-state.md) | paused by a named condition | the running identity plus blocker and unblock condition |
| [`ready`](./concepts/ready-state.md) | exact `C` audited and accepted; not integrated | running identity plus full subject commit |
| [`done`](./concepts/done-state.md) | accepted candidate integrated on the trunk | subject commit and `resolution: completed` |
| [`archived`](./concepts/archived-state.md) | terminal retained record | `resolution: completed \| abandoned \| superseded` |

Allowed transitions are:

```text
draft   → running | archived
running → blocked | ready | archived
blocked → running | archived
ready   → done | running
done    → archived
archived → archived
```

Self-transitions are allowed while ordinary fields advance. An unintegrated path
archives as `abandoned` or `superseded`, never `completed`. A completed path
archives as `completed`. `blocked` retains its branch and base commit because
dormant work needs more traceability, not less.

The ready state exists on the path branch. The trunk may observe `running → done`
when it integrates a branch whose ready state was never previously present on
the trunk; this is the integration form of `ready → done`, not permission to
skip candidate-bound closure.

When a required earlier state is unavailable, transition validation is
inconclusive and blocks. Path declarations are retained; they are archived
rather than deleted.

## Preserve records without overstating Git

[Record integrity](./concepts/record-integrity.md) applies to sessions, audits,
journal entries, and rolled ledger history. Once such a record exists, a new
change MUST NOT edit, rename, or delete it. A correction creates a new
superseding record that points to the earlier one.

The [journal](./concepts/journal.md) uses one file per integrated outcome under
`project/log/`. A shared append-only `log.md` is not the journal; folder
`index.md` and `log.md` files may remain mutable navigation views where the
repository uses them.

Git provides [tamper evidence](./concepts/tamper-evidence.md) relative to a
previously known hash: rewriting an ancestor changes descendant hashes. Git
alone is not an immutable audit log. Protected refs, signatures, or an external
anchor are needed when the threat model includes authorised writers rewriting
history.

## State the trust and enforcement boundary

Cairn v0.1 assumes collaborating writers. Its local and CI mechanisms protect
against accidental omission, coordination errors, stale bases, malformed
records, and silent loss of execution state. They are not an adversarial
security boundary.

The [control plane](./concepts/control-plane.md) includes the checker,
configuration, schemas, templates, rule-catalogue generator, and CI workflow. A
writer who can change all of those can weaken the mechanism that evaluates the
same change. Stronger governance MUST protect the control plane independently
from ordinary path work.

An [enforcement profile](./concepts/enforcement-profile.md) describes what is
actually installed:

| Profile | What it establishes | What it does not establish |
| :-- | :-- | :-- |
| `local` | participants can run deterministic checks | checks ran remotely or blocked integration |
| `ci` | a remote runner reports checks for declared refs | the host required the result |
| `protected` | the host requires checks for the exact integration candidate | judgement quality or security when the control plane is unprotected |

A repository MUST NOT claim `protected` unless it has both:

1. a tested exact-commit transport for registration and integration; and
2. independent protection or approval for control-plane changes.

Required-status settings alone do not specify how a not-yet-registered path
lands or how a locally created merge commit obtains checks. A protected profile
must name and test its transport instead of relying on a generic branch-setting
claim.

The versioned [configuration reference](./reference/configuration.md) specifies
portable role bindings. The current reference checker remains bound to one
repository layout and a deliberately limited frontmatter subset; it does not
yet implement that portable configuration contract. A conforming portable
implementation MUST either use a standard YAML parser or publish and validate a
distinct format without calling it full YAML.

## Current conformance

[Conformance](./concepts/conformance.md) distinguishes the protocol from one
implementation. A requirement can be canonical before the reference tools
implement it, but its status must be visible.

| Capability | Protocol v0.1 | Reference tools | Additional dependency |
| :-- | :-- | :-- | :-- |
| Path record, branch identity, registration, and remote checkpoints | required | implemented, with repository-specific bindings | remote Git |
| Full opening decision, actor, time, scope, and authority schema | required | **partially implemented**; path and ceremony presence are checked | repository governance |
| Multiple team participants and checkpoint handoff | required | records support it; writer exclusivity is operational | team assignment policy |
| `running`, `blocked`, `ready`, `done`, `archived` lifecycle | required | transition and state checks implemented for observable changes | complete comparison ref |
| Exact-candidate audit and closing acceptance | required | implemented | authorised reviewer |
| Fail-closed critical inconclusive outcomes | required | implemented | complete trunk and comparison refs |
| Existing session, audit, history, and journal immutability | required | implemented for new or changed records | complete comparison ref |
| Live-ledger prefix and verbatim-roll proof | required | **not implemented** | explicit ledger markers/schema |
| Versioned portable configuration and schema migration | required for portable profile | **not implemented** | configuration loader and migrations |
| Exact protected integration transport | required for protected profile | **not installed or tested** | repository-host adapter |
| Independently protected control plane | required for protected profile | **not installed or tested** | host ownership/approval policy |
| Transactional `init`, `new`, and `close` commands | required before general release | **not implemented** | command tooling |
| [Lightweight path](./concepts/lightweight-path.md) | required before general release | **not implemented** | policy and measured thresholds |
| [Emergency path](./concepts/emergency-path.md) | required before general release | **not implemented** | incident policy and retrospective |
| Operational-cost pilot | required before general release | **not run** | representative team |

The current supported claim is therefore:

> Cairn v0.1 is a local-first coordination and project-memory protocol for a
> team of trusted developers and coding agents working through remote Git
> branches. Its reference tools enforce a substantial but incomplete subset of
> the protocol. It is not yet a general-purpose merge, governance, or security
> system.

Operational cost is part of correctness. A pilot SHOULD measure ceremony time,
ignored advisories, integration retries, documentation churn, checkpoint
recovery time, and bypass pressure before a team widens its claims.

## Implemented rule catalogue

This catalogue is generated from the reference checker. It inventories
implemented predicates; it does not make unimplemented protocol requirements
disappear and does not prove that a judgement-bearing record is correct.

<!-- cairn:rules:begin -->
| Level | Rule Name | Scope | Trigger Condition | Enforcing Logic |
| :--- | :--- | :--- | :--- | :--- |
| **Blocking** | `acceptance` | diff | Ready/done path lacks exact-commit acceptance or changed implementation after acceptance | `closingAcceptanceErrors(record, pathId) + pathClosureState(path, record)` |
| **Blocking** | `branch-identity` | diff | Detached checkout where branch cannot be identified from host or git ref | `branchSource === 'detached' (blocking on guarded roots, advisory on others)` |
| **Blocking** | `branch-path` | diff | Path branch not declared by a running path file, or missing base_commit | `isPathBranch(branch) && (!match \|\| !PATH_BRANCH_STATUSES.includes(status) \|\| !isCommitPin(base))` |
| **Blocking** | `coherence-audit` | corpus | Ready path lacks a filled coherence audit bound to its exact subject_commit | `cairn-audit --check --subject path.subject_commit` |
| **Blocking** | `derived-view` | corpus | ACTIVE.md running-paths block does not match trunk path files | `tools/cairn-active.mjs --check` |
| **Blocking** | `links` | corpus | Relative Markdown link points to non-existent target (code fences stripped) | `stripCode(text) => !existsSync(target)` |
| **Blocking** | `opening-ceremony` | diff | Path declared running without an opening-check session note | `!openingFor(pathId) via session frontmatter { path, ceremony: 'opening' }` |
| **Blocking** | `rebase` | diff | Path branch does not contain latest trunk tip (stale branch) | `trunkContained(trunkRef) === false` |
| **Blocking** | `record-integrity` | diff | Existing session, audit, journal, or rolled-history record was modified, renamed, or deleted | `immutableRecordMutations(previousRef) + isImmutableRecord(file)` |
| **Blocking** | `registration` | diff | Path declaration tuple (id, running, branch, base) missing from trunk | `pathRegistrationState() === 'missing' (blocking) or declared migration exception (advisory)` |
| **Blocking** | `registration-base` | diff | Path base_commit cannot be proved to equal the registration commit parent | `pathRegistrationBaseState() === 'mismatch' \| null` |
| **Blocking** | `same-work-unit` | diff | Source changed without accompanying module note and coding path update | `touched(GUARDED_ROOTS) => touched(docs/modules/) && touched(PATH_DIR)` |
| **Blocking** | `schema` | corpus | Path or ADR frontmatter fails parsing, or an id/status/date is outside vocabulary | `pathFrontmatterErrors(front) + adrFrontmatterErrors(front, file, bodyStatus)` |
| **Blocking** | `transition` | diff | Changed path state is not an allowed lifecycle transition, or prior state is unavailable | `transitionErrors(previous, current, onPathBranch)` |
| *Advisory* | `area-note` | diff | Subsystem source changed without touching matching area module note | `areaOf(file) => changed.includes(note)` |
| *Advisory* | `branch-identity` | diff | Detached checkout where branch cannot be identified from host or git ref | `branchSource === 'detached' (blocking on guarded roots, advisory on others)` |
| *Advisory* | `decision-drift` | diff | Configured architecture changed without an ADR in the same changeset | `touched(architectureRoot) => touched(decisionRoot)` |
| *Advisory* | `ledger-size` | diff | A path file in the diff exceeds the ledger token budget | `changed.includes(path.file) && path.tokens > LEDGER_TOKEN_BUDGET` |
| *Advisory* | `opening-ceremony` | diff | Path declared running without an opening-check session note | `!openingFor(pathId) via session frontmatter { path, ceremony: 'opening' }` |
| *Advisory* | `path-staleness` | corpus | A path declaring running whose branch has had no commit for longer than the declared window | `staleRunningPaths(corpus, branchAges(corpus)) — advisory always; an unresolvable branch reports nothing` |
| *Advisory* | `registration` | diff | Path declaration tuple (id, running, branch, base) missing from trunk | `pathRegistrationState() === 'missing' (blocking) or declared migration exception (advisory)` |
| *Advisory* | `remote-checkpoint` | diff | Local path HEAD not present on upstream tracking branch | `pathRemoteCheckpoint(branch).state === 'missing' \| 'unpushed'` |
| *Advisory* | `scope-drift` | diff | Changed files outside path frontmatter declared writes: patterns | `!matchesAny(file, declaredWrites)` |
| *Advisory* | `single-truth` | diff | Manual edits to shared/derived statements of record | `SINGLE_TRUTH.includes(file)` |
<!-- cairn:rules:end -->

## Continue through the wiki

The [concept index](./concepts/index.md) offers two routes: the same
simple-to-complex sequence used here and an alphabetical catalogue. Each article
defines one object, explains why Cairn uses it, states what it does not prove,
and links to related objects.

Use the reference when reconstructing or operating a repository:

- [repository layout](./reference/repository-layout.md);
- [coding-path template](./reference/path-template.md);
- [opening, closing, and audit records](./reference/human-records.md);
- [operating sequence](./reference/operations.md);
- [configuration and portability status](./reference/configuration.md);
- [conformance checklist](./reference/conformance.md).

The Markdown project and universal HTML edition contain the same article graph.
In the HTML reader, each pane scrolls and keeps history independently. A wiki
link in either pane opens its object in the other pane; the tree opens an
article in the active pane, and a direct `#article-<id>` URL opens that object
beside the specification. Neither pane is a footnote to the other.
