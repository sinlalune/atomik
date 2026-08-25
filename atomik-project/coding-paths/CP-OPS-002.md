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
    - atomik-project/briefs/cp-ops-002-handoff.md
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

#### Landed in S00 — Restore the rebase gate in CI

Repaired directly at the owner's instruction before this path was opened. `resolveBranch()`
asks the host before the checkout; a new `branch-identity` rule fails closed when the
branch is undeterminable and guarded roots changed; `cairn.yml` checks out the pull
request HEAD sha so the gate judges the commit that lands rather than a merge preview
that contains the base by construction. Four regression tests.

#### Landed in S00 — Make the closing ceremony identifiable

Repaired with S01. Ceremonies are declared in frontmatter (`path:` + `ceremony: closing`)
and matched on exact path id; sixteen closure notes backfilled; three regression tests.
No grandfather set was added.

#### Landed in S00 — CI runs on path branches *(F8)*

Found after S01/S02: CI triggered on `push: master` and `pull_request` only, and every
path in this repository merges with a LOCAL merge commit — zero pull requests in history.
So no path-scoped rule had ever executed in CI. `push` now includes `'path/**'`, with a
`concurrency` group so a push-per-commit does not multiply runs.

#### Landed in S00 — `writes:` parsed from the frontmatter *(F9)*

The scan read the whole document, consumed `---` as a write surface, and refused the
trailing comment that the bedrock 24 template itself shows — so a path copied faithfully
from the template declared nothing and silently disabled `scope-drift`.

> **Status correction (third-party coherence audit, 2026-08-24).** An earlier version of
> this file marked S01/S02/S02b/S02c **DONE** and said they "landed on the trunk". Git
> disproves it: `HEAD` and `origin/master` are both `7aa3b1d` and every one of those
> changes is an uncommitted working-tree modification.
>
> Under Cairn's own completion definition — *"a step is not complete until its commit is
> online"* — the honest status is **implemented locally, uncommitted, not complete,
> awaiting adoption by the accepted path.**
>
> This is the most consequential incoherence the audit found, and it was in the execution
> plane rather than the documents: a path file claiming landed work that does not exist is
> exactly the failure the protocol is built to prevent, written by the audit that named it.
> The opening ceremony ratifies the set and the worktree adopts it; nothing is complete
> until then.

### S00 — Adopt the local repairs *(ruling 1)* — **COMPLETE**

The stash carried F1/F2/F8/F9 into this worktree and they land here, run through the
protocol they repair rather than around it. This is the first commit on a `path/*` branch
in this repository whose push will be seen by CI.

Contents: `resolveBranch()` + the fail-closed `branch-identity` rule (F1), frontmatter-based
`ceremonyFromSessions()` + 16 backfilled closure notes (F2), `push: path/**` with a
concurrency group and the PR-head checkout (F1/F8), frontmatter-scoped `parseWrites()` (F9),
the rule-table generator and its four guards, the audit record carrying F1–F15, the round-3
deliverables, and `index.html` restored behind a SUPERSEDED banner with `workflow.html`
byte-identical to master (ruling 4).

### S01 — Schema and doctrine fixes *(rulings 2 and 3)* — **COMPLETE**

- the **root-level** session ceremony schema (`path:` / `ceremony:`) is pinned once, in
  `docs/bedrock/24_24-doc-templates.md` § *Session note and ceremony template*, together
  with the two reader properties it depends on: no inline comment on either key, and
  nothing else in the note is read by the gate *(F13)*;
- the D1 operator guide is corrected at both ceremony sites and at its registration step,
  and carries a dated interim banner naming ADR-016 and its S07 replacement. The two
  earlier research records, which propose the same nested form, carry a dated
  ceremony-schema banner instead of a silent edit — they are records of a proposal, not
  instructions;
- `atomik-project/coding-paths/paths.md` now states a registration commit is
  **metadata-only** — declaration, regenerated view, opening-check note, and no
  implementation of any kind — resolving the doctrine conflict `AGENTS.md` requires to be
  reported *(F15)*. Bedrock 24 says it identically;
- `ADR-016 — Cairn enforcement integrity` records the whole set (F1, F2, F8, F9, F13,
  F15), including why the nested ceremony form is rejected rather than
  accepted-for-compatibility, and why the registration rule is an invariant rather than a
  file count;
