---
type: Atomik Lexicon
title: Cairn lexicon — every term, glossed plainly, traced to the file that enforces it
description: One entry per term used by the Cairn protocol and by the general software practice it sits on. Each carries a plain-language gloss, a precise definition, and the file that enforces it - or the mark ASPIRATIONAL when nothing does yet.
tags: [cairn, lexicon, glossary, terms, protocol, onboarding]
timestamp: 2026-08-25T00:00:00Z
---

# Cairn lexicon

> **Current as of 2026-08-25.** Companion to
> [`specification.md`](./specification.md) (what the rules are) and
> [`foundations.md`](./foundations.md) (why any of this exists, from zero).

**How to read an entry.** Each term gets a plain gloss, a precise definition, and
the file that enforces it. Three markers appear in the last line:

```text
Enforced by     a file in this repository makes this true, mechanically
General practice  standard software vocabulary; nothing here enforces it
ASPIRATIONAL    the term is used in this protocol and NOTHING enforces it yet
```

The third marker is the point of the exercise. A vocabulary that hides which of
its words are backed by code is how a protocol comes to describe a system that
does not exist.

---

## A — General practice

Standard software vocabulary. Taught from zero in
[`foundations.md`](./foundations.md); listed here so a reader can look one up
without leaving this page.

**Commit** · *A saved snapshot of the whole project, with a message and a link to
what came before.* — A Git object holding a complete tree of tracked files, an
author, a timestamp, a message and one or more parent commits, addressed by a hash
computed over all of that. Because a parent's id is part of the hash, a commit's
id fingerprints the entire history behind it. · *General practice.*

**Branch** · *A name for a line of work.* — A movable pointer to one commit; it
advances when you commit. Several may diverge from a common ancestor and later
rejoin. · *General practice.*

**Trunk** · *The version everyone agrees is current.* — The shared mainline
branch; `master` in this repository, `main` in many others. · *General practice.*

**HEAD** · *Where you are standing.* — Git's pointer to the current checkout,
normally via a branch name. · *General practice.*

**Detached HEAD** · *Standing on a commit with no branch name attached.* — A
legitimate state for inspection and a hazardous one for work, because new commits
there carry no name. It matters to Cairn: a check that cannot name its branch
cannot enforce anything about branches. · *Enforced by* `resolveBranch()` in
[`tools/cairn-check.mjs`](../../tools/cairn-check.mjs) — the `branch-identity`
rule, blocking when guarded roots changed.

**Merge** · *Bringing one branch's work into another.* — Git compares both sides
against their common ancestor and records a commit with two parents. · *General
practice.*

**Conflict** · *Git refusing to guess.* — Both sides changed the same region, so
Git stops and asks a human. A feature, not a fault: the alternative is a silent,
plausible, wrong combination. · *General practice.*

**Rebase** · *Replaying your commits as if you had started from a later point.* —
Produces a linear history at the cost of new commit ids, so it is safe on private
work and disruptive on shared work. · *General practice.*

**`--force-with-lease`** · *Overwrite the remote branch, but only if nobody else
moved it.* — The safe form of a force push, required after a closing rebase; a
blind `--force` may discard someone else's commits. · *General practice; required
by* [`paths.md`](../../atomik-project/coding-paths/paths.md).

**Remote** · *The shared copy, elsewhere.* — A named repository you can push to
and fetch from; `origin` by convention. Committing is not backing up — only a push
puts work somewhere your laptop is not. · *General practice.*

**Worktree** · *A second checkout of the same repository, on another branch.* —
`git worktree add` gives one repository several working directories. Cairn uses one
per path so two writers never share a filesystem. · *General practice; required by*
[`paths.md`](../../atomik-project/coding-paths/paths.md).

**Continuous integration (CI)** · *A machine that is not yours runs the checks on
every change.* — Here, [`.github/workflows/cairn.yml`](../../.github/workflows/cairn.yml):
on every push to `master` or `path/**`, a clean Linux machine installs
dependencies and runs the gates and the protocol check as two separate jobs. ·
*General practice.*

**Continuous delivery / deployment (CD)** · *The half after the checks pass:
packaging and releasing automatically.* — Optional, and independent of CI. ·
*General practice.*

**Gate** · *A check with authority to stop something.* — A check that only reports
is not a gate, however loud it is. See **enforcement tier**. · *General practice.*

