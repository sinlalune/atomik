---
type: Atomik Anatomy
title: Cairn taken apart — every construct, and the primitive it manipulates
description: The inverse of the handbook. Instead of teaching a concept and then showing Cairn's use of it, this reduces each Cairn construct to the primitive it operates on and the exact predicate it evaluates - organised by primitive, not by feature. Ends with the whole protocol in one table, the primitives it refuses, and the seams a port has to cut.
tags: [cairn, anatomy, decomposition, primitives, protocol, portability]
timestamp: 2026-08-25T00:00:00Z
---

# Cairn taken apart

> **Current as of 2026-08-25.** The companion to
> [`handbook.md`](./handbook.md), read from the other end.
> [`anatomy.html`](./anatomy.html) is this document rendered.

## Two directions through the same material

The handbook goes **upward**: here is a general practice, explained from nothing;
here is how Cairn uses it. It is for someone arriving with no protocol in mind.

This document goes **downward**: here is Cairn; here is what it is *made of*. It
takes each construct apart into the primitive it manipulates and the exact
predicate it evaluates.

```text
handbook    concept ──► implementation      arrive knowing nothing, leave knowing both
anatomy     construct ──► primitive          arrive facing Cairn, leave able to rebuild it
```

The inversion is not a reordering. The handbook is organised by **concept**; this
is organised by **primitive**, so every rule that touches the commit graph sits
together regardless of which feature it belongs to. That grouping is the whole
value: it shows how few things the protocol actually touches, exactly where each
one runs out, and — because the seams become visible — what a port has to cut.

Read it if you are evaluating Cairn, porting it, extending it, or debugging a rule
that fired when you did not expect it.

---

# 0. The complete primitive set

Cairn manipulates **seven** things, and nothing else.

| # | Primitive | What it can answer |
| :-- | :-- | :-- |
| 1 | **The commit graph** | is X an ancestor of Y; which commits are on this side and not that one |
| 2 | **Refs** | what does this name point at; does this name resolve at all |
| 3 | **The filesystem** | does this path exist; what is in this directory |
| 4 | **File content** | what does this text say; what does its one metadata block declare |
| 5 | **Process exit codes** | did this command succeed |
| 6 | **The host environment** | what did the runner put in these variables |
| 7 | **Wall-clock time** | how long ago |

There is an eighth input that is not mechanical at all — **a human's judgement** —
and the single most important structural move in the protocol is what it does with
it:

> **Every human judgement is reduced to primitive 4.** An owner's acceptance
> becomes a file with two metadata keys. An agent's architectural read becomes a
> file naming an outcome. Neither the acceptance nor the read is checkable; the
> *file* is.

That reduction is what lets a protocol built for human decisions run in a script
that contains no intelligence. It also fixes the ceiling: the check can prove the
judgement was recorded, never that it was any good. Cairn states that ceiling
rather than blurring it, which is why judgement-derived rules are advisory and
existence-derived rules are blocking.

---

# 1. The commit graph

Ancestry, and nothing else. No content, no order in time, no authorship.

## 1.1 The rebase gate

```text
operation   merge-base(trunk_tip, HEAD) == trunk_tip
reads       two commits
verdict     BLOCKING
```

This is the whole of "the branch is up to date". It is one graph query, it is
objective, and it has exactly one fix. That combination is why the rule that makes
an integrator unnecessary can be a gate at all.

**Cannot**: tell you whether the rebase was done *well* — whether conflicts were
resolved correctly, whether the result still makes sense. Ancestry is a
containment fact. Correctness is checked by the test suite, which is a different
primitive (5).

**Unknown is not stale.** If the trunk ref will not resolve — a fresh clone, a
shallow checkout — the answer is `null`, not `false`. A gate that failed because
it could not see would fail for a reason its author cannot fix.

## 1.2 Trunk registration

```text
operation   git show <trunk>:<path-file>  →  parse  →  does the tuple match?
reads       one file, at one commit, on another branch
verdict     BLOCKING (advisory for a finite, named legacy set)
```

The subtle part is *where* it reads. The question is not "does this file exist"
but "does this file exist **at the trunk ref**", which is a graph-and-content
query the working directory cannot answer. That is precisely why the rule exists:
a checkout can only list its own files, so a view built from them is locally
consistent and globally false.

**Cannot**: tell you the registration was honest — only that the tuple `(id,
running, branch, base_commit)` is present on the trunk and matches.

## 1.3 Binding an audit to the work it reviewed

