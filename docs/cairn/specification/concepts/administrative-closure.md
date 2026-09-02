---
type: Cairn Concept
title: Administrative closure
description: The metadata-only commit that records audit and acceptance after the accepted candidate, restricted field by field.
tags: [cairn, concept, closure, commit]
timestamp: 2026-08-26T00:00:00Z
---

# Administrative closure

Administrative closure is one [commit](./commit.md), `A`, immediately after
candidate `C` that records facts about `C` without changing its implementation.

## Build the idea

`A` exists to solve a self-reference: a record that audits a commit cannot be
inside the commit it audits, so acceptance necessarily creates a commit after
the thing accepted.

Permitting `A` to touch whole files is too coarse. The definition of done lives
inside the [path record](./path-record.md), and so does `writes:` — so a closure
commit allowed to "change the path record" is allowed to rewrite the standard
its own acceptance was measured against, after the acceptance. The restriction
has to be field-level or it is not a restriction.

## In Cairn

`A` MAY add the exact [coherence audit](./coherence-audit.md) record and the
exact [closing acceptance](./closing-acceptance.md) record, both new files
naming `C`.

Within the path record, `A` MAY change only:

- `status`, set to `ready`;
- `subject_commit`, set to `C`;
- one appended [work-ledger](./work-ledger.md) entry.

Within the [handoff brief](./handoff.md), `A` MAY change only the checkpoint
pointer and the fields that follow from it.

Everything else MUST NOT change: the definition of done, `scope_ref`, `writes:`,
`governs:`, the step plan, product source, tests, architecture, and
implementation documentation.

## It does not prove

Calling a commit administrative is insufficient. Its diff, its distance from
`C`, and the specific fields it altered must all be checked.

Related: [implementation candidate](./implementation-candidate.md),
[ready state](./ready-state.md), [path record](./path-record.md),
[record integrity](./record-integrity.md).
