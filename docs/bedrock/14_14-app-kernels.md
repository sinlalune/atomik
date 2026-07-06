---
{
  "id": "14-app-kernels",
  "title": "App kernels and package boundaries",
  "status": "foundational",
  "tags": [
    "architecture",
    "modularity",
    "packages",
    "project-core",
    "context-core",
    "truth-core",
    "verification-core",
    "knowledge-core",
    "execution-core",
    "operation-trace",
    "hybrid-retrieval"
  ],
  "relations": [
    {
      "to": "12-electron-mvp",
      "kind": "implemented-by"
    },
    {
      "to": "15-maintainability",
      "kind": "enforces"
    },
    {
      "to": "04-file-first-model",
      "kind": "owns-boundaries-for"
    },
    {
      "to": "05-resource-selection-model",
      "kind": "uses"
    },
    {
      "to": "17-self-evolving-docs",
      "kind": "documented-by"
    },
    {
      "to": "26-okf-agent-context",
      "kind": "supports"
    },
    {
      "to": "27-git-compatibility",
      "kind": "guards"
    },
    {
      "to": "28-truth-evidence-model",
      "kind": "reserves-truth-contracts"
    },
    {
      "to": "29-verification-grounding-router",
      "kind": "reserves-provider-boundaries"
    },
    {
      "to": "30-public-knowledge-dictionary",
      "kind": "reserves-knowledge-pack-boundary"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "implements-boundaries-for"
    }
  ],
  "agent": {
    "purpose": "Preserve modular boundaries while implementing the workbench, project bundles, evidence-aware claims, source dossiers, scoped context, provider verification, and Git-friendly writes.",
    "inputs": [
      "module proposal",
      "new feature",
      "package dependency",
      "file format change"
    ],
    "outputs": [
      "package boundary",
      "interface contract",
      "dependency rule",
      "execution policy boundary",
      "operation trace contract"
    ],
    "invariants": [
      "Core kernels should be testable without Electron where possible.",
      "Renderers depend on core, not the reverse.",
      "AI consumes validators, validators never call AI.",
      "Source adapters expose selections and anchors, not direct note mutations.",
      "Project-core owns durable project membership; workspace-core owns UI layout.",
      "Git-core never becomes the only persistence layer.",
      "Truth validators do not call AI; they validate records and evidence links deterministically where possible.",
      "Grounding providers cannot bypass source-core to ingest durable knowledge.",
      "Incubating truth/citation/verification/knowledge contracts may live inside existing cores for MVP, then split only when stable.",
      "Execution policy and usage traces are cross-cutting contracts, not provider-specific UI state.",
      "Context-core uses replaceable retrieval strategies and has no mandatory vector-store dependency."
    ]
  }
}
---

# App kernels and package boundaries

## Initial monorepo shape

```text
atomik/
  apps/
    desktop/
      electron-main/
      electron-preload/
      renderer/

  packages/
    vault-core/
    project-core/
    workspace-core/
    source-core/
    markdown-core/
    context-core/
    execution-core/         # incubating; policy, budgets, ActionTrace ledger
    ai-core/
    truth-core/              # incubating; may begin inside ai-core/shared-types
    citation-core/           # incubating; anchor and citation contracts
    verification-core/       # incubating; local/tool/web verification router
    knowledge-core/          # later; versioned public knowledge packs
    git-core/                # wrapper/adapter, not a hard requirement
    graph-core/              # later
    lang-core/               # later DSL
    render-core/             # later DSL
    render-react/            # later DSL
    dev-docs-core/
    shared-types/

  docs/
    bedrock/
    adr/
    modules/
    agents/
```

## Kernel responsibilities

