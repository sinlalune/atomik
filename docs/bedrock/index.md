---
type: Atomik Index
title: Bedrock — the constitution, page by page
description: One line per bedrock page with its status, plus the entry points an agent should read first, so the nearest index answers "which page is this in?" without opening thirty-seven files.
tags: [bedrock, index, architecture, constitution, okf]
timestamp: 2026-08-24T00:00:00Z
---

# Bedrock

The constitution: what the architecture SHOULD be. Code and tests are what exists;
[coding paths](../../atomik-project/coding-paths/ACTIVE.md) are what is changing.
Bedrock is never invented in passing — a page changes with a decision beside it in
[`docs/adr/`](../adr/index.md), which the advisory `decision-drift` rule watches.

## Start here

- **[00 — orientation](./00_00-orientation.md)** if this is your first session: the thesis everything else serves.
- **[22 — agent handoff](./22_22-agent-handoff.md)** to execute: the per-step protocol, ceremonies, gate discipline.
- **[24 — doc templates](./24_24-doc-templates.md)** to write anything durable: path, ADR, module note, session note, brief.
- **[35 — coding paths and the execution-state plane](./35_35-coding-path-execution-state.md)** for how execution state lives in files.

Operating detail for parallel work is NOT here: it is in
[`paths.md`](../../atomik-project/coding-paths/paths.md), which may change without
amending a bedrock page. Bedrock states doctrine; where the two disagree, that is a
defect to report (`AGENTS.md`).

## Status vocabulary

```text
foundational      durable architecture — change it only with an ADR
ready-to-use      a working procedure agents follow today
mvp / planned     scoped for a milestone, or specified and not yet built
reserved          a future direction deliberately not implemented
planning          roadmap and sequencing
supporting        external references and constraints
living / living-research   dated records that keep accumulating evidence
```

Superseded drafts are retained under [`archive/`](./archive/) — demotion, never
deletion.

## Pages

- **[00 — Orientation: Atomik Bedrock](./00_00-orientation.md)** · foundational  
  Keep every implementation aligned with the local-first, file-first, evidence-aware, cost-observable, OKF-compatible workbench thesis.
- **[01 — Workbench first, DSL later](./01_01-workbench-first.md)** · foundational  
  Prevent premature implementation of DSL/canvas before the workbench loop, project folder model, and Markdown patch flow are useful.
- **[02 — The learning loop](./02_02-learning-loop.md)** · foundational  
  Use the loop as the acceptance lens for features and implementation tasks.
- **[03 — Workspace, tabs, and panes](./03_03-workspace-tabs.md)** · foundational  
  Keep UI workspace state separate from durable project content and make selections first-class.
- **[04 — File-first, OKF-compatible workspace model](./04_04-file-first-model.md)** · foundational  
  Preserve local files as the durable source of record while adding project workspaces, evidence-aware claims, raw sources, source dossiers, trails, context packs, and Git-friendly diffs.
- **[05 — Resource, view, selection, and scope model](./05_05-resource-selection-model.md)** · foundational  
  Use stable types between projects, workspace, sources, retrieval/context compilation, execution policy, AI operations, and future DSL/canvas.
- **[06 — AI operation, context, and patch pipeline](./06_06-ai-patch-pipeline.md)** · foundational  
  Keep AI behavior adaptive while making context assembly scoped, claims/evidence inspectable, verification cost-aware, outputs structured, patches reviewable, and files durable.
- **[07 — Source adapter and dossier model](./07_07-source-adapters.md)** · foundational  
  Model new input types as source adapters that preserve originals, produce Markdown source dossiers, expose anchors/selections, and never directly mutate notes.
- **[08 — Capture source: phone photos and handwritten notes](./08_08-capture-source.md)** · mvp  
  Implement phone capture as a source adapter with secure local upload, preserved original image, Markdown source dossier, and optional transcription patches.
- **[09 — Web source tab](./09_09-web-source-tab.md)** · planned  
  Implement web browsing as an isolated source viewer while saving reader text, snapshots, anchors, and source.md dossiers as local knowledge files.
- **[10 — PDF source tab](./10_10-pdf-source-tab.md)** · mvp  
  Model PDF as original document plus Markdown source dossier, extracted text, page anchors, and source-grounded note patches.
- **[11 — Markdown note and concept model](./11_11-markdown-page-model.md)** · foundational  
  Keep notes readable, adaptive, OKF-compatible where useful, and useful before graph/DSL/canvas systems exist.
- **[12 — Electron MVP architecture](./12_12-electron-mvp.md)** · foundational  
  Guide implementation of the first desktop shell without mixing trusted app UI and untrusted content.
- **[13 — Electron security contract](./13_13-electron-security.md)** · foundational  
  Prevent dangerous Electron shortcuts during MVP implementation.
- **[14 — App kernels and package boundaries](./14_14-app-kernels.md)** · foundational  
  Preserve modular boundaries while implementing the workbench, project bundles, evidence-aware claims, source dossiers, scoped context, provider verification, and Git-friendly writes.
- **[15 — Maintainability and module learning notes](./15_15-maintainability.md)** · foundational  
  Require implementations to teach their architectural role instead of only adding code, and to keep file changes reviewable.