- three regression tests. Two are the durable half: the shipped bedrock 24 template is
  parsed by the test itself and must satisfy `ceremonyFromSessions()`, so the
  documentation is executable and F13 cannot recur by restatement; the third pins the
  inline-comment trap that would otherwise reintroduce it. Suite 50/50.

### S03 — ~~Drain the grandfather set~~ — **owner-ruled, withdrawn**

Owner ruling (2026-08-24): CP-OPS-001 resolves this in the normal course. The set is
finite and drains when CP-MVP-011 and CP-MVP-012 land. Remaining residue, folded into
S07: state the migration window as a property in the specification, and delete
`LEGACY_UNREGISTERED_PATHS` when it empties so the exception does not outlive the
migration by inattention.

### S04 — Bound the ledger *(F4, medium — advisory)* — **COMPLETE**

`log.md` was frozen so parallel paths stop colliding on one file, not for context cost —
that succeeded. Separately, the live path corpus (~85 k tokens) had no upper bound and a
single path file exceeded 23 k. Not a defect; a boundary set before it was hit.

- **The convention** is in `paths.md` § *The ledger has a boundary*: completed steps roll
  into `atomik-project/coding-paths/history/<id>-S0N.md`, one file per major step with
  sub-steps beside the step they belong to. The path file keeps its declaration, a one-line
  index per step, the Work Ledger, the next action and blockers.
- **The move is VERBATIM** — cut and paste, never summarize. Summarizing at rollup time
  would quietly rewrite the record, which is the one thing a ledger may not do. It is the
  property that makes rolling safe, so it is stated in the convention, in the index, and in
  the header of every record.
- **`CP-MVP-008` migrated as the proof**: ~23.5 k tokens to ~4.7 k, seven step records
  under `history/`. Verified line-for-line — the 1,621 non-empty lines of its Execution
  section are byte-identical to what the records now hold.
- **`ledger-size`** is advisory and DIFF-SCOPED, over a 10,000-token budget: a path file
  should not cost more than the entire mandatory entry chain (~9.3 k). A corpus sweep would
  report the same four historical files on every run for months, and a check that cries
  wolf is a check people switch off. Four tests, including one pinning `approxTokens()` to
  the same words × 4/3 proxy the F4 table used, so a finding and the audit record are
  comparable numbers.
- Bedrock is untouched on purpose: `AGENTS.md` says bedrock states the doctrine while
  `paths.md` carries the operating detail and may change without amending a bedrock page.
  A ledger rotation convention is operating detail.
- Round 3's register row C7 said `ledger-size` did not exist in code. True when written,
  false now — the row is corrected and §2.3's rule table regenerated from the live source.

### S05 — Backfill OKF *(closes F5, medium)* — **COMPLETE**

Bedrock 26 says *"an agent should read the nearest relevant `index.md` before opening many
files"*, and the three directories `AGENTS.md` routes every agent into had none. The
progressive-disclosure contract was unimplemented at its own entry points, which forces
the flat full-directory reads it exists to prevent — and feeds F4.

- **Five indexes**: `docs/bedrock/` (37 pages, one line each from their own frontmatter,
  plus the four entry points and the status vocabulary), `docs/adr/` (16 records with
  status and date), `docs/modules/` (the six area notes and the `AREA_MAP` that routes a
  source change to one), `atomik-project/sessions/` (the ceremony schema and a
  ceremonies-by-path table), `atomik-project/audits/` (nine records with their verdicts).
  `docs/index.md` and `atomik-project/index.md` now route into them.
- **Frontmatter across all 16 ADRs** — `type` / `title` / `description` / `tags` /
  `timestamp` plus an `adr:` block (`id`, `status`, `date`). Descriptions were written
  from each record's own Decision section, not from its title.
- **Schema validation reaches the decision plane.** `adrFrontmatterErrors()` is blocking
  and corpus-scoped like its path counterpart: the id must match the file name, the status
  must be in vocabulary, the date must be ISO, and **the frontmatter status must agree with
  the document's own `Status:` line**. A record whose two halves disagree is worse than one
  that never claimed to be readable. Four tests.
- **The sessions index states an asymmetry rather than hiding it**: sixteen closing notes
  carry the declaration because a blocking gate reads them; most opening checks do not,
  because nothing reads those. Marked *(undeclared)* per row. No mass edit was made — that
  is a decision, not a backfill.
