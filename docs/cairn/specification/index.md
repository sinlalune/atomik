---
type: Cairn Specification
title: Cairn — canonical protocol specification
description: A precise, newcomer-accessible specification of Cairn as a repository-native team protocol with durable, remotely resumable coding paths.
tags: [cairn, specification, protocol, team, coding-path, git, ci]
timestamp: 2026-08-26T00:00:00Z
cairn:
  article: specification
  kind: specification
  status: canonical
  version: 0.2
---

# Cairn

Cairn is a protocol kept inside a [Git repository](./concepts/repository.md) for
a team of developers and coding agents. It turns one bounded software change
into a durable [coding path](./concepts/coding-path.md). That path can be
inspected, checked, handed over, resumed from a
[remote checkpoint](./concepts/remote-checkpoint.md), and integrated without
reconstructing a conversation.

This document is the canonical Cairn v0.2 specification. “Canonical” means it is
the authoritative statement of the protocol. “v0.2” means its current
[conformance profile](./concepts/conformance.md) is deliberately narrow: Cairn
is ready to evaluate as a trusted-team coordination and project-memory
protocol, but it does not yet claim general-purpose governance or adversarial
security.

The specification is written as a learning route. It begins with the small
ideas that make work durable, combines them into one coding path, then adds
routes, parallel work, evidence, closure, integration, repair, and governance.
Every specialised [Git](./concepts/git.md) or Cairn term links to one article in
the [concept index](./concepts/index.md), which separates the vocabulary Cairn
borrows from the concepts Cairn defines.
The [implementation reference](./reference/index.md) contains exact trees,
schemas, templates, and command sequences. Concept and reference articles
explain this page; they do not silently create additional requirements.

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY**
express requirements:

- **MUST / MUST NOT** — required for conformance;
- **SHOULD / SHOULD NOT** — the default, with any departure recorded;
- **MAY** — optional.

