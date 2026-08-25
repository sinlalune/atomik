---
type: Atomik Coding Path
title: Cairn 2.0 — close the enforcement gaps, drain the legacy state, and extract the protocol from Atomik
description: Second operations path. Repairs the three checks that certify false statements, drains the state that predates each rule, then extracts Cairn into a portable specification and init kit.
tags: [cairn, ops, protocol, ci, enforcement, portability]
timestamp: 2026-08-24T00:00:00Z
atomik:
  id: CP-OPS-002
  status: running
  base_commit: 7aa3b1d
  branch: path/cp-ops-002
  writes:                    # ADVISORY — a signal, never a lock
    - tools/cairn-check.mjs
    - tools/cairn-check.test.mjs
    - tools/cairn-active.mjs
    - tools/cairn-audit.mjs
    - tools/cairn-audit.test.mjs
    - tools/cairn-rules.mjs
    - tools/cairn-rules.test.mjs
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

Rolled at S07c when `ledger-size` fired on this file (~11 k tokens, budget 10 k). The
move is cut-and-paste, never a summary: each record below reads exactly as it did here.
Convention: [paths.md](./paths.md#the-ledger-has-a-boundary) · index:
[history/](./history/index.md).

- **[S00](./history/CP-OPS-002-S00.md)** — Adopt the local repairs — the four enforcement repairs, and how they landed
- **[S01](./history/CP-OPS-002-S01.md)** — Schema and doctrine fixes — the ceremony schema pinned, ADR-016
- **[S03](./history/CP-OPS-002-S03.md)** — Drain the grandfather set — owner-ruled, withdrawn
- **[S04](./history/CP-OPS-002-S04.md)** — Bound the ledger — the history/ rollup convention and advisory ledger-size
- **[S05](./history/CP-OPS-002-S05.md)** — Backfill OKF — indexes, ADR frontmatter, the gated opening check, logs everywhere
- **[S06](./history/CP-OPS-002-S06.md)** — Retire the drifted page, declare the enforcement tier, bind the audit, drain the leftovers

### S07a — ADR-017, the path lifecycle *(ruling 5, F11 + F15)* — **COMPLETE**

Three documents described one state machine and no two agreed. Bedrock 35 said a finished
path moves to `done`, **then** `archived` — demotion, never deletion. Round 3's D2 §2.2
declared `done` **terminal** and drew `running → archived` as the only abandonment edge.
ADR-012 recorded that abandoned paths have no terminal transition at all. `AGENTS.md` calls
that a defect to report; the audit reported it (F15), and the owner ruled that a
specification may not settle it — an ADR must.

- **`archived` is the single terminal state.** Bedrock wins, because `AGENTS.md` says
  bedrock states the doctrine while `paths.md` carries operating detail. `done` means
  accepted, rebased, audited and merged — a completion, not an end; `archived` means off
  the portfolio, retained as history.
- **Abandonment is `running → archived`, and it takes no new word.** An abandoned path
  exits the door a finished one eventually uses, and never passes through `done`, because
  `done` asserts a merge that did not happen. An `abandoned` status was rejected: a fifth
  word for an existing shelf, which every consumer would then special-case into behaving
  exactly like `archived`. **The closing ceremony is not side-stepped** — that gate keys on
  `done`, and archiving claims the opposite, so it is a different destination rather than a
  cheaper route to the same one.
- **`active` is retired** (F11). It was accepted by `schema` and rejected by `branch-path`,
  so a path declaring it failed with a message about a different problem. No path file
  declared it, so this deletes dead vocabulary rather than migrating anything.
- **The honest half, stated so no later document can claim more.** A validator run sees ONE
  commit: it reads the state a file declares now and has never seen a transition. So the
  machine is doctrine, and what CI enforces is the set of per-state INVARIANTS, each a fact
  about one file — all of which already existed. **This ADR adds no blocking rule**, and
  that is a decision: *"which state was this in last week"* fails the first half of the
  admission test. A specification that said Cairn "enforces the path lifecycle" would be a
  fresh F13.
- **Staleness closes the other half of ADR-012's hole.** That hole was two things — no
  terminal transition, and nothing noticing a path that needs one. The advisory
  `path-staleness` rule reports a `running` path whose branch has had no commit for longer
  than the declared window (14 days), naming both ways out. Advisory permanently: a parked
  path is not a wrong path, and a build that failed for one would teach people to lie about
  status rather than to archive. The window is a **declared property of a repository**, the
  shape enforcement tiers took in ADR-016 §3, and it becomes configurable at S08.
- **Unknown reports nothing.** A branch the checkout cannot resolve — a shallow CI clone, a
  path whose branch lives on another machine — produces no finding. Unknown must never read
  as stale for the same reason it must never read as fresh. Pinned by a test over `null`,
  `undefined`, `NaN` and absence.
- **Documents corrected, not restated.** D2 §2.2 carries a dated banner and documents the
  accepted outcome, its vocabulary table loses the `active` row and its "Documented
  Lifecycle Gaps" entry is marked closed; the corrections register gains C16; §2.3's rule
  table is regenerated from the live source. `paths.md` states the vocabulary by reference
  to the ADR and moves hole 1 into its closed list, leaving **two** open. `index.html`
  names ADR-017 in its banner and carries the new rule. **Bedrock is untouched on purpose**
  — the ADR ratifies what bedrock 35 already said, and amending a page to agree with itself
  would be noise.
- Four regression tests. Suite 77 → 81.

### S07 — Specification, lexicon, and the primer that makes them readable — **SUPERSEDED by S07c**

> **Owner correction, 2026-08-25.** *"I never asked you to write specifically for researchers,
> I said i could land on researcher hands, it needs to be universal without borrowing concept
> from research worlds. Redo everything. Also I finally prefer to have one extended and
> exhaustive pedagogical file that alternate with cairn and foundation on whats it stands."*
>
> Two errors, and the first is the instructive one. The owner said the work **could** reach a
> researcher; the agent heard **write it for a researcher** and built the entire explanatory
> apparatus out of research-world concepts — positive controls, preregistration, instrument QC,
> held-out sets. That is not a tone slip: it makes the document **depend on** a reader having
> that background, which is the opposite of universal, and it does so while claiming to teach
> from zero. **A stated possibility was read as a specification.** The second error is
> structural and was the agent's own recommendation, chosen by the owner from the options the
> agent offered: three documents where one was wanted.
>
> The record of what was written is kept in this entry rather than deleted. S07c is the redo.

> **Owner amendment, 2026-08-25.** *"I want you to write the specification and lexicon…
> with a very pedagogical approach as much on the conceptual part… as in the practical
> implementation part, like if scientists that do most of the time R and python on
> prototype, notebook, and data analysis will welcome the production environment of
> software dev as a comforting robust zone where terms and design is for growth and not
> like a stressing place where everything is new and too abstract."* Named audience: a
> medical researcher whose PhD was on medical BERT, pre-ChatGPT. Structure chosen with the
> owner: a separate primer, a normative specification that points into it, and a lexicon
> carrying both registers; depth calibrated **from zero, including version control**.

Three documents, each honest about its job. The specification never stops being usable as
a specification, which is what a single teach-and-specify document would have cost.

- **`docs/cairn/foundations.md`** — the primer, from zero. Version control (a commit is a
  snapshot whose hash covers its whole ancestry; a branch is a movable pointer; a conflict
  is Git refusing to guess), tests (unit, regression, TDD), continuous integration, working
  in parallel, and why a protocol sits on top of the tools. It ends on the three things
  worth taking if the reader takes nothing else.
- **The bridges are load-bearing, not decoration.** A unit test is a positive control; a
  regression test is a scar turned into a guardrail; **TDD is preregistration** — you write
  the success criterion before you have the thing that must satisfy it, so you cannot move
  the goalposts; CI is instrument QC that runs before every batch; blocking versus advisory
  is exclusion criteria versus flags for manual review; **a generated file is a figure you
  do not edit in Illustrator.** Each maps a mechanism onto a rigour this reader already
  practises, so the vocabulary lands as recognition rather than as novelty.
- **The emotional claim is stated outright**, because the tooling never says it: none of
  this exists to slow you down — it exists so you can change things without being afraid,
  the way a held-out test set lets you tune aggressively without fooling yourself.
- **Every mechanism is taught through a failure this repository actually had**, named and
  dated: the piped gate that shipped a broken build (2026-07-16), the CI that never ran on
  the branches its rules were about (F8), the ceremony gate that proved a path had been
  *opened* while claiming it had been *closed* (F2), the derived view that was internally
  current and globally false (2026-08-20), the 34 links that were not broken. A primer of
  invented examples would have taught the same words and none of the fear.
- **`docs/cairn/specification.md`** — normative. Planes (three conceptual, two repository —
  the audit found these routinely conflated), the ADR-017 lifecycle and status vocabulary
  with its honest limit (*a validator sees one commit, so the machine is doctrine and only
  the per-state invariants are enforced*), concurrency, the three ordering rules each with
  the observed failure that produced it, ceremonies, "nothing is shared", the enforcement
  tiers, the generated rule catalogue, the coherence audit, this repository's declared
  properties, the two known limits, a five-step operator guide, and the tier-2 ruleset as a
  skippable `gh api` payload. Every section carries a `→ foundations §x` pointer.
- **`docs/cairn/lexicon.md`** — 60 terms in three sections: general practice, Cairn
  vocabulary, and **terms with nothing behind them yet**. Each entry is a plain gloss, a
  precise definition, and the enforcing file. The third section is the point: `cairn.config.json`,
  `cairn-init`, `cairn-new` and the generated enforcement header are marked **ASPIRATIONAL**
  with the step they land in, so nobody mistakes a plan for a mechanism. A vocabulary that
  hides which of its words are backed by code is how a protocol comes to describe a system
  that does not exist.
- **The catalogue is spliced, not pasted.** `cairn-rules.mjs --write` rewrites the table
  between markers in the specification, and **a test compares the shipped table against the
  generator on every CI run**. The document that warns about hand-written rule tables is now
  incapable of carrying one — the same defence that makes the bedrock 24 ceremony template
  executable. Round 3's register recorded exactly this failure (C7: `ledger-size` listed as
  live while no code implemented it).
