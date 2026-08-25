---
type: Atomik Primer
title: Foundations — production software practice, from zero, for people who already do rigorous work
description: A from-scratch primer on version control, tests, continuous integration and working protocols, written for scientists and analysts who write real code but have never worked inside a production engineering setup. It builds the vocabulary the Cairn specification uses, and explains why each mechanism exists.
tags: [cairn, primer, pedagogy, git, testing, ci, protocol, onboarding]
timestamp: 2026-08-25T00:00:00Z
---

# Foundations

> **Current as of 2026-08-25.** This is the conceptual primer for
> [`specification.md`](./specification.md) and [`lexicon.md`](./lexicon.md). It
> teaches the general practice first and the Cairn protocol second, so the
> specification can stay short. Where this page and the specification disagree
> about Cairn, the specification wins and the disagreement is a defect to report.
>
> **[`foundations.html`](./foundations.html) renders this page** with a glossary
> appendix — that is the version to send to someone outside the repository. This
> Markdown is the source of truth and the thing CI checks.

## Who this is for

You write code that does real work. You have trained models, run analyses,
produced figures that went into something that was reviewed. You know what it
costs to be wrong, and you have a whole apparatus for not being wrong: controls,
held-out data, preregistration, replication, review.

What you may not have is the *other* apparatus — the one software engineering
built for the same purpose, with different words. Version control, test suites,
continuous integration, branching workflows, code review, release processes.
From the outside this looks like a wall of jargon and ceremony, and the first
encounter is often stressful: everything is unfamiliar, everything seems to be
enforced by something that says no, and none of it appears to be about the
problem you actually have.

This document is written on the opposite premise. **Almost every mechanism here
is something you already believe in, implemented in a different medium.** A test
suite is a set of positive controls. Continuous integration is instrument QC that
runs before every batch. Test-driven development is preregistration. Version
control is a lab notebook that cannot be backdated. A protocol on top of those
tools is a methods section that writes itself as you go.

None of it is there to slow you down. All of it exists so that you can move
faster without being afraid — the same way a held-out test set lets you tune
aggressively without fooling yourself. That is the whole emotional content of
production engineering, and it is worth saying out loud, because the tooling
rarely says it.

