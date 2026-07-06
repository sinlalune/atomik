# ADR-004: Claim-level truth, evidence, and epistemic status

Status: accepted
Date: 2026-06-22

## Context

Atomik generates explanations, notes, definitions, historical context, etymologies, interpretations, and future relation/scene proposals. A fluent model response may mix direct facts, analogies, interpretations, predictions, and normative judgments. Treating the whole answer as either “true” or “false,” or attaching one confidence percentage, hides the differences that matter.

The existing file-first doctrine also used “source of truth” in the software architecture sense. This can be confused with factual truth. Saving a sentence to Markdown makes it durable and reviewable; it does not establish that the sentence accurately describes the world.

## Decision

Atomik distinguishes:

```text
file authority
  durable source of record for project state

epistemic authority
  evidence and verification supporting a claim
```

Generated or curated content may expose claim-level records with separate dimensions for:

```text
claim nature
evidence origin
verification state
freshness
workflow/review state
```

Atomik will not use a universal scalar “truth score” as the primary trust signal.

A source citation proves traceability, not automatic correctness. Human acceptance records editorial workflow, not factual proof. Interpretive and normative claims must not silently appear as neutral direct facts.

The first implementation may keep claim records in AI response bundles and note-adjacent metadata. Important visible status and citations must remain human-readable; optional machine sidecars may support exact ranges and anchors but cannot be the only place unsupported, disputed, or stale status exists.

## Consequences

- AI response bundles gain claims, evidence, verification events, uncertainties, and provider/cost traces.
- Markdown notes can remain lightweight; only important claims need durable claim structure.
- The UI needs a progressive Truth Lens rather than a single trust badge.
- Verification and contradiction can produce repair patches instead of silent rewrites.
- Graph edges may later project from file-backed claim records.
- Tests must detect citation laundering, unsupported claims labeled as sourced, and human acceptance rendered as factual proof.

## Alternatives considered

### Trust the model by default

Rejected. Model quality improves usefulness but cannot guarantee correctness, freshness, source fidelity, or appropriate value framing.

### Require citations for every sentence

Rejected as a universal rule. It creates noise, encourages citation decoration, and is unnecessary for transformations, user-authored synthesis, and clearly marked analogies. Claim type and risk should determine evidence requirements.

### One answer-level confidence percentage

Rejected. It collapses source quality, scope, freshness, claim nature, and verification method into false precision.

### Formalize every sentence into a knowledge graph immediately

Rejected for MVP. It would make ordinary note-taking burdensome and slow the daily-use workbench. Claim promotion remains selective.

## Migration / rollback

Existing notes remain valid Markdown. Atomik may infer provisional claims without rewriting files. Durable truth metadata is added only through explicit accepted patches or new evidence-aware note formats.

If claim-level automation proves noisy, Atomik can keep the same evidence/verification contracts while limiting durable claim records to user-selected or high-risk statements.

## Links

- `28_28-truth-evidence-model.md`
- `31_31-truth-lens-ux.md`
- `06_06-ai-patch-pipeline.md`
- `11_11-markdown-page-model.md`