```text
operation   rev-list HEAD --not <trunk>   →  set of this path's own commits
            audit file name ∈ { <path-id>-<sha7> : sha ∈ that set ∪ {HEAD} }
reads       the graph, plus one directory listing
verdict     ADVISORY
```

An audit record is stamped with the head it was written for — and committing it
moves the head, so a naive equality check could never match. Widening it to *any
commit this path contributed* fixes that without renaming anything.

**The bound is the point.** A record naming an arbitrary trunk ancestor proves
nothing about this branch. The set difference is what makes "this path's own work"
a computable object.

## 1.4 `base_commit`

```text
operation   /^[0-9a-f]{7,40}$/
reads       one string
verdict     BLOCKING — on the SHAPE only
```

The pin's *presence* is checked. Its *truth* — that this really was the trunk tip
before registration — is not, and could be: it is a graph query. It is listed as a
known limit rather than quietly assumed, and it is partly mitigated because the
rebase gate compares against the trunk directly instead of trusting the record.

---

# 2. Refs

A ref is a name pointing at a commit. Cairn asks three things of them: what does
this one point at, does it resolve at all, and how old is what it points at.

## 2.1 Branch → path

```text
operation   branch name  →  key into the path corpus  →  status ∈ {running, done}
reads       one ref name, every path file's metadata
verdict     BLOCKING
```

The branch name is a **join key**. `path/cp-ops-002` finds the file declaring
`branch: path/cp-ops-002`. That is the entire binding between the execution plane
and Git, and it is why the naming convention is not cosmetic.

## 2.2 Naming the branch at all

```text
operation   flag  →  host env var  →  symbolic-ref  →  abbrev-ref
            if all fail: "detached"
reads       the environment and one ref
verdict     BLOCKING when guarded source changed, ADVISORY otherwise
```

This is the primitive underneath every other branch rule, and it was the protocol's
most expensive defect. A detached checkout has no branch name; every branch-scoped
rule therefore had nothing to key on and **skipped in silence**. Nothing printed.
Six rules were inert in exactly the environment they existed for.

The repair is a resolution order — ask the host before the checkout — and a
**fail-closed** verdict when the name is unavailable while guarded code changed.
It is advisory otherwise, because a documentation-only build in a detached
checkout is not wrong and a false blocking verdict costs more than a missed one.

> The general form: **a rule that cannot identify its subject must say so, not
> pass.** Silence and success are indistinguishable to a reader.

## 2.3 The remote checkpoint

```text
operation   rev-parse @{upstream}     →  does it resolve?
            merge-base --is-ancestor HEAD <upstream>
reads       two refs
verdict     ADVISORY
```

"Is my work anywhere other than this machine?" reduces to an ancestry test against
the tracking ref.

**Cannot**: prove *cadence*. Once several commits are eventually pushed together
the graph looks identical to one that was pushed commit by commit. Push events are
recorded by the host's activity view, not by the repository, which is exactly why
push-per-commit is an absolute operating rule and only an advisory check. A rule
that cannot see the thing it wants must not pretend to enforce it.

## 2.4 Staleness

```text
operation   log -1 --format=%ct <branch>  →  (now − t) / 86400 > window
reads       one ref, one integer, the clock
verdict     ADVISORY, permanently
```

The only rule that consults primitive 7. A branch this checkout cannot resolve
produces **no finding at all** — not a stale one. Unknown must never read as
stale, for the same reason it must never read as fresh.

Advisory is structural, not timidity: a parked path is not a wrong path, and a
build that failed for one would teach people to lie about status rather than
archive.

---

# 3. The filesystem

Path existence and directory listing. Cairn leans on this more than on Git, and
one of its central guarantees is not Git's at all.

## 3.1 One writer per working directory

```text
operation   none — this is a PROPERTY, not a check
reads       nothing
verdict     absolute operating rule
```

Two processes editing one directory is a filesystem race, and no amount of
documentation makes it safe. The answer is not a rule but a **topology**: one
worktree per path, so two writers never share a directory. Git's `worktree`
command gives several working directories over one object store.

This is the clearest case in the protocol of **preferring a structure that makes a
failure impossible over a check that detects it.**

## 3.2 Collision avoidance by naming

```text
operation   none — a NAMING scheme
verdict     structural
```

The same move, applied to files. Two paths appending to one journal collide on
every line; the same journal as one file per entry never collides at all. Audit
records carry the path id and the commit. Rolled step records carry the path id
and the step.

**No locking anywhere in Cairn.** Where concurrency could bite, the namespace is
partitioned so that two writers cannot address the same file.

## 3.3 Link integrity

