---
type: Cairn Foundation
title: 'Foundation: Git and project history'
description: A from-zero explanation of repositories, commits, branches, remotes, merge, rebase, conflicts, and worktrees, with the exact Cairn concepts each enables.
tags: [cairn, foundation, git, commit, branch, rebase, worktree]
timestamp: 2026-08-25T00:00:00Z
---

# Git and project history

## Repository

A **repository** is a project folder plus a history database managed by Git.
Ordinary files are the visible project. The hidden `.git/` directory stores
snapshots, names for lines of work, and the links between snapshots.

Git tracks the project as a whole. It can therefore reconstruct the state of all
tracked files at an earlier point, not only an earlier copy of one file.

## Commit

A **commit** is a saved snapshot of every tracked file at one moment. It also
stores metadata, a message, and one or more links to earlier commits.

```text
a1b2c3d ──► d4e5f6a ──► 7a8b9c0
  setup        parse         display
```

The short strings are commit identifiers. Git computes each identifier from the
commit's content and metadata, including the identifier of its parent. A commit
therefore identifies both a snapshot and the history leading to it.

A commit message records the intent of the snapshot. The diff can show what
changed; the message often carries the only durable explanation of why.

## Branch, trunk, and `HEAD`

A **branch** is a movable name pointing to one commit. When a new commit is made
on that branch, the name moves to the new commit.

```text
                     ┌──► f1a2b3c ──► c4d5e6f   path/cp-search
a1b2c3d ──► d4e5f6a ─┤
                     └──► 9a8b7c6                main
```

The shared main branch is called the **trunk**. Its common names are `main` and
`master`; Cairn uses the repository's configured name.

`HEAD` means the commit or branch currently checked out. A **detached HEAD**
points directly at a commit instead of through a branch name. This is useful for
inspection, but a branch-aware checker must recover the intended branch from its
environment or report that it cannot identify the subject.

## Remote, push, and fetch

A repository begins on one machine. A **remote** is another copy reachable over
a network. `origin` is the conventional name for the primary remote.

- `git push` sends local commits to a remote.
- `git fetch` downloads remote refs and commits without changing local files.
- `git pull` fetches and then integrates.

A commit is durable against editing, but it still lives on the current machine.
A push creates the remote recovery point Cairn requires for a completed step.

## Merge and conflict

A **merge** combines two lines of history. Git compares both sides with their
common ancestor. Changes to different regions can combine automatically. When
both sides changed the same region, Git stops with a **conflict** and asks a
person to choose the correct result.

A conflict is protection against a silent guess. Resolving it means editing the
combined files, running the relevant checks, and committing the chosen result.

## Rebase

A **rebase** takes commits from one branch and replays their changes on top of a
newer base:

```text
before                          after
      A ── B  path                   A' ── B'  path
     /                              /
T0 ───── T1  main             T0 ── T1       main
```

The replayed commits receive new identifiers because their parents changed. A
rebase is safe for a line of work with one writer. If the old commits were
already pushed, the updated branch must use `--force-with-lease`, which refuses
to overwrite unexpected remote work.

Cairn uses rebase as an integration gate: before self-merge, the path's `HEAD`
must contain the current trunk tip.

## Worktree

Ordinarily one repository has one checked-out working directory. Git can create
additional **worktrees**, each attached to another branch while sharing the same
history database:

```bash
git worktree add ../repo-cp-search -b path/cp-search main
```

This is stronger than merely asking two writers to be careful. Each writer gets
a different filesystem, current branch, index, and set of uncommitted changes.
Applications may still need separate ports, profiles, databases, or caches.

## The Git facts Cairn checks

Cairn needs only a small set of Git operations:

- resolve a branch or trunk name to a commit;
- ask whether one commit is an ancestor of another;
- compare the path branch with the trunk;
- read a registered file as it exists on the trunk;
- determine whether local `HEAD` exists on the upstream branch.

Return to [The big picture](../index.md#1-the-big-picture) or continue with
[Parallel work](./parallel-work.md).
