---
type: Atomik Specification
title: The Cairn protocol — specification
description: The normative description of Cairn - planes, the coding-path lifecycle, the concurrency and ordering rules, the full rule catalogue generated from the validator source, the three enforcement tiers, this repository's declared properties, the known limits, and a step-by-step operator guide.
tags: [cairn, specification, protocol, paths, ci, enforcement, lifecycle]
timestamp: 2026-08-25T00:00:00Z
---

# The Cairn protocol — specification

> **Current as of 2026-08-25.** This page renders
> [`ADR-009`](../adr/ADR-009-coding-paths-work-ledger-dual-plane.md),
> [`ADR-012`](../adr/ADR-012-parallel-paths-self-merge.md),
> [`ADR-016`](../adr/ADR-016-cairn-enforcement-integrity.md) and
> [`ADR-017`](../adr/ADR-017-coding-path-lifecycle.md), together with the
> operating detail in
> [`atomik-project/coding-paths/paths.md`](../../atomik-project/coding-paths/paths.md).
> Where an ADR and this page disagree, the ADR wins and the disagreement is a
> defect to report.

**If the vocabulary here is unfamiliar** — commit, branch, merge, CI, gate,
regression test — read [`foundations.md`](./foundations.md) first. It teaches the
general practice from zero, so this page can state Cairn's rules without also
teaching version control. Each section below links back to the part of the primer
that motivates it.

**If you want a term looked up**, that is [`lexicon.md`](./lexicon.md).

---

## 1. What Cairn is

Cairn is a working protocol for a repository where **several people or agents
build at the same time, no one is a gatekeeper, and the reasons for decisions must
outlive the people who made them.**

It has three parts, and only the third is unusual:

```text
a CONVENTION   how work is declared, executed, recorded and merged
a VALIDATOR    tools/cairn-check.mjs — the mechanical subset, as a script
a SPLIT        which rules may fail a build, and which may only report
```

The validator is dependency-free and contains no language model. A sceptic must
be able to read it in one sitting and run it locally with the same command CI
runs. That is a design constraint, not an implementation accident.

