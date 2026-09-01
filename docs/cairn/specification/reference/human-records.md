---
type: Cairn Reference
title: Opening, audit, and closing records
description: Canonical schemas for the judgement-bearing records Cairn binds to a path, its accepted scope, and one exact implementation candidate.
tags: [cairn, reference, ceremony, audit, frontmatter, template]
timestamp: 2026-08-26T00:00:00Z
---

# Human and agent judgement records

These records turn an authorised judgement into an inspectable repository
object. Their shape and their binding — to a candidate, to a scope digest, to a
base — are mechanical; their reasoning is not.

On the [`full` route](../concepts/lightweight-path.md) each record below is its
own file. On the default `lightweight` route the opening block lives in the path
record and the audit questions are answered inside the closing record. The
fields are identical either way; only the number of files changes.

## Opening acceptance

Filename:

```text
project/sessions/YYYY-MM-DD-cp-example-001-opening.md
```

Template:

````md
---
type: Cairn Session Record
title: CP-EXAMPLE-001 opening acceptance
timestamp: 2026-01-15T09:00:00Z
tags: [cairn, opening]
path: CP-EXAMPLE-001
ceremony: opening
decision: accepted
accepted_by: participant-id
accepted_roles: [initiator, reviewer]
accepted_at: 2026-01-15T09:00:00Z
scope_ref: project/coding-paths/CP-EXAMPLE-001.md#definition-of-done
scope_digest: sha256:9f2c4b1d5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c
---

# CP-EXAMPLE-001 — opening acceptance

## Outcome

The bounded result in one paragraph.

## Review

- Route: lightweight | full — with the trigger, if full
- Definition of done: accepted | amended
- Steps and evidence: accepted | amended
- Expected writes and overlap: accepted | amended
- Exclusions: accepted | amended
- Governing documents pinned in `governs:`: accepted | amended
- Initial writer assignment: participant-id

## Amendments

Record exact changes, or “none”.

## Decision

Accepted for trunk registration.
````

### The scope digest

`scope_digest` covers the exact text `scope_ref` resolves to at the registration
commit: the named heading and its body up to the next heading of the same or
higher level, normalised for line endings and trailing whitespace, with no other
transformation. The algorithm is named in the value and the digest is never
abbreviated.

Without it, `scope_ref` is a mutable pointer: the definition of done can be
edited after acceptance, and every record still looks valid. Closing acceptance
re-computes the digest and refuses to proceed on a mismatch.

### Amending accepted scope

A scope change is not an edit. It is a new opening acceptance carrying the new
digest, `supersedes:` naming the earlier record, and the reason. The superseded
record is retained.

The repository defines who may accept. The v0.2 reference checker currently
proves the opening record's path and ceremony presence; actor, roles, decision,
time, digest, and authority enforcement remain unimplemented and must be
reported as such.

## Coherence audit

Filename:

```text
project/audits/cp-example-001-<full-subject-object-id>.md
```

Template:

````md
---
type: Cairn Coherence Audit
title: Coherence audit — CP-EXAMPLE-001
timestamp: 2026-01-15T13:30:00Z
cairn:
  path: CP-EXAMPLE-001
  branch: path/cp-example-001
  subject_commit: fedcba9876543210fedcba9876543210fedcba98
  base: 0123456789abcdef0123456789abcdef01234567
  governs:
    - docs/architecture/example.md@89ab89ab89ab89ab89ab89ab89ab89ab89ab89ab
  verdict: clean
---

# Coherence audit — CP-EXAMPLE-001

## Inputs reviewed

- exact diff from the current trunk to the subject commit
- every document pinned in `governs:`, read at its pinned object id
- relevant decision records
- affected module notes
- live paths declaring overlapping surfaces

## Findings

### Does the diff contradict an accepted decision?

No. Evidence: …

### Does it duplicate another live path's work?

No. Evidence: …

### Did it introduce architecture without a decision record?

No. Evidence: …

### Does it create independently maintained statements that may drift?

No. Evidence: …

## Verdict

clean
````

Allowed verdict stems are `clean`, `drift noted`, and
`needs a conversation before merge`. A qualified verdict may state the
disposition. If a finding changes implementation, create and audit a new
candidate.

The object-id length above is SHA-1's forty characters because that is what most
repositories are configured for. The requirement is the **full object id in the
repository's configured format**: a SHA-256 repository writes sixty-four
characters in the same field and the same filename.

## Closing acceptance

Filename:

```text
project/sessions/YYYY-MM-DD-cp-example-001-closing.md
```

Template:

````md
---
type: Cairn Session Record
title: CP-EXAMPLE-001 closing acceptance
timestamp: 2026-01-15T14:30:00Z
tags: [cairn, closing]
path: CP-EXAMPLE-001
ceremony: closing
subject_commit: fedcba9876543210fedcba9876543210fedcba98
base: 0123456789abcdef0123456789abcdef01234567
accepted_by: participant-id
accepted_roles: [reviewer, auditor]
accepted_at: 2026-01-15T14:30:00Z
decision: accepted
scope_ref: project/coding-paths/CP-EXAMPLE-001.md#definition-of-done
scope_digest: sha256:9f2c4b1d5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c
advisories_at_candidate: [scope-drift, path-staleness]
advisory_disposition:
  - rule: scope-drift
    disposition: accepted
    reason: the wider root cause is declared in writes: at this same commit
  - rule: path-staleness
    disposition: deferred
    reason: parked during the dependency freeze
    owner: participant-id
    follow_up: CP-EXAMPLE-002
---

# CP-EXAMPLE-001 — closing acceptance

## Result reviewed

- Candidate: `fedcba9876543210fedcba9876543210fedcba98`
- Base accepted against: `0123456789abcdef0123456789abcdef01234567`
- Scope digest re-computed at the candidate: matches opening
- Delivered outcome: …
- Definition-of-done evidence: …
- Provisional commits folded: yes | none existed
- User or domain review: …
- Known limits: …

## Advisory disposition

Every advisory the checker raised at this candidate appears in the frontmatter
list, and nothing else does. Prose here explains the entries; it does not
replace them.

## Decision

Candidate accepted for administrative closure and exact integration.
````

### What the record binds

| Field | Binds |
| :-- | :-- |
| `subject_commit` | the exact result. MUST equal the audit's subject |
| `scope_digest` | the accepted definition of done. MUST equal the opening digest |
| `base` | the trunk tip the candidate was read against. Input to the [drift predicate](../concepts/acceptance-drift.md) |
| `accepted_roles` | which of the five roles this actor held, so a collapse is visible |
| `advisories_at_candidate` | the advisory rules raised at `C`, attested by the reviewer |
| `advisory_disposition` | a structured entry per advisory in that attested set |

`advisory_disposition` is a list, not a sentence. Each entry names a `rule`, a
`disposition` of `fixed`, `accepted`, or `deferred`, and a `reason`; a deferral
also names an `owner` and a `follow_up`.

It is compared against `advisories_at_candidate`, not against whatever a checker
raises while evaluating the closure commit. `A` is field-restricted, so its
advisory set is a strict subset of `C`'s: comparing against it would let an
advisory raised at the candidate pass undisposed. The attested set is the
subject, and any advisory that does fire at `A` and is missing from it proves
the attestation incomplete.

Reviewer identity, UTC time, and an accepted decision remain required.

## Immutability and correction

Once created, each session or audit file is immutable. A factual correction
creates a new uniquely named record that identifies and supersedes the earlier
record. It never edits history into a more convenient shape.

Return to [exact-candidate closure](../index.md#close-one-exact-implementation-candidate)
or open [closing acceptance](../concepts/closing-acceptance.md).