It starts at zero. If you already know what a commit is, skip to
[Part 3](#part-3--tests-the-controls-you-run-on-your-own-code).

---

## Part 1 — The shape of the problem

Here is a situation you have been in.

In May, an analysis worked. There is a figure from it, and the figure is right.
It is November, and someone asks you to run it again on the new cohort. You open
the folder. There are four scripts with similar names, two of which end in
`_final`. There is a notebook whose cells were run out of order, so the variable
that produced the figure no longer exists in any order you can reconstruct. The
package that did the tokenisation has moved to version 4 and changed a default.
You can probably rebuild it. It will take two days, and at the end you will not
be certain it is the same analysis.

**Nothing about this was an intelligence failure.** It is a process failure, and
it is the same one the reproducibility crisis is about. Software engineering had
its own version of this — repeatedly, expensively, sometimes with people's money
or safety attached — and it answered with a small set of mechanisms that are now
so standard they are invisible to the people using them.

The mechanisms answer four questions:

```text
What exactly was the state of everything when this worked?   version control
How do I know it still does what it did?                     tests
Who checks that, and when?                                   continuous integration
How do several people do this at once without collisions?    a working protocol
```

Each of the four parts below takes one question. None of them requires you to
change what you are researching. They are about the *substrate* the research sits
on.

---

## Part 2 — Version control, from zero

### 2.1 The problem it solves

You have solved this problem already, badly, and so has everyone else:

```text
analysis.py
analysis_v2.py
analysis_v2_fixed.py
analysis_final.py
analysis_final_REALLY.py
analysis_final_REALLY_ok_this_one.py
```

This is a version control system. It is a bad one. It cannot tell you what
changed between two of those files, why, when, or by whom; it cannot recover the
state of the *whole project* at the moment `analysis_v2_fixed.py` was correct,
because the data-loading module changed too and was overwritten in place.

**Version control** is that idea, done properly, for a whole directory at once.
The dominant one is **Git**, and everything below is Git.

### 2.2 A commit

A **commit** is a complete snapshot of every tracked file in your project at one
moment, plus who made it, when, a message saying what it is, and a pointer to the
commit it came from.

Two things about that definition surprise people:

- **It is a snapshot, not a change.** Git stores the whole state. It *shows* you
  changes by comparing two snapshots, which is why it can show a change between
  any two points in history, however far apart. (Internally it compresses
  aggressively, but that is a storage detail, not a model detail.)
- **It has a name you do not choose.** Every commit gets an identifier like
  `b4ef361` — a cryptographic hash computed from its content, its metadata, *and
  the identifier of its parent*. That last part matters: because the parent's id
  is part of what is hashed, and the parent's id includes *its* parent, a
  commit's id is a fingerprint of the entire history leading to it. You cannot
  quietly alter an old commit and leave the later ones looking untouched. The
  ids all change, visibly.

That property is the whole reason Git is trusted as a record. Compare it to a lab
notebook: the value of a bound, page-numbered, ink notebook is not that it is
convenient, it is that **you cannot go back and make yesterday say something
else**. Git gives you the same guarantee, with search and diffing on top.

A commit message is not decoration. It is the only place where the *reason* for a
change lives. The code shows what; the message is the only record of why.

### 2.3 History is a graph

Because every commit points at its parent, history is a chain:

```text
a1b2c3 ──► d4e5f6 ──► 7a8b9c ──► b4ef361
 "load"     "clean"    "model"    "figure"
```

Read it right to left and you have "the state of everything, at each step". You
can check out any of those points and get the project exactly as it was — all
files, consistently, not one file at a time.

Commits can also have *two* parents, which is how two lines of work rejoin. So
history is not a line but a **directed acyclic graph**: it flows one way and never
loops. That sounds abstract until you see branches, which is the next piece.

### 2.4 Branches

A **branch** is a name pointing at one commit. That is genuinely all it is. When
you commit, the name moves forward to the new commit.

The reason it matters is that you can have several, and they can diverge:

```text
                    ┌──► f1a2b3 ──► c4d5e6      branch: try-focal-loss
a1b2c3 ──► d4e5f6 ──┤
                    └──► 9z8y7x                 branch: main
```

This is a **parallel experimental arm**. You would never test an intervention by
overwriting the control group's data and hoping you could reverse it; you run
both, keep both, and compare. A branch is the same discipline applied to code. The
work on `try-focal-loss` cannot damage `main`, and if the idea fails you delete
the branch and nothing was lost — including the record that you tried, which is
itself worth keeping.

One branch is conventionally the shared, agreed, current one. It is called
**`main`**, **`master`**, or **the trunk**. It is the equivalent of "the version
of the manuscript we all agree is the manuscript".

**`HEAD`** is Git's word for "where you are right now". Usually it points at a
branch. It can also point straight at a commit with no branch attached, which is
called a **detached HEAD** — a legitimate state for looking around in, and a
dangerous one to work in, because commits you make there have no name and are easy
to lose. It matters later: an automated check that cannot tell which branch it is
looking at is a check that cannot enforce anything about branches, and that was a
real failure in this repository's own tooling.

### 2.5 Merging, and why conflicts are good news

**Merging** brings one branch's work into another. Git compares both sides against
the point where they diverged, and if the two sides changed different things, it
combines them automatically and records a commit with two parents.

If both sides changed the *same lines*, Git stops and reports a **conflict**. It
marks the file and refuses to proceed until a human decides.

New users experience this as Git being difficult. It is the opposite. Consider the
alternative: two people edit the same paragraph of a manuscript in two copies of a
Word file, and someone merges them by hand at 11pm. The failure mode there is not
an error message — it is a paragraph that reads fine and says something neither
author meant. **Git refuses to guess.** A conflict is Git telling you, at the only
moment when it is cheap to fix, that two intentions collided.

There is a second way to combine work, **rebase**, which instead *replays* your
commits on top of the other branch as if you had started from there. It produces a
straight, readable history rather than a braided one. The cost is that replayed
commits are new commits with new ids — the old ones are not those commits any
more. That is fine for work that only exists on your own branch and disruptive for
work other people have already built on, which is the origin of the rule "do not
rebase shared history".

### 2.6 Remote, and what "done" means

So far everything is on your machine. A **remote** is a copy of the repository
somewhere else — usually a hosting service such as GitHub — that several people
can reach. `origin` is the conventional name for the main one.

- **push** — send your commits to the remote.
- **pull / fetch** — bring the remote's commits to you.
- **clone** — make a local copy of a remote repository, with its whole history.

The distinction that costs people work: **committing is not backing up.** A commit
lives in the `.git` directory inside your project folder. If the laptop dies, the
commit dies with it. Only a push puts it somewhere else. This is why disciplined
teams treat *commit-and-push* as one action and consider a piece of work
unfinished until it is on the remote. Cairn makes that an explicit rule, for
exactly this reason.

The remote is also where other people see your work — so pushing is both a backup
and a form of publication. Those are different things, and it is worth being
deliberate about the second.

### 2.7 What version control does not give you

It records what you did. It does not tell you whether what you did is correct,
whether it still works, or whether it still means what the comment above it says
it means. For that you need the next two parts.

---

## Part 3 — Tests: the controls you run on your own code

### 3.1 The smallest version

A **test** is code that runs your code and checks the answer. The smallest
possible one is an assertion:

```python
assert normalise_dose("5 mg") == 5.0
```

If that is true, nothing happens. If it is false, the program stops and says so.
That is the entire idea. Everything else is organisation.

### 3.2 Unit tests, suites, and "green"

A **unit test** checks one small piece — one function, one behaviour, one edge
case — in isolation. A **test suite** is all of them together, run by one command:

```bash
npm test          # this project
pytest            # a Python project
```

The suite either passes completely or reports which cases failed and why. Passing
is called **green**; failing is **red**. That vocabulary shows up everywhere.

The bridge to your world is direct: **a unit test is a positive control.** You do
not run an assay and trust the result because the protocol was followed; you run a
sample you know the answer for, and if that comes out wrong you throw the batch
out. A test suite is a rack of positive controls that runs in eight seconds, every
time, at no cost.

There are other kinds — **integration tests** check that several pieces work
together, **end-to-end tests** drive the whole system the way a user would — and
the distinction is mostly about how much you have to set up to run one. The
principle does not change.

### 3.3 The regression test: a scar that becomes a guardrail

This is the most valuable kind and the easiest to explain.

Something breaks. You find the cause, you fix it. Before you move on, you write a
test that fails on the old code and passes on the new. That test is a
**regression test**, and its job is not to check the fix — you can see the fix
works. Its job is to make sure **this specific failure can never come back
silently**, including in two years, when the person who reintroduces it has never
heard of you.

Every mature codebase is partly a museum of these. Read them and you are reading
the project's history of being wrong, which is far more informative than its
documentation. It is also the cheapest institutional memory that exists: a bug
costs you a day once, and then never again.

### 3.4 Test-driven development is preregistration

**Test-driven development** (TDD) inverts the order: write the test first, watch
it fail, then write the code that makes it pass.

Stated coldly it sounds like ritual. Stated in your vocabulary it is obvious:
**you are preregistering the analysis.** You write down the criterion for success
*before* you have the thing that has to satisfy it, so that you cannot
unconsciously move the goalposts to wherever you happen to land. Everyone who has
ever written a test after the fact knows the quiet temptation to write the test
that the existing code passes.

The loop has a name — **red, green, refactor**:

```text
red       write a failing test that states what you want
green     write the simplest code that passes it
refactor  clean the code up, with the test holding the behaviour still
```

The third step is the one people undersell. Restructuring code without tests is
frightening, so it does not get done, so the code calcifies. With a suite, you can
rip a module apart at 4pm and know by 4:01 whether you broke anything. **That is
what tests actually buy: not correctness, but the freedom to change things.**

### 3.5 What tests do not prove

A passing suite means "none of the things we thought to check are broken". It does
not mean the software is correct, and no amount of testing makes it mean that. You
know this shape of argument already — a study can be perfectly executed and still
be measuring the wrong thing.

So tests are necessary, insufficient, and worth every minute. The discipline is to
add one whenever you are surprised.

---

## Part 4 — Continuous integration: someone else runs the checks

### 4.1 What it actually is

**Continuous integration** (CI) is one idea: *every time anyone changes the code,
a machine that is not theirs checks out the change and runs the checks.*

That is it. There is no cleverness in it. Its power is entirely in "not theirs"
and "every time".

- **Not theirs**, because your machine has your environment, your half-installed
  packages, your one file that never got committed. A clean machine that starts
  from the repository alone is the only honest test of "does this work for
  anyone other than me".
- **Every time**, because a check that runs when someone remembers is a check that
  does not run.

The equivalent in your world is instrument QC that runs before every batch,
automatically, whether or not the operator is worried. Not because operators are
careless — because *reliability is a property of the process, not of anyone's
attention*.

Concretely, in this repository, CI is a file
([`.github/workflows/cairn.yml`](../../.github/workflows/cairn.yml)) that says: on
every push, start a fresh Linux machine, install the dependencies, and run these
commands. GitHub provides the machine. The commands are the same ones a developer
runs locally, which is deliberate and matters: if CI runs something you cannot
reproduce on your laptop, the failures become oracles rather than information.

### 4.2 "It works on my machine"

The most common cause of a red CI run on healthy code is the environment. Your
laptop has a package version the repository never pinned; CI does not, so it
fails. This is not CI being fussy — it has just discovered that the project is not
actually reproducible, which was true before anyone noticed.

The answers, in increasing strength:

```text
a dependency list      "these packages"                requirements.txt, package.json
a lockfile             "these packages, these exact versions, this whole tree"
                                                       package-lock.json, poetry.lock, renv.lock
a container            "this entire operating system image"   Docker
```

You have met the same ladder as `sessionInfo()`, then `renv`, then a Singularity
image on the cluster. Same problem, same order, same trade-off between effort and
guarantee.

### 4.3 The gate, and what green means

A **gate** is a check with authority: something that can stop the change from
proceeding. A CI run is a gate when the project is configured so that a red run
blocks the merge, and merely a *report* when it is not.

That distinction is more important than it sounds, and it is where a lot of
teams quietly deceive themselves. Three levels:

```text
the check does not run at all              nothing is enforced
the check runs and reports                 CI OBSERVES  — a human may ignore it
the check runs and blocks the merge        CI PREVENTS  — nobody may ignore it
```

Documentation that claims the third while the project is configured for the second
is worse than documentation that claims nothing, because people then rely on a
guard that is not there. This repository hit exactly that: for a period, its CI
was configured never to run on the branches the rules were about, so the protocol
check had never once executed in the place it was meant to enforce. The rules were
real, the enforcement was not, and no output said so — a check that never runs
prints nothing, which is indistinguishable from a check that passes.

**The lesson generalises far beyond software: a control you never verify is
running is not a control.**

### 4.4 The second D

**CD** stands for continuous delivery or continuous deployment, and it is the
other half of the phrase "CI/CD". Once the checks pass, the software is
automatically packaged and — depending on the team's appetite — released.

For a web service that means "this change is live for users, minutes after it was
written". For a desktop application like this one it means a build is produced and
signed. For an analysis pipeline it might mean the report regenerates. The
research analogue is going from a pilot cohort to routine clinical use: the
interesting question is never the mechanics of the release, it is what you are
willing to have happen automatically, and that is a judgement about risk.

You can adopt CI without CD, and most people should start there.

### 4.5 Why the checks are run bare

One last piece of hygiene, because it is a real scar in this project. Checks in CI
are run **bare** — the command runs, and its exit code is the verdict:

```bash
npm run typecheck && npm test && npm run build
```

Not piped into anything that reformats or filters the output. On 2026-07-16 this
project shipped a broken build because a check was piped through `grep` and `head`
in a way that discarded the failing status: the pipeline reported success because
the *last* command in the pipe succeeded. The program was broken and the gate said
green.

That is a specific, mechanical trap, and it belongs in a primer because it is
exactly the kind of thing nobody tells you and everybody hits once.

---

## Part 5 — More than one person

Everything so far works for one person alone. Add a second, or an automated agent,
and new failure modes appear that no tool detects by itself.

**Code review** is the practice of a second person reading a change before it
lands. It is peer review with a much shorter loop, no anonymity, and a much
narrower question: not "is this a contribution to the field" but "will this do
what it says, and will the next person understand it". A **pull request** (PR) is
the mechanism most hosts provide for this — a proposed change, with a discussion
attached, which can be accepted or not.

The genuinely hard part of working in parallel is not review. It is **shared
files**. Two people editing different functions in different files never collide.
Two people editing the same summary table, the same index, the same "current
status" document collide constantly — and worse, they sometimes collide
*invisibly*, where Git merges both edits cleanly and the result is a document that
contradicts itself. Each edit was right; the pair is wrong. No tool catches this,
because syntactically nothing is wrong.

There are only two real answers, and mature projects use both:

- **Make the shared file generated.** If a file is derived from other files by a
  script, nobody edits it, so nobody collides on it. You know this rule already in
  a stronger form: **you do not edit a figure in Illustrator.** A figure that has
  been touched by hand after generation is a figure that no longer matches the
  data, and the fact that it looks fine is precisely the danger. Generated files
  are the same argument, applied to prose.
- **Give each writer their own file.** A shared log where everyone appends
  collides on every line; the same log split into one file per entry never
  collides at all. This is not a size optimisation — it is a concurrency one.

The second structural piece is ordering the moment of combination. If two people
work for two days in parallel, the merges must be serialised — for thirty seconds
each — even though the *work* was not. The usual rule is: before you merge,
incorporate the current trunk into your branch and re-run the checks, so that what
gets tested is what will actually exist afterwards. That is one rule, mechanically
checkable, and it removes the need for a person whose job is to stand at the door.

---

## Part 6 — Why a protocol on top of the tools

Git records changes. Tests check behaviour. CI runs the checks. None of them
answers questions like:

```text
Is this work written down anywhere other than in the head of whoever did it?
Did anyone actually accept this before it started?
Is the documentation still true?
When two people are working at once, does either know what the other declared?
Is the reason for this decision recorded, or only its outcome?
```

A **protocol** is the agreed set of practices that answers those, plus — and this
is the part that makes it real — **the subset of them a script can check.**

Cairn is this project's protocol. The specification is
[`specification.md`](./specification.md); what follows is the reasoning, which is
transferable even if you never use Cairn itself.

### 6.1 Work happens inside a declared unit

Nothing is implemented outside an accepted **coding path**: a small file that
declares what is being built, on which branch, from which starting commit, and
which files it expects to touch. It carries a **work ledger** — an append-only
record of what each step actually did.

The ledger is a methods section written *as the work happens* rather than
reconstructed at submission time. You know exactly how much is lost in
reconstruction, and you know that the parts most worth having — the thing that
did not work, the reason for the parameter, the decision that was reversed — are
the first to evaporate.

The declaration is registered on the shared trunk *before* the branch is created.
That ordering is not bureaucracy: a file that exists only on your own branch is
invisible to everyone else's, so a portfolio view built from those files would be
locally consistent and globally wrong. This project observed exactly that — a
generated "what is running now" page passed its own freshness check while saying
nothing was running, at a moment when four separate working copies were each
running something.

### 6.2 Ceremonies: the human decisions leave a record

Two moments require a human and produce a written artefact: an **opening check**
before work starts (what are we building, is this accepted) and a **closing
ceremony** before it merges (is this actually done). Each is recorded in a session
note whose metadata declares which path it belongs to and which ceremony it is.

The reason it must be *declared* metadata rather than inferred from the filename
is instructive. An earlier version of this project's checker looked for a file
whose name contained the path's id — but such a file exists from the path's first
hour, because the *opening* note also carries the id. So the check that was
supposed to prove a path had been closed was actually proving it had been opened,
and it passed every time. **A check can be running, and green, and testing the
wrong proposition entirely.**

### 6.3 Blocking and advisory

Every rule is one of two kinds:

```text
BLOCKING   the build fails. Nothing lands until it is fixed.
ADVISORY   it prints, a human reads it, and the work continues.
```

This is your exclusion criteria versus your flags-for-manual-review, and the
allocation is the single most important design decision in the whole protocol. A
rule earns the right to block only if:

> it is **objectively checkable**, **and** breaking it leaves something
> **wrong in the repository** — not merely unconventional.

Undocumented code is wrong. A journal entry written by the person who did the work
rather than by a reviewer is unconventional. Only the first may fail a build.

The asymmetry underneath is worth internalising: **a false blocking verdict costs
far more than a missed one.** A gate that stops legitimate work teaches people to
route around it, and once a team has learned to bypass a control, you have lost
the control *and* the information it was producing. Every lab has one instrument
with a QC threshold everyone knows to override. The first version of this
project's own checker reported 34 broken links that were not broken — they were
architecture pages *illustrating* a folder layout inside code blocks. Had that
been left blocking, the checker would have been switched off within a week and
none of the real rules would exist today.

Judgement calls therefore live in the advisory tier, permanently, on purpose.

### 6.4 The parts a machine cannot check, and saying so

Some things that matter are not checkable at all:

- Is this design still coherent with the architecture we agreed on?
- Is this paragraph of documentation still true?
- Was this the right thing to build?

Cairn's answer is not to pretend. Before a merge, an agent reads the change
against the accepted architecture and writes a **coherence audit** — a short
record of what it found. CI checks only that the record *exists and has been
filled in*; its verdict never blocks. That is a deterministic gate wrapped around
a non-deterministic activity, which is the only honest way to automate a
judgement.

The remaining gaps are written down as open holes rather than quietly omitted. The
specification lists them. A protocol that names its own blind spots is one you can
trust about everything else.

### 6.5 The rule that keeps all of it honest

The failure this project has fought hardest is subtler than any bug:

> **a published rule the implementation does not honour.**

An operator guide that prescribed a metadata format the parser rejects. A rule
table listing checks that did not exist in code. A page teaching a workflow that
had been replaced ten days earlier. In each case the document was confident, the
reader was reasonable, and following it produced a failure.

The defences are mechanical, and they generalise to any documentation you write:

- **Generate what can be generated.** The table of rules in the specification is
  produced from the checker's own source, so it cannot describe a rule that does
  not exist.
- **Make the documentation executable.** The metadata template published in the
  standards page is parsed *by the test suite*, so a template that would not work
  fails the build.
- **Date every page and name what it renders.** The page that drifted for ten days
  drifted unnoticed because nothing on it claimed a vintage.

---

## Part 7 — What to do with all this

If you take three things from this document, take these:

1. **Commit small, message honestly, push immediately.** You get an unfalsifiable
   record of your own work and a backup, for about ten seconds a day.
2. **Write a regression test every time something surprises you.** It is the
   cheapest institutional memory in existence, and it compounds.
3. **Run the checks on a machine that is not yours, on every change.** Everything
   else in continuous integration is detail.

Everything beyond that is scale. A protocol like Cairn matters when several people
or agents work at once, when work spans months, and when the reason for a decision
has to survive the person who made it. If you are working alone on something short,
the first three are most of the value and you should not feel behind for stopping
there.

The point of the whole apparatus is not compliance. It is that **you can change
things without being afraid**, and you can leave, and come back in a year, and the
project will tell you what it is rather than making you remember.

## Where to go next

- [`specification.md`](./specification.md) — Cairn itself: the planes, the path
  lifecycle, every rule with its level and its enforcing code, the three
  enforcement tiers, and a step-by-step operator guide.
- [`lexicon.md`](./lexicon.md) — every term, with a plain-language gloss beside
  the precise definition and the file that enforces it.
- [`foundations.html`](./foundations.html) — this page, rendered, with a
  glossary appendix. The shareable version.
- [`index.html`](./index.html) — the same protocol as a rendered page.
- [`../../AGENTS.md`](../../AGENTS.md) — the entry point an agent or a new
  contributor actually reads first.
