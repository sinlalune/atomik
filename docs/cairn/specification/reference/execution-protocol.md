---
type: Cairn Reference
title: Portable coding-session execution protocol
description: The ordered required-reading procedure for entering, advancing, handing off, resuming, and closing one Cairn coding path without relying on conversation memory.
tags: [cairn, reference, portable, execution, session, handoff]
timestamp: 2026-09-01T00:00:00Z
cairn:
  classification: portable
---

# Portable coding-session execution protocol

This is the required execution route projected from the
[canonical specification](../index.md). It adds no requirements: exact command
forms live in [operations](./operations.md), schemas live in the other reference
pages, and explanatory terms live in the [concept wiki](../concepts/index.md).

The page is **PORTABLE**. It uses protocol role names and contains no application
name, host path, product command, runtime variable or product-specific security
rule. A repository's root bootloader pairs it with one named host binding.

## Enter or resume one path

1. Read the repository bootloader, then the portable path convention and host
   binding it names.
2. Open the generated [live view](../concepts/live-view.md) and follow it to the
   path assigned to this writable worktree. Several paths may be running; write
   exactly one.
3. Verify repository reality against durable state: branch, upstream, working
   tree, trunk base, checkpoint refs and last recorded gate verdict. Reconcile a
   mismatch in the path record before implementation.
4. Read every document under the path's **Required** coverage. Note each
   **Conditional** trigger and read it when it fires. Respect every
   **Deliberately excluded** entry; record any widening.
5. Read the path index and handoff brief. Read the forward plan only when
   planning, and open earlier step records only when their index summaries make
   them relevant.
6. Start the persisted next action. Conversation memory is never stronger than
   the branch, path record, brief and repository state.

## Advance exactly one work unit

A work unit is coherent only when all of its required surfaces move together:

- implementation or protocol artefact;
- adversarial and ordinary tests;
- affected durable documentation;
- one self-contained path step with its `cairn-unit` block;
- the path's live header and refreshed handoff brief.

Execute one step at a time. A step file is written where it will live and must be
readable by itself. Progress, corrections, rejected approaches, widening,
verification and the next action persist in files before the unit is called
complete.

Run relevant gates directly so their exit codes remain visible. Review the
working tree, stage explicit paths, commit the coherent unit, push it immediately
to its owning branch, and publish its append-only checkpoint-retention ref. A
unit whose push or retention fails is implemented locally, not complete.

When incomplete work is valuable enough to preserve, publish a marked
[provisional commit](../concepts/provisional-commit.md). Do not call it a
checkpoint or hand it off as the next completed unit. Fold every provisional
commit before candidate acceptance.

## Preserve one-writer safety

One writable worktree has one assigned writer. Other participants may inspect,
diagnose and review it. Never overwrite, delete or absorb an unexpected dirty or
untracked file merely because it is outside the current plan; first determine
whether it belongs to another participant.

Before every commit:

```text
review status
separate the coherent work unit
stage explicit paths
verify the staged diff
```

Do not blind-add a live repository. Do not use a gate-output pipeline whose last
process hides the gate's exit code.

An externally reported experiment is evidence, not anecdote. Pin the exact
artifact, version and configuration before comparing the repository against it.

## Complete the session boundary

Every completed, pushed and retained work unit is a safe chat boundary. Refresh
the [handoff brief](../concepts/handoff.md) in that same unit, then report:

- the outcome rather than an activity list;
- the exact remote commit and retention ref;
- the gate verdict, including known advisories;
- the persisted next action and blockers;
- whether the next step should run here or in a fresh session.

A fresh session reuses the worktree while the path remains running. It follows
the entry route above and starts from durable next action without asking a
participant to reconstruct the previous conversation.

## Open and close around implementation

Implementation starts only after recorded
[opening acceptance](../concepts/opening-acceptance.md) and
[trunk registration](../concepts/trunk-registration.md). The accepted path
declaration and live view reach the trunk before the implementation branch
diverges. The registration unit contains no implementation.

Closure binds one exact [implementation candidate](../concepts/implementation-candidate.md):

1. fetch the trunk and retention namespace;
2. retain all completed checkpoints;
3. rebase and fold provisional work;
4. run the complete gates on candidate `C`;
5. record the [coherence audit](../concepts/coherence-audit.md) for `C`;
6. obtain [closing acceptance](../concepts/closing-acceptance.md) for `C`;
7. add only [administrative closure](../concepts/administrative-closure.md);
8. check [acceptance drift](../concepts/acceptance-drift.md);
9. integrate the accepted tree and verify the exact remote trunk commit;
10. from another checkout, remove only the exact clean secondary worktree,
    without force, while retaining the path branch.

If implementation changes after acceptance, stop and produce a new candidate.
If integration succeeds but local cleanup does not, report those outcomes
separately and leave the checkout intact.

## Host boundary

Application architecture, credentials, provider policy, UI rules, local
directory names, dependency sharing, runtime isolation and product hot files are
host concerns. They belong in the named binding or in documents selected by the
path's coverage. They do not enter this portable page.
