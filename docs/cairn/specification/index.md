---
type: Cairn Specification
title: Cairn — canonical protocol specification
description: A top-down, newcomer-friendly specification of Cairn: the complete operating model first, then its records, lifecycle, execution flow, enforcement, and implementation contract.
tags: [cairn, specification, protocol, coding-path, worktree, git, ci, onboarding]
timestamp: 2026-08-25T00:00:00Z
cairn:
  document: specification
  status: canonical
  version: 1.0
---

# Cairn — canonical protocol specification

Cairn is a repository-native protocol for carrying software work from intent to
an integrated result without losing decisions, progress, or accountability in a
conversation. It lets several bounded pieces of work proceed in parallel while
keeping each one independently understandable, verifiable, resumable, and able
to merge itself.

This page is the canonical specification. It contains every normative rule. The
linked **foundation notes** explain prerequisite ideas more deeply at the point
where they first become useful; the linked **reference notes** provide complete
templates and command recipes. Those notes clarify this page but do not create
additional requirements.

The words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** have their usual
specification meanings:

- **MUST / MUST NOT** — required for Cairn conformance.
- **SHOULD / SHOULD NOT** — the default; depart only for a recorded reason.
- **MAY** — optional and compatible with the protocol.

If you are new to Git, tests, continuous integration, or frontmatter, keep
reading. Each term is defined briefly before Cairn relies on it, with a deeper
note beside it.

## 1. The big picture

### 1.1 The outcome Cairn creates

At any moment, a person or agent should be able to open the repository and
answer five questions from files alone:

1. What work is running?
2. Who or what owns each piece of work?
3. What has each piece completed, and what happens next?
4. Which checks have passed, and which judgements have been recorded?
5. How can the work be resumed or merged without reconstructing a chat?

Cairn creates that outcome with one durable unit called a **coding path**. A
coding path is a bounded change described by one Markdown file. It receives one
Git branch, one working directory, and one writer. Its file holds the plan and a
growing work ledger. Every completed step becomes a Git commit and is pushed
immediately.

> **Core invariant**
>
> One coding path = one branch = one worktree = one writer.

