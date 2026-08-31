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
  current_step: S07s
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
    - atomik-project/coding-paths/paths.md@2e7747c5ffb4e0b3def150a112752cf417205c75
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

### S07m — Review round two: two unsound predicates and a fabricated figure — **COMPLETE**

```cairn-unit
step: S07m
unit: 09
type: implementation
verified: cairn-check, cairn-check:test, typecheck, test, build
```

The reviewer checked the response against the generated specification rather than taking it
at its word, and found four things. Three were defects in this work; one was a compliment
that does not survive counting.

- **`closure-surface` was more permissive than the prose it enforces.** The rule allowed
  `current_step` and `resolution` on any closure. `resolution` at closure is incoherent —
  a `ready` path has resolved nothing — and neither field appears in the normative list.
  The surface is now scoped by the fact being recorded: `ready` may move `status` and
  `subject_commit`; `done` additionally moves `resolution`, because that is the trunk
  integration unit. This was the exact seam the document claims to track, and the predicate
  was on the wrong side of it.
- **`advisory-disposition` was unsound, not merely partial.** It compared dispositions
  against the advisories raised while evaluating `A` — and `A` is field-restricted by
  construction, so its advisory set is a strict SUBSET of `C`'s. The rule could pass while
  an advisory raised at the candidate went undisposed, which is the failure the requirement
  exists to prevent. The closing record now **attests** `advisories_at_candidate`, bound to
  `C` by the audit's subject; dispositions must cover that set exactly, and any advisory
  that fires at `A` and is missing from it proves the attestation incomplete. An advisory
  firing only at `C` remains attested rather than derived, and the matrix says so.
- **Item 14 was conformance-breaking, not editorial.** The text disowned "forty hexadecimal
  characters" while the checker matched `[0-9a-f]{40}` in five places, so a SHA-256
  repository conformed to the specification and failed the reference tool — the tool and the
  spec disagreeing about what a valid repository is. `isObjectId` now accepts either format
  and refuses every prefix; `isCommitPin` widens to 64.
- **`route` gained a structural backstop.** Two of five triggers are self-declared, whose
  honest failure mode is that everything declares itself lightweight and no rule ever fires.
  *Expected* to span more than one work unit is unobservable; **having** spanned one is a
  fact in the ledger. A path whose ledger declares more than one `cairn-unit` must be
  `full`. It is the same trigger one unit late, and it cannot be declared away.
- **A fabricated figure, removed.** The response document reported v0.1 conformance as
  `9 / 0 / 21`. The real count is `6 / 1 / 8` across 15 rows — v0.1 shipped fifteen rows and
  at least one partial, so zero partials was impossible on its face. The number was not
  mis-transcribed; it was invented. It is now generated from the v0.1 table rather than
  asserted.
- **A compliment declined.** The reviewer read the split as surface area falling —
  "45 Cairn concepts, down from ~55". Classifying v0.1's 65 articles under the same
  taxonomy gives **41 Cairn and 24 borrowed**, so Cairn concepts went **41 → 45, up four**,
  while borrowed fell 24 → 21. The brief's "~25 real ideas" was an estimate; the split
  revealed the real number rather than reducing it. Accepting a flattering figure that
  counting contradicts is the failure this whole path exists to remove.
- **The failure mode both violations share is now named in the specification**, in a section
  addressed to the next implementer: a predicate can ask about a **declaration** or about a
  **fact**, the two read almost identically, and they diverge exactly when something has
  gone wrong — because a broken state usually leaves the declarations internally consistent.
  A moved ref keeps every declared unit resolving; a closure commit's advisory set stays a
  tidy subset. When a predicate can be written either way, write the one that can disagree
  with the record.
- Nine regression tests; checker suite 129 → 135, full suite 176 → 184. **No new rules** —
  every change corrects or scopes an existing one.

### S07n — The cold-resume pilot, and what it says not to do — **COMPLETE**

```cairn-unit
step: S07n
unit: 10
type: documentation
verified: cairn-check, cairn-check:test, typecheck, test, build
```

The conformance matrix had carried `Cold-resume pilot — not run` since the row was written,
while the specification named cold resume its **primary** metric. Rules went 24 → 40 in four
days against a central claim with zero measurements. This is the first run.

- **Method.** Twenty distinct handoff briefs, taken as they stood at real commits across six
  paths and seven weeks. One participant per brief, no prior context, exactly two documents
  — `AGENTS.md` and the brief — and the eight answerable-alone questions. Participants were
  told to report UNANSWERABLE rather than reconstruct from plausibility. One participant per
  brief so no trial could be informed by another.
- **Headline: 7 of 20 (35%) would have begun work without asking a human.** Thirteen would
  have stopped. Confidence in the first action: 2 high, 7 medium, 11 low.
- **By question**, two failures dominate: `resume_commit` 16/20 and `must_read` (at which
  object id) 15/20 — precisely the two the v0.2 contract added fields for. Briefs
  consistently named *which* documents to read and consistently failed to say *at which
  version*. `blocking` never failed once.
