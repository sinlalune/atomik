---
type: Atomik Index
title: Accepted decision records
description: One line per ADR — what each decision settled, its status and its date — so an agent reads the nearest index before opening sixteen files.
tags: [adr, index, decisions, okf]
timestamp: 2026-08-24T00:00:00Z
---

# Decision records

An ADR records ONE architectural decision and why it was taken: context, decision,
consequences, alternatives, migration. Bedrock says what the architecture is; ADRs
say what was decided and when, and they are never rewritten silently — a decision
that changes is superseded or amended in place with a dated line.

Numbers are stable and may be reserved by a path that is still running, so a gap
means reserved, not missing.

Every record carries frontmatter (`type`, `title`, `description`, `tags`,
`timestamp`, and an `adr:` block with `id`, `status`, `date`) — backfilled across
all sixteen at CP-OPS-002 S05, closing audit finding F5. `cairn-check` validates
it: the id must match the file name, the status must be in vocabulary
(`proposed | accepted | superseded | rejected`), the date must be ISO, and the
frontmatter status must agree with the document's own `Status:` line. A record
whose two halves disagree is worse than one that never claimed to be readable.

The template is in
[bedrock 24](../bedrock/24_24-doc-templates.md#adr-template); a bedrock change
with no ADR beside it raises the advisory `decision-drift`.

## Records

- **[ADR-001 — File-first, OKF-compatible project bundles](./ADR-001-file-first-okf-project-bundles.md)** · accepted · 2026-06-17
  Project files are the durable source of record: a vault holds project bundles holding source dossiers, notes, trails and context, and a workspace is a view over them.
- **[ADR-002 — Markdown source dossiers as canonical source knowledge](./ADR-002-markdown-source-dossiers.md)** · accepted · 2026-06-17
  Canonical source knowledge lives in Markdown `source.md` dossiers recording provenance, extraction, anchors and understanding beside the raw asset.
- **[ADR-003 — Git compatibility contract](./ADR-003-git-compatibility-contract.md)** · accepted · 2026-06-17
  Atomik is Git-compatible, not Git-dependent: canonical knowledge stays human-readable and diffable, rebuildable state is disposable, and opening a vault never rewrites files.
- **[ADR-004 — Claim-level truth, evidence, and epistemic status](./ADR-004-claim-level-truth-evidence.md)** · accepted · 2026-06-22
  Truth is carried per claim rather than per file: file authority, claim status and evidence anchors are distinct, and nothing is asserted beyond what its evidence supports.
- **[ADR-005 — Live web grounding is transient verification, not canonical knowledge ingestion](./ADR-005-live-grounding-transient-verification.md)** · accepted · 2026-06-22
  Provider-grounded output is a transient verification and display object for the prompting user; it is never a source dossier and never a licence to crawl or import.
- **[ADR-006 — Versioned public knowledge and lexicographic baseline](./ADR-006-public-knowledge-lexicographic-baseline.md)** · accepted · 2026-06-22
  Versioned local knowledge packs are a non-canonical retrieval layer built from attributable source records, starting from a public lexicographic baseline.
- **[ADR-007 — Hybrid retrieval and optional semantic indexes](./ADR-007-hybrid-retrieval-optional-semantic-indexes.md)** · accepted · 2026-06-23
  Search, context compilation and generation are separate; retrieval is strategy-pluggable and takes the cheapest sufficient path, with semantic indexes optional rather than assumed.
- **[ADR-008 — Privacy-aware operation traces and explicit execution economics](./ADR-008-operation-traces-execution-economics.md)** · accepted · 2026-06-23
  Every meaningful AI or retrieval action emits an ActionTrace naming execution location, inputs, budget and cost, so where work ran and what it cost is never invisible.
- **[ADR-009 — Durable coding paths, work ledger, and the dual-plane repository](./ADR-009-coding-paths-work-ledger-dual-plane.md)** · accepted · 2026-07-05
  Execution state becomes a durable plane beside the knowledge plane: a coding path file per bounded task, a Work Ledger checkpoint inside it, and the compressed brief demoted to a generated view.
- **[ADR-010 — One surface, two layers — bound scenes and free ink](./ADR-010-one-surface-two-layers.md)** · accepted · 2026-07-15
  One editing surface carries two entity kinds: bound scenes serialized as DSL lines in a fenced block, and free ink held in a sidecar drawing file with no semantics and no claims.
- **[ADR-011 — Inline typed edge grammar — `[[target]]{label}`](./ADR-011-inline-typed-edge-grammar.md)** · accepted · 2026-08-04
  A typed edge is authored inline as a link immediately followed by a decoration, so the semantic graph is written in ordinary prose rather than in a separate structure.
- **[ADR-012 — Parallel coding paths, self-merge, and a protocol check in CI](./ADR-012-parallel-paths-self-merge.md)** · accepted · 2026-08-15
  Coding paths become the unit of parallelism — one path, one worktree, one branch, one writer — every path merges itself after a rebase gate and recorded ceremony, and there is no integrator.
- **[ADR-013 — Lexical retrieval without a database — a pure BM25 core](./ADR-013-lexical-retrieval-without-a-database.md)** · accepted · 2026-08-16
  The lexical baseline is a dependency-free TypeScript core with the main process owning only I/O; SQLite/FTS5 is deferred until measurement, not preference, asks for it.
- **[ADR-014 — Rich Markdown is a bounded, lazy projection registry](./ADR-014-rich-markdown-renderers.md)** · accepted · 2026-08-17
  Raw Markdown bytes stay canonical and every rich rendering — math, diagrams, charts, highlighting — is a disposable projection that never rewrites the note.
- **[ADR-015 — The model is told what the surface it writes into can do](./ADR-015-ai-surface-capabilities.md)** · accepted · 2026-08-19
  Rendering capabilities and note conventions are stated to the model as ordinary composable plan blocks, including the refusals, so it writes inside the limits the surface actually has.
- **[ADR-016 — Cairn enforcement integrity — the gates must judge what they claim to judge](./ADR-016-cairn-enforcement-integrity.md)** · accepted · 2026-08-24
  Repairs the checks that reported OK over false conditions: rules fail closed when they cannot name their subject, ceremonies are declared in root-level frontmatter, and enforcement is declared in three tiers.
- **[ADR-017 — The coding-path lifecycle — `archived` is the terminal state, and an abandoned path has a way out](./ADR-017-coding-path-lifecycle.md)** · accepted · 2026-08-25
  `done` is a completion and `archived` the single terminal state, reached by demotion from `done` or by abandonment from `running`; `active` is retired, and a quiet path is noticed by an advisory signal rather than a gate.
- **[ADR-018 — Cairn candidate-bound closure, truthful lifecycle, and team enforcement boundaries](./ADR-018-cairn-candidate-bound-closure.md)** · proposed · 2026-08-25
  Preserves team-owned, remotely resumable coding paths while binding audit and acceptance to one exact candidate, separating `ready` from integrated `done`, failing critical unknowns closed, and defining the control-plane trust boundary.
- **[ADR-019 — Cairn v0.2 — retention, provisional commits, the brief contract, and the lightweight default](./ADR-019-cairn-v0-2-revision.md)** · proposed · 2026-08-26
  Closes the gaps between what Cairn promised and what it could prove: checkpoints retained before any force-push, incomplete work pushed as a marked provisional commit, a specified handoff-brief contract measured by cold resume, field-level closure, scope digests, an acceptance-drift predicate over declared surfaces instead of trunk equality, and the lightweight route as the default that pays for the rest.
- **[ADR-020 — Protocol context weight is a first-order constraint](./ADR-020-protocol-context-weight.md)** · accepted · 2026-08-31
  Minimising what a reader must consume to execute the protocol becomes a maxim with a test — separate the must-do from the why, index the first and link the second — naming instruction parity as the reader-side twin of gate parity, declaring the portable/host/binding artefact boundary, making the path record a folder that is born sliced rather than rolled up later, and retiring the concept cap for a growth advisory plus a blocking orphan rule.
- **[ADR-021 — Retention refs carry a generation](./ADR-021-checkpoint-retention-generations.md)** · accepted · 2026-09-01
  A rebase gives one retained unit two truthful object ids and the flat namespace has one slot, so retention stops covering the branch it protects while the gate reports OK; each rewrite gets its own generation, the current one is derived from ancestry rather than stored, an empty current generation is a violation instead of an exemption, and the range floor becomes the path's own commits rather than its registration base.
- **[ADR-022 — Path branches are not rewritten](./ADR-022-path-branches-are-not-rewritten.md)** · accepted · 2026-09-01
  The retention namespace, its generations and its three-state verdict all exist to pay for the mandatory pre-merge rebase, and the stated rationale for that rebase does not distinguish it from a merge, because merging the trunk into the branch also makes the branch contain the trunk tip; path branches stop being rewritten, a current base is reached by merge, retention is disabled rather than deleted, and no-rewriting becomes a predicate instead of a claim.