A [Git repository](./foundations/git-and-history.md#repository) is a folder whose
history is stored as linked snapshots called commits. A **branch** names one line
of that history. A **worktree** is a separate checkout of the same repository,
so two paths can work in different folders without sharing a live filesystem.
[Learn the Git model from zero.](./foundations/git-and-history.md)

### 1.2 The complete flow

```text
INTENT
  │
  ▼
OPENING CHECK ── owner accepts the bounded path
  │
  ▼
REGISTER ─────── metadata-only commit on the trunk
  │
  ▼
ISOLATE ──────── path branch + dedicated worktree + one writer
  │
  ▼
EXECUTE ──────── one step = code + tests + docs + ledger + brief
  │               then commit + immediate push
  │
  ├────────────── other paths execute beside it in their own worktrees
  │
  ▼
CLOSING CEREMONY ─ owner accepts the result
  │
  ▼
REBASE + GATES + COHERENCE AUDIT
  │
  ▼
SELF-MERGE ───── path merges into the trunk and pushes it
  │
  ▼
VERIFY + CLEAN ─ prove the remote merge, remove the clean worktree,
                 retain the branch as durable history
```

The **trunk** is the shared main branch, conventionally `main`. Work happens in
parallel; only the short act of registering a path and the short act of merging
it are serialised.

### 1.3 The three roles

| Role | Owns | Does not own |
| :-- | :-- | :-- |
| **Owner** | intent, opening acceptance, closing acceptance, changes to scope or architecture | mechanical gate verdicts |
| **Path writer** | one path file, one branch, one worktree, implementation, tests, documentation, ledger, audit | another path's working directory or branch |
| **Cairn checker** | objective facts about files, metadata, Git ancestry, and command exit codes | product judgement, architectural taste, or whether prose is true |

The owner and writer may be people or agents where appropriate. The checker is
deterministic automation. Cairn deliberately separates **human judgement** from
**mechanical proof**: judgement is recorded in files; automation proves that the
records exist and have the required shape.

### 1.4 What Cairn is — and is not

Cairn is:

- an execution protocol stored inside the repository;
- a concurrency model for independent coding paths;
- a durable handoff model for people and agents;
- a set of local checks that can also run in CI;
- a disciplined route from acceptance to self-merge.

Cairn is not:

- a ticket service, chat transcript, or hidden database;
- a scheduler that assigns people to work;
- a replacement for tests, code review, or architectural judgement;
- a lock that prevents paths from discovering a wider root cause;
- a promise that every recorded statement is correct.

## 2. The project model

### 2.1 Three kinds of state

A project contains three kinds of state. The distinction matters because only
two survive the current conversation:

| Plane | Canonical home | Question it answers | Lifetime |
| :-- | :-- | :-- | :-- |
| **Knowledge** | `docs/` | What should the system be, and why? | durable |
| **Execution state** | `project/` | What is this bounded task changing, and where does it stand? | durable |
| **Ephemeral context** | a conversation or process memory | What is being considered right now? | temporary |

A file can be durable without being true. Architecture and decisions are the
durable source of record; tests and evidence still determine whether their
claims hold. [Why durable state and truth are different.](./foundations/durable-state.md)

The protocol's central rule follows directly:

> Progress, acceptance, decisions, and next actions MUST be persisted in files.
> Conversation memory MUST NOT be their only home.

### 2.2 Canonical repository layout

Cairn uses the following default names. A conforming implementation MAY bind the
same roles to different paths through `cairn.config.json`; documentation and
generated output MUST use the configured names consistently.

```text
repository/
├── AGENTS.md                         # small entry-point for people and agents
├── cairn.config.json                 # repository bindings and enforcement tier
├── src/ …                            # product/source roots (project-defined)
├── docs/                             # durable knowledge plane
│   ├── architecture/                 # accepted architecture and doctrine
│   ├── adr/                          # architectural decision records
│   └── modules/                      # notes for implemented areas
└── project/                          # durable execution-state plane
    ├── index.md                      # map of this project state
    ├── coding-paths/
    │   ├── index.md                  # path register and navigation
    │   ├── ACTIVE.md                 # generated running-path view
    │   ├── CP-EXAMPLE-001.md         # one path, plan, and live ledger
    │   └── history/
    │       └── CP-EXAMPLE-001-S01.md # completed ledger step, moved verbatim
    ├── sessions/
    │   └── 2026-01-15-cp-example-001-opening.md
    ├── audits/
    │   └── cp-example-001-a1b2c3d.md
    ├── briefs/
    │   └── cp-example-001-handoff.md
    └── log/
        └── 2026-01-18-cp-example-001.md
```

The detailed ownership and naming rules are collected in the
[repository layout reference](./reference/repository-layout.md).

### 2.3 Four ownership classes

Every Cairn-managed file belongs to one of four classes:

| Class | Examples | Write rule |
| :-- | :-- | :-- |
| **Canonical** | architecture page, ADR, module note | edited deliberately; a change may require a decision record |
| **Path-owned** | `CP-*.md`, its handoff brief | exactly one active path writes it |
| **Generated** | `ACTIVE.md`, rule catalogue | never hand-edited; regenerate from canonical inputs |
| **Append-only by namespace** | audits, session records, journal entries, rolled steps | create one uniquely named file; do not make every path append to one shared file |

This arrangement avoids coordination through shared mutable summaries. The
underlying principle is explained in
[Concurrency by structure](./foundations/parallel-work.md).

## 3. The coding path

### 3.1 One bounded unit of work

A **coding path** is the complete durable record for one bounded implementation
task. It MUST state:

- its identity and current status;
- the outcome it intends to produce;
- its ordered steps and definition of done;
- the documents that govern it;
- the files or areas it expects to touch;
- its work ledger, current checkpoint, next action, and blockers.

The canonical path filename is `project/coding-paths/CP-<ID>.md`.

Numbered identifiers such as `CP-ROADMAP-010` are suitable when the work comes from
a roadmap. Named identifiers such as `CP-SEARCH` are suitable for repairs,
investigations, or focused improvements. The branch name is the lower-case path
identifier under `path/`: `CP-SEARCH` becomes `path/cp-search`.

### 3.2 The identity tuple

The path's frontmatter begins with a small identity tuple:

```yaml
cairn:
  id: CP-EXAMPLE-001
  status: running
  current_step: S02
  base_commit: a1b2c3d
  branch: path/cp-example-001
  writes:
    - src/example/**
    - docs/modules/example.md
```

**Frontmatter** is a metadata block between `---` lines at the beginning of a
Markdown file. It lets people read the document normally while tools read exact
fields. [Frontmatter and machine-readable records.](./foundations/metadata-and-records.md)

The tuple has two jobs:

- `id`, `status`, `branch`, and `base_commit` give every checkout a stable way
  to identify the work;
- `current_step` and `writes` help people and tools navigate the evolving task.

`base_commit` MUST identify the trunk tip immediately before the path's
registration commit. It pins the project state on which the path was accepted.

The complete copy-ready document is in the
[path template reference](./reference/path-template.md).

### 3.3 Documentation coverage

Every path MUST classify relevant project documentation into three visible
groups:

```text
Required               read before execution
Conditional            read when a named trigger occurs
Deliberately excluded  outside scope, with a reason
```

The purpose is not to make every writer read the whole repository. It is to
make omission explicit. A path MAY widen its coverage when discovery requires
it; the ledger MUST record the widening.

### 3.4 `writes:` is a signal, not a lock

`writes:` lists expected write surfaces. It helps identify likely overlap when
paths open and helps a reviewer compare the final diff with the accepted scope.

It MUST NOT prevent a path from following a root cause into another file. When
the actual work exceeds the declaration, the writer records the widening in the
ledger, adds the new documentation coverage when needed, and continues. Cairn
reports this as advisory scope drift rather than blocking it.

### 3.5 The work ledger and handoff brief

The **work ledger** is the append-only checkpoint inside the path. Every executed
step records what changed, tests run, decisions made, remote commit, next action,
and blockers. It is written during the work, not reconstructed at the end.

The **handoff brief** in `project/briefs/<path-id>-handoff.md` is a shorter,
disposable view refreshed from the ledger at every completed step. It helps a new
session enter quickly, but it MUST NOT replace the path file. If the brief, path,
and Git disagree, the writer reconciles the ledger against Git and regenerates
the brief.

When a path file exceeds the configured reading budget, completed major steps
MAY move into `project/coding-paths/history/<id>-SNN.md`. The move MUST be
verbatim. The live path retains its declaration, step index, checkpoint, next
action, and blockers.

## 4. Lifecycle

### 4.1 States

```text
draft ───────► running ───────► done ───────► archived
                  │  ▲                           ▲
                  │  └──── blocked ─────────────┘
                  └──────────────────────────────┘
                              abandonment
```

| Status | Meaning | Required state |
| :-- | :-- | :-- |
| `draft` | proposed, not accepted | identity and proposed scope |
| `running` | accepted, registered, and assigned to its branch/worktree | branch, base commit, opening record, trunk registration |
| `blocked` | unable to progress until a named condition changes | blocker and next way to resume; no active branch obligation |
| `done` | accepted, rebased, audited, and merged | closing record and integrated result |
| `archived` | removed from the live portfolio and retained as history | reason for archival |

`archived` is the single terminal state. A completed path normally moves
`done → archived`. An abandoned path moves `running → archived` without passing
through `done`, because `done` asserts that the result was merged.

A path MAY move between `running` and `blocked` as conditions change. A quiet
`running` path SHOULD produce an advisory staleness notice; it MUST NOT fail an
unrelated build merely because it is old.

### 4.2 What automation can enforce

The lifecycle describes allowed human and agent behaviour. A validator normally
sees one repository state, not the previous status transition. It therefore
enforces **per-state invariants**, not the history of transitions:

- `running` requires its branch, base commit, opening record, and registration;
- `done` requires its closing record;
- `draft`, `blocked`, and `archived` carry no branch obligation.

An implementation MUST NOT claim to enforce transitions it cannot observe.

## 5. Opening a path

Opening turns accepted intent into globally visible execution state. The order
is part of the protocol.

### 5.1 Define and review

1. The owner and writer define one bounded outcome, its major features, its
   documentation coverage, expected writes, and definition of done.
2. They run an **opening check** item by item. The owner explicitly accepts the
   path or amends it.
3. They record the acceptance in a session file under `project/sessions/`.

The session record MUST declare these root-level fields:

```yaml
path: CP-EXAMPLE-001
ceremony: opening
```

The fields are root-level because the checker must read one unambiguous schema.
The path identifier is matched exactly. Full templates for opening, closing, and
audits are in [Human records](./reference/human-records.md).

### 5.2 Register before branching

From a clean, current trunk:

1. Set the path to `status: running`.
2. Set `base_commit` to the current trunk tip.
3. Set the final `path/<id>` branch name.
4. Regenerate `project/coding-paths/ACTIVE.md`.
5. Run the local Cairn check.
6. Commit and push a **metadata-only registration** to the trunk.

The registration contains the accepted path declaration, the generated active
view, and the opening record. It MAY include another metadata correction needed
to make those records coherent. It MUST contain no implementation.

Only after the pushed registration exists on the trunk may the writer create the
path branch and worktree from that commit.

**Why this order exists:** a checkout can read its own branch but cannot see
files that exist only on sibling branches. Registration makes every active path
visible from the common ancestor before the work diverges.

## 6. Executing a path

### 6.1 Create isolation

The writer creates one dedicated branch and one dedicated worktree:

```bash
git worktree add ../repo-cp-example-001 \
  -b path/cp-example-001 main
cd ../repo-cp-example-001
```

No second writer may modify that worktree. Other people or agents MAY inspect,
diagnose, or review it without writing.

If the software creates runtime profiles, caches, databases, ports, or sockets,
each worktree MUST receive an isolated runtime identity. Filesystem isolation is
incomplete when two running instances still share mutable runtime state.

### 6.2 Execute one step at a time

One step is one coherent work unit:

```text
implementation
  + tests
  + affected architecture/module documentation
  + path ledger checkpoint
  + refreshed handoff brief
```

The step SHOULD be small enough to review as one idea and complete enough to be
a safe recovery point. The writer stages explicit paths, not an undifferentiated
working tree.

### 6.3 Run gates bare

A **test** is executable code that checks a behaviour. A **gate** is a check whose
non-zero process exit code can stop the work. A check must be run directly so its
exit code remains the verdict:

```bash
npm run cairn-check
npm run typecheck && npm test && npm run build
```

Do not pipe a gate through `grep`, `head`, `tail`, or another filter before
recording the verdict. In a shell pipeline, the visible exit status may belong
to the final filter rather than the check that matters.

[Tests, exit codes, CI, and gates from zero.](./foundations/quality-and-gates.md)

### 6.4 Commit and push are one completion unit

After the gates pass:

1. commit the coherent step on the path branch;
2. push that commit immediately to its upstream branch;
3. record the remote commit in the ledger;
4. only then call the step complete.

A commit is a durable local snapshot. A **push** copies it to a remote repository
that survives the current machine. If pushing fails, the correct state is
**implemented locally, not complete**.

Every completed and pushed step is a safe session boundary. The writer SHOULD
offer to continue in a fresh session. The next session re-enters from
`AGENTS.md` → active paths → path ledger → handoff brief, verifies those records
against Git, and begins the recorded next action without an oral recap.

## 7. Parallel paths

### 7.1 Work is parallel; integration is ordered

Any number of paths MAY execute at the same time when each has its own branch,
worktree, writer, and runtime identity.

```text
                         ┌─ path/cp-a ─ steps ─┐
trunk ─ registration A ──┼──────────────────────┼─ merge A ─ trunk
      ─ registration B ──┼─ path/cp-b ─ steps ──────────────┼─ merge B
                         └─ path/cp-c ─ steps ───────────────┘
```

Paths do not merge through an integrator. Each path merges itself after it
contains the current trunk tip and passes its own closing conditions. This
serialises a short integration window without serialising days of work.

### 7.2 Avoid shared evolving files

When several writers need one overview, Cairn prefers one of two structures:

- **generate the overview** from path-owned inputs; or
- **give each writer a uniquely named file** and build an index over them.

Examples:

- `ACTIVE.md` is generated from registered path declarations;
- journal entries are one file per path merge under `project/log/`;
- audits are named by path and commit;
- completed ledger steps are named by path and step.

A generated file MUST NOT be maintained manually. A hand edit to a generated or
shared statement of record SHOULD be reported and either regenerated or justified
in the current ledger.

### 7.3 Overlap and widening

The path declarations provide an early overlap signal. When two paths expect to
touch the same high-conflict file, their writers SHOULD coordinate merge order or
rebase early. Cairn does not lock the file and does not appoint a permanent
gatekeeper.

Discovery may widen a path. The writer records the new surface, updates the
governing documentation, and keeps the work coherent. Unrecorded drift is a
warning; justified widening is normal.

## 8. Closing and self-merge

Closing converts branch-owned execution state into an accepted trunk result.

### 8.1 Closing sequence

The path MUST perform these steps in order:

1. **Closing ceremony.** The owner reviews the delivered scope, remaining work,
   and next direction. A session record declares `path:` and
   `ceremony: closing` at root level.
2. **Rebase.** Rebase the path onto the current trunk. The path branch must
   contain the trunk tip.
3. **Quality gates.** Run the protocol and product gates on the rebased result.
4. **Coherence audit.** Review the rebased diff against accepted architecture,
   decision records, and the path's declared coverage; write a filled record in
   `project/audits/`.
5. **Complete the path.** Set `status: done` in the change that will merge.
6. **Self-merge and push.** Merge the path into the trunk and push the trunk
   immediately.
7. **Verify and clean.** Prove the merge is present on the remote trunk, then
   retire the clean secondary worktree from another checkout.

### 8.2 Rebase gate

A **rebase** replays the path's commits on top of the latest trunk. Cairn checks
the result as a Git ancestry predicate:

```text
current trunk tip is an ancestor of path HEAD
```

If a rebase rewrites commits already published on the path branch, update the
remote with `--force-with-lease`, never blind `--force`, and record the old and
new heads. `--force-with-lease` refuses to overwrite remote work that moved
unexpectedly.

### 8.3 Coherence audit

Architectural coherence requires judgement, so its verdict is not a blocking
machine rule. Cairn separates two facts:

```text
agent or reviewer produces the judgement
checker verifies that a filled, correctly bound record exists
```

The audit MUST identify the path and a commit belonging to that path. It MUST
state an outcome and answer its own review prompts. The checker MUST NOT pretend
to judge whether the architectural conclusion is wise.

### 8.4 Remote verification and worktree cleanup

Cleanup begins only after the merge commit is an ancestor of the remote trunk.
From another surviving checkout, the operator:

1. resolves the exact secondary worktree;
2. requires its Git status to be empty;
3. removes it without `--force`;
4. verifies its registration and directory are absent.

The main/owner worktree and any dirty worktree MUST NOT be removed. The local and
remote path branch SHOULD be retained as the online step history. Worktree
removal and branch deletion are separate operations.

If verification or cleanup fails, leave the directory intact and report:

```text
merge complete; cleanup incomplete
```

The complete command sequence is in the
[operations reference](./reference/operations.md).

## 9. Human records

### 9.1 Ceremonies

Opening and closing are human decisions expressed as durable records. The
checker proves the declaration exists; it does not infer acceptance from a
filename and does not assess the quality of the decision.

The two machine fields are deliberately small:

```yaml
path: CP-EXAMPLE-001
ceremony: opening   # use `closing` for the other ceremony
```

In an actual record, comments MUST be on their own line if the configured parser
takes scalar values literally. The canonical copy-ready form is in
[Human records](./reference/human-records.md).

### 9.2 Architecture decisions

Architecture belongs in `docs/architecture/`; changes to accepted architecture
SHOULD be accompanied by an ADR in `docs/adr/`. A coding path may execute an
accepted decision but MUST NOT silently invent architecture in its ledger.

### 9.3 Journal

At merge time the path writes one journal entry under
`project/log/YYYY-MM-DD-<path-id>.md`. The entry names the integrated outcome and
links to its path, audit, and relevant decision records. One file per entry keeps
parallel paths from appending to the same mutable file.

## 10. Enforcement model

### 10.1 Blocking and advisory findings

Every mechanical finding has one of two effects:

```text
BLOCKING   contributes to a non-zero exit code; the work cannot proceed
ADVISORY   prints a visible finding; it never changes the exit code
```

A rule may block only when both conditions hold:

> The condition is objectively checkable **and** violating it leaves the
> repository in a mechanically wrong state.

Judgement, preference, age, likely scope, and prose quality belong in the
advisory tier. A false blocking verdict encourages people to bypass the whole
checker; the admission test protects the credibility of every gate.

### 10.2 Enforcement tiers

The same checks can run at three repository-declared tiers:

| Tier | Configuration | Meaning |
| :-- | :-- | :-- |
| `local` | local command only | the checker reports before commit; no host is required |
| `ci` | workflow runs on trunk and `path/**` | CI observes and publishes the verdict; a direct merge can still bypass it |
| `protected` | trunk requires the CI checks | the host prevents a failing change from merging |

Only `local` is required by Cairn. `ci` and `protected` are repository
capabilities. The configured tier MUST be printed by the checker so documentation
does not claim prevention when the host only observes.

See the canonical fields and defaults in
[`cairn.config.json`](./reference/configuration.md).

### 10.3 Deterministic and judgement-bearing work

The checker may inspect:

- Git refs and ancestry;
- filesystem paths and directory contents;
- Markdown/frontmatter fields;
- changed-file sets and configured globs;
- command exit codes;
- declared host variables;
- wall-clock age for advisory notices.

It MUST NOT put a non-deterministic model verdict on the blocking path. When a
judgement matters, a person or agent writes a record and the deterministic check
verifies only its existence, binding, and minimum completeness.

### 10.4 Unknown is not success

When a rule cannot identify the subject it is expected to guard, it must report
that condition. For example, an unidentified branch with guarded source changes
is blocking because every branch-scoped rule would otherwise disappear silently.

When absence of information is legitimate, unknown must remain unknown. An
unresolvable remote branch, for example, MUST NOT be labelled stale or fresh.

### 10.5 Generated and executable documentation

Facts that can be derived SHOULD be generated. Published templates SHOULD be
parsed by tests. This specification's detailed rule catalogue is generated from
the checker source and compared by the test suite, so a rule cannot be silently
added to one side only.

## 11. Operator sequence

This compact sequence is enough for daily use after the model above is
understood.

### Open

```text
opening check
  → write opening record
  → create running path declaration on current trunk
  → regenerate ACTIVE.md
  → run cairn-check
  → metadata-only registration commit
  → push trunk
  → create path branch and worktree from that commit
```

### Execute each step

```text
code + tests + docs + ledger + handoff brief
  → run gates bare
  → commit explicit files
  → push immediately
  → record remote checkpoint
  → continue here or resume next step in a fresh session
```

### Close

```text
closing ceremony
  → rebase on current trunk
  → product gates + cairn-check
  → coherence audit
  → status: done
  → push path
  → self-merge and push trunk
  → verify remote merge
  → remove exact clean secondary worktree without force
  → retain branch
```

Copy-ready shell commands are in [Operations](./reference/operations.md).

## 12. Guarantees and limits

### 12.1 What a conforming repository can rely on

When Cairn is followed:

- every implementation belongs to an accepted, bounded path;
- every running path is visible from the trunk before its branch diverges;
- parallel writers do not share a working directory;
- each completed step has local and remote Git recovery points;
- each session can resume from durable repository state;
- owner acceptance is recorded at opening and closing;
- integration occurs only from a path containing the current trunk tip;
- mechanical conditions and human judgements remain visibly distinct;
- generated portfolio views derive from path-owned records;
- the final merge and local cleanup have explicit proofs and outcomes.

### 12.2 What Cairn does not prove

Cairn does not prove:

- that a human acceptance was wise;
- that an audit conclusion was correct;
- that checkpoint prose is accurate merely because the file changed;
- that `base_commit` describes the intended moment unless an implementation
  explicitly validates it;
- that every commit was pushed immediately after the fact; the final Git graph
  cannot reconstruct push cadence;
- that a removed worktree was clean after it no longer exists in repository CI;
- that a green test suite covers behaviours nobody thought to test.

These are boundaries, not hidden promises. Cairn records the strongest fact its
inputs can support and leaves judgement visible where judgement remains.

## 13. Rule catalogue

Run the checker locally as the automation runs it:

```bash
npm run cairn-check
npm run cairn-check -- --base origin/main
npm run cairn-check:test
```

The following table is generated from the checker's rule source. Some rule names
appear once at each level because the same condition may be blocking in a guarded
context and advisory in a migration or non-guarded context.

<!-- cairn:rules:begin -->
| Level | Rule Name | Scope | Trigger Condition | Enforcing Logic |
| :--- | :--- | :--- | :--- | :--- |
| **Blocking** | `branch-identity` | diff | Detached checkout where branch cannot be identified from host or git ref | `branchSource === 'detached' (blocking on guarded roots, advisory on others)` |
| **Blocking** | `branch-path` | diff | Path branch not declared by a running path file, or missing base_commit | `isPathBranch(branch) && (!match \|\| !PATH_BRANCH_STATUSES.includes(status) \|\| !isCommitPin(base))` |
| **Blocking** | `ceremony` | diff | Path marked done without closing ceremony session note frontmatter | `!ceremonyFor(pathId) via session frontmatter { path, ceremony: 'closing' }` |
| **Blocking** | `derived-view` | corpus | ACTIVE.md running-paths block does not match trunk path files | `tools/cairn-active.mjs --check` |
| **Blocking** | `links` | corpus | Relative Markdown link points to non-existent target (code fences stripped) | `stripCode(text) => !existsSync(target)` |
| **Blocking** | `opening-ceremony` | diff | Path declared running without an opening-check session note | `!openingFor(pathId) via session frontmatter { path, ceremony: 'opening' }` |
| **Blocking** | `rebase` | diff | Path branch does not contain latest trunk tip (stale branch) | `trunkContained(trunkRef) === false` |
| **Blocking** | `registration` | diff | Path declaration tuple (id, running, branch, base) missing from trunk | `pathRegistrationState() === 'missing' (blocking) or declared migration exception (advisory)` |
| **Blocking** | `same-work-unit` | diff | Source changed without accompanying module note and coding path update | `touched(sourceRoots) => touched(moduleNotes) && touched(pathDirectory)` |
| **Blocking** | `schema` | corpus | Path or ADR frontmatter fails parsing, or an id/status/date is outside vocabulary | `pathFrontmatterErrors(front) + adrFrontmatterErrors(front, file, bodyStatus)` |
| *Advisory* | `area-note` | diff | Subsystem source changed without touching matching area module note | `areaOf(file) => changed.includes(note)` |
| *Advisory* | `branch-identity` | diff | Detached checkout where branch cannot be identified from host or git ref | `branchSource === 'detached' (blocking on guarded roots, advisory on others)` |
| *Advisory* | `coherence-audit` | corpus | Path rebased HEAD lacks a filled, correctly bound coherence-audit record | `cairn-audit --check in the configured audit directory` |
| *Advisory* | `decision-drift` | diff | Configured architecture changed without an ADR in the same changeset | `touched(architectureRoot) => touched(decisionRoot)` |
| *Advisory* | `ledger-size` | diff | A path file in the diff exceeds the ledger token budget | `changed.includes(path.file) && path.tokens > LEDGER_TOKEN_BUDGET` |
| *Advisory* | `opening-ceremony` | diff | Path declared running without an opening-check session note | `!openingFor(pathId) via session frontmatter { path, ceremony: 'opening' }` |
| *Advisory* | `path-staleness` | corpus | A path declaring running whose branch has had no commit for longer than the declared window | `staleRunningPaths(corpus, branchAges(corpus)) — advisory always; an unresolvable branch reports nothing` |
| *Advisory* | `registration` | diff | Path declaration tuple (id, running, branch, base) missing from trunk | `pathRegistrationState() === 'missing' (blocking) or declared migration exception (advisory)` |
| *Advisory* | `remote-checkpoint` | diff | Local path HEAD not present on upstream tracking branch | `pathRemoteCheckpoint(branch).state === 'missing' \| 'unpushed'` |
| *Advisory* | `scope-drift` | diff | Changed files outside path frontmatter declared writes: patterns | `!matchesAny(file, declaredWrites)` |
| *Advisory* | `single-truth` | diff | Manual edits to shared/derived statements of record | `SINGLE_TRUTH.includes(file)` |
<!-- cairn:rules:end -->

## 14. Reading and implementation map

### Learn a prerequisite when you meet it

- [Git, commits, branches, remotes, rebase, and worktrees](./foundations/git-and-history.md)
- [Durable state, canonical files, generated views, and ephemeral context](./foundations/durable-state.md)
- [Frontmatter and machine-readable human records](./foundations/metadata-and-records.md)
- [Tests, exit codes, CI, blocking gates, and advisory findings](./foundations/quality-and-gates.md)
- [Parallel work through ownership and namespace design](./foundations/parallel-work.md)

### Reconstruct or operate the protocol

- [Canonical repository layout and naming](./reference/repository-layout.md)
- [Complete coding-path template](./reference/path-template.md)
- [Opening, closing, and audit records](./reference/human-records.md)
- [`cairn.config.json` fields and defaults](./reference/configuration.md)
- [Opening, execution, closing, and cleanup commands](./reference/operations.md)
- [Glossary](./reference/glossary.md)
