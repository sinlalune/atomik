---
{
  "id": "24-doc-templates",
  "title": "Documentation templates",
  "status": "ready-to-use",
  "tags": [
    "templates",
    "docs",
    "process",
    "okf",
    "truth",
    "verification",
    "dictionary",
    "retrieval",
    "local-models",
    "operation-trace",
    "cost"
  ],
  "relations": [
    {
      "to": "17-self-evolving-docs",
      "kind": "implements"
    },
    {
      "to": "15-maintainability",
      "kind": "supports"
    },
    {
      "to": "22-agent-handoff",
      "kind": "used-by"
    },
    {
      "to": "26-okf-agent-context",
      "kind": "supports"
    },
    {
      "to": "27-git-compatibility",
      "kind": "supports"
    },
    {
      "to": "28-truth-evidence-model",
      "kind": "provides-claim-template"
    },
    {
      "to": "29-verification-grounding-router",
      "kind": "provides-provider-review-template"
    },
    {
      "to": "30-public-knowledge-dictionary",
      "kind": "provides-dictionary-template"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "provides-evaluation-and-trace-templates-for"
    }
  ],
  "agent": {
    "purpose": "Provide concrete reusable formats for maintaining the project knowledge base.",
    "inputs": [
      "new module",
      "new decision",
      "new source adapter",
      "new source dossier",
      "new context pack",
      "new AI operation",
      "new claim",
      "new verification report",
      "new provider snapshot",
      "new dictionary entry",
      "new retrieval strategy",
      "new local model/runtime",
      "new ActionTrace field"
    ],
    "outputs": [
      "filled template",
      "docs manifest entry",
      "agent digest",
      "clean diff",
      "claim record",
      "verification report",
      "provider capability snapshot",
      "dictionary entry",
      "capability evaluation record",
      "operation trace fixture"
    ],
    "invariants": [
      "Templates are part of the implementation process.",
      "Do not let docs drift into unstructured essays only.",
      "Human explanation and agent contract must both be present.",
      "Use Markdown/frontmatter where possible."
    ]
  }
}
---

# Documentation templates

## Module learning note

```md
---
type: Atomik Module Note
title: Module: package-name
description: What this module owns and how agents should use it.
tags: [module]
timestamp: YYYY-MM-DDT00:00:00Z
---

# Module: package-name

## What it owns

## Why it exists

## What it must not own

## Public contracts

## Data flow

## Alternatives considered

## Common mistakes

## Tests

## Example usage

## Future extension points

## Agent checklist
```

## Learning note (beginner layer)

```md
---
type: Atomik Learning Note
title: 'Learning: topic'
description: Beginner-first walkthrough of the technologies, concepts, and methodology behind <area>.
tags: [learning]
timestamp: YYYY-MM-DDT00:00:00Z
---

# Learning: topic

## Who this is for and what you can do afterwards

## The technologies involved, from zero

## The architecture concepts mobilized (named)

## Walkthrough of the real code

## How it was built (methodology)

## Lessons learned the hard way

## Try it yourself (exercises)

## Vocabulary you now own

## What arrives next
```

Rules: anchor every claim to real repository files; name each concept
explicitly; write for someone who did not build the code and does not know
the stack; keep exercises runnable. Created just-in-time when a step first
mobilizes a technology (17), updated when the explained shape changes.

## ADR template

```md
# ADR-000: Decision title

Status: proposed | accepted | superseded
Date: YYYY-MM-DD

## Context

## Decision

## Consequences

## Alternatives considered

## Migration / rollback

## Links
```

## Source dossier template

```md
---
type: Atomik Source
title: Source title
description: One sentence explaining what this source is used for.
resource: ./original.ext
tags: []
timestamp: YYYY-MM-DDT00:00:00Z
atomik:
  id: source_id
  source_type: capture | pdf | web | image | code | video | audio
  status: captured | extracting | extracted | reviewed
---

# Source dossier

## What this source is

## Original

## Extracted representations

## Useful anchors

| Anchor | Meaning | Target |
|---|---|---|

## Notes created from this source

# Citations
```

## Source adapter template

```md
# Source adapter: name

## Source type

## Original representation

## Source dossier representation

## Extracted representation

## Selection kinds

## Anchors

## Optional sidecars

## Provenance model

## AI operations enabled

## Failure modes

## Tests
```

## Context pack template

