---
type: Atomik Handbook
title: The Cairn handbook — the practice, from zero, and the protocol built on it
description: One document. Each part teaches a piece of general software practice from nothing, then shows exactly how Cairn implements it and which file enforces it. Ends with the operator guide, the generated rule catalogue, and the lexicon.
tags: [cairn, handbook, protocol, git, testing, ci, enforcement, lifecycle, onboarding]
timestamp: 2026-08-25T00:00:00Z
---

# The Cairn handbook

> **Current as of 2026-08-25.** This is the single entry point for Cairn: the
> general practice and the protocol in one document. It renders
> [`ADR-009`](../adr/ADR-009-coding-paths-work-ledger-dual-plane.md),
> [`ADR-012`](../adr/ADR-012-parallel-paths-self-merge.md),
> [`ADR-016`](../adr/ADR-016-cairn-enforcement-integrity.md) and
> [`ADR-017`](../adr/ADR-017-coding-path-lifecycle.md), together with the operating
> detail in [`paths.md`](../../atomik-project/coding-paths/paths.md). Where this page
> and an ADR disagree, the ADR wins and the disagreement is a defect to report.
> [`handbook.html`](./handbook.html) is this document rendered, and
> [`anatomy.md`](./anatomy.md) is the same material read from the other end.

## How to read this

The document alternates between two modes, and the alternation is the point.

```text
CONCEPT    a piece of general software practice, explained from nothing.
           True of any project. No prior knowledge assumed.

IN CAIRN   exactly how this protocol implements that idea here — the rule,
           the file that enforces it, and the failure that made it necessary.
```

Read straight through and you learn the practice and the protocol together, in
the order where each one explains the other. If you already know the practice,
read only the **IN CAIRN** blocks; they are self-contained and carry every
normative statement.

Nothing here is decorative. Every rule is stated with the specific failure that
produced it, because a rule without its failure is a rule people quietly drop.

## Notation — the names that are yours, not Cairn's

Cairn is meant to run in any repository, so the protocol talks about **roles**,
and each repository binds them to its own directory names:

```text
project/     the execution-state plane root — paths, sessions, audits, briefs,
             the journal. THIS repository binds it to `atomik-project/`.
docs/        the knowledge plane root. Unchanged here, but equally a binding.
apps/ …      the SOURCE roots the guarded rules apply to. This repository binds
             them to `apps/`, `packages/`, `shared/`.
```

Read `project/` below as *"whatever this repository calls its execution-state
plane"*. Two places deliberately show the real name instead:

- **Links** point at this repository's actual files, because a link has to
  resolve. `../../atomik-project/coding-paths/paths.md` is an address, not a
  claim about the protocol.