- **By path, the distribution is flat** — five of six paths sit between 2.5 and 3.0
  unanswerable per trial, across work as different as an OCR bench, a protocol path and a
  worktree cleanup. That **rules out** the one diagnosis this reading exists to detect: the
  schema is not underspecified for a class of work, so no specification change is indicated.
- **The writer axis could not be computed at all.** Every brief in this repository's history
  carries one Git author, because one participant commits work produced by several. This is
  the pilot's most actionable output and it is an instrument fix, not a protocol fix:
  `written_by` is now a required brief field, because without it the pilot can rule out a
  path-class problem and cannot confirm a practice problem.
- **Schema era stands in, at n = 2.** Pre-contract briefs average 2.7 unanswerable per
  trial; the two written under the v0.2 contract average 0.5. The direction is large and
  **two trials establish nothing** — recorded as suggestive and labelled as such. The single
  v0.2-era failure is the interesting one: `checkpoint: PENDING`, a placeholder left in a
  field the schema does specify. Seven of eight answered, stopped at the resume point. A
  practice failure of a schema that worked — the category the writer axis exists to count,
  appearing at n = 1.
- **The outlier argues against my own rule.** The two best-scoring briefs are the WSLg pair
  at 0.5 unanswerable per trial, and they are the **least** protocol-shaped documents in the
  corpus: not coding paths, no seven sections, one self-declared "a side micro-unit, not a
  path step". They score well because they are dense narratives that happen to contain the
  facts. Section conformance is a way of making those facts likely; it is not what made
  these briefs resumable, and a brief can satisfy every structural rule in `brief-schema`
  while failing every question a resumer actually has. Worth holding onto now, while the
  schema is new and its passing grade is still being mistaken for the goal.
- **Limits, stated rather than buried.** Graders are language models — consistent and
  literal, which suits a schema test, and unlike a real resumer they never get impatient or
  resourceful. At least one grading inconsistency survived (a trial marked `must_read`
  ANSWERED while its own justification says no object id was given), so the true count is
  ≥ 15. The path sample is unbalanced, 10 of 20 from one path. The corpus is historical,
  which is fair as a baseline and unfair to whoever wrote those briefs. `would_act` is
  self-reported: nobody was asked to actually perform the action.
- **What it says about v0.3: do not change the normative text yet.** The flat path
  distribution removes the outcome that would justify a schema change; the dominant failures
  map onto fields v0.2 already added; the only clean signal rests on two trials. The next
  step is to keep writing briefs under the contract with `written_by` populated, re-run at
  fifteen v0.2-era briefs from more than one writer, and read the writer axis then. **A
  protocol that revises itself faster than it can measure itself is the failure this pilot
  was commissioned to prevent.**
- Record: [`docs/cairn/cairn-cold-resume-pilot-2026-08-26.md`](../../docs/cairn/cairn-cold-resume-pilot-2026-08-26.md).
  No rule added; no normative text changed except the two the reviewer's own points
  required — `written_by`, and the requirement to record writer and path with every trial.

### S07o — Owner review: the brief is a stone, not a hero — **COMPLETE**

```cairn-unit
step: S07o
unit: 11
type: documentation
verified: cairn-check, cairn-check:test, typecheck, test, build
```

Owner feedback on v0.2 ([record](../briefs/2026-08-27-cairn-v0.2-owner-feedback.md)).
Two items are doctrine, six are editorial, four are the reader. The doctrine two are the
ones worth the space: both say the specification asserts the opposite of what it builds.

- **The answerable-alone contract contradicted the entry route.** It demanded a reader
  holding "only `AGENTS.md` and the brief — **no ledger**" answer eight questions. But
  `AGENTS.md` exists to point at the operating convention, which points at the live view,
  which names the path and its ledger — so the contract forbade the reader from doing the
  one thing the bootloader is for. The owner's framing is the fix: *a brief is a rock on
  the trail, not a do-it-all hero.* "Alone" now constrains **context, not file count** —
  no conversation, no prior session, no memory of how the path got here — and each answer
  MUST be in the brief **or in a record the brief names at an exact object id**.
- **The second-ledger sentence was inverted.** It named only the *thick* failure — a brief
  that reproduces the ledger becomes a second one — while the brief that is actually
  shipped is terse enough to need the ledger, which the sentence describes as the healthy
  state. Both failure modes are now stated, and the reason they are not symmetric: deciding
  *which part of the ledger's history is still the situation* is the brief's own job, so a
  brief that hands that judgement back has been **silent**, not terse. The section is
  `Two failure modes, not one`; a test pins both.
- **Why there is no `objective:` in the brief frontmatter** — the owner noticed the gap and
  read it, fairly, as evidence against the contract. Considered and rejected: the objective
  is prose, the frontmatter is machine-checkable state, and an objective maintained in two
  schemas eventually disagrees with itself while no predicate can adjudicate between two
  paragraphs. It is answered by `## Outcome` and argued in the path record. The
  specification now says this rather than leaving it to be inferred.
