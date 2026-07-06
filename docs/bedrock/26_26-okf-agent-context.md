---
{
  "id": "26-okf-agent-context",
  "title": "OKF-compatible agent context model",
  "status": "foundational",
  "eyebrow": "Agent memory",
  "summary": "Atomik should shape project folders so humans and agents can navigate large knowledge bases through index.md, log.md, links, frontmatter, and scoped retrieval rather than flat chunk stuffing.",
  "tags": [
    "okf",
    "agent",
    "context",
    "retrieval",
    "project-bundle",
    "claims",
    "evidence",
    "truth-routing",
    "hybrid-retrieval",
    "lexical-search",
    "structural-search",
    "local-embeddings",
    "context-compilation"
  ],
  "relations": [
    {
      "to": "04-file-first-model",
      "kind": "extends"
    },
    {
      "to": "05-resource-selection-model",
      "kind": "uses-scope-from"
    },
    {
      "to": "06-ai-patch-pipeline",
      "kind": "feeds"
    },
    {
      "to": "17-self-evolving-docs",
      "kind": "implements"
    },
    {
      "to": "27-git-compatibility",
      "kind": "benefits-from"
    },
    {
      "to": "28-truth-evidence-model",
      "kind": "retrieves-evidence-for"
    },
    {
      "to": "29-verification-grounding-router",
      "kind": "feeds-local-layer"
    },
    {
      "to": "30-public-knowledge-dictionary",
      "kind": "retrieves-installed-packs"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "implements-retrieval-ladder-from"
    },
    {
      "to": "35-coding-path-execution-state",
      "kind": "extended-by"
    }
  ],
  "agent": {
    "purpose": "Define how agents should navigate Atomik projects under context limits using OKF-like directory conventions and scoped retrieval.",
    "inputs": [
      "project root",
      "index.md",
      "log.md",
      "frontmatter",
      "Markdown links",
      "source references",
      "user query",
      "selection",
      "claim records",
      "evidence anchors",
      "verification history",
      "installed knowledge-pack metadata"
    ],
    "outputs": [
      "context packet",
      "context pack",
      "file patch proposal",
      "retrieval diagnostics",
      "evidence-aware context packet",
      "claim coverage diagnostics",
      "retrieval plan",
      "retrieval stage trace",
      "evaluation report"
    ],
    "invariants": [
      "Do not flatten the project too early.",
      "Use the hierarchy for progressive disclosure.",
      "Use links and source references as traversal hints.",
      "Context packets should be inspectable.",
      "Accepted insights must patch files.",
      "Context retrieval may find candidate evidence, but retrieval score is not truth status.",
      "RAG is not synonymous with embeddings or a vector database.",
      "Use the cheapest sufficient retrieval stage and stop when context is adequate.",
      "Semantic retrieval is optional, local-capable, replaceable, and evaluated against lexical/structural baselines."
    ]
  }
}
---

# OKF-compatible agent context model

## Thesis

OKF is not only a storage shape. It is a way to make a large knowledge base navigable by humans and agents under context limits.

Atomik should use this pattern early:

```text
folder hierarchy
  -> index.md progressive disclosure
  -> log.md recent history
  -> frontmatter summaries
  -> Markdown links and source references
  -> scoped retrieval
  -> context packet
  -> reviewable patch
```

This is stronger than generic RAG over flat chunks. It gives the agent a map before it starts reading. In Atomik, “RAG” describes generation informed by retrieved context; it does not prescribe embeddings, a vector database, or one retriever.

## Scope levels

A query can be run at different levels of hierarchy:

```text
vault
project
folder
source dossier
note
selection
```

Examples:

```text
"What are the open architecture risks?"
  scope: project/atomik

"Explain this paragraph."
  scope: selected source dossier

"Update the roadmap with the Git constraint."
  scope: docs/bedrock

"Find all notes sourced from this PDF."
  scope: source dossier folder
```

## Progressive disclosure files

Each meaningful folder may include:

```text
index.md
  what is inside this folder and why it matters

log.md
  recent meaningful changes in this scope
```

An agent should read the nearest relevant `index.md` before opening many files. It should read `log.md` when recency matters or when re-entering a long-running project.

## Context packet assembly

```text
1. Resolve scope
   current workspace, selected project, active file, selected source, user query

2. Read local index.md
   understand available subfolders and concepts before opening files

3. Check log.md
   identify recent decisions, changes, and deprecations

4. Traverse selectively
   follow Markdown links, backlinks, tags, source references, and pinned resources

5. Retrieve within scope
   begin with explicit selection, paths, headings, frontmatter, links, exact/full-text search, and structural indexes
   use local embeddings or reranking only when the baseline misses conceptual or cross-language matches

6. Build a context budget
   include relevant excerpts, notes, decisions, source dossiers, and open questions

7. Answer or propose patches
   every durable improvement goes back to Markdown/source dossiers/logs/indexes/context files
```

## Retrieval is strategy-pluggable

Atomik should separate three concerns:

