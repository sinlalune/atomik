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

### S07f — Candidate-bound closure and truthful team lifecycle — **COMPLETE**

An external senior review of the same protocol state found that Cairn's durable path and
checkpoint model was strong, while several closure and enforcement claims exceeded their
predicates. The user rejected the reviewer's suggested one-owner scope: Cairn remains for
teams with multiple developers and multiple agents per developer. A path has one assigned
writer in a writable worktree at a time, may change writers at a pushed checkpoint, and
remains independently pullable, navigable, and resumable from its remote branch.

The complete code-and-specification correction was held in the working tree, uncommitted
and unpushed, until the user's inspection. **The user passed it on 2026-08-26**, choosing
to land it as its own checkpoint so that the v0.2 protocol revision that follows reads as
its own reviewable diff rather than as one undifferentiated delivery.

- `ready` is the accepted state of a path branch; `done` is an integration fact recorded
  on the trunk. `blocked` retains `branch` and `base_commit`; archival carries
  `completed | abandoned | superseded` resolution with transition-specific constraints.
- Audit and closing acceptance bind the same full 40-character `subject_commit`.
  Acceptance also records actor, UTC time, accepted scope, decision, and disposition of
  advisories. Exactly one metadata-only closure commit may follow the implementation
  candidate; the integrating trunk result permits one further metadata commit.
- Critical registration, registration-parent, rebase, transition, acceptance, and
  record-integrity predicates report `pass | fail | inconclusive`; both non-pass outcomes
  exit non-zero. CI supplies the previous pushed SHA for a push, the base SHA for a pull
  request, and `HEAD^` only as final fallback, so transition and forward-scoped record
  integrity compare the proposed work unit rather than punishing old records.
- Existing session, audit, journal-entry, and rolled-history records cannot be modified,
  renamed, or deleted. Namespace indexes and logs remain mutable views. Path ids, filenames,
  branch names, and registration parents are checked; path declarations are archived rather
  than deleted.
- Coherence audit existence, completeness, path/branch/base binding, and exact candidate
  binding are blocking facts. Its architectural judgement remains human/agent judgement.
  Audit filenames use the full candidate hash, eliminating short-hash collisions.
- `ACTIVE.md` now keeps `running`, `blocked`, and `ready` paths visible. Worktree
  isolation is not treated as proof of writer exclusivity; writer assignment remains an
  operating responsibility.
- `same-work-unit` now guards all three roots the checker declares
  (`apps/`, `packages/`, `shared/`) instead of printing a stronger catalogue claim
  than its predicate.
- ADR-018 is **proposed**, not accepted. It preserves the team/path/checkpoint model, states
  the trusted-collaborator threat boundary, and leaves independently protected control-plane
  transport, versioned configuration, transaction commands, lightweight/emergency paths,
  and pilot metrics as explicit conformance gaps rather than claiming they exist.
- The canonical v0.1 specification now moves from simple durable objects through one path,
  remote resumability, parallel team work, evidence, registration, exact-candidate closure,
  truthful integration, lifecycle, trust and conformance. It creates no permanent owner or
  central integrator: roles are path-scoped and may be held by developers or agents under
  repository policy.
- Sixty-five specialist concepts have one article each under
  `docs/cairn/specification/concepts/`. Combined foundation chapters and the omnibus
  glossary are removed. The first full-protocol view now pairs each plain-language action
  with a linked Cairn term, and concept definitions link specialised dependencies at first
  use. Exact reference pages reconstruct the tree, path, human records, manual operations,
  versioned configuration target and conformance matrix.
- The repository map is exhaustive for active Cairn-defined roles rather than illustrative.
  It was checked against the current repository and now includes the workflow, tools,
  specification graph, folder indexes/logs, operating guide, event records, ledger history,
  journal, and optional project-memory spaces. Portable role names remain distinct from the
  installed `atomik-project/`, `docs/bedrock/`, `apps/`, `packages/`, and `shared/` bindings.
- The universal HTML is generated from the Markdown graph by
  `tools/cairn-spec-build.mjs`. Its flat research-paper system uses neutral translucent
  surfaces, precise serif/sans/mono typography, thin rules, and restrained frosted navigation
  chrome without gradients, themes, shadows, or decorative cards. Tree, pane, and pane seams
  have no layout gutters.
