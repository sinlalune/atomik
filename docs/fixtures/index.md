---
type: Atomik Index
title: Reference instances
description: One filled example per durable format, used to read a template and to seed tests — and why their internal links are exempt from link checking.
tags: [fixtures, examples, index, okf]
timestamp: 2026-08-24T00:00:00Z
---

# Fixtures

One filled instance per durable format: what a template looks like when it is real.
They exist to be read beside [bedrock 24](../bedrock/24_24-doc-templates.md) and to
seed tests.

**They portray another vault.** Their relative links point into an imaginary
workspace, so `cairn-check` exempts this directory from link checking — the first
version of that rule flagged 34 such links as broken, and a validator that cries
wolf is a validator people switch off.

- [capture_source_dossier.md](./capture_source_dossier.md) ·
  [capture_source_record.json](./capture_source_record.json) — a source dossier and
  its record ([ADR-002](../adr/ADR-002-markdown-source-dossiers.md)).
- [atomic_note_from_capture.md](./atomic_note_from_capture.md) — a note produced
  from that capture.
- [truth_claim_fixture.md](./truth_claim_fixture.md) ·
  [verification_report_fixture.json](./verification_report_fixture.json) — a claim
  and the report that checked it ([ADR-004](../adr/ADR-004-claim-level-truth-evidence.md)).
- [action_trace_fixture.json](./action_trace_fixture.json) — one operation trace
  with execution location, budget and cost ([ADR-008](../adr/ADR-008-operation-traces-execution-economics.md)).
- [dictionary_entry_fixture.md](./dictionary_entry_fixture.md) — a dictionary entry
  ([ADR-006](../adr/ADR-006-public-knowledge-lexicographic-baseline.md)).
- [future_derivative_scene.atomik](./future_derivative_scene.atomik) — a reserved
  DSL scene, deliberately unimplemented ([19](../bedrock/19_19-dsl-future.md)).