```text
search
  query -> candidate resources

context compilation
  candidates -> bounded, inspectable ContextPacket

generation or action
  ContextPacket -> answer, plan, or patch
```

Default retrieval ladder:

```text
0. explicit selection, open tabs, pinned resources, and direct paths
1. filenames, headings, frontmatter, links, exact grep, SQLite FTS5/BM25
2. structure: Markdown AST, Tree-sitter, LSP symbols/definitions/references
3. optional local semantic embeddings for conceptual, cross-language, or paraphrase search
4. optional local reranker for ambiguous or large candidate sets
5. bounded external retrieval only for freshness, missing knowledge, or verification
6. context compiler selects the smallest sufficient inspectable packet
```

The ladder is not a mandatory waterfall. A query planner may skip stages when the scope or intent is explicit. Every stage records why it ran, candidates considered, selected entries, latency, and context tokens.

Typical defaults:

| Content | First retrieval path |
|---|---|
| source code | path/grep + Tree-sitter/LSP |
| Markdown project | headings/frontmatter/links + FTS5 |
| current note or selected source | direct read; no index required |
| conceptual natural-language search | lexical baseline, then optional semantic hybrid |
| cross-language search | optional multilingual embeddings after evaluation |
| current factual claim | local evidence, then verification router |

No vector database is required for the first useful Atomik.

## Context packet shape

```ts
type ContextPacket = {
  id: string
  query: string
  scope: ContextScope
  strategy: 'selection-first' | 'project-brief-first' | 'source-grounded' | string
  retrieval: {
    stages: Array<'direct' | 'lexical' | 'link' | 'structural' | 'semantic' | 'rerank' | 'external' | string>
    candidates: number
    selected: number
    contextTokens?: number
    cacheHit?: boolean
    traceIds?: string[]
  }
  entries: Array<{
    path: string
    reason: string
    excerpt?: string
    frontmatter?: Record<string, unknown>
    anchors?: string[]
    claimIds?: string[]
    evidenceRole?: 'supports' | 'contradicts' | 'qualifies' | 'background' | 'defines'
    sourceClass?: 'primary' | 'secondary' | 'tertiary' | 'user-source' | 'unknown'
    freshness?: string
  }>
  omitted?: Array<{
    path: string
    reason: string
  }>
}
```

The UI can show the context packet as a side tab so the user understands what the agent is using.

## Context packs vs context packets

```text
context packet
  ephemeral input assembled for one AI operation

context pack
  durable project re-entry bundle stored in context/*.md

coding path
  durable execution route and checkpoint for one implementation task
  (bedrock 35); the pack solves re-entry, the path solves execution continuity
```

A context pack might include:

```text
context/current-brief.md
context/agent-handoff.md
context/recent-decisions.md
context/open-questions.md
context/selected-sources.md
context/manifest.json
```

The context pack solves project migration across chats, coding agents, or devices. The context packet solves one operation.

## What the agent should patch

When an agent learns something that should survive, it should propose patches to one or more of:

```text
note file
source.md dossier
project/index.md
project/log.md
context/current-brief.md
context/open-questions.md
architecture decision record
module learning note
```

It should not rely on hidden conversation memory.

## Query and retrieval engine

A future query engine can combine:

```text
frontmatter filters
folder scope
Markdown link graph
backlinks
source references
exact search and ripgrep
SQLite FTS5/BM25
Markdown AST
Tree-sitter and LSP for code
optional local embeddings and reranking
recency from log.md
Git history later
```

But the canonical material remains files.

## Agent checklist

```text
Before answering a project-level question:
  - identify the requested scope
  - read the nearest index.md
  - check log.md if recency matters
  - prefer source dossiers and notes over raw assets unless original fidelity is needed
  - cite or preserve provenance for source-grounded claims
  - propose file patches for durable insights
  - update context packs when the project state changes
```

## Evidence-aware context assembly

Retrieval relevance and epistemic support are different.

```text
high embedding similarity
  means likely relevant
  not necessarily reliable or supporting
```

A truth-aware context packet can record:

```text
which claim an entry relates to
whether it supports, contradicts, qualifies, defines, or only provides background
source class and revision date
source independence group
freshness
why the entry was selected
what relevant material was omitted by budget
```

The agent should search local project evidence and installed public-knowledge packs before live web verification when adequate. Current or high-risk claims can then be escalated by the verification router.

A context pack may include a durable `open-claims.md`, `disputed-claims.md`, or `stale-claims.md`, but those files remain explicit project knowledge rather than hidden retrieval state.


## Retrieval evaluation gate

Before enabling semantic retrieval by default, compare it with the lexical/link/structural baseline on a small representative set:

```text
real project questions
exact identifier/path questions
conceptual paraphrases
cross-language questions
source-backed claim lookup
code definition/reference lookup
```

Record recall or answer-support coverage, latency, peak memory, index build/update time, storage, device class, and context tokens sent downstream. Adopt semantic retrieval only where it adds enough accepted value to justify its operational cost.