- The user-reported inert reader was a defect, not a browser limitation: first render tried
  to serialise both pane states before the second existed, aborting all click handlers. Both
  states are now initialised before rendering. Each pane is also a bounded overflow region,
  so it scrolls independently. Runtime DOM tests prove cross-pane wiki clicks and direct
  `#article-<id>` loading into the right pane.
- The universal file embeds 74 articles and remains self-contained, responsive, printable,
  keyboard-operable and sequentially readable without JavaScript. Tests pin deterministic
  generation, all Markdown/wiki/tree/anchor targets, equal-pane structure, live routing,
  scroll containment, rule parity, self-containment and inline-script syntax.
- The reference tools still do not claim what they have not implemented: ledger-prefix
  proof, portable configuration and migrations, independently protected control plane,
  exact protected transport, transaction commands, lightweight/emergency paths and measured
  operational cost all remain explicit conformance gaps.

### S07g — Cairn v0.2: close the gaps between the promises and the predicates — **COMPLETE**

A nineteen-item external review of the v0.1 specification, delivered by the user. Every
item is now resolved in normative text or listed under *Deliberate non-goals* with a
reason; none is deferred silently. **Specification text only** — no checker rule was
implemented, and every added requirement carries a conformance-matrix row whose
reference-tools column says `not implemented`. That ordering is the decision: the
specification is corrected first so the tooling has a correct target, and a matrix row
that lies about a mechanism is the exact failure this revision exists to remove.

- **Two items were broken promises, not missing features.** Rebase-before-close
  force-pushes the path branch and orphans every checkpoint the ledger names — so the
  ledger's resumability promise resolves to nothing at the moment the ledger is most
  complete. Retention refs under `refs/cairn/checkpoints/<path-id>/<n>` are now required
  before any rewriting push, with "forbid rewriting pushes on path branches" as the only
  other conforming option. And the rule that kept pre-acceptance work uncommitted and
  unpushed forbade publishing the single most losable state in the protocol: an agent's
  mid-session working tree. A **provisional commit** is pushed, carries
  `Cairn-Provisional: <reason>`, is never a checkpoint or a resume point, and is folded
  into its work unit before `C` exists.
- **The brief was the bootstrap contract with no fields.** It now has frontmatter
  (`checkpoint`, `checkpoint_pushed`, `base_commit`, `trunk_seen`, `writes`, `governs` as
  `path@<object-id>`, `verify` as exact commands, `budget_tokens`), seven capped body
  sections, a ~1200-token budget, and an **answerable-alone contract** — eight questions a
  reader with only `AGENTS.md` and the brief must be able to answer. Needing the ledger to
  answer any of them means the brief failed. **Cold resume** becomes the pilot's primary
  metric, ahead of ceremony time.
- **Records now mean what they claim.** `A` is restricted **field by field**, because the
  definition of done and both declared surfaces live inside the path record — a file-level
  restriction would let closure rewrite the standard its own acceptance was measured
  against. `scope_ref` gained a **scope digest** recorded at opening and re-verified at
  closing. `advisory_disposition` became a structured list required to match the findings
  raised at `C`; as one free-text string, "every advisory MUST be recorded" was
  unenforceable. Acceptance records name the roles the actor held, and a collapsed
  opening/closing actor raises an advisory — the degradation is made visible rather than
  forbidden, because forbidding it would exclude the setup most likely to adopt Cairn
  first.
- **Drift is a predicate, and the obvious rule was rejected by name.** The closing record
  names its base `T`; an acceptance survives while the trunk delta from `T` to `T'` touches
  nothing in `writes:` ∪ `governs:`. `remote_trunk == T` at integration is refused in the
  normative text with its reason: it is first-come-first-served, every landing invalidates
  every other open acceptance, and where audit plus acceptance outlast the trunk's landing
  interval nothing ever closes — worst on exactly the busy repositories the protocol is
  for.
