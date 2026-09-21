# cairn-close — command sequences

Defaults `main`, `origin`, `path/cp-example-001`; substitute the binding's
names. Run every gate bare; the exit code is the verdict. A host that declares
`pathHistoryPolicy: retained` follows its own retention procedure before any
rewriting push; nothing below rewrites anything.

## Produce implementation candidate C

```bash
git fetch origin main
git rev-parse origin/main        # this is T
git merge origin/main
```

Resolve conflicts and commit the merge. Work that remains is a work unit, run
with `cairn-unit` before closing starts again.

```bash
git log origin/main..HEAD --grep='Cairn-Provisional' --oneline   # must print nothing
git status --porcelain=v1                                         # must print nothing
git rev-parse HEAD                                               # this is C
git push origin path/cp-example-001
npm run cairn-check -- --base origin/main
npm test
```

## Review and accept exactly C

```bash
npm run cairn-audit -- --subject <C> --branch path/cp-example-001
node tools/cairn-check.mjs --scope-digest project/coding-paths/CP-EXAMPLE-001/index.md#definition-of-done
npm run cairn-check -- --base origin/main   # the advisories to disposition
```

**`pull-request`**: the first command prints the ledger half of the
description. Open the request from `path/cp-example-001` to `main`, paste and
fill it. The approval is the acceptance.

**`manual-git`**: the first command scaffolds
`project/coding-paths/CP-EXAMPLE-001/closing-<C>.md`. Fill every field, the
four answers and the verdict.

If the digest differs from the opening acceptance, stop: restore the text or
record a scope amendment. If implementation changes, stop: a new `C`.

## Create administrative commit A

Set `status: ready` and `subject_commit: <C>`, point the resume section's
checkpoint at `C`, regenerate the live view. Run the gate before committing,
then stage only the closure surfaces:

```bash
npm run cairn-active
npm run cairn-check -- --base origin/main
git add project/coding-paths/CP-EXAMPLE-001/index.md
git add project/coding-paths/ACTIVE.md
git add project/coding-paths/CP-EXAMPLE-001/closing-<C>.md   # manual-git only
git commit -m "Close CP-EXAMPLE-001 candidate <C>"
git rev-list --count <C>..HEAD                                # must print 1
npm run cairn-check -- --base origin/main
git push origin path/cp-example-001
```

## Check acceptance drift

```bash
git fetch origin main
git diff --name-only "$(git merge-base origin/main HEAD)" origin/main
npm run cairn-check -- --base origin/main
```

If any file in that list matches `writes:` or `governs:`, the acceptance is
invalidated: return to `running`, merge the new tip in, and repeat.

## Integrate

**`pull-request`**: merge the request on the forge — a merge commit, with
`cairn-check` green on the commit that lands. Then, from a clean trunk
checkout:

```bash
git switch main
git fetch origin main
git merge --ff-only origin/main
git merge-base --is-ancestor <C> HEAD
```

Set `status: done` and `resolution: completed`, keep `subject_commit: <C>`,
regenerate `ACTIVE.md`, write `project/log/YYYY-MM-DD-cp-example-001.md`, run
the gate, and land that commit through the transport.

**`manual-git`**: construct the integration unit from a clean trunk checkout:

```bash
git switch main
git fetch origin main path/cp-example-001
git rev-parse HEAD                 # the trunk BEFORE the arrival — the base below
git merge --no-ff --no-commit origin/path/cp-example-001
```

In that pending unit only: `status: done`, `resolution: completed`,
`subject_commit: <C>` retained, `ACTIVE.md` regenerated, the journal entry.

```bash
git add project/coding-paths/CP-EXAMPLE-001/index.md
git add project/coding-paths/ACTIVE.md
git add project/log/YYYY-MM-DD-cp-example-001.md
git commit -m "Integrate CP-EXAMPLE-001"
git merge-base --is-ancestor <C> HEAD
npm run cairn-check -- --base <the trunk sha from before the merge>
npm test
```

The `--base` is not optional here. A bare run on the trunk resolves no base and
compares the working tree, which is clean once you have committed, so every
changed-file rule — `transition`, `acceptance`, `journal-entry`, `scope-digest`
— would see nothing and the run would print OK over an arrival it never read.
The `comparison` rule reports a base that already contains what it judges, but
it cannot report a base nobody asked for.

No merge object is refused here — that refusal binds on `pull-request` alone,
because this merge is the integrating unit (ADR-026 decision 4). `transition` does
not refuse it either: since ADR-027 it looks for the `ready` behind the arrival
on ANY parent, so the merge that carries this closing is judged where the branch
declared it, on the second. Until 2026-09-14 it read the first parent alone,
which refused every honest closing on this transport. Both halves of `manual-git`
integration are decided.

**Until 2026-09-14 no run made that comparison, on either transport**, so
`transition`, `acceptance`, `journal-entry` and `scope-digest` never judged an
arrival at all: the bare gate on the trunk resolves no base and sees the
working tree, and the installed workflow based a push run on `origin/<trunk>`,
which after that push already names the pushed commit. Trunk runs printed
`0 changed file(s)`. The workflow now bases a push to the trunk on the commit
it replaced, so the forge's run reaches these rules; and the `comparison` rule
refuses to report OK over a base that already contains what it judges. A LOCAL
run reaches them only if you give it the base — which is why the sequence above
passes one. `tools/soundness.md` carries the finding.

```bash
git push origin HEAD:main
git fetch origin main
git merge-base --is-ancestor HEAD origin/main
```

## Delete the transport's branches

```bash
git branch -r --list 'origin/*/cp-example-001' --format='%(refname:strip=3)'
git push origin --delete <each name printed that is not path/cp-example-001>
```

## Remove the secondary worktree safely

From another checkout:

```bash
git worktree list --porcelain
git -C /exact/path/to/repo-cp-example-001 status --porcelain=v1   # must print nothing
git worktree remove /exact/path/to/repo-cp-example-001
git worktree list --porcelain
test ! -e /exact/path/to/repo-cp-example-001
```

No `--force`; never the primary checkout.

## Report partial outcomes precisely

```text
path ready, not integrated
path ready, acceptance invalidated by trunk drift
integration candidate checked, remote push failed
remote integration complete, cleanup incomplete
```

When a rule has already been broken, do not tidy the history: the
[repair procedures](https://github.com/sinlalune/cairn/blob/bff7e2af18c17a909e67eec4a8e69c1f5855cfe7/spec/reference/repair.md) give the sequence for
each case.
