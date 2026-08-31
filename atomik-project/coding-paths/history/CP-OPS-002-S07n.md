---
type: Atomik Coding Path History
title: 'CP-OPS-002 S07n — The cold-resume pilot, and what it says not to do'
timestamp: 2026-08-31T00:00:00Z
atomik:
  path: CP-OPS-002
  step: S07n
---

# CP-OPS-002 S07n

Rolled verbatim from the live ledger when `ledger-size` fired at S07t. The move
is cut-and-paste, never a summary: the record below reads exactly as it did in
`CP-OPS-002.md`.

### S07n — The cold-resume pilot, and what it says not to do — **COMPLETE**

```cairn-unit
step: S07n
unit: 10
type: documentation
verified: cairn-check, cairn-check:test, typecheck, test, build
```

The conformance matrix had carried `Cold-resume pilot — not run` since the row was written,
while the specification named cold resume its **primary** metric. Rules went 24 → 40 in four
days against a central claim with zero measurements. This is the first run.

- **Method.** Twenty distinct handoff briefs, taken as they stood at real commits across six
  paths and seven weeks. One participant per brief, no prior context, exactly two documents
  — `AGENTS.md` and the brief — and the eight answerable-alone questions. Participants were
  told to report UNANSWERABLE rather than reconstruct from plausibility. One participant per
  brief so no trial could be informed by another.
- **Headline: 7 of 20 (35%) would have begun work without asking a human.** Thirteen would
  have stopped. Confidence in the first action: 2 high, 7 medium, 11 low.
- **By question**, two failures dominate: `resume_commit` 16/20 and `must_read` (at which
  object id) 15/20 — precisely the two the v0.2 contract added fields for. Briefs
  consistently named *which* documents to read and consistently failed to say *at which
  version*. `blocking` never failed once.
- **By path, the distribution is flat** — five of six paths sit between 2.5 and 3.0
  unanswerable per trial, across work as different as an OCR bench, a protocol path and a
  worktree cleanup. That **rules out** the one diagnosis this reading exists to detect: the
  schema is not underspecified for a class of work, so no specification change is indicated.
- **The writer axis could not be computed at all.** Every brief in this repository's history
  carries one Git author, because one participant commits work produced by several. This is
  the pilot's most actionable output and it is an instrument fix, not a protocol fix:
  `written_by` is now a required brief field, because without it the pilot can rule out a
  path-class problem and cannot confirm a practice problem.
- **Schema era stands in, at n = 2.** Pre-contract briefs average 2.7 unanswerable per
  trial; the two written under the v0.2 contract average 0.5. The direction is large and
  **two trials establish nothing** — recorded as suggestive and labelled as such. The single
  v0.2-era failure is the interesting one: `checkpoint: PENDING`, a placeholder left in a
  field the schema does specify. Seven of eight answered, stopped at the resume point. A
  practice failure of a schema that worked — the category the writer axis exists to count,
  appearing at n = 1.
- **The outlier argues against my own rule.** The two best-scoring briefs are the WSLg pair
  at 0.5 unanswerable per trial, and they are the **least** protocol-shaped documents in the
  corpus: not coding paths, no seven sections, one self-declared "a side micro-unit, not a
  path step". They score well because they are dense narratives that happen to contain the
  facts. Section conformance is a way of making those facts likely; it is not what made
  these briefs resumable, and a brief can satisfy every structural rule in `brief-schema`
  while failing every question a resumer actually has. Worth holding onto now, while the
  schema is new and its passing grade is still being mistaken for the goal.
- **Limits, stated rather than buried.** Graders are language models — consistent and
  literal, which suits a schema test, and unlike a real resumer they never get impatient or
  resourceful. At least one grading inconsistency survived (a trial marked `must_read`
  ANSWERED while its own justification says no object id was given), so the true count is
  ≥ 15. The path sample is unbalanced, 10 of 20 from one path. The corpus is historical,
  which is fair as a baseline and unfair to whoever wrote those briefs. `would_act` is
  self-reported: nobody was asked to actually perform the action.
- **What it says about v0.3: do not change the normative text yet.** The flat path
  distribution removes the outcome that would justify a schema change; the dominant failures
  map onto fields v0.2 already added; the only clean signal rests on two trials. The next
  step is to keep writing briefs under the contract with `written_by` populated, re-run at
  fifteen v0.2-era briefs from more than one writer, and read the writer axis then. **A
  protocol that revises itself faster than it can measure itself is the failure this pilot
  was commissioned to prevent.**
- Record: [`docs/cairn/cairn-cold-resume-pilot-2026-08-26.md`](../../../docs/cairn/cairn-cold-resume-pilot-2026-08-26.md).
  No rule added; no normative text changed except the two the reviewer's own points
  required — `written_by`, and the requirement to record writer and path with every trial.
