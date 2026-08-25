---
type: Cairn Foundation Index
title: Foundations used by the Cairn specification
description: Progressive explanations of the software concepts Cairn uses, written for readers who are meeting them for the first time.
tags: [cairn, foundations, index, onboarding]
timestamp: 2026-08-25T00:00:00Z
---

# Foundations

The [canonical specification](../index.md) defines Cairn top down. These notes
expand prerequisite ideas at the point where the specification first uses them.
They are explanatory: requirements live in the specification.

## Read only what you need

- [Git and project history](./git-and-history.md) — repository, commit, hash,
  branch, trunk, `HEAD`, remote, merge, conflict, rebase, and worktree.
- [Durable state](./durable-state.md) — canonical files, generated views,
  ephemeral context, ledgers, and why persistence is not the same as truth.
- [Metadata and records](./metadata-and-records.md) — Markdown frontmatter,
  schemas, exact identifiers, and how a human judgement becomes inspectable.
- [Quality and gates](./quality-and-gates.md) — tests, exit codes, continuous
  integration, blocking rules, advisory findings, and enforcement tiers.
- [Parallel work](./parallel-work.md) — one writer per filesystem, worktrees,
  shared-file collisions, generated aggregates, and ordered integration.

Each note ends with the part of Cairn that uses the concept, so a reader can
return to the protocol without hunting for the connection.
