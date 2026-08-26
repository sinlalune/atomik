---
type: Cairn Reference
title: Opening, audit, and closing records
description: Canonical schemas for the judgement-bearing records Cairn binds to a path and exact implementation candidate.
tags: [cairn, reference, ceremony, audit, frontmatter, template]
timestamp: 2026-08-25T00:00:00Z
---

# Human and agent judgement records

These records turn an authorised judgement into an inspectable repository
object. Their shape and candidate binding are mechanical; their reasoning is
not.

## Opening acceptance

Filename:

```text
atomik-project/sessions/YYYY-MM-DD-cp-example-001-opening.md
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
accepted_at: 2026-01-15T09:00:00Z
scope_ref: atomik-project/coding-paths/CP-EXAMPLE-001.md#definition-of-done
---

# CP-EXAMPLE-001 — opening acceptance

## Outcome

The bounded result in one paragraph.

## Review

- Definition of done: accepted | amended
- Steps and evidence: accepted | amended
- Governing documents: accepted | amended
- Expected writes and overlap: accepted | amended
- Exclusions: accepted | amended
- Initial writer assignment: participant-id

## Amendments

Record exact changes, or “none”.

## Decision

Accepted for trunk registration.
````

The repository defines who may accept. The v0.1 reference checker currently
proves the opening record's path and ceremony presence; full actor, decision,
time, and authority enforcement remains partial and must be reported as such.

## Coherence audit

Filename:

```text
atomik-project/audits/cp-example-001-<full-40-character-subject-commit>.md
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
  verdict: clean
---

# Coherence audit — CP-EXAMPLE-001

## Inputs reviewed

- exact diff from the current trunk to the subject commit
- every required and triggered architecture document
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

## Closing acceptance

Filename:

```text
atomik-project/sessions/YYYY-MM-DD-cp-example-001-closing.md
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
accepted_by: participant-id
accepted_at: 2026-01-15T14:30:00Z
decision: accepted
scope_ref: atomik-project/coding-paths/CP-EXAMPLE-001.md#definition-of-done
advisory_disposition: "fixed: none; accepted: scope-drift — reason; deferred: none"
---

# CP-EXAMPLE-001 — closing acceptance

## Result reviewed

- Candidate: `fedcba9876543210fedcba9876543210fedcba98`
- Delivered outcome: …
- Definition-of-done evidence: …
- User or domain review: …
- Known limits: …

## Advisory disposition

- Fixed: …
- Accepted with reason: …
- Deferred with responsible participant and follow-up: …

## Decision

Candidate accepted for administrative closure and exact integration.
````

The closing record and audit MUST name the same subject. The full hash,
reviewer identity, UTC time, accepted decision, scope reference, and advisory
disposition are required.

## Immutability and correction

Once created, each session or audit file is immutable. A factual correction
creates a new uniquely named record that identifies and supersedes the earlier
record. It never edits history into a more convenient shape.

Return to [exact-candidate closure](../index.md#close-one-exact-implementation-candidate)
or open [closing acceptance](../concepts/closing-acceptance.md).
