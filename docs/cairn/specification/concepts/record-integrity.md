---
type: Cairn Concept
title: Record integrity
description: Rules that preserve existing decision and execution records against later rewrite, and the single ceremony that may redact one.
tags: [cairn, concept, integrity, record, redaction]
timestamp: 2026-08-26T00:00:00Z
---

# Record integrity

Record integrity means an existing historical record remains available under
its original identity and content.

## In Cairn

Session, audit, rolled-ledger, and journal-entry files are immutable after
creation: later work cannot modify, rename, or delete them. A correction adds a
superseding file. Mutable `index.md` and `log.md` navigation views are excluded.

The protocol also requires the live ledger to be append-only or rolled verbatim.
That predicate awaits explicit ledger markers in the reference tools.

### Redaction

Immutability and disclosure eventually collide: a secret, a credential, or
personal data lands inside a record that may never be edited. Deleting the
record destroys the history; leaving it publishes the secret for as long as the
repository exists. Redaction is the one sanctioned exception, and it is a
ceremony rather than an edit.

1. **Rotate first.** Revoke and replace the exposed credential. Redaction
   removes text from a file; it does not un-disclose anything already read,
   cloned, or mirrored. A redaction performed instead of a rotation is theatre.
2. **Write a redaction record** — itself immutable — naming the affected record,
   its [object id](./commit-hash.md) before redaction, the class of content, the
   authorising participant, and the rotation evidence. It never quotes the
   content it exists to remove.
3. **Replace the content in place** with `[redacted: <redaction-record-id>]`, in
   a commit that touches nothing else. The record's identity, structure, and
   every other statement survive.
4. **Rewrite history only as a separate decision.** If the object must also
   leave Git history, that is its own work unit: it updates every
   [retention ref](./checkpoint-retention.md) and every ledger reference to a
   rewritten object id, and the redaction record names both the old and the new
   ids.

## It does not prove

Repository-level checks protect observable diffs. Stronger resistance to an
authorised history rewrite needs protected refs or an external anchor. And a
completed redaction proves only that the repository no longer serves the text —
never that the disclosure was contained.

Related: [work ledger](./work-ledger.md), [journal](./journal.md),
[tamper evidence](./tamper-evidence.md),
[checkpoint retention](./checkpoint-retention.md).
