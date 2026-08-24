---
type: Atomik Audit Record
title: Cairn protocol — evidence-anchored audit and diagnostic (2026-08-24)
description: Second, independent execution of the cairn.md brief. Every finding is reproduced by a named command against this repository at 7aa3b1d; non-findings and refuted claims are recorded alongside confirmed ones.
tags: [cairn, protocol, audit, diagnostic, ci, okf, token-economics, cp-ops-002]
timestamp: 2026-08-24T00:00:00Z
status: complete
atomik:
  method: direct repository execution
  repaired_locally: [F1, F2, F8, F9]
  owner_ruled: [F3, F4]
  trunk: 7aa3b1d
  scope: docs/cairn, tools/, atomik-project/, .github/workflows/, docs/bedrock, docs/adr
---

# Cairn protocol — audit and diagnostic

**Trunk audited:** `7aa3b1d` · **Method:** every claim below is produced by a command
run against this checkout and stated with its reproduction. Claims that could not be
reproduced are marked REFUTED rather than dropped.

## 0. How to read this record

Cairn's own rule for a blocking check — *objectively checkable AND breaking it leaves
something wrong in the repo* — is applied to the audit itself. A finding here is
**Confirmed** only when a command reproduces it. Where the protocol's documentation and
its implementation disagree, the implementation is treated as the fact and the
documentation as the defect.

Severity is judged by one question: **does this let a false statement enter the trunk?**

---

## 1. What Cairn actually is

The protocol has three claims, and all three hold.

**1.1 Planes.** Bedrock 35 and ADR-009 define **three planes** — knowledge (`docs/`),
execution-state (`atomik-project/`), ephemeral context (the conversation). Separately,
ADR-009 §6 defines the **repository** as *dual*-plane: code plane (`apps/`, `packages/`,
`docs/`) and knowledge+execution plane (`atomik-project/`). These are two different
decompositions of the same repo and the distinction matters: `apps/` is not a third
plane, it is one half of the repository split, while the third plane is the one that
*evaporates*. The whole protocol exists to move authority out of that third plane.

**1.2 Concurrency.** ADR-012: one path = one worktree = one branch = one writer, with a
registration-only trunk commit before branching, an automated rebase gate, and no
integrator. Ratified against a real owner rejection, not a design preference.

**1.3 Mechanism.** `tools/cairn-check.mjs` — zero dependencies, 33 self-tests in 87 ms
(`npm run cairn-check:test`), pure functions taking data so the rules are testable
apart from Git. This is the strongest engineering in the repository and it should be
said plainly.

---

## 2. Confirmed findings

### F1 — The rebase gate did not fire in CI. (Critical — REPAIRED 2026-08-24)

`paths.md` states the rebase gate "is what makes a gatekeeper unnecessary" and CI
comments call `--base` "the rebase gate". Both are false as configured.

Every path-scoped rule in `evaluate()` is guarded by `isPathBranch(branch)`, where
`branch = git rev-parse --abbrev-ref HEAD`. `actions/checkout@v4` on a `pull_request`
event checks out the merge ref in **detached HEAD**, so that command returns the literal
string `HEAD`, and `isPathBranch('HEAD')` is `false`.

```
$ git checkout --detach path/cp-mvp-011
$ git rev-parse --abbrev-ref HEAD
HEAD
$ node tools/cairn-check.mjs --base master
cairn-check — branch HEAD, 86 changed file(s)
OK — protocol satisfied           # exit 0
```

96 files under `apps/` in that diff; the branch does **not** contain the trunk tip
(`git merge-base --is-ancestor master path/cp-mvp-011` fails). Six rules go silent at
once: `branch-path`, `registration`, `rebase`, `remote-checkpoint`, `scope-drift`,
`coherence-audit`.

The consequence is precise: **in a protocol whose safety rests on paths merging
themselves, the gate that replaces the integrator only runs when the person being gated
chooses to run it locally.** Enforcement is voluntary at exactly the moment it is
load-bearing.

