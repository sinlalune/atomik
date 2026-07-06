---
type: Atomik Learning Note
title: 'Learning: mechanical truth labels — evidence is computed, never claimed'
description: Beginner-first walkthrough of S10 — the labeling rule, quote hashes, form vs evidence, and the challenge/repair loop.
tags: [learning, truth, evidence, labels, epistemics, verification]
timestamp: 2026-07-06T00:00:00Z
---

# Learning: mechanical truth labels — evidence is computed, never claimed

**Who this is for.** You read note [06](./06-ai-patch-loop-and-mock-first.md).
After this one you can read `electron-main/truth.ts` and explain why its
forty lines carry more epistemic weight than any confidence score.

**Scope.** CP-MVP-001 S10: the four MVP labels on AI output, citations
that open their source anchor, and the challenge → repair preview.

## 1. The problem: models grading their own homework

Ask a model "was that answer grounded in my document?" and it will answer
fluently — and its fluency proves nothing. The bedrock names this
**confidence theater** (06): a self-assigned "source-backed" is the same
trap as treating model agreement as verification. The rule that fixes it:

```text
source-backed is NEVER an assertion. It is the OUTPUT of a
deterministic check that anyone can re-run and get the same answer.
```

## 2. The mechanism: derivability

`truth.ts` receives the operation's selections and the provider's **claim
candidates**, and computes:

```text
claim text is an EXACT substring of a supplied selection
  -> source-backed + an EvidenceRecord: which file, which range,
     the exact quote, and its sha256 hash
anything else -> model-only (the default for factual content)
```

Two design points worth internalizing:

- **No fuzzy generosity.** A paraphrase — even a perfect one — is NOT
  source-backed (a test locks this). Fuzzy matching would reintroduce
  judgment exactly where we removed it. Real semantic matching belongs to
  real verification (M7+), clearly labeled as such.
- **The hash makes it reproducible.** `quoteSha256` means the derivation
  can be re-checked forever: same quote, same hash, same label — the M2
  acceptance line "reproducible by a deterministic check" made literal.

## 3. Form vs evidence — the distinction that keeps everyone honest

Providers CAN assert two things: `interpretive` ("this is a reading, not
a fact") and `needs-citation` ("I state this without a source"). Why
allow these self-reports when we banned source-backed? Because they
describe **form**, not **evidence** (06): a model flagging its own
statement as unproven is being *modest* — no trust required. A model
flagging its statement as *proven* is being *authoritative* — exactly
what must be earned mechanically. Asymmetric trust, on purpose.

The type system enforces it: `ClaimCandidate.assertedForm` only admits
the two modest forms. The adversarial test smuggles
`assertedForm: "source-backed"` through a cast — the checker drops it to
model-only. And derivability outranks modesty: an exact quote the
provider calls "interpretive" is still source-backed — evidence wins.

## 4. What you see in the panel

After a run, the claims row shows one chip per claim:

```text
source-backed    green  · [source] button → the editor selects and
                          scrolls to the exact quoted range (the
                          citation OPENS its anchor — S10's second leg)
model-only       gray   · the honest default
needs-citation   amber  · the provider admitted the gap
interpretive     blue   · a reading, not a fact
```

The mock deliberately emits all four on every response, so the whole
contract is exercised (and smoke-tested) continuously.

## 5. Challenge → repair patch preview

Every claim carries a **challenge** button (S10's third leg, the seed of
M6's full loop). Challenging is mechanical for now: the claim gets
qualified inside the pending proposal — `**[⚠ challenged — needs a
source]**` appended where the claim appears (or a warning block if it
doesn't) — and the proposal header switches to "repair patch preview".
You then accept or reject the repaired patch through the normal path.
The important shape: **a doubt becomes a reviewable diff**, not a
feeling. "Insufficient evidence is a legitimate learning result" (02).

## 6. Try it yourself

1. Select a sentence → AI → Run. Four chips appear.
2. Click **source** on the green claim: the editor jumps to and selects
   the exact quoted range.
3. Click **challenge** on the amber (`needs-citation`) claim: watch the
   proposal text gain the qualification — that's the repair preview.
   Accept it; `git diff` shows the qualified text.
4. Adversarial replay (DevTools): craft a `runAiOperation` call whose
   selection does NOT contain the mock's quote slice… actually simpler —
   read `tests/truth.test.ts` and run
   `npx vitest run tests/truth.test.ts`: the paraphrase test and the
   smuggled-label test are the two that matter most.

## 7. Vocabulary you now own

```text
confidence theater   fluency presented as evidence
derivability         label computed from inputs, not asserted
quote hash           sha256 of the exact quote: reproducible forever
form vs evidence     modest self-reports allowed; authority earned
claim / evidence     what is asserted / what supports it (05)
repair patch         a challenge turned into a reviewable diff
```

## 8. What arrives next

**S11 — the acceptance run**: all M0–M2 tests from the roadmap, plus
filename/heading/full-text search without embeddings, plus
cache-deletion-destroys-nothing. Then **S12**, the experiential gate: two
weeks of daily use — the step only you can execute.