```text
operation   strip code fences  →  resolve each relative link  →  existsSync
reads       every Markdown file in both plane roots
verdict     BLOCKING
```

The strip is the interesting half. The first run reported 34 broken links that
were not broken: architecture pages *illustrating* a folder layout inside code
blocks. Had it stayed that way the validator would have been switched off within
the week.

**Cannot**: tell you the link points at the *right* thing, or that an anchor
inside the target exists. Existence is all the filesystem offers.

## 3.4 Worktree cleanup

```text
operation   is-ancestor(merge, origin/trunk)
            → worktree registered?  → status --porcelain empty?
            → remove without --force → absent?
reads       the graph, the worktree registry, the directory
verdict     required REPORT, not a Cairn rule
```

Deliberately not a rule. The checkout it verifies is gone by the time repository
automation could look, so a check would be structurally unable to run. It is an
absolute operating rule with a mandated report — **merge complete; cleanup
incomplete** — instead of a gate that could only ever lie.

---

# 4. File content

Text, and one metadata block per file. This is where every human judgement lands,
and it carries more of the protocol than the other six primitives together.

## 4.1 One parser, five consumers

```text
operation   frontmatter  →  { key: scalar, section: { key: scalar } }
reads       the head of a file
verdict     BLOCKING (schema)
```

One deliberately small reader — no dependency, values taken verbatim to end of
line — serves path files, decision records, session notes, audit records and
briefs. That "verbatim to end of line" has a sharp edge, and it is documented
rather than smoothed: `ceremony: closing   # done` declares the value
`closing   # done` and satisfies nothing.

Smoothing it would mean a comment-aware YAML parser and a dependency, for a
protocol whose selling point is that a sceptic can read the validator in one
sitting. The edge is stated instead, and a test parses the *published template* so
the documentation cannot drift away from the parser.

## 4.2 Human acceptance, reduced

```text
operation   ∃ file in sessions/ with root-level path == <id> AND ceremony == <kind>
reads       a directory listing plus each file's metadata
verdict     BLOCKING, both ceremonies
```

This is the reduction, in its most compact form. "Did the owner accept this?" is
not checkable. "Is there a file that says so, keyed to this exact path id?" is.

The failure that forced it is the best argument for declared metadata anywhere in
the protocol. An earlier version matched a **filename** containing the path id —
but the *opening* note contains the id too, and exists from the work's first hour.
The check meant to prove closure was proving activation, and it passed every time.

> A check can be running, and green, and evaluating the wrong proposition.

Exact-id matching matters for the same reason: a substring match makes
`CP-MVP-0010` close `CP-MVP-001`.

## 4.3 The identity tuple

```text
operation   id present · status ∈ vocabulary · running ⇒ branch + base_commit
reads       one metadata block
verdict     BLOCKING
```