**Repaired.** `resolveBranch()` asks the host before the checkout —
`--branch` flag, then `GITHUB_HEAD_REF`, then `GITHUB_REF_NAME` (rejecting the
`<n>/merge` preview name), then `git symbolic-ref`, keeping the detached answer only so
the caller can tell that it IS detached. A new `branch-identity` rule then **fails
closed**: blocking when the branch is undeterminable and the diff touches
`apps/`, `packages/` or `shared/`, advisory otherwise, so a docs-only or tag build is not
punished for how it was checked out.

A second half was found while fixing the first: on a `pull_request`, `actions/checkout`
defaults to the **merge preview**, which contains the base tip *by construction*. Naming
the branch correctly would still have let the rebase gate pass on every stale branch.
`.github/workflows/cairn.yml` now checks out `github.event.pull_request.head.sha`, so the
gate judges the commit that will actually land.

Verified in a genuinely detached worktree at `path/cp-mvp-011`:

```
old tool:  OK — protocol satisfied              exit 0
new tool:  [branch-identity] … 69 guarded file(s) changed
           FAILED — 1 blocking finding(s)       exit 1
```

### F2 — The closing-ceremony gate was a tautology. (Critical — REPAIRED 2026-08-24)

`ceremony` is the one blocking rule standing in for the removed integrator: a path
marked `done` must show a session note. `hasCeremony()` implements this as a substring
match over `atomik-project/sessions/` filenames:

```js
readdirSync(SESSION_DIR).some(f => f.toLowerCase().includes(id.toLowerCase()) && f.endsWith('.md'))
```

`paths.md` requires an **opening check**, recorded in a session note, before a path may
branch. Therefore a qualifying filename exists from the path's first hour. Executed
against a path holding only `2026-08-24-cp-fake-opening-check.md`:

```
findings with ONLY an opening check present: []
```

The rule cannot return a finding for any path that followed the protocol. It verifies
that the path was *opened*, and reports that as proof it was *closed*.

**Repaired.** A ceremony is now *declared* by the note that is one:

```yaml
path: CP-MVP-010
ceremony: closing
```

`ceremonyFromSessions()` matches frontmatter, on an exact `path` (substring matching let
CP-MVP-001 be satisfied by a note about CP-MVP-0010). Sixteen closure notes were
backfilled — eleven `*-closing-ceremony.md`, plus the five `*-acceptance.md` records that
served as closure for CP-MVP-003…007 before the closing ceremony existed as a convention.

`CP-MVP-001` and `CP-MVP-002` have no closure record naming them and did not get one:
inventing a ceremony that never happened would be a worse lie than the one this finding
is about. **No grandfather set was added** — the rule stays scoped to paths in the diff,
so history is inert unless someone reopens those files, at which point demanding a record
is the correct behavior rather than a false positive.

### F3 — The visibility hole ADR-012 closed is open on this trunk today. (High — owner-ruled, no action)

`paths.md` records running-path visibility as **closed by CP-OPS-001 S08**. It is not.

```
$ npm run cairn-check          → OK — protocol satisfied
$ sed -n '/cairn:paths:begin/,/end/p' atomik-project/coding-paths/ACTIVE.md
- *(no path running)*
$ git worktree list | wc -l    → 8   (7 secondary checkouts)
$ git cat-file -e master:atomik-project/coding-paths/CP-MVP-011.md → MISSING
```

`CP-MVP-011` (28 commits ahead of trunk) and `CP-MVP-012` (23 commits) are live paths
with worktrees, branches and remotes, and **no declaration on the trunk**. The derived
view is internally current and globally false — verbatim the pathology S08 was written
to eliminate — and `cairn-check` reports `OK` while it is true.

The mechanism is `LEGACY_UNREGISTERED_PATHS`, a named bypass in
`tools/cairn-check.mjs:103`. It was the right call at the time and it is correctly
documented as finite. But it has no expiry, no drain, and no test that the set is
shrinking, so the exception outlived the migration. **A grandfather clause with no
deadline is a permanent exemption wearing a temporary name.**

**Owner ruling (2026-08-24): resolved by CP-OPS-001 in the normal course.** The
grandfather set is finite and named — `CP-OPS-001`, `CP-MVP-011`, `CP-MVP-012` — and it
drains itself when the last two land, at which point the set and its branch in
`evaluate()` come out with them. No separate repair is opened.

The measurement stands as a record of the window, not as a work item: while those two
paths are in flight, the **generated block** of `ACTIVE.md` cannot name them and
`cairn-check` reports `OK` over that fact.