- Two regression tests for the splice. Suite 81 → 83.

<details>
<summary><strong>S07 — the scope as accepted at the opening check, every item delivered</strong></summary>


- `docs/cairn/specification.md`: planes (three conceptual, two repository — the audit
  found these routinely conflated), lifecycle, status vocabulary, the full rule table
  generated from `cairn-check.mjs` so the count cannot go stale again, and the
  blocking-rule admission test.
- `docs/cairn/lexicon.md`: one definition per term, each pointing at the file that
  enforces it. A term with no enforcing file is marked aspirational.
- Resolve `active` as dead status vocabulary (F11) with an ADR beside it — accepted by
  `schema`, rejected by `branch-path`, reserved for a path that is now closed.
- State the F8 workflow decision and the CP-MVP-011/012 migration window as *properties*,
  not omissions.
- **The three enforcement tiers** (S06b): `local` / `ci` / `protected`, one line each on
  what the tier can and cannot prevent, with tier 2 stated as a property of a repository
  and never a requirement of the protocol. The claim about CI is made per tier, so no
  document asserts prevention that is not installed.
- Step-by-step operator guide for someone who does not already know the protocol —
  carrying the optional tier-2 ruleset as a JSON payload and one `gh api` command, marked
  skippable.

</details>

### S07b — The rendered page — **SUPERSEDED by S07c**

