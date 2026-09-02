---
type: Atomik Session Record
title: CP-WORKTREE-CLEANUP closing ceremony — retire the checkout, retain the history
timestamp: 2026-08-24T00:00:00Z
tags: [closing-ceremony, worktree, cleanup, self-merge, git]
branch: path/cp-worktree-cleanup
path: CP-WORKTREE-CLEANUP
ceremony: closing
---

# CP-WORKTREE-CLEANUP closing ceremony

Run with the owner on 2026-08-24 under the existing portfolio verdict *"ok for
all go for closure"*. During that closure the owner supplied the missing final
transition directly:

> "Ah I forgot to add the removal of worktree folder after merge in the
> protocol fine tuning"

The owner had already chosen direct completion for temporary worktrees — *"its
better if we close here directly cause its in tmp directory not clean"*. This
corrective path therefore closes in `/tmp/4tom1k-cp-worktree-cleanup` and uses
itself as the first full proof of the amended rule. No additional owner recap
or design choice is pending.

## Recall, from the repository

S01 made the closure order explicit across every authoritative and projected
surface:

```text
merge + push trunk
  -> verify the exact merge commit on origin/master
  -> from another checkout, resolve the exact registered secondary worktree
  -> require an empty Git status
  -> git worktree remove <exact-path> without --force
  -> verify registration and directory are gone
  -> retain local and remote path branches as the online step history
```

AGENTS and `paths.md` carry the operating rule. Bedrock 22/24/35 carry the
bootstrap, template, and lifecycle doctrine. ADR-012 records decision 9 and
the machine-local enforcement limit. The learning note and Cairn guide explain
why fresh sessions reuse a running worktree while a merged path retires it.
D08 and generated D14 draw the new final transition.

## What survived challenge

- Cleanup is after remote verification, never merely after a local merge.
- The exact target must be a registered secondary worktree for the merged path.
- Cleanliness is proved before removal and `--force` is forbidden.
- The main/owner worktree and dirty worktrees are never targets.
- Folder removal is not branch deletion; both branches remain unless the owner
  makes a separate deletion decision.
- CI cannot observe a developer's filesystem after merge, so Cairn must not
  claim a false blocking guarantee. Live Git checks and the closure report are
  the evidence.
- A failed cleanup leaves the directory intact and is reported separately from
  the already-successful merge.

## Roadmap

No roadmap amendment. This is a labelled process correction and changes no
product milestone or the CP-MVP-011 → CP-MVP-012 dependency.

## Verdict

Accepted. Close and merge this corrective path, verify its merge on
`origin/master`, then remove `/tmp/4tom1k-cp-worktree-cleanup` without force
from the clean owner worktree. Retain `path/cp-worktree-cleanup` locally and on
the remote. No additional owner decision is pending.
