# Changelog — Atomik Bedrock v0.6

Release: 0.6.0
Date: 2026-07-05
Theme: **the execution-state plane and the reuse economy** — making already-paid-for work durable, reusable, and honest over time.

## Why this release exists

A post-v0.5 design review produced decisions that existed only in chat history, violating the constitution's own promotion rule (00, 17). v0.6 promotes them into the corpus. One move underlies everything here: work that was paid for — in tokens, verification queries, correction effort, or implementation sessions — must persist in files and be reused before it is regenerated.

## Added

- **`35_35-coding-path-execution-state.md`** (foundational). Names the previously missing third plane: bedrock = should-be, code/tests = is, coding path = will-change. Defines the five layers (bedrock / AGENTS.md / coding path / work ledger / brief), the buffer-not-memory guarantee, documentation coverage (Required / Conditional / Deliberately excluded — the durable sibling of `ContextPacket.omitted`), the Work Ledger checkpoint, the session protocol, artifacts-as-projections, and the dual-plane repository.
- **`ADR-009`** — durable coding paths, work ledger, brief demotion, single-repo dual-plane layout (`atomik-project/` beside the code plane; ADRs canonical in `docs/adr/`; `brainstorm/` provisional; no nested Git by default). Alternatives rejected: big-context reliance, brief-as-memory, nested repos, external trackers.
- **`diagrams/`** — initialization of the diagram docs: twelve self-contained SVG figures projecting the corpus's core mechanisms, plus an `index.md` register with per-figure provenance and refresh triggers (the same-work-unit rule from 15/17 applies to figures). Nine pages embed their figures: `.md` sources carry portable image links; `body_html` inlines the SVG so the Dev Docs bundle stays self-contained.
- **`AGENTS.md`** — the bootloader itself, previously specified by role in every layer diagram but never authored. Deliberately tiny and pointer-only: protocol first, active path second, constitution third, plus the absolute rules that must survive even a truncated read. Repo-root paths per ADR-009.
- **`atomik-project/`** plane seed: `index.md`, `coding-paths/ACTIVE.md`, the milestone→path register `coding-paths/index.md` (just-in-time opening rule; no milestone silently unassigned), and **`CP-MVP-001.md`** — the first concrete coding path (M0–M2), carrying the migrated doc-22 instruction plus the newly promoted execution rules: time-to-M2 as center of gravity, the M2-thinness rule, the one-JSON-line minimal trace, the mechanical source-backed labeling rule, and the two-week experiential acceptance gate.

## Changed

- **`22_22-agent-handoff.md`** — full rewrite from static first-milestone recipe to a ten-step **bootstrap protocol** (AGENTS.md → project index → active path → verify ledger against reality → Required docs → one step at a time → same-work-unit persistence → brief only on handoff). Former milestone content migrated to `CP-MVP-001.md`.
- **`00` orientation** — founding-invariant line for coding paths; reuse rung added to the economics ladder; `regenerated != free` ; reuse invariant.
- **`02` learning loop** — new **Reuse loop** section (vault-first before generation; accepted proposal = weak edge); reuse acceptance question; **Revisit and retention (reserved)** deferral naming the review-queue seam as a rebuildable projection.
- **`04` file-first** — new **Backup and disaster durability** section: durability includes disk death; backup is a folder copy; Atomik may never make it harder than that.
- **`06` AI pipeline** — **Mechanical labeling rule (MVP)**: source-backed only by deterministic anchor/quote derivation, all else defaults to model-only, no model self-grading; vault-first line in context assembly; `relation-suggestion` blocks named as the response-side carrier of existing-note referencing.
- **`11` markdown model** — **Note lifecycle**: `seed | growing | evergreen | superseded | archived`; archive is demotion, never deletion; lifecycle informs retrieval and link-proposal ranking. Made urgent by reuse: a hover-proposal engine will faithfully resurface stale notes unless lifecycle ranks them down.
- **`18` roadmap** — Center of gravity (time-to-M2); M2 guardrails (thinness rule, minimal trace, mechanical labeling) and acceptance line; experiential gate closing M1+M2; M8 link index; M9 passive link proposals (deterministic first); continuous constraint against bulk auto-linking; retention queue added to the deferred list.
- **`20` relations** — **How weak links are born: link proposals** (hover/highlight, deterministic title/alias/heading match, propose-don't-impose, lifecycle-aware, one-line diffs, reuse-rate-never-a-quota); **Rename and link integrity** (rename = tracked refactor, one atomic labeled multi-file patch).
- **`24` templates** — Coding path template with Work Ledger checkpoint fields and optional `.state.json` sidecar rule.
- **`26` OKF agent context** — coding path registered in the durable-context family ("the pack solves re-entry; the path solves execution continuity"); relation to 35.
- **`27` Git** — commit defaults extended to `atomik-project/**`; rename-refactor diff rule; backup cross-reference.
- **`33` retrieval/cost** — rung 0 explicitly includes the user's own notes (vault-first); reuse events added as an informational outcome metric.
- **`agent_documentation_contract.md`** — boundary list gains execution-state contract, dual-plane layout, note lifecycle, link-proposal behavior; final-response requirement gains item 9 (path step + ledger updated).
- **`first_prompt_for_coding_agent.md`** — bootstrap-first opening; mechanical labeling rule; daily-use gate.

## Compatibility notes

- Briefs remain generable exactly as before; only their authority changed (view, not memory).
- No existing file format changes; `atomik.status` remains an open string, so v0.5 notes are untouched.
- Relation-graph frontmatter reciprocals and pack manifests are refreshed at the next bundle regeneration; body-text amendments carry the semantics until then.
- Start-polish pass (2026-07-05): superseded 04 draft archived to `bedrock/archive/`; `docs/index.md` and `docs/log.md` seeded; `atomik-project/sessions/` and `sources/` seeded; `first_prompt_for_coding_agent.md` explicitly scoped to chat-based sessions; AGENTS.md references made fully explicit; CP-MVP-001 S01 reworded for the pre-seeded bundle; doc 16 file-source block aligned with the shipped manifest.
- The delivery bundle now ships directly in the ADR-009 repository layout (unzip = repository); manifest paths are docs-relative accordingly, and the in-page `../diagrams/*.svg` links resolve as-is.
- No provider capability figure (context window size, instruction-file limits, compaction behavior) is load-bearing anywhere in this release; the execution-state design is deliberately independent of them, and none are recorded. If a future tuning decision ever needs one, it is verified at that moment against an official source.
