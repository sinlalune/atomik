---
type: Cairn Concept
title: Record integrity
description: Rules that preserve existing decision and execution records against later rewrite.
tags: [cairn, concept, integrity, record]
timestamp: 2026-08-25T00:00:00Z
---

# Record integrity

Record integrity means an existing historical record remains available under
its original identity and content.

## In Cairn

Session, audit, rolled-ledger, and journal-entry files are immutable after
creation: later work cannot modify, rename, or delete them. A correction adds a
superseding file. Mutable `index.md` and `log.md` navigation views are excluded.

The protocol also requires the live ledger to be append-only or rolled
verbatim. That predicate awaits explicit ledger markers in the reference tools.

## It does not prove

Repository-level checks protect observable diffs. Stronger resistance to an
authorised history rewrite needs protected refs or an external anchor.

Related: [work ledger](./work-ledger.md), [journal](./journal.md),
[tamper evidence](./tamper-evidence.md).

