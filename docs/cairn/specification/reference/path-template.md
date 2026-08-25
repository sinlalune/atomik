---
type: Cairn Reference
title: 'Reference: Coding-path template'
description: A complete canonical Markdown template for a Cairn coding path, including coverage, execution steps, ledger, remote checkpoint, and cleanup plan.
tags: [cairn, reference, template, coding-path, ledger]
timestamp: 2026-08-25T00:00:00Z
---

# Coding-path template

Copy this file to `project/coding-paths/CP-<ID>.md`. Comments below explain the
fields; a repository may remove comments after filling the template.

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
  writes:
    - src/example/**
    - docs/modules/example.md
    - project/coding-paths/CP-EXAMPLE-001.md
    - project/briefs/cp-example-001-handoff.md
---

# CP-EXAMPLE-001 — Short title

## Goal

State the observable result, not the activity.

## Definition of done

- [ ] Product behaviour is implemented and covered by relevant tests.
- [ ] Affected architecture, decision, module, and learning documents are current.
- [ ] Every executed step has a ledger entry, refreshed handoff brief, commit,
      and immediate remote push.
- [ ] Closing record, rebase, gates, coherence audit, self-merge, remote proof,
      and safe worktree cleanup are complete.

## Documentation coverage

### Required

- `docs/architecture/example.md` — why this document governs the work

### Conditional

- `docs/architecture/security.md` — read before changing a trust boundary

### Deliberately excluded

- `docs/architecture/unrelated.md` — outside this path's bounded outcome

## Execution

- [ ] S01 — first coherent, independently verifiable result
- [ ] S02 — second coherent result
- [ ] S03 — hardening, documentation, and closure preparation

## Work ledger

### S01 — title

#### Intent

What this step set out to establish.

#### Work

- code changed
- tests added or changed
- documents changed
- decisions, discoveries, reversals, and scope widening

#### Verification

```text
cairn-check : not run | pass | fail with reason
typecheck   : not run | pass | fail with reason
tests       : not run | pass | fail with reason
build       : not run | pass | fail with reason
remote      : not pushed | origin/path/cp-example-001 @ <commit>
```

#### Checkpoint

```text
status      : running
current step: S01 complete
changed     : exact surfaces or concise groups
session     : safe boundary only after successful push
next action : S02 — exact first action
blockers    : none | named condition and owner
```

## Current checkpoint

```text
base commit : <trunk tip immediately before registration>
branch      : path/cp-example-001
remote      : origin/path/cp-example-001 @ <last completed-step commit>
gates       : exact latest verdicts
session     : safe boundary; next session starts at next action
next action : exact next action
blockers    : none | named condition
cleanup plan: after remote merge proof, remove the exact clean secondary
              worktree without force; retain the path branch
```

## Blockers

- None.
````

## Status-specific edits

### Activating

Before the registration commit:

- change `status` to `running`;
- set `base_commit` to the current trunk tip;
- confirm the final branch name;
- add the opening record and regenerate `ACTIVE.md`.

### Blocking

Set `status: blocked`, name the blocking condition, name what would unblock it,
and keep the last verified remote checkpoint.

### Completing

After the closing record, rebase, gates, and audit are ready, set `status: done`
in the merge unit. The status asserts that the result lands on the trunk.

### Abandoning or archiving

Set `status: archived` and record whether the path was completed-and-demoted or
abandoned. An abandoned path does not pass through `done`.

Return to [The coding path](../index.md#3-the-coding-path).
