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

### Integrity is not accuracy

Immutability protects a record from being changed after the fact. It does
nothing about a record that was already wrong when it was written, and the two
are easy to confuse because both are about trusting what a file says. Every
CP-UI-TYPOGRAPHY record — opening check, closing ceremony, coherence audit,
journal entry — is dated four days before the events it describes, and record
integrity held perfectly throughout: nothing was ever edited.

So the date a record carries is checked where it is written and nowhere else.
The two dates the author supplies, in the filename and in `timestamp:`, must
agree; a disagreement means one is false, and it blocks. Divergence from the
author date of the commit that added the file is reported and never blocks,
because a note taken on one day and committed two days later is dated correctly.
Existing records are never swept: editing one to satisfy a later rule would
break the very property this page is about.

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

## Relocation is not mutation

A record may MOVE. The steps of a path record moved out of a shared rollup
directory and into the path's own folder when path records became folders, and
nothing about any of those records changed.

A checker that keys on the file path reads a move as a deletion *and* an
addition, so it reports every relocated record as destroyed and every arrival as
unaccounted for. That is a [proxy predicate](./proxy-predicate.md): the path is
where a record sits, and immutability is about what the record says.

Two operations are sanctioned on a record that moves, and no others:

- **Repointing a link**, because a link is an address rather than content and the
  same target must keep resolving from the new location.
- **Appending**, because that is how a record grows without any earlier sentence
  changing.

So a rename is a relocation when, with every link target normalised away, the old
text is a PREFIX of the new one. The test is exact rather than a similarity
score, it covers the frontmatter — which sits at the very start, so a relocation
cannot quietly change which record it claims to be — and anything else is a
rewrite wearing a rename. A conforming checker states its relocations rather than
passing them in silence: an exemption nobody can see is indistinguishable from a
rule nobody enforces.

## It does not prove

Repository-level checks protect observable diffs. Stronger resistance to an
authorised history rewrite needs protected refs or an external anchor. And a
completed redaction proves only that the repository no longer serves the text —
never that the disclosure was contained.

Related: [work ledger](./work-ledger.md), [journal](./journal.md),
[proxy predicate](./proxy-predicate.md),
[tamper evidence](./tamper-evidence.md),
[checkpoint retention](./checkpoint-retention.md).
