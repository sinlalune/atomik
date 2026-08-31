---
type: Cairn Reference
title: Cairn operations
description: Manual command sequences for registration, remote checkpoints, provisional commits, checkpoint retention, exact-candidate closure, integration verification, and safe worktree cleanup.
tags: [cairn, reference, commands, worktree, merge, cleanup]
timestamp: 2026-08-26T00:00:00Z
---

# Cairn operations

These commands use the canonical defaults `main`, `origin`, and
`path/cp-example-001`. Substitute validated bindings. Run gates directly; never
pipe their verdict through another command.

The manual sequence is normative while transactional `cairn-init`,
`cairn-new`, and `cairn-close` commands remain unimplemented.

## Register an accepted path

Use the repository's declared registration transport. For a local or CI profile
whose policy permits an exact direct trunk update:

```bash
git switch main
git fetch origin main
git status --porcelain=v1
git rev-parse origin/main
```

The status output must be empty. Set `base_commit` to the exact remote trunk tip,
record opening acceptance, set the path to running, and regenerate the live
view:

```bash
npm run cairn-active
npm run cairn-check
git status --short
git add project/coding-paths/CP-EXAMPLE-001.md
git add project/coding-paths/ACTIVE.md
git add project/sessions/YYYY-MM-DD-cp-example-001-opening.md
git commit -m "Register CP-EXAMPLE-001 before branching"
git rev-parse HEAD^
git push origin HEAD:main
```

The printed parent must equal `base_commit`. No product implementation belongs
in the registration commit. A protected profile replaces the final push with
its tested registration adapter; it cannot reuse a check that requires the new
path to already exist on trunk.

## Create and publish the path

```bash
git worktree add ../repo-cp-example-001 \
  -b path/cp-example-001 main
cd ../repo-cp-example-001
git push -u origin path/cp-example-001
git status --short --branch
```

Configure path-specific ports, profiles, databases, and caches where relevant.
Assign one writer to this writable worktree.

## Complete one work unit

First update the parts the work unit's declared type requires, plus the path
ledger and handoff brief.

Then:

```bash
npm run cairn-check
npm run typecheck
npm test
npm run build
git status --short
git add path/to/implementation
git add path/to/tests
git add docs/modules/example.md
git add project/coding-paths/CP-EXAMPLE-001.md
git add project/briefs/cp-example-001-handoff.md
git commit -m "CP-EXAMPLE-001 S01: coherent outcome"
git push origin path/cp-example-001
git fetch origin path/cp-example-001
git merge-base --is-ancestor HEAD origin/path/cp-example-001
```

The final command must exit zero before the step is called complete. Then record
the checkpoint in the ledger and retain it:

```bash
git update-ref refs/cairn/checkpoints/cp-example-001/01 HEAD
git push origin refs/cairn/checkpoints/cp-example-001/01
git for-each-ref refs/cairn/checkpoints/cp-example-001
```

The ordinal is the `unit:` value in that entry's `cairn-unit` block. The local
ref is what the gate reads — deliberately, so a restricted runner or an offline
checkout cannot turn a protocol failure into a protocol pass. The push is what
makes it survive the machine.

## Publish incomplete work

Work that is not a completed unit — mid-refactor, failing, or awaiting a user's
inspection — is pushed rather than held on disk:

```bash
git add -A
git commit -m "CP-EXAMPLE-001: WIP search index

Cairn-Provisional: awaiting user inspection of the ranking change"
git push origin path/cp-example-001
git rev-parse HEAD
```

Present that exact object id for inspection. A provisional commit is never
reported as a completed checkpoint and never named as a resume point. After the
inspection passes, fold it into the work unit it was drafting:

```bash
git reset --soft <last-checkpoint>
git commit -m "CP-EXAMPLE-001 S02: coherent outcome"
```

Folding rewrites published commits, so every ledger-named checkpoint must
already be retained before the force push that follows.

## Produce implementation candidate C

Retain every ledger-named checkpoint **before** the rebase, because the rebase is
what orphans them:

```bash
git fetch origin '+refs/cairn/*:refs/cairn/*'   # the namespace is NOT fetched by default
npm run cairn-check   # blocks on any declared unit that is not yet retained
git for-each-ref refs/cairn/checkpoints/cp-example-001
git update-ref refs/cairn/checkpoints/cp-example-001/<unit> <checkpoint-oid>
git push origin refs/cairn/checkpoints/cp-example-001/<unit>
```

The fetch is first, and it is not a convenience. `refs/cairn/*` lies outside
`refs/heads/*` and `refs/tags/*`, so a fresh clone and every CI checkout action
see none of it — and listing an unfetched namespace succeeds with no output,
which reads exactly like a namespace that is empty. Write the same fetch into
the continuous-integration job, before the checker runs. Both halves of a
retention ref are required: `update-ref` makes it local, `push` makes it
retention.

Record the trunk tip as `T`, then rebase onto it:

```bash
git fetch origin main
git rev-parse origin/main    # this is T; record it in the closing record
git rebase origin/main
```

Resolve conflicts, fold every remaining provisional commit, and finish any final
implementation. Commit only when the worktree contains candidate changes;
otherwise the rebased `HEAD` is already the candidate. Confirm no provisional
marker survives, then record `C`, publish it, and run all checks against it:

