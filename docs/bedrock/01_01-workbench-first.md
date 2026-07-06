---
{
  "id": "01-workbench-first",
  "title": "Workbench first, DSL later",
  "status": "foundational",
  "tags": [
    "mvp",
    "roadmap",
    "scope",
    "workspace",
    "truth",
    "evidence",
    "cost-observability",
    "local-inference"
  ],
  "relations": [
    {
      "to": "03-workspace-tabs",
      "kind": "uses"
    },
    {
      "to": "04-file-first-model",
      "kind": "persists-to"
    },
    {
      "to": "06-ai-patch-pipeline",
      "kind": "depends-on"
    },
    {
      "to": "18-roadmap",
      "kind": "orders"
    },
    {
      "to": "19-dsl-future",
      "kind": "defers"
    },
    {
      "to": "28-truth-evidence-model",
      "kind": "adds-minimal-trust-contract"
    },
    {
      "to": "31-truth-lens-ux",
      "kind": "reserves-progressive-disclosure"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "adopts-minimum-trace-from"
    }
  ],
  "agent": {
    "purpose": "Prevent premature implementation of DSL/canvas before the workbench loop, project folder model, and Markdown patch flow are useful.",
    "inputs": [
      "feature request",
      "implementation proposal",
      "current milestone"
    ],
    "outputs": [
      "accept now",
      "defer",
      "reserve extension point"
    ],
    "invariants": [
      "Build the workbench before the visual language.",
      "Do not block daily usability on future scene/canvas systems.",
      "Reserve interfaces so future DSL/canvas can attach cleanly.",
      "Every early feature should improve the project -> source -> note -> patch loop.",
      "The early AI loop exposes minimal evidence status without waiting for a complete claim graph.",
      "The first AI loop emits a minimal operation trace rather than deferring cost visibility.",
      "Direct, lexical, and structural retrieval precede optional semantic retrieval by default."
    ]
  }
}
---

# Workbench first, DSL later

## Decision

Atomik v0 should be an **AI learning workbench**, not a DSL-first visual system.

The first app should let the creator use it daily while building it:

```text
open a project folder
open notes
open raw sources and source dossiers
split panes
select text/image/code/math/page regions
ask AI
preview a patch
save output into Markdown
keep provenance
inspect source/evidence status when factual claims are introduced
review the Git diff
continue learning without leaving the app
```

## Why this order is correct

Atomik exists because no current app combines a flexible multi-source workspace, AI explanation, durable local file output, and project-level memory in a minimalist interface. If the first prototype starts with the DSL or canvas, it risks becoming a beautiful engine that does not yet solve the urgent need.

The workbench also becomes a feedback amplifier:

```text
use Atomik to learn Electron
use Atomik to read docs
use Atomik to design Atomik
use Atomik to document Atomik
use Atomik to generate its own context packs
use Atomik to improve its own roadmap
```

## What is deferred

Deferred does not mean forgotten.

| Feature | Status | Architectural treatment |
|---|---|---|
| Atomik DSL | later | reserve block extraction, scene artifact type, future renderer slot |
| Canvas | later | reserve canvas resource type and relation graph model |
| Typed relations | after notes/sources | keep frontmatter, links, and relation block slots ready |
| Rich visual scenes | after plain text/math/code AI outputs | preserve output block extension points |
| Deep agent navigation | after file/project model works | reserve `index.md`, `log.md`, context-pack, and scoped retrieval contracts |

## Early MVP definition

```text
Atomik Workbench v0 = Electron desktop shell
  + local vault/project bundle
  + Markdown editor/preview
  + tabs/panes
  + source dossiers
  + AI over selections
  + minimal claim/evidence status
  + minimal execution/cost receipt
  + patch preview
  + source capture
  + Git-friendly writes
```

## Non-negotiable

Do not let future DSL/canvas architecture slow down the first daily-use workbench. The correct compromise is to define extension points now, but implement the minimum useful product first.

The early app must already respect the deeper vision:

```text
raw source assets stay preserved
source knowledge is described in Markdown dossiers
notes are Markdown
project folders use index.md and log.md
AI writes through reviewable patches
important factual claims can expose evidence and uncertainty
every AI operation exposes local/cloud/tool identity, usage, latency, and external cost when known
cache/index/embedding state is rebuildable
```

## Truth-aware without overbuilding

The truth iteration does not reverse the workbench-first decision. Do not delay useful editing, source viewing, and patch review until a global claim graph exists.

The first workbench should reserve and demonstrate:

```text
source-backed vs model-only output
needs-citation status
source dossier + anchor links
one targeted “verify claim” action
one “challenge and repair” patch flow
```

Full contradiction dashboards, knowledge packs, automatic staleness review, and advanced etymology graphs remain later milestones.


## Local-first without blocking usefulness

The MVP should not require a vector database or a continuously running local model. Begin with direct scope, Markdown structure, links, filenames, headings, full-text search, and deterministic editor completion. Add local embeddings, speech recognition, or edit prediction only behind replaceable adapters and measured acceptance tests.

A local action may display `€0 external`, but it must not imply zero compute, zero latency, or zero privacy risk. The first AI mock should already produce the same minimal action receipt later used by real local and cloud providers.
