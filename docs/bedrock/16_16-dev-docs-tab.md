---
{
  "id": "16-dev-docs-tab",
  "title": "In-app development docs tab",
  "status": "mvp",
  "tags": [
    "dev-docs",
    "ui",
    "documentation",
    "okf",
    "truth-docs",
    "volatile-facts",
    "cost-observability",
    "retrieval-diagnostics",
    "operation-receipts"
  ],
  "relations": [
    {
      "to": "17-self-evolving-docs",
      "kind": "implements"
    },
    {
      "to": "15-maintainability",
      "kind": "surfaces"
    },
    {
      "to": "03-workspace-tabs",
      "kind": "is-a-tab"
    },
    {
      "to": "26-okf-agent-context",
      "kind": "uses-indexes"
    },
    {
      "to": "28-truth-evidence-model",
      "kind": "renders"
    },
    {
      "to": "32-truth-investigation-record",
      "kind": "surfaces-recheck-state-for"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "surfaces"
    },
    {
      "to": "34-local-execution-investigation-record",
      "kind": "uses-dated-capability-evidence-from"
    }
  ],
  "agent": {
    "purpose": "Implement a docs view early enough that architecture explanations, module contracts, and agent context are always one tab away.",
    "inputs": [
      "docs folder",
      "manifest",
      "Markdown docs",
      "index.md/log.md",
      "agent digests"
    ],
    "outputs": [
      "searchable docs tab",
      "rendered page",
      "relation map",
      "agent mode",
      "volatile-fact/recheck view",
      "operation/cost view",
      "retrieval strategy view"
    ],
    "invariants": [
      "Docs are part of the app.",
      "Dev docs tab is available during development builds.",
      "The tab reads project files, not hardcoded UI copy only.",
      "Docs can later become user documentation.",
      "Docs should be useful as an OKF-like project bundle.",
      "Dated provider research and epistemic status are visible without being confused with timeless architecture.",
      "Operation receipts and dated model capability notes are visible without exposing raw content by default."
    ]
  }
}
---

# In-app development docs tab

## Purpose

Atomik should include its own documentation as a first-class tab during development.

The goal is not only documentation. It is apprenticeship:

```text
coding agent implements brick
  -> documents why
  -> updates index/log/context files
  -> junior architect reads inside Atomik
  -> future agent uses docs as context
  -> docs become more accurate over time
```

## MVP UI

```text
left: docs tree / project index
center: rendered Markdown
right: agent digest / module contract / related docs / context packet
top: search, tags, reading mode, Git diff later
```

## Modes

```text
human mode
  narrative explanation, diagrams later, examples

agent mode
  contracts, invariants, inputs, outputs, forbidden actions

architecture mode
  relation map of modules and decisions

context mode
  show which files would be included for a scoped agent request

execution mode
  show retrieval stages, local/cloud/tool path, budget, tokens/work units, latency, privacy, and outcome
```

## File source

The Dev Docs tab should read from:

```text
docs/
  index.md
  log.md
  bedrock/
  modules/
  adr/
  agents/
  diagrams/
  docs_source.json
```

The current flat bundle can be rendered first, but the desired direction is an OKF-like docs project with progressive-disclosure `index.md` files and chronological `log.md` files.

## Later user docs

This system can later power public user documentation. For now, optimize for project continuity, developer learning, and agent re-entry.

## Truth documentation views

The Dev Docs tab should surface:

```text
truth/evidence architecture pages
ADR-004 through ADR-008
machine claim/provider/knowledge-pack/operation-trace contracts
claim, verification, and dictionary fixtures
volatile fact register with checked_at dates
links to official provider/Wikimedia sources
```

A future “needs recheck” filter can show pricing, API, legal, and platform claims whose review date or trigger has expired. This is documentation freshness, not automatic factual certification.


## Retrieval and execution documentation views

The Dev Docs tab should make the following inspectable during implementation:

```text
retrieval ladder and active strategy
context candidates selected/omitted and why
local model/runtime capability snapshots
ActionTrace schema and sample receipts
budget and privacy policy
external facts requiring recheck
```

These are engineering observability views, not an invitation to store raw user prompts or note contents in telemetry.
