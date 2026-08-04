---
type: Atomik Brainstorm Note
title: Brainstorm session B — claims epistemology: from mechanical labeling to the LLM judge
timestamp: 2026-08-03T00:00:00Z
status: provisional
---

# 2026-08-03 brainstorm session B

Parallel Q/A session (session A ran concurrently in `2026-08-03-brainstorm-session.md`). Nothing here is a decision; promotion goes through reviewed patches (bedrock/ADR). Recorded as an input for the M6/M7/M8 path openings — see the register note.

## Q — How is claim epistemology evaluated? "It's just a random regex" — will there be fast LLM evaluation (LLM reasoning through sources/tools for validation, not generation)?

**Untangling today's code (two different things conflated):**

- The epistemic judgment is `apps/desktop/electron-main/truth.ts` (`labelClaims`) — deterministic, not random, not a regex: `source-backed` ONLY via verbatim containment of the claim in a supplied selection (sha256'd quote evidence); provider can assert FORM only (interpretive/needs-citation); everything else defaults to `model-only`. Deliberate floor: "a model grading itself is confidence theater" (05/06/14).
- The `\s*` regex in `claim-highlight.ts` is presentational (raw-markdown → DOM mark mapping); zero epistemic role.
- Current state honestly named: **epistemically honest labeling, not verification**. `model-only` = "unproven", not "false". Known gap: paraphrase-supported claims land at `model-only`.

**Yes — the LLM-as-verifier is constitutionally planned**: bedrock 29 (verification router) is the owner's question already answered architecturally — claims split → risk tiers 0–3 → cost ladder (local evidence → local knowledge packs → deterministic tools → live web), small-local-model roles verbatim = claim splitting, claim-type classification, risk routing, excerpt selection, contradiction candidate detection. M6 = Truth Lens + local verification plan; M7 = live provider (Gemini grounding behind neutral contract).

## Owner challenge 1 — "Contradiction between a sourced claim and a generated fact can't be judged deterministically; what does the judge LLM run on? All sources + all notes? Search per sentence? The claim project looks more idealistic than implementable."

**Conceded**: the semantic engine IS an LLM judge; "validators never call AI" governs the label ledger, not the verification plane. The deterministic core is the rules of evidence, not the witness: `label = f(claim, evidence, events, policy)` — pure precedence rules over typed records. Semantic judgments enter as records from exactly three judges: mechanical checks (proof-grade, narrow), LLM verdicts (witness statements with provenance), human accept/reject. Value of the split: re-derivability without re-running models, epistemic provenance survives (containment-proof ≠ model-judged), conflicts resolve by precedence not by a third LLM, bi-temporal recompute is a pure function.

**The trick that makes it implementable — retrieve-then-judge, never all-pairs:**

```text
claim → candidate generation (no LLM, ~ms)          → bounded judgment (fast LLM)
        FTS5/BM25 + 1–2 hop link expansion              1 claim + 5–10 passages in,
        + claim index (claim-vs-claim pairs                verdict + qualifier out,
          come from the index, not note scans)             batched ~10 claims/call
```

Envelope: 1,500-word note ≈ 25–40 claims ≈ 3–4 parallel fast-model calls ≈ ~40k input tokens ≈ **fractions of a cent, tens of seconds** (deliberate review) / low seconds (chat pass). Web tier stays tier-gated + budgeted on top.

**Use case 1 — "review this note for claims"** (deliberate, visible): split (1 fast-LLM pass) → mechanical sweep (free; catches evidence rot) → candidates per claim (index) → batched judgment streaming verdicts as VerificationEvents → opt-in web escalation for unsupported Tier-2/3 → report: N claims, supported/contradicted/unverified/nuanced, every row opens evidence.

**Use case 2 — chat/generation "is this true + nuances"** (progressive, never blocks the answer): claims already split (S06c17), mechanical marks instant, ONE background batched judge call over model-only claims; marks re-color + pick up qualifiers 2–5s behind the answer (metrics-line rhythm); deep check is per-answer/per-claim opt-in.

Model self-knowledge ("contradicts my training") = low-weight flagged event whose only power is to TRIGGER a web check, never to settle.

**Sequencing truth**: contradiction detection is bounded BY retrieval → vault-wide review is downstream of M8 by necessity, not neglect. Buildable earlier without the index: shallow judge over the operation's own selections.

## Owner rulings

- **(a) Review report is NOT a file** — transient panel, pure projection of events; recompute costs cents. No review-dossier feature.
- **(b) Verdict vocabulary — delegated to agent, decided below.**
- **(c) Claim-vs-claim → `contradicts` graph edges — deferred** ("we will see that later"); the shared-vocabulary constraint is recorded now at zero cost.

## Decision (b) — verdict vocabulary (provisional; freezes at M6)

**Four verdicts, no more**: `supports` · `partially-supports` (qualifier REQUIRED) · `contradicts` (qualifier REQUIRED) · `unrelated` (retrieval noise; recorded so the pair is never re-judged, no epistemic effect).

- `unrelated` is load-bearing — NLI's neutral class; a judge without a noise exit hallucinates relevance.
- Nuance lives in the mandatory qualifier, never in enum growth (session-A predicate lesson: small controlled vocabulary, free text in the qualifier slot).
- No confidence floats — graded trust, if ever, comes from vote agreement across independent judge calls, not self-reported numbers.
- `supports`/`contradicts` deliberately identical to 28's evidence roles and session-A's edge vocabulary — one vocabulary forever; (c) needs no translation layer later.

**Event record** (shape M6 should freeze): `claimId`, candidate ref (relPath+range now; claimId allowed later), `verdict`, `qualifier`, judge provenance (model id, prompt hash), retrieval provenance, `createdAt` + `supersededAt` (bi-temporal — verdicts expire, never delete).

**Ledger aggregation** (deterministic, per claim): live `supports` AND `contradicts` → **disputed** (both shown) · only `contradicts` → **challenged** · only `supports`/`partially-supports` → **model-verified** (new label strictly below `source-backed`). Label-set extension = durable format → lands WITH M6; until then events stay session meta (no early migration).

## Inspectability — where does the judge's explanation live?

Two layers pointing at each other: **VerificationEvent** (epistemic finding, durable at M6, carries `traceId`) ↔ **ActionTrace** (execution transcript, ADR-008 — the contract already carrying per-answer tokens/latency/cost). Every semantic judgment AND every tool invocation = a child trace with inputs/outputs: retrieval query + candidate count, anchor checks, judge call (prompt, raw response incl. rationale, usage, cost), web queries. UI = existing disclosure rhythm: hover → qualifier one-liner; click → drawer renders rationale + tool chain from the trace tree. All of it exists at proposal time, before any note state — propose-never-impose applied to verification. Consequence: the trace store is keyed to operations, not accepted notes (already true of runAiOperation trace-binding).

## Owner challenge 2 — "Months later I can't remember how we proved a claim; qualifier isn't enough and the trace is gone. Sad, no?"

**Conceded — session-lifetime rationale retention breaks the system's core promise** ("why do I trust this?"). Revised retention, tied to acceptance not to time:

```text
verdict     enum          durable (M6)
qualifier   one-liner     durable
receipt     bounded       durable IF the claim was accepted   ← the fix
raw trace   transcript    operation-lifetime, configurable
```

**Receipt** (frozen at acceptance, Git-diffable): rationale (bounded — a paragraph, not a transcript) · consulted sources with anchors (incl. ones judged unrelated) · searches run + not-found (absence is part of the proof) · judge model/date/mode · compact cost figures. Principle: **acceptance is the filter deciding which model prose survives** — rejected drafts leave nothing durable; accepted claims ship with their justification story (lifecycle-with-artifact applied to epistemology). Re-verification later gives today's verdict BESIDE the historical receipt (bi-temporal). Honest M6 cost: receipts written atomically with note state; the format freeze must include the receipt shape or it buys a migration.

## Roadmap impact (no reordering; M6→M7→M8 validated)

- **008 orbit (no format risk)**: two candidates for the closing-ceremony backlog pass — normalized containment (deterministic paraphrase-gap shrink) and the shallow judge pass over an operation's own selections (events as session meta only).
- **M6 — the mass lands here**: format-freeze agenda = event schema (4 verdicts, mandatory qualifiers, bi-temporal), receipt shape, label extension (`model-verified`/`disputed`/`challenged`), receipts atomic with acceptance, drawer = events + receipts + trace tree pre-acceptance. Scope REMOVAL: no review-dossier file. Promotion at M6 authoring: patches to 28 (shapes) + 31 (disclosure UX), likely one ADR for the verdict vocabulary.
- **M7**: unchanged; web checks emit the same event schema.
- **M8**: named consumer requirement — candidate generator serves claim verification (claim index, top-k, link expansion); vault-wide note review = post-M8 composition unit.

## Open questions (recorded, not decided)

- Precedence when a fresh LLM verdict conflicts with an older human acceptance (raised, unsettled — human-override-everything vs staleness-reopens).
- Rationale length bound for the receipt; raw-trace retention knob default.
- Judge batching shape (claims per call) and local-seat latency once a local generation seat exists (register's reserved llama.cpp follow-up).