*Correction (coherence audit, 2026-08-24):* an earlier wording said "`ACTIVE.md` cannot
name them", which is false — its hand-written "Grandfathered in flight" section names both
explicitly. The defect is narrower and more interesting than the overstatement: the
*derived* projection cannot see them, so a human wrote them in by hand, and that manual
patch is the only reason the portfolio view is true. A generated view kept honest by
manual annotation is still a real gap, but it is not blindness. Worth carrying into the specification as a stated property of the migration
rather than an unstated gap — and worth deleting the set when it empties, so the
exception does not outlive the migration by inattention.

### F4 — The path ledger has no size boundary. (Medium, efficiency)

**Correction (owner, 2026-08-24).** An earlier draft of this finding said `log.md` was
frozen because it had become a context bottleneck. That is wrong, and it was inherited
from the report this audit was reviewing rather than from `paths.md`, which says plainly
why: **parallel paths needed one file per entry so two of them writing the journal at
once stop colliding.** The freeze was a concurrency decision, and it succeeded —
`atomik-project/log/` is 12 conflict-free files.

So the finding below is *not* "the same problem came back". It is an independent
observation that happens to concern size, and it is downgraded accordingly:

| Surface | Words | ≈ tokens |
| :-- | --: | --: |
| `atomik-project/log.md` (frozen) | 60,418 | ~80,600 |
| `atomik-project/coding-paths/` (live, mandatory reading) | **63,912** | **~85,200** |
| `CP-MVP-008.md` alone | 17,639 | ~23,500 |

**The live corpus that replaced the frozen bottleneck is larger than the bottleneck.**
A single path file now exceeds 23 k tokens, and `AGENTS.md` makes it mandatory reading
for anyone resuming that path. The ledger has no rotation, no cap, and no archive
transition — the three things that fixed the journal.

Measured cost of the mandatory entry chain alone, before any path file, module note or
source is opened:

```
  785 tok  AGENTS.md
3,962 tok  atomik-project/coding-paths/paths.md
  672 tok  atomik-project/coding-paths/ACTIVE.md
2,525 tok  docs/bedrock/22_22-agent-handoff.md
1,384 tok  docs/bedrock/00_00-orientation.md
─────────
9,328 tok  floor
```

Add a live path file (CP-MVP-010: 11.3 k) and its area note (`atomik-desktop-ai`: ~7 k)
and a resuming agent has spent **~28 k tokens before reading a line of code**. That is
survivable today and is not survivable at 40 paths.

*Suggested, not urgent:* completed steps roll into
`atomik-project/coding-paths/history/<id>-S0N.md`, linked rather than inlined, leaving
the path file holding its declaration, current ledger and next action. An advisory
`ledger-size` rule would make the boundary visible before it is painful.

### F5 — OKF is unset where agents are sent first. (Medium)

The brief's own suspicion, quantified. Frontmatter coverage by directory — **denominators
corrected 2026-08-24** after a third-party coherence audit caught three of them wrong:

| Directory | Frontmatter | `index.md` |
| :-- | :-- | :-- |
| `docs/bedrock` | 37/37 | **missing** |
| `docs/adr` | **0/15** | **missing** |
| `docs/modules` | 7/7 | **missing** |
| `docs/learning` | 24/25 | present |
| `atomik-project/coding-paths` | 21/21 | present |
| `atomik-project/sessions` | 51/51 | **missing** |
| `atomik-project/audits` | 9/9 | **missing** |
| `atomik-project/briefs` | 5/7 | present |

Bedrock 26 is explicit: *"An agent should read the nearest relevant `index.md` before
opening many files."* The three directories `AGENTS.md` routes every agent into —
bedrock, adr, modules — are the three with no index. **The progressive-disclosure
contract is unimplemented at its entry points**, which forces the flat full-directory
reads bedrock 26 exists to prevent, and which feeds F4.

*Method note, recorded because it is the same failure this audit exists to name.* The
first pass counted with a shell loop that used `find` without `-maxdepth 1` and broke on
`briefs/feedback on  MVP-001.md`, whose spaces split one filename into three. Bedrock read
38 instead of 37, sessions 52 instead of 51, briefs 9 instead of 7. **The qualitative
finding was right and three of eight numbers were wrong** — from exactly the "wrote a
fragile script instead of verifying its output" move this record warns other agents about.
Recounted with a Node script that stats each entry.

