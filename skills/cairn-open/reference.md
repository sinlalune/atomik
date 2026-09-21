# cairn-open — command sequences

Defaults `main`, `origin`, `path/cp-example-001`; substitute the binding's
names. Run every gate bare and read its exit code; never pipe a gate into
another command.

## Register an accepted path

```bash
git switch main
git fetch origin main
git status --porcelain=v1
git rev-parse origin/main
node tools/cairn-check.mjs --scope-digest project/coding-paths/CP-EXAMPLE-001/index.md#definition-of-done
```

The status output must be empty. Set `base_commit` to the printed trunk tip,
write the opening acceptance with the printed digest, set `status: running`,
regenerate the live view, and check:

```bash
npm run cairn-active
npm run cairn-check
git status --short
git add project/coding-paths/CP-EXAMPLE-001/
git add project/coding-paths/ACTIVE.md
git commit -m "Register CP-EXAMPLE-001 before branching"
git rev-parse HEAD^
```

The printed parent must equal `base_commit`. No product implementation belongs
in this commit. Push it to the trunk directly:

```bash
git push origin HEAD:main
```

## Create and publish the path

```bash
git fetch origin main
git worktree add ../repo-cp-example-001 -b path/cp-example-001 origin/main
cd ../repo-cp-example-001
git push -u origin path/cp-example-001
git status --short --branch
```

Assign one writer to this writable worktree.

## Repair: a branch created before registration

Do not delete the branch. Find its real branch point and register
retroactively in a `repair` unit, with `base_commit` at that point:

```bash
git merge-base origin/main path/cp-example-001
```

The full procedure is in [repair](https://github.com/sinlalune/cairn/blob/bff7e2af18c17a909e67eec4a8e69c1f5855cfe7/spec/reference/repair.md).
