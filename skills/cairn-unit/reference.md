# cairn-unit — command sequences

Defaults `main`, `origin`, `path/cp-example-001`; substitute the binding's
names. Run every gate bare; the exit code is the verdict.

## Complete one work unit

First update the parts the unit's declared type requires, write the step
record, and refresh the resume section of `index.md`. Then:

```bash
npm run cairn-check
npm test
git status --short
git add path/to/implementation
git add path/to/tests
git add docs/modules/example.md
git add project/coding-paths/CP-EXAMPLE-001/index.md
git add project/coding-paths/CP-EXAMPLE-001/steps/S01.md
git commit -m "CP-EXAMPLE-001 S01: coherent outcome"
git push origin path/cp-example-001
git fetch origin path/cp-example-001
git merge-base --is-ancestor HEAD origin/path/cp-example-001
```

Read each gate's exit code, never its output: a gate that died with *command
not found* prints nothing a filter would catch, and an empty result reads as a
pass. The final command must exit zero before the step is called complete. On
a no-rewrite host that is the whole of it: the commit keeps its object id for
the life of the path, so the branch keeps every checkpoint reachable.

## Reach a current base

```bash
git fetch origin main
git merge origin/main
```

Resolve conflicts and commit the merge. Never rebase a published branch.

## Publish incomplete work

Work that is not a completed unit — mid-refactor, failing, awaiting someone's
inspection — is pushed rather than held on disk, marked with a trailer:

```bash
git add <paths>
git commit -m "CP-EXAMPLE-001: WIP search index

Cairn-Provisional: awaiting inspection of the ranking change"
git push origin path/cp-example-001
git rev-parse HEAD
```

Present that exact object id for inspection. A provisional commit is never
reported as a completed checkpoint, never named as a resume point, and never
proposed as a candidate. On a no-rewrite host it stays in the history; the
completed unit's own commit supersedes it.

Nothing of the administrative closure — `ready`, `subject_commit`, the closing
record on `manual-git` — is ever pushed under that trailer.

## Report partial outcomes precisely

```text
provisional commit pushed, awaiting inspection
work unit committed, push failed — implemented locally, not complete
unit pushed, the request's run red — not complete until that run is read green
```
