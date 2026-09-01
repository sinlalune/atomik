---
type: Atomik ADR
title: 'ADR-020: Protocol context weight is a first-order constraint — slice, index, and separate the normative from the explanatory'
description: Minimising the tokens a reader must consume to execute the protocol correctly becomes a stated maxim with an operational test, a named property (instruction parity), a Cairn/host artefact boundary, and a born-sliced path record as its first application.
tags: [adr, cairn, protocol, context, okf, portability, parity, cost]
timestamp: 2026-08-31T00:00:00Z
adr:
  id: ADR-020
  status: accepted
  date: 2026-08-31
---

# ADR-020: Protocol context weight is a first-order constraint

Status: accepted
Date: 2026-08-31
Accepted: 2026-08-31, owner
Extends: ADR-009 (dual plane), ADR-012 (parallel paths, self-merge), ADR-019 (Cairn v0.2)

## Context

A coordination protocol is overhead. It earns its place only if what it prevents
costs more than what it consumes, and for a protocol executed by language models
the consumption is measured in tokens read before any work begins.

That cost had never been treated as a constraint. It was measured on 2026-08-31,
at CP-OPS-002 S08c, for one running path:

```text
   785  AGENTS.md
  5303  atomik-project/coding-paths/paths.md
   709  atomik-project/coding-paths/ACTIVE.md
  2525  docs/bedrock/22_22-agent-handoff.md
  1384  docs/bedrock/00_00-orientation.md
 11869  atomik-project/coding-paths/CP-OPS-002/index.md
  1293  atomik-project/briefs/cp-ops-002-handoff.md
 23868  TOTAL, before the first line of work
```

Three findings sit inside that number, and they turn out to be one problem.

**The path record is half of it, and it grows without bound.** Audit finding F4
(2026-08-24) already named this and CP-OPS-002 S04 answered it with the
`history/` rollup: let the file grow, then cut completed steps out of it,
verbatim, leaving one index line each. That works — this path has done it twice —
but it is a *discipline* fix. It depends on someone noticing an advisory and then
performing a delicate verbatim move correctly, and the protocol has three times
preferred to remove such an operation by construction instead: one journal file
per entry rather than a shared append target, a generated `ACTIVE.md` rather than
a maintained one, a registration commit rather than a request to communicate.

Measuring the file also found what the rollup does *not* fix:

```text
  3252  ## Work Ledger          <- largest section, and not a step
  1115  ### S07r
  1057  ### S08a
   937  ### S07q
   ...
 11869  TOTAL
```

The Work Ledger is a 42-row table that gained three rows in a single day, and
almost every row is a fact about one step — `Gates at S08a`, `Widening (S05)`,
`Corrections (S07c)` — held in the parent because the parent used to be the only
file. Its largest row, `Steps complete`, is a prose restatement of the step index
five hundred lines above it. Rolling steps into `history/` leaves all of this
behind.

**The entry chain is Cairn protocol wearing a host wrapper.** Tracing the
content rather than assuming it:

- `docs/bedrock/22_22-agent-handoff.md` — the body is ~1,950 tokens and contains
  exactly one host-specific line (`no provider keys in renderer or remote
  views`). The rest is portable protocol. It carries ~575 tokens of host
  frontmatter declaring relations to `13-electron-security`, `14-app-kernels` and
  `28-truth-evidence-model`.
- `atomik-project/coding-paths/paths.md` — ~5,300 tokens, of which the
  host-specific parts are localised and total roughly 300: an example worktree
  path, a lane environment variable, and a section naming two hot files in the
  product's source tree.
- `docs/bedrock/00_00-orientation.md` — genuinely and entirely the host
  product's constitution. Its sections are *The corrected north star*, *Product
  promise*, *Founding invariant*, *Design stance*, *Execution economics
  iteration*, *Truth iteration*. None of it changes how a path executes, and
  `AGENTS.md` puts all 1,384 tokens of it in front of every first session.

