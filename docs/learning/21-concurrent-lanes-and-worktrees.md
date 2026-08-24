---
type: Atomik Learning Note
title: 'Learning: running several agents at once — worktrees, registration, and the state you forget is shared'
description: Beginner-first walkthrough of CP-OPS-001 — runtime isolation, one writer per tree, why a generated view cannot see sibling branches, and the small trunk registration that makes parallel work globally visible.
tags: [learning]
timestamp: 2026-08-14T00:00:00Z
---

# Learning: running several agents at once — worktrees, registration, and the state you forget is shared

*Covers CP-OPS-001 S01–S09 (2026-08-14–24). First-use rule (17): this is the
first time the project runs several coding paths and desktop instances at once.
It now includes what the pilot taught after the initial design landed.*

## Who this is for and what you can do afterwards

You have a repository with a disciplined single-track workflow and want several
agents working in it at once. Afterwards you will know the four questions that
matter: who writes which files, which runtime resources are shared, where each
merge happens, and whether the global status view can actually see every path.

## A worktree is cheap; what it isolates is not obvious

```bash
git worktree add ../repo-path-b -b path/b master
```

That gives you a second checkout sharing one `.git`. Two agents can now edit
without touching each other's files. It does NOT give you:

- **`node_modules`** — a worktree starts empty. Symlink it or install it.
- **A fresh base** — branch from local `master`, not a stale remote-tracking
  ref, when local trunk is ahead.
- **Isolated runtime state** — and this is where the first real bug lived.
- **A global branch view** — one checkout cannot read files added only on a
  sibling branch.

## The state you forget is shared

Atomik's project-relative state was already safe by a useful accident:
`resolveStateDir` puts `.atomik/` beside the checkout, so each worktree gets its
own workspace layout, settings, index and traces.

State stored relative to the USER is different. Electron keeps a `userData`
profile keyed on the application name — cookies, `localStorage`, network and
GPU caches, web-view partitions. Two checkouts and two processes would still
share one profile. The failure is not necessarily a crash; it can be two apps
quietly corrupting caches or sharing logins.

```ts
// electron-main/lane.ts — claimed at module scope, before app ready
const lane = resolveLaneRuntime(process.env, app.getPath('userData'))
if (lane.userDataDir) app.setPath('userData', lane.userDataDir)
```

Before running two copies of anything, list every resource keyed on the machine
or user rather than the directory: profiles, fixed ports, single-instance
locks, notification identifiers, and configuration directories.

## Prose conflicts more than code

The audit expected merge pain in source files. Instead, the protocol forced
every path to update one 1,689-line module note. Different features rarely edit
the same function; every feature edited the same prose file.

The structural repair was one module note per area plus a root index. The same
move removed the append-only journal hotspot:

```text
path-owned        evolving ledger, code, tests, area note, journal entry
generated         ACTIVE.md, from path declarations already on the trunk
historical map    roadmap register; not the live running-state authority
```

The journal became one file per merged path under `atomik-project/log/`.
Pre-merge progress stays in the path ledger.

## The subtler failure: correct projection, incomplete inputs

The first `cairn-active` implementation was deterministic and tested. It read
every `CP-*.md` in the current checkout, selected `status: running`, sorted the
rows, and regenerated `ACTIVE.md`. Cairn proved the output matched those files.

It still lied about the repository.

On 2026-08-20 trunk said no path was running while four clean worktrees each
carried a running path. Their path files had been created on their own branches,
so they were not ancestors of trunk or one another:

```text
trunk                 sees paths merged before the split
path/A                sees trunk + CP-A
path/B                sees trunk + CP-B
no ordinary checkout sees CP-A + CP-B until both merge
```

This is why more guidance is insufficient. The generator had no missing-file
bug; the input genuinely did not exist in its tree. The repair changes the
ordering:

```text
opening accepted
  -> registration-only trunk commit (CP-X.md + generated ACTIVE, no code)
  -> branch/worktree FROM that commit
  -> implementation begins
```

The registration serializes a few seconds of metadata, just as the rebase gate
serializes a few seconds of merge. Work remains parallel. A Cairn blocking rule
checks that each new path branch has a matching `running` declaration on trunk.
Only CP-OPS-001, CP-MVP-011 and CP-MVP-012 are grandfathered because they were
already running when the defect was observed.

## A path is not a context window

A path is the durable unit of work; a chat is only the execution buffer for one
part of it. Letting a chat accumulate five finished steps makes the next
context window expensive for no architectural benefit.

The useful boundary already exists: the end of a coherent step.

```text
finish one step
  -> code + tests + docs + ledger + handoff brief
  -> gates bare
  -> commit
  -> push immediately
  -> agent offers: continue here OR next step in a fresh session
```

Choosing fresh does not close the path. The next session opens in the same
worktree, derives the path from the branch, verifies Git against the Work
Ledger, reads `briefs/<path-id>-handoff.md`, and starts the recorded next
action. The owner does not have to paste a transcript or explain what happened.

The push is part of completion for two different reasons. First, another
machine can recover the exact finished step. Second, GitHub Activity records a
push event separately from commit metadata; the normal commit timestamp remains
the commit's own timestamp. Treat Activity as a useful online timeline, not a
permanent audit archive. Cairn can warn when local HEAD is ahead of the upstream;
it cannot prove later that three commits were pushed one-by-one rather than in
a batch.

A final rebase changes the hashes of commits already published on the path
branch. Record the old and new heads, then use `--force-with-lease`: the lease
refuses to overwrite remote work you have not seen, while blind `--force` does
not. The final merge records the rebased history; GitHub Activity records the
push and force-push events.

## What we deliberately did not build

No scheduler, lock service, daemon, branch-discovery API, or database. The
system remains Markdown + Git + a dependency-free validator. The validator was
added only after the workflow audit found mechanically checkable failures; the
registration rule was added only after real parallel work demonstrated that
derivation alone was insufficient.

Declared write surfaces remain **advisory**. They signal overlap but never lock
files: a root cause is discovered, not declared.

## Checklist before you allow another writer

1. Which files does the protocol force every writer to touch? Split them.
2. Which runtime state is keyed on the user rather than the directory?
   Namespace it.
3. Is the accepted path registered on trunk before its branch diverges?
4. Can the global view be reproduced from trunk files alone?
5. Does each path own its merge after ceremony, rebase, gates, and audit?
6. Is every local commit already present on the path's upstream branch?
7. Could the next session resume from the ledger and handoff brief without an
   owner recap?
8. What is the smallest mechanism real evidence justifies?