Cairn assumes Git and nothing else. It requires no host, no account and no
network to deliver most of its value — see [§9, enforcement tiers](#9-enforcement-tiers).

---

## 2. Planes

Two different decompositions of the same repository are in use, and conflating
them is a recurring source of confusion. Both are normative.

**The three conceptual planes** (bedrock 35, ADR-009):

| Plane | Lives in | Lifetime |
| :-- | :-- | :-- |
| Knowledge | `docs/` | durable — what should be true |
| Execution state | `atomik-project/` | durable — what is being done, and what was done |
| Ephemeral context | the conversation | **evaporates** |

**The two repository planes** (ADR-009 §6): the code plane (`apps/`, `packages/`,
`shared/`, `docs/`) and the knowledge + execution plane (`atomik-project/`).

`apps/` is *not* a third conceptual plane; it is one half of the repository split.
The third conceptual plane is the one that disappears when a session ends, and
**the entire protocol exists to move authority out of it.** Progress persists in
files, never in a conversation.

---

## 3. The unit of work: the coding path

No implementation happens outside an accepted **coding path**. A path is one file
in `atomik-project/coding-paths/CP-<ID>.md` whose frontmatter carries the stable
identity tuple:

```yaml
atomik:
  id: CP-MVP-010
  status: running            # draft | running | blocked | done | archived
  base_commit: 70f7e27       # the trunk tip immediately BEFORE registration
  branch: path/cp-mvp-010
  writes:                    # ADVISORY — a signal, never a lock
    - apps/desktop/electron-main/graph-index.ts
    - docs/modules/atomik-desktop-graph.md
```

The body of the file carries the step list, the **work ledger** — an append-only
record of what each executed step actually changed — the next action, and any
blockers. It is mandatory reading for whoever resumes that path.

Paths are named two ways. **Numbered** paths (`CP-MVP-010`) come from the roadmap
and carry a register row; **labelled** paths (`CP-PROVIDERS`, `CP-OPS-002`) are
named for their subject and claim no milestone. Both are ordinary accepted paths
and both take both ceremonies.

`writes:` is a **signal, not a lock**. It is an overlap warning when the path
opens and a diff-versus-declaration check before it merges. A root cause is
discovered, not declared: a path that must widen records the widening in its
ledger and keeps going. Documentation surfaces must be declared too — those are
the ones that actually collide.

> **Why a ledger** → [foundations §6.1](./foundations.md#61-work-happens-inside-a-declared-unit).
> A methods section written as the work happens rather than reconstructed
> afterwards.

### 3.1 The ledger has a size boundary

A path file only ever grows. When it costs more to read than the entire mandatory
entry chain before it, it has stopped being a ledger and become an archive.
Completed steps roll into `atomik-project/coding-paths/history/<id>-S0N.md`, one
file per major step.

**The move is verbatim** — cut and paste, never summarise. Summarising at rollup
time would quietly rewrite the record, which is the one thing a ledger may not do.
What stays behind is one index line per step, plus the declaration, the work
ledger, the next action and the blockers.

The `ledger-size` rule is advisory and scoped to files in the diff. A corpus-wide
sweep would report the same historical files on every run for months, and a check
that cries wolf is a check people switch off.

---

## 4. Lifecycle and status vocabulary

Settled by [ADR-017](../adr/ADR-017-coding-path-lifecycle.md).

```text
draft ──────► running ──────► done ──────► archived     the ordinary life
                │  ▲                          ▲
                │  └── blocked ──┘            │
                └─────────────────────────────┘
                     abandonment
```

| Status | Means | Requires |
| :-- | :-- | :-- |
| `draft` | proposed, not accepted | `id`, `status` |
| `running` | accepted, registered on the trunk, executing in its own worktree | `id`, `status`, `branch`, `base_commit`, an opening-check note |
| `blocked` | execution halted; no branch obligations while blocked | `id`, `status` |
| `done` | accepted, rebased, audited and **merged**. A completion, not an end | `id`, `status`, a closing-ceremony note |
| `archived` | off the running portfolio, retained as history. **The single terminal state** | `id`, `status` |

- `done → archived` is **demotion, never deletion**.
- `running → archived` is **abandonment**. An abandoned path never passes through
  `done`, because `done` asserts a merge that did not happen. No fifth status word
  was added: `archived` already means *scope superseded, retired, or preserved as
  historical record*.
- `active` is **not** in the vocabulary. It was accepted by the schema rule and
  rejected by the branch rule, so a path declaring it failed with a message about
  a different problem.

### 4.1 What a gate can and cannot check here

**Normative, and stated so no later document claims more.** A validator run sees
**one commit**. It reads the status a file declares now; it has never seen a
transition, and a rule that guessed at one would be wrong the first time a path
file was created already complete.

Therefore the state machine above is **doctrine for the people and agents
executing it**, and what CI enforces is the set of **per-state invariants** in the
table — each a fact about one file. Cairn does not enforce the lifecycle, and no
document may say it does.

---

## 5. Concurrency

```text
N coding paths, running at the same time
one path      = one worktree = one branch = one writer
every opening = one registration-only trunk commit BEFORE the branch
every commit  = one immediate remote checkpoint on its owning branch
every step    = one safe boundary between chat sessions
each path merges ITSELF into the trunk
every closure = remote merge verified + clean secondary worktree removed
no integrator, no parent, no gatekeeper
```

A shared working tree has exactly **one writer**. Others may read, diagnose,
review and report there; simultaneous edits in one filesystem are not made safe by
documentation. Every code path therefore takes its own **worktree** — a second
checkout of the same repository on a different branch:

```bash
git worktree add ../repo-cp-mvp-010 -b path/cp-mvp-010 master
```

Branch from the local trunk, never from the remote trunk when the local branch is
ahead.

There is no integrator. The role's real job was writing the files everyone
touched, so those files stopped being shared at all — see [§8](#8-nothing-is-shared).

> **Why parallel work needs structure at all** →
> [foundations §5](./foundations.md#part-5--more-than-one-person).

---

## 6. Ordering rules

Three rules fix *when* things happen. Each exists because its absence produced an
observed failure in this repository, not because it seemed tidy.

### 6.1 Registration precedes the branch

After the opening check, land a **metadata-only** commit on the trunk carrying the
accepted path declaration, the regenerated running-paths view, and the
opening-check session note. **No implementation of any kind** enters that commit.
Only then create the branch and worktree.

The invariant is *no implementation in a registration commit* — not a file count.
A count is arbitrary and would fail a legitimate registration that also fixed a
typo in the agenda it cites.

**Why:** a derived view can only read files in one checkout. Before this rule, a
new path file was first committed on its own branch, so the trunk and every
sibling branch could not see it. On 2026-08-20 the generated trunk view passed its
own freshness check while reporting that no path was running — at a moment when
four clean worktrees each declared `status: running`. The view was internally
current and globally false. No instruction can make one Git tree read files that
exist only in unrelated trees.

### 6.2 Every commit is a remote checkpoint

Commit and push are **one completion unit**:

```text
change code + tests + docs + ledger + handoff brief
  -> run the relevant gates bare
  -> commit the coherent work unit
  -> push immediately to that commit's owning branch
  -> only now report the step complete
```

If the push fails, the correct report is **implemented locally, not complete**.

> **Why committing is not backing up** →
> [foundations §2.6](./foundations.md#26-remote-and-what-done-means).

### 6.3 The rebase gate

A path branch must contain the current trunk tip before it merges. This is
checked, not remembered.

It serialises the **merge** — thirty seconds — without serialising the **work**.
Two paths run for two days in parallel and still land safely, because whoever
merges second rebases and re-runs the checks. There is no queue of people, only a
queue of merges.

If a closing rebase rewrites already-published commits, publish with
`git push --force-with-lease`, never a blind `--force`, and record the pre- and
post-rebase heads in the ledger or the coherence audit.

---

## 7. Ceremonies

Two moments require a human and produce a written artefact. Both are **blocking**.

| Ceremony | When | Proves |
| :-- | :-- | :-- |
| **Opening check** | before a path is activated | the owner accepted this work, feature by feature |
| **Closing ceremony** | before the path merges | the owner accepts the result |

Each is a session note in `atomik-project/sessions/` whose **root-level**
frontmatter declares it:

```md
---
title: CP-EXAMPLE-001 — closing ceremony
path: CP-EXAMPLE-001
ceremony: closing
---
```

Root level, siblings of `title:`, matched on the exact path id. Neither key may
carry an inline comment: the frontmatter reader takes scalar values verbatim to
end of line, so `ceremony: closing   # done` declares the value
`closing   # done` and satisfies nothing. The nested form
`atomik: { path, ceremony }` is **rejected**, not accepted for compatibility.

The schema is pinned in exactly one place —
[`docs/bedrock/24_24-doc-templates.md`](../bedrock/24_24-doc-templates.md#session-note-and-ceremony-template)
— and every other document points at it. It is parsed by the test suite, so a
published template that would not work fails the build.

> **Why declared metadata rather than a filename** →
> [foundations §6.2](./foundations.md#62-ceremonies-the-human-decisions-leave-a-record).
> Filename matching made the closing gate prove that the path had been *opened*.

---

## 8. Nothing is shared

Files that more than one path would touch are **generated**, not hand-written:

```text
ACTIVE.md              GENERATED from the path declarations on the trunk
register status        GENERATED from the same source
the root module note   an index over the per-area notes
the journal            ONE FILE PER ENTRY under atomik-project/log/
```

`atomik-project/log.md` is **frozen** as a historical archive; new entries land as
`atomik-project/log/YYYY-MM-DD-<path-id>.md`. This was a **concurrency** fix, not
a size one — several paths appending to one journal collided.

Every meaningful folder in `docs/` and `atomik-project/` carries both halves of
the OKF pair: an `index.md` (a map, read before opening many files) and a `log.md`
(recent meaningful changes, read when recency matters).

What remains genuinely hand-written — bedrock pages, ADRs, per-area module notes,
each path's own file — is per-file by construction, so two paths editing different
ones never meet.

> **Why a generated file is safer than a shared one** →
> [foundations §5](./foundations.md#part-5--more-than-one-person). You do not edit
> a figure in Illustrator.

---

## 9. Enforcement tiers

Only the first tier is required. **Tier 2 is a declared property of a repository,
never a requirement of the protocol.**

| Tier | Name | What it is | What it can prevent |
| :-- | :-- | :-- | :-- |
| 0 | `local` | `npm run cairn-check` | nothing by force — but it is the same command CI runs, needs no host, no account and no network, and carries nearly all the value |
| 1 | `ci` | `.github/workflows/cairn.yml` | nothing by force: **CI observes.** A red run is visible to everyone; a local merge still bypasses it |
| 2 | `protected` | a trunk ruleset on the host | **CI prevents.** A change that fails the required checks cannot merge, including from the web UI |

The claim must be **generated, not written**: `cairn.config.json` declares the
tier and `cairn-check` prints it in its header line, so no document can assert
prevention that is not installed. Asserting it anyway is the same defect class as
a published rule the implementation does not honour.

Tier 2 scales with the number of writers on a shared trunk, not with the protocol.
A setup step performed once, invisibly, in someone else's web UI will be skipped,
and the specification would then go on claiming a guard that is not there.

> **Observes versus prevents** →
> [foundations §4.3](./foundations.md#43-the-gate-and-what-green-means).

---

## 10. The rule catalogue

Two commands, run locally exactly as CI runs them:

```bash
npm run cairn-check                            # the working tree
npm run cairn-check -- --base origin/master    # a branch, as CI sees it
npm run cairn-check:test                       # the validator's own tests
```

**Blocking** findings exit non-zero. **Advisory** findings print and never fail
the build.

### 10.1 The admission test for a blocking rule

> **objectively checkable** AND breaking it leaves something
> **WRONG IN THE REPOSITORY** — not merely unconventional.

Undocumented code is wrong. A journal entry written by the path that did the work
is unconventional. Only the first may fail a build. The journal rule was briefly
blocking and was retracted when it failed this test.

**A false blocking verdict costs more than a missed one.** The first run of this
validator reported 34 broken links that were not broken — bedrock pages
illustrating a vault layout inside code fences. Judgement calls therefore live in
the advisory tier permanently, by design and not by concession.

### 10.2 The live catalogue

**Generated** from `tools/cairn-check.mjs` by
[`tools/cairn-rules.mjs`](../../tools/cairn-rules.mjs), and guarded by
[`tools/cairn-rules.test.mjs`](../../tools/cairn-rules.test.mjs), so this table
cannot describe a rule that does not exist. Regenerate it with:

```bash
node tools/cairn-rules.mjs --write
```

**The shipped table is checked by the test suite**, which CI runs — a
specification that has drifted from the validator fails the build. That is the
same defence that makes the ceremony template in bedrock 24 executable:
documentation a test can read cannot quietly go stale.

<!-- cairn:rules:begin -->
| Level | Rule Name | Scope | Trigger Condition | Enforcing Logic |
| :--- | :--- | :--- | :--- | :--- |
| **Blocking** | `branch-identity` | diff | Detached checkout where branch cannot be identified from host or git ref | `branchSource === 'detached' (blocking on guarded roots, advisory on others)` |
| **Blocking** | `branch-path` | diff | Path branch not declared by a running path file, or missing base_commit | `isPathBranch(branch) && (!match \|\| !PATH_BRANCH_STATUSES.includes(status) \|\| !isCommitPin(base))` |
| **Blocking** | `ceremony` | diff | Path marked done without closing ceremony session note frontmatter | `!ceremonyFor(pathId) via session frontmatter { path, ceremony: 'closing' }` |
| **Blocking** | `derived-view` | corpus | ACTIVE.md running-paths block does not match trunk path files | `tools/cairn-active.mjs --check` |
| **Blocking** | `links` | corpus | Relative Markdown link points to non-existent target (code fences stripped) | `stripCode(text) => !existsSync(target)` |
| **Blocking** | `opening-ceremony` | diff | Path declared running without an opening-check session note | `!openingFor(pathId) via session frontmatter { path, ceremony: 'opening' }` |
| **Blocking** | `rebase` | diff | Path branch does not contain latest trunk tip (stale branch) | `trunkContained(trunkRef) === false` |
| **Blocking** | `registration` | diff | Path declaration tuple (id, running, branch, base) missing from trunk | `pathRegistrationState() === 'missing' (blocking) or 'grandfathered' (advisory)` |
| **Blocking** | `same-work-unit` | diff | Source changed without accompanying module note and coding path update | `touched('apps/') => touched('docs/modules/') && touched(PATH_DIR)` |
| **Blocking** | `schema` | corpus | Path or ADR frontmatter fails parsing, or an id/status/date is outside vocabulary | `pathFrontmatterErrors(front) + adrFrontmatterErrors(front, file, bodyStatus)` |
| *Advisory* | `area-note` | diff | Subsystem source changed without touching matching area module note | `areaOf(file) => changed.includes(note)` |
| *Advisory* | `branch-identity` | diff | Detached checkout where branch cannot be identified from host or git ref | `branchSource === 'detached' (blocking on guarded roots, advisory on others)` |
| *Advisory* | `coherence-audit` | corpus | Path rebased HEAD lacks filled coherence audit record in atomik-project/audits/ | `tools/cairn-audit.mjs --check` |
| *Advisory* | `decision-drift` | diff | docs/bedrock changed without an ADR in the same changeset | `touched('docs/bedrock/') => touched('docs/adr/')` |
| *Advisory* | `ledger-size` | diff | A path file in the diff exceeds the ledger token budget | `changed.includes(path.file) && path.tokens > LEDGER_TOKEN_BUDGET` |
| *Advisory* | `opening-ceremony` | diff | Path declared running without an opening-check session note | `!openingFor(pathId) via session frontmatter { path, ceremony: 'opening' }` |
| *Advisory* | `path-staleness` | corpus | A path declaring running whose branch has had no commit for longer than the declared window | `staleRunningPaths(corpus, branchAges(corpus)) — advisory always; an unresolvable branch reports nothing` |
| *Advisory* | `registration` | diff | Path declaration tuple (id, running, branch, base) missing from trunk | `pathRegistrationState() === 'missing' (blocking) or 'grandfathered' (advisory)` |
| *Advisory* | `remote-checkpoint` | diff | Local path HEAD not present on upstream tracking branch | `pathRemoteCheckpoint(branch).state === 'missing' \| 'unpushed'` |
| *Advisory* | `scope-drift` | diff | Changed files outside path frontmatter declared writes: patterns | `!matchesAny(file, declaredWrites)` |
| *Advisory* | `single-truth` | diff | Manual edits to shared/derived statements of record | `SINGLE_TRUTH.includes(file)` |
<!-- cairn:rules:end -->

### 10.3 Gate discipline

Gates run **bare**. The exit code is the verdict — never pipe gate output through
`grep` or `head`:

```bash
npm run typecheck && npm test && npm run build
```

CI runs the protocol check as a job **separate** from the gates, because *"does
the software work"* and *"was the protocol followed"* are two different questions
and a team needs to see which one failed.

> **Why bare** → [foundations §4.5](./foundations.md#45-why-the-checks-are-run-bare).
> A pipe discarded a failing status and a broken build shipped on 2026-07-16.

---

## 11. The coherence audit

Removing the integrator removed the person who noticed two paths drifting apart
architecturally, so the noticing is delegated to an agent — without letting a
non-deterministic judgement block a merge:

```text
the AGENT produces the judgment     reads the rebased diff against bedrock,
                                    the ADRs, and the path's declared coverage
CI checks only that it EXISTS       a deterministic gate on a
                                    non-deterministic activity
its verdict never blocks            findings are advisory, read by a human
```

`npm run cairn-audit` scaffolds the record; the agent fills it in. One file per
audit under `atomik-project/audits/`, named `<path-id>-<commit>.md`, so two paths
auditing at once never conflict.

A record satisfies the check when it names **HEAD or any commit this path itself
contributed** (`git rev-list HEAD --not <trunk>`) — a record naming an arbitrary
trunk ancestor proves nothing about this branch, and one belonging to a different
path is refused by name. **Filled** means the record names an outcome from the
stated vocabulary and answers at least one of its own findings questions. It is
never a judgement about the answers; that is the human's read, and the reason the
verdict does not block.

---

## 12. Declared properties of THIS repository

Stated as properties rather than omitted, because a specification that hides its
own configuration is the defect it is trying to prevent.

- **Enforcement tier: 1 (`ci`).** CI observes. No trunk ruleset is installed, and
  the tier-2 payload in [§14](#14-appendix--the-optional-tier-2-ruleset) is
  deliberately not applied.
- **Every merge in this repository's history is a local merge commit.** There have
  been zero pull requests. CI triggers on `push` to `master` and `path/**` for
  exactly this reason; on `pull_request` alone it would never have fired.
- **A finite migration set exists and is named in code.** `CP-MVP-011` and
  `CP-MVP-012` predate trunk registration and the declared ceremony schema. They
  receive advisory findings telling them how to clear the exception, and the set
  **drains when they merge**. No new path may copy it, and the constants are
  deleted when they empty.
- **`active` has been retired** from the status vocabulary. No path file declared
  it.
- **Bedrock states the doctrine; `paths.md` carries the operating detail** and may
  change without amending a bedrock page. If they disagree, that is a defect to
  report — a rule this repository has invoked against itself twice.

---

## 13. Known limits

Two holes remain open, recorded rather than papered over.

1. **`base_commit` accuracy is unchecked.** Its presence is verified; its truth is
   not. Partly mitigated by the rebase gate, which compares the branch against the
   trunk directly rather than trusting the recorded base.
2. **Checkpoint accuracy is unchecked.** The validator verifies that a path file
   *changed* when source changed; it cannot tell whether the prose inside it is
   still true. Found the honest way: one path's checkpoint still described step
   zero in vocabulary that had been removed five steps earlier. *"Is this prose
   still accurate?"* is not a checkable question.

Closed since the model was ratified: running-path visibility (registration on the
trunk, 2026-08-20) and the abandoned-path transition together with staleness
detection ([ADR-017](../adr/ADR-017-coding-path-lifecycle.md), 2026-08-25).

---

## 14. Operator guide

For someone who has not used Cairn before. Every command runs locally; nothing
here requires an account.

### Step 1 — Open the path

1. Run the **opening check** with the owner, feature by feature. Record it as a
   session note in `atomik-project/sessions/` with root-level `path:` and
   `ceremony: opening`. Activation needs explicit acceptance — this is blocking.
2. From a clean, current trunk, write the path file
   `atomik-project/coding-paths/CP-<ID>.md` from the template in bedrock 24.
   `base_commit` is the trunk tip **immediately before** this registration.
3. Regenerate the view and check:

```bash
npm run cairn-active
npm run cairn-check
```

4. Commit **metadata only** — declaration, regenerated view, opening-check note —
   and push it to the trunk. No implementation.

### Step 2 — Create the worktree

```bash
git worktree add ../repo-cp-<id> -b path/cp-<id> master
cd ../repo-cp-<id>
```

Link or install dependencies as the project requires, and give the running
application its own profile so two instances never share one.

### Step 3 — Execute one step at a time

Each step changes code, tests, docs, the ledger and the handoff brief **in the
same work unit**. Then:

```bash
npm run cairn-check
npm run typecheck && npm test && npm run build   # if the step touched product code
git commit
git push origin path/cp-<id>                     # immediately — the step is not done until this lands
```

Refresh `atomik-project/briefs/<path-id>-handoff.md` from the ledger in that same
commit. Every completed, pushed step is a safe boundary between working sessions:
a new session in the same worktree reads `AGENTS.md` → `paths.md` → the running
view → the path ledger → the brief, verifies reality against Git, and continues
with no re-briefing.

### Step 4 — Close and merge

```text
1  CLOSING CEREMONY — recorded as a session note (path: + ceremony: closing)
2  REBASE on the trunk — enforced, not remembered
3  CHECKS GREEN on the rebased result, never on a stale branch
4  COHERENCE AUDIT — npm run cairn-audit, then fill it in
5  the path sets its own status: done, and merges itself
6  the pushed merge is verified on the remote trunk
```

### Step 5 — Clean up the worktree

Only after the merge commit is pushed and verified on the remote trunk, run from
**another checkout** — never from the target, never the owner's main working tree:

```bash
git fetch origin master
git merge-base --is-ancestor <merge-commit> origin/master
git worktree list --porcelain
git -C <exact-secondary-worktree> status --porcelain=v1   # must print nothing
git worktree remove <exact-secondary-worktree>            # never --force
git worktree list --porcelain
test ! -e <exact-secondary-worktree>
```

The branch is durable history; the worktree is a disposable working copy.
**Removing a worktree never deletes the branch**, and the retained branch is what
preserves the per-step online history.

If remote verification, cleanliness, removal or the final absence check fails,
report **merge complete; cleanup incomplete** and leave the directory intact for
inspection. This transition is machine-local: it cannot honestly be enforced by
repository CI after the checkout disappears, so it is an absolute operating rule
and a required closure report rather than a Cairn blocking rule.

---

## 15. Appendix — the optional tier-2 ruleset

**Skippable.** Everything above works without it; this repository has not applied
it. Adopt it only when several writers share a trunk and you want CI to *prevent*
rather than *observe*.

One command, no click-path — substitute your own owner and repository:

```bash
gh api -X POST repos/OWNER/REPO/rulesets --input - <<'JSON'
{
  "name": "cairn-trunk",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/master"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "gates (typecheck · tests · build)" },
          { "context": "cairn-check (protocol)" }
        ]
      }
    }
  ]
}
JSON
```

`strict_required_status_checks_policy` is the host's name for the rebase gate: it
requires the branch to be up to date with the trunk before merging, so the rule
holds even for someone merging from the web UI.

If you apply it, change `"enforcement"` in `cairn.config.json` to `"protected"`,
so the header line `cairn-check` prints keeps telling the truth.

---

## See also

- [`foundations.md`](./foundations.md) — the concepts, from zero.
- [`lexicon.md`](./lexicon.md) — every term, glossed and traced to its enforcing file.
- [`atomik-project/coding-paths/paths.md`](../../atomik-project/coding-paths/paths.md) — the operating detail, which may change without amending a bedrock page.
- [`index.html`](./index.html) — the rendered overview.
