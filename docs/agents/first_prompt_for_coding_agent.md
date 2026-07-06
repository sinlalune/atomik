# First prompt for a coding agent

> Scope: chat-based agent sessions without repository access (e.g. working from an uploaded doc pack). Repo-native agents ignore this file and boot from `AGENTS.md` via the bootstrap protocol (22).

Build the first Atomik Workbench MVP from this bedrock bundle.

Start with Electron + Vite + React + TypeScript. Do not start with the Atomik DSL, canvas, full claim graph, public-knowledge mirror, or autonomous web-research agent. Implement the secure desktop foundation, a Dev Docs tab that renders this documentation, a local Markdown vault, project bundle support, tab/pane workspace, Markdown source dossiers, and a selection-native AI patch flow with a **minimal truth/evidence contract and privacy-aware ActionTrace**.

Before anything else: follow the bootstrap protocol in `22_22-agent-handoff.md`. Open `atomik-project/coding-paths/ACTIVE.md`; the concrete milestone content of this prompt lives in `CP-MVP-001.md`, where its progress is tracked. Do not reconstruct progress from conversation history.

## First implementation order

1. Create Electron main/renderer/preload split.
2. Add a secure `contextBridge` API with narrow, typed, documented IPC channels.
3. Add a Dev Docs tab reading docs/specs/ADRs/contracts from the project folder.
4. Add basic tab/pane workspace.
5. Add vault open/read/write for Markdown using atomic, Git-friendly writes.
6. Add project bundle open/create with `index.md`, `log.md`, and project manifest conventions.
7. Add Markdown editor and preview.
8. Add text selection -> AI operation mock -> structured response bundle -> patch preview -> accept into file.
9. Emit a minimal ActionTrace from that mock: execution location, model/tool identity, estimated/actual tokens when available, latency, external cost, status, outcome, and `contentRecorded=false`.
10. In that mock flow, support the minimum visible labels:
   - `source-backed`
   - `model-only`
   - `needs-citation`
   - `interpretive`
11. Let one source-backed result open the mapped local source dossier + anchor.
12. Let one challenged claim produce a local verification report and repair patch preview.
13. Add source dossier creation using `source.md` for imported/captured sources.
14. Add phone capture source using local QR upload once the note/AI loop is working.
15. Add PDF and web source adapters before live search grounding.
16. Add a provider-neutral model/verification interface. Keep provider keys behind the trusted main/service boundary.
17. Add Gemini API / Google Search grounding only after local source/evidence routing, budgets, privacy policy, provider-result UI separation, and the no-link-harvesting rule exist.

## Minimal truth/evidence contract

Implement or reserve stable shared types for:

```text
ClaimRecord
EvidenceRecord
VerificationEvent
TruthAwareResponseBundle
ActionTrace
ExecutionPolicy
OperationBudget
ProviderUsage  # compatibility/provider child trace only
VerificationPolicy
```

These types may begin in `shared-types`, `ai-core`, `context-core`, and `source-core`. `execution-core` is an incubating boundary and should become a package only after multiple real consumers exist. Do **not** create empty `truth-core`, `citation-core`, or `verification-core` packages until the contracts have real multiple consumers and tests.

Required semantic rules:

```text
Files are the durable source of record; evidence determines epistemic support.
A citation proves traceability, not automatic correctness.
Human acceptance is workflow state, not factual proof.
Interpretive, analogical, predictive, and normative content must not silently appear as direct fact.
Unsupported factual claims remain model-only/needs-citation; never invent a source.
source-backed is assigned mechanically (anchor match / quote hash); the model never
  self-grades groundedness; all other factual content defaults to model-only.
```

## Provider and grounding boundary

```text
provider-grounded result
  transient result displayed to the prompting user with required provider links/suggestions

Atomik source import
  explicit import of an actual destination page/document through source-core
  creates durable source.md / snapshot / reader text / anchors
```

Do not use provider-grounding output or returned links to build a crawler, dataset, search index, or reusable knowledge database. Provider pricing, terms, retention, model IDs, and display rules are volatile and must come from dated capability/policy snapshots.

## Do not build yet

- no full canvas
- no Atomik DSL parser
- no rich visual scene engine
- no global automatic claim graph
- no full multilingual Wikipedia/Wiktionary mirror
- no autonomous background crawler
- no embeddings as canonical memory
- no mandatory vector database before lexical/link/structural retrieval is evaluated
- no vault-wide semantic retrieval or large-model call on every keystroke
- no raw prompt/output telemetry by default
- no remote content with Node integration
- no provider keys in renderer or remote views
- no generic IPC bridge
- no undocumented core modules
- no JSON-only canonical source records
- no hidden database-only notes
- no one-number “truth score” presented as certainty
- no unsupported claim labeled source-backed
- no automatic crawl/index from grounding-returned links
- no noisy mass rewrites of Markdown/frontmatter

## Documentation requirement

Every core brick must update or create a module learning note. If a public interface, file format, IPC channel, source adapter, security boundary, AI operation contract, claim/evidence/verification contract, provider privacy/cost policy, patch format, project bundle convention, source dossier format, context packet format, knowledge-pack format, dictionary/etymology format, or Git behavior changes, update docs in the same work unit.

Volatile external claims must include:

```text
official source URL
checked_at date
assumed account/region/model context
recheck trigger
```

## Git compatibility requirement

Atomik is Git-compatible, not Git-dependent. Canonical knowledge must live in stable, human-readable files. Caches, embeddings, indexes, model files, thumbnails, provider caches, private ActionTrace ledgers, and local workspace state must be ignored or rebuildable. One accepted AI operation or truth repair should produce one meaningful diff.

## First truth acceptance tests

```text
A selected source passage can produce a source-linked note.
A model-introduced factual detail without evidence is marked model-only/needs-citation.
An interpretation is distinguishable from direct fact.
A citation opens a local source anchor.
A challenged claim produces an inspectable verification report.
A repair patch can be accepted/edited/rejected.
Human acceptance is not rendered as “true.”
Local-only mode makes no cloud request.
Provider keys never enter the renderer.
Grounding-returned links are not harvested or automatically imported.
A filename/heading/full-text retrieval baseline works without embeddings.
A local action can report zero external billing while still showing measured latency/resource use.
Raw note/prompt content is absent from telemetry by default.
The creator's two-week daily-use gate closes M1+M2; friction is recorded as project files.
```