- **The counterweight, without which this revision would be strictly harder to adopt than
  what it replaces.** Every item above is a tightening. The **lightweight path** becomes
  the **default route**: opening acceptance inside the path record, coherence questions
  answered inside the closing record, `A` allowed to share `C`'s commit — with exact
  candidate identity and exact acceptance fully retained. `route: full` is *required* by
  five named triggers, and escalation is one-way; no path may declare itself down.
- **Typed work units** (`implementation`, `documentation`, `decision`, `foundation`,
  `repair`, `closure`) make "where relevant" exact. The untyped rule demanded a module note
  from a typo fix, which trains a writer — human or agent — to manufacture an empty
  documentation delta until the gate goes quiet.
- **Repair procedures** for the eight violations real deployments hit, each a `repair` work
  unit that leaves the violation visible in the ledger and is never the same unit as the
  work that caused it. **Redaction** is a ceremony beginning with rotation, because
  redaction is not un-disclosure.
- **Editorial.** Identity is the full object id in the repository's configured object
  format, not forty hex characters — the "universal" edition was SHA-1-specific. The
  lifecycle diagram and table are reconciled both ways: `ready → blocked` exists (acceptance
  stalls), `blocked → ready` does not (reaching `ready` is execution), and
  `archived → archived` is removed because an unchanged state is not an event.
- **The origin gap.** A **foundation path** covers a repository's own first hour: write
  surface `docs/**` plus `draft` path records, documents as work units, verification by
  `links` + `schema` + coherence audit — three rules that already existed, so no new gate —
  and a deliverable of foundational text plus a roadmap of `draft` path records awaiting
  opening acceptance. Its **adoption** variant back-documents a brownfield repository into
  a legal entry point. Governing documents pinned as `path@oid` are also what make the
  scope digests cheap.
- **Concept budget held at 66.** `file`, `markdown`, `fetch`, `push` and `working-tree`
  merged into `project-memory`, `frontmatter`, `fetch-and-push` and `worktree`, paying for
  `checkpoint-retention`, `provisional-commit`, `scope-digest`, `acceptance-drift` and
  `foundation-path`. The Git-glossary split (21 borrowed terms, 45 Cairn concepts) is
  structural and **added no article**, which the brief required.
- **ADR-019** records the decisions and amends ADR-018 on the two rules v0.2 contradicts.
  It stays `proposed`. Five regression tests added to the executable documentation
  contract; suite 118 → 123.

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
| Steps complete | **S00** — enforcement repairs adopted (`dd6e76a`) · **S01** — ceremony schema pinned, D1 corrected, registration doctrine unified, ADR-016 (`c4a9670`) · **S04** — ledger boundary, CP-MVP-008 rolled into `history/`, advisory `ledger-size` (`7e04288`) · **S05** — five indexes, ADR frontmatter, schema validation over the decision plane (`3df9073`) · **S05b** — the opening check gated, five more indexes (`d6b29f1`), the invented folder-log decision retracted on owner correction (`360f2be`) · **S05c** — the OKF pair completed: eighteen folder logs seeded from real Git history (`468bc24`) · **S06** — `index.html` rewritten against ADR-012, both HTML pages dated (`2a5ef35`) · **S06c** — the coherence audit bound to the commits its path contributed (`de4e0fa`) · **S06d** — the six stale worktrees and the orphan registration branch drained, `isFilled()` given something to measure, and a C-quoted path stopped hiding from the blocking rules (`9cbe605`, `6fa33e7`) · **S07a** — ADR-017 settles the path lifecycle; `active` retired, abandonment given a door, staleness noticed without blocking (`b4ef361`) · **S07 / S07b / S07c / S07d** — superseded specification attempts retained in this ledger · **S07e** — one canonical top-down specification project, linked newcomer foundations and implementation references, plus one self-contained three-pane universal reader · **S07f** — candidate-bound closure, truthful team lifecycle, the canonical concept wiki and the deterministic equal-pane universal reader, passed by the user and landed as its own checkpoint · **S07g** — the Cairn v0.2 revision: nineteen review items resolved in normative text, concept budget held at 66, ADR-019 proposed |
| Remaining | S08 and S09 (S03 withdrawn by owner ruling; S06b rescoped across S07 + S08 by ruling 9). S08 now also owns the v0.2 predicates: fourteen conformance rows say `not implemented` on purpose |
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
