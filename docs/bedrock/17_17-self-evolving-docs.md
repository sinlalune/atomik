---
{
  "id": "17-self-evolving-docs",
  "title": "Self-evolving documentation system",
  "status": "foundational",
  "tags": [
    "docs",
    "process",
    "agent",
    "okf",
    "git",
    "truth",
    "freshness",
    "execution-cost",
    "retrieval-policy"
  ],
  "relations": [
    {
      "to": "16-dev-docs-tab",
      "kind": "surfaces"
    },
    {
      "to": "15-maintainability",
      "kind": "enforces"
    },
    {
      "to": "22-agent-handoff",
      "kind": "governs"
    },
    {
      "to": "24-doc-templates",
      "kind": "uses"
    },
    {
      "to": "26-okf-agent-context",
      "kind": "implements-pattern"
    },
    {
      "to": "27-git-compatibility",
      "kind": "uses-diffs"
    },
    {
      "to": "28-truth-evidence-model",
      "kind": "applies-to-documentation-claims"
    },
    {
      "to": "32-truth-investigation-record",
      "kind": "preserves"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "documents"
    }
  ],
  "agent": {
    "purpose": "Enforce documentation updates as part of every core implementation and make docs usable as a human/agent knowledge bundle.",
    "inputs": [
      "code change",
      "module boundary change",
      "ADR need",
      "agent task",
      "context migration",
      "retrieval strategy change",
      "execution/cost contract change"
    ],
    "outputs": [
      "updated docs",
      "manifest entry",
      "index/log updates",
      "module note",
      "agent digest",
      "context pack",
      "capability snapshot",
      "operation-trace documentation"
    ],
    "invariants": [
      "Docs are the durable source of record for project decisions, not automatic proof that every external fact remains correct.",
      "No undocumented core module.",
      "Every changed contract updates docs in the same PR.",
      "Documentation must be readable by humans and digestible by agents.",
      "Important chat decisions should be promoted into files.",
      "Volatile external claims carry official sources, checked_at dates, and recheck triggers.",
      "Local model and hardware claims remain dated capability evidence, not foundational guarantees."
    ]
  }
}
---

# Self-evolving documentation system

## Why this matters

The project is ambitious and the creator is learning desktop architecture while building it. Documentation must not be a static artifact created once. It must become a living scaffold that preserves worker knowledge from human and AI contributors.

## Documentation loop

```text
implement brick
  -> explain why it exists
  -> document alternatives
  -> define boundaries
  -> document contracts
  -> document tests
  -> update architecture map
  -> update index.md and log.md
  -> add agent handoff/context if needed
  -> make it visible in the Dev Docs tab
```

## Required documentation types

```text
bedrock docs
  founding principles and roadmap

module learning notes
  explanation of each core brick

ADRs
  durable architectural decisions

agent contracts
  what coding agents must obey

project index/log files
  progressive disclosure and history for humans/agents

context packs
  compact re-entry bundles for long-running work

specs/manifests
  machine-readable docs index and contracts

examples/fixtures
  runnable examples and test cases
```

## Documentation maintenance rule

If a code change affects any of these, docs must change in the same work unit:

```text
package boundary
public type/interface
project bundle format
source dossier format
context packet format
file format
source adapter behavior
IPC channel
security boundary
AI operation contract
retrieval/context strategy
execution policy, budget, or ActionTrace contract
local model/runtime capability
patch format
workspace persistence
Git behavior
module ownership
roadmap phase
```

## Context migration rule

When a conversation produces a durable design decision, the agent should propose patches to:

```text
relevant bedrock doc
ADR or module note
project/log.md
project/index.md
context/current-brief.md
agent handoff
```

A chat transcript is not the project memory. Durable files are. External factual claims in those files still require evidence and freshness review.

## Agent requirement

Coding agents should never answer “implemented” for a core feature unless they also report the documentation files they updated or explicitly justify why none were required.

## Documentation epistemics

Documentation has two responsibilities:

```text
record architectural decisions durably
  and
state external facts with evidence and freshness metadata
```

Stable design principles can live in foundational pages. Volatile facts—provider prices, terms, model names, APIs, legal rules, platform behavior—belong in dated research records or capability snapshots with official links and recheck triggers.

A file being canonical means agents must update that file when the decision changes. It does not mean an old price or provider term stays true forever.


## Execution-economics documentation rule

A change to retrieval, transcription, autocomplete, model routing, token accounting, cost estimation, or privacy tracing must update its contract and at least one fixture in the same work unit. Model names, speed claims, memory requirements, licenses, and supported devices belong in dated capability or investigation records with recheck triggers.
