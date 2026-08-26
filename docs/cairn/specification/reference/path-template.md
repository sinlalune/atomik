---
type: Cairn Reference
title: Coding-path template
description: A complete Cairn path record with identity, plan, work ledger, handoff state, and exact-candidate closure fields.
tags: [cairn, reference, template, coding-path, ledger]
timestamp: 2026-08-25T00:00:00Z
---

# Coding-path template

For the installed reference binding, copy this file to
`atomik-project/coding-paths/CP-<ID>.md`. Keep the path id, filename, and branch
mechanically related. A portable implementation substitutes its configured
execution-state root.

````md
---
type: Cairn Coding Path
title: Short outcome-oriented title
description: One sentence stating the bounded result.
tags: [coding-path]
timestamp: YYYY-MM-DDT00:00:00Z
cairn:
  id: CP-EXAMPLE-001
  status: draft
  current_step: S01
  base_commit: null
  branch: path/cp-example-001
  assigned_writer: null
  subject_commit: null
  resolution: null
  writes:
    - apps/example/**
    - docs/modules/example.md
    - atomik-project/coding-paths/CP-EXAMPLE-001.md
    - atomik-project/briefs/cp-example-001-handoff.md
---

# CP-EXAMPLE-001 — Short title

## Goal

State the observable result, not the activity.

## Definition of done

- [ ] Product behaviour is implemented and covered by relevant tests.
- [ ] Affected architecture, decisions, module notes, and learning documents
      are current.
- [ ] Every completed step has one coherent ledger entry, refreshed handoff,
      commit, and remote checkpoint.
- [ ] The final implementation candidate is rebased, checked, audited, and
      accepted by exact full hash.
- [ ] The path reaches ready without implementation changes after acceptance.
- [ ] The exact integration candidate lands, the trunk records done, the remote
      result is proved, and the clean secondary worktree is removed safely.

## Documentation coverage

### Required

- `docs/bedrock/example.md` — why this document governs the work

### Conditional

- `docs/bedrock/security.md` — read before changing a trust boundary

### Deliberately excluded

- `docs/bedrock/unrelated.md` — outside this path's bounded outcome

## Execution

- [ ] S01 — first coherent, independently verifiable result
- [ ] S02 — second coherent result
- [ ] S03 — hardening and closure preparation

## Work ledger

### S01 — title

#### Intent

What this step set out to establish.

#### Work

- implementation changed
- tests added or changed
- documents changed
- decisions, discoveries, reversals, and scope widening

#### Verification

```text
cairn-check : not run | pass | fail/inconclusive with reason
typecheck   : not run | pass | fail with reason
tests       : not run | pass | fail with reason
build       : not run | pass | fail with reason
user review : not required | awaiting pass | passed by <identity>
remote      : not pushed | origin/path/cp-example-001 @ <full commit>
```

#### Checkpoint

```text
status      : running
current step: S01 complete only after required review and remote proof
changed     : exact surfaces or concise groups
session     : safe boundary only after successful push
next action : S02 — exact first action
blockers    : none | named condition and responsible participant
```

## Current checkpoint

```text
base commit : <trunk tip immediately before registration>
branch      : path/cp-example-001
writer      : <current assigned participant>
remote      : origin/path/cp-example-001 @ <last completed checkpoint>
gates       : exact latest verdicts
session     : safe boundary or uncommitted review candidate
next action : exact next action
blockers    : none | named condition and unblock condition
cleanup plan: after remote integration proof, remove the exact clean secondary
              worktree without force
```

## Blockers

- None.
````

## State-specific edits

### Registering

- record an accepted opening session;
- set `status: running`;
- set `base_commit` to the current trunk tip before registration;
- set `assigned_writer`;
- regenerate `ACTIVE.md`;
- land one metadata-only registration commit whose parent equals
  `base_commit`;
- only then create and push the path branch.

### Blocking

Set `status: blocked`, retain `branch` and `base_commit`, and name the blocker,
unblock condition, writer assignment, and last remote checkpoint.

### Returning to running

Set `status: running` when execution resumes or when a ready candidate becomes
invalid. Record why the transition occurred.

### Becoming ready

After exact candidate `C` has passed its checks, audit, and acceptance, create
one administrative commit that:

- sets `status: ready`;
- sets `subject_commit` to the full hash of `C`;
- contains only the path record, handoff, exact audit, and exact closing record.

### Recording done

Only the trunk integration unit sets `status: done` and
`resolution: completed`. A path branch never claims done.

### Archiving

Set `status: archived` and exactly one resolution:

- `completed` after done;
- `abandoned` for stopped, unintegrated work;
- `superseded` for work replaced by another path or decision.

Keep the path record.

Return to [the path model](../index.md#put-one-bounded-change-on-a-coding-path)
or [lifecycle](../concepts/lifecycle.md).