- **[16 — In-app development docs tab](./16_16-dev-docs-tab.md)** · mvp  
  Implement a docs view early enough that architecture explanations, module contracts, and agent context are always one tab away.
- **[17 — Self-evolving documentation system](./17_17-self-evolving-docs.md)** · foundational  
  Enforce documentation updates as part of every core implementation and make docs usable as a human/agent knowledge bundle.
- **[18 — MVP roadmap: daily-use first, truth-aware from the AI loop](./18_18-roadmap.md)** · planning  
  The workbench remains first; minimal truth and operation-cost traces arrive with the first AI loop, followed by local capture/transcription, hybrid retrieval, measured local assistance, public knowledge, and later DSL/canvas.
- **[19 — Atomik DSL future architecture](./19_19-dsl-future.md)** · reserved  
  Keep the DSL architecture ready but avoid implementing it before workbench usefulness.
- **[20 — Relations and graph future](./20_20-relations-future.md)** · reserved  
  Prepare typed graph structure without prematurely forcing every note into graph-first modeling.
- **[21 — Canvas future](./21_21-canvas-future.md)** · reserved  
  Keep canvas as a projection layer over files, not an app-owned knowledge database.
- **[22 — Coding agent bootstrap protocol](./22_22-agent-handoff.md)** · ready-to-use  
  Define how any coding agent enters, executes, and leaves work on Atomik so that all execution state survives in files rather than conversation threads.
- **[23 — External references and current constraints](./23_23-references.md)** · supporting  
  Use official documentation as the source for platform, security, provider, pricing, licensing, and format claims; preserve checked dates and update links when they change.
- **[24 — Documentation templates](./24_24-doc-templates.md)** · ready-to-use  
  Provide concrete reusable formats for maintaining the project knowledge base.
- **[25 — Personal use-case pressure tests](./25_25-use-cases.md)** · living  
  Use real learning goals to pressure-test the architecture without turning the app into a domain-specific product.
- **[26 — OKF-compatible agent context model](./26_26-okf-agent-context.md)** · foundational  
  Atomik should shape project folders so humans and agents can navigate large knowledge bases through index.md, log.md, links, frontmatter, and scoped retrieval rather than flat chunk stuffing.
- **[27 — Git compatibility contract](./27_27-git-compatibility.md)** · foundational  
  Atomik vaults and project bundles must be useful inside ordinary Git repositories: canonical knowledge is diffable, caches are ignored, binary originals have clear modes, and accepted AI patches create meaningful diffs.
- **[28 — Truth, evidence, and epistemic status](./28_28-truth-evidence-model.md)** · foundational  
  Atomik does not treat model output, file persistence, citations, or human acceptance as truth by themselves; it records claim type, evidence, verification, freshness, disagreement, and review state so knowledge can be inspected and repaired.
- **[29 — Verification router, grounding, and model strategy](./29_29-verification-grounding-router.md)** · foundational  
  Atomik routes claims through local project evidence, local public knowledge, live web verification, and human review according to risk, freshness, privacy, and cost; Google Search grounding is a transient verifier, not a knowledge-ingestion pipeline.
- **[30 — Public knowledge baseline and smart dictionary](./30_30-public-knowledge-dictionary.md)** · foundational  
  Atomik may use versioned Wikimedia and other open knowledge packs as a broad local baseline while preserving attribution, freshness, uncertainty, specialist-source escalation, and a richer lexicographic/etymological model than flat definitions.
- **[31 — Truth Lens and challenge-repair UX](./31_31-truth-lens-ux.md)** · planned  
  The Truth Lens gives progressive, claim-level access to provenance, verification, freshness, disagreement, and repair actions without overwhelming ordinary reading or pretending that a green badge guarantees truth.
- **[32 — Truth iteration investigation record](./32_32-truth-investigation-record.md)** · living-research  
  A dated record of the architectural, product, cost, privacy, provider-term, Wikimedia, lexicographic, and local-model findings that led to Atomik's truth/evidence design, including volatile facts that must be rechecked.
- **[33 — Retrieval, local inference, and operation cost](./33_33-retrieval-local-execution-cost.md)** · foundational  
  Atomik treats retrieval as a strategy-pluggable context-compilation system, uses local models where measured capability justifies them, and emits privacy-aware operation receipts across search, transcription, autocomplete, generation, verification, and patches.
- **[34 — Retrieval and local execution investigation record](./34_34-local-execution-investigation-record.md)** · living-research  
  A dated record of current hybrid retrieval, on-device embedding, local speech recognition, edit prediction, and GenAI observability candidates that informed Atomik v0.5; all capability facts require recheck.
- **[35 — Coding paths, work ledger, and the execution-state plane](./35_35-coding-path-execution-state.md)** · foundational  
  Give implementation work a durable, file-backed execution state so no task depends on a chat thread, a context window, or a compressed brief as its primary memory.
- **[36 — UI design system — organic future, zen minimalism, glass chrome](./36_36-ui-design-system.md)** · foundational  
  Give every UI change one visual doctrine — tokens, themes, component rules, and accessibility floors — so interfaces built by different sessions read as one product.