```bash
git log origin/main..HEAD --grep='Cairn-Provisional' --oneline    # must print nothing
```

```bash
# if final candidate changes are present:
git commit -m "CP-EXAMPLE-001: final implementation candidate"
git rev-parse HEAD
git push --force-with-lease origin path/cp-example-001
npm run cairn-check -- --base origin/main
npm run typecheck
npm test
npm run build
```

Use an ordinary push when rebase did not rewrite a published branch. The full
output of `git rev-parse HEAD` is `C`.

## Audit and accept exactly C

```bash
npm run cairn-audit -- --subject <C> --branch path/cp-example-001
```

Fill the generated audit record, whose filename and metadata carry the full
object id of `C`. Read the candidate against the documents pinned in `governs:`,
at their pinned ids.

An authorised reviewer inspects exactly `C` and creates the closing acceptance
record naming the same object id, the base `T`, the roles the reviewer held, the
re-computed scope digest, and one structured entry per advisory raised at `C`:

```bash
sed -n '/^## Definition of done$/,/^## /p' \
  project/coding-paths/CP-EXAMPLE-001.md | sha256sum
npm run cairn-check -- --base origin/main   # the advisories to disposition
```

If the digest differs from the one recorded at opening, stop: the definition of
done moved after acceptance. Restore it or record a scope amendment.

If implementation changes, stop: commit a new `C`, rerun all checks, generate a
new audit file, and obtain new acceptance.

## Create administrative commit A

Set the path to `status: ready` and `subject_commit: <C>`, append one ledger
entry, and move the brief's checkpoint pointer. Change no other field of the path
record — not the definition of done, not `scope_ref`, not `writes:`, not
`governs:`, not the step plan. Stage only the four closure surfaces:

```bash
git add project/coding-paths/CP-EXAMPLE-001.md
git add project/briefs/cp-example-001-handoff.md
git add project/audits/cp-example-001-<C>.md
git add project/sessions/YYYY-MM-DD-cp-example-001-closing.md
git commit -m "Close CP-EXAMPLE-001 candidate <C>"
git rev-list --count <C>..HEAD
npm run cairn-check -- --base origin/main
git push origin path/cp-example-001
```

The count must be exactly one. The checker must report no implementation change
after acceptance. The resulting commit is `A`.

## Check acceptance drift, then integrate

Before integrating, test whether the acceptance still holds. `T` is the base
recorded in the closing record:

```bash
git fetch origin main
git diff --name-only <T> origin/main
```

Compare that file list with the union of the path's `writes:` and `governs:`
declarations. If nothing matches, the acceptance survives and integration
proceeds. If anything matches, return the path to `running`, rebase onto the new
tip, and repeat audit and acceptance.

Do **not** require `origin/main` to equal `T`. That rule makes every landing
invalidate every other open acceptance, and on a busy trunk nothing ever closes.

## Integrate the exact ready tip

The exact procedure depends on the declared transport. A checked local merge
transport can construct a candidate from a clean designated trunk checkout:

```bash
git switch main
git fetch origin main path/cp-example-001
git merge --no-ff --no-commit origin/path/cp-example-001
```

In that pending integration unit only:

- set the path to `status: done` and `resolution: completed`;
- retain `subject_commit: <C>`;
- regenerate `ACTIVE.md`;
- add one `project/log/YYYY-MM-DD-cp-example-001.md` entry.

Then create and test the exact merge candidate:

```bash
git add project/coding-paths/CP-EXAMPLE-001.md
git add project/coding-paths/ACTIVE.md
git add project/log/YYYY-MM-DD-cp-example-001.md
git commit -m "Integrate CP-EXAMPLE-001"
git merge-base --is-ancestor <C> HEAD
git rev-list --count <C>..HEAD
npm run cairn-check
npm run typecheck
npm test
npm run build
```

The ancestry command must succeed and the count must be exactly two: `A` and the
integration commit. Only after every check passes may the transport land that
exact commit:

```bash
git push origin HEAD:main
git fetch origin main
git merge-base --is-ancestor HEAD origin/main
```

A protected profile uses its tested candidate-ref, queue, or bot adapter rather
than a direct push. In every profile, the checked identity and landed identity
must be equal.

## Remove the secondary worktree safely

From another checkout:

```bash
git worktree list --porcelain
git -C /exact/path/to/repo-cp-example-001 status --porcelain=v1
git worktree remove /exact/path/to/repo-cp-example-001
git worktree list --porcelain
test ! -e /exact/path/to/repo-cp-example-001
```

The status command must print nothing. Do not pass `--force`. Do not target the
primary checkout. The path branch may be retained for navigation or removed
after every path commit is proved reachable from the remote trunk.

## Report partial outcomes precisely

```text
provisional commit pushed, awaiting user pass
accepted work unit, commit not yet pushed
checkpoint pushed, retention ref not written
path ready, not integrated
path ready, acceptance invalidated by trunk drift
integration candidate checked, remote push failed
remote integration complete, cleanup incomplete
```

## Repair after a violation

When a rule has already been broken, do not tidy the history until it looks
satisfied. The [repair procedures](./repair.md) give the sequence for each case.

Return to [the full protocol](../index.md) or the
[integration-transport concept](../concepts/integration-transport.md).