> Superseded with S07 above. Its page reused `index.html`'s design tokens, which the owner also
> rejected: *"Don't reuse de design system from precedent html file make one new clear and
> minimalistic moderne theme, that fit with dense content and multi support explanation
> (diagram, code blocks etc,..)"*. Reusing the house style was the safe choice and the wrong
> one — the earlier page is a short visual overview and this is a long reference document; the
> two have different jobs and should not share a layout.

The three documents are Markdown, which is what CI checks and what the repository keeps.
The owner shares this work outside the repository, so `docs/cairn/foundations.html` renders
the primer in the house style of `index.html` — same tokens, same light/dark handling, same
dated status banner naming what it renders and which file wins on disagreement.

- **The analogy gets a component, because it is the spine of the argument.** Every bridge
  is a two-column `.bridge` element — *in your world* → *in software* — so the translation
  is a visible structure rather than a sentence a skimming reader loses. Seven of them: the
  lab notebook, the parallel experimental arm, the positive control, preregistration,
  instrument QC, the figure you do not edit in Illustrator, exclusion criteria versus flags.
- **Failures get their own component too.** Four `.scar` blocks carry the CI that never ran
  on the branches its rules were about, the ceremony gate that proved the wrong
  proposition, the piped gate that shipped a broken build, and the 34 links that were not
  broken. They are visually distinct from the teaching because they are evidence, not
  illustration — and a primer of invented examples would have taught the same words and
  none of the fear.
