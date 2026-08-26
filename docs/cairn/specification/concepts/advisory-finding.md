---
type: Cairn Concept
title: Advisory finding
description: A non-blocking report of risk or drift, and the structured disposition that keeps it from disappearing unread.
tags: [cairn, concept, enforcement]
timestamp: 2026-08-26T00:00:00Z
---

# Advisory finding

An advisory finding identifies a condition worth attention without claiming
that automation can forbid the work.

## In Cairn

Path age, oversized ledgers, unpushed checkpoints, and collapsed reviewer roles
are advisory. Each one raised against candidate `C` MUST appear in the
[closing acceptance](./closing-acceptance.md) as a structured entry:

```yaml
advisory_disposition:
  - rule: path-staleness
    disposition: accepted
    reason: parked during the dependency freeze; unblock date recorded
```

`disposition` is `fixed`, `accepted`, or `deferred`; a deferral also names a
responsible participant and a follow-up reference. The list MUST cover exactly
the advisories the checker raised at `C` — no invented entries, no omissions.

The structure is the point. As one free-text sentence, "every advisory MUST be
recorded" is a rule nothing can check: a reviewer who writes `accepted: none`
over three live advisories produces a record that looks complete and is false.
Set equality against the findings at `C` is a predicate; a sentence is not.

## It does not prove

"Advisory" does not mean unimportant; it means the final decision requires
context. A structured disposition proves that a decision was recorded against
each finding — never that the decision was wise.

Related: [blocking finding](./blocking-finding.md),
[closing acceptance](./closing-acceptance.md),
[declared write surface](./declared-write-surface.md).
