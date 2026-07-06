---
type: Atomik Learning Note
title: 'Learning: action traces — measuring without spying'
description: Beginner-first walkthrough of S09 — the one-line ledger, append-only JSONL, estimates vs actuals, and content-free telemetry.
tags: [learning, traces, cost, telemetry, privacy, jsonl]
timestamp: 2026-07-06T00:00:00Z
---

# Learning: action traces — measuring without spying

**Who this is for.** You read note [06](./06-ai-patch-loop-and-mock-first.md).
After this one you can read `electron-main/action-trace.ts` and explain
every field of the line it writes — and every field it refuses to write.

**Scope.** CP-MVP-001 S09: one JSON line per AI operation + one compact
badge. The thinness rule was the contract here: *nothing more*.

## 1. Why measure a mock that costs nothing

Because the discipline is the product (00: cost-observable, not
token-blind). Real providers will cost money, latency, and privacy; if
instrumentation arrives WITH them, it arrives late and reshapes things.
Emitting the trace from the first mock means M7's provider adapter drops
into a seat where measuring is already normal — and M11's dashboard grows
from lines collected since today ("the dashboard is later. The trace is
not." — 06).

Honesty detail: the mock's line says `location: "deterministic"` — not
"local-model". A placeholder function IS a deterministic tool; labeling it
truthfully keeps the ledger meaningful when real locations join.

## 2. One line, shaped like the future

The line lives in `.atomik/usage/private/actions.jsonl` and wears 06's
full ActionTrace silhouette with only the S09-minimum fields filled:

```json
{ "id": "...", "operationId": "...", "timestamp": "...",
  "action": "generate",
  "execution": { "location": "deterministic", "provider": "atomik",
                 "model": "mock", "modelVersion": "s08" },
  "usage": { "estimatedInputTokens": 12, "estimatedOutputTokens": 147 },
  "performance": { "wallMs": 1 },
  "billing": { "currency": "EUR", "estimatedAmount": 0, "basis": "estimated" },
  "outcome": { "status": "completed", "decision": "accepted" },
  "privacy": { "mode": "offline", "contentRecorded": false } }
```

Adding a field later (cached tokens, energy, provider-reported billing)
extends objects that already exist — no reshaping, no migration. That is
what "use the final trace shape from the beginning" buys.

## 3. JSONL and append-only: a ledger, not a database

`.jsonl` = one JSON object per line. Writing is `appendFileSync` — never
read-modify-write. Concepts:

```text
append-only   history is grown, never edited; each line is a fact about
              the past (like Git commits, like accounting ledgers)
line-oriented cheap to append, cheap to stream, resilient: one corrupt
              line (a crash mid-append) costs one line, not the file
private       lives under .atomik/usage/private/ — git-ignored (27);
              aggregate REPORTS may be exported deliberately, later
```

## 4. When is the line written? When the outcome exists

The S09 minimum includes the decision (accepted/edited/rejected) — so the
line is appended at DECISION time, complete. Mechanics: the run creates a
**draft** in memory; your Accept/Reject completes and appends it, exactly
once. Failures append immediately (`status: "failed"` — there is no
decision to wait for), and quitting the app flushes undecided drafts
without a decision (real compute is never silently dropped).

## 5. Estimated vs actual — never confuse them

The mock has no tokenizer, so tokens are estimated (`chars / 4`) and the
field NAMES say so: `estimatedInputTokens`, `basis: "estimated"`. When a
real provider reports actual counts, they'll land in differently-named
fields (`inputTokens`, `basis: "provider-reported"`). The distinction is
bedrock (06: "estimated, provider-reported, and billed usage remain
distinguishable") — budgets need estimates, invoices need actuals, and
mixing them is how cost dashboards lie. Same spirit as `€0 external`: the
badge says *external*, because local execution still costs time, compute,
and battery (00: "local != free").

## 6. Telemetry that cannot betray you

The strongest property is what the line does NOT contain: no instruction,
no selection, no generated text, no note paths beyond the operation's
own ids. `contentRecorded: false` is not a promise in prose — a unit test
greps the ledger for the prompt and the selection and fails if they ever
appear. Measuring behavior without recording content is the entire
telemetry stance of the bedrock (13/33: no raw prompt/output telemetry by
default).

## 7. Try it yourself

1. Run an AI operation, Accept it, then:
   `cat .atomik/usage/private/actions.jsonl` — your line, with your
   decision.
2. Hover the badge in the panel (`deterministic · €0 external · …`) —
   the tooltip names the ledger file and the contentRecorded stance.
3. Reject one, edit-then-accept another: three decisions, three lines —
   `accepted`, `edited`, `rejected`.
4. Grep your own prompt: `grep "your instruction text" .atomik/usage/...`
   → nothing. The test suite does this automatically forever.
5. Delete the file. Nothing breaks; it regrows. Operational state, never
   knowledge (04).

## 8. What arrives next

**S10 — mechanical truth labels**: `source-backed` assigned only by
deterministic derivation (anchor/quote match), everything else
`model-only`; a mapped citation opens its local source; one challenged
claim produces a repair patch preview. The empty `claims`/`evidence`
arrays in the bundle are about to earn their seats.