- **The glossary appendix** carries the lexicon's plain-language column, thirty terms, with
  the blocking/advisory chips where they apply. The full lexicon with enforcing files stays
  in Markdown; the page says so rather than pretending to be complete.
- Structure validated by parser (no unclosed or mismatched tags); links resolve.

### S07c — Redo: one handbook, universal, in its own theme *(owner correction)* — **COMPLETE**

`foundations.md`, `specification.md`, `lexicon.md` and `foundations.html` are deleted and
replaced by **`docs/cairn/handbook.md`** and **`docs/cairn/handbook.html`**.

- **One document, two modes, alternating.** Each part is a `CONCEPT` block — a piece of general
  software practice explained from nothing, true of any project — immediately followed by an
  `IN CAIRN` block giving this protocol's implementation, the enforcing file, and the failure
  that made it necessary. The alternation is stated as a reading contract at the top: read
  straight through for both, or read only the `IN CAIRN` blocks, which are self-contained and
  carry **every** normative statement. That is what made merging the specification into the
  teaching safe — the normative layer stays extractable rather than dissolving into prose.
- **Universal, with the analogies removed rather than replaced.** Every research-world concept
  is gone. Nothing takes their place: the explanations now stand on concrete software
  situations, the actual failures, and diagrams. Substituting a different profession's
  analogies would have reproduced the defect with a different dependency — the fix is for the
  text to require no outside vocabulary at all.
- **The repository's own failures do the teaching**, and they are the one thing the redo kept
  intact: the automation that never ran on the branches its rules were about, the ceremony gate
  that proved a path had been *opened* while claiming it had been *closed*, the piped gate that
  shipped a broken build, the derived view that was internally current and globally false, the
  34 links that were not broken. They are evidence, they are dated, and they belong to this
  repository rather than to any reader's background.
- **Exhaustive.** Twelve parts: what a project is · version control · tests · automation and
  gates · working in parallel · the protocol layer · the lifecycle · the operator guide · this
  repository's declared properties · the known limits · the reference (generated rule catalogue
  + full lexicon) · the skippable tier-2 ruleset.