**Green / red** · *Everything passed / something failed.* — The universal shorthand
for a check run's outcome. · *General practice.*

**Bare** · *Run the command and read its exit code — do not pipe it anywhere.* — A
pipe returns the status of its last command, so `npm test | head` can report
success over a failing suite. This project shipped a broken build that way on
2026-07-16. · *Required by* [`AGENTS.md`](../../AGENTS.md) *and*
[`.github/workflows/cairn.yml`](../../.github/workflows/cairn.yml).

**Unit test** · *A positive control for one function.* — Code that runs a small
piece of code and asserts the answer. · *General practice.*

**Regression test** · *A scar turned into a guardrail.* — A test written when
something breaks, which fails on the old code and passes on the fixed code, so that
one specific failure can never return silently. · *General practice.*

**Test-driven development (TDD)** · *Preregistration for code.* — Write the failing
test first, then the code that satisfies it, then clean up while the test holds the
behaviour still: red, green, refactor. · *General practice.*

**Lockfile** · *The exact versions, not just the names.* — `package-lock.json` and
its equivalents pin the whole dependency tree so a clean machine reproduces yours.
· *General practice.*

**Pull request (PR)** · *A proposed change with a discussion attached.* — The usual
host mechanism for review. Cairn does not require one: every merge in this
repository has been a local merge commit, which is why CI triggers on branch pushes
rather than on pull requests alone. · *General practice.*

---

## B — Cairn vocabulary

**Cairn** · *This repository's working protocol.* — A convention, a validator
(`tools/cairn-check.mjs`), and a split between rules that may fail a build and
rules that may only report. · *Defined by* [`specification.md`](./specification.md).

**Plane** · *Which kind of thing a file is.* — Two decompositions are in use: three
*conceptual* planes (knowledge `docs/`, execution state `atomik-project/`, and the
ephemeral conversation, which evaporates) and two *repository* planes (code:
`apps/`, `packages/`, `shared/`, `docs/`; knowledge + execution:
`atomik-project/`). `apps/` is not a third conceptual plane. · *Defined by*
[`ADR-009`](../adr/ADR-009-coding-paths-work-ledger-dual-plane.md) *and bedrock 35.*

**Coding path** · *One bounded piece of work, declared in a file before it starts.*
— `atomik-project/coding-paths/CP-<ID>.md`, carrying an identity tuple (`id`,
`status`, `branch`, `base_commit`), a step list, a work ledger and a next action.
No implementation happens outside one. · *Enforced by* the `branch-path`,
`registration` and `schema` rules in
[`tools/cairn-check.mjs`](../../tools/cairn-check.mjs).

**Path id** · *The name of a path.* — `CP-MVP-010` for roadmap work, `CP-OPS-002`
for everything else. The branch follows it: `path/cp-ops-002`. Matched exactly, so
a note about `CP-MVP-0010` never closes `CP-MVP-001`. · *Enforced by*
`ceremonyFromSessions()` *and* `openingFromSessions()`.

**Work ledger** · *The methods section, written as the work happens.* — The
append-only record inside a path file of what each executed step actually changed.
Mandatory reading for whoever resumes the path. · *Enforced by* the
`same-work-unit` rule (a source change requires a path-file change in the same
commit); its **accuracy** is not enforced — see **known limit**.

