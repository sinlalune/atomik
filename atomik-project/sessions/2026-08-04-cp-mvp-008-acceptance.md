---
type: Atomik Session Record
title: CP-MVP-008 acceptance — S07 owner bench validated; agent machine sweep of the §M2 intents on the real provider
timestamp: 2026-08-04T00:00:00Z
---

# CP-MVP-008 acceptance (2026-08-04)

Owner, after twelve live bench rounds (S07b1–S07b16): **"I validate
all owner bench task."** This record is the closing sweep — the agent
half re-verified on the real provider, the owner half validated
against the bench trail, honest gaps carried forward in writing.

## Agent half — 18 §M2 intents on the REAL provider (2026-08-03)

Run post-S07b on real Mistral (`mistral-small-2603`), live vault,
CDP-driven; recorded in the ledger:

- **Real question over a real context → answer** ✓.
- **Provenance labels reproduce mechanically** ✓ — the answer's exact
  source quote labeled `source-backed`, its uncited explanation
  `model-only`; the deterministic checker (28: the model never
  self-grades) reproduced on real output.
- **One accepted patch = one meaningful diff** ✓ — answer promoted to
  ONE clean source-linked note (`Quote and Explanation.md`).
- **Cancel mid-flight** ✓ — typed `ai(cancelled)` taxonomy error with
  retry; transcript kept the you-turn; no partial answer.
- **Usage + billing on every real run** ✓ — ↑2140 ↓58 · ~$0.0004,
  provider-counted tokens labeled against the dated price snapshot;
  estimate ~2305 vs 2140 counted (chars/4 heuristic, labeled
  `estimated` everywhere).
- **Budget/cancel enforced below the renderer** ✓ — main-side
  ceilings (S02), unit-tested; not re-driven live.

## Owner half — the six bench items, validated over rounds 1–12

The owner bench was not a separate sitting: every item was exercised
repeatedly inside the S07b rounds on the live vault, then validated
cumulatively today.

- **Question over a real selection via the context menu** — rounds
  b3/b4/b8 live pins on real notes; PDF passages selectable since b6
  (TextLayer + `p1q1` anchor).
- **Inline accept** — the S05/S06 interaction pass, re-driven through
  the rounds; agent half proved the promoted-note shape.
- **Chat exchange** — the backbone of rounds b2–b16 (day-folder
  chats, composer card, sheets, tabstrip history).
- **Prompt file edited and re-used** — b3 built-in block files
  (vault overrides byte-replace registry blocks), b8/b13 system plan
  (chips by name, click opens the backing file, plan persists with
  the conversation).
- **Cancel mid-flight** — Cancel wired since S02; agent half proved
  the typed-error surface on a real request.
- **Receipt inspected** — b4 per-part token pills + copy-request
  (display = sent), b10/b16 persisted per-answer run metrics, Σ
  totals in the chat bar.

## Decisions absorbed during S07 (no longer open)

- **Default engine when a key is configured = `mistral`** (owner,
  S06c16, 2026-07-25) — implemented in `ai-settings.ts` engine
  resolution (key present → `mistral`, mock stays selectable); the
  ledger's earlier OPEN marker was superseded.
- **AiPanel retirement** — resolved by the S06c17 redirect: epistemic
  status lives IN the generated text as labeled marks.
- **Prompt transparency** — S07b13: no chip says one thing and sends
  another; the chat plan carries its blocks by name; the S07b12
  mode-resolution retired.

## Honest gaps carried forward (recorded, not hidden)

- Token estimates are chars/4, labeled `estimated`; provider-counted
  figures win when present (~7% over-estimate observed). Fine for
  receipts; revisit only if budgets need precision.
- S07b16 landed without a live pin (app closed at landing) — the
  idiom is S07b10's and the append→parse round trip is unit-tested.
- Full PDF viewer tooling (beyond TextLayer + passage anchors) →
  post-008 backlog (owner split, bench round 1).
- DnD/docking + chat-workflow directives → candidate path
  (brainstorm 2026-07-25, recorded verbatim).
- The local llama.cpp generation seat stays a reserved follow-up
  (33/34 discipline, register note).
- WSLg limits (240 Hz, DWM corners/shadow, hardware glass) remain
  environment facts, reserved for the packaged-Windows-build unit.
- Bench artifacts left in the live vault for inspection:
  `chats/2026-08-03/*`, `Quote and Explanation.md`, dossier anchor
  `p1q1` — owner deletes at will.

## Close

CP-MVP-008 → done (2026-08-04). Final state: tests 635/55, typecheck/
build green. M2 is complete on a real engine. No active path until
the closing ceremony completes and the next path activates through
its opening check (22 §Between paths); the ceremony's recorded inputs
live in the register (2026-08-03 sessions A/B/C notes).