`docs/adr/` at 0/15 is the sharper half: ADRs are canonical decisions,
`decision-drift` points at them, and not one is machine-readable. Nothing validates
frontmatter outside `atomik-project/coding-paths/` — `pathFrontmatterErrors()` is
path-only.

### F6 — Doctrine drift is in `index.html` only, and it is real. (Medium)

`docs/cairn/index.html` still teaches the rejected model, at ten sites:

```
392: <dd class="who">Integrator</dd>
417: A single integration parent holds the current direction… lanes… converge through a single gate
458: The gate — review · CI · the integrator merges
512: Declare the file off-limits to everyone but the integrator
```

The page has a `<title>` and no date, status, or supersession banner — which is how it
drifted silently past two ADR amendments. `docs/cairn/workflow.html` is **clean** (0
matches; regenerated by `tools/gen-d14-workflow.py` on 2026-08-24).

### F7 — Post-merge worktree cleanup did not happen for the paths that predate the rule. (Low)

Six secondary worktrees survive for paths whose status is `done` and whose merges are on
the trunk: `cp-ai-capabilities`, `cp-feedback`, `cp-mvp-010`, `cp-open-dock`,
`cp-render-repairs`, `cp-rich-markdown`. `CP-WORKTREE-CLEANUP` landed the rule on
2026-08-24 and correctly dogfooded it on itself; it left the backlog. Also present: an
orphan `registration/cp-worktree-cleanup` branch, and
`atomik-project/briefs/feedback on  MVP-001.md` — a filename with a double space and no
frontmatter.

Low severity by Cairn's own test: unconventional, not wrong. Recorded because the brief
asks about file-management hygiene and because it illustrates the general shape of every
finding above — **a rule was written, and the state that predates it was never drained.**


### F8 — CI has never run on a path branch. (Critical — REPAIRED 2026-08-24)

This is the finding that reframes F1. Repairing the rebase gate mattered; giving it an
occasion to run mattered more.

```yaml
on:
  push:
    branches: [master]     # path/* pushes trigger NOTHING
  pull_request:            # never fired — see below
```

Every path in this repository merged with a **local merge commit**:

```
$ git log --oneline --merges -6
7aa3b1d Merge CP-WORKTREE-CLEANUP …   41d661b Merge CP-OPS-001 …
cc78d2f Merge CP-RENDER-REPAIRS …     7f8d026 Merge CP-OPEN-DOCK …
f58093e Merge CP-AI-CAPABILITIES …    80b131a Merge CP-RICH-MARKDOWN …

$ git log --format='%s' --all | grep -c '^Merge pull request'
0
```

Zero pull requests, so the `pull_request` trigger never fired. Pushes to `path/*` matched
no trigger. **The only run that ever happened was `push: master` — after the merge had
already landed on the trunk.**

The consequence is total: `branch-path`, `registration`, `rebase`, `remote-checkpoint`,
`scope-drift` and `coherence-audit` are path-scoped, and on the evidence available here
**none of them can be shown ever to have executed in CI.**

*Correction (coherence audit, 2026-08-24):* the original wording — "not one of them has
ever executed in CI in this repository's history" — claims more than the evidence carries.
Git proves there are no PR **merge commits** and that `path/*` pushes matched no trigger.
It cannot prove that no `pull_request` event was ever opened, nor that no Actions run ever
occurred; a PR could have been opened and then merged locally. The trigger gap is
confirmed; the absolute historical claim is not, and only the repository's Actions history
could settle it. `paths.md` step 3 requires "CI GREEN on the
rebased result, never on a stale branch"; nothing was in a position to check it. The gate
described as "what makes a gatekeeper unnecessary" could only ever observe a merge, never
prevent one.

F1 and F8 compound rather than duplicate. F1 was the gate failing to fire when called;
F8 is that it was never called. Either alone leaves the protocol unenforced.