- **A new theme, built for this document.** Sans throughout, one accent, hairline rules, sticky
  contents column, and a design whose primary job is making the two modes legible at a glance —
  `CONCEPT` on the page ground, `IN CAIRN` in an accented panel. Four inline SVG diagrams
  replace ASCII where a picture carries more: the commit chain and hash propagation, branch
  divergence, the three enforcement states, and the lifecycle machine. Plus a fifth for the
  parallel-paths flow — registration commits on the trunk, three paths running at once, each
  merging itself. Theme-aware in light and dark, structure parser-validated.
- **The generator follows the file.** `SPEC_FILE` now points at `handbook.md`, so the test that
  compares the shipped rule catalogue against the validator's source still runs on every CI run.
  The HTML renders that catalogue as 18 unique rules with a footnote for the three that carry
  both a blocking and an advisory form, and states plainly that the Markdown is the
  authoritative copy — a rendered table that claimed to be generated would be the exact defect
  this document is about.
- Suite 83/83, unchanged: the redo is documentation and one constant.

### S07d — The binding names, and the document read downward *(owner, 2026-08-25)* — **COMPLETE**

Two owner corrections, one after the other.

**`atomik-project/` was being taught as if it were the protocol.** *"you use reference of
/atomik-project when it should be /project right ? because it is gonna be apply to any kind of
project"* — correct, and it is the same defect class this path exists to close, pointed at the
handbook itself: a document about portability was writing this repository's binding into the
protocol's prose.

- The handbook now writes **`project/`** for the execution-state plane root, with a
  **Notation** section stating that Cairn talks about roles and each repository binds them to
  its own names. Three places keep the real name on purpose and say why: **links**, which are
  addresses and must resolve; the **generated rule catalogue**, which prints whatever the
  validator has compiled in; and the **declared properties** section, which is where
  repository-specific facts belong.
- **The frontmatter namespace key is a binding too**, and it is the one that could not be
  genericised: the parser reads `atomik:` hardcoded. Publishing `cairn:` while the parser looks
  for `atomik:` would be *a published rule the implementation does not honour* — the exact
  failure the surrounding page is about. So the real key is shown, with the reason.
- The generated catalogue gained a line under it: its messages name this repository's bindings
  **because the validator has them compiled in**, and that is the clearest available statement
  of what S08 has left to do. Until those are configuration, Cairn is this repository's protocol
  that *could* be portable — not a portable protocol.

**The handbook is one stance, and the owner asked for its inverse.** *"you made the document
from foundation to cairn, which is a stance, but what would it look like from cairn to it
foundation elements manipulated, create a second file"*.

`docs/cairn/anatomy.md` + `anatomy.html` — **Cairn taken apart**.

- **The inversion is structural, not a reordering.** The handbook is organised by *concept*;
  this is organised by **primitive**, so every rule touching the commit graph sits together
  regardless of which feature it belongs to. That grouping is the value: it shows how few things
  the protocol touches and exactly where each one runs out.
- **The claim it makes:** Cairn manipulates seven primitives and nothing else — the commit
  graph, refs, the filesystem, file content, exit codes, the host environment, wall-clock time.
  Each construct is reduced to its exact predicate (`merge-base(trunk, HEAD) == trunk`;
  `∃ file with root-level path == <id> AND ceremony == <kind>`; `changed ∖ declared globs`) with
  what it reads, its verdict, and a **cannot** line naming where the primitive gives out.
- **The eighth input is a human judgement, and the central move is what happens to it**: every
  judgement is reduced to primitive 4, a file. An owner's acceptance becomes two metadata keys;
  an agent's architectural read becomes a record naming an outcome. That is what lets a protocol
  built for human decisions run in a script containing no intelligence — and it fixes the
  ceiling, which is why judgement-derived rules are advisory and existence-derived rules block.
- **The negative space is a section of its own**: eight primitives Cairn had available and
  refused, each with the reason — a model inside a gate, git hooks, server-side state, a lock on
  declared surfaces, timestamps as ordering authority, rewriting history to fit a later rule,
  summarising a rolled step, and a person as gatekeeper.