- **[§11.1](#111-the-rule-catalogue)** is generated from the validator's own
  source, so it prints whatever that source has compiled in. Today that is this
  repository's bindings, hardcoded — which is precisely why the bindings are
  listed as **aspirational** in [§11.2](#112-lexicon) rather than described as
  configuration that already exists.

```text
 1  What a project actually is             7  The path lifecycle
 2  Version control                        8  Operator guide
 3  Tests                                  9  Declared properties
 4  Automation and gates                  10  Known limits
 5  Working in parallel                   11  Reference: rules and lexicon
 6  The protocol layer
```

---

# 1. What a project actually is

## 1.1 CONCEPT — the state of a project is not the state of a file

A project is not the code. It is the code, plus every decision that shaped it,
plus the reason each decision was taken, plus the knowledge of what has already
been tried and abandoned.

Most of that lives nowhere. It lives in the head of whoever did the work, and it
leaves when they do. Six months later the code is still there and the reasons are
gone, so the next person cannot tell a deliberate choice from an accident. They
change something that looks arbitrary, and it was not.

This is the failure everything in this document is built against. It has a shape:

```text
what survives      the files in the repository
what evaporates    anything that was only ever said
```

There is no clever solution. There is one crude, effective rule: **if it matters,
it is a file.** Everything else is detail about which files, in what format, and
what checks they must satisfy.

## 1.2 IN CAIRN — three planes, one of which evaporates

Cairn names the three places knowledge can sit, so it can be explicit about which
one is untrustworthy:

| Plane | Lives in | Lifetime |
| :-- | :-- | :-- |
| Knowledge | `docs/` | durable — what *should* be true |
| Execution state | `project/` | durable — what is being done, and what was done |
| Ephemeral context | the conversation | **evaporates** |

There is a second, different split — the repository is *dual*-plane: a code plane
(`apps/`, `packages/`, `shared/`, `docs/`) and a knowledge-plus-execution plane
(`project/`). These are two decompositions of the same repository and
conflating them is a recurring source of confusion. `apps/` is **not** a third
conceptual plane; it is one half of the repository split.

> **The whole protocol exists to move authority out of the third conceptual
> plane.** Progress persists in files, never in a conversation. A rule that only
> exists because someone remembers it is not a rule.

---

# 2. Version control

## 2.1 CONCEPT — the problem

Everyone has invented version control badly:

```text
report.py
report_v2.py
report_v2_fixed.py
report_final.py
report_final_REALLY.py
```

That is a version control system. It cannot tell you what changed between two of
those files, why, when, or who did it. Worse, it cannot recover the state of the
**whole project** at the moment one of them was correct, because the file next to
it changed too and was overwritten in place.

**Version control** is that idea done properly, for a whole directory at once. The
dominant implementation is **Git**, and everything below is Git.

## 2.2 CONCEPT — a commit

A **commit** is a complete snapshot of every tracked file at one moment, plus who
made it, when, a message saying what it is, and a pointer to the commit it came
from.

Two properties surprise people, and both matter later:

**It is a snapshot, not a change.** Git stores the whole state, and *shows* you
changes by comparing two snapshots. That is why it can show the difference between
any two points in history, however far apart, without having stored that
difference.

**Its name is computed, not chosen.** Every commit gets an identifier like
`b4ef361` — a hash over its content, its metadata, **and the identifier of its
parent**. Since the parent's id already includes *its* parent's id, a commit's
identifier is a fingerprint of the entire history behind it:

```text
a1b2c3 ──► d4e5f6 ──► 7a8b9c ──► b4ef361
 "load"     "clean"    "model"    "output"

change anything in a1b2c3 and every id to its right changes too.
```

You cannot quietly alter an old commit and leave the later ones looking
untouched. This is what makes Git a *record* rather than a backup: not that it is
hard to edit history, but that editing it is impossible to hide.

**A commit message is not decoration.** The code shows *what*. The message is
usually the only surviving record of *why*.

## 2.3 IN CAIRN — the identity tuple and `base_commit`

Every unit of work in Cairn declares a small, stable set of facts in one file, and
one of them is a commit id:

```yaml
atomik:
  id: CP-MVP-010
  status: running
  base_commit: 70f7e27       # the trunk tip immediately BEFORE registration
  branch: path/cp-mvp-010
```

The block's key — `atomik:` — is this repository's namespace, and is a binding
like the directory names. The validator reads it hardcoded today, so this document
shows the real key rather than a generic one: publishing `cairn:` here while the
parser looks for `atomik:` would be exactly the defect [§3](#35-in-cairn--documentation-the-tests-can-read)
is about.

`base_commit` pins the exact state the work started from. Because a commit id
fingerprints its whole history, that single short string is an unambiguous
reference to *everything* the work assumed — not a date, not a version number, not
a description that can be read two ways.

Its **presence** is checked, blocking. Its **accuracy** is not, and that is
recorded as an open limit rather than implied to be safe ([§10](#10-known-limits)).

## 2.4 CONCEPT — branches

A **branch** is a name that points at one commit. That is genuinely all it is;
when you commit, the name moves forward to the new commit.

The reason it matters is that you can have several, and they can diverge:

```text
                    ┌──► f1a2b3 ──► c4d5e6      branch: add-caching
a1b2c3 ──► d4e5f6 ──┤
                    └──► 9z8y7x                 branch: master
```

Work on one branch cannot damage the other. If the idea does not work out, the
branch is deleted and nothing was lost.

One branch is conventionally the shared, agreed, current one: **`master`**,
**`main`**, or **the trunk**. **`HEAD`** is Git's word for where you are standing
right now — usually a branch name. It can also point straight at a commit with no
branch attached, a state called **detached HEAD**: fine for looking around,
hazardous for working, because commits made there have no name and are easy to
lose.

## 2.5 IN CAIRN — one path, one branch, one worktree, one writer

```text
one path = one worktree = one branch = one writer
```

A **worktree** is a second checkout of the same repository, in a different
directory, on a different branch:

```bash
git worktree add ../repo-cp-mvp-010 -b path/cp-mvp-010 master
```

A shared working directory has exactly **one writer**. Others may read, diagnose,
review and report there; two people editing one filesystem at once is not made
safe by documentation saying they should not. Every code path therefore takes its
own worktree, and branches from the *local* trunk — never the remote one, when the
local branch is ahead of it.

Branch names follow the path id: `CP-MVP-010` → `path/cp-mvp-010`.

**Detached HEAD is not a curiosity here, it is a repaired defect.** Automated
checks run in environments that check out a detached HEAD by default. A check that
cannot name its branch cannot enforce anything *about* branches — and it does not
say so, it simply skips. Cairn's validator now asks the host for the branch name
before it asks the checkout, and **fails closed** when the branch is undeterminable
while guarded code changed. Silence is no longer a pass.

## 2.6 CONCEPT — merging, conflicts, rebase

**Merging** brings one branch's work into another. Git compares both sides against
the commit where they diverged. If the two sides changed different things, it
combines them and records a commit with two parents. If both changed the *same
lines*, Git stops and reports a **conflict**, refusing to proceed until a human
decides.

New users read a conflict as Git being difficult. It is the opposite. The
alternative to a conflict is not a clean result — it is a silent, plausible,
wrong one. **Git refuses to guess**, and it does so at the only moment when the
guess is cheap to correct.

**Rebase** is the other way to combine work: instead of joining two lines, it
*replays* your commits on top of the other branch as if you had started there. The
history comes out straight instead of braided. The cost is that replayed commits
are new commits with new ids, so the originals are no longer those commits — safe
for work only you have, disruptive for work others have built on.

## 2.7 IN CAIRN — the rebase gate, and self-merge

There is **no integrator**. No person or queue sits between a branch and the
trunk; every path merges itself. That works because of one automated rule:

> A path branch must **contain the current trunk tip** before it may merge.
> Checked, not remembered.

This serialises the **merge** — thirty seconds — without serialising the **work**.
Two paths can run for two days in parallel and still land safely, because whoever
merges second rebases onto the first and re-runs the checks. There is no queue of
people, only a queue of merges.

If a closing rebase rewrites commits that were already published, publish the
result with `git push --force-with-lease` — never a blind `--force`, which can
discard someone else's commits — and record the pre- and post-rebase heads in the
work ledger.

## 2.8 CONCEPT — remotes, and what "done" means

Everything so far is on one machine. A **remote** is a copy of the repository
elsewhere that several people can reach; `origin` is the conventional name for the
main one. You **push** commits to it and **fetch** or **pull** theirs.

The distinction that costs people work:

> **Committing is not backing up.** A commit lives inside your own project folder.
> If the machine dies, the commit dies with it. Only a push puts it anywhere else.

## 2.9 IN CAIRN — every commit is a remote checkpoint

Commit and push are **one completion unit**, not two steps:

```text
change code + tests + docs + ledger + handoff brief
  → run the relevant gates bare
  → commit the coherent work unit
  → push immediately to that commit's owning branch
  → only now report the step complete
```

If the push fails, the honest report is **implemented locally, not complete** —
and the failure goes in the ledger. The validator reports an advisory finding when
a path's local head is not yet on its upstream branch.

---

# 3. Tests

## 3.1 CONCEPT — the smallest possible version

A **test** is code that runs your code and checks the answer:

```python
assert parse_duration("1h30m") == 5400
```

If it is true, nothing happens. If it is false, the program stops and says so.
That is the whole idea; everything else is organisation.

A **unit test** checks one small piece — one function, one behaviour, one edge
case — in isolation. A **test suite** is all of them run by one command. It either
passes completely (**green**) or reports which cases failed and why (**red**).

## 3.2 CONCEPT — the regression test

This is the most valuable kind and the easiest to justify.

Something breaks. You find the cause and fix it. Before moving on, you write a
test that **fails on the old code and passes on the new**.

Its job is not to check the fix — you can see the fix works. Its job is to make
sure that specific failure can never come back *silently*, including in two years,
when the person who reintroduces it has never heard of you. A defect costs you a
day once, and then never again. Read a mature project's regression tests and you
are reading its history of being wrong, which is more informative than its
documentation.

## 3.3 CONCEPT — writing the test first

**Test-driven development** inverts the order: write the failing test, then the
code that makes it pass, then clean up while the test holds the behaviour still.

```text
red       write a failing test that states what you want
green     write the simplest code that passes it
refactor  clean the code up, with the test holding behaviour still
```

The third step is the one people undersell. Restructuring code without tests is
frightening, so it does not get done, so the code calcifies. With a suite you can
take a module apart at 16:00 and know by 16:01 whether you broke anything.

> **That is what tests actually buy: not correctness, but the freedom to change
> things.**

## 3.4 CONCEPT — what tests do not prove

A green suite means *none of the things we thought to check are broken*. It does
not mean the software is correct, and no quantity of tests makes it mean that.
Tests are necessary, insufficient, and worth every minute. The discipline is
simple: **add one whenever you are surprised.**

## 3.5 IN CAIRN — documentation the tests can read

Cairn uses tests for something beyond code correctness: **keeping documents from
lying.**

The recurring failure in this repository, worse than any ordinary defect, is *a
published rule the implementation does not honour*. An operator guide once
prescribed a metadata format the parser rejects — an operator following the
published guide would have failed a blocking check on the very merge that guide
existed to close. A rule table once listed a check that did not exist in code.

Restating the rule more carefully does not fix this; restatement is what broke it.
Two mechanisms do:

- **The published template is parsed by the test suite.** The ceremony metadata
  template that ships in the standards page is read *by a test*, which asserts the
  live parser accepts it. A template that would not work fails the build. The
  documentation is executable.
- **The rule table is generated, and the shipped copy is compared to the
  generator.** [§11.1](#111-the-rule-catalogue) is produced from the validator's
  own source by `node tools/cairn-rules.mjs --write`, and a test compares what
  this document ships against what the generator produces on every CI run. This
  page cannot describe a rule that does not exist, and cannot go stale by
  someone forgetting to regenerate it.

---

# 4. Automation and gates

## 4.1 CONCEPT — continuous integration

**Continuous integration** is one idea: *every time anyone changes the code, a
machine that is not theirs checks out the change and runs the checks.*

There is no cleverness in it. All of its power is in "not theirs" and "every
time".

- **Not theirs**, because your machine has your environment, your half-installed
  packages, and the one file you never committed. A clean machine starting from
  the repository alone is the only honest answer to *does this work for anyone
  other than me*.
- **Every time**, because a check that runs when someone remembers is a check that
  does not run.

The commonest cause of a red run on healthy code is the environment: your machine
has a package version the project never pinned. That is not the automation being
fussy — it has just discovered the project is not reproducible, which was already
true. The answers, in increasing strength, are a dependency list, then a
**lockfile** pinning the exact version of everything, then a container image
holding the whole operating system.

## 4.2 CONCEPT — observe, or prevent

A **gate** is a check with the authority to stop something. A check that only
reports is not a gate, however loud it is. There are three states, and the
difference between the last two is where teams deceive themselves:

```text
the check does not run           nothing is enforced
the check runs and reports       OBSERVES  — a human may ignore it
the check runs and blocks        PREVENTS  — nobody may ignore it
```

Documentation claiming the third while the project is configured for the second is
worse than documentation claiming nothing, because people then rely on a guard
that is not there.

> **A check that never runs prints nothing — which is indistinguishable from a
> check that passes.**

This is not hypothetical. For a period, this repository's automation was
configured to run only on the trunk and on pull requests; every merge here has
been a local merge commit, so there had never been a pull request. Every rule
about branches had therefore **never once executed** in the place it existed to
enforce. The rules were real. The enforcement was not. Nothing said so.

## 4.3 CONCEPT — run the checks bare

Run the command and read its exit code. Do not pipe it into anything.

```bash
npm run typecheck && npm test && npm run build
```

A pipeline reports the status of its **last** command. On 2026-07-16 this project
shipped a broken build because a check was piped through `grep` and `head`, which
discarded the failing status. The program was broken and the gate said green.

## 4.4 IN CAIRN — two jobs, and three declared tiers

The automation runs **two separate jobs**, deliberately:

```text
gates    does the software still work?     typecheck · tests · build
cairn    was the protocol followed?        cairn-check
```

They are separate because they answer different questions and a team needs to see
which one failed. Both run bare.

Enforcement is stated as **three tiers**, and only the first is required:

| Tier | Name | What it is | What it can prevent |
| :-- | :-- | :-- | :-- |
| 0 | `local` | `npm run cairn-check` | nothing by force — but it needs no host, no account and no network, and carries nearly all the value |
| 1 | `ci` | `.github/workflows/cairn.yml` | nothing by force: **CI observes**. A red run is visible to everyone; a local merge still bypasses it |
| 2 | `protected` | a trunk ruleset on the host | **CI prevents.** A change failing the required checks cannot merge, including from a web interface |

**Tier 2 is a declared property of a repository, never a requirement of the
protocol.** A setup step performed once, invisibly, in a web interface will be
skipped by the next adopter — and the documentation would go on claiming a guard
that is not installed. That is the same defect as a published rule the
implementation does not honour, raised to the level of the whole protocol.

The honest claim must therefore be **generated, not written**: the configuration
declares the tier and the validator prints it in its header line. Until that
exists ([§11.2](#112-lexicon), marked aspirational), [§9](#9-declared-properties-of-this-repository)
states it in prose, which is exactly the drift risk the generated line removes.

---

# 5. Working in parallel

## 5.1 CONCEPT — the shared file is the dangerous one

Everything so far works for one person. Add a second — or an automated agent — and
a failure appears that no tool detects.

Two people editing different files never collide. Two people editing the same
summary table, the same index, the same "current status" page collide constantly,
and sometimes **invisibly**: Git merges both edits cleanly because they touched
different lines, and the result is a document that contradicts itself. Each edit
was correct. The pair is wrong. Nothing is syntactically broken, so nothing
complains.

There are only two real answers, and mature projects use both:

- **Make the shared file generated.** If a file is derived from other files by a
  script, nobody edits it by hand, so nobody collides on it — and it cannot
  disagree with its sources, because it *is* its sources.
- **Give each writer their own file.** A shared log everyone appends to collides on
  every line. The same log split into one file per entry never collides at all.

The second point carries a trap worth naming: that split is a **concurrency** fix,
not a size one. Recording the wrong reason produces the wrong rule later — someone
concludes that files must be kept small and starts summarising records that must
not be summarised.

## 5.2 IN CAIRN — nothing is shared, so nothing needs a gatekeeper

Removing the integrator was only possible because the files an integrator used to
own stopped being shared:

```text
ACTIVE.md              GENERATED from the path declarations on the trunk
register status        GENERATED from the same source
the root module note   an index over the per-area notes
the journal            ONE FILE PER ENTRY under project/log/
```

`project/log.md` is **frozen** as a historical archive and never appended to; new
entries land as `project/log/YYYY-MM-DD-<path-id>.md`.

Editing a generated file by hand is reported as an advisory finding: Git will
merge two such edits cleanly and nobody will have checked the resulting claim. It
is advisory rather than blocking because a deliberate edit is sometimes right —
the ledger then has to say why.

Every meaningful folder in `docs/` and `project/` carries both halves of a
pair: an `index.md` (a map, read before opening many files) and a `log.md` (recent
meaningful changes, read when recency matters). What remains genuinely
hand-written — architecture pages, decision records, per-area notes, each path's
own file — is per-file by construction, so two paths editing different ones never
meet.

## 5.3 CONCEPT — one checkout cannot read another's files

A script that builds an overview by reading files can only read the files in the
directory it is running in. This sounds too obvious to state until it produces a
failure that looks like a bug in the script.

If each unit of work declares itself in a file that is created *on its own
branch*, then the trunk cannot see it, and neither can any sibling branch. An
overview generated on the trunk will be **internally consistent and globally
false**: it will pass its own freshness check while describing a world that does
not exist.

## 5.4 IN CAIRN — registration precedes the branch

On 2026-08-20 exactly that happened here: the generated overview on the trunk
passed its freshness check while reporting that no work was in progress — at a
moment when four separate working directories each declared active work.

No amount of instruction can make one Git tree read files that exist only in
unrelated trees. The fix is an **ordering** rule:

> After the opening check, land a **metadata-only** commit on the trunk carrying
> the accepted declaration, the regenerated overview, and the opening-check note.
> **No implementation of any kind.** Only then create the branch and the worktree.

The invariant is *no implementation in a registration commit* — not a file count.
A count would be arbitrary: it would fail a legitimate registration that also
fixed a typo in the document it cites, while saying nothing about the thing that
actually breaks the ordering.

This tiny serialised transition is the price of a durable global view: every
machine and every automated run can now see the work before its branch diverges.

---

# 6. The protocol layer

## 6.1 CONCEPT — what the tools cannot answer

Version control records changes. Tests check behaviour. Automation runs the
checks. None of them answers:

```text
Is this work written down anywhere other than in the head of whoever did it?
Did anyone actually accept this before it started?
Is the documentation still true?
Is the reason for this decision recorded, or only its outcome?
```

A **protocol** is the agreed set of practices that answers those — plus, and this
is what makes it real rather than aspirational, **the subset a script can check.**

## 6.2 IN CAIRN — the coding path and its ledger

Nothing is implemented outside an accepted **coding path**: one file in
`project/coding-paths/CP-<ID>.md` carrying the identity tuple from
[§2.3](#23-in-cairn--the-identity-tuple-and-base_commit), a step list, a **work
ledger**, the next action, and any blockers.

```yaml
atomik:
  id: CP-MVP-010
  status: running
  base_commit: 70f7e27
  branch: path/cp-mvp-010
  writes:                    # ADVISORY — a signal, never a lock
    - apps/desktop/electron-main/graph-index.ts
    - docs/modules/atomik-desktop-graph.md
```

The **work ledger** is an append-only record of what each executed step actually
changed. It is written as the work happens, not reconstructed afterwards — the
parts most worth having are the parts that evaporate first: what did not work, why
that value and not another, the decision that was reversed.

`writes:` is a **signal, not a lock** — an overlap warning when the path opens and
a diff-versus-declaration check before it merges. A root cause is *discovered*,
not declared, so a path that must reach further records the widening in its ledger
and keeps going. Documentation surfaces must be declared too; those are the ones
that actually collide.

**The ledger has a size boundary.** A path file only grows, and when it costs more
to read than the entire required reading before it, it has stopped being a ledger
and become an archive. Completed steps roll into
`project/coding-paths/history/<id>-S0N.md`, one file per major step, and
**the move is verbatim** — cut and paste, never summarise. Summarising at rollup
time would quietly rewrite the record, which is the one thing a ledger may not do.
The finding is advisory and scoped to files already in the change, because a
repository-wide sweep would report the same historical files every run for months,
and a check that cries wolf is a check people switch off.

## 6.3 IN CAIRN — ceremonies

Two moments require a human and must leave a written artefact. Both are
**blocking**.

| Ceremony | When | Proves |
| :-- | :-- | :-- |
| **Opening check** | before the work is activated | the owner accepted this work, item by item |
| **Closing ceremony** | before the work merges | the owner accepts the result |

Each is a note in `project/sessions/` whose **root-level** metadata declares
it:

```md
---
title: CP-EXAMPLE-001 — closing ceremony
path: CP-EXAMPLE-001
ceremony: closing
---
```

Root level, siblings of `title:`, matched on the exact path id so a note about
`CP-MVP-0010` never closes `CP-MVP-001`. Neither key may carry an inline comment:
the metadata reader takes values verbatim to end of line, so
`ceremony: closing   # done` declares the value `closing   # done` and satisfies
nothing. The nested form is **rejected**, not accepted for compatibility —
accepting both would turn a schema into a preference.

**Why declared metadata and not a filename.** An earlier version of the check
looked for a file whose *name* contained the path id. But such a file exists from
the work's first hour, because the *opening* note carries the id too. The check
meant to prove the work had been **closed** was in fact proving it had been
**opened** — and it passed every time.

> A check can be running, and green, and testing the wrong proposition entirely.

## 6.4 CONCEPT — which rules may fail a build

Every rule is one of two kinds:

```text
BLOCKING   the build fails. Nothing lands until it is fixed.
ADVISORY   it prints, a human reads it, and the work continues.
```

The allocation is the single most important design decision in any protocol. A
rule earns the right to block only if it passes this test:

> **objectively checkable** AND breaking it leaves something **wrong in the
> repository** — not merely unconventional.

Undocumented code is wrong. A journal entry written by the person who did the work
rather than by a reviewer is unconventional. Only the first may fail a build. This
project had the journal rule blocking briefly and retracted it when it failed the
test.

The asymmetry underneath is the part to internalise:

> **A false blocking verdict costs far more than a missed one.**

A gate that stops legitimate work teaches people to route around it — and once
people have learned to bypass a safeguard, you have lost the safeguard *and* the
information it was producing. The first run of this validator reported 34 broken
links that were not broken: they were architecture pages *illustrating* a folder
layout inside code blocks. Had that stayed blocking, the validator would have been
switched off within a week and none of the real rules would exist today.

Judgement calls therefore live in the advisory tier permanently, by design and not
by concession.

## 6.5 CONCEPT — automating a judgement without letting it block

Some questions that matter are not checkable at all:

- Is this design still coherent with the architecture that was agreed?
- Is this paragraph of documentation still true?
- Was this the right thing to build?

Pretending otherwise produces a check that reports confidently about something it
cannot see. The alternative is to split the activity from its verdict: let
something non-deterministic produce the judgement, and let the deterministic gate
check only that the judgement *was produced*.

## 6.6 IN CAIRN — the coherence audit

Removing the integrator removed the person who noticed two lines of work drifting
apart architecturally. That noticing is delegated to an agent, without letting a
non-deterministic judgement block a merge:

```text
the AGENT produces the judgment     reads the rebased diff against the
                                    architecture, the decision records, and
                                    the path's declared coverage
CI checks only that it EXISTS       a deterministic gate on a
                                    non-deterministic activity
its verdict never blocks            findings are advisory, read by a human
```

`npm run cairn-audit` scaffolds the record; the agent fills it in. One file per
audit under `project/audits/`, named `<path-id>-<commit>.md`, so two paths
auditing at once never conflict.

A record satisfies the check when it names **HEAD or any commit this path itself
contributed**. A record naming an arbitrary trunk ancestor proves nothing about
this branch, and one belonging to a different path is refused by name. **Filled**
means the record names an outcome from the stated vocabulary and answers at least
one of its own questions — never a judgement about the answers, which is exactly
what the split exists to keep out of a gate.

## 6.7 IN CAIRN — the failure mode that governs everything

Stated once, because every mechanism above is a defence against it:

> **A published rule the implementation does not honour.**

The defences generalise to any documentation anyone writes:

1. **Generate what can be generated**, and test the shipped copy against the
   generator.
2. **Make the documentation executable** — if a template is published, let a test
   parse it.
3. **Date every page and name what it renders.** A page in this repository taught
   a rejected model for ten days, unnoticed, because nothing on it claimed a
   vintage. Every rendered page now carries a dated banner. That repairs the
   class, not just the instance.

---

# 7. The path lifecycle

## 7.1 IN CAIRN — the states, and the two ways out

```text
draft ──────► running ──────► done ──────► archived     the ordinary life
                │  ▲                          ▲
                │  └── blocked ──┘            │
                └─────────────────────────────┘
                     abandonment
```

| Status | Means | Requires |
| :-- | :-- | :-- |
| `draft` | proposed, not accepted | `id`, `status` |
| `running` | accepted, registered on the trunk, executing in its own worktree | `id`, `status`, `branch`, `base_commit`, an opening-check note |
| `blocked` | execution halted; no branch obligations while blocked | `id`, `status` |
| `done` | accepted, rebased, audited and **merged**. A completion, not an end | `id`, `status`, a closing-ceremony note |
| `archived` | off the running portfolio, retained as history. **The single terminal state** | `id`, `status` |

- `done → archived` is **demotion, never deletion**.
- `running → archived` is **abandonment**. An abandoned path never passes through
  `done`, because `done` asserts a merge that did not happen. No fifth status word
  was added: `archived` already means *superseded, retired, or preserved as
  historical record*, and a fifth word would have to be special-cased by every
  consumer into behaving exactly like it.
- Archiving does not side-step the closing ceremony. That gate keys on `done`,
  which is the claim that a merge happened; archiving claims the opposite. It is a
  different destination, not a cheaper route to the same one.

**A path that goes quiet is noticed, not punished.** A `running` path whose branch
has had no commit for longer than the declared window is reported with both ways
out — push the work, or archive it. Advisory permanently: a parked path is not a
wrong path, and a build that failed for one would teach people to lie about status
rather than to archive. A branch the checkout cannot resolve reports **nothing**;
unknown must never read as stale, for the same reason it must never read as fresh.

## 7.2 CONCEPT — a gate sees one commit, never a transition

This is the honest limit, and it is stated so that no later document can claim
more.

A validator run sees **one commit**. It reads the status a file declares *now*. It
has never seen a transition, and a rule that guessed at one would be wrong the
first time a file was created already complete.

So the state machine above is **doctrine for the people and agents executing it**,
and what is enforced is the set of **per-state invariants** in the table — each a
fact about one file, checkable in one commit.

> **Cairn does not enforce the lifecycle, and no document may say it does.**

---

# 8. Operator guide

For someone who has not used Cairn before. Every command runs locally; nothing
here requires an account.

### Step 1 — Open the path

1. Run the **opening check** with the owner, item by item. Record it as a session
   note in `project/sessions/` with root-level `path:` and
   `ceremony: opening`. Activation needs explicit acceptance — this is blocking.
2. From a clean, current trunk, write `project/coding-paths/CP-<ID>.md`.
   `base_commit` is the trunk tip **immediately before** this registration.
3. Regenerate the derived view and check:

```bash
npm run cairn-active
npm run cairn-check
```

4. Commit **metadata only** — declaration, regenerated view, opening-check note —
   and push it to the trunk. No implementation.

### Step 2 — Create the worktree

```bash
git worktree add ../repo-cp-<id> -b path/cp-<id> master
cd ../repo-cp-<id>
```

Install or link dependencies as the project requires, and give any running
application its own profile so two instances never share one.

### Step 3 — Execute one step at a time

Each step changes code, tests, docs, the ledger and the handoff brief **in the
same work unit**. Then:

```bash
npm run cairn-check
npm run typecheck && npm test && npm run build   # if the step touched product code
git commit
git push origin path/cp-<id>                     # immediately — the step is not done until this lands
```

Refresh `project/briefs/<path-id>-handoff.md` from the ledger in that same
commit. Every completed, pushed step is a safe boundary between working sessions:
a new session in the same worktree reads `AGENTS.md` → `paths.md` → the running
view → the path ledger → the brief, verifies reality against Git, and continues
with no re-briefing.

### Step 4 — Close and merge

```text
1  CLOSING CEREMONY — recorded as a session note (path: + ceremony: closing)
2  REBASE on the trunk — enforced, not remembered
3  CHECKS GREEN on the rebased result, never on a stale branch
4  COHERENCE AUDIT — npm run cairn-audit, then fill it in
5  the path sets its own status: done, and merges itself
6  the pushed merge is verified on the remote trunk
```

### Step 5 — Clean up the worktree

Only after the merge commit is pushed and verified on the remote trunk, and run
from **another checkout** — never from the target, never the owner's main working
directory:

```bash
git fetch origin master
git merge-base --is-ancestor <merge-commit> origin/master
git worktree list --porcelain
git -C <exact-secondary-worktree> status --porcelain=v1   # must print nothing
git worktree remove <exact-secondary-worktree>            # never --force
git worktree list --porcelain
test ! -e <exact-secondary-worktree>
```

The branch is durable history; the worktree is a disposable working copy.
**Removing a worktree never deletes the branch**, and the retained branch is what
preserves the per-step online history.

If remote verification, cleanliness, removal or the final absence check fails,
report **merge complete; cleanup incomplete** and leave the directory intact for
inspection. This transition is machine-local: it cannot honestly be enforced by
repository automation after the checkout disappears, so it is an absolute
operating rule and a required closure report rather than a blocking rule.

---

# 9. Declared properties of this repository

Stated as properties rather than omitted, because a document that hides its own
configuration is committing the defect it warns about.

- **Plane and source bindings.** The execution-state plane root is
  `atomik-project/`; the knowledge plane root is `docs/`; the guarded source roots
  are `apps/`, `packages/`, `shared/`; the frontmatter namespace key is `atomik:`.
  All four are **hardcoded in the validator**, not configuration — see
  [§11.2](#112-lexicon).
- **Enforcement tier: 1 (`ci`).** CI observes. No trunk ruleset is installed, and
  the tier-2 payload in [§12](#12-appendix--the-optional-tier-2-ruleset) is
  deliberately not applied.
- **Every merge in this repository's history is a local merge commit.** There have
  been zero pull requests. The automation triggers on pushes to `master` and
  `path/**` for exactly that reason; on pull requests alone it would never have
  fired.
- **A finite migration set exists and is named in code.** Two paths predate trunk
  registration and the declared ceremony schema. They receive advisory findings
  telling them how to clear the exception, and **the set drains when they merge**.
  No new path may copy it, and the constants are deleted when they empty.
- **`active` has been retired** from the status vocabulary. It was accepted by one
  rule and rejected by another, so a path declaring it failed with a message about
  a different problem. No path file declared it.
- **The architecture pages state the doctrine; `paths.md` carries the operating
  detail** and may change without amending an architecture page. If they disagree,
  that is a defect to report — a rule this repository has invoked against itself
  twice.

---

# 10. Known limits

Two holes remain open, recorded rather than papered over.

1. **`base_commit` accuracy is unchecked.** Its presence is verified; its truth is
   not. Partly mitigated by the rebase gate, which compares the branch against the
   trunk directly rather than trusting the recorded base.
2. **Checkpoint accuracy is unchecked.** The validator verifies that a path file
   *changed* when source changed; it cannot tell whether the prose inside it is
   still true. Found the honest way: one path's checkpoint still described its
   first step in vocabulary that had been removed five steps earlier. *"Is this
   prose still accurate?"* is not a checkable question.

Closed since the model was ratified: running-path visibility ([§5.4](#54-in-cairn--registration-precedes-the-branch),
2026-08-20) and the abandoned-path transition together with staleness detection
([§7.1](#71-in-cairn--the-states-and-the-two-ways-out), 2026-08-25).

> A protocol that names its own blind spots is one you can trust about everything
> else.

---

# 11. Reference

Two commands, run locally exactly as the automation runs them:

```bash
npm run cairn-check                            # the working tree
npm run cairn-check -- --base origin/master    # a branch, as CI sees it
npm run cairn-check:test                       # the validator's own tests
```

**Blocking** findings exit non-zero. **Advisory** findings print and never fail the
build.

## 11.1 The rule catalogue

**Generated** from `tools/cairn-check.mjs` by
[`tools/cairn-rules.mjs`](../../tools/cairn-rules.mjs) and guarded by
[`tools/cairn-rules.test.mjs`](../../tools/cairn-rules.test.mjs). Regenerate with:

```bash
node tools/cairn-rules.mjs --write
```

The shipped table is compared against the generator by a test on every CI run, so
this section cannot describe a rule that does not exist and cannot go stale
because someone forgot to regenerate it.

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
| **Blocking** | `registration` | diff | Path declaration tuple (id, running, branch, base) missing from trunk | `pathRegistrationState() === 'missing' (blocking) or 'grandfathered' (advisory)` |
| **Blocking** | `same-work-unit` | diff | Source changed without accompanying module note and coding path update | `touched('apps/') => touched('docs/modules/') && touched(PATH_DIR)` |
| **Blocking** | `schema` | corpus | Path or ADR frontmatter fails parsing, or an id/status/date is outside vocabulary | `pathFrontmatterErrors(front) + adrFrontmatterErrors(front, file, bodyStatus)` |
| *Advisory* | `area-note` | diff | Subsystem source changed without touching matching area module note | `areaOf(file) => changed.includes(note)` |
| *Advisory* | `branch-identity` | diff | Detached checkout where branch cannot be identified from host or git ref | `branchSource === 'detached' (blocking on guarded roots, advisory on others)` |
| *Advisory* | `coherence-audit` | corpus | Path rebased HEAD lacks filled coherence audit record in atomik-project/audits/ | `tools/cairn-audit.mjs --check` |
| *Advisory* | `decision-drift` | diff | docs/bedrock changed without an ADR in the same changeset | `touched('docs/bedrock/') => touched('docs/adr/')` |
| *Advisory* | `ledger-size` | diff | A path file in the diff exceeds the ledger token budget | `changed.includes(path.file) && path.tokens > LEDGER_TOKEN_BUDGET` |
| *Advisory* | `opening-ceremony` | diff | Path declared running without an opening-check session note | `!openingFor(pathId) via session frontmatter { path, ceremony: 'opening' }` |
| *Advisory* | `path-staleness` | corpus | A path declaring running whose branch has had no commit for longer than the declared window | `staleRunningPaths(corpus, branchAges(corpus)) — advisory always; an unresolvable branch reports nothing` |
| *Advisory* | `registration` | diff | Path declaration tuple (id, running, branch, base) missing from trunk | `pathRegistrationState() === 'missing' (blocking) or 'grandfathered' (advisory)` |
| *Advisory* | `remote-checkpoint` | diff | Local path HEAD not present on upstream tracking branch | `pathRemoteCheckpoint(branch).state === 'missing' \| 'unpushed'` |
| *Advisory* | `scope-drift` | diff | Changed files outside path frontmatter declared writes: patterns | `!matchesAny(file, declaredWrites)` |
| *Advisory* | `single-truth` | diff | Manual edits to shared/derived statements of record | `SINGLE_TRUTH.includes(file)` |
<!-- cairn:rules:end -->

The rule messages above name this repository's **bindings** — `atomik-project/`,
`apps/` — because the validator has them compiled in. That is the honest output of
a generated table, and it is the clearest possible statement of what S08 has left
to do: until those become configuration, Cairn is this repository's protocol that
*could* be portable, not a portable protocol.

## 11.2 Lexicon

One line each. Three markers appear:

```text
Enforced by       a file in this repository makes this true, mechanically
General practice  standard vocabulary; nothing here enforces it
ASPIRATIONAL      the term is used and NOTHING enforces it yet
```

The third marker is the point of the exercise. A vocabulary that hides which of
its words are backed by code is how a protocol comes to describe a system that
does not exist.

### General practice

| Term | Meaning |
| :-- | :-- |
| **Commit** | A saved snapshot of the whole project, with a message and a link to what came before. Its id is a hash over its content, metadata and parent, so it fingerprints the entire history behind it. |
| **Branch** | A name for a line of work — a movable pointer to one commit. |
| **Trunk** | The shared mainline branch everyone agrees is current; `master` here. |
| **HEAD** | Where you are standing. **Detached HEAD** is standing on a commit with no branch attached. |
| **Merge** | Bringing one branch's work into another; records a commit with two parents. |
| **Conflict** | Git refusing to guess when two sides changed the same lines. A feature. |
| **Rebase** | Replaying your commits as if you had started later. New ids, so it is safe on private work and disruptive on shared work. |
| **`--force-with-lease`** | Overwrite the remote branch only if nobody else moved it. The safe form of a force push. |
| **Remote** | The shared copy elsewhere. Committing is not backing up; only a push is. |
| **Worktree** | A second checkout of the same repository, in another directory, on another branch. |
| **Continuous integration** | A machine that is not yours runs the checks on every change. |
| **Gate** | A check with the authority to stop something. A check that only reports is not a gate. |
| **Green / red** | Everything passed / something failed. |
| **Bare** | Run the command and read its exit code; do not pipe it anywhere. |
| **Unit test** | Code that runs one small piece of code and asserts the answer. |
| **Regression test** | A test written when something breaks, so that failure cannot return silently. |
| **Test-driven development** | Write the failing test first: red, green, refactor. |
| **Lockfile** | The exact versions, not just the names, so a clean machine reproduces yours. |

### Cairn vocabulary

| Term | Meaning | Enforcement |
| :-- | :-- | :-- |
| **Coding path** | One bounded piece of work, declared in a file before it starts. Nothing is implemented outside one. | `branch-path`, `registration`, `schema` — **blocking** |
| **Plane** | Which kind of thing a file is: knowledge, execution state, or the conversation that evaporates. | doctrine |
| **Identity tuple** | `id` · `status` · `branch` · `base_commit` — the small global registration projection. | `schema` — **blocking** |
| **Work ledger** | The append-only record of what each step actually changed, written as the work happens. | `same-work-unit` — **blocking** |
| **Checkpoint** | The path's own statement of where it stands. Presence checked; truth not. | partial — [§10](#10-known-limits) |
| **Handoff brief** | A disposable summary so the next session need not be re-briefed. Never primary memory. | convention |
| **Step** | One executed unit: code, tests, docs, ledger and brief together, then commit and push. | `same-work-unit` · `remote-checkpoint` |
| **Session boundary** | Every completed, pushed step — a safe place to end a working session. | convention |
| **Opening check** | The owner accepting the work before it starts. | `opening-ceremony` — **blocking** |
| **Closing ceremony** | The owner accepting the result before it merges. | `ceremony` — **blocking** |
| **Registration commit** | Putting the path on the trunk before its branch exists. Metadata only. | `registration` — **blocking** |
| **`writes:`** | What this path expects to touch — a signal, never a lock. | `scope-drift` — advisory |
| **Widening** | Recording in the ledger that the work reached further than declared, and continuing. | convention |
| **Rebase gate** | A branch must contain the current trunk tip before it merges. | `rebase` — **blocking** |
| **Self-merge** | Every path merges itself. No integrator, no parent, no gatekeeper. | doctrine |
| **Coherence audit** | An agent reads the change against the accepted architecture before it merges. | `coherence-audit` — advisory |
| **Filled** | A record that names an outcome from the vocabulary and answers at least one of its own questions. | `fillErrors()` |
| **Derived view** | A file generated from other files, so nobody edits it and nobody collides on it. | `derived-view` — **blocking on the trunk** |
| **Statement of record** | A shared or generated file a hand edit would quietly falsify. | `single-truth` — advisory |
| **Journal** | One file per entry under `project/log/`. `log.md` is frozen. | convention |
| **OKF pair** | Every meaningful folder carries an `index.md` and a `log.md`. | `links` — **blocking** |
| **Blocking** | The build fails; nothing lands until it is fixed. | exit code |
| **Advisory** | It prints, a human reads it, the work continues. Where every judgement call lives. | exit code |
| **Admission test** | Objectively checkable, and breaking it leaves something wrong in the repository. | [§6.4](#64-concept--which-rules-may-fail-a-build) |
| **Ledger boundary** | A path file over budget rolls completed steps into `history/`, **verbatim**. | `ledger-size` — advisory |
| **Path staleness** | A running path whose branch has gone quiet past the declared window. | `path-staleness` — advisory |
| **Grandfather set** | A finite, named list of paths exempt from a rule that postdates them. It drains. | named constants |
| **Enforcement tier** | `local` · `ci` (observes) · `protected` (prevents). A property of a repository. | see below |

### Terms with nothing behind them yet

| Term | Meaning | Status |
| :-- | :-- | :-- |
| **`cairn.config.json`** | Plane roots, source roots, area map, trunk name, the frontmatter namespace key, and the declared enforcement tier. | **ASPIRATIONAL** — every one of these is hardcoded in the validator today. This is what stands between Cairn and being portable at all. |
| **Generated enforcement header** | `cairn-check` printing the declared tier, so no document can claim prevention that is not installed. | **ASPIRATIONAL** — depends on the config file. |
| **`cairn-new`** | Registration commit and worktree in one command, so the precondition stops depending on memory. | **ASPIRATIONAL** |
| **`cairn-init`** | Scaffold a new repository at tiers 0 and 1: validator, config, docs skeleton, workflow file. | **ASPIRATIONAL** |

---

# 12. Appendix — the optional tier-2 ruleset

**Skippable.** Everything above works without it, and this repository has not
applied it. Adopt it only when several writers share a trunk and you want the
automation to *prevent* rather than *observe*.

One command, no click-path — substitute your own owner and repository:

```bash
gh api -X POST repos/OWNER/REPO/rulesets --input - <<'JSON'
{
  "name": "cairn-trunk",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/master"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "gates (typecheck · tests · build)" },
          { "context": "cairn-check (protocol)" }
        ]
      }
    }
  ]
}
JSON
```

`strict_required_status_checks_policy` is the host's name for the rebase gate: it
requires the branch to be up to date with the trunk before merging, so the rule
holds even for someone merging from a web interface.

If you apply it, change the declared tier to `protected`, so what the validator
prints keeps telling the truth.

---

## See also

- [`handbook.html`](./handbook.html) — this document, rendered.
- [`anatomy.md`](./anatomy.md) — the same material read **downward**: each Cairn
  construct reduced to the primitive it manipulates and the predicate it evaluates,
  organised by primitive rather than by feature. Ends with the whole protocol in one
  table, the primitives Cairn refuses, and the seams a port has to cut.
- [`index.html`](./index.html) — a short visual overview of the protocol.
- [`paths.md`](../../atomik-project/coding-paths/paths.md) — the operating detail,
  which may change without amending an architecture page.
- [`AGENTS.md`](../../AGENTS.md) — the entry point an agent or a new contributor
  reads first.
