---
type: Atomik Coding Path
title: Remove a path worktree after its merge is verified online
description: Close the last local lifecycle gap in Cairn: after a path self-merges and origin/master is verified at that merge, remove the clean secondary worktree directory without deleting the branch that carries its online history.
tags: [coding-path, process, worktree, cleanup, self-merge, git]
timestamp: 2026-08-24T00:00:00Z
atomik:
  id: CP-WORKTREE-CLEANUP
  status: running
  accepted: 2026-08-24
  current_step: S01
  base_commit: 41d661b
  branch: path/cp-worktree-cleanup
  writes:
    - AGENTS.md
    - atomik-project/coding-paths/paths.md
    - atomik-project/coding-paths/ACTIVE.md
    - atomik-project/coding-paths/index.md
    - atomik-project/coding-paths/CP-WORKTREE-CLEANUP.md
    - atomik-project/briefs/cp-worktree-cleanup-handoff.md
    - atomik-project/sessions/2026-08-24-cp-worktree-cleanup-opening-check.md
    - atomik-project/sessions/2026-08-24-cp-worktree-cleanup-closing-ceremony.md
    - atomik-project/audits/cp-worktree-cleanup-*.md
    - atomik-project/log/2026-08-24-cp-worktree-cleanup.md
    - docs/adr/ADR-012-parallel-paths-self-merge.md
    - docs/bedrock/22_22-agent-handoff.md
    - docs/bedrock/24_24-doc-templates.md
    - docs/bedrock/35_35-coding-path-execution-state.md
    - docs/cairn/workflow.html
    - docs/diagrams/D08_bootstrap_protocol.svg
    - docs/diagrams/D14_cairn_protocol_workflow.svg
    - docs/diagrams/index.md
    - docs/learning/21-concurrent-lanes-and-worktrees.md
    - tools/gen-d14-workflow.py
---

# Goal

Promote the owner's post-merge correction into the Cairn lifecycle:

> "Ah I forgot to add the removal of worktree folder after merge in the
> protocol fine tuning"

A merged path must not leave its secondary checkout behind indefinitely. The
cleanup is deliberately last: the remote trunk and path checkpoint must be
verified before the recoverable local directory is removed.

# Definition of done

- The self-merge sequence ends with remote verification, clean-worktree
  verification, and non-forced removal of the exact registered worktree.
- Cleanup never targets the main/owner worktree, never removes a dirty
  worktree, and never uses `--force` to conceal local state.
- Worktree-folder removal does not imply local or remote branch deletion; the
  pushed path branch remains the online step history unless separately ruled.
- Failure to remove is reported as cleanup incomplete, with the directory left
  intact for inspection; it does not falsify the already-pushed merge.
- AGENTS, operating detail, bedrock, ADR, template, guide, learning note and
  workflow diagrams project the same ordering.
- This path dogfoods the rule by removing its own worktree after its merge is
  present on `origin/master`.

# Documentation coverage

## Required

- `atomik-project/coding-paths/paths.md` — executable path lifecycle.
- `docs/bedrock/22_22-agent-handoff.md` — closing and session protocol.
- `docs/bedrock/24_24-doc-templates.md` — checkpoint and completion template.
- `docs/bedrock/35_35-coding-path-execution-state.md` — lifecycle/Git doctrine.
- `docs/adr/ADR-012-parallel-paths-self-merge.md` — accepted self-merge decision.
- `docs/learning/21-concurrent-lanes-and-worktrees.md` — operator-facing lesson.
- `docs/diagrams/index.md`, D08, D14 and `docs/cairn/workflow.html` — protocol
  projections whose refresh triggers fire when the lifecycle changes.

## Conditional

- `docs/bedrock/15_15-maintainability.md` — only if cleanup becomes code rather
  than a Git operation. It should not.

## Deliberately excluded

- Deleting local or remote path branches — branch retention is distinct from
  worktree-folder cleanup and preserves the requested online history.
- Removing the main worktree, any dirty worktree, or any path other than the
  exact one just merged.
- A cleanup daemon, scheduler, hook or Cairn blocking rule — repository CI
  cannot observe a developer's post-merge filesystem after the checkout ends.
- Retroactively deleting the other historical worktrees in this repository;
  this path changes the forward protocol only.

# Execution

- [ ] S01 PROJECT THE RULE — add verified, non-forced post-merge worktree
      cleanup to every authoritative/projection surface; refresh D08/D14 and
      the guide; persist the step brief and run gates.
- [ ] S02 CLOSE AND DOGFOOD — record acceptance, rebase/current-trunk proof,
      audit, journal, done state and gates; self-merge, push/verify master, then
      remove this path's own clean temporary worktree while retaining branches.

# Current checkpoint

```text
base commit : 41d661b — CP-OPS-001 merged and verified online
current step: S01 ready
owner ruling: remove the worktree folder after merge
interpretation: only after origin/master contains the merge; exact clean
                secondary worktree; no force; branch history retained
tests       : registration-only work unit; Cairn before commit
remote      : registration commit must land and be pushed on master before the
              path branch starts
next action : register this declaration on master, then execute S01
blockers    : none
```

# Blockers

None.
