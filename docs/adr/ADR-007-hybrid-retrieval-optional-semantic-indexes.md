# ADR-007: Hybrid retrieval and optional semantic indexes

Status: accepted
Date: 2026-06-23

## Context

Atomik needs search and context assembly across Markdown, source dossiers, code, and future knowledge packs. “RAG” is often used as shorthand for embeddings plus a vector database, but coding agents frequently obtain better exact context through paths, grep, syntax trees, and language-server information. Semantic retrieval can help conceptual, paraphrase, and cross-language queries, but it adds model, index, storage, latency, and maintenance cost.

## Decision

Atomik separates search, context compilation, and generation. Retrieval is strategy-pluggable and follows the cheapest sufficient path:

```text
explicit selection/direct scope
  -> path/heading/frontmatter/link/exact/full-text retrieval
  -> structural retrieval through Markdown AST, Tree-sitter, or LSP
  -> optional local semantic embeddings
  -> optional local reranking
  -> bounded external retrieval
  -> inspectable ContextPacket
```

No vector database or embedding service is required for the first useful product. Embeddings, rerankers, and their indexes are rebuildable derived state. A semantic stage becomes a default only after a representative Atomik evaluation demonstrates material accepted-value gains over the lexical/link/structural baseline.

## Consequences

- MVP retrieval can use ripgrep/SQLite FTS5 plus file structure and links.
- Code retrieval can use identifiers, Tree-sitter, and LSP before embeddings.
- Local embedding models can be evaluated without creating provider lock-in.
- Context packets record retrieval stages, candidates, selected entries, omitted material, tokens, and trace IDs.
- Retrieval relevance never becomes epistemic support automatically.
- Device tiers can disable semantic retrieval without losing canonical knowledge.

## Alternatives considered

- Embedding/vector database first: adds cost and complexity before baseline value is known.
- Lexical-only forever: misses conceptual, paraphrase, and cross-language matches.
- Cloud semantic retrieval as mandatory: conflicts with local-first/privacy goals.
- Full-file stuffing: wastes context and hides why material was selected.

## Migration / rollback

Semantic indexes can be deleted and rebuilt. The lexical/link/structural baseline remains operational. Changing embedding models requires a new derived index and capability/evaluation record, not a canonical file migration.

## Links

- `26_26-okf-agent-context.md`
- `33_33-retrieval-local-execution-cost.md`
- `34_34-local-execution-investigation-record.md`
- `operation_trace_contract_v0_1.json`