**Checkpoint** · *The path's own statement of where it stands.* — The block in the
ledger naming status, base commit, steps complete and next action. Its *presence*
is checked; its truth is not. · *Partially enforced;* accuracy is
[a known open hole](./specification.md#13-known-limits).

**Handoff brief** · *A disposable summary so the next session need not be
re-briefed.* — `atomik-project/briefs/<path-id>-handoff.md`, refreshed from the
ledger in every completed step's commit. Never primary memory: if it disagrees with
the path file or with Git, regenerate it. · *Required by bedrock 22;* not
mechanically enforced.

**Step** · *One executed unit of a path.* — Changes code, tests, docs, the ledger
and the brief together, runs the gates, commits, and pushes. Not complete until the
commit is on the remote. · *Enforced by* `same-work-unit` *(blocking)* and
`remote-checkpoint` *(advisory)*.

**Work unit** · *Everything that must be true at once, in one commit.* — The
smallest coherent change: the code and its tests and its documentation and the
ledger entry that records it. · *Enforced by* `same-work-unit`.

**Session boundary** · *A safe place to end a conversation.* — Every completed,
pushed step. A new session in the same worktree reads `AGENTS.md` → `paths.md` →
the running view → the ledger → the brief and continues without an owner recap. ·
*Convention;* not mechanically enforced.

**Opening check** · *The owner accepting the work before it starts.* — A session
note carrying root-level `path:` and `ceremony: opening`. **Blocking**: a path
declaring `status: running` with no such note fails the build. · *Enforced by*
`openingFromSessions()` — the `opening-ceremony` rule.

**Closing ceremony** · *The owner accepting the result before it merges.* — A
session note carrying root-level `path:` and `ceremony: closing`. **Blocking**: a
path may not declare `done` without one. · *Enforced by* `ceremonyFromSessions()`
— the `ceremony` rule.

**Session note** · *The written artefact a ceremony leaves.* — A file in
`atomik-project/sessions/`. The ceremony keys are **root-level**, siblings of
`title:`, and carry no inline comment. The nested form
`atomik: { path, ceremony }` is rejected. · *Schema pinned in*
[bedrock 24](../bedrock/24_24-doc-templates.md#session-note-and-ceremony-template),
*and the shipped template is parsed by the test suite.*

**Registration commit** · *Putting the path on the trunk before the branch exists.*
— A **metadata-only** trunk commit carrying the declaration, the regenerated
running view and the opening-check note. No implementation of any kind. The
invariant is "no implementation", not a file count. · *Enforced by* the
`registration` rule.

**`base_commit`** · *The trunk tip immediately before registration.* — A 7–40
character hex pin in the path's frontmatter. Its presence is checked; its accuracy
is not. · *Presence enforced by* `isCommitPin()`; *accuracy is*
[a known open hole](./specification.md#13-known-limits).

**`writes:`** · *What this path expects to touch — a signal, never a lock.* — A
list of glob patterns in the path frontmatter. An overlap warning at opening and a
diff-versus-declaration check before merge. Declare documentation surfaces too;
those are the ones that collide. · *Enforced by* `parseWrites()` — the
`scope-drift` rule, **advisory**.

**Widening** · *Discovering that the work reaches further than declared.* — A root
cause is discovered, not declared. The path records the widening in its ledger and
keeps going. · *Convention;* the advisory finding is what prompts it.

**Rebase gate** · *A branch must contain the current trunk tip before it merges.* —
Serialises the merge for thirty seconds without serialising the work. · *Enforced
by* `trunkContained()` — the `rebase` rule, **blocking**.

**Self-merge** · *Every path merges itself; there is no integrator.* — The path
sets its own `status: done` in the change that lands it. · *Defined by*
[`ADR-012`](../adr/ADR-012-parallel-paths-self-merge.md).

**Coherence audit** · *An agent reads the change against the accepted architecture
before it merges.* — One record per audit in `atomik-project/audits/`, named
`<path-id>-<commit>.md`. CI checks only that a record exists and has been filled
in; **the verdict never blocks.** · *Enforced by*
[`tools/cairn-audit.mjs`](../../tools/cairn-audit.mjs) — the `coherence-audit`
rule, **advisory**.

**Filled** · *The agent did the thinking, not a deletion.* — A record names an
outcome from the stated vocabulary (`clean` · `drift noted, proceeding` · `needs a
conversation before merge`, which may be qualified) and answers at least one of its
own findings questions. It is never a judgement about the answers. · *Enforced by*
`fillErrors()` in `tools/cairn-audit.mjs`.

**Derived view** · *A file generated from other files, so nobody edits it.* —
`ACTIVE.md`'s running-paths block is regenerated by `npm run cairn-active` from the
path declarations on the trunk. · *Enforced by* `tools/cairn-active.mjs` — the
`derived-view` rule, **blocking on the trunk**.

**Statement of record** · *A shared or generated file that a hand edit would
quietly falsify.* — The `SINGLE_TRUTH` list. Git will merge two hand edits cleanly
and nobody will have checked the resulting claim. · *Enforced by* the
`single-truth` rule, **advisory** — a deliberate edit is allowed if the ledger says
why.

**Journal** · *The project's narrative record.* — One file per entry under
`atomik-project/log/`. `atomik-project/log.md` is **frozen** as a historical
archive and is never appended to. The split was a **concurrency** fix, not a size
one. · *Convention;* the frozen file is in `SINGLE_TRUTH`.

**OKF pair** · *Every meaningful folder carries a map and a recent history.* — An
`index.md` (read before opening many files) and a `log.md` (read when recency
matters). · *Defined by bedrock 26;* the links inside them are enforced by the
`links` rule.

**Blocking** · *The build fails; nothing lands until it is fixed.* — Reserved for
rules that pass the admission test. · *Enforced by the exit code of*
`npm run cairn-check`.

**Advisory** · *It prints; a human reads it; the work continues.* — Where every
judgement call lives, permanently and by design. · *Enforced by the same command,
which never fails on these.*

**Admission test** · *What a rule must satisfy to be allowed to block.* —
Objectively checkable **and** breaking it leaves something wrong in the repository,
not merely unconventional. A false blocking verdict costs more than a missed one. ·
*Stated in* [`paths.md`](../../atomik-project/coding-paths/paths.md) *and*
[`specification.md`](./specification.md#101-the-admission-test-for-a-blocking-rule).

**Enforcement tier** · *How much your setup can actually prevent.* — `local` (tier
0, zero setup), `ci` (tier 1, CI **observes**), `protected` (tier 2, a host ruleset
— CI **prevents**). Tier 2 is a declared property of a repository, never a
requirement of the protocol. This repository is tier 1. · **ASPIRATIONAL as a
mechanism**: the tiers are decided in
[`ADR-016`](../adr/ADR-016-cairn-enforcement-integrity.md) §3 and documented here,
but `cairn.config.json` and the generated `cairn-check` header line that would make
the claim un-driftable do not exist yet — they land at CP-OPS-002 S08.

**Grandfather set** · *A finite, named list of paths exempt from a rule that
postdates them.* — `LEGACY_UNREGISTERED_PATHS` and `LEGACY_UNDECLARED_OPENINGS`,
holding `CP-MVP-011` and `CP-MVP-012`. They receive advisory findings telling them
how to clear the exception, the set **drains when they merge**, and no new path may
copy it. · *Enforced by named constants in* `tools/cairn-check.mjs`.

**Ledger boundary** · *A path file that costs more to read than the whole entry
chain has become an archive.* — Completed steps roll **verbatim** into
`atomik-project/coding-paths/history/<id>-S0N.md`. Never summarised: summarising at
rollup time would rewrite the record. · *Enforced by* `approxTokens()` — the
`ledger-size` rule, **advisory** and scoped to the diff.

**Path staleness** · *A running path whose branch has gone quiet.* — Reported past
the declared window (14 days) with both ways out: push the work, or move the path
to `archived`. A branch the checkout cannot resolve reports nothing — unknown must
never read as stale. · *Enforced by* `staleRunningPaths()` — the `path-staleness`
rule, **advisory permanently**.

**Known limit** · *Something the protocol cannot check, written down rather than
omitted.* — Two remain: `base_commit` accuracy and checkpoint accuracy. · *Listed
in* [`specification.md`](./specification.md#13-known-limits).

---

## C — Terms with nothing behind them yet

Listed separately so nobody mistakes a plan for a mechanism.

**`cairn.config.json`** · *The portability seam: plane roots, source roots, area
map, trunk name and the declared enforcement tier.* — **ASPIRATIONAL.** The
validator currently hardcodes `atomik-project/`, `apps/`, its area map and its
grandfather sets. Planned for CP-OPS-002 S08.

**`cairn-init`** · *Scaffold a new repository at tiers 0 and 1 — validator, config,
docs skeleton, workflow file.* — **ASPIRATIONAL.** Planned for CP-OPS-002 S08.

**`cairn-new`** · *Registration commit and worktree in one command, so the
registration precondition stops depending on memory.* — **ASPIRATIONAL.** Planned
for CP-OPS-002 S08.

**Generated enforcement header** · *`cairn-check` printing the declared tier, so no
document can claim prevention that is not installed.* — **ASPIRATIONAL.** Depends
on `cairn.config.json`. Until it exists, [§12 of the
specification](./specification.md#12-declared-properties-of-this-repository) states
the tier in prose, which is exactly the drift risk the generated line is meant to
remove.

---

## See also

- [`foundations.md`](./foundations.md) — the concepts, from zero.
- [`specification.md`](./specification.md) — the normative rules.
- [`index.html`](./index.html) — the rendered overview.
