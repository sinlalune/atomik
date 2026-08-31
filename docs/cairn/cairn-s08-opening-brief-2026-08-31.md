---
type: Cairn Brief
title: S08 opening brief — what changed under the portability work while it waited
description: The context S08 needs before it starts: two live enforcement defects on the trunk, a third found during the pre-merge rebase that disables retention exactly when it matters, a records-accuracy defect, and the revised order of work.
tags: [cairn, s08, portability, enforcement, soundness, brief]
timestamp: 2026-08-31T00:00:00Z
---

# S08 opening brief

S08 was planned as portability: `cairn.config.json`, a loader, `cairn-new.mjs`,
and the `cairn-init` seed kit. That plan was written when the checker's rules
were believed sound. They are not, and the evidence accumulated while S08 waited.

This brief exists so S08 starts with that context instead of discovering it. It
changes the **order** of the work, not the goal.

## The one sentence

**Every enforcement defect found in the reference checker is a rule that agreed
too easily, and one of them switches itself off during the mandatory pre-merge
rebase.** Making the checker portable before making it sound would ship the
unsoundness to every repository that adopts Cairn.

## Read these first

Four concept articles were written for this, because the failure has a shape and
the shape recurs:

- [proxy predicate](./specification/concepts/proxy-predicate.md) — a rule
  computes something *near* what it means, and the stand-in is nearly always the
  broader condition;
- [unsound gate](./specification/concepts/unsound-gate.md) — what that produces:
  a gate whose passing does not mean what it says, and which is invisible because
  its output is a green line;
- [adversarial fixture](./specification/concepts/adversarial-fixture.md) — the
  only evidence a rule works: a crafted violation it rejects;
- [gate parity](./specification/concepts/gate-parity.md) — one gate, one tree,
  the same verdict locally and in CI.

