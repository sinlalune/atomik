---
type: Atomik Brief
title: Handoff — CP-OPS-002 S07a complete, ready for S07
timestamp: 2026-08-25T00:00:00Z
atomik:
  path: CP-OPS-002
  branch: path/cp-ops-002
  completed_step: S07a
---

# Resume CP-OPS-002 here

## Repository state

- Worktree `../4tom1k-cp-ops-002` (this checkout), branch `path/cp-ops-002`
  tracking `origin/path/cp-ops-002`. `node_modules` is symlinked from the main
  checkout.
- Registered at `base_commit: 7aa3b1d` by the trunk commit `df875e6` before this
  branch existed; `dd6e76a` is S00.
- **`git worktree list` now holds four entries** — the owner's trunk, the two
  grandfathered in-flight paths (`cp-mvp-011`, `cp-mvp-012`) and this one. S06d
  removed six. All ten `path/*` branches are retained; only the spent
  `registration/cp-worktree-cleanup` ref was deleted.
- Gates at S07a: `npm run cairn-check` OK with one advisory — no coherence audit
  for this head, expected until the pre-merge audit. Validator suite
  `npm run cairn-check:test` 81/81.
- `typecheck` / `test` / `build` are not run for this step and their verdicts are
  not claimed: this path writes protocol tooling and doctrine only, and touched
  no product code.

## What the completed step changed

**S07a — ADR-017, the coding-path lifecycle** (ruling 5, F11 + F15). Three
documents described one state machine and no two agreed: bedrock 35 said
`done` **then** `archived`; round 3's D2 §2.2 declared `done` terminal and drew
`running → archived` as the only abandonment edge; ADR-012 recorded that
abandoned paths have no terminal transition at all.

- **`archived` is the single terminal state.** Bedrock wins — it states the
  doctrine while `paths.md` carries operating detail. `done` is a completion
  (accepted, rebased, audited, merged), not an end.
- **Abandonment is `running → archived`, with no new word.** An abandoned path
  never passes through `done`, because `done` asserts a merge that did not
  happen. The closing ceremony is not side-stepped: that gate keys on `done`, and
  archiving is a different destination rather than a cheaper route to it.
- **`active` is retired** — accepted by `schema`, rejected by `branch-path`, so a
  path declaring it failed with a message about a different problem. None did.
- **No blocking rule was added, deliberately.** A validator run sees one commit
  and has never seen a transition, so the machine is doctrine and only the
  per-state invariants are enforced. A document claiming Cairn "enforces the
  lifecycle" would be a fresh F13.
- **Advisory `path-staleness`** closes the other half of ADR-012's hole: a
  `running` path whose branch has been quiet longer than the declared window
  (14 days, configurable at S08) is reported with both ways out. An unresolvable
  branch reports nothing — unknown must not read as stale.
- D2 §2.2, the corrections register (C16), §2.3's regenerated rule table,
  `paths.md` (vocabulary by reference; hole 1 closed, two remain) and
  `index.html` all updated. Bedrock untouched: the ADR ratifies what it says.
- Four tests, suite 77 → 81.

## What earlier steps changed

**S06d** drained the two low-severity leftovers (ruling 8). Both are this path's
thesis in miniature: a rule written with its predecessor state never drained (F7),
and a check measuring something adjacent to what it claims (F10).

- **F7** — the six secondary worktrees for already-merged paths are gone, each
  through the full `paths.md` sequence with every step checked rather than assumed:
  ancestor of `origin/master` after a fresh fetch, registered secondary worktree,
  empty `status --porcelain=v1`, removal without `--force` run from this checkout,
  then deregistration, absence on disk, and the branch still resolving. The orphan
  `registration/cp-worktree-cleanup` went with `git branch -d`, whose merged test
  is the check rather than a step before it.
- **F10** — `isFilled()` was `!text.includes(PLACEHOLDER)`, so deleting one string
  made an empty file pass. `fillErrors()` now asks the two things a deterministic
  gate honestly can — the record NAMES an outcome from the stated vocabulary and
  ANSWERS at least one of its own findings questions — and says which is missing.
  It deliberately does not judge the answers; that is why the rule stays advisory.