**Repaired.** `push` now includes `'path/**'`, so the rules run on the branch that will
merge, at the moment the owner directive already requires a push. A `concurrency` group
with `cancel-in-progress` supersedes runs rather than queueing them, since a push after
every commit otherwise multiplies runs across parallel paths and only the newest head's
verdict matters.

*Residual, for the owner:* this makes CI advisory-by-position, not blocking-by-position —
a local `git merge` still bypasses it. Making it structural needs either a host branch
protection rule on `master` or a convention that paths land through a PR. That is a
workflow decision, not a code fix, and is left for the specification step.

### F9 — `writes:` was parsed from the document, not the frontmatter. (Low — REPAIRED)

`/\n\s*writes:\s*\n((?:\s*-\s*\S.*\n)+)/` scanned the whole file, and `---`
satisfies `\s*-\s*\S.*`. Every path therefore declared a phantom `"--"` surface, and the
scan continued past the frontmatter into the body, where an opening bullet list would have
become declared write surfaces. No path leaked past the terminator — that was luck, not
design.

The second half is worse than the first: `writes:\s*\n` refuses a trailing comment, and
the template in bedrock 24 and `paths.md` writes exactly that —
`writes:   # ADVISORY — a signal, never a lock`. **A path copied faithfully from the
documented template parses as zero declared surfaces, silently switching off
`scope-drift`.**

**Repaired.** `parseWrites()` scopes the scan to the frontmatter, so the terminator is not
in the searched text, and tolerates a trailing comment. Three regression tests. Across the
live corpus every path now parses exactly one fewer entry — the phantom `--` — and none
leaks.

### F10 — "filled" means "the placeholder string is absent". (Low)

`isFilled(text)` is `!text.includes('TO BE FILLED BY THE AUDITING AGENT')`. Deleting the
placeholder without writing anything passes. The rule is advisory and the audits are in
fact substantive (see §3), so this is a soft spot rather than a live problem — but it is
the one check whose subject is *whether an agent did the thinking*, and it currently
measures whether an agent did a deletion.

### F11 — `active` is dead status vocabulary. (Trivial)

`PATH_STATUSES` accepts `active`; `PATH_BRANCH_STATUSES` does not. `paths.md` reserves it
for CP-OPS-001, which is now `done`, so the reservation is spent. A path declaring
`status: active` today passes `schema` and is then rejected by `branch-path` with a
message about the wrong thing. Not repaired here on purpose: changing status vocabulary is
a doctrine change and belongs in the specification step with an ADR beside it, not in a
silent edit.


### F12 — a coherence audit can never match its own HEAD. (High)

Found by a third-party coherence audit, and more fundamental than F10.

`tools/cairn-audit.mjs` names an audit file for the **current** HEAD
(`auditName(pathId, head)`). Committing that file *creates a new HEAD*, and `--check`
then looks for a record naming the new one. The record can never refer to the commit that
contains it.

Every audit in the repository shows it:

```
cp-ai-capabilities-9007e07.md   declares 9007e07, first committed in 54f2af3   DIFFERENT
cp-mvp-010-23f47da.md           declares 23f47da, first committed in 783c7c6   DIFFERENT
cp-worktree-cleanup-382ba30.md  declares 382ba30, first committed in 170d6fe   DIFFERENT
… 9 of 9 DIFFERENT, seven of them naming exactly the parent commit
```

Run in the merged path branch itself:

```
$ node tools/cairn-audit.mjs --check          # in path/cp-mvp-010 at 783c7c6
cairn-audit — no coherence audit for 783c7c6
```

So the `coherence-audit` rule cannot recognise a committed audit for the HEAD it is
checking. It only ever passes in the window between filling the record and committing it.
Advisory, so nothing has failed because of it — which is also why it went unnoticed for
nine audits.

The fix is a binding choice, not a patch: bind the audit to the **pre-audit HEAD** it
reviewed (that is what the files already do, accidentally and correctly) and have `--check`
look for a record naming any ancestor within the path's own commits, or bind it to the
rebase base rather than a moving head. Belongs in the opening check.

### F13 — the ceremony schema in the operator guide does not match the implementation. (High)

Also third-party, and the defect is mine.

`ceremonyFromSessions()` reads **root-level** keys, and all 16 backfilled notes were
written that way. But `CP-OPS-002` S02 and the D1 operator guide both prescribe the nested
form. Executed against the live parser:

