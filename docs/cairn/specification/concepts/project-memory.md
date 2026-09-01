---
type: Cairn Concept
title: Project memory
description: Durable files and execution state stored with the repository, so knowledge outlives the conversation that produced it.
tags: [cairn, concept, memory, foundation]
timestamp: 2026-08-26T00:00:00Z
---

# Project memory

Project memory is the information future participants need to understand,
verify, and continue work without access to the conversation that produced it.

## Build the idea

Its unit is the file: a named sequence of content stored at a path. Text in a
conversation disappears from the project when the conversation ends. A file can
be opened by another process later, compared with an earlier version, and
included in a [commit](./commit.md); its path also gives other files a stable
way to refer to it.

Cairn therefore makes files the smallest durable records. A path file carries
execution state; a session file carries an acceptance; an audit file carries a
judgement. Each important statement has one canonical file rather than several
manually maintained copies.

## In Cairn

Project memory has two durable planes. `docs/` records what the system is and
why: [architecture](./architecture.md), [decisions](./decision-record.md), and
[implemented-area notes](./module-note.md). The portable role path `project/`
records what bounded work is doing now: paths, sessions, audits, handoffs, and
integrated outcomes.

`project/` is a protocol **role name**, not a required folder name. Which folder
a given repository installs it in is recorded once, in its
`project/coding-paths/binding.md`, under the
[host-binding boundary](../reference/repository-layout.md#host-binding-appendix),
and nowhere in the portable articles.

The path ledger connects them by recording which knowledge governed a concrete
work unit and which knowledge changed with it. A path's
[`governs:`](./path-record.md) declaration pins each governing document at an
exact [object id](./commit-hash.md), so "which knowledge applied" is a fact
rather than a memory.

## It does not prove

Persistence is not truth. A file can be incomplete or wrong, so Cairn combines
records with review and executable evidence. Canonical ownership prevents
conflicting sources; tests and review evaluate the claims themselves.

Related: [repository](./repository.md), [coding path](./coding-path.md),
[work ledger](./work-ledger.md), [Markdown and frontmatter](./frontmatter.md).
