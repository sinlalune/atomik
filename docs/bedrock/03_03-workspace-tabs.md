---
{
  "id": "03-workspace-tabs",
  "title": "Workspace, tabs, and panes",
  "status": "foundational",
  "tags": [
    "workspace",
    "tabs",
    "panes",
    "ux",
    "project",
    "truth-lens",
    "verification",
    "operation-receipt",
    "cost-observability"
  ],
  "relations": [
    {
      "to": "04-file-first-model",
      "kind": "renders-projects-from"
    },
    {
      "to": "05-resource-selection-model",
      "kind": "hosts"
    },
    {
      "to": "12-electron-mvp",
      "kind": "implemented-by"
    },
    {
      "to": "09-web-source-tab",
      "kind": "opens"
    },
    {
      "to": "10-pdf-source-tab",
      "kind": "opens"
    },
    {
      "to": "31-truth-lens-ux",
      "kind": "hosts"
    },
    {
      "to": "28-truth-evidence-model",
      "kind": "inspects"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "surfaces-operation-receipts-from"
    }
  ],
  "agent": {
    "purpose": "Keep UI workspace state separate from durable project content and make selections first-class.",
    "inputs": [
      "open project",
      "open resource",
      "active view",
      "pane tree",
      "user selection"
    ],
    "outputs": [
      "workspace layout",
      "active tab",
      "selection context",
      "view state",
      "active claim/evidence inspection state",
      "active operation-receipt inspection state"
    ],
    "invariants": [
      "Tabs are not files; tabs are views over resources.",
      "A resource can have multiple views.",
      "Pane layout is recoverable UI state, not knowledge truth.",
      "Project folders are durable knowledge context, not transient UI state.",
      "Every selectable view should eventually expose a Selection object.",
      "Truth Lens layout is recoverable UI state; accepted evidence and repairs remain durable files.",
      "Operation receipt layout is recoverable UI state; accepted patches and explicit aggregate reports are durable files.",
      "Compact local/cloud/cost indicators must expand into inspectable traces without cluttering the writing surface."
    ]
  }
}
---

# Workspace, tabs, and panes

## Design target

Atomik should feel like a minimalist learning cockpit:

```text
left: project tree / source tree / trail
center: current note or source
right: AI explanation / Truth Lens / patch preview / context inspector / operation receipt
optional bottom: search, backlinks, graph, dev docs, future scene preview
```

The key distinction:

```text
project bundle = what I am thinking about
workspace layout = how I arranged the app today
```

A project bundle is durable. A workspace layout is recoverable.

## Tab types for MVP

```text
project-overview
markdown-editor
markdown-preview
ai-panel
source-image
source-pdf
source-web
source-dossier
dev-docs
search
operation-receipt
settings
```

## Future tab types

```text
agent-context
atomik-scene
canvas
graph
code-notebook
media-transcript
query/base
git-diff
truth-lens
verification-report
```

## Pane operations

```text
split horizontal
split vertical
resize panes
move tab between panes
close tab
pin tab
focus mode
open selection in side pane
open source dossier beside original
open agent context beside patch preview
open evidence anchor beside a selected claim
open verification report beside a repair diff
open operation receipt beside an AI answer, transcript, completion, verification, or patch
```

## Workspace over project resources

Tabs open resources that live inside or are referenced by a project bundle:

```text
notes/attention-qkv.md
sources/pdf/attention-is-all-you-need/source.md
sources/pdf/attention-is-all-you-need/original.pdf
sources/web/visual-guide/reader.md
trails/transformer-reading-path.md
context/current-brief.md
```

The same source can be viewed several ways:

```text
original PDF view
extracted Markdown view
quote list
source dossier
AI context view
```

## Persistence model

Workspace layout should be saved as UI state:

```json
{
  "projectRoot": "projects/ai-formation",
  "tabs": [
    { "id": "tab_1", "resourceId": "notes/attention.md", "view": "markdown-editor" },
    { "id": "tab_2", "resourceId": "sources/captures/2026-06-14-handwritten-attention/source.md", "view": "source-image" }
  ],
  "layout": {
    "kind": "split",
    "direction": "horizontal",
    "children": ["tab_1", "tab_2"]
  }
}
```

This file should be recoverable or disposable. The durable knowledge lives in project files, notes, source dossiers, logs, trails, and accepted AI patches.

## Git rule for workspace files

Atomik may support two workspace state files:

```text
.atomik/workspace.json          optional shared project layout
.atomik/local-workspace.json    ignored machine-local layout
```

The app must not rewrite project content just because the user resized a pane.

## Truth Lens workspace behavior

The Truth Lens is a view over claims and evidence, not a second canonical database.

```text
selected sentence in answer/note
  -> claim inspector opens
  -> source anchor opens in adjacent pane
  -> optional verification report opens
  -> repair patch preview opens
```

Closing the pane may discard temporary inspection state. Accepted citations, claim status, verification notes, and corrections remain in project files or explicitly committed sidecars.


## Operation receipt behavior

The normal writing surface shows only a compact badge:

```text
Local · €0 external · 1.8 s
Cloud · €0.004 estimated · 1,240 in / 310 out
Tool · 18 candidates -> 4 selected · 46 ms
```

Selecting the badge opens an `operation-receipt` view with parent/child actions, retrieval stages, model/tool/runtime identity, budgets, tokens or other work units, latency, privacy boundary, external billing, and accepted/edited/rejected outcome. Raw note, prompt, transcript, and output content stays absent unless the user explicitly enables content capture.