```
NESTED (what D1 prescribes)            -> false
ROOT (what is implemented + backfilled) -> true
```

An operator following the published guide would write a closing ceremony that the repaired
gate rejects — a *blocking* rule. The F2 repair is correct; its documentation would have
made it fail for the first person to follow it, which is close to the worst possible
outcome for a rule whose entire purpose is to be the last human guard.

Root-level is what ships. Every document must say so, and the schema should be pinned in
bedrock 24 rather than restated per document.

### F14 — this record's own frontmatter was invalid. (Low, and pointed)

`status: complete` carried indented `repaired:` / `owner_ruled:` beneath it. The
frontmatter reader only opens a section when a key has an **empty** value, so both fields
were silently dropped:

```
parsed: { type, title, description, tags, timestamp, status, atomik{…} }   # no repaired, no owner_ruled
```

An audit whose F5 is about machine-unreadable metadata shipped machine-unreadable
metadata. Fixed by moving both keys under `atomik:`. Worth keeping in the record: nothing
validates frontmatter outside `coding-paths/`, which is precisely what F5 asks for.

### F15 — two doctrine conflicts the constitution itself says must be reported. (Medium)

`AGENTS.md`: *"Bedrock states the doctrine; `paths.md` carries the operating detail… If
they ever disagree again, that is a defect — report it."* Two disagreements:

**Registration contents.** `paths.md` says land **ONLY** the path declaration and
regenerated view. `docs/bedrock/24_24-doc-templates.md` says land *"the path file,
opening-check session note, and regenerated `ACTIVE.md`"*. The repository's last real
registration (`9040417`) followed bedrock, not `paths.md`. The rule is better read as
**metadata-only** than as *exactly two files* — but it must be stated once, in one place.

**Path lifecycle.** `docs/bedrock/35_35-coding-path-execution-state.md`: *"A finished path
moves to `status: done`, then `archived` — demotion, never deletion."* Round 3's D2
declares `done` **terminal** and draws `running → archived`. ADR-012 records that abandoned
paths have no terminal transition at all. **D2 invented a lifecycle the repository has not
accepted**, and the validator checks current statuses, never transitions. D2 must be
labelled *proposed* until an ADR settles it.

---

## 3. Non-findings — recorded deliberately

Reporting only defects would misrepresent the protocol.

- **The coherence audit earns its place.** `paths.md` asks: *"Does it find anything a
  human would not have? If it does not after the pilot, delete it."* Nine audits exist,
  ~6,700 words. `cp-render-repairs-d44d381.md` caught ADR-014 §4 contradicting the
  implemented `$$` grammar, and recorded a real bedrock-36 icon exception with the
  condition for revisiting it. **Answer: keep it.** That question is now closed with
  evidence.
- **Gate discipline is honored.** CI runs gates bare in a job separate from the protocol
  check. The reasoning is in the workflow file, tied to the 2026-07-16 white-screen
  incident. This is correct and rare — the defect in F8 was *when* that job ran, never how.
- **`cairn-active.mjs` is clean.** Deterministic by construction (sorted by id, so two
  people regenerating produce byte-identical output), single-sourced, and it refuses to
  guess when the splice markers are missing. Audited in full, no findings.
- **`docs/agents/first_prompt_for_coding_agent.md` is not drift.** It predates Cairn but
  opens with a scope banner — *"Repo-native agents ignore this file and boot from
  `AGENTS.md`"*. The repository already knows how to retire a superseded document
  honestly; `docs/cairn/index.html` (F6) simply does not do it.
- **The advisory/blocking split is principled.** `remote-checkpoint`, `scope-drift` and
  `coherence-audit` are advisory for stated, correct reasons — a final ref cannot prove
  historical push cadence, and a non-deterministic judgment must not block a build.
  `stripCode()` exists because the first link check cried wolf 34 times. This is a
  validator built by someone who understood that a false blocking verdict costs more
  than a missed one.
- **The `links` rule's `./`-only regex is not a real gap.** It ignores relative links
  without a leading dot; the corpus contains 3, all inside illustrative examples.
  Worth a line in the spec, not a work item.