- **A second trap of the F9 family, found live.** A trailing comment on a `writes:`
  ITEM became part of the glob, so the widened declaration above kept reporting drift and
  the path silently declared less than it said. `parseWrites()` now strips it, with a
  test. F9 fixed the same trap one line higher, on the `writes:` key itself.
- **Coherence repair found while indexing**: `docs/modules/atomik-desktop.md` still said
  *"a lane appends here / the integrator appends here"*. ADR-012 removed both. Repaired
  with a dated note. This is the deliberate `single-truth` advisory on that file.

### S05b — Gate the opening check, finish the OKF backfill *(owner directive 2026-08-24)* — **COMPLETE**

Owner, reading the S05 report: *"we don't have index in all folder in /docs is that a
decision to not have a log file also on all folders? ... ceremony opening, back filling
why not but maybe add a blocking gate."* Three answers, all landed.

- **The opening check is now BLOCKING.** F2 repaired the closing gate and left its twin a
  convention, so a path could be registered, branched and worked with no recorded
  acceptance at all — the ceremony `paths.md` calls the activation gate was the one
  nothing checked. `openingFromSessions()` mirrors its closing counterpart, scoped to a
  path file IN THE DIFF declaring `running`, so the eight paths that opened before session
  notes existed are never examined. Eleven opening notes backfilled with the declaration.
  Seven tests.
- **The exception is finite and named.** `LEGACY_UNDECLARED_OPENINGS` holds CP-MVP-011 and
  CP-MVP-012: both have a real opening note, neither declares it, and both live on branches
  this checkout must not write. They get an advisory telling them how to clear it — two
  keys in the note they already have — and the set drains when they merge.
- **Five more indexes**: `docs/cairn/`, `docs/research/`, `docs/contracts/`,
  `docs/fixtures/`, `docs/agents/`. Every meaningful folder in `docs/` and
  `atomik-project/` now has one. `atomik-project/sources/` is empty and
  `atomik-project/projects/` holds one file — an index over nothing is noise.
- **The OKF guideline on folder logs is stated, not overridden.** Bedrock 26 gives a
  meaningful folder both `index.md` and `log.md`. The convention has taken exactly one
  amendment in this repository, and it was about CONCURRENCY, not size: several paths
  appending to one journal collided, so `log.md` was frozen and the journal became one
  file per entry under `log/`. A shared log takes that shape; a folder log was never
  decided against.

  > **Retraction, same day, owner correction.** The first version of this step recorded
  > "no per-folder `log.md`" as a *decision* in both plane indexes, reasoning from the
  > collision that froze the journal. The owner: *"once again there was no decision made
  > against log file size — we just split it for multilane amendment and now it is in
  > /log folder, we just need to respect OKF guideline."* Correct on both counts. Nobody
  > took that decision, and an agent writing doctrine on its own authority is exactly what
  > `AGENTS.md` forbids and what this path exists to stop. Retracted in `docs/index.md`
  > and `atomik-project/index.md`, each carrying a dated correction line rather than a
  > silent edit. **This is the second time in this path that a plausible rationale was
  > mistaken for a decision on record** — F4's own first draft claimed `log.md` was frozen
  > for context cost. Same file, same wrong reason, twice.

### S05c — Log everywhere *(owner directive 2026-08-24)* — **COMPLETE**

Owner, after the retraction: *"LOG EVERYWHERE AND GO NEXT."*

OKF gives a meaningful folder both halves of a pair, and this repository had been
carrying only one. Eighteen folder logs, each **seeded from that folder's real Git
history** — the fifteen most recent commits that touched it, newest first, merges
omitted because a merge names the path rather than the change. Nothing invented, and
nothing back-dated: where the history is two commits, the log has two entries.

- `docs/`: `adr`, `bedrock`, `cairn`, `contracts`, `diagrams`, `fixtures`, `learning`,
  `modules`, `research`, `agents`.
- `atomik-project/`: `audits`, `brainstorm`, `briefs`, `coding-paths`,
  `coding-paths/history`, `sessions`, `projects`, `sources`.
- `atomik-project/projects/` and `sources/` gained the missing `index.md` too — a log
  linking a map that does not exist is a broken link, and `cairn-check` said so.
- `docs/log.md` records the change at the plane level without inventing the month of
  entries it never had.
