---
type: Atomik Coding Path
title: Cairn 2.0 — close the enforcement gaps, drain the legacy state, and extract the protocol from Atomik
description: Second operations path. Repairs the three checks that certify false statements, drains the state that predates each rule, then extracts Cairn into a portable specification and init kit.
tags: [cairn, ops, protocol, ci, enforcement, portability]
timestamp: 2026-08-24T00:00:00Z
atomik:
  id: CP-OPS-002
  route: full            # control plane + decision plane; escalation is one-way
  status: running
  current_step: S08k
  base_commit: 7aa3b1d
  branch: path/cp-ops-002
  writes:                    # ADVISORY — a signal, never a lock
    - tools/cairn-check.mjs
    - tools/cairn-check.test.mjs
    - tools/cairn-active.mjs
    - tools/cairn-active.test.mjs
    - tools/cairn-audit.mjs
    - tools/cairn-audit.test.mjs
    - tools/cairn-rules.mjs
    - tools/cairn-rules.test.mjs
    - tools/cairn-spec.test.mjs
    - tools/cairn-spec-build.mjs
    - package.json
    - tools/cairn-new.mjs
    - cairn.config.json
    - .github/workflows/cairn.yml
    - AGENTS.md               # S08i: the mechanical contract names this rule set
    - docs/index.md
    - docs/**/index.md         # S05/S05b backfill the OKF entry points
    - docs/**/log.md           # S05c: the other half of the OKF folder pair
    - atomik-project/**/index.md
    - atomik-project/**/log.md
    - docs/cairn/**
    - docs/adr/**              # S05 backfills frontmatter across every ADR
    - docs/modules/**
    - docs/bedrock/24_24-doc-templates.md
    - atomik-project/index.md
    - atomik-project/coding-paths/paths.md
    - atomik-project/coding-paths/CP-OPS-002.md
    - atomik-project/coding-paths/index.md
    - atomik-project/coding-paths/history/**
    - atomik-project/coding-paths/CP-MVP-008.md
    - atomik-project/sessions/**
    - atomik-project/briefs/**            # S06d: the F7 residue lives here too
    - atomik-project/audits/index.md
    - atomik-project/log/**
  governs:                   # declared READ surface, pinned at exact blob ids
    - atomik-project/coding-paths/paths.md@468a922f03c2e7a8a1c737b8fc909292d6bc8e34
    - docs/bedrock/22_22-agent-handoff.md@c10ed0a11bc501336f449be204b57408f80c196e
    - docs/bedrock/24_24-doc-templates.md@d8d8d00d466fd5e456dece1f5a8284a5c3a8c15a
    - docs/bedrock/26_26-okf-agent-context.md@867ef9c288e036b2b69fef464d0e8f5aef9960d6
    - docs/bedrock/35_35-coding-path-execution-state.md@65e1b9abda9e1ebd7dd298a1195934b3cd20a780
    - docs/adr/ADR-009-coding-paths-work-ledger-dual-plane.md@3234eb9b1b9abb86e083998a30d58608cdc1e0e6
    - docs/adr/ADR-012-parallel-paths-self-merge.md@371c5ab3c560f9d5ab44d4bc630cff577264b5ab
    - docs/cairn/cairn-audit-2026-08-24.md@319d54d2035b03dddb03f379cc7874bcbc448154
---

# CP-OPS-002 — Cairn 2.0

> **ACTIVATED 2026-08-24** after the owner ruled all eight decisions in the opening check
> ([session note](../sessions/2026-08-24-cp-ops-002-opening-check.md), agenda in
> [`docs/cairn/cairn-opening-check-agenda.md`](../../docs/cairn/cairn-opening-check-agenda.md)).
> Registered at `base_commit: 7aa3b1d` before its worktree branched.

## Why this path exists

The audit record — `docs/cairn/cairn-audit-2026-08-24.md` — found one failure mode
wearing six faces: **Cairn writes rules forward and never drains the state that predates
them.** Three checks currently report `OK` over conditions that are false on this trunk.

Ordering follows severity, not narrative. Enforcement integrity came first, because every
later step lands through the gates that were not gating — S00 adopted the four mechanical
repairs and S01 closed the schema and doctrine drift around them. What remains is the
ledger boundary, the OKF backfill, portability, and the greenfield pilot.

## Steps

#### Completed steps — rolled to `history/`, verbatim

Rolled at S07c and again at S07g, both times when `ledger-size` fired on this file. The
move is cut-and-paste, never a summary: each record below reads exactly as it did here.
Convention: [paths.md](./paths.md#the-ledger-has-a-boundary) · index:
[history/](./history/index.md).

- **[S00](./history/CP-OPS-002-S00.md)** — Adopt the local repairs — the four enforcement repairs, and how they landed
- **[S01](./history/CP-OPS-002-S01.md)** — Schema and doctrine fixes — the ceremony schema pinned, ADR-016
- **[S03](./history/CP-OPS-002-S03.md)** — Drain the grandfather set — owner-ruled, withdrawn
- **[S04](./history/CP-OPS-002-S04.md)** — Bound the ledger — the history/ rollup convention and advisory ledger-size
- **[S05](./history/CP-OPS-002-S05.md)** — Backfill OKF — indexes, ADR frontmatter, the gated opening check, logs everywhere
- **[S06](./history/CP-OPS-002-S06.md)** — Retire the drifted page, declare the enforcement tier, bind the audit, drain the leftovers
- **[S07a](./history/CP-OPS-002-S07a.md)** — ADR-017, the path lifecycle *(ruling 5, F11 + F15)* — **COMPLETE**
- **[S07](./history/CP-OPS-002-S07.md)** — Specification, lexicon, and the primer that makes them readable — **SUPERSEDED by S07c**
- **[S07b](./history/CP-OPS-002-S07b.md)** — The rendered page — **SUPERSEDED by S07c**
- **[S07c](./history/CP-OPS-002-S07c.md)** — Redo: one handbook, universal, in its own theme *(owner correction)* — **SUPERSEDED by S07e**
- **[S07d](./history/CP-OPS-002-S07d.md)** — The binding names, and the document read downward *(owner, 2026-08-25)* — **SUPERSEDED by S07e**
- **[S07e](./history/CP-OPS-002-S07e.md)** — Canonical top-down specification project and universal reader *(owner correction)* — **COMPLETE**

- **[S07f](./history/CP-OPS-002-S07f.md)** — Candidate-bound closure and truthful team lifecycle — COMPLETE
- **[S07g](./history/CP-OPS-002-S07g.md)** — Cairn v0.2: close the gaps between the promises and the predicates — COMPLETE
- **[S07h](./history/CP-OPS-002-S07h.md)** — The v0.2 predicates, part one: the parser, the typed ledger, and the two P0 gates — COMPLETE
- **[S07i](./history/CP-OPS-002-S07i.md)** — The v0.2 predicates, part two: the record rules — COMPLETE
- **[S07j](./history/CP-OPS-002-S07j.md)** — The v0.2 predicates, part three: routes, the brief contract, redaction — COMPLETE
- **[S07k](./history/CP-OPS-002-S07k.md)** — Repair: a retention ref was moved, and the rule could not see it — COMPLETE
- **[S07l](./history/CP-OPS-002-S07l.md)** — Repair: the brief could not name its own commit — COMPLETE
- **[S07m](./history/CP-OPS-002-S07m.md)** — Review round two: two unsound predicates and a fabricated figure — COMPLETE
- **[S07n](./history/CP-OPS-002-S07n.md)** — The cold-resume pilot, and what it says not to do — COMPLETE
- **[S07o](./history/CP-OPS-002-S07o.md)** — Owner review: the brief is a stone, not a hero — COMPLETE
- **[S07p](./history/CP-OPS-002-S07p.md)** — Repair: a dead button, a low glyph, and the face that stayed old — COMPLETE

### S07q — Every defect leans the same way, so name the shape — **COMPLETE**

```cairn-unit
step: S07q
unit: 13
type: documentation
verified: cairn-check, cairn-check:test, typecheck, test, build
```

Owner request, after a fifth enforcement defect surfaced on a sibling path:

> "Is it a structural problem of the protocol?"

Partly, and the structural part is narrower and more useful than "the protocol is
wrong". **Every enforcement defect found in the reference checker so far is the
same kind, and they all lean the same way.** Not one rule was too strict; all of
them agreed too easily, and each reported `OK` over a condition that was false.

Six instances, five in rules and one in the absence of a rule:

| The rule meant | The proxy asked | How it came apart |
| :-- | :-- | :-- |
| every completed checkpoint is retained | every *declared unit* resolves a ref | S07k: a ref moved, every unit resolved, a commit was orphaned |
| every advisory at the candidate was disposed | matches what the checker raises *now* | S07m: closure's advisory set is a strict subset |
| closure touches only permitted fields | a looser field set than its own prose | S07m |
| this checkout owns the derived view | the branch name matches `path/*` | CP-UI-TYPOGRAPHY S04: local `OK`, CI `FAILED`, one tree |
| a closing ceremony happened | a session note *names* the path | **live on the trunk**: the opening note satisfies the closing gate |
| a journal entry exists at merge | *(no predicate at all)* | CP-UI-TYPOGRAPHY S05: closed, audited, proposed for merge with none |

The last two are the argument. `hasCeremony` is one line, its own comment states
the sentence it means, and its code asks a filename question every path satisfies
from the moment it opens — in the rule `paths.md` calls "the only human guard
left once the integrator is gone". And the journal requirement is stated in
`AGENTS.md`, enforced nowhere, and indistinguishable from an enforced one from
inside a green run.

Why the direction is not luck: a rule turns a sentence into code, and something
must bridge them. The stand-in is nearly always the **broader** condition,
because the easy thing to compute is usually *necessary* for the sentence rather
than *sufficient* for it. So the errors inherit that direction, and a rule set
left alone drifts toward permissiveness rather than toward noise — where noise
would at least announce itself.

And permissiveness here is not a gap. Cairn writes gate results into closing
acceptances and journal entries, so an unsound gate **launders a false statement
into the durable record**, with the authority of an automated check.

Landed, at the owner's request, as teachable vocabulary rather than another
paragraph of analysis:

- **Four concept articles.** [`proxy-predicate`](../../docs/cairn/specification/concepts/proxy-predicate.md)
  names the substitution, [`unsound-gate`](../../docs/cairn/specification/concepts/unsound-gate.md)
  names what it produces and why it is invisible,
  [`adversarial-fixture`](../../docs/cairn/specification/concepts/adversarial-fixture.md)
  is the only evidence a rule works, and
  [`gate-parity`](../../docs/cairn/specification/concepts/gate-parity.md) is the
  property that one gate does not change its mind between a laptop and CI.
- **A normative directive**, *Prove that the gate can fail*, with four MUSTs: a
  fixture per blocking rule; no predicate branching on a value that varies by
  execution context; ask about the fact rather than the declaration; and every
  stated requirement either enforced or listed as unenforced. The existing
  declaration-versus-fact passage is kept intact beneath it as the worked example
  that produced requirement 3.
- **Five conformance rows**, four of them `not implemented` and one
  `not implemented, and violated`. The directive's own fourth requirement
  demanded that: a requirement with no row is the failure it describes.
- **Three new spec tests** (33 total). One pins all four requirements and that
  each links its concept article; one pins the five matrix rows, enforcing the
  specification's promise that every requirement appears in the matrix.

Deliberately not done: fixing `hasCeremony`, or implementing any of the four
requirements. They belong to S08, which owns `cairn-check.mjs`, and writing the
rule in the same unit as the doctrine would leave the doctrine untested against a
second implementation. The conformance matrix now says so out loud rather than
leaving a reader to assume enforcement.

### S07r — Rebase onto the trunk, and find what the rebase turns off — **COMPLETE**

```cairn-unit
step: S07r
unit: 14
type: repair
verified: cairn-check, cairn-check:test, typecheck, test, build
```

CP-UI-TYPOGRAPHY merged, so the trunk moved and this branch had to rebase before
it can. The rebase itself is routine — 31 commits onto `dfcd09d`. What it exposed
is not.

**`unretainedCheckpoints` disables itself on the rebase it exists to survive.**
S07k rewrote that rule to walk the branch rather than trust the ledger's list of
units. The rewrite opens with a guard whose reasoning is stated and sound —
*"the range starts at the oldest retained checkpoint, because commits older than
the convention cannot be judged by it"* — implemented as:

```js
const oldest = commits.findIndex((commit) => retainedSet.has(commit))
if (oldest === -1) return []
```

A rebase gives every commit a new object id. The retention refs still name the
pre-rebase commits, which are now off the branch, so the retained set and the
branch range stop intersecting entirely. `findIndex` returns `-1`, and the
function returns "nothing orphaned" where the truth is "nothing retained".

Measured immediately after this branch's own rebase:

```text
retention refs                13
commits in the branch range   41
retained oids still in range   0     →  findIndex -1  →  []
npm run cairn-check           OK — protocol satisfied
```

Rebase-before-merge is mandatory, so this is not an edge case: the guarantee
evaporates immediately before every merge, on every path.

Underneath it is a **specification** gap, not only an implementation one. The
namespace `refs/cairn/checkpoints/<path-id>/<n>` keys on the ledger ordinal, and
after a rebase unit 07 names a different commit than before. Both deserve
retention — the old one because history must survive the rewrite, the new one
because the next rewrite must not orphan it — and the refs are specified
append-only and never moved, so the existing ref cannot be repointed. The ordinal
alone cannot name both. A generation component is the obvious candidate and is
deliberately **not** decided here: inventing namespace structure outside the
specification is what `AGENTS.md` forbids, and this is ADR-sized.

One correction the gate caught, worth keeping because the mistake is easy: I
updated `base_commit` to the new rebase base and `registration-base` refused it.
`base_commit` is not what the branch currently sits on — it is the trunk state
immediately *before this path was registered*, and it must stay the parent of the
commit that added the path record. It is a historical fact and a rebase cannot
change it. The rule was right and the edit was wrong.

State recorded rather than tidied: refs `01`–`13` hold the pre-rebase commits, so
every historical checkpoint remains fetchable; the 31 rebased commits are
unretained; **no ref was moved to make that look otherwise.** Moving one is the
S07k violation, and those refs are currently the only thing keeping the
pre-rebase history reachable.

Also found, and not fixed: **dated records can carry a date that is not the
date.** Every CP-UI-TYPOGRAPHY record — opening check, closing ceremony,
coherence audit, journal entry, and their filenames — reads `2026-08-27`. Only
S01 happened then; S02–S05 and every closing record happened on `2026-08-31`. The
journal is the record that says when work was integrated, and this one says a day
it was not. The checker validates that frontmatter keys are present and
well-formed, never that a `timestamp:` is true or that a filename's date agrees
with it. The records are merged and immutable, so correcting them is an owner
ruling about record integrity, not a repair to make silently.

**And a fifth finding, from verifying the fourth.** Reproducing the CI invocation
faithfully — `--base origin/master --branch path/cp-ops-002` — showed that the
default local command and the CI command **use different comparison bases**:

```text
npm run cairn-check                              working tree vs HEAD      0 changed files  OK
node tools/cairn-check.mjs --base origin/master  branch vs the trunk     224 changed files  9 findings
```

Every rule that evaluates changed files therefore sees a different set, and this
branch has been **red in CI for many pushes** while every local run said `OK`.
The findings are eight blocking plus one inconclusive on `CP-MVP-008.md`, all
pre-existing before S07r: a `done` record that predates the v0.2 acceptance
schema.

Not repaired here, and not because it is hard. Supplying `accepted_by`,
`accepted_at`, `scope_ref` and `advisory_disposition` means writing who accepted
a path, when, and against what scope, for a path closed weeks ago by someone
else — **fabricating a signature**, which is the one thing an acceptance record
exists to prevent. Owner ruling, a self-deleting migration exception like the one
S07i already implements, or a deliberate pre-v0.2 carve-out. All decisions.

One thing this does change retroactively: ledger entries in this path record
`verified: cairn-check`, obtained from the local command. That claim is true and
weaker than it reads, and it stays as written rather than being edited — the
record says what was actually run.

Landed: [`docs/cairn/cairn-s08-opening-brief-2026-08-31.md`](../../docs/cairn/cairn-s08-opening-brief-2026-08-31.md),
which carries all four findings with their fixtures and reorders S08 into three
parts — honest rules first, structural soundness second, portability third.

### S07s — Drain a record the newer rules could not judge — **COMPLETE**

```cairn-unit
step: S07s
unit: 16
type: implementation
verified: cairn-check, cairn-check:test, typecheck, test, build
```

The nine `CP-MVP-008` findings that had this branch red in CI are resolved by the
mechanism this path already built, not by a ruling about fabrication. Establishing
that took one command:

```bash
$ git log --merges --grep="CP-MVP-008" origin/master      # (no output)
```

**CP-MVP-008 never merged from a branch.** It ran on the trunk, closed
2026-08-04, and predates path branches, candidate-bound closure and the v0.2
acceptance schema together. There is no candidate commit to name because the
protocol it ran under had no such object — which is why `subject_commit`,
`accepted_by`, `scope_ref` and `advisory_disposition` are absent. Its acceptance
is not missing: `sessions/2026-08-04-cp-mvp-008-acceptance.md` records it with
the owner's ruling quoted. The schema is what is missing.

This is the audit's own opening sentence, arriving as a live failure: *Cairn
writes rules forward and never drains the state that predates them.*

- **`CP-MVP-008` joins `V02_MIGRATION_PATHS`**, the finite, named, self-deleting
  set from S07i. `migrationDebt` reports any listed path that is archived or
  gone, so the exception is removed by a failing gate rather than by memory.
- **The exception is now wired into `transition` and `acceptance`**, which never
  consulted it — only `scope-digest` did. A listed path's findings drop from
  blocking to advisory and carry the reason inline, so the debt stays visible.
- **An adversarial fixture**, the first written under the S07q directive. It
  asserts the exception is *rejected* when spent: a listed path that is archived,
  and a listed path that no longer exists, both produce a finding. Testing that a
  valid set passes would have proved nothing.

Verified against the faithful CI invocation, not the local one:
`--base origin/master --branch path/cp-ops-002` → **OK, 12 advisory**. It was 9
blocking before.

Not fabricated, and worth being explicit about: no `accepted_by`, `accepted_at`,
`scope_ref` or `advisory_disposition` was written for CP-MVP-008. Converting an
unstructured record into a structured signature by typing is the one thing an
acceptance record exists to make impossible.

**The date question is settled by the protocol rather than by preference.**
Records are immutable once written and redaction is the only sanctioned
exception — it exists to remove content that must not persist, not to correct
content that is merely wrong. So the CP-UI-TYPOGRAPHY records keep their
`2026-08-27` dates and the correction lives in later records: the S08 brief, this
ledger, and this path's journal entry at merge. *A record is corrected by a
later record, never by an edit* — which is why the journal is append-only. The
recurrence rule is cheap and sound and belongs to S08: a record's filename date
MUST equal its frontmatter `timestamp:`, comparing two things the author wrote so
the checker never needs to know the date.

**And the teaching axis is now a protocol requirement**, at the owner's
direction: the concept note becomes a specified artifact type, normative and
learning text link to concept notes rather than redefining terms, `cairn-init`
scaffolds a `concepts/` directory, and the reader generalises so any project's
concept wiki exports the same way. The distinction that makes it work: a
**concept note** is organised by one idea and is a link target; a **learning
note** is organised by one build in order and is not. `docs/learning/` is
excellent at the second and does not attempt the first. Both belong; only one is
reusable from elsewhere. Full statement in the S08 brief.

### S07t — The catalogue could not see a level it had to compute — **COMPLETE**

```cairn-unit
step: S07t
unit: 17
type: repair
verified: cairn-check, cairn-check:test, typecheck, test, build
```

Owner question: *is there pre-S08 work on the protocol that has not updated the
spec docs?* Yes, in two places, and the second was hiding behind a passing test.

**The ledger's S08 plan had drifted from the S08 brief.** The brief carried the
base-divergence finding, the filename-date rule and the whole teaching axis; the
ledger's numbered plan carried none of them. Two statements of one plan, one of
them stale — the drift this path keeps naming, committed by me two units ago.
Synced: Part 1 gains 3b and 3c, and the teaching axis is Part 3, ahead of
portability because `cairn-init` scaffolds it.

**The generated rule catalogue under-reported five rules.** `extractRules`
matched only a literal level:

```js
/add\('(blocking|advisory)',\s*'([a-z-]+)'/g
```

A rule that is advisory for a grandfathered path and blocking for everyone else
is written `add(exempt ? 'advisory' : 'blocking', 'scope-digest', …)`, which that
regex cannot see. So the specification published `acceptance`, `transition`,
`brief-schema`, `route` and `scope-digest` as **blocking-only** while all five can
emit advisory findings. Three of the five predate today; S07s made it five.

The part worth keeping: **the test guarding the catalogue passed the whole time.**
It compares the shipped table against `extractRules` — the same blind extraction
that produced it. Two views of one flawed reading agreeing with each other is not
verification, and this is the sharpest instance yet of the directive's first
requirement: a green suite of valid inputs proves a rule is quiet, never that it
is awake.

Landed: the extractor reads both a literal level and a conditional one; the
catalogue regenerates with five advisory rows it had never carried; and an
adversarial fixture asserts a ternary yields **both** levels while a genuinely
single-level rule gains no phantom second one. Checker suite 193.

`ledger-size` fired in the same unit, so S07m–S07p rolled to `history/`
cut-and-paste as the convention requires. Two relative links were re-depthed —
the records moved one directory down, and `links` caught both. Path depth is not
prose: the text reads exactly as it did.

### S07u — Make the brief survive the handoff it is for — **COMPLETE**

```cairn-unit
step: S07u
unit: 18
type: repair
verified: cairn-check, cairn-check:test, typecheck, test, build
```

The owner asked whether a fresh session could open S08. Checking the brief
against the contract this path rewrote at S07o — rather than assuming — found
three defects, all of which would have cost a cold reader real time.

- **`checkpoint_unit: 13` against `checkpoint: 0b7f993`, which is unit 16.** The
  brief named a real, retained commit and gave it the wrong ordinal, so the
  retention ref and the brief disagreed about the same object — the precise
  disagreement `checkpoint_unit` exists to make impossible. A bad `sed` pattern
  in an earlier refresh silently matched nothing. Now unit 17 at `292ae08`.
- **The S08 brief was not in `governs:`.** The next session's entire job is S08,
  and the document carrying its context was named nowhere in the read surface and
  pinned to no object id. Question 5 of the answerable-alone contract — *what it
  must read, and at which object id* — was unanswerable for the one document that
  matters most. Added, pinned, and promoted to first in the reading order.
- **`writes:` had drifted.** It omitted `coding-paths/history/**` and `log/**`,
  both written during this path.

And `timestamp: 2026-08-27` on a brief refreshed on 2026-08-31 — the same defect
found in the CP-UI-TYPOGRAPHY records at S07r, recurring in a document written
four units after it was recorded. The difference is that a brief is **mutable by
design**, so this one is corrected in place rather than by a later record. That
contrast is the useful part: immutability is what decides whether a wrong date
gets fixed or annotated, not the wrongness.

The general lesson, and the reason this is its own unit: **the brief is the one
record whose defects are invisible to the person who wrote it**, because they
already know the answers. It has to be checked against the contract by reading
it, and nothing in the checker can do that — `brief-schema` proves the fields are
present and well-formed, never that they are true. The conformance matrix says
so; this is what that row costs when nobody checks.

### S08 — Make the rules honest, then extract Cairn from Atomik

Opening context: [`docs/cairn/cairn-s08-opening-brief-2026-08-31.md`](../../docs/cairn/cairn-s08-opening-brief-2026-08-31.md).
Read it before the first unit — it carries four findings that reorder this step,
three of them live and one of them new as of the rebase on 2026-08-31.

S08 was planned as portability alone. It now runs in three parts, because
shipping a portable copy of an unsound checker multiplies the unsoundness by the
number of adopters.

#### Part 1 — the live defects

1. **`hasCeremony` passes from the day a path opens.** It matches any session
   note whose *filename* contains the path id, so the opening check satisfies the
   closing gate — in the rule `paths.md` calls "the only human guard left once
   the integrator is gone". Read the `ceremony:` key instead; bedrock 24 already
   specifies it and this branch already has `ceremonyFromSessions`.
2. **The merge-time journal entry has no predicate.** Required by `AGENTS.md`,
   enforced nowhere. CP-UI-TYPOGRAPHY closed, was audited and was proposed for
   merge with none, and every gate reported `OK`.
3. **The derived-view rule keys on the branch name**, so a local run and a CI run
   disagree on one tree. Key on the path's declared `status`.
3b. **The default local command and the CI command compare different bases** —
   working tree versus HEAD, against branch versus trunk. Nine findings were
   invisible locally for many pushes. `npm run cairn-check` on a `path/*` branch
   must default to the trunk base; a developer should opt *out* of the
   merge-deciding comparison, not into it. Done first, at **S08a**, for the
   reason the item itself gives: until it landed, every "gates green" claim in
   this ledger — including the ones already written — was weaker than it read.
3c. **A record's filename date MUST equal its frontmatter `timestamp:`.** Cheap
   and sound — it compares two things the author wrote, so the checker never
   needs to know what day it is. Found because every CP-UI-TYPOGRAPHY record is
   dated four days before the work happened.
4. **Retention switches itself off during the mandatory pre-merge rebase.** A
   rebase renames every commit, the retained set stops intersecting the branch,
   `findIndex` returns `-1`, and `unretainedCheckpoints` concludes "nothing to
   judge" instead of "everything is unretained". Measured on this branch: 13
   refs, 41 commits in range, 0 intersecting, gate `OK`. The ref namespace has no
   room for the fix — `<path-id>/<n>` cannot name the same unit before and after
   a rewrite — so this is **an ADR before it is code**.

#### Part 2 — make soundness structural

5. An adversarial fixture for every blocking rule, asserting the rule's own name
   in the finding. Twenty-six of them. This is what converts "four bugs fixed"
   into "this class of bug fails the build".
6. A test running one gate in both invocation contexts, asserting one verdict.
7. Generate the conformance matrix, so directive requirement 4 is mechanical.

#### Part 3 — the teaching axis, which the init kit must carry

Owner directive: *decomposing complex into simpler concept units is the only way
to truly understand something*, and the knowledge base must be exportable. This
is a protocol requirement, not a documentation habit.

The distinction that makes it work: a **concept note** is organised by one idea
and is a link target; a **learning note** is organised by one build in order and
is not. `docs/learning/` is excellent at the second and does not attempt the
first. Both belong; only one is reusable from elsewhere.

7b. Specify the concept note as an artifact type — shape, frontmatter, and the
   rule that it is about exactly one idea. The four written in S07q are the
   worked examples.
7c. **Link, don't redefine.** Where a term has a concept note, normative and
   learning text SHOULD link it. Redefinition in two places is the same drift as
   four copies of a font stack, applied to prose.
7d. `cairn-init` scaffolds `concepts/` with an index separating borrowed
   vocabulary from vocabulary the project defines, plus the page template.
7e. Generalise `cairn-spec-build.mjs` so **any** project's concept wiki exports
   as one self-contained reader — the "export to another md base" the directive
   asks for.
7f. Rebuild `docs/learning/` on it **incrementally**: when a learning note
   explains an idea that deserves a name, extract the idea and link to it. The
   walkthrough stays.

It lands before portability because `cairn-init` scaffolds it. A form added after
adoption is a migration; a form added before adoption is just the shape of the
thing.

#### Part 4 — portability, as originally planned

8. `cairn.config.json` and the loader — plane roots, source roots, `AREA_MAP`,
   trunk name, and `"enforcement": "local" | "ci" | "protected"` (S06b).
   `cairn-check` prints the declared tier, so "CI observes" versus "CI prevents"
   is generated rather than asserted in drifting prose.
9. The folder rename to the portable role name, which the loader makes real.
10. `tools/cairn-new.mjs` — registration commit, gates and worktree in one
    command. The trunk now requires a pull request, so it must open one; the
    registration done by hand on 2026-08-31 is the worked example.
11. `cairn-init` seed template and the ex-nihilo bootstrap prompt, scaffolding
    **tiers 0 and 1 only**: the validator, the config, the docs skeleton and the
    workflow file. No host configuration, no account, nothing to click.

### S08a — The local gate and the CI gate compared different trees — **COMPLETE**

```cairn-unit
step: S08a
unit: 19
type: repair
verified: cairn-check, cairn-check:test, typecheck, test, build
```

Taken first out of S08 Part 1, ahead of `hasCeremony`, because the item says to:
until it lands, every gate verdict a work unit records is the narrow one. Doing
`hasCeremony` first would have verified that repair with the command this one
fixes. Noted as a disagreement between two records — the handoff brief's next
action read "Part 1 in order" as numeric and named `hasCeremony` — and settled by
the reason, which both the S08 brief and this plan state in the item itself.

**One tree, one command name, two questions.**

```text
npm run cairn-check                              working tree vs HEAD     0 files   OK
node cairn-check.mjs --base origin/master        branch vs trunk        228 files   11 advisory
```

The base is chosen once, before any predicate runs, and every changed-file rule
inherits it without ever mentioning it. So this is not one unsound rule but a
whole class of them evaluated over the wrong input — and the green line came from
the invocation a developer runs before every commit, while CI ran the other one.
This branch was red in CI for many pushes with local runs saying `OK`, and those
`OK`s are what the ledger recorded as verification.

**The repair.** `resolveBase()` is the sibling of `resolveBranch()`: pure, given
ref resolution by its caller, and answering one question the rules used to answer
implicitly.

```text
--base <ref>          flag           explicit; CI and the tests stay in charge
--working-tree        opt-out        still available, no longer the default
path/* branch         default-trunk  origin/master, then master
master or a tag       trunk-work     no pending merge, so no parity claim
nothing resolvable    unresolvable   fall back, and SAY so
```

Two things make it more than a flag flip. The header line now names the base and
how it was chosen, because that line is what people paste into a ledger as
evidence and a verdict that does not say what it compared cannot be read a year
later. And a narrowed run raises the advisory `base-parity`, so the narrowing
cannot be recorded as a full verdict by someone who forgot which flag they typed.

**On requirement 2 of the directive** — *a predicate MUST NOT branch on a value
that varies with where it runs.* `base-parity` does branch on how the run was
invoked, and that is the point rather than an exception. Every changed-file rule
was already branching on it silently; this rule is the one place the branching is
named, in the same shape as `branch-identity`. Advisory, never blocking: a
developer with no fetched trunk must still be able to run the checker, and a
narrower run is not a protocol violation. What it must not be is invisible.

**Fixtures, and the mutations that prove they bite.** Four cases pin
`resolveBase` — default, opt-out, unresolvable, off-branch — and two pin the
finding. Both repairs were then broken on purpose: making the rule unreachable
and making the trunk candidate never resolve each fail exactly the tests written
for them, and nothing else.

The catalogue guard also did its job unprompted: adding one `add('advisory',
'base-parity', …)` failed `cairn-rules` until the rule was given its published
condition and enforcing logic, which is the drift check S07t built working on its
first new rule.

**One test was relaxed, deliberately.** `every new requirement carries its own
conformance row` hard-coded `**not implemented**` for five rows. The row must
exist and state a status in the vocabulary; pinning *which* status turns every
honest matrix update into a test edit, which teaches an editor to change the test
rather than check the claim. It now asserts the row and the vocabulary, and was
mutation-checked against a row whose status is prose.

**The brief budget bit, and it was right to.** Refreshing the handoff brief with
this unit took it from 1172 tokens to 1693 against a declared 1200, and
`brief-schema` blocked. The fix was not a bigger budget: five settled *Tried and
rejected* entries were merged or dropped — every one of them recorded in full in
this ledger, which is the primary record the brief is a view of — and the rest
were tightened. The brief now carries S08 rather than a history of S07. Worth
noting for the next refresh: HEAD had only 28 tokens of headroom, so this is not
a one-off.

Conformance moves from `not implemented` to `partially implemented` for *local
and CI invocations reach the same verdict*: the default now matches CI and a
narrowing announces itself, but no test yet runs one gate in both contexts and
asserts one verdict. That is Part 2 item 6, and it stays open in the matrix.

### S08b — The rule reported eighteen refs missing while eighteen sat on the remote — **COMPLETE**

```cairn-unit
step: S08b
unit: 20
type: repair
verified: cairn-check, cairn-check:test, typecheck, test, build
```

Unplanned, and found the only way it could be: the owner showed the CI run for
S08a. Five blocking `checkpoint-retention` findings — units 13, 14, 16, 17, 18 —
on a branch whose local gate said `OK`.

**The refs were all on the remote.** `git ls-remote origin 'refs/cairn/*'`
returns eighteen for this path. `actions/checkout` fetches `refs/heads/*` and
`refs/tags/*`; `refs/cairn/*` is neither, so the CI checkout held zero. The rule
reads local refs, found none, and stated with confidence that eighteen refs did
not exist — then told the reader to *create* them, which in that checkout would
have accomplished nothing.

Reproduced before anything was changed, in a clone fetched the way
`actions/checkout` fetches: 0 refs under `refs/cairn`, the same five findings,
same wording.

**The mechanism is one line, and the author had already anticipated it.**

```js
if (retainedRefs == null) {
  add('blocking', 'checkpoint-retention',
    `cannot list ... — fetch the retention namespace and rerun the gate; missing evidence is not a pass`,
    'inconclusive')
```

That sentence is exactly right, and it was **unreachable**. `retainedRefs` is
null only when the Git command fails, and `git for-each-ref` over a namespace
that was never fetched **exits 0 and prints nothing** — byte-identical to a
namespace that is present and empty. Verified directly. So the guard written for
this case could never see it, and the case fell through to the confident branch.

A new shape for this path's collection, and the first one that does not lean
lenient: the proxy here is `gitOrNull() === null` standing in for *the namespace
is unreadable*, and it is **too narrow**, so the rule speaks where it should have
abstained. The S08 brief's organising sentence — *not one rule was too strict* —
has its first counterexample. It is still the same underlying error: a
computable stand-in substituted for the sentence the comment states.

**Both halves repaired, because either alone would be wrong.**

- The checker now treats an empty namespace with units due as inconclusive. The
  verdict does not soften — still blocking, still exit 1 — only the claim and the
  instruction change, and the message names both possible causes plus the fetch
  refspec. The newest-unit advisory is suppressed in that state too: it was the
  same unfounded claim in a quieter voice.
- The workflow fetches `+refs/cairn/*:refs/cairn/*` before the checker runs.
  Without it CI would now be permanently inconclusive instead of permanently
  wrong, which is more honest and no more useful. With it, CI can judge the real
  question.

**Verified as a parity pair, not asserted.** The CI-shaped clone, after the
workflow's fetch, reports `OK — protocol satisfied (11 advisory)` over 228
changed files — the same verdict, the same count and the same eleven advisories
as this worktree. That is Part 2 item 6 demonstrated by hand; it is still not a
test, and the conformance row still says so.

**Also repaired: S08a wrote its retention ref locally and never pushed it.** The
ledger's promise is that another participant can fetch a checkpoint; a ref in one
working copy is orphaned by the same push it exists to survive. `19` is now on
the remote, and the concept note says the property is remote rather than local.

### S08c — Read the gate instead of a run that resembles it — **COMPLETE**

```cairn-unit
step: S08c
unit: 21
type: repair
verified: cairn-check, cairn-check:test, typecheck, test, build
```

The owner installed the GitHub CLI, so this machine can read the CI runs it had
been reasoning about. The first thing that reading produced was a correction to
two documents this path wrote, including the one S08 reads first.

**S08b is green in CI, and the run matches the local simulation exactly** —
`3b40648`, both jobs `success`, `cairn-check — branch path/cp-ops-002, base
origin/master (flag), 228 changed file(s)`, `OK — protocol satisfied (3
advisory)`, the same three advisories in the same words. The namespace fetch step
pulled twenty-six refs. So the S08b claim, which was made from a reproduced
checkout rather than from CI, holds as stated.

**What the runs corrected.** The S08 opening brief said the branch had been *red
in CI for many pushes* and then, under *What it is currently hiding*, listed
eight blocking and one inconclusive finding on `CP-MVP-008.md`. CI never reported
those. Its command passes `--previous`, which forward-scopes the record rules to
the pushed commit, and `CP-MVP-008.md` had not changed — so those rules never
evaluated it there. The nine findings were the **local** branch-versus-trunk
run's, and the brief silently promoted a local measurement to a claim about CI.

The real cause, on every red run, was `checkpoint-retention`:

```text
6dd7fb2   2026-08-26T21:25Z   success     — one work unit declared: nothing to ask
9627ef7   2026-08-27T08:57Z   failure     — a second unit appears; the rule fires
...       ten consecutive failures across five days
1090ead   2026-08-31T11:36Z   failure     — S08a; still retention
3b40648   2026-08-31T12:56Z   success     — S08b lands the fetch
```

`6dd7fb2` is the sharpest part and it was nearly missed. It passed because the
path record declared exactly **one** work unit, and the newest unit is exempt, so
`retentionDue` returned nothing and the rule had no question. One commit later a
second unit appeared and it went red immediately. **`checkpoint-retention` never
produced a true verdict in CI over its whole life** — vacuous while it had no
question, wrong from the moment it had one. A green run is not evidence a rule
works; it is evidence the rule did not object, and those are different sentences.

**Corrected in place, with the correction visible.** The S08 brief and the
`gate-parity` concept note are `docs/` documents, not session, audit or journal
records, so record immutability does not apply — S07u settled that contrast:
mutability, not wrongness, decides whether an error is edited or annotated. Both
carry an explicit dated correction rather than a silent rewrite, and the brief's
pin is refreshed in `governs:` here and in the handoff brief.

The `gate-parity` note also said of the base-selection break that *nothing exotic
is involved: no detached ref, no CI-only condition.* True of that break, and it
read as a claim about the branch, on which a CI-only condition was in fact
running the whole time. The note now carries both breaks side by side, because
they are indistinguishable from a green local run and share nothing else.

**The method, not just the fix.** Every parity claim in this path before today
was made from a checkout built to resemble CI. The resemblance was good — S08b's
simulation was exact — but *resembling* the gate is what the brief did when it
attributed CI's redness to a local run's findings. `gh run view --log` is now the
source for any statement about what CI reported, and the handoff brief says so.

### S08d — Make the protocol's own weight a constraint it can be measured against — **COMPLETE**

```cairn-unit
step: S08d
unit: 22
type: decision
verified: cairn-check, cairn-check:test, typecheck, test, build
```

Owner directive, after the ledger-boundary question turned into a design one:

> "the optimizing of the weight of protocol context should be the MAXIM of the
> protocol, always trying to make it the lighter possible by using slicing and
> indexing on every part and every artefact."

Decision only — [`ADR-020`](../../docs/adr/ADR-020-protocol-context-weight.md),
`proposed`. No checker rule, no migration, no concept article. The v0.2 sequencing
holds: the specification is corrected first so the tooling has a correct target,
and a matrix row that lies about a mechanism is the failure this path exists to
remove.

**What the measurement changed about the proposal.** The owner's sketch was to
slice steps into files from step 1 rather than roll them up later. Measuring the
file first found that this fixes the smaller half:

```text
  3252  ## Work Ledger          <- largest section, and not a step
  1115  ### S07r      1057  ### S08a      937  ### S07q
 11869  TOTAL
```

The Work Ledger is 42 rows, three of them added in one day, and nearly every row
is a fact about **one step** — `Gates at S08a`, `Widening (S05)` — held in the
parent because the parent used to be the only file. Its largest row restates the
step index five hundred lines above it. Slicing steps leaves all of it behind. So
the ADR takes the further step the sketch implied: the ledger **dissolves** into
the steps it describes, and what stays is a live header that does not grow.

**Two findings the owner raised, both verified rather than accepted.**

*The entry chain is protocol wearing a host wrapper.* `bedrock 22`'s body is
~1,950 tokens with exactly **one** host-specific line, under ~575 tokens of host
frontmatter. `paths.md` is ~5,300 with roughly 300 host-specific. `bedrock 00` is
entirely the product's constitution — *north star*, *product promise*, *founding
invariant* — and `AGENTS.md` puts all 1,384 tokens of it in front of every first
session, where none of it changes how a path executes. Stronger than the owner
put it: not "mostly host", but protocol plus a wrapper, plus one document that
should not be in a protocol read at all.

*The same text behaves differently in different harnesses.* Named here as
**instruction parity** — one protocol text, one repository state, the same
workflow whoever reads it. The reader-side twin of
[gate parity](../../docs/cairn/specification/concepts/gate-parity.md), and a
distinct concept rather than a second half of it: gate parity breaks on an
environment value, instruction parity breaks on the document's own volume and on
instruction interleaved with rationale. Neither implies the other. Its three
mechanisms are the three findings above, which is why the ADR treats them as one
problem.

**The test is separation, not a budget** — and that choice came from this path's
own week. The brief budget blocked all three of S08a/b/c, and each time the fix
was to shorten prose. That is what a budget teaches. A budget is satisfiable by
compression, and compressing an explanation is how a record begins to say
something slightly untrue, which is the failure eight units here have corrected.
Separation moves the words instead of cutting them.

**Two things deliberately not done.** The `instruction-parity` article is not
written: the concept wiki is at its hard cap of 71, pinned by a test, and that cap
exists to make vocabulary growth a visible decision — spending it as a side effect
of needing one more word is the erosion it guards. And the OKF question was
settled *against* the position drafted first: a proposal that a path folder earn
its `log.md` was overruled by the owner, correctly. Uniform structure is cheaper
than optimal structure for a reader doing lookups, because it removes the question
"does this folder have one?". Checked rather than assumed — the folder logs are
live, with 8 commits on `docs/cairn/log.md` and 5 on `coding-paths/log.md` since
the S05c seed.

### S08e — A cap that has never bound is a count, not a constraint — **COMPLETE**

```cairn-unit
step: S08e
unit: 23
type: decision
verified: cairn-check, cairn-check:test, typecheck, test, build
```

Owner question on the ADR-020 draft: *"why do we need an hard cap in concept wiki
folder?"* Checked before answering, and the history answers it:

```text
cap=66   actual=66    S07g  2026-08-26   set
cap=67   actual=67    S07o  2026-08-27   raised by one
cap=71   actual=71    S07q  2026-08-31   raised by four
```

**It has never once bound.** Every time it would have blocked it was raised to
exactly the new count — so it is not a cap, it is the current count restated as an
assertion. The four merges at S07g happened because an author chose to merge; the
cap has never caused one. Its motivation survives and its mechanism does not.

Three reasons, and each is a rule this path already wrote:

1. It fails the **admission test for blocking rules** — *objectively checkable AND
   breaking it leaves something wrong in the repository, not merely
   unconventional.* A further concept is not wrong.
2. It is the pattern **S08a removed** five units ago: a test hard-coding a value
   that legitimately changes turns every honest update into a test edit, and so
   teaches an editor to change the test rather than check the claim. The cap's
   history is that prediction confirmed three times. The parallel should have been
   noticed when S08a was written.
3. It can be satisfied in ways that make the wiki **worse**: the cheapest way to
   fit a new concept under a fixed count is to merge two unrelated articles, which
   breaks the one-idea rule. The metric holds while the thing it protects degrades.

And ADR-020 itself makes it measure the wrong quantity. The cap counts the
**corpus**; the maxim measures what a **reader must consume**. A hundred
well-indexed articles where a reader opens four are cheaper than seventy-one where
they open twenty — so article count is a `proxy-predicate` for *can a reader hold
this protocol in mind*, and the broader condition, which is the usual direction of
that error. Slicing and indexing produce more files deliberately; a rule counting
files fights the maxim it now sits under.

**Replaced, not deleted** — the concern is real and the gradient is one-way.
Advisory when the count grows, naming the article added, so growth stays a visible
decision. Blocking on an **orphan**: a concept note nothing links to is a real
defect, because nobody needed the word, and its breach leaves a page nothing points
at. Measured before proposing it: **0 of 71 are orphans.** The wiki is healthy, the
cap was not what kept it healthy, and the orphan rule is what would notice if the
authoring discipline slipped.

`ADR-020` is amended in place rather than superseded: it is still `proposed` and
has had no ruling, so there is no decision to correct — only a draft to improve
before it is read. Decision 2 loses the budget paragraph, decision **2b** carries
the retirement, and three alternatives are recorded including the first draft's
own position.

### S08f — The sentence defining instruction parity failed it — **COMPLETE**

```cairn-unit
step: S08f
unit: 24
type: repair
verified: cairn-check, cairn-check:test, typecheck, test, build
```

Owner, on the ADR-020 draft: *"I still dont understand of what index you are
talking about, it is a specific OKF terms, are you using it as illustration?"*

Yes, and that was the defect. The test read *"the must-do is the index; the why is
linked"*, using **index** to mean *the part a reader must read* — while `index.md`
is a specific OKF artefact, a **folder's** map read before opening many files
([bedrock 26](../../docs/bedrock/26_26-okf-agent-context.md)). One word, two
meanings, in the sentence that defines a property about two readers reading one
text the same way. It is an instruction-parity failure inside the definition of
instruction parity, and it is recorded rather than quietly corrected because that
is the whole point of the property.

The two ideas coincide in one case and diverge in the other, which is what the
metaphor hid. A path folder's `index.md` *is* its required reading — a
consequence. But `paths.md` is a single file with no `index.md` at all, and it
satisfies the test by moving rationale into linked documents while remaining one
file. A rule phrased around `index.md` would not have applied to it.

The test now names its halves so the protocol can say which one it means:

```text
normative content    what a reader MUST do          required reading
explanatory content  why it is so                   linked, read on demand
```

**Owner ruling, same message:** *"i agree with no more token counts."* Recorded in
decision 1 and in the alternatives, so the rejection of a token budget is now a
ruling rather than this path's reasoning.

That ruling has a consequence the ADR names instead of absorbing: `brief-schema`
enforces `budget_tokens: 1200`, blocking, and that is a token count. It carries
the defect — five refreshes blocked in one day, four answered by shortening prose.
It is also **not** the concept cap: that counted a corpus, this counts one
required-reading artefact, which is exactly the quantity the maxim cares about. A
bound on required reading is far more defensible than a bound on how many things
exist. Both readings are written down, neither is taken, and it is flagged as
needing an owner ruling. Deciding it quietly in either direction would be the
worse outcome.

### S08g — Accept ADR-020, and retire the two token counts it argues against — **COMPLETE**

```cairn-unit
step: S08g
unit: 25
type: repair
verified: cairn-check, cairn-check:test, typecheck, test, build
```

Owner ruling: *"remove it and validate the adr."* Both done, in one unit, because
the ADR's own migration stage 1 is what the removal belongs to.

**`ADR-020` is `accepted`** — frontmatter and body `Status:` together, index row
updated. Its open question becomes **decision 6**: the brief's `budget_tokens`
was put to the owner with both readings and ruled on the same day. The case for
keeping it was real — the concept cap counted a *corpus* while this counted one
*required-reading artefact*, exactly the quantity the maxim cares about. What
decided it was behaviour, not principle: five firings in one day, four answered by
rewriting sentences shorter, including one that dropped what a predicate operates
on and that a test pins it. The sentence got shorter and said less than the truth.

**Stage 1 landed in full.**

- `budget_tokens` removed from `BRIEF_FIELDS`, from `briefErrors`, from the
  specification, the brief reference, the configuration surface, the conformance
  checklist, the `handoff` concept and both live briefs. `BRIEF_FIELDS.length` is
  pinned at 9 with a test asserting the field is gone.
- The concept cap assertion is deleted from the specification suite, replaced by
  two rules in `cairn-check` where the other catalogue rules live:
  **`concept-orphan`** (blocking) and **`concept-growth`** (advisory, diff-scoped
  like `ledger-size`, for the same reason — it speaks to whoever is adding a word).
- The `instruction-parity` article is written, and the wiki is at 72.

**The orphan rule caught its own article before anything else did.** Writing
`instruction-parity.md` and adding it to the wiki index left it *blocking*: the
index lists everything by construction, so counting it would make the rule
unfailable, which is the defect it replaces. It passed only once the normative
directive linked it — the *link, don't redefine* doctrine enforced on its first
new concept, by a rule that had existed for twenty minutes.

**A loophole closed by measuring first.** The first reading counted a link from
any document except the wiki index — which would let two mutually-linking orphans
pass, since a word reachable only from other words is a word the protocol never
needed. The strict reading counts only links from **outside the wiki**. Before
choosing it: all 71 pre-existing concepts already satisfy it, so the tightening
fails none of them and is not merely severe.

**Fixtures.** Three pure ones for `orphanConcepts`, `addedConcepts` and
`namesForReading`, plus an end-to-end adversarial check: a crafted orphan note was
added to the real wiki, the real checker blocked with the rule named, and removing
it returned `OK`. `addedConcepts(null, …)` returns `null` rather than an empty
list — the S08b lesson applied where it would otherwise have recurred, since an
unreadable previous state is not evidence of no growth.

### S08h — The two live trunk defects: one was already fixed, one had no rule at all — **COMPLETE**

```cairn-unit
step: S08h
unit: 26
type: repair
verified: cairn-check, cairn-check:test, typecheck, test, build
```

S08 Part 1 items 1 and 2, taken together because they are one class: the
merge-time guards did not guard.

**Item 1 needed no work, and saying so is the finding.** `hasCeremony` on this
branch already reads the `ceremony:` frontmatter key through
`ceremonyFromSessions`, and the adversarial fixture the S08 brief asked for
already exists — *an opening check is not a closing ceremony*, plus a second
pinning that a note about `CP-MVP-0010` never satisfies `CP-MVP-001`. The defect
is live **on the trunk**, where `hasCeremony` still matches filenames, and it is
repaired by merging this branch rather than by writing anything.

The brief and this ledger both listed it as the next unit to implement. Checking
before writing found it done. Recorded because the alternative — reimplementing
what exists to make a plan come true — is how a ledger starts describing work
that did not happen.

**Item 2 was real.** No predicate asked for the merge-time journal entry.
`same-work-unit` fires when *source* changes without a module note or ledger, and
a closing unit changes neither, so nothing asked. `journal-entry` now fires when a
path record **reaches** `done` in a change and no entry declares it.

Four decisions inside it, each one this path has learned:

- **It reads `atomik.path`, not the filename.** The convention does encode the id
  in the filename and matching that would have been easier — and wrong in exactly
  the way `hasCeremony` was wrong. A file that exists is not a file that says
  anything. A fixture pins it: an entry with no declaration proves nothing.
- **It binds the transition, not the corpus.** A sweep would fire on ten
  historical paths that merged before the convention; draining those is a
  migration, not a repair. A path already `done` is not asked twice, so editing a
  closed record does not re-raise it.
- **An unreadable journal is inconclusive, not a pass** — the S08b lesson applied
  where it would otherwise have recurred.
- **No migration exemption**, and this one nearly went the other way. `CP-OPS-002`
  is in `V02_MIGRATION_PATHS`, so the first implementation only *advised* on this
  path's own closure — the path that built the rule. The exemption excuses records
  predating the acceptance schema, where the missing fields are a signature nobody
  can honestly supply now. A journal entry is written at merge time by whoever
  merges: every listed path can produce one, so exempting them is a bypass rather
  than a migration. A fixture pins that a listed path still owes its entry.

**Verified by mutation and end to end.** Disabling the transition test fails
exactly its own two fixtures and nothing else. Flipping this path's own record to
`done` in the working tree made the real checker print the real blocking finding;
reverting cleared it. The conformance row moves to `implemented`, and the status
vocabulary in the row test gained `**implemented**` — a row reaching the strongest
status must not fail the test that only asks it to state one.

### S08i — Two rules that read a name instead of a fact — **COMPLETE**

```cairn-unit
step: S08i
unit: 27
type: repair
verified: cairn-check, cairn-check:test, cairn-spec:build, typecheck, test, build
```

S08 Part 1 items 3 and 3c. One asks whether a rule may read the name of the
branch it happens to be sitting on; the other asks whether a record may be
trusted about its own date. Both were listed as separate items and both turned
out to be the same substitution this path keeps finding — *a name stood in for a
fact* — so they land together.

**Item 3 needed a deletion, not a key.** `derived-view` skipped itself when the
branch matched `path/*`. `actions/checkout` detaches, so CI's branch was `HEAD`
and the rule ran there: CP-UI-TYPOGRAPHY S04 was green locally and red in CI, one
tree, one command. The recorded plan — carried in the ledger, the brief and the
conformance matrix since S07q — was to key the exemption on the path's declared
`status` instead, which would have satisfied [gate parity](../../docs/cairn/specification/concepts/gate-parity.md)
because a status lives in the tree.

It was still unnecessary, and that is the finding. The generated view is
*already* a pure projection of the statuses declared in this checkout, so a tree
can only disagree with it when something in that tree moved a status without
regenerating. A path branch that has moved nobody's status is current for free —
exactly what the exemption was protecting — and a path setting its own
`status: done` at closure is caught, which is what it was hiding, because under
self-merge that path is the last writer of the view. **The exemption is deleted,
and nothing replaces it.** When a predicate branches on where it runs, the first
thing to look for is the branch that does not need to exist.

**Item 3c is a rule the brief's own candidate could not have caught.** The
proposal was: a record's filename date MUST equal its frontmatter `timestamp:`
— *"cheap and sound, it compares two things the author wrote, so the checker
never needs to know what day it is."* Measured against the defect that motivated
it, before writing anything:

```text
sessions/2026-08-27-cp-ui-typography-opening-check.md   filename 08-27  ts 08-27  added 08-27
sessions/2026-08-27-cp-ui-typography-closing-ceremony.md filename 08-27  ts 08-27  added 08-31
log/2026-08-27-cp-ui-typography.md                       filename 08-27  ts 08-27  added 08-31
```

The two author-written dates **agree on every one of them**, including the two
that are false. A corpus sweep of all 67 dated records found zero disagreements.
The candidate rule would have shipped, reported OK forever, and closed the
finding it was written for — a proxy predicate delivered as the repair for proxy
predicates.

So `record-date` is two halves, kept apart and levelled differently:

- **blocking — the two dates the author wrote must agree.** Sound, clock-free,
  and worth having: when they differ one of them is false. It is a proxy, it is
  labelled a proxy in the code and in the specification, and it is not claimed to
  prove the date.
- **advisory — the record's date against the AUTHOR date of the commit that
  added it.** The only evidence the author did not supply, and the only half that
  separates the three CP-UI-TYPOGRAPHY records above. Author date, never
  committer date: a rebase rewrites the second and preserves the first, and a
  rebase before merge is mandatory here.

Advisory is not timidity. A note taken on one day and committed two days later is
dated *correctly*, so a rule insisting the two agree would block a true record
and teach the author to write a false date to pass a gate. The evidence is
objective; the inference from it is a judgement, and a judgement does not fail a
build. One day of slack absorbs two timezone conventions naming adjacent days for
one moment.

**Scoped to records the change ADDS.** Never a sweep: an existing record may not
be edited, so a rule that demanded one be fixed would make the repair the
violation. Immutability protects a record from being changed later; it says
nothing about a record that was wrong when it was written, and those two are easy
to confuse because both are about trusting a file.

**Verified by mutation, all four behaviours, against the real checker on this
branch:** a stale `ACTIVE.md` block on `path/cp-ops-002` now FAILS on
`derived-view` where it previously passed; a record whose filename and
`timestamp:` disagree FAILS; the same record committed with a 12-day gap raises
the advisory and keeps the run green; an uncommitted record with agreeing dates
raises nothing, because there is no third date yet and inventing one from the
clock is what this rule refuses to do.

`AGENTS.md` joined `writes:` for one line: the mechanical contract announced
*"8 blocking rules, 5 advisory"* while the catalogue holds 29 and 22, and this
unit made it staler. Replaced with a phrase that cannot drift, which is also what
[ADR-020](../../docs/adr/ADR-020-protocol-context-weight.md) decided about counts.

### S08j — A rebase gives one unit two ids, and the namespace has one slot — **COMPLETE**

```cairn-unit
step: S08j
unit: 28
type: documentation
verified: cairn-check, cairn-check:test, cairn-spec:build, typecheck, test, build
```

S08 Part 1 item 4, and the item itself said how to take it: **an ADR before it is
code**. [`ADR-021`](../../docs/adr/ADR-021-checkpoint-retention-generations.md) is
that ADR, `proposed`, with no predicate changed.

**The measurement came before the design, and it moved the design twice.** The S08
plan carried one number from the S08 opening brief — *13 refs, 41 commits in
range, 0 intersecting, gate `OK`* — and dropped the clause the brief had put
around it, *"measured on this branch immediately after its rebase"*. Re-running it
on `cec817b` found the branch had moved on:

```text
  55  commits in the checker's range (base_commit 7aa3b1d..HEAD)
  27  retention refs for this path
  14  refs naming a commit on the branch          (units 14-27)
  13  refs naming a commit that is NOT            (units 01-13)
  41  commits below the judged floor - 75% of the range
   0  orphaned commits reported.  Gate: OK
```

Fourteen refs now intersect, so `findIndex` succeeds and the total-blindness case
the brief described is not what this branch is in. It is in the *partial* one,
which is worse to find and identical to hold: the floor lands at index 41, the
rule judges the newest fourteen commits, and forty-one commits — including every
rebased copy of units 01-13 — are judged by nothing. Every one of those thirteen
copies is on the branch and retained by no ref, matched by subject to the ref
that was orphaned:

```text
01  e787174 -> 53b11f0 on branch, retained by no ref
...
13  ba04251 -> 6adc217 on branch, retained by no ref
orphan refs with a live rebased copy: 13; without: 0
```

The next rewriting push makes thirteen completed checkpoints unreachable, which
is the one thing retention exists to prevent, and the gate has said `OK` about it
since 2026-08-31.

**The 41 split three ways, and the split is the design.** Eighteen are steps
S00-S07e, which predate retention entirely and are correctly below any floor —
that is the job `findIndex` was doing right. Thirteen are the rebased copies, the
defect. **Ten are other paths' commits**, six of them CP-UI-TYPOGRAPHY's, retained
under its own path id and swept into this path's range because the range floor is
the declared `base_commit`. That is a second substitution found while measuring
the first: `base_commit` is where the path was *registered*, and after a rebase
the path's own commits begin at the trunk tip instead. A name standing in for the
fact it resembles, for the ninth time on this path.

**Git decided the notation, not preference.** A generation segment named with an
ordinal collides with the flat unit refs already pushed, because a ref cannot be
both a leaf and a directory:

```text
$ git update-ref refs/cairn/probe/01     HEAD
$ git update-ref refs/cairn/probe/01/14  HEAD
fatal: cannot lock ref 'refs/cairn/probe/01/14':
       'refs/cairn/probe/01' exists; cannot create 'refs/cairn/probe/01/14'
```

Hence `g<NN>`. The probe refs were created and deleted inside the measurement and
no retention ref was read, written, or moved at any point in this unit.

**What the ADR decides**, in one line each: a retention ref names a generation
(`.../g<NN>/<n>`); the current generation is the highest one all of whose refs are
ancestors of the tip, *derived* rather than stored; opening a generation is a step
of the rewrite; an empty current generation beside older ones is blocking and
definite, distinct from an empty namespace, which stays inconclusive; the range
floor is `merge-base(trunk, HEAD)`; and a declared unit resolves in the current
generation, while older ones answer what the ledger row was verified against.

**Nothing was implemented, and the reason is a measurement too.** Decision 5 —
the range floor — looks independent of generations and was checked for landing
alone. With the floor at the merge-base, 31 of this path's 45 commits report as
unretained, all 31 are genuine completed steps with no provisional trailer among
them, and until generations exist there is no conforming way to retain a single
one: the flat slot for each is taken by the pre-rebase commit, which may not be
moved. It would have shipped as a red gate with no green move available, which is
how a team learns to switch a gate off.

### S08k — Accepted, implemented, and the branch given a generation — **COMPLETE**

```cairn-unit
step: S08k
unit: 29
type: implementation
verified: cairn-check, cairn-check:test, cairn-rules, cairn-spec:build, typecheck, test, build
```

Owner ruling on [`ADR-021`](../../docs/adr/ADR-021-checkpoint-retention-generations.md):
**accepted**. The ADR, its predicates and the `g01` migration land together,
because they are one change — the checker looks for `g<NN>` and this branch had
none, so either half alone is a red gate with no green move, which is the exact
reason S08j declined to land the range floor early.

**What the predicates do now.** `retentionGenerations` splits a path's refs into
generations and reports pre-notation refs *apart* rather than reclassifying them.
`currentGeneration` derives the current one from ancestry. The per-unit check and
the newest-unit advisory both name it, `unretainedCheckpoints` judges it, and the
range floor moved from the declared `base_commit` to `merge-base(trunk, HEAD)`.

**The one-line change that was the whole defect:**

```diff
   const oldest = commits.findIndex((commit) => retainedSet.has(commit))
-  if (oldest === -1) return []
-  return commits.slice(oldest)
+  return commits.slice(oldest === -1 ? 0 : oldest)
```

A retained set that does not touch the branch is not an absent subject; it is a
branch on which nothing is retained. The floor existed to spare history older
than the convention, and under decision 5 that history is outside the range
already — so the guard had nothing left to protect and one thing left to hide.

**An ambiguity was found while implementing, and the text was sharpened before
the rule was enforced.** Decision 2 said *"the highest-numbered generation all of
whose refs are ancestors of the tip"*. That is the same sentence as *"the highest
generation present, if all of its refs are ancestors"* whenever generations open
in order — always, under this protocol — and a different one when they do not:
with an open `g03` under a closed `g05`, the first selects `g03` and writes new
ordinals into a generation older than one already closed. Retention continues
*after* the last generation. The ADR carries the operative sentence and a dated
note saying which reading was taken and why; correcting an accepted decision
after it has shipped would have been the more expensive half of this.

**A third verdict state, because two were doing the work of three.** An unfetched
namespace and an unreadable branch range are missing evidence and stay
inconclusive. A current generation that is empty *beside older generations* is
not missing anything — the namespace was read, the rewrite is visible in it, and
nothing has been retained since. Blocking, definite, and carrying the move:
*open `g<NN>` by retaining every completed commit of this branch, and move no
existing ref.*

**`g01` opened on this branch: 28 refs, nothing moved.** The migration script
refuses to write at all unless every unit resolves to a distinct commit and no
commit above the floor is left uncovered, and it refuses to overwrite an existing
ref. Units 01–13 are the rebased copies matched to the orphaned flat refs by
subject; 14–28 were already on the branch.

```text
g01/01  53b11f0  rebased copy of e787174
...
g01/28  6d92077  already on branch
floor 53b11f0 at index 18/46; uncovered commits above the floor: 0
flat refs before 28, after 28
```

The eighteen commits below the floor are steps S00–S07e, which predate retention
and stay below it. Seven adversarial fixtures were added (214 → 221), each
asserting `checkpoint-retention` by name: the pre-notation split, the three
generation states, the `-1` regression with its measured history in the comment,
the flat-refs-only migration message, a rewrite closing a generation, a unit
resolving in the current generation rather than an older one, and an unreadable
range reporting inconclusive.

### S09 — Greenfield pilot, coherence audit, closing ceremony, self-merge

Initialize one real ex-nihilo repository from the kit — the research-paper workspace the
brief names — and fix what the pilot finds before merging.

## Documentation coverage

**Required:** `paths.md`, bedrock 22/24/26/35, ADR-009, ADR-012,
`docs/cairn/cairn-audit-2026-08-24.md`.
**Conditional:** bedrock 17 (self-evolving docs) at S07; ADR-011 at S05.
**Deliberately excluded:** all `apps/` module notes — this path writes no product code.

## Work Ledger

| Field | Value |
| :-- | :-- |
| Status | `running` on `path/cp-ops-002` |
| Base commit | `7aa3b1d` — registered on the trunk by `df875e6` before this branch existed |
| Branch | `path/cp-ops-002`, worktree `../4tom1k-cp-ops-002`, `node_modules` symlinked |
| Steps complete | **S00** — enforcement repairs adopted (`dd6e76a`) · **S01** — ceremony schema pinned, D1 corrected, registration doctrine unified, ADR-016 (`c4a9670`) · **S04** — ledger boundary, CP-MVP-008 rolled into `history/`, advisory `ledger-size` (`7e04288`) · **S05** — five indexes, ADR frontmatter, schema validation over the decision plane (`3df9073`) · **S05b** — the opening check gated, five more indexes (`d6b29f1`), the invented folder-log decision retracted on owner correction (`360f2be`) · **S05c** — the OKF pair completed: eighteen folder logs seeded from real Git history (`468bc24`) · **S06** — `index.html` rewritten against ADR-012, both HTML pages dated (`2a5ef35`) · **S06c** — the coherence audit bound to the commits its path contributed (`de4e0fa`) · **S06d** — the six stale worktrees and the orphan registration branch drained, `isFilled()` given something to measure, and a C-quoted path stopped hiding from the blocking rules (`9cbe605`, `6fa33e7`) · **S07a** — ADR-017 settles the path lifecycle; `active` retired, abandonment given a door, staleness noticed without blocking (`b4ef361`) · **S07 / S07b / S07c / S07d** — superseded specification attempts retained in this ledger · **S07e** — one canonical top-down specification project, linked newcomer foundations and implementation references, plus one self-contained three-pane universal reader · **S07f** — candidate-bound closure, truthful team lifecycle, the canonical concept wiki and the deterministic equal-pane universal reader, passed by the user and landed as its own checkpoint · **S07g** — the Cairn v0.2 revision: nineteen review items resolved in normative text, concept budget held at 66, ADR-019 proposed |
| Remaining | S08 and S09; the pilot re-run gates any further brief-schema change (S03 withdrawn by owner ruling; S06b rescoped across S07 + S08 by ruling 9). S08 now also owns the v0.2 predicates: fourteen conformance rows say `not implemented` on purpose |
| Opening check | accepted 2026-08-24, eight rulings ([note](../sessions/2026-08-24-cp-ops-002-opening-check.md)) |
| Gates at S07e | `cairn-check` OK (1 advisory: no coherence audit for this head, expected before merge) · validator suite 90/90 · canonical catalogue generator current · HTML structure parser-validated · self-contained/targets/rules/inline-script contracts test-pinned · `npm run typecheck` PASS · product suite 1,101 passed / 1 skipped (1,102 total) · `npm run build` PASS |
| Ledger rolled (S07c) | `ledger-size` fired at ~11 k tokens against the 10 k budget while this file was being edited — which is the only moment the rule is useful, and it worked. S00, S01, S03, S04, S05 (+S05b, S05c) and S06 (+S06b, S06c, S06d) moved **verbatim** into [`history/`](./history/index.md), leaving one index line each. Verified by extracting each record's body and confirming it appears unchanged in `HEAD`. Two mechanical adjustments are named in every record header rather than made silently: deixis is left alone, and relative-link depth is repointed one level, because a link is an address rather than content and the same target must keep resolving |
| Scope note | protocol tooling and doctrine only; no product code changed. The full `typecheck`, product `test`, and production `build` gates were nevertheless run and passed at the completed-step boundary |
| Widening | `writes:` gained `atomik-project/briefs/cp-ops-002-handoff.md` at S01 — the per-step handoff brief is required by bedrock 22 and the original declaration simply omitted it. **Widened again at S06d** to `atomik-project/briefs/**`: F7's residue lives in that folder, and `scope-drift` said so the moment the owner ruled on `feedback on  MVP-001.md`. Recorded here and kept going, which is what `paths.md` asks of a widening |
| Widening (S07e) | `writes:` gained `tools/cairn-spec.test.mjs`: the universal reader's tree, contextual-note bindings, embedded rule catalogue and inline interaction code need an executable contract, and the original declaration could not name a file invented by this correction |
| Candidate (S07f) | **Passed by the user on 2026-08-26 and landed.** Implements exact-candidate audit/acceptance, `ready` versus trunk `done`, transition and registration-parent comparison, fail-closed inconclusive gates, forward-scoped immutable records, canonical/unique path identity, live blocked/ready projection, full-hash audit names, all guarded source roots, the canonical concept wiki/reference project, and the deterministic equal-pane universal reader. Cairn remains team-oriented, path-self-integrating through a declared transport, and remotely resumable at every completed checkpoint |
| Gates at complete S07f candidate | `npm run cairn-check:test` PASS, 118 protocol/specification subtests · generated Markdown and HTML rule catalogues current · all Markdown/wiki/tree/anchor targets resolve · universal HTML deterministic, self-contained, equal-pane, independently scrollable, live-routed and script-parse checked · `git diff --check` PASS · `npm run cairn-check` OK with one expected regenerated-`ACTIVE.md` advisory · `npm run typecheck` PASS · product suite 78 files, 1,101 passed / 1 skipped · `npm run build` PASS |
| Widening (S07f) | `writes:` gained `tools/cairn-active.test.mjs` for blocked/ready live-path projection; `tools/cairn-spec-build.mjs` for deterministic Markdown-to-universal-HTML generation; and `package.json` for the explicit `cairn-spec:build` command |
| User review rule (S07f) | If a delivery is meant to be tested by the user, it remains an uncommitted, unpushed candidate until the user explicitly passes it. After that pass, commit and immediate push form the completed remote checkpoint |
| Corrections (S07e) | **2026-08-25, owner** — S07c and S07d superseded. Two differently directed documents shared one design system instead of receiving a new pedagogical one; the downward version reduced Cairn to foundations instead of specifying Cairn top down and explaining foundations when first manipulated. Replaced by one canonical, history-free specification project and one universal three-pane reader; no alternate normative reading remains |
| Corrections (S07f specification) | **2026-08-25/26, user** — research-paper restraint replaces the artful study-desk design; precision replaces decorative artifice; every specialised IT or Cairn concept receives its own wiki article; the second reading pane is a peer object surface, not subordinate help; and the learning route builds simple ideas into complex protocol behaviour instead of presenting a cryptic downward taxonomy. The reviewed protocol corrections are integrated only after that information architecture |
| Second inspection (S07f) | **2026-08-26, user** — preserve the large visual improvement, but introduce or link every abstract term before use; make “the complete protocol” readable rather than cryptic; compare the repository map with the current Cairn repository and make it exhaustive; repair pane scrolling and cross-pane wiki loading; remove section gutters; and add only a restrained frozen-glass modernity to the flat research aesthetic. Implemented in the same uncommitted candidate; a fresh inspection is required |
| Gates at S08a | `npm run cairn-check` OK (11 advisory, all pre-existing: nine grandfathered `CP-MVP-008` findings and two `single-truth` notes) — and this is the FIRST verdict in this ledger taken against the trunk by default rather than against `HEAD` · `npm run cairn-check:test` PASS, 197 subtests (193 → 197) · `npm run cairn-spec:build` deterministic · `npm run typecheck` PASS · product suite 79 files, 1,109 passed / 1 skipped · `npm run build` PASS |
| Verification caveat, retroactive (S08a) | Every `cairn-check` row above this one recorded the working-tree-versus-`HEAD` verdict, because that was the default. Those rows are not false — the command ran and printed what they say — but they are **narrower than they read**, and on this branch that difference was 0 changed files against 228. Recorded here rather than edited into each row: a record is corrected by a later record. |
| Gates at S08b | `npm run cairn-check` OK, 11 advisory · **and the same verdict in a CI-shaped clone**: 228 changed files, `OK — protocol satisfied (11 advisory)`, identical list · `npm run cairn-check:test` PASS, 198 subtests · `npm run cairn-spec:build` deterministic · `npm run typecheck` PASS · product suite 79 files, 1,109 passed / 1 skipped · `npm run build` PASS |
| Machine-local state (S08b) | Retention refs `01`–`19` for this path exist on the remote; `19` was pushed at S08b after S08a left it local. `refs/cairn/*` is fetched by no clone and no checkout action, so any environment judging retention must fetch it explicitly — now written into the workflow, the operator guide and the concept note |
| The maxim, applied on its first day (S08d) | The brief budget blocked this refresh too — the fourth in four units. The first three were answered by shortening prose, which is what ADR-020 says a budget teaches. This one was answered its way: the State section stopped retelling S08a–S08d and became four pointers to records that hold them in full. **Separation, not compression** — the words moved rather than shrank, and the section is now shorter *and* more complete. That is the test the ADR proposes, run once, on the artefact that provoked it |
| Gates at S08h | `npm run cairn-check` OK · `npm run cairn-check:test` PASS, **205** subtests (200 → 205) · `npm run cairn-spec:build` deterministic · `npm run typecheck` PASS · product suite 1,109 passed / 1 skipped · `npm run build` PASS |
| This path now owes its own journal entry (S08h) | `journal-entry` blocks `CP-OPS-002` at closure, with no exemption, by its own rule. Verified by flipping the record to `done` in the working tree: the real checker printed the real blocking finding. The entry is written in the closing unit, which is where the protocol always said it goes |
| Gates at S08g | `npm run cairn-check` OK · `npm run cairn-check:test` PASS, **200** subtests (198 → 200) · `npm run cairn-spec:build` deterministic · `npm run typecheck` PASS · product suite 1,109 passed / 1 skipped · `npm run build` PASS |
| Owner rulings (S08g) | **Remove the brief's token budget** — done, and recorded as ADR-020 decision 6 rather than as an unexplained deletion. **Validate the ADR** — `accepted`, both halves, with migration stage 1 landed in the same unit |
| Concept budget (S08g) | The hard cap is gone. 71 → **72** with `instruction-parity`; growth is now an advisory naming what was added, and an orphan blocks. The wiki's health is unchanged and is now measured by reachability rather than by a number |
| Gates at S08f | `npm run cairn-check` OK · `npm run cairn-check:test` PASS, 198 subtests · `npm run cairn-spec:build` deterministic · `npm run typecheck` PASS · product suite 1,109 passed / 1 skipped · `npm run build` PASS |
| Owner rulings (S08f) | **No token counts** as the maxim's test — ratified, recorded in ADR-020 decision 1 and its alternatives. **The `index` ambiguity** — found by the owner reading the draft, repaired by naming `normative` and `explanatory` content and stating the narrower true relationship to OKF's `index.md` |
| Open, needs a ruling (S08f) | The handoff brief's own `budget_tokens: 1200`, blocking via `brief-schema`, is a token count. Retire it for consistency with the ruling, or keep it because required reading is the one place a bound is legitimate? Both readings are in ADR-020; neither is taken |
| Gates at S08e | `npm run cairn-check` OK · `npm run cairn-check:test` PASS, 198 subtests · `npm run cairn-spec:build` deterministic · `npm run typecheck` PASS · product suite 1,109 passed / 1 skipped · `npm run build` PASS |
| Amending a proposed ADR (S08e) | ADR-020 is edited in place, not superseded. It carries no ruling yet, so nothing was decided that could need correcting — the distinction is `proposed` versus `accepted`, and it is the same distinction S07u drew for mutable versus immutable records. Once ruled on, a change of substance would need a superseding ADR instead |
| Gates at S08d | `npm run cairn-check` OK · `npm run cairn-check:test` PASS, 198 subtests · `npm run cairn-spec:build` deterministic · `npm run typecheck` PASS · product suite 1,109 passed / 1 skipped · `npm run build` PASS |
| ADR-020 (S08d) | `proposed`, deliberately. It reshapes S08 Part 4 rather than extending it — the portable/host/binding classification is what `cairn-init` scaffolds, and a shape that is wrong at adoption becomes every adopter's migration. Accepting it carries three commitments together: the `instruction-parity` article, the concept-cap decision it forces, and the `CP-OPS-002` migration as the worked example |
| Ledger boundary, superseded (S08d) | The roll queued at S08b is **not** done, and ADR-020 is why: if the path record becomes a folder, the rollup operation and its `ledger-size` advisory both disappear. Rolling now would be work performed to be undone. `ledger-size` stays advisory and stays firing — the honest state, not a suppressed one |
| Gates at S08c | `npm run cairn-check` OK · `npm run cairn-check:test` PASS, 198 subtests · `npm run cairn-spec:build` deterministic · `npm run typecheck` PASS · product suite 79 files, 1,109 passed / 1 skipped · `npm run build` PASS |
| CI, now readable (S08c) | `gh` is installed on this machine and authenticated, so CI verdicts are read rather than reproduced. `3b40648` — both jobs green, `OK — protocol satisfied (3 advisory)`, identical to the local simulation. Branch history: last green `6dd7fb2` (2026-08-26), ten consecutive `checkpoint-retention` failures through `1090ead`, green again at `3b40648`. Any future claim about what CI reported comes from `gh run view --log` |
| Records corrected (S08c) | The S08 opening brief attributed the CI redness to nine `CP-MVP-008` findings that CI never reported — they were a local branch-versus-trunk run's, promoted to a claim about CI. `gate-parity` said *no CI-only condition* while one was running. Both are `docs/` documents, not immutable records, so both are corrected in place with a dated, visible correction; the brief's `governs:` pin is refreshed here and in the handoff brief |
| Brief budget, third unit running (S08c) | The 1200-token budget blocked the refresh at S08a, S08b and S08c, each time costing real editing. That is the rule working — but three in a row is a signal about the *brief's shape*, not its size: it had become a chronicle appending one paragraph per step. S08c consolidated the three S08 units into one themed block and pruned two spent *Tried and rejected* entries. If a fourth refresh fights the budget, the answer is the ledger boundary below, not a bigger number |
| Ledger boundary due (S08b) | `ledger-size` fires at ~10.6 k against the 10 k budget, which is the rule working: it speaks to whoever is editing the file. Roll **S07q–S08b** into [`history/`](./history/index.md) verbatim at the next step boundary, leaving one index line each. Advisory and not urgent, so it is recorded rather than folded into a repair unit |
| Gates at S08i | `npm run cairn-check` OK, 14 advisory (the fourteenth is this unit's own `scope-drift` on `AGENTS.md`, declared in the same change) · `npm run cairn-check:test` PASS, **214** subtests (205 → 214) · `npm run cairn-spec:build` deterministic · `npm run typecheck` PASS · product suite 1,109 passed / 1 skipped · `npm run build` PASS |
| The planned fix was bigger than the repair (S08i) | Item 3 was recorded in three places — this ledger, the S08 brief and the conformance matrix — as *key the derived-view rule on the declared `status`*. Keying on the status would have been correct and was still unnecessary: the view IS the projection of those statuses, so the exemption had nothing left to protect. The rule now runs in every context and no key replaced it. A plan that survives three documents is not thereby the right plan, and checking before writing is the only thing that finds out |
| The proposed rule was blind to its own defect (S08i) | The S08 brief's candidate for item 3c — filename date equals frontmatter `timestamp:` — was measured against the CP-UI-TYPOGRAPHY records before implementation. All three misdated records carry the SAME date in both places, and a sweep of 67 dated records found zero disagreements corpus-wide. It would have shipped green and closed the finding without touching it. `record-date` therefore blocks on author agreement and ADVISES on divergence from the adding commit's author date, which is the only half with evidence the author did not write |
| Widening (S08i) | `writes:` gained `AGENTS.md`. The mechanical contract said *"8 blocking rules, 5 advisory"* against a real catalogue of 29 and 22, and this unit widened the gap. One line, replaced with a phrase that cannot drift — the same conclusion [ADR-020](../../docs/adr/ADR-020-protocol-context-weight.md) reached about counts. `scope-drift` reported it and the declaration moved in the same change, which is the shape `paths.md` asks for |
| A destructive probe cost the working tree (S08i) | Verifying the advisory half needs a record with a real commit date, so a probe record was committed and then removed with `git reset --hard HEAD~1` — which also discarded every uncommitted edit to `cairn-check.mjs`. Nothing in the branch was lost and the edits were rewritten, but the correct move is `--mixed`, or committing the probe alone on top of staged work. Recorded because the same reflex would eat a whole unit's work in a tree with no other copy |
| Gates at S08j | `npm run cairn-check` OK, 14 advisory (unchanged from S08i; no source file changed in this unit) · `npm run cairn-check:test` PASS, 214 subtests · `npm run cairn-spec:build` deterministic · `npm run typecheck` PASS · product suite 1,109 passed / 1 skipped · `npm run build` PASS |
| A measurement lost its date in transit (S08j) | The S08 opening brief measured *13 refs, 41 commits, 0 intersecting* and labelled it **"immediately after its rebase"** — true of 2026-08-31 and still true of that day. The step plan and the handoff brief copied the figure without the date, so it read as a property of the branch. Re-measured at `cec817b`: 27 refs, 55 commits, **14** intersecting. The branch had moved past the total-blindness case into the partial one, which is the same defect, harder to see, and would have been mis-described in the ADR if the copy had been trusted. **The brief needs no correction** — unlike the CI misattribution S08c repaired in place, it never claimed more than it measured; the copies did, and they are corrected here |
| A second substitution, found while measuring the first (S08j) | Ten of the 41 unjudged commits belong to other paths, six of them CP-UI-TYPOGRAPHY's, retained under its own path id. They are in range because the retention floor is the declared `base_commit` — where the path was *registered* — while after a rebase the path's own commits begin at the trunk tip. ADR-021 decision 5 moves the floor to `merge-base(trunk, HEAD)`; open hole 1 in `paths.md` is narrowed by it, not closed |
| Git decided the notation (S08j) | A ref cannot be both a leaf and a directory, so any ordinal generation segment collides with the flat unit refs already pushed. Verified by probe — `refs/cairn/probe/01/14` is refused while `refs/cairn/probe/01` exists — and the probe refs were deleted in the same command. Hence `g<NN>`. **No retention ref was read for content, written, or moved in this unit** |
| Deliberate non-implementation (S08j) | Decision 5 looks independent of generations and was measured for landing alone: with the floor at the merge-base, 31 of this path's 45 commits report unretained, all 31 are genuine completed steps with no provisional trailer among them, and no conforming way to retain any of them exists until generations do — each flat slot is held by the pre-rebase commit, which may not be moved. A red gate with no green move is how a team learns to switch a gate off |
| Gates at S08k | `npm run cairn-check` OK, 13 advisory (unit 28's retention advisory is gone: the ref exists) · `npm run cairn-check:test` PASS, **221** subtests (214 → 221) · `node tools/cairn-rules.mjs --write` current · `npm run cairn-spec:build` deterministic · `npm run typecheck` PASS · product suite 1,109 passed / 1 skipped · `npm run build` PASS |
| Owner ruling (S08k) | **ADR-021 accepted.** Implemented in the same unit rather than the next, because the checker looks for `g<NN>` and this branch had none: either half alone is a red gate with no green move, which is precisely why S08j declined to land decision 5 early |
| An accepted sentence sharpened before it was enforced (S08k) | Decision 2 read *"the highest-numbered generation all of whose refs are ancestors"*, which is ambiguous when generations are not opened in order — it selects an open `g03` sitting under a closed `g05` and writes new ordinals into the older one. The operative sentence is *the highest generation present, if all of its refs are ancestors; otherwise the next number*. Changed in the ADR with a dated note naming both readings, at acceptance rather than after shipping |
| `g01` opened, nothing moved (S08k) | 28 refs from `53b11f0` upward, units 01–13 being the rebased copies matched by subject to the orphaned flat refs. The script refuses to write unless every unit resolves to a distinct commit and no commit above the floor is uncovered, and refuses to overwrite any existing ref. Flat refs: 28 before, 28 after. The eighteen commits below the floor are S00–S07e, which predate retention |
| Next action | **ADR-020 stage 2** — the `CP-OPS-002` folder migration, which supersedes the queued ledger roll and is what `ledger-size` has been advising about at ~19.9 k tokens. Then stages 3–5 (the checker's shape, the artefact classification, `cairn-init`), and S08 Part 2 — an adversarial fixture for every blocking rule, the two-context gate-parity test, and the generated conformance matrix. `cairn-init` must scaffold generation-aware retention from the start: a flat namespace handed to an adopter is a migration handed to an adopter |
| Superseded next action (S08j, ruled) | **Owner ruling on [ADR-021](../../docs/adr/ADR-021-checkpoint-retention-generations.md).** If accepted, the implementing unit lands the six decisions together — the `g<NN>` namespace, the derived current generation, the three-state verdict replacing `findIndex → -1`, the merge-base floor, generation-scoped `retentionDue` — amends the `checkpoint-retention` concept note, and opens `g01` on this branch by retaining every completed commit from `53b11f0` upward: twenty-seven refs, one push, no deletion. Then ADR-020 stages 2–5, where stage 2 (the folder migration) supersedes the queued ledger roll |
| Superseded next action (S08j, ruled on) | S08 Part 1 item 4 — the retention-generation question, an ADR before it is code. `ADR-021` is `proposed`; the code waits on the ruling, which is the same order S08d/S08g took with ADR-020 |
| Superseded next action (S08i, done) | S08 Part 1 items 3, 3c and 4 — the derived-view rule keyed on declared `status` rather than the branch name; a record's filename date equal to its frontmatter `timestamp:`; and the retention-generation question, which is an ADR before it is code. Items 3 and 3c landed here; item 4 stays next, untouched, because design work does not belong in a repair unit |
| Superseded next action (S08h, done) | S08 Part 1 items 1 and 2, both live on the trunk and neither blocked: `hasCeremony` must read the `ceremony:` frontmatter key instead of matching a filename, with a fixture rejecting a `done` path whose only session note is its opening check; then a predicate for the merge-time journal entry. ADR-020 stages 2–5 (the `CP-OPS-002` folder migration, the checker's shape, the artefact classification, `cairn-init`) follow, and stage 2 supersedes the queued ledger roll |
| Superseded next action (S08g, ruled) | Owner ruling on ADR-020. If accepted: the `instruction-parity` article plus its concept-cap decision, then the `CP-OPS-002` folder migration as the worked example. Independently of that ruling, the two live trunk defects remain S08 Part 1 items 1 and 2 — `hasCeremony` reading the `ceremony:` key, and a predicate for the merge-time journal entry — and neither depends on the ADR |
| Superseded next action (S08d, pending ruling) | S08 Part 1 item 1 — `hasCeremony` reads the `ceremony:` frontmatter key instead of matching a filename, with a fixture that rejects a `done` path whose only session note is its opening check. Then item 2 (the journal-entry predicate), item 3 (the derived-view rule keyed on declared `status`), item 3c (filename date equals frontmatter `timestamp:`), and item 4 (the retention-generation ADR, design before code) |
| Superseded next action (S08a, done) | S08 — extract Cairn from Atomik: `cairn.config.json`, the generated enforcement header, `cairn-new`, and the tier-0/1 `cairn-init` seed. The v0.2 predicates land here or in a successor path, never by quietly marking a matrix row `implemented` |
| Superseded next action (S07, done) | the specification and lexicon: `docs/cairn/specification.md` (planes, the ADR-017 lifecycle by reference, the rule table generated from `cairn-check.mjs`, the blocking-rule admission test, the three enforcement tiers with tier 2 as a repository property, the CP-MVP-011/012 migration window as a property), `docs/cairn/lexicon.md` (one definition per term, each pointing at the file that enforces it; a term with no enforcing file marked aspirational), and the step-by-step operator guide carrying the optional tier-2 ruleset as a copy-paste `gh api` payload |
| Widening (S05) | `writes:` gained `docs/adr/**`, `docs/bedrock/index.md`, `docs/modules/**`, `docs/index.md`, `atomik-project/index.md` — S05 was always the OKF backfill; the declaration named only the two ADRs this path authors. Deliberate `single-truth` edit: `docs/modules/atomik-desktop.md`, one stale sentence naming the removed integrator |
| Corrections (S07c) | **2026-08-25, owner** — S07 and S07b redone. *"It needs to be universal without borrowing concept from research worlds"*: a stated possibility (this **could** reach a researcher) had been read as a specification, and the whole explanatory apparatus was built on research-world concepts, making a document that claimed to teach from zero **depend on** a background. Also: one file instead of three, alternating concept and protocol; and a new theme rather than the earlier page's house style. Analogies were **removed, not replaced** — substituting another profession's would reproduce the defect with a different dependency |
| Amendments (S07) | **2026-08-25, owner** — S07 widened from "specification and lexicon" to a three-document set with a **pedagogical** remit: a from-zero primer (`foundations.md`) for a named non-engineer audience, a normative specification that points into it, and a lexicon carrying both registers. Structure and depth chosen with the owner before writing. Adds S07b, the rendered page |
| Amendments | **2026-08-24, owner ruling 9** — S06b rescoped from "configure branch protection" to "declare the enforcement tier"; its deliverables move into S07 (specification + operator guide) and S08 (`enforcement` config field, generated header line, tier-0/1 `cairn-init`). This repository stays at tier 1, declared ([note](../sessions/2026-08-24-cp-ops-002-s06b-rescope.md)) |
| Blockers | None. S07g is a completed remote checkpoint |
| Gates at S07g | `npm run cairn-check:test` PASS, 123 protocol/specification subtests (118 → 123: retention/provisional/brief, record binding, routes/repair/non-goals, object-format identity and reconciled lifecycle, the borrowed/Cairn concept split) · `npm run cairn-spec:build` deterministic, output matches the checked-in HTML · every Markdown/wiki/tree/anchor target resolves · rule catalogues current · `npm run cairn-check` OK, no advisory · `npm run typecheck` PASS · product suite PASS · `npm run build` PASS |
| Deliberate non-implementation (S07g) | The brief said *do not implement checker rules in this pass*, and the reason survives inspection: nineteen normative changes plus their predicates in one candidate is not a reviewable work unit. Fourteen matrix rows therefore read `not implemented`, which is the honest state rather than an oversight. The failure this whole revision corrects is a document claiming a mechanism that does not exist — reproducing it in the same commit would have been the one unforgivable outcome |
| Concept budget (S07g) | Hard cap 66, at 65 before this step. Merged away: `file` → `project-memory`, `markdown` → `frontmatter` (retitled *Markdown and frontmatter*), `fetch` + `push` → `fetch-and-push`, `working-tree` → `worktree` (retitled *Working tree and worktree*). Added: `checkpoint-retention`, `provisional-commit`, `scope-digest`, `acceptance-drift`, `foundation-path`. `commit-hash` retitled *Object id* without renaming the file, so no link churn. Net 66, pinned by a test |
| ADR-018 (S07g) | Still `proposed`, and deliberately. v0.2 amends two of its operating rules — force-push after rebase, and pre-acceptance work staying unpushed — so accepting it now would ratify text that is already superseded. ADR-019 records the amendment and is also `proposed` |
| Machine-local state (S06d) | `git worktree list` holds four entries — the owner's trunk, `cp-mvp-011`, `cp-mvp-012` and this path. Ten `path/*` branches retained; `registration/cp-worktree-cleanup` deleted as merged. This transition cannot be enforced by repository CI after the checkout disappears, so `paths.md` requires it to be REPORTED, which is what this row is |