- **The vocabulary matches by STEM.** CP-OPS-001's record says *"drift noted,
  repaired before merge"* — it names an outcome and qualifies it. An exact-phrase
  rule would have declined a substantive audit, which is the false verdict this
  repository says costs more than a missed one. Verified before the rule was
  written: all nine existing records pass, four answered questions each; the
  untouched scaffold fails on two counts.

**Found by draining it — a C-quoted path was invisible to the BLOCKING rules.**
Deleting the file made `scope-drift` report it as outside a `writes:` surface that
covers it. `git status --porcelain` C-quotes any path with a space, a quote, a
backslash or a non-ASCII byte, and `porcelainPaths()` never unquoted — so every
rule downstream read the path *with the quotation marks in the string*. A quoted
path matches no `writes:` glob, no `AREA_MAP` pattern and no `GUARDED_ROOTS`
prefix, so a source file whose name contains a space was counted as changed and
then invisible to `same-work-unit` and `branch-identity`, both blocking. Fixed
with `-z` on **both** halves of `changedFiles()` — `git diff --name-only` quotes
identically and that half is the one CI runs — rather than with an unquoter, since
Git escapes non-ASCII octally and a UTF-8 decoder does not belong in this script.
Three tests, suite 76 → 77.

**`atomik-project/briefs/feedback on  MVP-001.md` — deleted on owner directive**
(2026-08-25: *"feedback on MVP-001 => you can delete"*), closing the last item F7
named. It was raised rather than drained because the FROZEN `atomik-project/log.md`
cites it by that exact name; deletion keeps that entry true in the past tense —
it records the feedback as taken up, and every item in it shipped — where a rename
would have made it point at nothing. Content survives in Git at `51c0940`.

**Earlier steps**, newest first: **S06c** bound `cairn-audit --check` to the commits
its path contributed (`git rev-list HEAD --not <trunk>`), refusing a record that
belongs to another path or to a pre-rebase head the closing rebase rewrote.
**S06** retired `docs/cairn/index.html`, which taught the rejected integrator model
at ten sites; both HTML pages now carry a dated status banner naming the ADRs they
render. **S05c** completed the OKF folder pair — eighteen folder logs seeded from
real Git history. **S05b** made the opening check BLOCKING and retracted an invented
folder-log decision on owner correction. **S05** closed F5 with five indexes, ADR
frontmatter and `adrFrontmatterErrors()`.

## Next action

**S07 — the specification and lexicon.** Its dependency is discharged: ADR-017
settled the lifecycle, so the specification describes it by reference rather
than inventing one.

- `docs/cairn/specification.md`: the planes (three conceptual, two repository —
  the audit found these routinely conflated), the ADR-017 lifecycle and status
  vocabulary, the full rule table generated from `cairn-check.mjs` so the count
  cannot go stale, and the blocking-rule admission test.
- `docs/cairn/lexicon.md`: one definition per term, each pointing at the file
  that enforces it. A term with no enforcing file is marked aspirational.
- **The three enforcement tiers** (S06b, ruling 9): `local` / `ci` / `protected`,
  one line each on what the tier can and cannot prevent, with tier 2 stated as a
  property of a repository and never a requirement of the protocol.
- State the F8 workflow decision and the CP-MVP-011/012 migration window as
  *properties*, not omissions.
- A step-by-step operator guide for someone who does not know the protocol,
  carrying the optional tier-2 ruleset as a JSON payload plus one `gh api`
  command — copy-paste, not a click-path, and explicitly skippable.

## Blockers and decisions still open

- None. Nothing in this path waits on host configuration: **owner ruling 9
  (2026-08-24)** rescoped S06b from "configure branch protection" to "declare the
  enforcement tier"
  ([note](../sessions/2026-08-24-cp-ops-002-s06b-rescope.md)). Its deliverables
  live in S07 (three-tier prose, optional `gh api` ruleset payload) and S08
  (`enforcement` field in `cairn.config.json`, generated `cairn-check` header
  line, tier-0/1 `cairn-init`). This repository is tier 1, declared.

## Resume instruction for the agent

Resolve the path from this worktree's branch, verify the ledger against Git,
then execute `next action`. Do not ask the owner to restate the prior session.
