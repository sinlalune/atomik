# ADR-001: File-first, OKF-compatible project bundles

Status: accepted
Date: 2026-06-17

## Context

The original vault skeleton preserved local files but did not fully express the user's mental model: working on a subject that gathers web pages, PDFs, notes, captures, trails, questions, and synthesis in a shared working directory.

OKF v0.1 also suggests that agent-readable knowledge should be represented as a directory of Markdown files with YAML frontmatter, optional `index.md` files for progressive disclosure, optional `log.md` files for history, and standard Markdown links.

## Decision

Atomik uses a file-first, workspace-aware model. Project files are the durable source of record for Atomik state; their presence does not by itself establish the factual truth of their contents:

```text
vault -> project bundle -> source dossier/note/trail/context -> workspace view
```

A project bundle is a durable folder, not hidden UI state. It may contain `index.md`, `log.md`, notes, source dossiers, raw assets, trails, context packs, and a lightweight project manifest.

Atomik should be OKF-compatible where practical, but not OKF-limited.

## Consequences

- Agents can re-enter a project by reading files rather than relying on chat history.
- The folder tree becomes a progressive-disclosure map, not the only UI.
- App workspace state remains recoverable and non-canonical.
- Indexes, embeddings, and RAG stores are derived from files.
- Claim-level epistemic support is governed separately by ADR-004; file authority and epistemic authority must not be conflated.

## Alternatives considered

- Raw vault skeleton only: too weak for active subject work.
- Hidden database project model: conflicts with file-first durability.
- Full OKF conformance as the entire internal model: too restrictive for source viewers, anchors, assets, patches, and future canvases.

## Migration / rollback

Existing vaults can keep their flat structure. Atomik can introduce `projects/<slug>/` gradually and move/copy resources through explicit user action.

## Links

- `04_04-file-first-model.md`
- `26_26-okf-agent-context.md`
- `ADR-004-claim-level-truth-evidence.md`