- **Two payoff tables the upward reading cannot produce.** All eighteen rules with their
  primitive, operation and verdict on one screen — showing that **nothing in the blocking set
  requires judgement**, which is the admission test applied eighteen times. And the **seams**:
  seven names, all inputs rather than logic, which is the honest measure of the distance to
  portability and makes it S08's checklist.
- The page reuses the handbook's theme with the accent shifted, so the pair reads as one set
  while the direction is legible at a glance, and adds two components the downward reading needs
  — a monospace `operation` block and a `cannot` rule.

### S08 — Extract Cairn from Atomik

Cairn is not portable today: `cairn-check.mjs` hardcodes `atomik-project/`, `apps/`,
`AREA_MAP`, and the grandfather set.

- `cairn.config.json` — plane roots, source roots, area map, trunk name, and
  `"enforcement": "local" | "ci" | "protected"` (S06b).
- `cairn-check` prints the declared tier in its header line, so "CI observes" versus "CI
  prevents" is generated from the repository rather than written into prose that drifts.
- `tools/cairn-new.mjs` — registration commit and worktree in one command, so the
  registration precondition stops depending on memory.
- `cairn-init` seed template + the ex-nihilo bootstrap prompt. It scaffolds **tiers 0 and
  1 only**: the validator, the config, the docs skeleton and the workflow file. No host
  configuration, no account, nothing to click — adoption must not require someone else's
  web UI.

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
| Steps complete | **S00** — enforcement repairs adopted (`dd6e76a`) · **S01** — ceremony schema pinned, D1 corrected, registration doctrine unified, ADR-016 (`c4a9670`) · **S04** — ledger boundary, CP-MVP-008 rolled into `history/`, advisory `ledger-size` (`7e04288`) · **S05** — five indexes, ADR frontmatter, schema validation over the decision plane (`3df9073`) · **S05b** — the opening check gated, five more indexes (`d6b29f1`), the invented folder-log decision retracted on owner correction (`360f2be`) · **S05c** — the OKF pair completed: eighteen folder logs seeded from real Git history (`468bc24`) · **S06** — `index.html` rewritten against ADR-012, both HTML pages dated (`2a5ef35`) · **S06c** — the coherence audit bound to the commits its path contributed (`de4e0fa`) · **S06d** — the six stale worktrees and the orphan registration branch drained, `isFilled()` given something to measure, and a C-quoted path stopped hiding from the blocking rules (`9cbe605`, `6fa33e7`) · **S07a** — ADR-017 settles the path lifecycle; `active` retired, abandonment given a door, staleness noticed without blocking (`b4ef361`) · **S07** — the primer, the specification and the lexicon, written from zero for a scientist audience on the owner's amendment; the rule catalogue spliced and test-pinned (`1db06de`) · **S07b** — the primer rendered as a shareable page in the house style (`a585ca3`) · **S07c** — redo on owner correction: one universal handbook, in its own theme (`697778a`) · **S07d** — the binding names genericised to `project/`, and `anatomy.md` — the same material read downward |
| Remaining | S08, S09 (S03 withdrawn by owner ruling; S06b rescoped and delivered inside S07 + S08 by ruling 9) |
| Opening check | accepted 2026-08-24, eight rulings ([note](../sessions/2026-08-24-cp-ops-002-opening-check.md)) |
| Gates at S07d | `cairn-check` OK (1 advisory: no coherence audit for this head, expected before merge) · validator suite 83/83 · HTML structure parser-validated · rolled records verified verbatim against `HEAD` by extraction and comparison |
| Ledger rolled (S07c) | `ledger-size` fired at ~11 k tokens against the 10 k budget while this file was being edited — which is the only moment the rule is useful, and it worked. S00, S01, S03, S04, S05 (+S05b, S05c) and S06 (+S06b, S06c, S06d) moved **verbatim** into [`history/`](./history/index.md), leaving one index line each. Verified by extracting each record's body and confirming it appears unchanged in `HEAD`. Two mechanical adjustments are named in every record header rather than made silently: deixis is left alone, and relative-link depth is repointed one level, because a link is an address rather than content and the same target must keep resolving |
| Scope note | protocol tooling and doctrine only; no product code, so `npm test` / `typecheck` / `build` are untouched by this step |
| Widening | `writes:` gained `atomik-project/briefs/cp-ops-002-handoff.md` at S01 — the per-step handoff brief is required by bedrock 22 and the original declaration simply omitted it. **Widened again at S06d** to `atomik-project/briefs/**`: F7's residue lives in that folder, and `scope-drift` said so the moment the owner ruled on `feedback on  MVP-001.md`. Recorded here and kept going, which is what `paths.md` asks of a widening |
| Next action | S08 — extract Cairn from Atomik: `cairn.config.json` (plane roots, source roots, area map, trunk name, and `enforcement`), the generated `cairn-check` header line that makes the tier claim un-driftable, `tools/cairn-new.mjs` (registration commit + worktree in one command), and a `cairn-init` seed scaffolding **tiers 0 and 1 only** — no host, no account, nothing to click. The lexicon already marks all four **ASPIRATIONAL**, so S08 is what drains that section |
| Superseded next action (S07, done) | the specification and lexicon: `docs/cairn/specification.md` (planes, the ADR-017 lifecycle by reference, the rule table generated from `cairn-check.mjs`, the blocking-rule admission test, the three enforcement tiers with tier 2 as a repository property, the CP-MVP-011/012 migration window as a property), `docs/cairn/lexicon.md` (one definition per term, each pointing at the file that enforces it; a term with no enforcing file marked aspirational), and the step-by-step operator guide carrying the optional tier-2 ruleset as a copy-paste `gh api` payload |
| Widening (S05) | `writes:` gained `docs/adr/**`, `docs/bedrock/index.md`, `docs/modules/**`, `docs/index.md`, `atomik-project/index.md` — S05 was always the OKF backfill; the declaration named only the two ADRs this path authors. Deliberate `single-truth` edit: `docs/modules/atomik-desktop.md`, one stale sentence naming the removed integrator |
| Corrections (S07c) | **2026-08-25, owner** — S07 and S07b redone. *"It needs to be universal without borrowing concept from research worlds"*: a stated possibility (this **could** reach a researcher) had been read as a specification, and the whole explanatory apparatus was built on research-world concepts, making a document that claimed to teach from zero **depend on** a background. Also: one file instead of three, alternating concept and protocol; and a new theme rather than the earlier page's house style. Analogies were **removed, not replaced** — substituting another profession's would reproduce the defect with a different dependency |
| Amendments (S07) | **2026-08-25, owner** — S07 widened from "specification and lexicon" to a three-document set with a **pedagogical** remit: a from-zero primer (`foundations.md`) for a named non-engineer audience, a normative specification that points into it, and a lexicon carrying both registers. Structure and depth chosen with the owner before writing. Adds S07b, the rendered page |
| Amendments | **2026-08-24, owner ruling 9** — S06b rescoped from "configure branch protection" to "declare the enforcement tier"; its deliverables move into S07 (specification + operator guide) and S08 (`enforcement` config field, generated header line, tier-0/1 `cairn-init`). This repository stays at tier 1, declared ([note](../sessions/2026-08-24-cp-ops-002-s06b-rescope.md)) |
| Blockers | none. Nothing now waits on host configuration, and S07a's dependency is discharged: the lifecycle is settled, so the specification can describe it by reference |
| Machine-local state (S06d) | `git worktree list` holds four entries — the owner's trunk, `cp-mvp-011`, `cp-mvp-012` and this path. Ten `path/*` branches retained; `registration/cp-worktree-cleanup` deleted as merged. This transition cannot be enforced by repository CI after the checkout disappears, so `paths.md` requires it to be REPORTED, which is what this row is |
