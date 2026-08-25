---
type: Cairn Reference
title: 'Reference: Opening, closing, and audit records'
description: Canonical templates for the human and agent judgements Cairn persists as machine-readable Markdown.
tags: [cairn, reference, ceremony, audit, frontmatter, template]
timestamp: 2026-08-25T00:00:00Z
---

# Human records

## Ceremony schema

Opening and closing records live under `project/sessions/`. The checker reads
exactly two root-level fields:

```yaml
path: CP-EXAMPLE-001
ceremony: opening
```

Allowed `ceremony` values are `opening` and `closing`. Do not nest these fields
under `cairn:`. Match the full path id. If the configured parser treats scalar
text literally, keep comments on separate lines.

## Opening record

```md
---
type: Cairn Session Record
title: CP-EXAMPLE-001 opening check
timestamp: YYYY-MM-DDT00:00:00Z
tags: [cairn, opening]
path: CP-EXAMPLE-001
branch: path/cp-example-001
ceremony: opening
---

# CP-EXAMPLE-001 — opening check

## Proposed outcome

The bounded result in one paragraph.

## Feature checks

### Feature or constraint 1

- Proposed implementation: …
- Owner response: accepted | amended
- Amendment, if any: …

### Feature or constraint 2

- Proposed implementation: …
- Owner response: accepted | amended
- Amendment, if any: …

## Scope and exclusions

- Expected write surfaces: …
- Required documents: …
- Explicit exclusions: …

## Decision

Accepted for registration: yes | no
```

Activation requires an explicit accepted decision, not merely the existence of
the file.

## Closing record

```md
---
type: Cairn Session Record
title: CP-EXAMPLE-001 closing ceremony
timestamp: YYYY-MM-DDT00:00:00Z
tags: [cairn, closing]
path: CP-EXAMPLE-001
branch: path/cp-example-001
ceremony: closing
---

# CP-EXAMPLE-001 — closing ceremony

## Recall

- Delivered outcome: …
- Completed steps and remote commits: …
- Accepted scope widening: …
- Remaining backlog: …
- Known limits: …

## Owner review

### Does the delivered result match the accepted path?

Owner response: …

### What, if anything, must change before merge?

Owner response: …

### What should happen next?

Owner response: …

## Decision

Accepted for closure: yes | no
```

## Coherence-audit record

The audit is produced after the closing rebase and before self-merge. Its verdict
is advisory, but the record must be bound to the path's own work and be filled.

```md
---
type: Cairn Coherence Audit
title: Coherence audit — CP-EXAMPLE-001 @ a1b2c3d
timestamp: YYYY-MM-DDT00:00:00Z
cairn:
  path: CP-EXAMPLE-001
  branch: path/cp-example-001
  head: a1b2c3d4e5f6
  base: origin/main
  verdict: clean
---

# Coherence audit — CP-EXAMPLE-001 @ a1b2c3d

## Inputs reviewed

- rebased diff against the trunk
- required and triggered conditional architecture documents
- ADRs relevant to the change
- affected module notes
- other running paths declaring overlapping surfaces

## Findings

### Does the diff contradict an accepted decision?

No. Evidence: …

### Does it duplicate another running path's work?

No. Evidence: …

### Did it introduce architecture without a decision record?

No. Evidence: …

### Is a statement now maintained independently in two places?

No. Evidence: …

## Verdict

**clean**

Allowed outcome stems: `clean` · `drift noted` ·
`needs a conversation before merge`.
```

The checker may require an outcome and at least one substantive answer. It must
not judge the quality of those answers.

Return to [Opening](../index.md#5-opening-a-path),
[Closing](../index.md#8-closing-and-self-merge), or
[Human records](../index.md#9-human-records).