- **Rule inventory is 8 blocking / 7 advisory**, not 8/5 as `AGENTS.md` and `paths.md`
  both state. The two undocumented advisories are `single-truth` and the
  `registration`-grandfathered warning. A stale count, not a defect.

---

## 4. Diagnostic

Cairn's engineering is ahead of its self-description, and its self-description is ahead
of its enforcement. Three of the four things the protocol says it guarantees — the
rebase gate, the closing ceremony, running-path visibility — are guaranteed by
convention and reported as guaranteed by machine. Every one of them passes `OK` on this
trunk while the condition it names is false.

That is one failure mode, not three:

> **Cairn writes rules forward and never drains the state that predates them.**

The grandfather set was never emptied (F3). The worktree backlog was never cleared (F7).
The ceremony rule was scoped to the transition and never checked the corpus (F2). The OKF
convention was adopted and never backfilled (F5). The page was superseded and never
banners (F6). In each case the *new* rule is correct, tested, and honestly documented —
and the *old* state sits underneath it, invisible, reported as compliant. F4 is not part
of this pattern and should not be read as if it were: nothing predates the ledger, it
simply has no upper bound yet.

For a protocol whose entire purpose is that **the repository, not the conversation, is
the truth**, a check that reports `OK` over a false statement is the most expensive
defect available. It does not merely fail to catch drift; it certifies it.

The good news is that this is the cheapest class of problem to fix, because the machinery
is already correct. F1 and F2 are small patches to functions that already have unit
tests. F3 is two registration commits and a deletion. F4 is the move that already worked
once, applied to a second surface.

**Verdict (revised 2026-08-24 after third-party coherence audit).** F1, F2, F8 and F9 are
**implemented locally and uncommitted** — `HEAD` and `origin/master` are both `7aa3b1d`.
They are covered by regression tests (47 passing) and they are not deployed. Calling them
"repaired" without that qualifier was the same error as CP-OPS-002's "landed", and both are
now corrected. Those four are the set that would have let a second contributor's unreviewed,
unrebased, unregistered work be certified as protocol-compliant — once they are committed
and pushed. F3 is owner-ruled as
self-draining under CP-OPS-001. On that basis the protocol is ready for a shared project,
with one workflow decision outstanding (F8 residual: a local merge still bypasses CI —
branch protection or a PR convention would close it). F5–F7 and F10–F11 are quality of
life; F4 is a boundary to set before it is hit, not a defect to fix.

Two honest caveats about this audit's own method.

F8 was found by reading the workflow's trigger block, which the first pass had read for its
*jobs* and not its `on:` clause. The most consequential finding in this record was sitting
four lines above a section already quoted approvingly. Reading a file is not the same as
auditing it.

And the third-party coherence audit found four defects in this record and its execution
plane — F12–F15 — including a false completion claim, wrong denominators in F5, two
overstatements, and invalid frontmatter here. Every one is the same species as the findings
this record makes about Cairn: **a claim asserted at a level of confidence the evidence
does not carry.** An audit is not exempt from its own standard, and this one was not.

---

## 5. Deliverables still missing against the brief

The brief names four artifacts for the milestone. None exists in the repository:

1. **Full protocol documentation + step-by-step guide + lexicon** — `docs/cairn/` holds
   two HTML pages (one drifted) and no specification. Doctrine is currently distributed
   across `paths.md`, bedrock 22/24/26/35 and ADR-009/012, discoverable only by reading
   all of them.
2. **Ex-nihilo bootstrap prompt** — absent.
3. **Repo init kit architecture** — absent. Cairn is currently inseparable from Atomik:
   `cairn-check.mjs` hardcodes `atomik-project/`, `apps/`, `AREA_MAP` and
   `LEGACY_UNREGISTERED_PATHS`. Extraction requires a config seam, not a copy.
4. **User+agent driving guide** — partially served by `paths.md`, which is the best
   document in the repository and is written for someone who already knows the protocol.

`CP-OPS-002` is drafted at
[`atomik-project/coding-paths/CP-OPS-002.md`](../../atomik-project/coding-paths/CP-OPS-002.md)
with the ordering these findings imply. It is `status: draft` and **not registered on the
trunk**: `paths.md` requires an owner opening check before activation, and registering it
unilaterally would repeat, in the audit itself, the failure this record documents.