- Each log states the append rule and the escape hatch: if two paths ever collide on
  one of these files, it takes the amendment the journal already took — one file per
  entry in a `log/` subfolder, a CONCURRENCY fix, never a size one.

### S06 — Retire the drifted page *(closes F6, medium)* — **COMPLETE**

Rewritten rather than replaced by a generated view: the specification it would be generated
from does not exist until S07, and a page that teaches a rejected model for another two
steps is the defect, not the plan.

- **`docs/cairn/index.html` now renders ADR-012.** *Three roles* became **two roles and the
  job the third one used to do** — the integrator's work split three ways: shared files are
  derived so they cannot contradict, the mechanical rules are a script, and architectural
  drift is read by an agent whose findings never block. *One parent, N lanes, one gate*
  became **N paths, each merging itself**, with a redrawn flow diagram: three paths opening
  from a registration commit, each passing its own rebase → checks → ceremony → self-merge
  back onto the trunk, and nothing between them.
- **The enforcement table is the real one**: the blocking and advisory rules as implemented,
  including the opening check, the ledger boundary, and the schema rule now covering
  decision records. The old table listed nine, several of which had changed name or meaning.
- **The three-tier note lands here too** (S06b): adoption needs only the local command; CI
  *observes*; a trunk rule *prevents*; and the third is a property of one repository, never
  a requirement. A page claiming prevention it has not installed is the same defect as a
  rule certifying what it never checked.
- **Both pages carry a dated status banner** naming the ADRs they render. `index.html`
  drifted for ten days because nothing on it claimed a vintage — the banner repairs the
  *class*, not just this instance. `workflow.html` was verified unchanged: it never taught
  the integrator model.
- The four-merge experiment, the blocking-rule admission test and the "a false blocking
  verdict costs more than a missed one" evidence are kept verbatim. They were always true
  and are the best content on the page.

### S06b — Close the F8 residual — **declare the enforcement tier** *(ruling 6, rescoped by ruling 9)*

**Owner ruling 9 (2026-08-24), amending ruling 6** — recorded in
[the rescope note](../sessions/2026-08-24-cp-ops-002-s06b-rescope.md). Ruling 6 made host
branch protection the way to close F8. The owner opened the ruleset form, and stopped:
*"I am a little worried that it makes the protocol complicated to setup for adoption."*

That is a scope error in the protocol, not a cost to absorb. Branch protection is not part
of Cairn; it is the third of three enforcement tiers, and only the first is required:

```text
tier 0  local   npm run cairn-check          zero setup, no host, no account
tier 1  ci      .github/workflows/cairn.yml  one file — CI OBSERVES
tier 2  protected  a trunk ruleset           host-specific — CI PREVENTS
```

Nearly all the value is tier 0, which is where the protocol's own claim already lives:
*"these run locally with the same command CI runs."* An adopter with no GitHub account
still gets branch→path, trunk registration, the rebase gate, the ceremony gate, link
integrity and the derived views.

The protocol argument is the stronger one. A setup step performed once, in someone else's
web UI, invisibly, will be skipped — and the specification would go on asserting that CI
prevents merges. That is F13's species exactly: **a published rule the implementation does
not honour**. Tier 2 must therefore be a declared property of a repository, never a
requirement of the protocol.

Deliverables, placed where their homes are built rather than in an empty step of their own:

- **S07** — the specification documents all three tiers, one line each on what that tier
  can and cannot prevent, and states tier 2 as a repository property. The operator guide
  carries the tier-2 ruleset as a JSON payload plus one `gh api` command: copy-paste, not
  a click-path, and explicitly skippable.
- **S08** — `cairn.config.json` gains `"enforcement": "local" | "ci" | "protected"`, and
  `cairn-check` prints it in its header line
  (`cairn-check — branch path/cp-ops-002, enforcement: ci (observes)`), so the honest
  claim is GENERATED and cannot drift from the repository it describes. `cairn-init`
  scaffolds tiers 0 and 1 only — nothing to click, no account, no host.

**This repository stays at tier 1**, declared, with its ruleset page deliberately empty.
Tier 2 scales with the number of writers on a shared trunk, not with the protocol: one
writer dogfooding their own trunk is guarded by the ceremonies and the local gates, and
bypass was always one command away regardless.

### S06c — Bind the coherence audit to the HEAD it reviewed *(ruling 7, F12)* — **COMPLETE**