So the boundary is not "mostly host with some protocol". It is protocol with a
host wrapper, plus one document that is purely host and should not be in a
protocol read at all. That matters now rather than later, because S08 Part 4
ships `cairn-init`, and a shape that is wrong at adoption becomes every adopter's
migration.

**The same text produces different behaviour in different harnesses.** Reported
by the owner, 2026-08-31: the entry documents *"seem to trigger different
behaviours regarding what harness we use"*, and what is wanted is that they
*"trigger the same deterministic workflow, not less not more"*. Three mechanisms
account for it, and each is one of the facts above:

1. The mandatory read is large enough that harnesses truncate, summarise or
   window it differently, so different fragments reach the model.
2. Normative instruction is interleaved with rationale, history and rejected
   alternatives. `paths.md` states a rule and then argues for it across several
   paragraphs; a reader that skims picks up different sentences than one that
   reads linearly, from the same file.
3. The workflow exists only as prose. There is no ordered, machine-checkable
   statement of the sequence, so every reader reconstructs it, and reconstruction
   varies.

[Gate parity](../cairn/specification/concepts/gate-parity.md) already names the
machine-side version of this: one gate, one tree, the same verdict wherever it
runs. The reader-side twin has no name, and the protocol needs one, because it is
the property that makes a protocol executable by more than one implementation.

## Decision

### 1. Protocol context weight is a stated maxim with an operational test

Owner directive, 2026-08-31: *"the optimizing of the weight of protocol context
should be the MAXIM of the protocol, always trying to make it the lighter
possible by using slicing and indexing on every part and every artefact."*

Adopted as normative. A maxim without a test is a slogan, so it takes this one:

> **Every protocol artefact separates its NORMATIVE content — what a reader must
> do — from its EXPLANATORY content — why it is so. Only the normative content is
> required reading; the explanatory content sits one link away, unabridged. A
> reader who consumes only the required reading executes the protocol correctly.**

Two terms, because the protocol has to be able to say which half it means:

```text
normative content    what a reader MUST do          required reading
explanatory content  why it is so                   linked, read on demand
```

