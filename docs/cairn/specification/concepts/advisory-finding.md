---
type: Cairn Concept
title: Advisory finding
description: A non-blocking report of risk, drift, or a condition needing judgement.
tags: [cairn, concept, enforcement]
timestamp: 2026-08-25T00:00:00Z
---

# Advisory finding

An advisory finding identifies a condition worth attention without claiming
that automation can forbid the work.

## In Cairn

Likely scope drift, path age, oversized ledgers, and architecture-sensitive
changes can be advisory. Closing acceptance records whether each advisory was
fixed, accepted, or deferred and why, so it cannot disappear unread in a CI
log.

## It does not prove

“Advisory” does not mean unimportant. It means the final decision requires
context or judgement.

Related: [blocking finding](./blocking-finding.md),
[closing acceptance](./closing-acceptance.md),
[declared write surface](./declared-write-surface.md).