`cairn-audit` named a record for the current HEAD; committing it moves HEAD, so `--check`
could never match the commit that contains the record.

- `--check` now accepts a record naming HEAD **or any commit this path itself contributed**
  — `git rev-list HEAD --not <trunk>`, the same trunk ref `cairn-check` uses, threaded
  through so a `--base` run judges against the same tree. No renaming, no migration.
- **The bound is the point.** A record naming an arbitrary trunk ancestor proves nothing
  about this branch, and one belonging to another path is refused outright: the file name
  carries the path id, so that is checked rather than assumed. An unreadable trunk ref
  falls back to HEAD alone — the old, stricter behaviour, never a silently wider one.
- `--check` on a non-path branch now says *nothing to check* and exits 0, matching what the
  scaffold half already did for anyone running the command to see what it does.
- Seven regression tests, including the parent-naming case the nine records already have.

> **Correction to ruling 7's premise, verified rather than repeated.** The ruling said this
> "formalises what the nine files already do accidentally… every existing audit becomes
> retroactively valid." Checked against the repository: **seven** name a commit their own
> branch still contains. Two do not — `cp-ai-capabilities-9007e07` and
> `cp-render-repairs-d44d381` name a head the closing rebase rewrote, which exists as a
> loose object and is on no branch and not an ancestor of the trunk.
>
> Declining those two is correct, not a gap. `paths.md` requires the audit to run **after
> the rebase**, on the result that will land; a record naming a pre-rebase head reviewed a
> diff that no longer exists. The rule now says so instead of accepting it. Pinned by a
> test naming both records.

### S06d — Drain the leftovers *(ruling 8)* — **COMPLETE**

The two low-severity findings left over once the enforcement repairs landed. Both are the
path's own thesis in miniature: **a rule was written and the state that predates it was
never drained** (F7), and **a check measures something adjacent to what it claims** (F10).

- **F7 — the six stale worktrees are gone, their branches retained.** `cp-ai-capabilities`,
  `cp-feedback`, `cp-mvp-010`, `cp-open-dock`, `cp-render-repairs` and `cp-rich-markdown`
  each ran the full sequence `paths.md` prescribes, and each step was *checked*, not
  assumed: the branch head is an ancestor of `origin/master` after a fresh
  `git fetch origin master`; the target is a registered SECONDARY worktree in
  `git worktree list --porcelain`; `git status --porcelain=v1` prints nothing; removal
  without `--force`, run from this checkout rather than from the target or the owner's;
  then deregistration, absence on disk, and the branch still resolving afterwards.
  `git worktree list` now holds exactly four entries — the owner's trunk, the two
  grandfathered in-flight paths, and this one — while all ten `path/*` branches survive
  as the online per-step history the owner asked for.
- **The orphan `registration/cp-worktree-cleanup` is deleted** with `git branch -d`, not
  `-D`: the merged-ancestor test is Git's own, so the deletion is the check rather than
  something done after one. Its commit `9040417` — the repository's last real registration
  and the precedent S01 cites — remains in the trunk's history; only the spent ref is gone.
- **F10 — `isFilled()` measured a deletion.** `!text.includes(PLACEHOLDER)` passed an empty
  file: delete the placeholder string and a hollowed-out record was indistinguishable from a
  real audit. It is replaced by `fillErrors()`, which asks the two things a deterministic
  gate honestly can — the record NAMES an outcome from the stated vocabulary, and it ANSWERS
  at least one of its own findings questions — and reports *which* is missing rather than
  one flat "still a scaffold". `isFilled()` survives as `fillErrors(text).length === 0`.
- **The vocabulary is matched by STEM, and that is a finding, not a convenience.** The
  template states three outcomes; CP-OPS-001's record says *"drift noted, repaired before
  merge"*, which names the second and then says what happened to it. An exact-phrase rule
  would have declined a substantive audit — the false blocking verdict this repository
  says costs more than a missed one. Checked before writing the rule rather than after:
  **all nine existing records pass**, four answered questions each, and the untouched
  scaffold fails on two counts.
- **What it deliberately does not ask** is whether the answers are any good. That is the
  non-deterministic judgment the whole split exists to keep out of a gate, and it is why the
  rule stays advisory with a human reading the findings.
- Four regression tests, including the hollowed-out record the old rule accepted and the
  qualified verdict an exact-match rule would have refused. Suite 72 → 76.

