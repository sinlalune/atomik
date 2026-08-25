---
type: Cairn Foundation
title: 'Foundation: Parallel work by structure'
description: Why concurrency starts with filesystem ownership, how worktrees isolate writers, why shared summaries drift, and how generated views and names remove coordination points.
tags: [cairn, foundation, concurrency, worktree, generated-view, ownership]
timestamp: 2026-08-25T00:00:00Z
---

# Parallel work by structure

## Branch isolation is not filesystem isolation

Two branches can hold independent committed histories. If two writers still
edit the same checked-out directory, however, they share uncommitted files, the
Git index, build outputs, caches, and often a running application's data.

The safe boundary is therefore:

```text
one branch + one worktree + one writer
```

Other participants may read the worktree. A second writer needs another
worktree.

## Runtime isolation

Separate folders do not automatically isolate running processes. Two instances
can still share:

- a TCP port;
- a browser or desktop profile;
- a local database;
- a cache directory;
- a socket or lock file.

A parallel-work protocol must give each active worktree a runtime identity when
the application uses any of those resources.

## Shared mutable files

Suppose every path edits one `STATUS.md`. Even when Git combines separate lines
without a conflict, the resulting summary may contradict itself because each
writer read a different starting state.

Cairn uses two structural remedies.

### Generate the aggregate

Each path owns its declaration. A deterministic tool reads the registered
declarations and generates `ACTIVE.md`. Writers change their own sources and
regenerate; they never repair the overview directly.

### Partition the namespace

Instead of every path appending to one journal, each merge creates a uniquely
named file:

```text
project/log/2026-01-18-cp-search.md
project/log/2026-01-18-cp-indexing.md
```

The same approach gives audits, session records, briefs, and rolled ledger steps
names that include their owning path.

## Global visibility before divergence

A checkout can read only the files present in its current branch. If a path
declaration first appears on that path's private branch, the trunk and sibling
paths cannot discover it by scanning their own files.

Cairn therefore registers the stable identity tuple on the trunk before creating
the implementation branch. The path's evolving ledger then belongs to its own
branch, while the common ancestor already knows the path exists.

This is a general rule about distributed state:

```text
publish the identity in the shared namespace
before private histories diverge
```

## Parallel work, ordered integration

Paths may execute simultaneously. Merging cannot be fully simultaneous because
the second result must account for the first. The rebase gate creates a small
serial boundary:

1. one path integrates;
2. the next path rebases on the new trunk;
3. it reruns its checks;
4. it integrates.

The protocol serialises seconds of integration rather than days of work.

## Signals instead of locks

Declared write surfaces help predict overlap, but the real set of files often
becomes known only during diagnosis. A lock would punish discovery. Cairn reports
unexpected surfaces, requires them to be recorded, and lets the path continue.

Return to [Parallel paths](../index.md#7-parallel-paths).
