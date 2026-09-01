---
type: Atomik Brief
title: Handoff — CP-OPS-002
timestamp: 2026-09-01T00:00:00Z
atomik:
  path: CP-OPS-002
  written_by: cp-ops-002-writer
  branch: path/cp-ops-002
  checkpoint: 1983644
  checkpoint_unit: 41
  checkpoint_pushed: true
  base_commit: 7aa3b1d
  trunk_seen: dfcd09d
  writes:
    - cairn.config.json
    - tools/cairn-*.mjs
    - tools/cairn-config.schema.json
    - .github/workflows/cairn.yml
    - AGENTS.md
    - atomik-project/coding-paths/paths.md
    - atomik-project/coding-paths/binding.md
    - atomik-project/coding-paths/paths-history.md
    - docs/agents/*.md
    - docs/bedrock/22_22-agent-handoff.md
    - docs/bedrock/archive/22_22-agent-handoff-pre-cairn-extraction.md
    - docs/cairn/**
    - docs/adr/**
    - atomik-project/coding-paths/CP-OPS-002/index.md
    - atomik-project/coding-paths/history/**
    - atomik-project/briefs/**
    - atomik-project/log/**
  governs:
    - atomik-project/coding-paths/paths.md@468a922f03c2e7a8a1c737b8fc909292d6bc8e34
    - docs/bedrock/22_22-agent-handoff.md@c10ed0a11bc501336f449be204b57408f80c196e
    - docs/cairn/cairn-audit-2026-08-24.md@319d54d2035b03dddb03f379cc7874bcbc448154
    - docs/cairn/cairn-s08-opening-brief-2026-08-31.md@7f52feaa8d1e5ded7514a2f39127f755c39d40b2
  verify:
    - npm run cairn-check
    - npm run cairn-check:test
    - npm run cairn-spec:build
---

# Resume CP-OPS-002 here

## Outcome

Close Cairn's enforcement gaps, drain the state that predates each rule, and
extract the protocol from Atomik as a portable specification and init kit.

## State

The specification is v0.2 and its predicates are implemented. The work since is
about whether the rules are honest, not whether there are enough.

**The finding that organises everything else:** every enforcement defect here is
a proxy predicate substituted for the sentence the rule states. **All of them are
now closed.** The last, `unretainedCheckpoints`, reported "nothing orphaned" once
the retained set stopped intersecting the branch — which is what the mandatory
pre-merge rebase causes — and is repaired under `ADR-021`.

**S08 so far — twenty-two units.** Full records in the path file; what a resuming
session needs from them:

- The local gate defaults to the **trunk** base on a path branch (S08a).
  `--working-tree` is the opt-out and raises `base-parity`. **Every verdict
  recorded before unit 19 is the narrow one.**
- An **empty ref namespace is inconclusive, not absent** (S08b). CI fetches
  `+refs/cairn/*:refs/cairn/*`; without that step retention cannot be judged.
- **CI is read, not reproduced** (S08c). `gh run view --log` is the source for any
  claim about what CI reported.
- **[`ADR-020`](../../docs/adr/ADR-020-protocol-context-weight.md) is `accepted`**
  (S08d–S08g). Read it rather than a summary. What binds a resuming session:
  **no token counts anywhere**; what will not fit is **linked, never compressed**;
  and the **queued ledger roll is deliberately not done**, superseded by stage 2.
- **All four live trunk defects are closed** (S08h, S08i). `journal-entry` is new
  and blocks a record **reaching** `done` with no entry declaring it, with no
  migration exemption — so this path owes its own entry at closure. `hasCeremony`
  and `derived-view` were repaired on this branch and are broken only on the
  trunk, where merging repairs them.
- **Three plans did not survive contact, and every record says so** (S08i, S08j).
  Item 3's recorded fix — key `derived-view` on the declared `status` — was
  correct and unnecessary; the exemption was deleted instead. Item 3c's proposed
  rule was measured against the records that motivated it and could not see them,
  so `record-date` blocks on author agreement and **advises** on divergence from
  the adding commit's author date. Item 4's figure had lost its date in transit
  and was three weeks out of true; the ADR was written on a fresh measurement.
- **[`ADR-021`](../../docs/adr/ADR-021-checkpoint-retention-generations.md) is
  `accepted` and implemented** (S08j designed it, S08k landed it). Retention refs
  carry a generation, `.../g<NN>/<n>`. What binds a resuming session: **the
  current generation is derived from ancestry, never recorded** — do not add a
  `generation:` field anywhere; **no retention ref is ever moved**, including the
  flat pre-notation ones; **an empty current generation beside older ones is
  blocking and definite**, distinct from an unreadable namespace or range, which
  stay inconclusive; and the retention range is `merge-base(trunk, HEAD)..HEAD`,
  not `base_commit..HEAD`. Read the ADR rather than a summary.
- **This branch runs on `g01`, 29 refs from `53b11f0`** (S08k). The 28 flat refs
  are untouched and stay that way. **After the next rebase, opening `g02` is part
  of that rebase's work unit** — the gate will say so, and say it definitely.
- **This record is a FOLDER** (S08l), and it is the worked example for
  [ADR-020](../../docs/adr/ADR-020-protocol-context-weight.md) decision 4. Read
  `CP-OPS-002/index.md` and nothing else by default; steps are one file each
  under `steps/`, the forward plan is `plan.md`, and there is **no rollup** — a
  step is written where it lives. What binds a resuming session: **a record's
  identity is the id it declares, not the file that carries it** (three rules
  keyed on the path and all three were wrong about a record that had merely
  moved); **a step record is append-only wherever it sits**; and a record may be
  RELOCATED — links repointed, text appended, nothing else — which the checker
  tells from a rewrite by normalising link targets away and requiring a prefix.
- **Dates follow renames** (S08m). `record-date` asked when a file's PATH first
  appeared and called it when the record was written, so every relocated record
  was accused of the migration's own date — nineteen false advisories, the same
  substitution as the three blocking rules above, one volume down. `--follow`
  fixes it, and the rule still reports a genuinely misdated new record.
- **A step append is not a rewrite** (S08n). The late S08m ledger row was an
  exact suffix append, which the specification permits and the checker rejected
  from Git status alone. Born-sliced steps now follow their own identity to the
  adding blob: that blob must remain a prefix wherever the step sits. This makes
  the predicate independent of the local/CI comparison ref, while flat-ledger
  prefix and verbatim-roll proof remain explicitly partial.
- **The host is an adapter, not part of the protocol** (S08o). Required reading
  is now the portable `paths.md`, the portable Cairn execution reference, and one
  explicit Atomik `binding.md`. Bedrock 22 is a stable host pointer; bedrock 00
  is product constitution selected by coverage, not an unconditional protocol
  read. Both former combined pages remain linked explanatory records.
- **The adapter is now executable** (S08p). `cairn.config.json` schema 1 is the
  sole machine-readable host binding for the checker, active view and audit
  scaffold. The loader fails before rules on unknown versions, fields or unsafe
  paths; the checker prints the effective profile and binding; and portable tool
  logic no longer reconstructs Atomik roots, its trunk/remote pair, metadata
  key, areas or module notes from constants. This is deliberately only the seam:
  schema migrations, installation/update, generated adapters, public extraction
  and `cairn-init` remain open. The concept root is bound now; its pedagogical
  index and template are initializer work, not implied by a path.
- **The seed taught a shape the specification had already superseded** (S08q).
  Canonical text moved to born-sliced records and generation-aware retention;
  the pages an adopter copies from — layout, operations, repair, template — did
  not, and two flat notations survived inside the canonical index. Same
  substitution as every earlier finding, one plane up: not a predicate reading a
  proxy, but a **seed** teaching a superseded shape, invisible until an adopter
  owns it. Reconciling it is a PREREQUISITE of `cairn-init`, not a tidy-up
  beside it. What binds a resuming session: **the flat record and pre-notation
  refs stay conforming**, and every changed page says so — this unit changed
  what a new path is CREATED in, never what an existing repository must become;
  and the new seed test checks **documentation currency, not repository state**.

- **The rebase is the cause, and it goes** (S08r, [`ADR-022`](../../docs/adr/ADR-022-path-branches-are-not-rewritten.md)
  accepted). The retention namespace, generations, the derived current
  generation, the three-state verdict and the non-default fetch are ALL
  downstream of the mandatory pre-merge rebase — compensation, not protocol.
  ADR-021 rejected the no-rewriting default because the rebase gate serializes
  self-merge without an integrator; **that argument does not distinguish rebase
  from merge**, because merging the trunk INTO the branch also makes the branch
  contain the trunk tip, and the serialization comes from the push being rejected
  when the trunk moved. What binds a resuming session: **path branches are not
  rewritten** — no rebase, amend, fold or force-push once published; **a current
  base is reached by merging the trunk in**; **retention is disabled by
  configuration, never deleted** — ADR-021 stays accepted and correct for a
  rewriting host; **no existing ref is touched**; and `reset --soft` folding is
  gone, which is the real price. S08r is the decision only — **S08s lands it**.

- **Rewriting has stopped, and the policy is a predicate** (S08s). The binding
  declares `checkpointRetentionRef: null` and `pathHistoryPolicy: forbidden`;
  `path-history` blocks when the branch's upstream is not an ancestor of `HEAD`.
  What binds a resuming session: **do not rebase, amend, `reset --soft` or
  force-push this branch** — merge `master` in instead; **no retention ref is
  written from unit 39 onward**, and the 38 existing ones stay as history,
  unread; **retention is disabled, not deleted**, so its predicates, generations
  and tests remain for a `retained` host. Two things the flip exposed and a
  resuming session should not re-learn: the retention tests inherited the host's
  live prefix, so the design was one config field from being untested (they now
  supply their own), and the `rebase` rule's REMEDY was instructing the very
  operation `path-history` blocks — its id is kept because audits name it, and
  the remedy now follows the declared policy.

- **The required-reading route outlived the decision** (S08t). S08s updated the
  pages it was looking at and did not sweep, so the gate printed `path history
  forbidden` while `paths.md` — required reading item 1 — still said "publish an
  append-only retention ref" and "rebase on the current trunk". **Second
  occurrence of the S08q shape**, so it ends in a predicate: `cairn-spec` now
  requires every rewriting operation named in `paths.md`,
  `execution-protocol.md`, `binding.md` or `AGENTS.md` to carry its governing
  policy within 400 characters, and both portable route documents to name both
  policies. The guard failed on first run against a sentence the sweep had
  missed. What also binds a resuming session: **`master` carries NO branch
  protection** — the `plan.md` claim that the trunk requires a pull request was
  false and is corrected; integration is a direct push of the locally built and
  locally tested merge commit, so checked identity equals landed identity by
  construction, and no PR adapter is needed.

- **`cairn-init` exists, and it proved the corpus was not portable** (S08u).
  Its first end-to-end run installed cleanly and then failed its own first gate
  with **seventeen broken links**, none visible from inside this repository. The
  specification linked the host decision records that settled it; those records
  cite `atomik-project/`, `docs/bedrock/` and session notes; one concept article
  linked bedrock directly; and the portable `paths.md` linked this repository's
  own history. What binds a resuming session: **a decision record is a HOST
  artefact** — portable text NAMES a decision (`ADR-021`) and never links into a
  decision plane; **`outwardLinks()` refuses to install a corpus with any link
  that resolves nowhere in it**, so the command is a portability test that runs;
  and the only claim that matters is the test that installs, commits and runs
  the installed checker, asserting `OK — protocol satisfied`. **Updating an
  installation is NOT implemented** — `cairn.lock.json` records the release and
  a per-file digest so a migrator could tell pristine from edited, and nothing
  reads it yet.

- **Rejection is now demonstrable** (S08v). Every earlier suite exercised valid
  inputs and asserted `OK`, which a rule wired to nothing also satisfies.
  `tools/cairn-fixture.test.mjs` installs a REAL repository with `cairn-init`,
  proves it green, introduces exactly ONE violation and requires that rule to
  block. What binds a resuming session: **the green baseline is half the
  assertion**; **mutations stay UNCOMMITTED**, because the default run compares
  the working tree with `HEAD` and a committed mutation leaves a diff-scoped
  rule silent on a repository that plainly violates it; **`route` and friends
  are guarded by `onPath`** and cannot fire on the trunk at all; and **coverage
  is DECLARED** — eight of thirty covered, twenty-two named in `UNCOVERED`, and
  a test requires every blocking rule to be in one list or the other. Parity is
  asserted on one tree: local default and `--base main` agree green and broken,
  and `--working-tree` raises `base-parity`.

The gate's advisory COUNT is a signal even while the verdict stays green: S08l
read 14 before its commit and 31 after, for one tree, and the only reason to look
was that the number moved.

Flat refs 01–28 and `g01/01`–`g01/38` on the remote; flat 01–13 hold PRE-rebase
commits and no ref has ever been moved, nor will be — the namespace is closed at
`g01/38` and is history rather than enforcement. `g01/32` and `g01/33` are recovery pins
for the two pushed S08m repair commits that carried no new work-unit block.
`g01/34` retains S08n, `g01/35` retains S08o and `g01/36` retains S08p. Checker and specification suite counts are recorded in
the latest step.

## Next action

**The generated conformance matrix, then the extraction question.** S08 Part 2
is down to one item: the matrix is still maintained BY HAND, and generating it
from the checker and the normative text is what stops it drifting from either.
Adversarial fixtures and invocation parity landed at S08v; twenty-two blocking
rules remain without a fixture and are named in `UNCOVERED`. Beyond it, forward-plan item 12 is now the live architectural question:
this command COPIES a portable corpus into an adopter, and the public extraction
must MOVE its authority rather than leave two hand-maintained copies. Superseded
next action: The seed is
reconciled (S08q), so the initializer has one correct shape to scaffold. Make
one transactional command install the PORTABLE / HOST / BINDING route, schema-1
config, reference tools, tier-1 workflow, concept-wiki index and one-concept
template — born-sliced records and generation-aware retention from the first
commit. It also needs an explicit protocol-release identity/lock so a later
public Cairn release can migrate an existing adopter instead of silently
overwriting it, and it must honour forward-plan item 12: **extraction MOVES
authority**; the portable protocol is never maintained by hand in two places. Stage 3's last
operation — retire `ledger-size` — waits until `CP-MVP-008`, `CP-MVP-011` and
`CP-MVP-012` migrate; the ADR makes its stages independent, so that wait does
not block stage 5.

S08 Part 2 also remains: an adversarial fixture for every blocking rule, one gate
run in both invocation contexts asserting one verdict, and a generated
conformance matrix. `cairn-init` must scaffold the folder shape and
generation-aware retention from the start — either one handed to an adopter in
the old shape is a migration handed to an adopter.

## Blockers

None. Both owner questions are settled: `CP-MVP-008` by the named migration
exception (S07s), and the CP-UI-TYPOGRAPHY dates by record immutability — which
S08i acted on without touching those records, by binding the rule to the change
that ADDS a record.

## Tried and rejected

- **A repository predicate for the born-sliced shape** (S08q). The obvious
  companion to reconciling the seed, and wrong: the normative text says the flat
  record STAYS conforming, so there is nothing to block on and a rule would
  invent a requirement the specification declines to make. The guard added
  instead holds the seed PAGES to the current shapes — documentation currency,
  not repository state — and says so in its own comment.
- **Writing `cairn-init` first and fixing the seed inside it** (S08q). It would
  have compiled a superseded record shape and an ungenerated ref namespace into
  the one artefact whose output an adopter can never retroactively correct.
- **`remote_trunk == T` at integration.** Every landing would invalidate every
  other open acceptance; the drift predicate replaces it.
- **A YAML dependency for the extended parser.** The control plane must install
  with no network, which `cairn-init` needs.
- **Grandfathering by date or forward scope**, and **retention checked per
  declared unit.** Both agree too easily; the exception set is now named, finite
  and self-deleting, and the branch is walked directly.
- **Trusting a local run that resembles CI.** How the S08 brief came to attribute
  findings to CI that CI never reported.
- **Renaming `atomik-project/` now.** 736 occurrences, 120 files, two paths
  branched against it; owner ruled documents-only, folder at S08.
- **A self-sufficient brief, and an `objective:` field in it.** Both make it a
  second copy of the path record, drifting from the day it is written.
- **Keying `derived-view` on the declared `status`** (S08i). Correct, and it
  replaces an exemption that has nothing left to protect: the view is already the
  projection of those statuses. Deleted instead.
- **Filename date equals frontmatter `timestamp:` as the whole of `record-date`**
  (S08i). Measured first: all three misdated CP-UI-TYPOGRAPHY records agree with
  themselves, and 67 dated records corpus-wide disagree zero times. It would have
  shipped green and closed the finding without touching it.
- **Reading a gate verdict through a pipe** (S08m). `npm run cairn-check 2>&1 |
  tail -2` gives the shell `tail`'s exit code, so an `&&` chain runs on after a
  `FAILED`. `AGENTS.md` already forbids it; this is the session that shows why.
- **The S08m freeze-or-trunk dilemma** (S08n). The measured change was neither a
  pre-trunk rewrite nor a post-push mutation: it was a conforming suffix append.
  Choosing either proposed baseline would preserve the proxy predicate. The
  adding blob belongs to the record and is the baseline both contexts can read.
- **Keeping an installed-host exception inside the portable reference** (S08o).
  It had been the one sanctioned Atomik mapping, which meant the portable corpus
  still named its origin host. The human mapping now lives only in the binding;
  the configuration example uses role names until its loader exists.
- **Deleting or compressing the former combined entry pages** (S08o). The maxim
  says explanation moves one link away unabridged. Bedrock 22's former body and
  the 533-line path page remain linked history; neither stays required reading.
- **Retiring `ledger-size` with the folder migration** (S08l). ADR-020 stage 3
  schedules it, and three flat records remain; it is the only signal an unsliced
  record gets, so it now applies to flat records only and goes when they do.
- **Blocking on divergence from the adding commit's date** (S08i). A note taken
  on one day and committed two days later is dated correctly; blocking it teaches
  the author to write a false date to pass a gate.
- **Repointing a retention ref to its rebased copy** (S08j). The obvious fix, and
  the exact violation S07k committed by hand: it orphans the commit the ledger row
  was verified against while every declared unit still resolves.
- **Landing ADR-021's range floor without its generations** (S08j). Measured:
  31 of 45 commits report unretained and no conforming way to retain one exists
  until generations do. A red gate with no green move is how a gate gets switched
  off.

## Reading order

1. `atomik-project/coding-paths/paths.md` — portable path lifecycle.
2. `atomik-project/coding-paths/binding.md` — Atomik's exact commands and
   examples; never infer them from the portable page.
3. `docs/cairn/specification/reference/execution-protocol.md` — portable
   per-session execution order.
4. `docs/cairn/cairn-s08-opening-brief-2026-08-31.md@7f52feaa` — the
   five findings that reorder S08, the owner rulings, the teaching axis, and a
   dated correction where it got CI wrong. Its Finding 4 proposes the rule S08i
   then measured and replaced, and its Finding 3 carries a retention measurement
   labelled *"immediately after its rebase"* that no longer describes the branch
   and two namespace candidates `ADR-021` rules out; read the S08i and S08j
   records beside it.
5. `docs/cairn/cairn-audit-2026-08-24.md@319d54d2` — the audit that opened this
   path and named its failure mode.

`proxy-predicate`, `unsound-gate`, `adversarial-fixture`, `gate-parity`,
`record-integrity` (read its *Relocation is not mutation* section) and
`checkpoint-retention` under `specification/concepts/` are this path's vocabulary.
`specification/index.md` is normative; completed steps live in
`coding-paths/CP-OPS-002/steps/`.

## Verification

`npm run cairn-check` — branch against trunk by default since S08a — reports OK.
S08v records **13 advisories, and 13 is the steady state**: concept growth,
nine grandfathered `CP-MVP-008` findings carrying their reason, and three
accounted-for `single-truth` notes on shared/generated files. The
`checkpoint-retention` notice that used to make it 14 before each unit's ref was
published is gone for good — retention is off, and no ref is written from unit 39
onward. A run reporting `base-parity` is NARROWED and is not recordable. A run reporting `base-parity` is
NARROWED, and one reporting an inconclusive `checkpoint-retention` has not
fetched `refs/cairn/*`: neither is recordable.

`npm run cairn-check:test` passes 265 subtests across eight tool suites. A repository created by `npm run cairn-init -- --target <dir>` reports `OK — protocol satisfied` with zero advisories. `npm run cairn-spec:build`
reproduces the checked-in HTML byte-for-byte; `npm run cairn-active` reports the
running-path view current. `npm run typecheck`, `npm test` (1,109 passing, 1
skipped) and `npm run build` all pass.
