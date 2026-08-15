---
type: Atomik Learning Note
title: 'Learning: running several agents at once — worktrees, one writer per tree, and the state you forget is shared'
description: Beginner-first walkthrough of CP-OPS-001 step zero — why a Git worktree is not enough to run the same desktop app twice, which state is already isolated by accident and which is silently shared, and why the prose you write about the code conflicts more often than the code itself.
tags: [learning]
timestamp: 2026-08-14T00:00:00Z
---

# Learning: running several agents at once — worktrees, one writer per tree, and the state you forget is shared

*Covers CP-OPS-001 S01–S03 (2026-08-14). First-use rule (17): this is the
first time the project runs more than one execution lane at a time, and
the first time two instances of the desktop app are expected to be alive
together. Written before the pilot, from the audit that preceded it.*

## Who this is for and what you can do afterwards

You have a repository with a disciplined single-track workflow and you
want two or three agents working in it at once. Afterwards you will know
the three questions to ask before you allow that — who writes which
files, which runtime resources are shared, and where the merge actually
happens — and why the answers are usually not the ones you expect.

## A worktree is cheap; what it isolates is not obvious

```bash
git worktree add ../repo-lane-b -b lane/b master
```

That gives you a second checkout sharing one `.git`. Two agents can now
edit without touching each other's files. It does NOT give you:

- **`node_modules`** — a worktree starts empty. Symlink it or install it.
- **A fresh base** — `git worktree add` from a remote branch gives you
  whatever the remote last saw. Branch from your LOCAL `master` when the
  local branch is ahead, which it usually is while you are working.
- **Isolated runtime state** — and this is where the real bug lives.

## The state you forget is shared

Atomik's own state was already safe, by an accident of design worth
copying: `resolveStateDir` puts `.atomik/` **beside the checkout**, so a
worktree gets its own workspace layout, settings, index and traces for
free. State stored relative to the project isolates itself.

State stored relative to the USER does not. Electron keeps a `userData`
profile keyed on the application name — cookies, `localStorage`, the
network and GPU caches, the web-view partition. Two checkouts, two
branches, two processes… one profile directory. The failure is not a
crash; it is two apps quietly corrupting each other's caches and sharing
one cookie jar, which for an app with a web-source tab means one lane's
logins leak into the other's.

```ts
// electron-main/lane.ts — claimed at module scope, before app ready
const lane = resolveLaneRuntime(process.env, app.getPath('userData'))
if (lane.userDataDir) app.setPath('userData', lane.userDataDir)
```

The general rule: before running two copies of anything, list every
resource keyed on *the machine or the user* rather than *the directory*.
For a desktop app that is typically the profile directory, fixed TCP
ports, OS-level single-instance locks, notification identifiers, and
anything under `~/.config`. Ports were the easy half here — the capture
server already fell back to an ephemeral port when its preferred one was
busy, so a lane just asks for the ephemeral one directly instead of
racing and losing first.

## The unglamorous finding: prose conflicts more than code

The audit expected the merge pain to be in the source. It was not. Two
lanes adding different features rarely touch the same function. But this
project's protocol obliges every executed step to update the module note
in the same work unit — and the module note was one 1689-line file. Every
lane, every step, same file, same end. Guaranteed conflict, and the worst
kind: prose merges cannot be resolved mechanically, because two paragraphs
that both describe "what the app owns" have no ordering that a tool can
infer.

The fix is structural, not procedural: split the shared document until
each concurrent writer has its own. Here that meant one note per area
(shell, vault, AI, editor, sources, graph) plus a root note holding the
cross-cutting contracts, with a rule about who writes which:

```text
lane-owned        its ledger, its code, its tests, its area note
integrator-owned  ACTIVE.md, the register, log.md, the root module note
```

Append-only files deserve the same suspicion. A project log where every
step appends one entry at the end is a merge conflict in every single
merge. Making it record *integrated* work only — with per-lane progress
living in per-lane ledgers — removes the conflict without losing
anything, because the log was already an integrated narrative.

## What we deliberately did not build

No scheduler, no lock service, no validation command, no database. The
first version is a Markdown convention plus Git, because the project's
own doctrine (bedrock 35) says structure is added only when real
multi-path work demonstrates the need — and at the time of writing, no
two lanes had ever run. The declaration a lane makes about which files
it will touch is likewise **advisory**: a signal at open and a check at
the gate, never a lock. A root cause is discovered, not declared, and a
convention that forbids what debugging requires gets ignored rather than
followed.

## Checklist before you allow a second writer

1. Which files does the protocol force EVERY writer to touch? Split them.
2. Which runtime state is keyed on the user rather than the directory?
   Namespace it.
3. Who owns the merge, and does anyone else write the coordination files?
4. What is the smallest thing you can ship and pilot before writing it
   into the constitution?