**This is not the OKF `index.md`, and an earlier draft of this test said "index"
where it meant "required reading".** That was a borrowed term used for a
different idea, and it is worth recording rather than quietly correcting, because
it is an [instruction parity](#2-instruction-parity-is-a-named-property) failure
inside the sentence defining instruction parity: two readers would have read it
two ways.

The relationship between the two is real but narrower than the word suggested.
OKF's `index.md` is a **folder's** map, read before opening many files. Where a
protocol artefact is a folder, its `index.md` is the natural home for the
normative content — that is a consequence. The rule itself is about the
normative/explanatory split and applies equally to a **single file**, which has no
`index.md` at all and satisfies the test by moving its rationale into linked
documents while remaining one file.

The test is not a token count, and the owner ratified that on 2026-08-31: *"i
agree with no more token counts."* A budget invites compression, and compressing
an explanation is how a record comes to say something slightly untrue — the
failure this protocol has spent nine units correcting. The rule is *separation*,
not brevity: the explanatory half is not deleted, shortened or merged away; it
moves out of the required reading and stays exactly as long as it needs to be.

The test is checkable by the cold-resume trial harness CP-OPS-002 S07n already
built: a reader given only the required reading either executes correctly or does
not, and a failure names the sentence they needed and did not have.

### 2. Instruction parity is a named property

**Instruction parity** is the property that one protocol text, over one
repository state, produces the same workflow whoever — or whatever — reads it.

It is the reader-side twin of gate parity and it is a *distinct* concept rather
than a second half of that one, because the two break differently. Gate parity
breaks when a predicate reads a value belonging to the environment. Instruction
parity breaks on properties of the *document*: its volume, and the interleaving
of instruction with rationale. Neither failure implies the other.

The article is written when this ADR is accepted. It does not need to displace
another, for the reason decision 2b records.

### 2b. The concept cap is retired as a blocking rule and replaced

The concept wiki carries a hard cap on article count, pinned by a test. Its
motivation is sound and survives: every concept is something a reader must learn
before the normative text is readable, and there is a one-way gradient, because
every correction wants new vocabulary and nothing pushes back. S07g did real work
under it, merging four pairs of concepts that turned out to be one object seen
twice.

The mechanism does not survive. Its own history:

```text
cap=66   actual=66    S07g  2026-08-26   set
cap=67   actual=67    S07o  2026-08-27   raised by one
cap=71   actual=71    S07q  2026-08-31   raised by four
```

**It has never once bound.** Every time it would have blocked it was raised to
exactly the new count, so it is not a cap but the current count restated as an
assertion. The merges at S07g happened because an author chose to merge; the cap
has never caused one.

Three reasons to retire it rather than raise it again:

1. **It fails this protocol's own admission test for blocking rules** —
   *objectively checkable AND breaking it leaves something wrong in the repository,
   not merely unconventional.* A further concept is not wrong. This rule should
   never have blocked.
2. **It is the pattern removed at S08a**, where a test hard-coding
   `**not implemented**` for five conformance rows was relaxed on the reasoning
   that pinning a value which legitimately changes turns every honest update into
   a test edit, and so teaches an editor to change the test rather than check the
   claim. The cap's history is that prediction confirmed three times.
3. **It can be satisfied in ways that make the wiki worse.** The cheapest way to
   fit a new concept under a fixed count is to merge two *unrelated* articles,
   which breaks the rule that a concept note is about exactly one idea. The metric
   holds while the thing it protects degrades.

And it now measures the wrong quantity. The cap counts the **corpus**; the maxim
in decision 1 measures what a **reader must consume**. A well-indexed wiki of a
hundred articles where a reader opens four is cheaper than seventy-one where they
open twenty. Under the maxim, article count is a
[proxy predicate](../cairn/specification/concepts/proxy-predicate.md) for *can a
reader hold this protocol in mind*, and it is the broader condition — the usual
direction of that error. Slicing and indexing produce more files deliberately, so
a rule that counts files fights the maxim.

**Replaced by two rules that aim at the thing the cap was aiming at:**

- **Advisory when the count grows**, naming the article added. Growth becomes a
  visible decision, which was the stated goal, without a build failing over a
  judgement.
- **Blocking on an orphan.** A concept note that no normative or learning text
  links to is a real defect: nobody needed the word. This is objectively checkable
  and its breach leaves something wrong — a page nothing points at. It catches
  vocabulary bloat where bloat actually begins, rather than at an arbitrary
  threshold.

Measured before proposing it: **0 of 71 concept notes are orphans.** The wiki is
healthy, the cap was not what kept it healthy, and the orphan rule is what would
notice if the authoring discipline slipped.

### 3. The Cairn/host artefact boundary is declared

Every protocol artefact is classified, and the classification is what
`cairn-init` scaffolds:

```text
PORTABLE   the protocol itself; ships in cairn-init, no host names inside
HOST       this repository's own constitution, product and bindings
BINDING    a small, named adapter: the host's paths, commands and examples
```

Applied to the current entry chain:

- the per-step execution protocol (today `bedrock 22`) is **portable** and moves
  into the Cairn specification, leaving a host page that links to it;
- the path convention (today `paths.md`) is **portable**, with its worktree
  example, lane variable and hot-file section extracted into a **binding**
  appendix;
- the host constitution (today `bedrock 00`) is **host**, and leaves the protocol
  entry chain entirely — a protocol read must not require the product's north
  star;
- `AGENTS.md` remains the **binding**: the one file that names which host this
  is and points at both halves.

### 4. The path record is born sliced

A path is a folder from the moment it is registered, not a file that is later
divided:

```text
<paths-root>/CP-EXAMPLE-001/
  index.md          the declaration, the step index, the live header,
                    the next action, blockers      <- the REQUIRED READING,
                                                      and an OKF folder index
  log.md            OKF folder log
  plan.md           the forward plan, read when planning
  steps/S01.md      one file per step, written there from the first step
  steps/S02.md
```

Four consequences follow, and the fourth is the one that was nearly missed:

1. **There is no rollup operation.** The `history/` move and the `ledger-size`
   advisory both exist to answer a problem that no longer occurs. Nothing can be
   summarised during a move, because there is no move.
2. **A step file is written to be read alone.** Deixis — *"the checkpoint
   below"* — is a defect at authoring time rather than a casualty at rollup time.
   The existing `history/` convention already names this hazard; born-sliced
   removes the occasion for it.
3. **The step-index line is load-bearing** and this is the design's real risk.
   Slicing saves nothing if a reader cannot decide, from the one-line summary in
   `index.md`, whether it needs a step file; it then opens several and pays more than before. No predicate can
   check that a summary line is informative, so this is a stated writing
   obligation, measured by cold resume, and named here rather than assumed away.
4. **The Work Ledger dissolves.** Its step-scoped rows move to the step they
   describe — `Gates at S08a` belongs in `S08a`, where the `cairn-unit` block
   already carries `verified:` and is the machine-readable half of the same fact.
   What remains in `index.md` is the live header — status, base commit, branch,
   next action, blockers — which does not grow.

The forward plan takes its own file: it is explanatory until it is executed, so
by the maxim's test it is not required reading.

### 5. OKF is applied uniformly, with no earning test

Every layer carries `index.md` and `log.md`, including a path folder.

This overrules a proposal made during drafting that a path folder should carry a
log only if it demonstrably needs one. That was per-case optimisation, and it is
the wrong optimisation for a tree navigated by machine: if every layer has the
pair unconditionally, a reader never spends a lookup asking whether this
particular folder has one. **Predictable structure is cheaper than optimal
structure when the reader is doing lookups**, and the variance costs more than
the file saves.

The convention is also live rather than decorative, which was checked rather than
assumed — commits touching folder logs since the S05c seed: `docs/cairn` 8,
`coding-paths` 5, `docs/adr` 4, `specification` 4, `audits` 3.

### 6. The handoff brief's token budget is retired

Put to the owner as an open question with both readings, and ruled on the same
day: *"remove it."*

`brief-schema` enforced `budget_tokens: 1200` on the handoff brief, blocking. The
argument for keeping it was real — the concept cap counted a *corpus* while this
counted one *required-reading artefact*, which is exactly the quantity the maxim
cares about, so a bound here was far more defensible than a bound on how many
things exist.

The evidence against it was that it did not behave that way in practice. It fired
five times in one day and four of those were answered by rewriting sentences
shorter, including one that dropped what a predicate operates on and that a test
pins it. The sentence got shorter and said less than the truth. Only the fifth
was answered by separation, and only because the ADR being drafted named the
distinction.

`budget_tokens` is removed from the brief schema, from the field list, from the
configuration surface and from the two live briefs. What replaces it is the
separation test in decision 1: the brief is required reading like any protocol
artefact, so what will not fit is **linked to the record that owns it**, never
compressed. That is a judgement measured by cold resume, not a predicate, and the
conformance matrix says so rather than claiming a mechanism that does not exist.

## Consequences

- The cold-resume read for one running path falls from ~23.9 k to an estimated
  ~13 k: the entry chain minus the host constitution, a path index of roughly
  1.5–2 k instead of 11.9 k, and one or two step files pulled on demand. The
  estimate is not a promise; the cold-resume harness measures it.
- Reading gains an access pattern it does not currently have. Today a resuming
  session takes the whole path file or nothing; sliced, it can read backward
  through steps until it has enough.
- `cairn-check` changes: `parseWorkUnits` must read `cairn-unit` blocks across a
  folder rather than one file, `same-work-unit` must recognise a step file as the
  path changing, and `ledger-size` loses its subject and is retired with the
  rollup it policed.
- The concept-count assertion is removed from the specification test suite and
  replaced by the growth advisory and the orphan rule, which move from a test into
  `cairn-check` where the other catalogue rules live.
- Relative-link depth shifts one level for path records, as it did at the S07c
  rollup. A link is an address rather than content, so repointing it is not a
  record edit.
- Two paths (`CP-MVP-011`, `CP-MVP-012`) are branched against the current layout
  and must migrate or be exempted, the same hazard that deferred the folder
  rename.
- The classification in decision 3 is what `cairn-init` scaffolds, so Part 4 of
  CP-OPS-002 S08 is reshaped by this ADR rather than extended by it.

## Alternatives considered

- **Keep the `history/` rollup and set a smaller `ledger-size` budget.** Rejected:
  it makes the discipline fire earlier without removing the operation, and the
  operation is the hazard. It also does nothing about the Work Ledger, which the
  measurement shows is the larger and faster-growing half.
- **A token budget per artefact instead of the separation test.** Rejected, and
  ratified by the owner on 2026-08-31 — *"i agree with no more token counts"*: a
  budget is satisfiable by compression, and compressing an explanation is how a
  record starts saying something slightly untrue. Three brief refreshes in one
  day (S08a, S08b, S08c) each fought a token budget by shortening prose, which is
  the behaviour a budget teaches. Separation moves the words instead of cutting
  them.
- **Fold instruction parity into the `gate-parity` article.** Rejected: a concept
  note is about exactly one idea, and the two properties break through different
  causes. Folding them would hide that a document's own volume is a parity
  hazard.
- **Raise the concept cap again to fit the new article.** Rejected, and it was the
  first draft of this ADR. Raising it as a side effect of needing one more word is
  the erosion the cap was meant to guard against — but checking the cap's history
  showed the guard has never held: three raises, each to exactly the new count.
  The honest reading is not that the cap was misused, but that a hard count cannot
  do this job.
- **Keep the cap and merge two concepts to make room.** Rejected: the cheapest
  merges available are between unrelated articles, which breaks the one-idea rule
  and degrades the wiki while the number holds.
- **Delete the cap with no replacement.** Rejected: the concern is real and the
  gradient is one-way. The growth advisory keeps it visible, and the orphan rule
  gives the concern a blocking form that passes the admission test.
- **Extract Cairn from the host after `cairn-init` ships.** Rejected: a shape that
  is wrong at adoption becomes every adopter's migration rather than this
  repository's.
- **Slice only the coding path.** Rejected by the owner directive: the maxim is
  general, and the path record is its first application rather than its subject.

## Migration / rollback

Migration is staged, and no stage is required by the one before it to be
complete:

1. This ADR is accepted. The `instruction-parity` article is written, the concept
   cap is retired, and the growth advisory and orphan rule replace it.
2. `CP-OPS-002` migrates to the folder shape as the worked example, verbatim, and
   its Work Ledger rows are distributed to the steps they describe — a move, not
   a rewrite.
3. `cairn-check` follows the shape; `ledger-size` is retired.
4. The artefact classification is applied: the protocol page moves, the binding
   appendix is extracted, the host constitution leaves the entry chain.
5. `cairn-init` scaffolds the result.

Rollback is cheap through stage 2 — a folder can be concatenated back into one
file, because nothing was summarised at any point. After stage 3 it requires
reverting the checker with it.

## Links

- [`paths.md`](../../atomik-project/coding-paths/paths.md) — the convention this
  reshapes
- [Cairn specification](../cairn/specification/index.md) — the normative target
- [gate parity](../cairn/specification/concepts/gate-parity.md) — the machine-side
  twin of instruction parity
- [OKF agent context](../bedrock/26_26-okf-agent-context.md) — index, log and
  scoped retrieval rather than flat chunk stuffing
- [ADR-009](./ADR-009-coding-paths-work-ledger-dual-plane.md),
  [ADR-012](./ADR-012-parallel-paths-self-merge.md),
  [ADR-019](./ADR-019-cairn-v0-2-revision.md)