> **Left deliberately: `atomik-project/briefs/feedback on  MVP-001.md`.** F7 names it too —
> a double space in the filename, no frontmatter — and it is the one item in the finding
> that is not mine to drain. It is the owner's own raw feedback, and `atomik-project/log.md`
> — the FROZEN archive that may never be rewritten — cites it by that exact name. Renaming
> it would break a reference in a file the protocol forbids repairing, to fix something
> F7 itself classes as *unconventional, not wrong*. It needs an owner call, not an agent's.

### S07a — ADR-017, the path lifecycle *(ruling 5, F11 + F15)*

Round 3's D2 declared `done` terminal and drew `running → archived`, contradicting bedrock
35 (*"a finished path moves to `done`, then `archived` — demotion, never deletion"*) and
ADR-012 (abandoned paths have no terminal transition). The validator checks current
statuses, never transitions.

- `ADR-017` settles `done → archived`, gives abandoned paths a terminal transition, and
  retires `active` from the vocabulary.
- D2 §2.2 is marked **proposed** until the ADR lands, then documents its outcome.

### S07 — Specification and lexicon

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
| Steps complete | **S00** — enforcement repairs adopted (`dd6e76a`) · **S01** — ceremony schema pinned, D1 corrected, registration doctrine unified, ADR-016 (`c4a9670`) · **S04** — ledger boundary, CP-MVP-008 rolled into `history/`, advisory `ledger-size` (`7e04288`) · **S05** — five indexes, ADR frontmatter, schema validation over the decision plane (`3df9073`) · **S05b** — the opening check gated, five more indexes (`d6b29f1`), the invented folder-log decision retracted on owner correction (`360f2be`) · **S05c** — the OKF pair completed: eighteen folder logs seeded from real Git history (`468bc24`) · **S06** — `index.html` rewritten against ADR-012, both HTML pages dated (`2a5ef35`) · **S06c** — the coherence audit bound to the commits its path contributed (`de4e0fa`) · **S06d** — the six stale worktrees and the orphan registration branch drained, `isFilled()` given something to measure |
| Remaining | S07a, S07, S08, S09 (S03 withdrawn by owner ruling; S06b rescoped and delivered inside S07 + S08 by ruling 9) |
| Opening check | accepted 2026-08-24, eight rulings ([note](../sessions/2026-08-24-cp-ops-002-opening-check.md)) |
| Gates at S06d | `cairn-check` OK (1 advisory: no coherence audit for this head, expected before merge) · validator suite 76/76 |
| Scope note | protocol tooling and doctrine only; no product code, so `npm test` / `typecheck` / `build` are untouched by this step |
| Widening | `writes:` gained `atomik-project/briefs/cp-ops-002-handoff.md` at S01 — the per-step handoff brief is required by bedrock 22 and the original declaration simply omitted it |
| Next action | S07a — `ADR-017`, the path lifecycle (ruling 5, F11 + F15): settle `done → archived`, give abandoned paths a terminal transition, retire `active` from the vocabulary, and mark round 3's D2 §2.2 *proposed* until it lands. It blocks S07, which cannot describe a lifecycle the ADRs still contradict |
| Widening (S05) | `writes:` gained `docs/adr/**`, `docs/bedrock/index.md`, `docs/modules/**`, `docs/index.md`, `atomik-project/index.md` — S05 was always the OKF backfill; the declaration named only the two ADRs this path authors. Deliberate `single-truth` edit: `docs/modules/atomik-desktop.md`, one stale sentence naming the removed integrator |
| Amendments | **2026-08-24, owner ruling 9** — S06b rescoped from "configure branch protection" to "declare the enforcement tier"; its deliverables move into S07 (specification + operator guide) and S08 (`enforcement` config field, generated header line, tier-0/1 `cairn-init`). This repository stays at tier 1, declared ([note](../sessions/2026-08-24-cp-ops-002-s06b-rescope.md)) |
| Blockers | none. Nothing now waits on host configuration |
| Machine-local state (S06d) | `git worktree list` holds four entries — the owner's trunk, `cp-mvp-011`, `cp-mvp-012` and this path. Ten `path/*` branches retained; `registration/cp-worktree-cleanup` deleted as merged. This transition cannot be enforced by repository CI after the checkout disappears, so `paths.md` requires it to be REPORTED, which is what this row is |