Every requirement below appears as one row of the
[conformance matrix](#current-conformance), which states separately whether the
reference tools check it. A requirement is canonical whether or not a tool
enforces it; a claim that a tool enforces it is only made where one does.

## Begin with work that survives

A [file](./concepts/project-memory.md) is durable when it remains available
after the current person, agent, process, or conversation ends. A
[repository](./concepts/repository.md) is a directory whose history is recorded
by [Git](./concepts/git.md). A [commit](./concepts/commit.md) is one named
snapshot in that history, and its [object id](./concepts/commit-hash.md)
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

That last sentence is the protocol's whole thesis, and it decides several rules
later in this document. Where a rule would leave important state only in a
working tree, the rule is wrong, not the thesis.

### The complete protocol in one view

In ordinary language: agree on one change, make that work visible to the team,
advance it in recoverable pieces, evaluate the exact result, record who accepted
that result, and only then add it to the shared product. Cairn gives each action
a precise name:

| What the team does | Cairn name introduced here |
| :-- | :-- |
| Agree on the outcome, boundaries, and first writer | [opening acceptance](./concepts/opening-acceptance.md) |
| Fix the accepted definition of done so it cannot move | [scope digest](./concepts/scope-digest.md) |
| Publish the accepted plan before implementation starts | [trunk registration](./concepts/trunk-registration.md) |
| Give the change its own visible history and editable directory | path [branch](./concepts/branch.md) and [worktree](./concepts/worktree.md) |
| Advance implementation, tests, documents, and progress together | [work unit](./concepts/work-unit.md), [work ledger](./concepts/work-ledger.md), and [handoff brief](./concepts/handoff.md) |
| Publish every completed piece so another participant can resume it | [remote checkpoint](./concepts/remote-checkpoint.md) |
| Publish incomplete work without calling it complete | [provisional commit](./concepts/provisional-commit.md) |
| Keep every published checkpoint reachable after a rewrite | [checkpoint retention](./concepts/checkpoint-retention.md) |
| Reapply the work to the newest shared base | [rebase](./concepts/rebase.md) |
| Name the exact product result being proposed | [implementation candidate](./concepts/implementation-candidate.md) |
| Check that exact result against software and project knowledge | [automated checks](./concepts/cairn-checker.md) and [coherence audit](./concepts/coherence-audit.md) |
| Record an authorised decision about that exact result | [closing acceptance](./concepts/closing-acceptance.md) |
| Add only records about the accepted result | [administrative closure](./concepts/administrative-closure.md), producing the [ready state](./concepts/ready-state.md) |
| Decide whether that acceptance survives a moved trunk | [acceptance drift](./concepts/acceptance-drift.md) |
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
- one declared [route](./concepts/route.md);
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
allocator outside the v0.2 reference tools.

Acceptance records MUST name the roles the accepting actor held on that path.
Where one actor recorded both the opening and the closing acceptance, that is
permitted and MUST be visible in the record; the checker reports it as an
[advisory finding](./concepts/advisory-finding.md). Cairn does not forbid the
collapse, because the setup most likely to adopt it first is one developer with
several agents. It refuses to let the collapse be invisible: a self-issued
signature that says so is a known weakness, and a self-issued signature that
does not is a false assurance.

### The path record

The canonical path filename is:

```text
project/coding-paths/CP-<ID>.md
```

Its [Markdown frontmatter](./concepts/frontmatter.md) begins with an exact
machine-readable [schema](./concepts/schema.md):

```yaml
cairn:
  id: CP-EXAMPLE-001
  route: lightweight
  status: running
  current_step: S02
  base_commit: 0123456789abcdef0123456789abcdef01234567
  branch: path/cp-example-001
  assigned_writer: participant-id
  writes:
    - src/example/**
    - docs/modules/example.md
  governs:
    - docs/architecture/example.md@89ab89ab89ab89ab89ab89ab89ab89ab89ab89ab
    - docs/adr/ADR-004-example.md@cdefcdefcdefcdefcdefcdefcdefcdefcdefcdef
```

The path MUST describe:

- its intended outcome and definition of done;
- its declared route;
- ordered, independently checkable steps;
- governing and conditional documents;
- deliberately excluded material;
- expected write surfaces;
- the work ledger, current checkpoint, next action, and blockers;
- the last completed remote checkpoint.

The identifier MUST use `CP-<UPPERCASE-ID>`, the filename MUST be
`<ID>.md`, and the branch MUST be `path/<lowercase-id>`. Identifiers and branch
names MUST be unique and MUST NOT be reused for unrelated work.

### Two declared surfaces

`writes:` is a [declared write surface](./concepts/declared-write-surface.md):
the paths this work expects to change. `governs:` is its counterpart, the
declared read surface: the documents this work is bound by, each pinned as
`path@<object-id>` so that *which* version governed is a fact rather than a
recollection.

The pinned id is the document's own **blob object id** — the id of that exact
content, not of a repository state that happened to contain it. Git stores a
file's bytes as an object of their own, called a *blob*, and gives it an
[object id](./concepts/commit-hash.md) derived from those bytes. Two files with
identical content anywhere in any repository share one blob id; editing one byte
produces a different one.

A commit id would also identify a version, but it changes whenever anything else
in the repository changes, so a `governs:` list pinned to commits would go stale
constantly while the documents it names sat untouched. A blob id changes when,
and only when, the governing document itself changes — which is exactly the
event a reader needs to notice.

Git prints a blob id with `rev-parse` using the `<commit>:<path>` form, which
means "the object at this path, as of this commit":

```bash
$ git rev-parse HEAD:docs/architecture/example.md
89ab89ab89ab89ab89ab89ab89ab89ab89ab89ab
```

That is the value written after the `@`. To read the document back exactly as it
was pinned — even if the working copy has since moved on — pass the same id to
`git show`:

```bash
$ git show 89ab89ab89ab89ab89ab89ab89ab89ab89ab89ab
```

Neither is a filesystem lock. A path may discover a necessary wider change and
continue. What it MUST NOT do is continue with a stale declaration: writing
outside `writes:` is permitted only when the same work unit updates the
declaration and records the reason in the ledger. Drift without that update
blocks, because both surfaces feed the [acceptance-drift](./concepts/acceptance-drift.md)
predicate, and a surface that no longer describes the work quietly weakens every
answer computed from it.

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

Cairn also claims one ref namespace outside the working tree:

```text
refs/cairn/checkpoints/<path-id>/<n>
```

These [retention refs](./concepts/checkpoint-retention.md) keep every checkpoint
the ledger names reachable after a path branch is rewritten. They are files in
no directory listing, and a repository that forgets they exist will
garbage-collect exactly the history its ledger promised.

`cairn.config.json` is the specified portable binding file. It is part of the
protocol layout but is not yet loaded or installed by the v0.2 reference tools.

The names used throughout this specification — `project/`,
`docs/architecture/` — are **role names**, not required folder names. A
repository binds each role to a folder it already has, and the current reference
tools bind two of them to different names than the ones written here. Those
bindings are recorded once, in the
[installed binding table](./reference/repository-layout.md#portable-roles-and-installed-names),
so that no other page has to repeat a host repository's local vocabulary. The
tree, file roles, naming rules, and the mapping are all in the
[repository-layout reference](./reference/repository-layout.md).

## Choose the route the change earns

Not every bounded change deserves the same ceremony. A protocol that demands
nine artifacts for a one-line fix teaches people to route around it, and a
protocol routed around enforces nothing at all. Operational cost is therefore
part of correctness, and the route is the field that prices it.

Every path MUST declare `route:`. Three routes are specified here; a fourth is
named and deliberately unimplemented.

### `lightweight` — the default

The [lightweight path](./concepts/lightweight-path.md) is what an ordinary
bounded change uses. It keeps every artifact that carries durable meaning and
combines the ones that ceremony alone separates:

- the path record, with id, route, branch, base, `writes:`, `governs:`, and a
  definition of done;
- opening acceptance **recorded inside the path record**, with the same fields
  and the same [scope digest](./concepts/scope-digest.md) a separate session
  record would carry;
- a [handoff brief](./concepts/handoff.md) meeting the full answerable-alone
  contract;
- remote checkpoints and [checkpoint retention](./concepts/checkpoint-retention.md);
- [closing acceptance](./concepts/closing-acceptance.md) naming the exact
  candidate, its scope digest, and its base, with the coherence questions
  **answered inline** rather than in a separate audit file;
- one [journal](./concepts/journal.md) entry at integration.

What a lightweight path MUST NOT drop is exactness. The candidate is still one
[object id](./concepts/commit-hash.md); acceptance still names it; the ledger
still records what happened. Fewer files, not weaker facts.

### `full` — required, not merely available

A path MUST declare `route: full` when any of these is true:

1. it changes the [control plane](./concepts/control-plane.md);
2. it changes [architecture](./concepts/architecture.md) or a
   [decision record](./concepts/decision-record.md);
3. its `writes:` declaration covers more than one implemented area;
4. it is expected to span more than one work unit;
5. repository policy designates the area or the change high-risk.

The full route separates what lightweight combines: an opening session record,
a standalone [coherence audit](./concepts/coherence-audit.md) bound to the
candidate, a standalone closing record, and an
[administrative closure](./concepts/administrative-closure.md) commit distinct
from the candidate.

Triggers 1–3 are structural and derivable from the declaration. Triggers 4 and 5
are an expectation and a policy, so they are declared rather than derived — and a
route made of self-declarations has an obvious failure mode: everything declares
itself lightweight, ceremony evaporates, and no rule ever fires.

One structural backstop closes most of that gap. Trigger 4 is unobservable as an
*expectation*, but **having** spanned more than one work unit is a fact in the
ledger:

> A path whose ledger declares more than one `cairn-unit` MUST declare
> `route: full`.

It is the same trigger arriving one unit late, and it cannot be declared away.

Escalation is one-way. A lightweight path that meets any trigger MUST escalate
before its next checkpoint and record the trigger in its ledger. A path MUST NOT
declare itself down a route: a change does not become small by being called
small, and self-declared smallness is exactly the bypass the trigger list
exists to remove.

### `foundation` — the repository's own first hour

A protocol that begins at accepted intent has nothing to say about where
accepted intent comes from. That is the wrong hour to leave undescribed:
ideation is where context loss hurts most, because nothing mechanical catches
it. A compiler catches a broken call and a test catches a broken behaviour, but
nothing at all catches a document that quietly contradicts the one written three
sessions ago.

A [foundation path](./concepts/foundation-path.md) is the same protocol pointed
at documents. It declares:

| Property | Value |
| :-- | :-- |
| write surface | `docs/**` plus `draft` path records under `project/coding-paths/` |
| work-unit type | `foundation` — documents and their indexes, plus the ledger entry |
| verification | `links`, `schema`, and a coherence audit |
| governing documents | pinned as `path@<object-id>` |

Its verification adds no gate. All three checks already exist as corpus rules,
which is the point: the origin phase is brought inside the protocol without
inventing enforcement for it.

Its deliverable has two halves. The first is the foundational text —
architecture, constraints, decisions already made. The second is a roadmap of
[`draft`](./concepts/draft-state.md) path records: one per bounded piece of the
intended product, each complete enough to be reviewed, none yet accepted. They
wait for [opening acceptance](./concepts/opening-acceptance.md), and
`draft → running` is a transition the lifecycle already allows.

Because a foundation path pins its governing documents at exact object ids,
every scope digest computed by the paths it produces is cheap: the text those
digests cover is already fixed at a known id.

**The adoption variant.** A brownfield repository has the opposite problem —
plenty of system, no records. An adoption path is a foundation path whose work
units back-document what already exists: one
[module note](./concepts/module-note.md) per implemented area, describing the
area as it is rather than as it should be, plus the decisions that are already
load-bearing whether or not anyone wrote them down. The deliverable is the same
governing document set and roadmap. Its purpose is narrower: to give an existing
repository a legal entry point, so that its first Cairn change is not also its
first record.

### `emergency` — named, not specified

An [emergency path](./concepts/emergency-path.md) would defer evidence for
urgent work. Cairn v0.2 does not specify it, and it is not a synonym for
`lightweight`: lightweight reduces ceremony for work that was always small,
while an emergency route defers evidence for work that may be large. Until it is
specified, urgent work uses an ordinary route, and “urgent” is not permission to
omit state silently.
## Make progress resumable

A [work unit](./concepts/work-unit.md) is the smallest completed change Cairn
recognises. Every work unit MUST declare a **type**, and the type fixes exactly
which parts move together:

| Type | Parts that MUST move together |
| :-- | :-- |
| `implementation` | source, its tests, the affected [module note](./concepts/module-note.md), ledger entry, brief |
| `documentation` | the documents and their indexes, ledger entry, brief |
| `decision` | the [decision record](./concepts/decision-record.md), every document it amends, ledger entry, brief |
| `foundation` | documents plus `draft` path records, ledger entry, brief |
| `repair` | the corrective change, any superseding record owed, a ledger entry naming the violation, brief |
| `closure` | only the [administrative closure](./concepts/administrative-closure.md) surface |

Every type MUST include the appended ledger entry, the refreshed handoff brief,
and a recorded verification result. No type may omit those three.

The ledger entry declares the unit in a fenced `cairn-unit` block:

````text
```cairn-unit
step: S02
unit: 07
type: implementation
verified: cairn-check, typecheck, test, build
```
````

`unit` is a **ledger ordinal, not an object id**, and that is deliberate. The
commit a work unit produces does not exist while the unit is being written, so a
block naming its own object id could never be written truthfully — the same
self-reference that [administrative closure](./concepts/administrative-closure.md)
solves with a following commit. The ordinal is knowable in advance, and
`refs/cairn/checkpoints/<path-id>/<unit>` supplies the object id afterwards. The
ledger says which unit; the ref says which commit; neither has to lie about the
other.

The typing is not bureaucracy; it is what makes “where relevant” checkable. An
untyped rule that demands documentation from every unit demands it from a typo
fix too, and what a writer — human or agent — learns from that rule is to
manufacture a meaningless documentation delta until the gate goes quiet. A typed
rule asks each unit only for the parts its own kind actually has.

Source changed without its affected tests, documents, or path state is not a
completed Cairn work unit.

### Check the work before calling it complete

A [test](./concepts/test.md) is an executable example whose result can be
observed. A process [exit code](./concepts/exit-code.md) is zero for success and
non-zero for failure. Gates MUST be run directly so their exit code remains the
verdict; output MUST NOT be filtered in a way that hides or replaces it.

### Publish incomplete work as a provisional commit

Work that is not yet a completed unit — mid-refactor, failing, or waiting for a
user or reviewer to test it — MUST NOT be left only in a
[working tree](./concepts/worktree.md). It is committed and pushed to the remote
path branch as a [provisional commit](./concepts/provisional-commit.md), marked
with the trailer:

```text
Cairn-Provisional: <reason>
```

A rule that kept such work uncommitted and unpushed would forbid publishing the
single most losable state in the whole protocol — an agent's working tree,
mid-session — in order to protect the word “complete”. The mark protects the
word instead. The work becomes durable, and nothing has to pretend it is
finished.

A provisional commit is a durable object and **not** a
[remote checkpoint](./concepts/remote-checkpoint.md). It MUST NOT be reported as
a completed work unit, MUST NOT be named as a resume point in a brief, and MUST
NOT be proposed as an [implementation candidate](./concepts/implementation-candidate.md).

Provisional commits are excluded from candidate identity. Before candidate `C`
is produced, every provisional commit between the base and `C` MUST be folded
into the completed work unit it was drafting: the content survives, the marker
does not. Work delivered for inspection follows the same route — pushed
provisionally, inspected at that exact object id, folded once it passes.

### Commit and push form one completed checkpoint

A local commit is not yet shared. A [remote](./concepts/remote.md) is a shared
copy of the repository reached through Git.
[Push](./concepts/fetch-and-push.md) publishes local commits to it; fetch
retrieves remote refs without changing the current working files.

Every completed work unit MUST become one coherent commit and MUST be pushed
immediately to its remote path branch. Only then is it a remote checkpoint. The
ledger and handoff brief MUST name that exact checkpoint and the next action.

Any authorised participant can then fetch the branch, open the path record,
read its governing documents and ledger, verify the checkpoint, and continue
from the stated next action. “Implemented locally” and “completed” are not
synonyms.

### Retain every checkpoint the ledger names

The ledger names its checkpoints by object id and promises that another
participant can fetch one and resume from it. A [rebase](./concepts/rebase.md)
reconstructs commits on a newer base and changes their ids; publishing the
result replaces the remote branch and leaves those ids resolving to nothing.
Rebase-before-close therefore attacks resumability directly, and it does so at
the exact moment the ledger is most complete.

Before any rewriting push of a path branch, every commit the ledger names MUST
already be reachable from a retention ref on the same remote:

```text
refs/cairn/checkpoints/<path-id>/<n>
```

`<n>` is the `unit` ordinal declared by the ledger entry, so a ledger entry and
its retained ref name the same thing. Retention refs are append-only: once
written, a ref MUST NOT be moved or deleted while the path record is retained.

A validator sees one commit and cannot observe "before the push". What it can
require is that every declared unit **except the newest** is already retained:
the newest unit's ref is written immediately after the commit that declares it,
and by the time the next unit exists it is no longer newest. That is the same
guarantee reached by a checkable route — retention is in place before the next
rewriting push, which is the only moment it matters.

A repository that will not maintain that namespace has exactly one other
conforming option: forbid rewriting pushes on path branches entirely and reach a
current base by [merge](./concepts/merge.md) instead. Rewriting without
retention is not a third option.

### The handoff brief is a contract

The brief is the document a new participant reads first and, for the first
several minutes, the only one they have read. That makes it the protocol's
bootstrap contract, and a bootstrap contract with no specified fields is not a
contract.

The brief lives at `project/briefs/<lowercase-id>-handoff.md`. Its frontmatter
MUST carry:

```yaml
written_by: <participant id of whoever refreshed this brief>
checkpoint: <full object id of the last retained checkpoint>
checkpoint_unit: <its ledger ordinal>
checkpoint_pushed: true
base_commit: <full object id>
trunk_seen: <full object id of the trunk tip last fetched>
writes:
  - src/example/**
governs:
  - docs/architecture/example.md@89ab89ab89ab89ab89ab89ab89ab89ab89ab89ab
verify:
  - npm run cairn-check
  - npm test
budget_tokens: 1200
```

`checkpoint` names the last **retained** checkpoint, not the commit containing
the brief. This is the same self-reference the `cairn-unit` ordinal solves: a
brief is refreshed inside the work unit it describes, so at the moment it is
written the commit it will become does not exist. What it can name truthfully is
the last checkpoint that is already retained and resumable, and
`checkpoint_unit` gives that checkpoint its ordinal so the retention ref and the
brief agree.

Its body MUST hold seven capped sections, and no others: **outcome**, **state**,
**next action**, **blockers**, **tried and rejected**, **reading order**, and
**verification**. The whole brief SHOULD fit inside `budget_tokens`, whose
default is 1200; a brief that cannot say where a path stands in that budget is
describing a path that has lost its shape.

#### The answerable-alone contract

**"Alone" is a claim about what the reader must already carry in their head, not
about how many files they may open.** A participant arriving at a Cairn
repository follows the entry route the repository itself publishes: `AGENTS.md`
names the operating convention, the convention names the [live
view](./concepts/live-view.md), the live view names the path, and the
[path record](./concepts/path-record.md) carries the plan and the ledger. That
chain is the protocol working. A brief that set out to replace it would be a
lossy copy of records that are already canonical, refreshed by hand, drifting
from the day it was written.

What the brief owes is the **last link**, and it owes it exactly. A reader
holding `AGENTS.md`, the brief, and the repository at `checkpoint` — with no
conversation, no prior session, and no memory of how the path reached here —
MUST be able to state:

1. the outcome this path is for;
2. the exact commit to resume from;
3. the single next action;
4. what the path may write;
5. what it must read, and at which object id;
6. what is blocking, if anything;
7. what has already been tried and rejected;
8. the exact commands that verify the checkpoint.

Each answer MUST be present **in the brief itself, or in a record the brief
names at an exact object id.** An answer that survives only in a conversation,
only in a previous session, or only as something a reader would have to
reconstruct by reading the ledger's history and judging which parts are still
true is unanswerable, **the brief has failed**, and refreshing it is part of the
next work unit.

That last clause is the one that does the work. The ledger is history — every
work unit that happened, permanently, in order. Deciding *which of that history
is still the situation* is precisely the brief's job, and a brief that hands it
back has not been terse, it has been silent.

##### Two failure modes, not one

The brief sits between two of them, and they pull in opposite directions:

- **too thin** — it names no ids and no commands, so the reader must open the
  ledger and work out for themselves which of forty entries still holds. It has
  handed its only job back to the record it was supposed to summarise;
- **too thick** — it re-narrates the ledger so as not to need it, and now two
  accounts of the same work exist, drift apart at different rates, and disagree
  about the past. A brief that reproduces the ledger has quietly become a
  second ledger.

It escapes both by **pointing rather than retelling**: exact object ids, exact
runnable commands, exact filenames, and roughly one paragraph of prose per
section. It is the topmost stone of a cairn — it means nothing without the
stones beneath it, and it is the only one you need to see to know where to put
your foot next.

##### Why the objective is not in the frontmatter

Question 1 is the one that looks misplaced, because the frontmatter carries
machine-checkable state and the objective is prose. It is answered by the body's
`## Outcome` section, which restates in one paragraph what the path record
argues at length. The frontmatter deliberately carries no objective field: an
objective maintained in two schemas is an objective that will eventually
disagree with itself, and the [acceptance-drift](./concepts/acceptance-drift.md)
predicate cannot adjudicate between two prose paragraphs.

The complete field list, caps, and template are in the
[handoff-brief reference](./reference/handoff-brief.md).

#### Cold resume is the measurement

The answerable-alone contract is also how Cairn is measured. A **cold resume**
places a participant with no prior context in front of `AGENTS.md`, the brief,
and the repository at the named checkpoint, and asks them to perform the next
action. The participant MAY open any record the brief names — that is the
contract working, not a leak in the trial. What the trial MUST withhold is
everything undurable: the conversation, the previous session, and the person who
wrote it. Success rate and time-to-first-correct-action are the pilot's primary
metric, ahead of ceremony time or artifact count: a protocol whose briefs cannot
be resumed cold has failed at the thing it exists for, however cheap its
ceremony is.

##### Record the writer and the path with every trial

A pilot MUST record, for each trial, which of the eight questions was
unanswerable, **who wrote the brief**, and **which path it belongs to**. The
aggregate count over the eight questions is the least useful of the three
readings, because the two informative outcomes point in opposite directions and
the aggregate hides which one holds:

- failures cluster by **writer** — the schema is adequate and the practice is
  not. A template and a worked example fix it, and no normative text changes;
- failures cluster by **path** — the schema is underspecified for a class of
  work, and that is a specification change.

`written_by` is required in the brief for this reason and no other. Git
authorship is not a substitute: a repository where one participant commits work
produced by several records one identity for all of them, and the writer axis
collapses before the pilot begins.

### The ledger boundary

The work ledger is append-only in protocol semantics. Completed ledger sections
MAY move byte-for-byte into uniquely named files under
`project/coding-paths/history/` when the live record becomes too large.
Summarising a rolled entry is not equivalent to retaining it. The reference
checker protects existing history records from rewrite, but does not yet prove
that live ledger text remains a byte prefix or was rolled verbatim; the
[conformance matrix](#current-conformance) states this limit explicitly.
## Let paths work beside one another

A [working tree](./concepts/worktree.md) is the checked-out files a process
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
commits already reachable from that trunk. [Retention refs](./concepts/checkpoint-retention.md)
are a separate promise and are not released by integration: they are removed
only when the path record itself is no longer retained.

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
done, route, steps, governing documents, expected write surfaces, exclusions,
and initial writer assignment. An authorised participant records the decision:

```yaml
path: CP-EXAMPLE-001
ceremony: opening
decision: accepted
accepted_by: participant-id
accepted_roles: [initiator, reviewer]
accepted_at: 2026-01-15T09:00:00Z
scope_ref: project/coding-paths/CP-EXAMPLE-001.md#definition-of-done
scope_digest: sha256:9f2c4b1d…
```

On the `lightweight` route this block lives in the path record itself; on the
`full` route it is a separate session record. The fields are identical either
way.

### Bind the scope, not a pointer to it

`scope_ref` is a file path and a heading — a mutable pointer. Implementation is
bound to an object id and cannot quietly become something else; scope, as a
pointer alone, can. The definition of done could be rewritten after acceptance
and before closure, and every record would still look valid.

The opening record therefore MUST carry a **[scope digest](./concepts/scope-digest.md)**:
a digest of the exact text `scope_ref` resolves to at the registration commit —
the named heading and its body up to the next heading of the same or higher
level, normalised for line endings and trailing whitespace, with no other
transformation.

[Closing acceptance](./concepts/closing-acceptance.md) MUST re-compute that
digest from the same `scope_ref` at candidate `C` and record the result. If the
digests differ, the definition of done moved after it was accepted, and closing
MUST NOT proceed on the original acceptance. The path either restores the
accepted text or records a **scope amendment**: a new opening acceptance, with a
new digest, naming the record it supersedes.

The digest algorithm is named in the record and MUST be a full digest, never a
prefix.

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

1. Fetch the remote trunk and record its tip as `T`.
2. Retain every ledger-named checkpoint under `refs/cairn/checkpoints/` and push
   those refs.
3. [Rebase](./concepts/rebase.md) the path onto `T`, resolving every conflict.
4. Fold every provisional commit into the completed work unit it was drafting.
5. Commit and push the resulting implementation candidate `C`.
6. Run product checks and the Cairn checker against exactly `C`.
7. Perform a [coherence audit](./concepts/coherence-audit.md) of exactly `C`,
   read against the documents pinned in `governs:`.
8. If a finding changes implementation, create a new candidate and repeat.

Steps 2 and 4 are not housekeeping. Without step 2 the rebase orphans the
history the ledger promises; without step 4 the accepted candidate contains
commits that were marked incomplete.

A rebase reconstructs path commits on a newer base and therefore normally
changes their object ids. Acceptance or audit of a pre-rebase commit cannot
certify the rebased result.

### Identify commits by full object id

Every candidate-bound record names commits by their **full object id in the
repository's configured object format** — never by a prefix. Cairn deliberately
does not say “forty hexadecimal characters”: Git's object format is
configurable, SHA-1 produces forty hex characters and SHA-256 produces
sixty-four, and a protocol that fixes the first excludes the second for no
protocol reason. The requirement is *full and unabbreviated*; the length follows
from the repository.

The audit record MUST use the full candidate id in both its filename and
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

On the `lightweight` route the same questions are answered inside the closing
record rather than in a separate file. The questions do not change.

### Accept candidate C

An authorised reviewer performs [closing acceptance](./concepts/closing-acceptance.md)
of the same candidate. The record MUST declare:

```yaml
path: CP-EXAMPLE-001
ceremony: closing
subject_commit: fedcba9876543210fedcba9876543210fedcba98
base: 0123456789abcdef0123456789abcdef01234567
accepted_by: participant-id
accepted_roles: [reviewer, auditor]
accepted_at: 2026-01-15T14:30:00Z
decision: accepted
scope_ref: project/coding-paths/CP-EXAMPLE-001.md#definition-of-done
scope_digest: sha256:9f2c4b1d…
advisories_at_candidate: [scope-drift, path-staleness]
advisory_disposition:
  - rule: scope-drift
    disposition: accepted
    reason: the wider root cause is declared in writes: at this same commit
  - rule: path-staleness
    disposition: deferred
    reason: parked during the dependency freeze
    owner: participant-id
    follow_up: CP-EXAMPLE-002
```

Acceptance binds three things, because an acceptance that binds only the first
is weaker than it looks:

- **the result** — `subject_commit`, which MUST equal the audit's subject;
- **the scope** — `scope_ref` plus `scope_digest`, which MUST equal the digest
  recorded at opening;
- **the base** — `base: T`, the trunk tip the candidate was rebased onto, which
  is what [acceptance drift](./concepts/acceptance-drift.md) later tests.

### Advisories are dispositions, not a sentence

`advisory_disposition` MUST be a list of entries, each naming a `rule`, a
`disposition` of `fixed`, `accepted`, or `deferred`, and a `reason`. A deferral
MUST also name an `owner` and a `follow_up`.

Set equality is a predicate. A free-text sentence is not: as one string, “every
advisory MUST be recorded” cannot be checked at all, and a reviewer who writes
`accepted: none` over three live advisories produces a record that reads as
complete and is false.

Equality against *what* is the load-bearing question. The obvious answer —
whatever the checker raises when it evaluates the closure commit `A` — is
**unsound**. `A` is field-restricted by construction, so the advisories it can
raise are a strict subset of those raised at `C`; a rule comparing against `A`
passes while advisories raised at the candidate go undisposed, which is exactly
the failure this requirement exists to prevent.

The closing record therefore **attests** the set raised at `C`, in
`advisories_at_candidate`, bound to `C` by the audit's subject. Two facts follow
and both MUST hold:

1. the dispositions cover exactly the attested set — no omissions, no invented
   entries;
2. every advisory raised at `A` appears in the attested set. Because `A`'s
   findings are a subset of `C`'s, an advisory firing at `A` and missing from
   the record proves the attestation incomplete.

An advisory that fires only at `C` remains an attestation rather than a
derivation. Closing that requires evaluation replayed at `C`, and the
[conformance matrix](#current-conformance) says so.

### Add only administrative closure

Recording acceptance necessarily creates a commit after `C`. Cairn resolves
that self-reference with one [administrative closure](./concepts/administrative-closure.md)
commit `A`:

```text
C  exact implementation candidate
└─ A  path status ready + audit + closing record + refreshed brief pointer
```

`A` is restricted **field by field**, not file by file. It MAY add the exact
audit record and the exact closing record. Within the path record it MAY change
only:

- `status`, set to `ready`;
- `subject_commit`, set to `C`;
- one appended work-ledger entry.

Within the handoff brief it MAY change only the checkpoint pointer and the
fields that follow from it.

Everything else MUST NOT change: the definition of done, `scope_ref`, `writes:`,
`governs:`, the step plan, product source, tests, architecture, and
implementation documentation.

A file-level restriction would not be a restriction. The definition of done
lives inside the path record, and so do both declared surfaces — so a closure
commit permitted to “change the path record” is permitted to rewrite the
standard its own acceptance was measured against, after the measurement. On the
`lightweight` route `A` MAY share `C`'s commit where the transport can still
bind acceptance to an exact id; the field restriction is unchanged.

The final protocol check runs on `A`, then `A` is pushed.

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

### Decide drift by predicate, not by equality

Between acceptance and integration the trunk moves from `T` — the base recorded
in the closing record — to some `T'`. Something has to decide whether the
acceptance survives.

It MUST NOT be `T' == T`. That rule is the obvious one and it is a livelock: it
makes integration first-come-first-served, so every landing invalidates every
other open acceptance, and each path must re-rebase, re-audit, and re-accept. If
audit and acceptance together take longer than the trunk's landing interval,
nothing ever closes — and the repositories where that is true are exactly the
busy ones the protocol is for.

The narrower question is the right one. An acceptance is a judgement about a
diff read against a body of knowledge, and it is threatened only if the trunk
moved underneath that reading:

> **Drift predicate.** An acceptance remains valid while the trunk delta from
> `T` to `T'` touches no file matched by the union of the path's `writes:` and
> `governs:` declarations.

- **`writes:`** — the surface the candidate changed. A trunk change there means
  the merged result is not the audited result.
- **`governs:`** — the documents the audit reasoned from, pinned at object ids.
  A trunk change there means the audit's reference frame moved even though the
  diff did not.

If the delta touches neither, the path integrates the accepted candidate
unchanged. If it touches either, the acceptance is invalidated: the path returns
to `running`, rebases onto `T'`, produces a new candidate, and repeats audit and
acceptance.

Two paths writing genuinely disjoint surfaces do not invalidate each other. Two
paths writing the same surface always do, whether or not Git would have reported
a [conflict](./concepts/conflict.md). Path matching is a proxy for semantic
overlap and is stated as one: a trunk change outside both declarations can still
break the candidate, and the product checks run at integration are what catch
the rest.

After remote verification, another checkout MAY remove the secondary worktree
only when its exact path is known and it is Git-clean. It MUST NOT use force or
remove the primary checkout. Branch cleanup is optional once reachability from
the remote trunk is proved; retention refs are not removed by integration.

## Keep lifecycle statements truthful

The [lifecycle](./concepts/lifecycle.md) records facts rather than intentions:

```text
                    ┌──────────────────────────┐
                    ▼                          │
draft ──────► running ──────► ready ──────► done ──────► archived
                 │  ▲           │  ▲                        ▲
                 ▼  │           ▼  │                        │
              blocked ◄─────────┘  └────────────────────────┘
                 │                                          │
                 └──────────────────────────────────────────┘

draft ────────────────────────────────────────────────────► archived
```

| State | Exact meaning | Required identity |
| :-- | :-- | :-- |
| [`draft`](./concepts/draft-state.md) | proposed, not registered for execution | id |
| [`running`](./concepts/running-state.md) | accepted, registered, and executable | id, branch, base commit, writer |
| [`blocked`](./concepts/blocked-state.md) | paused by a named condition | the running identity plus blocker and unblock condition |
| [`ready`](./concepts/ready-state.md) | exact `C` audited and accepted; not integrated | running identity plus full subject object id |
| [`done`](./concepts/done-state.md) | accepted candidate integrated on the trunk | subject commit and `resolution: completed` |
| [`archived`](./concepts/archived-state.md) | terminal retained record | `resolution: completed \| abandoned \| superseded` |

Allowed transitions are:

```text
draft   → running | archived
running → blocked | ready | archived
blocked → running | archived
ready   → running | blocked | done
done    → archived
archived → (terminal)
```

Three edges deserve their reasons stated, because the diagram and the table must
agree in both directions:

- **`ready → blocked` exists.** Acceptance stalls. A candidate audited and
  waiting on an unavailable reviewer is blocked on a named condition, and saying
  so is more useful than a `ready` that quietly ages.
- **`blocked → ready` does not exist.** Reaching `ready` requires producing and
  auditing a candidate, which is execution. An unblocked path returns to
  `running` and reaches `ready` from there.
- **`archived → archived` is not a transition.** An unchanged state is not an
  event. A validator comparing two commits will often see a record that declared
  `archived` before and declares it now; it MUST accept that for every state,
  provided the state's required identity fields are present and, for `archived`,
  its `resolution` is unchanged. The same holds for any other unchanged state
  while ordinary fields advance.

An unintegrated path archives as `abandoned` or `superseded`, never `completed`.
A completed path archives as `completed`. `blocked` retains its branch and base
commit because dormant work needs more traceability, not less.

The ready state exists on the path branch. The trunk may observe `running → done`
when it integrates a branch whose ready state was never previously present on
the trunk; this is the integration form of `ready → done`, not permission to
skip candidate-bound closure.

When a required earlier state is unavailable, transition validation is
inconclusive and blocks. Path declarations are retained; they are archived
rather than deleted.

The honest limit is worth stating in the same breath. A validator run sees
**one commit**: it reads the state a record declares now and compares it with
one comparison ref. It has never watched a path move. What a checker enforces is
the per-state invariants plus single-step transitions against an available
comparison ref — never “which state was this in last week”.
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
previously known object id: rewriting an ancestor changes descendant ids. Git
alone is not an immutable audit log. Protected refs, signatures, or an external
anchor are needed when the threat model includes authorised writers rewriting
history.

### Redaction

Immutability and disclosure eventually collide. A secret, a credential, or
personal data lands inside a record that may never be edited: deleting the
record destroys history, and leaving it publishes the secret for as long as the
repository exists. Redaction is the single sanctioned exception, and it is a
ceremony rather than an edit.

1. **Rotate first.** Revoke and replace the exposed credential. Redaction
   removes text from a file; it does not un-disclose anything already read,
   cloned, or mirrored. A redaction performed *instead of* a rotation is
   theatre, and MUST NOT be recorded as remediation.
2. **Write a redaction record**, itself immutable, under `project/sessions/`. It
   MUST name the affected record, its object id before redaction, the class of
   content, the authorising participant, the rotation evidence, and the date. It
   MUST NOT quote the content it exists to remove.
3. **Replace the content in place** with `[redacted: <redaction-record-id>]`, in
   a commit that touches nothing else. The record's identity, structure, and
   every other statement survive.
4. **Rewrite history only as a separate decision.** If the object must also
   leave Git history, that is its own work unit: it updates every retention ref
   and every ledger reference to a rewritten object id, and the redaction record
   names both the old and the new ids.

A completed redaction proves that the repository no longer serves the text. It
never proves that the disclosure was contained.

## Repair a path that broke protocol

Real deployments live here. A protocol with no repair procedure has one implicit
instruction for a path that has already violated a rule — tidy the history until
the rule appears satisfied — which destroys exactly the evidence the protocol
exists to keep.

Repair is a work unit like any other. It declares `type: repair`, appends a
ledger entry naming the violation, and never edits history into a cleaner shape.
Where a record is owed, repair supersedes it rather than replacing it.

| Violation | Repair |
| :-- | :-- |
| Branch created before registration | Do not delete the branch. Register retroactively in a `repair` unit whose ledger entry names the omission; set `base_commit` to the actual branch point rather than a convenient one. |
| Implementation changed after acceptance | The candidate is void. Return to `running`, produce a new candidate, and supersede the closing record with one naming the new object id. The original acceptance is retained. |
| An immutable record was edited | The edit cannot be undone by another edit. Add a superseding correction record naming both object ids and stating what was changed, and record the violation in the ledger. |
| Branch force-pushed without retention | Recover the orphaned commits from reflog or any surviving ref and push them to `refs/cairn/checkpoints/` immediately. Ledger entries naming commits that cannot be recovered are marked `unrecoverable`, never deleted. |
| A retention ref was moved | Restore it to the commit it originally named. Give the commit it was moved onto its own ordinal and its own ledger entry — moving a ref usually means a completed work unit was shipped under the previous unit's block, so both facts need repairing, not one. |
| A path branch declared `done` | Return the declaration to `ready` in a `repair` unit and re-run integration through the declared transport. `done` on a branch is a claim about the trunk that the branch cannot make. |
| Scope digest mismatch at closing | Either restore the accepted text or record a scope amendment — a new opening acceptance with a new digest, naming the record it supersedes — then re-close. |
| Work outside `writes:` already committed | Update the declaration and record the reason in the same repair unit. A widening that is recorded is ordinary; one that is hidden is the violation. |
| Secret committed to an immutable record | Follow the redaction ceremony above, beginning with rotation. |

Two rules govern every row. A repair MUST leave the violation visible in the
ledger, and a repair MUST NOT be the same work unit as the work that caused it.

A repair SHOULD also ask why the violation was not caught, and treat the answer
as part of the repair. A rule that checks a record's claims rather than the
repository's facts will report success over a broken state — which is worse than
having no rule, because it certifies what nobody verified.

The [repair reference](./reference/repair.md) carries the command sequences.
## State the trust and enforcement boundary

Cairn v0.2 assumes collaborating writers. Its local and CI mechanisms protect
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

### Collapsed roles are a stated property

A path has five role-bearing positions: initiator, writer, reviewer, auditor,
and integrator. A solo developer working with agents holds all five, which makes
closing acceptance a signature the signer issued to themselves.

Cairn permits that and requires it to be legible. Acceptance records name the
roles the actor held, and the checker raises an advisory when one actor recorded
both the opening and the closing acceptance for a path. A repository whose paths
routinely show one actor in every role has a real property of its governance,
and MUST NOT claim an enforcement profile above `local` on the strength of those
acceptances alone. The distinction that matters is not between separation and
collapse; it is between a weakness that is written down and one that is
invisible until an incident finds it.

The versioned [configuration reference](./reference/configuration.md) specifies
portable role bindings. The current reference checker remains bound to one
repository layout and a deliberately limited frontmatter subset; it does not
yet implement that portable configuration contract. A conforming portable
implementation MUST either use a standard YAML parser or publish and validate a
distinct format without calling it full YAML.

## Deliberate non-goals

These are decisions, not omissions. Each is something a reader could reasonably
expect Cairn to do, and each is refused for a stated reason.

| Non-goal | Reason |
| :-- | :-- |
| **Requiring `T' == T` at integration** | The obvious fix for trunk drift is first-come-first-served: every landing invalidates every other open acceptance, and if audit and acceptance take longer than the trunk's landing interval, nothing ever closes. The [drift predicate](#decide-drift-by-predicate-not-by-equality) replaces it. |
| **Defending against an authorised writer** | Every mechanism here is a repository file or a Git predicate, and a participant who can change all of them can change the thing that evaluates the change. Cairn protects against omission, staleness, and coordination error. Protected refs, signatures, or an external anchor are what a hostile-writer threat model needs. |
| **Resolving semantic conflicts** | Cairn reports overlap through declared surfaces and refuses to guess. Whether two changes mean the same thing is a judgement, and the protocol routes it to the [coherence audit](./concepts/coherence-audit.md) rather than pretending a path predicate answers it. |
| **A writer lease or allocator** | One writer per writable worktree is a team responsibility, not a lock. A real lease needs a coordination service outside the repository, which would make Cairn depend on infrastructure it currently does not need. |
| **Judging the quality of a judgement** | The checker proves that an audit exists, is complete, names the right object, and was not rewritten. It cannot prove the auditor was right, and the specification never implies that a passing gate is an endorsement. |
| **Undoing disclosure** | Redaction removes text from a repository. It does not un-disclose anything already read, cloned, or mirrored, and it is never remediation on its own. |
| **Cross-repository paths** | A path is bounded by one repository's trunk, refs, and records. Coordinating one outcome across several repositories needs a shared identity and transport that Cairn does not define. |
| **Enforcing route selection** | `route:` is declared by the initiator. The full-route triggers are structural proxies, and a single-file change to one area can still be the most dangerous change of the quarter. Escalation is required and one-way; correct initial selection is not mechanically established. |
| **Specifying the emergency route** | Naming it without specifying it is deliberate. A half-defined exception is worse than none, because it becomes the route anything urgent claims. |
| **Byte-level proof that a ledger was rolled verbatim** | Stated as a requirement, unimplemented in the reference tools, and listed as such in the matrix below rather than quietly dropped. |

## Current conformance

[Conformance](./concepts/conformance.md) distinguishes the protocol from one
implementation. A requirement can be canonical before the reference tools
implement it, but its status must be visible — in this table, beside the claim,
not in a separate document a reader may never open.

| Capability | Protocol v0.2 | Reference tools | Additional dependency |
| :-- | :-- | :-- | :-- |
| Path record, branch identity, registration, and remote checkpoints | required | implemented, with repository-specific bindings | remote Git |
| Full opening decision, actor, time, scope, and authority schema | required | **partially implemented**; path and ceremony presence are checked | repository governance |
| Multiple team participants and checkpoint handoff | required | records support it; writer exclusivity is operational | team assignment policy |
| `running`, `blocked`, `ready`, `done`, `archived` lifecycle | required | transition and state checks implemented for observable changes | complete comparison ref |
| `ready → blocked` and unchanged-state acceptance | required | implemented; the transition table carries `ready → blocked`, refuses `blocked → ready`, accepts an unchanged state, and holds an archived resolution terminal | complete comparison ref |
| Exact-candidate audit and closing acceptance | required | implemented | authorised reviewer |
| Full object id in the repository's configured format | required | implemented; the checker accepts SHA-1 and SHA-256 ids and refuses every prefix | a repository configured for another object format |
| Fail-closed critical inconclusive outcomes | required | implemented | complete trunk and comparison refs |
| Existing session, audit, history, and journal immutability | required | implemented for new or changed records | complete comparison ref |
| Checkpoint retention refs before any rewriting push | required | **partially implemented**; every declared unit except the newest must resolve a local retention ref, and every branch commit that is neither retained, provisional, nor `HEAD` is reported as orphaned | remote push of the namespace; a ref *moving* is unobservable to a single-commit validator — only the orphan it leaves behind is |
| Marked provisional commits excluded from candidate identity | required | implemented; a ready path whose candidate range still contains a marked commit is blocked | the fold itself is not verified to preserve content |
| Handoff-brief field schema and answerable-alone contract | required | **partially implemented**; the eight fields, the seven exact sections, pinned `governs` entries and the token budget are checked | the answerable-alone contract is a judgement and a cold-resume harness, and is never claimed by a checker |
| Field-level administrative closure surface | required | implemented; closure may move only `status`, `subject_commit`, `current_step` and `resolution` | ledger append-only proof, which remains a separate open row |
| An adversarial fixture per blocking rule | required | **not implemented**; the checker suite exercises valid repositories and asserts `OK`, which a rule that never fires also satisfies. No rule is currently required to demonstrate a rejection | a fixture repository per blocking rule |
| No predicate branches on a value that varies by execution context | required | **not implemented, and violated**; the derived-view check skips itself when the branch matches `path/*`, so a local run and a CI run on a detached ref reach different verdicts on one tree | trunk-context resolution that reads the tree, not the branch name |
| Local and CI invocations of one gate reach the same verdict | required | **not implemented**; asserted in `AGENTS.md` prose, tested nowhere | a fixture run in both contexts |
| Every stated requirement is enforced or listed as unenforced | required | **partially implemented**; this table is the mechanism, and it is maintained by hand. The merge-time journal entry is required by `AGENTS.md` and had no row and no predicate until this revision | generation of the matrix from the checker and the normative text |
| Merge-time journal entry, one file per integrated outcome | required | **not implemented**; no predicate asks for one. A path closed, was audited and was proposed for merge with the entry missing, and every gate reported `OK` | integration-time hook, since the entry is written in the closing unit |
| Scope digest recorded at opening and re-verified at closing | required | implemented; the resolved section is digested and compared at closure | a path opened before the rule cannot amend its immutable opening record — see the migration exception |
| Candidate base `T` and the acceptance-drift predicate | required | implemented; the trunk delta since the recorded base is tested against `writes:` ∪ `governs:` | path matching is a proxy for semantic overlap, as stated |
| Structured `advisory_disposition` matching findings at `C` | required | **partially implemented**; dispositions must cover the attested `advisories_at_candidate` exactly, and any advisory raised at `A` and absent from it is proved missing | an advisory that fires only at `C` stays attested rather than derived; closing that needs evaluation replayed at `C` |
| Recorded roles and the collapsed-actor advisory | required | **partially implemented**; a shared opening/closing actor is reported | `accepted_roles` itself is recorded and not yet validated |
| `scope-drift` blocking unless the declaration moves in the same commit | required | implemented; drift blocks unless `writes:` moved in the same change | none |
| Typed work units keyed to their required parts | required | **partially implemented**; the `cairn-unit` block and its type vocabulary are checked | `same-work-unit` does not yet key its requirement to the declared type |
| `lightweight` default route and one-way escalation | required | **partially implemented**; the vocabulary, the three structural triggers, the second-unit backstop and one-way escalation are checked | the *high-risk* trigger is a policy and stays declared; the multi-unit trigger is caught one unit late rather than in advance |
| `foundation` and adoption routes | required | **partially implemented**; the route is declarable and its write surface is confined to documents and the path records it produces | the adoption variant is a use of the same route, not a separate predicate |
| Repair procedures for protocol violations | required | **not implemented**; procedural, with no predicate proposed | none — repair is recorded, not gated |
| Redaction ceremony | required | **partially implemented**; every `[redacted: …]` marker must name a redaction record that exists | rotation-first ordering is a procedure, not a predicate |
| Live-ledger prefix and verbatim-roll proof | required | **not implemented** | explicit ledger markers/schema |
| Versioned portable configuration and schema migration | required for portable profile | **not implemented** | configuration loader and migrations |
| Exact protected integration transport | required for protected profile | **not installed or tested** | repository-host adapter |
| Independently protected control plane | required for protected profile | **not installed or tested** | host ownership/approval policy |
| Transactional `init`, `new`, and `close` commands | required before general release | **not implemented** | command tooling |
| [Emergency path](./concepts/emergency-path.md) | deliberately unspecified | **not implemented** | incident policy and retrospective |
| Cold-resume pilot | required before general release | **run once**: 20 trials, 35% would act without asking; failures flat across paths, so no schema change is indicated | a writer axis, which needs `written_by` populated across more than one writer |

The current supported claim is therefore:

> Cairn v0.2 is a local-first coordination and project-memory protocol for a
> team of trusted developers and coding agents working through remote Git
> branches. Its reference tools enforce a substantial but incomplete subset of
> the protocol. It is not yet a general-purpose merge, governance, or security
> system.

Three rows remain `not implemented` among the requirements v0.2 added, and they
are the honest residue rather than a backlog:
**repair procedures** have no predicate to propose, the **answerable-alone
contract** is a judgement measured by cold resume, the **temporal half of
checkpoint retention** is unobservable to a validator that sees one commit, and
**live-ledger prefix proof** awaits explicit ledger markers. Naming what cannot
be checked is part of the claim.

### Open finding: this revision grew its own surface

Separating borrowed vocabulary from Cairn's own is not presentation. It is the
only way to measure how large the protocol actually is, and running it as a
measurement produces a finding rather than a tidier index.

| | Borrowed | Cairn's own | Total |
| :-- | --: | --: | --: |
| Before | 24 | 41 | 65 |
| After | 21 | **45** | 66 |

The revision was meant to be net-neutral in concept count. It was, in total —
and only because the borrowed glossary shrank. **Cairn's own surface grew by
four.** Every added concept earns its page, and that is beside the point: a
protocol whose vocabulary grows every time it is corrected gets harder to hold
in mind at exactly the rate it gets more precise.

This is recorded as an open finding, not a resolved item. The remedy is merges,
and merges are the work of noticing that two named objects are one object seen
twice — which cannot be done by asking for it in a checklist.

### Prove that the gate can fail

Cairn's rules are the only thing standing between its records and wishful
thinking, so the rules themselves need a discipline. This section states it.

Everything below exists because of one observed fact: **every enforcement defect
found in the reference checker has been the same kind.** Not one rule was too
strict. All of them agreed too easily, and every one reported `OK` over a
condition that was false.

That is not a coincidence, and the reason is worth understanding before the
rules are stated. A rule turns a sentence into code, and something has to bridge
the two — a measurable stand-in, a [proxy predicate](./concepts/proxy-predicate.md).
The stand-in is almost always the *broader* condition, because the easy thing to
compute is usually necessary for the sentence rather than sufficient for it. So
the errors all lean the same way, and the result is an
[unsound gate](./concepts/unsound-gate.md): one whose passing does not mean what
it says.

An unsound gate is worse than a missing one. A missing rule leaves a visible
gap. An unsound rule fills the gap with a **claim**, and Cairn writes that claim
down — a closing acceptance records that gates were green, and a journal entry
repeats it. The false statement becomes durable, exact, and signed.

Four requirements follow.

> **1. Every blocking rule MUST have a fixture it rejects.**
> An [adversarial fixture](./concepts/adversarial-fixture.md) is a crafted
> violation, and the rule's own name MUST appear in the resulting finding. A
> green suite of valid inputs proves only that a rule is quiet; a rule that never
> fires at all passes those tests identically. A blocking rule with no fixture is
> unproven, and SHOULD be treated as unsound until one exists.

> **2. A predicate MUST NOT branch on a value that varies with where it runs.**
> The tree is the same locally and in CI; the environment is not. Branch names,
> fetched refs, the working directory and the clock are all properties of the
> environment. Where a rule needs to know its context, it MUST derive that from
> the tree — a declared `status`, the presence of a record — and the two
> invocations MUST reach the same verdict. This is
> [gate parity](./concepts/gate-parity.md).

> **3. When a predicate can be written to ask about a declaration or about a
> fact, it MUST ask about the fact.**
> Walk the branch rather than the ledger's list of units. Attest the candidate's
> advisory set rather than recomputing it at closure. The two readings are
> identical in a healthy repository and diverge exactly when something has gone
> wrong, because a broken state usually leaves the declarations internally
> consistent.

> **4. A stated requirement with no predicate MUST be listed as unenforced.**
> The [conformance matrix](#current-conformance) is where that is said. An
> unenforced requirement and an unsound gate are indistinguishable from inside a
> green run — both produce a passing check over a condition nobody verified — and
> only the matrix can tell a reader which one they are looking at.

The rest of this section is the worked example that produced requirement 3.

#### The declaration and the fact

One failure mode is worth naming for whoever implements this next, because it
produced two real violations here and both times the gate reported `OK`.

A predicate can ask about a **declaration** — does every unit the ledger names
resolve a ref? does the disposition match what the checker raises right now? — or
about a **fact** — is every commit on this branch retained? was every advisory at
the candidate disposed? The two read almost identically in code and diverge
exactly when something has gone wrong, because a broken state usually leaves the
declarations internally consistent. A ref moved forward keeps every declared unit
resolving. A closure commit's advisory set stays a tidy subset of the candidate's.

Both rules passed over a live violation. Both were rewritten to walk the
repository instead: the branch itself for retention, an attested candidate set for
dispositions. When a predicate can be written either way, write the one that can
disagree with the record.

The same substitution appears wherever a rule needs to know something it cannot
compute. `hasCeremony` asks whether a session note *names* the path, standing in
for whether a closing ceremony happened — so the note written when the path
opened satisfies the closing gate. A derived-view check asked whether the branch
was named `path/*`, standing in for whether this checkout owns the generated
view — which was true until self-merge made a path the last writer of its own
`status`. Neither rule was edited; the world each described moved underneath it.

A requirement whose reference row names a migration exception is not exempt from
the requirement. The exception is finite, listed in the checker, and reported as
a blocking finding once it is spent — an exception that outlives its migration
is a bypass, and the mechanism that removes it is the same one that enforces the
rule.

Operational cost is part of correctness. A pilot SHOULD measure cold-resume
success first, then ceremony time, ignored advisories, integration retries,
documentation churn, and bypass pressure, before a team widens its claims.
## Implemented rule catalogue

This catalogue is generated from the reference checker. It inventories
implemented predicates; it does not make unimplemented protocol requirements
disappear and does not prove that a judgement-bearing record is correct. Read it
beside the matrix above: the matrix names what the protocol requires, this table
names what one implementation currently checks, and the gap between them is the
honest state of the work.

<!-- cairn:rules:begin -->
| Level | Rule Name | Scope | Trigger Condition | Enforcing Logic |
| :--- | :--- | :--- | :--- | :--- |
| **Blocking** | `acceptance` | diff | Ready/done path lacks exact-commit acceptance or changed implementation after acceptance | `closingAcceptanceErrors(record, pathId) + pathClosureState(path, record)` |
| **Blocking** | `acceptance-drift` | diff | The trunk moved inside the path's declared writes: or governs: since the accepted base | `acceptanceDrift(git diff --name-only <base> <trunk>, writes, governs) — never trunk === base` |
| **Blocking** | `advisory-disposition` | diff | advisory_disposition is not a structured list matching the advisories raised against the candidate | `dispositionErrors(record.advisory_disposition, raised) with set equality on rule names` |
| **Blocking** | `branch-identity` | diff | Detached checkout where branch cannot be identified from host or git ref | `branchSource === 'detached' (blocking on guarded roots, advisory on others)` |
| **Blocking** | `branch-path` | diff | Path branch not declared by a running path file, or missing base_commit | `isPathBranch(branch) && (!match \|\| !PATH_BRANCH_STATUSES.includes(status) \|\| !isCommitPin(base))` |
| **Blocking** | `brief-schema` | diff | The handoff brief is missing, or lacks its eight fields, its seven exact sections, pinned governs entries, or its token budget | `briefErrors(front, body) over BRIEF_FIELDS and BRIEF_SECTIONS` |
| **Blocking** | `checkpoint-retention` | diff | A completed work unit has no retention ref, so a rewriting push would orphan its checkpoint | `retentionDue(units) => retainedRefs.has(refs/cairn/checkpoints/<id>/<n>) (newest unit advisory)` |
| **Blocking** | `closure-surface` | diff | An administrative closure commit changed a path field other than status, subject_commit, current_step or resolution | `closureFieldErrors(previousFront, currentFront) over CLOSURE_MUTABLE_FIELDS` |
| **Blocking** | `coherence-audit` | corpus | Ready path lacks a filled coherence audit bound to its exact subject_commit | `cairn-audit --check --subject path.subject_commit` |
| **Blocking** | `derived-view` | corpus | ACTIVE.md running-paths block does not match trunk path files | `tools/cairn-active.mjs --check` |
| **Blocking** | `links` | corpus | Relative Markdown link points to non-existent target (code fences stripped) | `stripCode(text) => !existsSync(target)` |
| **Blocking** | `migration-debt` | diff | A path listed in the v0.2 migration exception no longer needs it | `migrationDebt(paths, V02_MIGRATION_PATHS) — a spent exception is a bypass` |
| **Blocking** | `opening-ceremony` | diff | Path declared running without an opening-check session note | `!openingFor(pathId) via session frontmatter { path, ceremony: 'opening' }` |
| **Blocking** | `provisional` | diff | A proposed candidate still contains commits marked Cairn-Provisional, or HEAD is itself provisional | `git log --grep=^Cairn-Provisional: base..subject_commit (blocking on a ready path, advisory at HEAD)` |
| **Blocking** | `rebase` | diff | Path branch does not contain latest trunk tip (stale branch) | `trunkContained(trunkRef) === false` |
| **Blocking** | `record-integrity` | diff | Existing session, audit, journal, or rolled-history record was modified, renamed, or deleted | `immutableRecordMutations(previousRef) + isImmutableRecord(file)` |
| **Blocking** | `redaction` | diff | A `[redacted: …]` marker names no redaction record (code spans and fences stripped first) | `redactionMarkers(stripCode(text)) => redaction record exists` |
| **Blocking** | `registration` | diff | Path declaration tuple (id, running, branch, base) missing from trunk | `pathRegistrationState() === 'missing' (blocking) or declared migration exception (advisory)` |
| **Blocking** | `registration-base` | diff | Path base_commit cannot be proved to equal the registration commit parent | `pathRegistrationBaseState() === 'mismatch' \| null` |
| **Blocking** | `route` | diff | A path declares no route, an unknown route, a lightweight route that meets a full-route trigger, a foundation surface outside documents, or a descent from full | `fullRouteTriggers(writes) + foundationSurfaceViolations(writes) + routeDescent(previous, current)` |
| **Blocking** | `same-work-unit` | diff | Source changed without accompanying module note and coding path update | `touched(GUARDED_ROOTS) => touched(docs/modules/) && touched(PATH_DIR)` |
| **Blocking** | `schema` | corpus | Path or ADR frontmatter fails parsing, or an id/status/date is outside vocabulary | `pathFrontmatterErrors(front) + adrFrontmatterErrors(front, file, bodyStatus)` |
| **Blocking** | `scope-digest` | diff | The accepted definition of done moved after acceptance, or was accepted without a digest | `scopeDigest(resolveScopeSection(pathRecord, scope_ref)) === record.scope_digest` |
| **Blocking** | `scope-drift` | diff | Changed files outside path frontmatter declared writes: patterns | `!matchesAny(file, declaredWrites)` |
| **Blocking** | `transition` | diff | Changed path state is not an allowed lifecycle transition, or prior state is unavailable | `transitionErrors(previous, current, onPathBranch)` |
| **Blocking** | `work-unit` | diff | A changed path record carries no `cairn-unit` block, or one declares an unknown type | `parseWorkUnits(record) => workUnitErrors(unit) over WORK_UNIT_TYPES` |
| *Advisory* | `acceptance` | diff | Ready/done path lacks exact-commit acceptance or changed implementation after acceptance | `closingAcceptanceErrors(record, pathId) + pathClosureState(path, record)` |
| *Advisory* | `advisory-disposition` | diff | advisory_disposition is not a structured list matching the advisories raised against the candidate | `dispositionErrors(record.advisory_disposition, raised) with set equality on rule names` |
| *Advisory* | `area-note` | diff | Subsystem source changed without touching matching area module note | `areaOf(file) => changed.includes(note)` |
| *Advisory* | `branch-identity` | diff | Detached checkout where branch cannot be identified from host or git ref | `branchSource === 'detached' (blocking on guarded roots, advisory on others)` |
| *Advisory* | `brief-schema` | diff | The handoff brief is missing, or lacks its eight fields, its seven exact sections, pinned governs entries, or its token budget | `briefErrors(front, body) over BRIEF_FIELDS and BRIEF_SECTIONS` |
| *Advisory* | `checkpoint-retention` | diff | A completed work unit has no retention ref, so a rewriting push would orphan its checkpoint | `retentionDue(units) => retainedRefs.has(refs/cairn/checkpoints/<id>/<n>) (newest unit advisory)` |
| *Advisory* | `decision-drift` | diff | Configured architecture changed without an ADR in the same changeset | `touched(architectureRoot) => touched(decisionRoot)` |
| *Advisory* | `ledger-size` | diff | A path file in the diff exceeds the ledger token budget | `changed.includes(path.file) && path.tokens > LEDGER_TOKEN_BUDGET` |
| *Advisory* | `opening-ceremony` | diff | Path declared running without an opening-check session note | `!openingFor(pathId) via session frontmatter { path, ceremony: 'opening' }` |
| *Advisory* | `path-staleness` | corpus | A path declaring running whose branch has had no commit for longer than the declared window | `staleRunningPaths(corpus, branchAges(corpus)) — advisory always; an unresolvable branch reports nothing` |
| *Advisory* | `provisional` | diff | A proposed candidate still contains commits marked Cairn-Provisional, or HEAD is itself provisional | `git log --grep=^Cairn-Provisional: base..subject_commit (blocking on a ready path, advisory at HEAD)` |
| *Advisory* | `registration` | diff | Path declaration tuple (id, running, branch, base) missing from trunk | `pathRegistrationState() === 'missing' (blocking) or declared migration exception (advisory)` |
| *Advisory* | `remote-checkpoint` | diff | Local path HEAD not present on upstream tracking branch | `pathRemoteCheckpoint(branch).state === 'missing' \| 'unpushed'` |
| *Advisory* | `role-collapse` | diff | One actor recorded both the opening and the closing acceptance for a path | `opening.accepted_by === closing.accepted_by (advisory: visible, never forbidden)` |
| *Advisory* | `route` | diff | A path declares no route, an unknown route, a lightweight route that meets a full-route trigger, a foundation surface outside documents, or a descent from full | `fullRouteTriggers(writes) + foundationSurfaceViolations(writes) + routeDescent(previous, current)` |
| *Advisory* | `scope-digest` | diff | The accepted definition of done moved after acceptance, or was accepted without a digest | `scopeDigest(resolveScopeSection(pathRecord, scope_ref)) === record.scope_digest` |
| *Advisory* | `scope-drift` | diff | Changed files outside path frontmatter declared writes: patterns | `!matchesAny(file, declaredWrites)` |
| *Advisory* | `single-truth` | diff | Manual edits to shared/derived statements of record | `SINGLE_TRUTH.includes(file)` |
| *Advisory* | `transition` | diff | Changed path state is not an allowed lifecycle transition, or prior state is unavailable | `transitionErrors(previous, current, onPathBranch)` |
<!-- cairn:rules:end -->

## Continue through the wiki

The [concept index](./concepts/index.md) separates the vocabulary Cairn borrows
from Git and ordinary practice from the concepts Cairn defines, then offers both
a simple-to-complex route and an alphabetical catalogue. Each article defines one
object, explains why Cairn uses it, states what it does not prove, and links to
related objects.

Use the reference when reconstructing or operating a repository:

- [repository layout](./reference/repository-layout.md);
- [coding-path template](./reference/path-template.md);
- [handoff-brief contract](./reference/handoff-brief.md);
- [opening, closing, and audit records](./reference/human-records.md);
- [operating sequence](./reference/operations.md);
- [repair procedures](./reference/repair.md);
- [configuration and portability status](./reference/configuration.md);
- [conformance checklist](./reference/conformance.md).

The Markdown project and universal HTML edition contain the same article graph.
In the HTML reader, each pane scrolls and keeps history independently. A wiki
link in either pane opens its object in the other pane; the tree opens an
article in the active pane, and a direct `#article-<id>` URL opens that object
beside the specification. Neither pane is a footnote to the other.
