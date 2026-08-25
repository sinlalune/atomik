---
type: Atomik Coding Path History
title: CP-OPS-002 S06 — Retire the drifted page, declare the enforcement tier, bind the audit, drain the leftovers
description: Completed-step record rolled out of CP-OPS-002.md at CP-OPS-002 S07c. Verbatim; nothing summarized.
tags: [coding-path, history, cp-ops-002]
timestamp: 2026-08-25T00:00:00Z
path: CP-OPS-002
step: S06
---

# CP-OPS-002 S06 — Retire the drifted page, declare the enforcement tier, bind the audit, drain the leftovers

Rolled out of [CP-OPS-002.md](../CP-OPS-002.md) at CP-OPS-002 S07c, VERBATIM:
moved, never summarized. The live path file keeps its declaration, its index over
these records, its Work Ledger and its next action; the execution detail lives
here. The convention is in [paths.md](../paths.md#the-ledger-has-a-boundary).

Two mechanical adjustments were unavoidable and are named rather than made
silently. **Deixis**: text saying "below", "this ledger" or "the checkpoint" was
written when these entries sat in the path file and points at the Work Ledger in
[CP-OPS-002.md](../CP-OPS-002.md); repairing it in place would have made the
record no longer verbatim. **Link depth**: a relative link is an address, not
content — moving the file one directory down changes the address of the *same*
target, so `../sessions/…` became `../../sessions/…`. The characters differ; the
reference does not. Leaving them would have preserved the characters and broken
the reference, which is the opposite of faithful.

Entries in this record: S06, S06b, S06c and S06d.

---

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
[the rescope note](../../sessions/2026-08-24-cp-ops-002-s06b-rescope.md). Ruling 6 made host
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

**Found by draining it: a quoted path is invisible to the blocking rules.** Deleting
`feedback on  MVP-001.md` made `scope-drift` report it as outside a `writes:` surface that
plainly covers it. The declaration was not the problem. `git status --porcelain` **C-quotes**
any path containing a space, a quote, a backslash or a non-ASCII byte, and
`porcelainPaths()` never unquoted: every rule downstream was reading
`"atomik-project/briefs/feedback on  MVP-001.md"` — with the quotation marks in the string.

- **It is not an advisory-only defect.** A quoted path starts with `"`, so it matches no
  `writes:` glob, no `AREA_MAP` pattern and no `GUARDED_ROOTS` prefix. A source file whose
  name contains a space was counted as changed and then invisible to every rule that asks
  *which* file it is — `same-work-unit` and `branch-identity` included, both **blocking**.
  The function's own comment already said *"every rule downstream reads this list, blocking
  ones included"*; it was right about the stakes and wrong about the coverage.
- **The fix is `-z`, not an unquoter.** Git escapes non-ASCII bytes octally (`\303\251`
  for `é`), so unquoting means reassembling UTF-8 from octal — a decoder to get wrong, in a
  script whose whole claim is that a sceptic can read it in one sitting. `-z` asks Git not
  to quote at all: NUL-separated records, paths verbatim. **Both halves** of `changedFiles()`
  take it, because `git diff --name-only` quotes identically and that half is the one CI runs.
- Rename and copy records carry the NEW path with the ORIGINAL in the following NUL field;
  the original is skipped, since reporting it would name a path that no longer exists.
- Three regression tests, including the guarded-root assertion the quoted form defeated.
  Suite 76 → 77.
- **The same file broke tooling twice.** The audit's own method note records a `find` loop
  splitting that filename into three and miscounting three of eight directories. It was
  read then as a lesson about fragile shell; it was also a live defect in the validator,
  sitting one function away, unnoticed for as long as the double space existed.

> **`atomik-project/briefs/feedback on  MVP-001.md` — deleted on owner directive.** F7
> names it too: a double space in the filename, no frontmatter. It was raised rather than
> drained because it is the owner's own raw feedback and `atomik-project/log.md` — the
> FROZEN archive that may never be rewritten — cites it by that exact name, so a rename
> would break a reference in a file the protocol forbids repairing. The owner ruled the
> third way (2026-08-25): *"feedback on MVP-001 => you can delete"*. Deletion rather than
> rename is the coherent choice, because the frozen entry records that the feedback was
> **taken up** — every item in it shipped as pre-S02 dogfooding units — so the file was
> spent, and the archive still reads true in the past tense where a renamed file would
> have made it read false in the present. The content survives in Git at `51c0940`.

