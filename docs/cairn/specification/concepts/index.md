---
type: Cairn Concept Index
title: Cairn concept index
description: One article per specialised idea used by the Cairn specification, separated into vocabulary Cairn borrowed and vocabulary Cairn defines, then listed alphabetically.
tags: [cairn, concepts, index, learning, glossary]
timestamp: 2026-08-26T00:00:00Z
---

# Concepts

This wiki defines the specialised ideas used by the
[Cairn specification](../index.md). Each page is about one object or rule. It
starts with a plain definition, connects the idea to Cairn, and states its
limit. The specification remains normative.

The articles fall into two kinds, and keeping them apart matters more than it
looks. **Borrowed vocabulary** is what Cairn inherits from Git and from ordinary
software practice: a reader who already knows what a rebase is can skip all of
it, and a reader who does not can learn it here without learning Cairn at the
same time. **Cairn's own concepts** are the objects and rules the protocol
actually adds — the ideas you are being asked to evaluate.

Twenty-one borrowed terms, forty-five Cairn concepts. A protocol that presents
those as one undifferentiated glossary looks twice as large as it is, and hides
which half a criticism belongs to.

## Borrowed vocabulary

Cairn did not invent these and does not redefine them. Each article says what
the term means in general use, then how Cairn relies on it.

### Git objects and history

[Git](./git.md) → [repository](./repository.md) → [commit](./commit.md) →
[object id](./commit-hash.md) → [branch](./branch.md) → [trunk](./trunk.md) →
[remote](./remote.md) → [fetch and push](./fetch-and-push.md) →
[tamper evidence](./tamper-evidence.md).

### Editable spaces and combining work

[Working tree and worktree](./worktree.md) → [conflict](./conflict.md) →
[rebase](./rebase.md) → [merge](./merge.md).

### Checking and describing

[Test](./test.md) → [exit code](./exit-code.md) →
[continuous integration](./continuous-integration.md) →
[Markdown and frontmatter](./frontmatter.md) → [schema](./schema.md).

### Documents software teams already keep

[Architecture](./architecture.md) → [decision record](./decision-record.md) →
[module note](./module-note.md).

## Cairn's own concepts

### One durable path

[Project memory](./project-memory.md) → [coding path](./coding-path.md) →
[path record](./path-record.md) →
[declared write surface](./declared-write-surface.md) →
[scope digest](./scope-digest.md) → [work unit](./work-unit.md) →
[work ledger](./work-ledger.md) →
[remote checkpoint](./remote-checkpoint.md) →
[provisional commit](./provisional-commit.md) →
[checkpoint retention](./checkpoint-retention.md) →
[handoff brief](./handoff.md) → [writer assignment](./writer-assignment.md).

### People and responsibilities

[Path initiator](./path-initiator.md) → [path writer](./path-writer.md) →
[authorised reviewer](./authorised-reviewer.md) → [auditor](./auditor.md) →
[Cairn checker](./cairn-checker.md) → [integrator](./integrator.md). The
[writer assignment](./writer-assignment.md) says which participant may mutate
the path worktree now.

### Evidence and records

[Blocking finding](./blocking-finding.md) →
[advisory finding](./advisory-finding.md) →
[inconclusive finding](./inconclusive-finding.md) →
[record integrity](./record-integrity.md).

### Open, execute, close, integrate

[Opening acceptance](./opening-acceptance.md) →
[trunk registration](./trunk-registration.md) → [live view](./live-view.md) →
[implementation candidate](./implementation-candidate.md) →
[coherence audit](./coherence-audit.md) →
[closing acceptance](./closing-acceptance.md) →
[acceptance drift](./acceptance-drift.md) →
[administrative closure](./administrative-closure.md) →
[integration transport](./integration-transport.md) → [journal](./journal.md).

### State

[Lifecycle](./lifecycle.md): [draft](./draft-state.md),
[running](./running-state.md), [blocked](./blocked-state.md),
[ready](./ready-state.md), [done](./done-state.md), and
[archived](./archived-state.md).

### Routes

[Lightweight path](./lightweight-path.md) — the default —
[foundation path](./foundation-path.md), and the not-yet-implemented
[emergency path](./emergency-path.md).

### Governance

[Control plane](./control-plane.md) →
[enforcement profile](./enforcement-profile.md) →
[conformance](./conformance.md).

## Alphabetical index

Borrowed terms are marked *(borrowed)*.

- [Acceptance drift](./acceptance-drift.md)
- [Administrative closure](./administrative-closure.md)
- [Advisory finding](./advisory-finding.md)
- [Architecture](./architecture.md) *(borrowed)*
- [Archived state](./archived-state.md)
- [Auditor](./auditor.md)
- [Authorised reviewer](./authorised-reviewer.md)
- [Blocked state](./blocked-state.md)
- [Blocking finding](./blocking-finding.md)
- [Branch](./branch.md) *(borrowed)*
- [Cairn checker](./cairn-checker.md)
- [Checkpoint retention](./checkpoint-retention.md)
- [Closing acceptance](./closing-acceptance.md)
- [Coding path](./coding-path.md)
- [Coherence audit](./coherence-audit.md)
- [Commit](./commit.md) *(borrowed)*
- [Conflict](./conflict.md) *(borrowed)*
- [Conformance](./conformance.md)
- [Continuous integration](./continuous-integration.md) *(borrowed)*
- [Control plane](./control-plane.md)
- [Declared write surface](./declared-write-surface.md)
- [Decision record](./decision-record.md) *(borrowed)*
- [Done state](./done-state.md)
- [Draft state](./draft-state.md)
- [Emergency path](./emergency-path.md)
- [Enforcement profile](./enforcement-profile.md)
- [Exit code](./exit-code.md) *(borrowed)*
- [Fetch and push](./fetch-and-push.md) *(borrowed)*
- [Foundation path](./foundation-path.md)
- [Git](./git.md) *(borrowed)*
- [Handoff brief](./handoff.md)
- [Implementation candidate](./implementation-candidate.md)
- [Inconclusive finding](./inconclusive-finding.md)
- [Integration transport](./integration-transport.md)
- [Integrator](./integrator.md)
- [Journal](./journal.md)
- [Lifecycle](./lifecycle.md)
- [Lightweight path](./lightweight-path.md)
- [Live view](./live-view.md)
- [Markdown and frontmatter](./frontmatter.md) *(borrowed)*
- [Merge](./merge.md) *(borrowed)*
- [Module note](./module-note.md) *(borrowed)*
- [Object id](./commit-hash.md) *(borrowed)*
- [Opening acceptance](./opening-acceptance.md)
- [Path initiator](./path-initiator.md)
- [Path record](./path-record.md)
- [Path writer](./path-writer.md)
- [Project memory](./project-memory.md)
- [Provisional commit](./provisional-commit.md)
- [Ready state](./ready-state.md)
- [Rebase](./rebase.md) *(borrowed)*
- [Record integrity](./record-integrity.md)
- [Remote](./remote.md) *(borrowed)*
- [Remote checkpoint](./remote-checkpoint.md)
- [Repository](./repository.md) *(borrowed)*
- [Running state](./running-state.md)
- [Schema](./schema.md) *(borrowed)*
- [Scope digest](./scope-digest.md)
- [Tamper evidence](./tamper-evidence.md) *(borrowed)*
- [Test](./test.md) *(borrowed)*
- [Trunk](./trunk.md) *(borrowed)*
- [Trunk registration](./trunk-registration.md)
- [Work ledger](./work-ledger.md)
- [Work unit](./work-unit.md)
- [Working tree and worktree](./worktree.md) *(borrowed)*
- [Writer assignment](./writer-assignment.md)
