---
type: Cairn Portable Convention
title: Parallel coding paths — portable operating convention
description: The required path lifecycle: register before branching, one writer per worktree, remotely resumable work units, exact-candidate closure, self-integration, and safe cleanup.
tags: [cairn, portable, paths, concurrency, worktree, self-merge]
timestamp: 2026-09-01T00:00:00Z
cairn:
  classification: portable
---

# Parallel coding paths

> **PORTABLE REQUIRED READING.** This page projects the canonical
> [Cairn specification](../../docs/cairn/specification/index.md) into the order
> used to operate one path. Repository-specific roots, commands, runtime
> isolation and examples belong in the adjacent [binding appendix](./binding.md).
> The former combined operating page is retained as
> [explanatory history](./paths-history.md), not compressed into this route.

## The model

```text
many coding paths may run at the same time
one path = one path record = one branch = one writable worktree = one writer
opening acceptance and registration happen before implementation branches
every completed work unit is committed, pushed and retained
every completed work unit is a safe session boundary
each path carries its accepted candidate through integration
the retained branch is durable; the secondary worktree is disposable
```

Registration and integration briefly serialize changes to the shared trunk.
The implementation work between them remains parallel. There is no standing
integrator or gatekeeper role.

## Name one bounded path

Use a stable `CP-<ID>` identifier and derive the branch mechanically:

```text
CP-EXAMPLE-001 -> path/cp-example-001
CP-SETTINGS    -> path/cp-settings
```

Numbered and labelled paths follow the same protocol. A path record is born as
a folder:

```text
CP-EXAMPLE-001/
  index.md      declaration, step index, live header, next action, blockers
  plan.md       forward plan, read when planning
  log.md        folder history
  steps/S01.md  one self-contained record per executed step
```

The step-index line MUST let a reader decide whether to open that step. A step
record is append-only from the blob that adds it. There is no later ledger
rollup operation.

## Open and register before branching

1. Obtain and record [opening acceptance](../../docs/cairn/specification/concepts/opening-acceptance.md)
   for the path's outcome, scope and initial writer.
2. From a clean, current trunk, create the accepted path record using the
   [path template](../../docs/cairn/specification/reference/path-template.md).
   Set `status: running`, the derived path branch, and `base_commit` to the
   exact trunk tip immediately before registration.
3. Regenerate the [live view](../../docs/cairn/specification/concepts/live-view.md)
   and run the protocol gate.
4. Land and push a metadata-only trunk unit containing the accepted path
   declaration, regenerated live view and opening record. It contains no
   implementation.
5. Create the path branch and its dedicated worktree from that registration
   commit, then publish the branch.

The repository's [binding appendix](./binding.md) supplies the exact trunk,
remote, paths and commands. The full copy-ready sequence is in
[Cairn operations](../../docs/cairn/specification/reference/operations.md#register-an-accepted-path).

## Give one writable worktree one writer

Only the assigned writer edits a writable worktree. Other participants may
read, diagnose and review it. If the writer changes, the outgoing writer first
publishes a recoverable checkpoint and the path record names the handoff.

Declare expected write surfaces, including documentation. They are overlap
signals, not locks. When the root cause widens the work, record the widening in
the current step and continue within the accepted outcome.

Worktree directory names, shared dependencies, ports, profiles, databases and
caches are host bindings. Never copy an example from one repository as though it
were portable protocol.

## Complete one work unit at a time

Follow the portable [execution protocol](../../docs/cairn/specification/reference/execution-protocol.md).
In one coherent unit:

1. change the implementation or protocol artefact;
2. change the tests that prove the result;
3. update affected durable documentation;
4. append the current step record and refresh the handoff brief;
5. run every relevant gate bare;
6. review status and stage explicit paths;
7. commit and immediately push to the path branch;
8. publish an append-only retention ref for the unit.

If the push fails, report the unit as implemented locally, not complete.
Incomplete but valuable work is published as a marked provisional commit; it is
not a completed checkpoint and is folded before candidate acceptance.

## Retain every completed checkpoint

Every `cairn-unit` ordinal is pinned under:

```text
refs/cairn/checkpoints/<lowercase-path-id>/g<NN>/<unit>
```

The current generation is derived from branch ancestry. A history rewrite
closes one generation and the first completed post-rewrite unit opens the next.
Retention refs are append-only: never move or delete an earlier pin to make it
name a rewritten copy. Fetch the namespace explicitly before judging it; an
unfetched empty listing is missing evidence, not evidence of absence.

## Treat every pushed unit as a session boundary

After a unit is pushed and retained, report its remote commit, gate verdict and
persisted next action. Proactively offer a fresh session. This ends a chat, not
the still-running path.

A resuming participant reuses the same worktree, follows the repository
bootloader to this convention, the live view, its own path index and handoff
brief, verifies repository reality, and starts the recorded next action without
requiring a conversation recap.

## Close one exact candidate

Closing follows one identity all the way through:

```text
implementation candidate C
  -> gates on C
  -> coherence audit bound to C
  -> closing acceptance bound to C
  -> administrative closure only
  -> acceptance-drift check
  -> integration of the accepted tree
```

Before producing `C`, fetch the trunk and retention namespace, retain every
completed unit, rebase on the current trunk, fold provisional commits, and rerun
all gates. If implementation changes after acceptance, produce a new candidate
and repeat audit and acceptance.

The path branch does not claim `done` for itself. The integration unit records
`done`, regenerates the live view and writes one journal file for the integrated
outcome. The exact integration commit is tested, pushed and verified on the
remote trunk.

## Remove only the verified clean secondary worktree

After remote integration verification, resolve the exact secondary worktree
from another checkout. Require its Git status to be empty, remove it without
force, and verify its registration and directory are gone. Never remove the
main/owner worktree or a dirty checkout. Worktree removal does not authorize
deleting the retained path branch.

If remote verification or cleanup cannot be proved, report the outcomes
separately: integration may be complete while cleanup remains incomplete.

## Keep shared state derived or event-sliced

Parallel work must not depend on several paths appending to one handwritten
file. Live portfolios are generated from path declarations. Independent audits,
ceremonies and journal events use one file per event. Mutable indexes and folder
logs summarize; they are not event records.

The protocol gate may block only an objectively checkable condition whose
breach leaves the repository wrong. Judgement and overlap signals remain
advisory. Local and CI invocations over the same tree must reach the same
verdict.

## Binding boundary

This file contains no application names, local directory names, product hot
files or runtime environment variables. The repository bootloader pairs it with
exactly one [host binding](./binding.md). If the portable convention and its
binding disagree, report the defect; do not silently choose one.
