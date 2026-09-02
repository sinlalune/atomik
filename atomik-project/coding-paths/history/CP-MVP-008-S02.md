---
type: Atomik Coding Path History
title: CP-MVP-008 S02 — Mistral adapter in main, end to end
description: Completed-step record rolled out of CP-MVP-008.md at CP-OPS-002 S04. Verbatim; nothing summarized.
tags: [coding-path, history, cp-mvp-008]
timestamp: 2026-08-24T00:00:00Z
path: CP-MVP-008
step: S02
---

# CP-MVP-008 S02 — Mistral adapter in main, end to end

Rolled out of [CP-MVP-008.md](../CP-MVP-008.md) at CP-OPS-002 S04, VERBATIM:
moved, never summarized. The live path file keeps its declaration, its index
over these records, its ledger and its next action; the execution detail lives
here. The convention is in [paths.md](../paths.md).

Text that says "the checkpoint below" or "this ledger" was written when these
entries sat in the path file; it points at the Work Ledger in
[CP-MVP-008.md](../CP-MVP-008.md). Deixis was the only casualty of the move, and
repairing it in place would have made the record no longer verbatim.

Entries in this record: S02.

- [x] S02 Mistral adapter in main, end to end — done 2026-07-21:
      `generation.ts` (typed GenerationAdapter seam + mock behind it +
      the eight-kind GenerationError taxonomy) and
      `mistral-generation-adapter.ts` (chat completions, model id
      pinned LIVE `mistral-small-2603` from provider docs 2026-07-21;
      budgets 2k out / 60s wall / input pre-check; deterministic claim
      candidates → unchanged labelClaims; provider-reported usage
      labeled, USD cost from the dated snapshot). Engine selection
      persisted (`setAiEngine` channel; resolution explicit → key →
      mock) + `cancelAiOperation` mid-flight; AppMenu engine picker;
      AiPanel Cancel. Trace lines wear cloud identity + labeled
      usage/billing + snapshot id + privacy.mode cloud. Tests
      455/44 (was 435/43): generation-adapter.test.ts fixture-only,
      ai-settings + action-trace extended, preload surface holds;
      typecheck/build green; smoke `ai=ok` through the new async
      handler; live rung PROVEN with the owner key (.env.local dev
      override, the CP-MVP-005 precedent, now honored by the
      generation handler too): `aiLive=ok:cloud-model/mistral-small/
      150+11tok/0.000029USD:cancel=cancelled` — real completion,
      cloud trace with provider-reported usage + snapshot cost,
      mid-flight cancel over real latency.