Five fields, checked per state. This is the whole of what CI knows about a path's
lifecycle — see [§6.2](#62-what-one-commit-cannot-show) for what that forecloses.

## 4.4 Declared write surfaces

```text
operation   changed paths ∖ { p : ∃ glob ∈ writes:, glob matches p }
reads       the metadata block and the diff
verdict     ADVISORY
```

A set difference, reported and never enforced. It is a **signal, not a lock**,
because a root cause is discovered rather than declared — a path that must reach
further records the widening and keeps going.

Two parsing traps were found live here, one line apart, and both are the same
species: the reader consumed the `---` terminator as a surface, and a trailing
comment on an item became part of the glob. Each silently reduced the declaration
to something that matched nothing, so the rule went quiet while appearing to run.

## 4.5 Ledger size

```text
operation   words × 4/3 > budget, for path files IN THE DIFF
reads       one file's text
verdict     ADVISORY
```

A word count standing in for a reading cost. Scoped to the diff on purpose: a
corpus sweep would report the same historical files every run for months, and it
speaks only to whoever is already editing the file — the one person who can act.

The proxy is pinned by a test to the same ratio the finding that produced the rule
used, so a report and its evidence stay comparable numbers.

## 4.6 "Filled"

```text
operation   ¬contains(placeholder)
            ∧ verdict names an outcome in the vocabulary
            ∧ ≥1 findings section has a non-empty body
reads       one file
verdict     ADVISORY
```

The most interesting predicate in the protocol, because its subject is *whether an
agent did the thinking* — and the original version measured a **deletion**: remove
the placeholder string and an empty file passed.

The repair asks the two things a deterministic check honestly can: the record
**names** an outcome, and it **answers** at least one of its own questions. It
deliberately does not judge the answers. That is the non-deterministic half, and
keeping it out of the predicate is the entire design.

The vocabulary is matched by **stem**, not exact phrase, because a real record
says *"drift noted, repaired before merge"* — it names an outcome and then says
what happened to it. An exact-match rule would have declined a substantive audit.

## 4.7 Generated content

```text
operation   regenerate  →  compare to what the file ships  →  equal?
reads       the source of truth and the derived file
verdict     BLOCKING for the derived view; a TEST for the rule catalogue
```

Two instances of one idea. The running-paths view is regenerated from path
declarations and compared. The rule catalogue in the handbook is regenerated from
the validator's own source and compared **by the test suite**.

A hand edit to a shared statement of record is only advisory, because a deliberate
edit is sometimes right — the ledger then has to say why.

## 4.8 What content cannot do

The protocol's deepest limit lives here. `same-work-unit` proves a path file
**changed** when source changed. It cannot prove the prose inside it became
*true*.

Found the honest way: a path's checkpoint still described its first step in
vocabulary that had been removed five steps earlier. *"Is this prose still
accurate?"* is not a question any primitive answers, and the protocol says so
instead of implying otherwise.

---

# 5. Exit codes

One bit, and the entire blocking/advisory design is a decision about who is
allowed to set it.

## 5.1 The split is an exit code

```text
BLOCKING   contributes to a non-zero exit
ADVISORY   prints; never contributes
```

The admission test — objectively checkable **and** breaking it leaves something
wrong in the repository — is really a rule about which findings may touch this one
bit. The asymmetry behind it: a false blocking verdict costs far more than a
missed one, because a gate that stops legitimate work teaches people to route
around it, and then you have lost the gate *and* its information.

## 5.2 Bare

```text
operation   run  →  read $?
```

A pipeline reports the status of its **last** command. Piping a gate through a
filter discards the failing status of the thing you were checking. This shipped a
broken build here on 2026-07-16, with the gate reporting green.

The mitigation is a rule about shell composition, not about the checks: the exit
code is the verdict, so nothing may stand between the command and it.

## 5.3 Two exit codes, not one

`does the software work` and `was the protocol followed` are separate jobs, so a
red run says *which* failed. Collapsing them would lose the only information the
bit carries.

## 5.4 What one bit cannot express

Degree, cause, or partial credit. Everything nuanced has to live in the printed
output, which is why advisory findings carry the fix in the message and why the
coherence audit is a *file* rather than a status.

---

# 6. The host environment

The least trustworthy primitive, and treated accordingly.

## 6.1 Variables the runner sets

```text
operation   read GITHUB_HEAD_REF, then GITHUB_REF_NAME (rejecting "<n>/merge")
```

The host knows what the checkout does not. `<n>/merge` names a merge preview, not
a branch, and that preview **contains the base by construction** — so a rebase gate
judging it would pass on every stale branch while proving nothing. Rejecting that
shape is a one-line guard against a rule that would have looked like it worked.

## 6.2 The tier ladder is about the host, not the protocol

```text
tier 0  local      no host at all              nothing prevented by force
tier 1  ci         a workflow file             CI OBSERVES
tier 2  protected  a trunk ruleset             CI PREVENTS
```

Each tier is a statement about *where the check runs and what the host will do
about the result*. Only tier 0 depends on nothing.

**Tier 2 is a property of a repository, never a requirement of the protocol.** A
setup step performed once, invisibly, in a web interface will be skipped by the
next adopter — and the documentation would go on claiming a guard that is not
installed. That is the protocol-level form of the failure this whole design is
built against.

The honest claim therefore has to be **generated**: the configuration declares the
tier and the validator prints it. Until that exists, the tier is stated in prose,
which is exactly the drift risk the generated line removes.

## 6.3 What one commit cannot show

A validator run sees **one commit**. It reads the status a file declares *now*; it
has never seen a transition. A rule that inferred one would be wrong the first
time a file was created already complete.

So the lifecycle state machine is doctrine for the people executing it, and what
is enforced is the set of **per-state invariants** — each a fact about one file.
Cairn does not enforce the lifecycle, and no document may say it does.

---

# 7. What Cairn refuses to use

The negative space is as informative as the mechanism. Each of these was available
and rejected for a stated reason.

| Refused | Why |
| :-- | :-- |
| **A language model inside a gate** | Non-deterministic, costs money, needs credentials automation should not hold. The judgement is produced by an agent; the gate checks only that a record **exists and is filled**. |
| **Git hooks** | Local, bypassable, invisible to everyone else, and absent from the repository's verdict. A guard nobody can see is not a guard. |
| **Server-side state** | The protocol must deliver most of its value at tier 0 — no host, no account, no network. Anything stored outside the repository breaks that. |
| **A lock on declared surfaces** | Declaring `writes:` a lock would punish the normal case: a root cause is discovered, not declared. It is a signal, and widening is recorded rather than prevented. |
| **Timestamps as ordering authority** | File times and commit dates are writable and say nothing reliable about sequence. Order comes from the commit graph. Time is used for exactly one advisory finding. |
| **Rewriting history to fit a new convention** | ~300 journal entries were **frozen** rather than migrated. Rewriting a record to match a rule invented later is worse than the inconsistency. |
| **Summarising a rolled ledger step** | The move to `history/` is verbatim. Summarising at rollup time would quietly rewrite the record — the one thing a ledger may not do. |
| **A person as gatekeeper** | Rejected by the owner and independently by the evidence: the integrator left no artifact and marked nothing integrated. Both holes vanish when each path merges itself. |

---

# 8. The whole protocol, in one table

Every rule, the primitive it touches, and what it evaluates. This is the payoff of
reading downward — the protocol is smaller than its documentation.

| Rule | Primitive | Operation | Verdict |
| :-- | :-- | :-- | :-- |
| `branch-identity` | host env, refs | can the branch be named at all | **blocking** on guarded source, else advisory |
| `branch-path` | refs, content | branch name joins to a path declaring it | **blocking** |
| `registration` | graph, content | the tuple exists at the trunk ref | **blocking** (advisory for the named legacy set) |
| `rebase` | graph | `merge-base(trunk, HEAD) == trunk` | **blocking** |
| `opening-ceremony` | filesystem, content | a session note declares `path` + `ceremony: opening` | **blocking** |
| `ceremony` | filesystem, content | a session note declares `path` + `ceremony: closing` | **blocking** |
| `same-work-unit` | filesystem | source changed ⇒ a module note and a path file changed | **blocking** |
| `schema` | content | metadata parses; ids, statuses and dates in vocabulary; halves agree | **blocking** |
| `links` | filesystem, content | every relative link resolves, code fences stripped | **blocking** |
| `derived-view` | content | the generated block equals its regeneration | **blocking** on the trunk |
| `remote-checkpoint` | refs | HEAD is an ancestor of its upstream | advisory |
| `coherence-audit` | graph, filesystem, content | a filled record names a commit this path contributed | advisory |
| `scope-drift` | content | changed paths ∖ declared globs | advisory |
| `ledger-size` | content | words × 4/3 over budget, diff-scoped | advisory |
| `path-staleness` | refs, time | branch tip older than the window | advisory |
| `single-truth` | filesystem | a hand edit to a generated or shared file | advisory |
| `area-note` | filesystem | subsystem source changed without its area note | advisory |
| `decision-drift` | filesystem | architecture changed with no decision record beside it | advisory |

Ten rules can fail a build. Every one of them is a fact about ancestry, a name, a
file's existence, or a metadata field. **Nothing in the blocking set requires
judgement**, and that is not an accident — it is the admission test, applied
eighteen times.

---

# 9. The seams — what a port has to cut

Reading downward makes the project-specific inputs obvious, because they are the
only places where a primitive is given a *name* rather than a *shape*.

| Bound today | Should be | Where it is hardcoded |
| :-- | :-- | :-- |
| `atomik-project/` | the execution-state plane root | the path, session, audit and journal constants |
| `docs/` | the knowledge plane root | the decision-record and module-note constants |
| `apps/`, `packages/`, `shared/` | the guarded source roots | `GUARDED_ROOTS` |
| the area map | source path → area note | `AREA_MAP` |
| `master` | the trunk ref | a default argument |
| `atomik:` | the metadata namespace key | the frontmatter readers |
| two legacy path ids | the migration set, which drains | named constants |

Everything else is Git and the filesystem, which every repository already has.
That is the honest measure of how far Cairn is from portable: **seven names**, all
of them inputs rather than logic. Extracting them is what the configuration file
is for, and until it exists the protocol is this repository's, not anyone's.

The handbook writes `project/` for the first of those, precisely so the prose
stops teaching a binding as if it were the protocol.

---

## See also

- [`handbook.md`](./handbook.md) — the same material read upward: concept first,
  then Cairn's use of it. Start there if you are new.
- [`anatomy.html`](./anatomy.html) — this document, rendered.
- [`index.html`](./index.html) — a short visual overview of the protocol.
