---
type: Cairn Reference
title: 'Reference: Cairn operations'
description: Copy-ready command sequences for path registration, isolated execution, step checkpoints, rebase, self-merge, remote verification, and safe worktree cleanup.
tags: [cairn, reference, commands, worktree, merge, cleanup]
timestamp: 2026-08-25T00:00:00Z
---

# Cairn operations

The commands use the canonical defaults `main`, `origin`, and
`path/cp-example-001`. Substitute configured names. Run gates directly; never
pipe their first verdict through a filter.

## Before opening

```bash
git switch main
git fetch origin main
git status --porcelain=v1
git rev-parse HEAD
```

The status output must be empty before registration. Reconcile the local trunk
with the repository's normal policy before continuing.

## Registration

After the opening record and running path declaration are ready:

```bash
npm run cairn-active
npm run cairn-check
git status --short
git add project/coding-paths/CP-EXAMPLE-001.md
git add project/coding-paths/ACTIVE.md
git add project/sessions/YYYY-MM-DD-cp-example-001-opening.md
git commit -m "Register CP-EXAMPLE-001 before branching"
git push origin main
```

Stage any additional metadata correction explicitly. No implementation belongs
in this commit.

## Worktree creation

```bash
git worktree add ../repo-cp-example-001 \
  -b path/cp-example-001 main
cd ../repo-cp-example-001
git status --short --branch
```

Configure per-worktree ports, profiles, databases, and caches when applicable.

## Complete one step

After implementation, tests, documentation, ledger, and handoff brief are all
current:

```bash
npm run cairn-check
npm run typecheck && npm test && npm run build
git status --short
git add path/to/implementation
git add path/to/tests
git add docs/modules/example.md
git add project/coding-paths/CP-EXAMPLE-001.md
git add project/briefs/cp-example-001-handoff.md
git commit -m "CP-EXAMPLE-001 S01: coherent outcome"
git push origin path/cp-example-001
git merge-base --is-ancestor HEAD origin/path/cp-example-001
```

The final command must exit zero before the step is reported complete.

## Rebase before closure

Record the pre-rebase path head first:

```bash
git rev-parse HEAD
git fetch origin main
git rebase origin/main
npm run cairn-check -- --base origin/main
npm run typecheck && npm test && npm run build
```

If published commits were rewritten:

```bash
git rev-parse HEAD
git push --force-with-lease origin path/cp-example-001
```

Record both heads in the ledger. Never use blind `--force`.

## Coherence audit and done state

```bash
npm run cairn-audit
```

Fill the generated record, set the path to `status: done`, refresh its brief,
then run the checks again and commit/push those explicit files.

## Self-merge

From the repository's designated trunk checkout:

```bash
git switch main
git fetch origin main
git merge-base --is-ancestor origin/main path/cp-example-001
git merge --no-ff path/cp-example-001 \
  -m "Merge CP-EXAMPLE-001"
npm run cairn-check
npm run typecheck && npm test && npm run build
git push origin main
```

If local `main` is not the repository's accepted current trunk, reconcile it
before merge. Never hide a stale base behind a local merge preview.

## Verify the remote merge

```bash
git fetch origin main
git rev-parse HEAD
git merge-base --is-ancestor HEAD origin/main
```

The ancestry command must exit zero. Keep the exact merge commit for the closure
report.

## Remove the secondary worktree safely

Run from another checkout, never from the worktree being removed:

```bash
git worktree list --porcelain
git -C /exact/path/to/repo-cp-example-001 status --porcelain=v1
git worktree remove /exact/path/to/repo-cp-example-001
git worktree list --porcelain
test ! -e /exact/path/to/repo-cp-example-001
```

The status command must print nothing. Do not pass `--force`. Do not target the
main checkout. Removing the worktree does not remove either the local or remote
path branch.

## Failure wording

Use explicit partial outcomes:

```text
implemented locally, not complete      push did not succeed
merge complete; cleanup incomplete     remote merge is proven, cleanup failed
```

Return to [Operator sequence](../index.md#11-operator-sequence).