- **The pilot was measured under the old wording**, so it carries a note saying which of its
  numbers move. `resume_commit` (16/20) and `must_read` (15/20) test brief fields and do
  not move; `outcome` (10/20) becomes an upper bound and 35% "would act" a lower bound; the
  flat-by-path distribution that decides v0.3 is unaffected. The findings are not rewritten
  — a dated measurement that gets edited to match a later rule is not a measurement.
  ADR-019's own statement of the contract is corrected in place, marked as a correction.

Editorial, in the order the owner raised them:

- **`atomik-project/` → `project/`, fifty-six times.** The plane is named after the product
  Cairn was extracted from, and the specification carried that name through every example,
  template and command sequence. Every one now reads `project/`. Scope was the owner's call:
  documents only, not a `git mv` — the folder rename lands with S08's config loader, where
  the binding becomes selectable instead of documented-but-unimplemented. **Exactly one**
  place still names it, the installed binding table, which gained a column separating role
  from binding and a paragraph saying no adopter should inherit the prefix. A test asserts
  the count is two and that no other article mentions it.
- **`git rev-parse HEAD:docs/architecture/example.md` had no explanation.** The prose
  demanded a *blob* object id, then dropped an unusual command with no output, no account of
  the `<commit>:<path>` form, and no way to read the pinned version back. All three added.
- **`[route]` linked to the lightweight path**, collapsing the field into its default. Route
  is now its own concept — the four routes, the five `full` triggers, the ledger backstop,
  one-way escalation — and every `[route]` link points at the field.
- **`refs/cairn/checkpoints/` was described but never located.** It is now in the reference
  tree under `.git/refs/`, in the role table, and has a paragraph on why no directory
  listing will ever show it and which three commands do.
- **`sources/`, `projects/` and the frozen `log.md` left the tree.** The first two are vault
  fixtures from the repository's first use as an Atomik vault; the third predates the
  one-file-per-entry journal. None is Cairn structure, and the tree claims to be exhaustive
  for what Cairn defines.

The reader, per the owner's four points:

- **Active state was a coloured rule line** on the pane top edge and the tree item's left
  edge — a second layer of line over a layout whose separators are already minimal. Both
  are gone; current state is a subtle fill.
- **Pane A / Pane B labels removed**, along with the active-pane model they belonged to.
- **The specification is now fixed in the left pane** and every link and tree entry opens on
  the right. That deletes the select-a-pane-then-click step the owner reported as not
  working, and stops a right-pane link from evicting the specification. The left pane keeps
  no history because it never navigates; the right pane keeps all of it. Deep links moved
  from `#read=a|b` to `#article-<id>`, with the old form still accepted.
- **Modern, not old.** Body text is a contemporary sans with a serif display title — the
  serif-everywhere stack fell back to something dated on any machine without it, which is
  the opposite of what a research aesthetic should do. Rounded corners on the search field,
  code blocks, tables, quotes, buttons and badges. Still flat: no shadows, no gradients, and
  glass confined to the two chrome surfaces that already had it.
- **The edition label was lying.** It read `v0.1` in the masthead and the meta description
  while the specification had been v0.2 since S07g. It is now read from the specification's
  own frontmatter and the build throws if that frontmatter declares no version.

Checker suite 188, specification suite 30 (four new: the contract, the blob explanation,
the route concept, the fixed-pane reader; two rewritten). Nothing outside the feedback was
changed.

### S07p — Repair: a dead button, a low glyph, and the face that stayed old — **COMPLETE**

```cairn-unit
step: S07p
unit: 12
type: repair
verified: cairn-check, cairn-check:test, typecheck, test, build
```

Owner review of S07o's reader. Three defects, one of which the new test suite should
have caught and did not.

- **The back and forward buttons did nothing.** Each pane sets `data-article` on itself
  to say what it is showing, and the click handler looked for `closest('[data-article]')`
  before it looked for the history button. Every click anywhere inside a pane — the
  buttons included — therefore matched the *pane*, re-rendered the article already open,
  and returned before the history branch was ever reached. Fixed by matching the history
  button first and by matching links as anchors (`a[data-article]`) rather than as any
  element carrying the attribute.
- **The test suite could not see it.** Both reader tests dispatched clicks on `<a>`
  elements, where the bug does not appear, and asserted on `disabled` state, which was
  computed correctly the whole time. A test now clicks the buttons themselves and walks
  two steps back and two forward. The lesson is the one this path keeps relearning:
  a predicate that asks about a *declaration* passes while the behaviour it names is
  broken — here, asserting the control was enabled rather than that it moved.
- **The h1 was still wearing the old face.** S07o kept a serif for display titles on the
  theory that it carried research character. It carries whatever the machine has, and on
  a machine with no Source Serif that is a dated fallback — the exact thing the owner
  asked to be rid of. The `--serif` token is gone; one face for prose and display, with
  the display weight and tracking doing the work instead.
- **The arrow glyphs sat on their baseline** inside a fixed-size box. The buttons are
  `inline-flex` and centre both axes.

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

#### Part 3 — portability, as originally planned

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
| Next action | S08 — extract Cairn from Atomik: `cairn.config.json`, the generated enforcement header, `cairn-new`, and the tier-0/1 `cairn-init` seed. The v0.2 predicates land here or in a successor path, never by quietly marking a matrix row `implemented` |
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