```md
---
type: Atomik Context Pack
title: Current project brief
description: Compact re-entry context for an agent or future chat.
tags: [context]
timestamp: YYYY-MM-DDT00:00:00Z
---

# Current project brief

## What this project is

## Current decisions

## Canonical files

## Recent changes

## Open questions

## Files to read first

## Files not to mutate without instruction
```

## AI operation template

```md
# AI operation: name

## User intent

## Inputs

## Context scope

## Retrieval/context-compilation plan

## Execution policy and hard budget

## Output kind

## Prompt contract

## Patch contract

## Validation

## Failure/repair/cancellation behavior

## ActionTrace and operation-receipt fields

## Privacy/content-capture policy

## Examples
```

## Git hygiene checklist

```text
Does this change rewrite unrelated files?
Did a timestamp change only because the file was opened?
Are generated IDs stable?
Are cache/index/embedding/model/private-usage outputs ignored?
Can a human understand the diff?
Does every accepted AI patch map to a clear user action?
```

## Claim note template

```md
---
type: Atomik Claim
title: Claim text or short title
timestamp: YYYY-MM-DDT00:00:00Z
atomik:
  id: claim_id
  claim_nature: factual | interpretive | analogical | normative | ...
  labels: [source-linked, needs-review]
  lifecycle:
    status: draft | human-accepted | superseded | rejected
sources:
  - source: ../sources/.../source.md
    anchor: anchor-id
    role: supports | contradicts | qualifies
---

# Claim

## Scope

## Evidence

## Verification history

## Counterclaims or qualifications

## Open uncertainty
```

## Verification report template

```md
---
type: Atomik Verification Report
title: Verification of ...
timestamp: YYYY-MM-DDT00:00:00Z
atomik:
  id: verification_id
  policy: balanced | strict | local-only
---

# Verification report

## Claims checked

## Plan and budget

## Local evidence

## External checks

## Source independence

## Results

## Limitations

## Suggested repair

## Action traces and cost summary

- deterministic/local/cloud/web location
- trace IDs
- estimated vs reported/billed values
- query/token/work-unit totals
- privacy/content-capture state
- accepted repair outcome
```

## Provider capability snapshot template

```md
# Provider capability snapshot

Checked at: YYYY-MM-DD
Official sources:
- ...

## Models/tools checked

## Billing unit and price snapshot

## Data-use and retention summary

## Display/reuse restrictions

## Region/account assumptions

## Atomik feature flags

## Recheck triggers
```

## Dictionary entry template

```md
---
type: Atomik Dictionary Entry
title: lemma
atomik:
  id: dictionary_language_lemma
  language: language-code
  lexical_category: noun | verb | ...
---

# lemma

## Pronunciation

## Forms

## Senses

## Usage notes

## Etymology

### Attested/reconstructed/disputed status

### Language-stage chain

### Alternative hypotheses

## Related terms

## Sources and revision dates
```


## Retrieval/local capability evaluation template

```md
# Capability evaluation: name

Checked at: YYYY-MM-DD
Candidate revision/license:
Runtime revision:
Hardware/OS/device tier:
Task corpus and languages:
Baseline:

## Quality and outcome

## Latency and first result

## Memory, storage, startup, and energy proxy

## Privacy and external transfer

## Failure, cancellation, and rollback

## Decision

adopt | optional experiment | reject | recheck later
```

## ActionTrace fixture template

```json
{
  "id": "trace_...",
  "operationId": "op_...",
  "timestamp": "YYYY-MM-DDTHH:mm:ssZ",
  "action": "retrieve | transcribe | autocomplete | generate | verify | apply-patch",
  "execution": { "location": "deterministic | local-model | cloud-model | web" },
  "usage": {},
  "performance": { "wallMs": 0 },
  "billing": { "currency": "EUR", "basis": "estimated" },
  "outcome": { "status": "completed | cancelled | failed" },
  "privacy": { "mode": "offline | private | balanced | cloud", "contentRecorded": false }
}
```

## Coding path template

````md
---
type: Atomik Coding Path
title: Task title
atomik:
  id: CP-XXX-000
  status: draft | active | blocked | done | archived
  current_step: S01
  base_commit: null
---

# Goal

# Definition of done

# Documentation coverage

## Required

## Conditional
- doc — trigger that requires reading it

## Deliberately excluded
- doc — reason

# Execution

- [ ] S01 ...

# Current checkpoint

```text
base commit :
changed     :
tests       :
next action :
blockers    :
```

# Blockers
````

The `Current checkpoint` section is the Work Ledger. An optional `CP-XXX.state.json` sidecar may mirror it for tooling under the standard sidecar rule.
