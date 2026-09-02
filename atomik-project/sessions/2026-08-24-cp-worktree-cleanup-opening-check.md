---
type: Atomik Session Record
title: CP-WORKTREE-CLEANUP opening check — remove the checkout, retain the history
timestamp: 2026-08-24T00:00:00Z
tags: [opening-check, worktree, cleanup, self-merge, git]
path: CP-WORKTREE-CLEANUP
branch: path/cp-worktree-cleanup
---

# CP-WORKTREE-CLEANUP opening check

Opened from the owner's correction during CP-OPS-001 closure:

> "Ah I forgot to add the removal of worktree folder after merge in the
> protocol fine tuning"

## Feature check

The requested feature is one terminal operation, interpreted narrowly from the
words *folder* and *after merge*:

```text
self-merge commit pushed
  -> verify local master == origin/master at that merge
  -> verify the exact secondary worktree is Git-clean
  -> git worktree remove <exact-path>        # never --force
  -> verify the directory and worktree registration are gone
  -> keep local/remote path branches unless separately asked to delete them
```

The alternatives are rejected by the owner's wording and the standing online-
log ruling: removing before remote verification loses the easiest recovery
checkout too early; deleting the branch is not folder cleanup; forcing a dirty
worktree removal can destroy unpushed owner or agent state.

If removal fails, report cleanup incomplete and leave the directory available
for inspection. The already-verified merge remains integrated; the report must
not pretend the filesystem cleanup succeeded.

## Scope and acceptance

No product code, hook, daemon, scheduler or remote-branch retention policy.
This is operating doctrine plus its diagrams/templates. The direct owner
instruction is explicit acceptance of this bounded corrective path. It will
dogfood the rule on its own temporary worktree after merge.