The normative directive is
[*Prove that the gate can fail*](./specification/index.md#prove-that-the-gate-can-fail).
Its four requirements are the acceptance criteria for most of S08's first half.

## Finding 1 — the closing-ceremony gate passes from the day a path opens

**Live on the trunk. Blocking severity, zero enforcement.**

```js
/** A closing ceremony leaves a session note naming the path. */
function hasCeremony(pathId) {
  const id = pathId.toLowerCase()
  return readdirSync(join(REPO, SESSION_DIR)).some(
    (file) => file.toLowerCase().includes(id) && file.endsWith('.md')
  )
}
```

The comment states the sentence. The code asks a **filename** question. Opening a
path writes `YYYY-MM-DD-<id>-opening-check.md`, whose filename contains the id —
so the gate that is supposed to prove a human accepted the finished work is
satisfied by the note written before any work existed.

`paths.md` calls this rule *"the only human guard left once the integrator is
gone."* Every path in this repository has passed it since the day it opened.

**Fix:** read the `ceremony:` frontmatter key, not the filename. Bedrock 24
already specifies `ceremony: opening | closing` as a root-level key and explains
why the nested form fails. The CP-OPS-002 branch has `ceremonyFromSessions` doing
this correctly; it has never reached the trunk.

**Fixture it must reject:** a path at `status: done` whose only session note is
its opening check.

## Finding 2 — the merge-time journal entry has no predicate at all

**Live on the trunk. A stated requirement, enforced nowhere.**

`AGENTS.md` requires one file per entry under the journal root, written at merge
time. No rule asks for one. `same-work-unit` fires when *source* changes without
a module note or ledger; a closing unit changes neither, so nothing asks.

Observed, not hypothesised: CP-UI-TYPOGRAPHY was closed, audited, had its status
set to `done` and was proposed for merge with no journal entry, and every gate
reported `OK`. A human reviewer caught it.

**This is the case that motivates requirement 4 of the directive.** An unenforced
requirement and an unsound gate are indistinguishable from inside a green run —
both produce a passing check over a condition nobody verified. Only the
conformance matrix can tell a reader which one they are looking at.

**Fix:** a rule that fires when a path record transitions to `done` and no
journal entry names it. **Fixture:** exactly the state described above.

## Finding 3 — retention switches itself off during the rebase it exists to survive

**Found during CP-OPS-002's own pre-merge rebase, 2026-08-31. The most severe of
the three, and new.**

[Checkpoint retention](./specification/concepts/checkpoint-retention.md) exists
so that a rewriting push cannot orphan a checkpoint the ledger names. S07k
repaired it once: checking that every *declared unit* resolves a ref is not the
same as checking that every *completed commit* is retained, because a ref moved
forward leaves every unit resolving. The repair walks the branch:

```js
export function unretainedCheckpoints(commits, retained, provisional, head) {
  const retainedSet = new Set(retained)
  if (retainedSet.size === 0) return []
  const oldest = commits.findIndex((commit) => retainedSet.has(commit))
  if (oldest === -1) return []                    // ← here
  return commits.slice(oldest).filter(/* … */)
}
```

The guarded line is deliberate and its reasoning is stated: *"The range starts at
the oldest retained checkpoint, because commits older than the convention cannot
be judged by it."* That is correct for a repository adopting retention mid-life.

A **rebase gives every commit on the branch a new object id.** The retained refs
still point at the pre-rebase commits, which are now off the branch. So the
retained set and the branch range stop intersecting, `findIndex` returns `-1`,
and the function concludes *"no commits to judge"* rather than *"every commit is
unretained."*

Measured on this branch immediately after its rebase:

```text
retention refs                13
commits in the branch range   41
retained oids still in range   0
findIndex(...)                -1   →  unretainedCheckpoints returns []
npm run cairn-check           OK — protocol satisfied
```

Thirty-one rebased commits, none retained, and the rule that exists to say so
reported OK.

Rebase-before-merge is **mandatory** in this protocol, so this does not fire
occasionally — it fires on every path, immediately before every merge. The
guarantee evaporates at exactly the moment it is needed.

### The specification gap underneath it

This is not only an implementation bug. The ref namespace has no room for the
answer:

```text
refs/cairn/checkpoints/<path-id>/<n>
```

`<n>` is the ledger ordinal. After a rebase, unit 07 names a *different commit*
than it did before, and both commits deserve retention — the old one because
history must survive the rewrite, the new one because the next rewrite must not
orphan it. The refs are specified as append-only and never moved, so the existing
ref cannot be repointed, and the ordinal alone cannot name both.

**S08 must decide the shape before implementing the check**, and the decision is
ADR-sized. The obvious candidate is a generation component
(`…/<path-id>/<n>/<generation>` or `…/<path-id>/<rebase-epoch>/<n>`), but that is
a proposal, not a conclusion. Deliberately not decided here: inventing namespace
structure outside the specification is what `AGENTS.md` forbids.

### The state this branch is in right now

CP-OPS-002 rebased onto `dfcd09d` on 2026-08-31. Refs `01`–`13` hold the
**pre-rebase** commits, so nothing is lost and every historical checkpoint is
still fetchable. The 31 rebased commits are **unretained**, and no ref was moved
to make it look otherwise. That state is recorded here rather than papered over,
because papering over it is precisely the S07k violation.

## Finding 4 — dated records can carry a date that is not the date

**Records accuracy. Already merged, and therefore immutable.**

Every CP-UI-TYPOGRAPHY record — the opening check, the closing ceremony, the
coherence audit, the journal entry, and their filenames — is dated `2026-08-27`.
Only S01 happened that day. S02 through S05, the ceremony, the audit and the
journal entry all happened on `2026-08-31`, as the commit dates show.

The journal is the record that says when work was integrated. This one says a
date it was not.

No rule caught it, and no rule could as written: the checker validates that
frontmatter keys are *present* and well-formed, never that a `timestamp:` matches
when the file was written or that a filename's date matches its frontmatter.

**Not corrected here.** The records are merged, and session, audit and journal
records are immutable once written. Correcting them is an owner decision about
which is worse — an inaccurate date, or rewriting an event record after
integration — and the protocol's answer to that question is
[record integrity](./specification/concepts/record-integrity.md), which S08
should read before proposing anything.

**Candidate rule, cheap and sound:** a record's filename date MUST equal its
frontmatter `timestamp:` date. That catches disagreement between two things the
author wrote, without requiring the checker to know what day it is.

## Revised order for S08

The goal is unchanged: extract Cairn so another repository can adopt it. The
order changes, because shipping a portable copy of an unsound checker multiplies
the unsoundness by the number of adopters.

### First — make the existing rules honest

1. Fix `hasCeremony` to read the `ceremony:` key. One function, one fixture.
2. Add the journal-entry predicate. One rule, one fixture.
3. Fix the derived-view rule to key on the path's declared `status`, not on the
   branch name — the [gate parity](./specification/concepts/gate-parity.md)
   requirement, and a defect already demonstrated once.
4. Decide the retention-generation question, record it as an ADR, then implement
   the check. This one is design work before code.

### Second — make soundness structural rather than remembered

5. An [adversarial fixture](./specification/concepts/adversarial-fixture.md) for
   every blocking rule, with the rule's own name asserted in the finding. There
   are 26. This is the step that converts "we fixed four bugs" into "this class
   of bug now fails the build".
6. A test that runs one gate in both invocation contexts — a `path/*` branch and
   a detached ref — and asserts the same verdict.
7. Generate the conformance matrix from the checker plus the normative text, so
   requirement 4 of the directive is mechanical rather than clerical.

### Third — the portability work as originally planned

8. `cairn.config.json` and its loader, so `cairn-check.mjs` stops hard-coding the
   plane roots, the source roots, `AREA_MAP` and the grandfather set.
9. The folder rename to the portable role name, which the loader makes real
   rather than documented.
10. `tools/cairn-new.mjs` — registration, gates and commit in one command. Note
    that the trunk now requires a pull request, so the tool must open one; the
    registration performed by hand on 2026-08-31 is the worked example.
11. `cairn-init` seed template, scaffolding tiers 0 and 1 only.

## What S08 should not do

- **Do not add rules before adding fixtures.** The catalogue went 24 → 40 in four
  days and produced five unsound rules. The cold-resume pilot's own verdict was
  *do not change the normative text yet*. Rule count is not the metric; the
  fraction of blocking rules with a rejecting fixture is.
- **Do not fix Finding 4 by rewriting merged records** without ruling on record
  integrity first.
- **Do not repoint retention refs** to make Finding 3 look resolved. Moving a ref
  is the S07k violation, and the pre-rebase commits are the only thing currently
  keeping that history reachable.