| Kernel | Owns | Must not own |
|---|---|---|
| `vault-core` | file tree, read/write, patches, cache boundary | rendering, AI prompts, project semantics |
| `project-core` | project bundle manifest, project resource membership, `index.md`/`log.md` conventions, project trails, project context folder | pane layout, source extraction internals, AI model calls |
| `workspace-core` | tabs, panes, view contexts, active selections, UI workspace state | durable knowledge content, source extraction |
| `source-core` | source dossiers, adapters, extraction, anchors, source viewer contracts, optional sidecars | note mutation, AI model calls |
| `markdown-core` | frontmatter, headings, links, fenced block extraction, Markdown rendering helpers | AI calls, Electron, visual layout |
| `context-core` | scoped context assembly, index/log traversal, lexical/link/structural/semantic retrieval adapters, context packet contracts, context pack generation, retrieval evaluation | model calls, silent file mutation, mandatory vector-store dependency, embedding vendor lock-in |
| `execution-core` incubating | execution policy, operation budgets, ActionTrace schema, local/cloud/tool location labels, privacy-aware usage ledger, cost normalization | model/tool implementation, provider pricing as timeless constants, raw prompt/output capture by default |
| `ai-core` | operation contracts, prompt wrappers, response bundles, patch proposals, model provider adapters, AI repair loops | silent file writes, source rendering, declaring claims true, owning the cross-provider usage ledger |
| `truth-core` incubating | claim/evidence/verification schemas, epistemic labels, contradiction and freshness contracts | model calls, source import, universal source ranking |
| `citation-core` incubating | citation mapping, source anchors, quote hashes, citation diagnostics | deciding whether a source is factually correct |
| `verification-core` incubating | risk router, deterministic/local/web verification plans, provider usage/cost traces | durable source ingestion, silent note writes |
| `knowledge-core` later | versioned knowledge-pack manifests, licensing/attribution, pack retrieval interfaces | user note ownership, hidden canonical knowledge |
| `git-core` | Git status/diff helpers, ignore templates, optional commit integration | canonical storage, remote sync policy, mandatory dependency |
| `dev-docs-core` | docs manifest, documentation rendering contracts, module notes, ADR index | product runtime logic |
| `graph-core` later | wikilink graph, typed relation graph, backlinks, relation diagnostics | canvas persistence, AI generation |
| `lang-core` later | DSL tokenize/parse/validate/normalize/print/diagnostics | React, DOM, filesystem, AI |
| `render-core` later | scene model, marks/layouts, theme tokens | parser, AI prompts |

## Dependency direction

```text
app adapters -> kernels -> shared types
renderer UI -> workspace/project/source/vault/context APIs
Electron main -> vault/source native capabilities
git-core -> shell/libgit adapter only
context-core -> vault/project/markdown/source indexes + replaceable retrieval adapters
execution-core -> shared operation IDs, budgets, traces, provider capability snapshots
AI core -> context/source/markdown/truth/execution contracts
verification-core -> deterministic tools + provider adapters
truth/citation validators -> no AI
verification provider -> never writes vault directly
docs -> read everything, own nothing runtime-critical
```

## Project-core boundary

`project-core` owns the durable subject workspace:

```text
project root
project manifest
project resource membership
project index/log conventions
project trails
project context pack locations
OKF import/export profile
```

It must not own:

```text
pane layout
scroll positions
source renderer internals
AI provider calls
hidden canonical knowledge
```

## Context-core boundary

`context-core` turns file structure into bounded agent context:

```text
scope -> index.md/log.md -> frontmatter summaries -> link traversal -> retrieval -> context packet
```

It must not decide what the AI says. It only assembles inspectable inputs.

## Execution-core boundary

`execution-core` is an incubating contract for decisions and receipts shared by retrieval, AI, transcription, autocomplete, verification, and patch application:

```text
ExecutionPolicy
OperationBudget
ActionTrace
usage ledger
budget enforcement
local/cloud/tool capability labels
cost and privacy receipts
```

For the earliest MVP, the types may live in `shared-types` and the ledger service may live beside `ai-core`. Split a package only when retrieval, transcription, verification, and editor assistance are real independent consumers. The boundary applies immediately even if the folder does not.

It must not record raw content by default or pretend local execution is economically free. Provider prices remain dated capability snapshots.

## Git-core boundary

`git-core` is optional glue:

```text
status
diff
ignore template
commit helper later
history/rollback later
```

Atomik must remain usable without Git installed. Git compatibility is a file-writing discipline, not a database dependency.

## Design goal

Adding a new source adapter, AI operation, context strategy, or Git feature should not require rewriting tabs, vault, AI, and docs at once. It should add an adapter, contracts, tests, and documentation.

## Incubation rule for truth packages

Do not create four empty packages merely because the architecture names them.

For the MVP:

```text
shared-types
  ClaimRecord / EvidenceRecord / VerificationEvent

ai-core
  response bundle and provider adapter

context-core
  local evidence retrieval

source-core
  durable source import and anchors

renderer
  minimal Truth Lens
```

Split `truth-core`, `citation-core`, `verification-core`, and `execution-core` when their contracts have multiple consumers and stable tests. `knowledge-core` arrives with actual public-knowledge packs. The boundary rules apply before the package folders necessarily exist.

## Critical dependency rule

```text
Grounding provider -> transient verification result
Source adapter -> explicit durable import
Truth core -> compares claims/evidence/results
Vault core -> applies accepted patch
```

No provider adapter may silently turn search links or grounded output into canonical project knowledge.


## Retrieval dependency rule

```text
explicit selection and scope
  -> filenames/headings/frontmatter/links/full-text search
  -> structural parsers and LSP where available
  -> optional local embeddings
  -> optional reranker
  -> bounded external retrieval
  -> inspectable ContextPacket
```

No vector database is required for the first useful Atomik. Embeddings and rerankers are replaceable derived services selected only when evaluation shows useful gains.
