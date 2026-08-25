---
type: Cairn Foundation
title: 'Foundation: Durable project state'
description: Why project knowledge and execution state live in inspectable files, how canonical and generated files differ, and why persistence is not proof of truth.
tags: [cairn, foundation, durable-state, canonical, generated, ledger]
timestamp: 2026-08-25T00:00:00Z
---

# Durable project state

## A project is larger than its source code

Source code answers what the machine currently does. It does not necessarily
answer why a choice was made, which alternatives were rejected, what work is in
progress, or what a partially completed task should do next.

When those answers exist only in a conversation or one person's memory, they
disappear independently of the code. Cairn calls that **ephemeral context**.

## Three planes

Cairn separates three roles:

```text
knowledge plane         architecture, decisions, module notes
execution-state plane   coding paths, ledgers, sessions, audits, briefs
ephemeral context       one conversation or running process
```

The first two live in version-controlled files. The third is useful as a working
buffer but cannot be the only home of a decision or checkpoint.

## Canonical, generated, and disposable

Not every durable file has the same authority.

**Canonical file.** A person deliberately edits it when the represented decision
or state changes. An ADR or coding-path ledger is canonical for its own subject.

**Generated view.** A tool derives it from canonical inputs. A running-path list
is a view over path declarations. Editing the view instead of its inputs creates
a second source of truth.

**Disposable projection.** A convenient summary that can be regenerated. A
handoff brief is useful for quick re-entry, but the path ledger remains primary.

The rule is simple:

```text
change the source → regenerate the view
never repair a derived view by hand while leaving its source wrong
```

## Durable does not mean true

Version control proves that a statement was recorded in a specific snapshot. It
does not prove the statement is correct. Tests, evidence, review, and later
corrections still matter.

This distinction prevents two common overclaims:

- a path file changing does not prove its checkpoint prose became accurate;
- an audit file existing does not prove its conclusion is wise.

Cairn checks the strongest mechanical fact available and names the remaining
judgement explicitly.

## Ledger and event log

A **ledger** records the evolving state of one bounded task: completed steps,
evidence, decisions, next action, and blockers. It is append-oriented because
reconstructing the path later would lose the decisions that were reversed or
the attempts that failed.

An **event log** records integrated outcomes. Under parallel work, one file per
event avoids multiple paths appending to one shared file.

## Progressive disclosure

Durable state only helps if a newcomer can navigate it. A small entry file points
to progressively deeper material:

```text
AGENTS.md
  → project/index.md
  → running path list
  → one path ledger
  → only the governing documents that path names
```

The aim is not to load everything. It is to make every omission visible and
every deeper source reachable.

Return to [The project model](../index.md#2-the-project-model).
