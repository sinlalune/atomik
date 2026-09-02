---
type: Cairn Concept
title: Closing acceptance
description: An authorised decision accepting one exact implementation candidate, the scope it was measured against, and the base it was read against.
tags: [cairn, concept, closure, governance]
timestamp: 2026-08-26T00:00:00Z
---

# Closing acceptance

Closing acceptance is a recorded decision about one exact
[implementation candidate](./implementation-candidate.md), not a general
approval of a [branch](./branch.md) name.

## In Cairn

The record binds three things at once, because an acceptance that binds only the
first is weaker than it appears:

- **the result** — the full `subject_commit` of `C`, which MUST equal the
  [coherence audit](./coherence-audit.md)'s subject;
- **the scope** — a `scope_ref` and its [scope digest](./scope-digest.md),
  re-computed at `C` and required to match the digest recorded at opening;
- **the base** — `base: T`, the trunk tip `C` was rebased onto, which is what
  the [acceptance-drift](./acceptance-drift.md) predicate later tests.

It also contains the path, `ceremony: closing`, reviewer identity, UTC time,
`decision: accepted`, the roles that reviewer held on this path, and the
structured disposition of every [advisory](./advisory-finding.md) raised at `C`.

If implementation changes, the acceptance no longer applies and closure repeats.

## It does not prove

The record proves that an acceptance was recorded in the required shape. It does
not prove the reviewer was authorised unless repository governance enforces that
identity — and when the same actor opened and closed the path, the record makes
that visible rather than making it true.

Related: [implementation candidate](./implementation-candidate.md),
[coherence audit](./coherence-audit.md), [scope digest](./scope-digest.md),
[acceptance drift](./acceptance-drift.md),
[administrative closure](./administrative-closure.md).
