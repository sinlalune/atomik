---
type: Cairn Measurement
title: Cold-resume pilot — 20 trials, 2026-08-26
description: The first measurement of Cairn's central claim, that a participant with no prior context can resume a path from AGENTS.md and a handoff brief alone.
tags: [cairn, pilot, cold-resume, measurement, handoff]
timestamp: 2026-08-26T00:00:00Z
---

# Cold-resume pilot — 20 trials

The specification names cold resume as the pilot's **primary** metric and the
conformance matrix had carried it as `not run` since the row was written. This
is the first run.

## Method

Twenty distinct handoff briefs, taken as they stood at real commits across six
paths and seven weeks of history. Each trial placed one participant with no
prior context in front of exactly two documents — `AGENTS.md` and one brief —
and asked the eight answerable-alone questions. Participants were instructed to
read nothing else, run nothing, and report UNANSWERABLE rather than reconstruct
from plausibility.

One participant per brief, so no trial could be informed by another. Trials were
recorded with the brief's path and, where available, its writer.

## Headline

> **7 of 20 participants (35%) would have begun work without asking a human
> first.** Thirteen would have stopped to ask.

Confidence in the first action: 2 high, 7 medium, 11 low.

## Reading 1 — by question

| Question | Unanswerable |
| :-- | --: |
| `resume_commit` | **16 / 20** |
| `must_read` (at which object id) | **15 / 20** |
| `outcome` | 10 / 20 |
| `tried_rejected` | 4 / 20 |
| `may_write` | 3 / 20 |
| `next_action` | 1 / 20 |
| `verify` | 1 / 20 |
| `blocking` | 0 / 20 |

Two questions account for most of the failure, and they are precisely the two
the v0.2 brief contract added fields for: `checkpoint` / `checkpoint_unit` for
the resume point, and `governs` pinned at `path@<object-id>` for what to read.
Briefs consistently named *which documents* to read and consistently failed to
say *at which version*.

`blocking` never failed. Every brief in the corpus said whether it was blocked.

## Reading 2 — by path

| Path | Unanswerable per trial | n |
| :-- | --: | --: |
| `CP-MVP-004` (OCR bench) | 3.0 | 2 |
| `CP-OPEN-DOCK` | 3.0 | 1 |
| `CP-OPS-001` | 3.0 | 3 |
| `CP-OPS-002` | 2.6 | 10 |
| `CP-WORKTREE-CLEANUP` | 2.5 | 2 |
| WSLg window offset | 0.5 | 2 |

**Failures do not cluster by path.** Five of six sit between 2.5 and 3.0, across
work as different as an OCR bench, a protocol path and a worktree cleanup. That
rules out the diagnosis this reading exists to detect: the schema is not
underspecified for a particular class of work.

The outlier is the finding worth arguing about — see below.

## Reading 3 — by schema era

The writer axis, which is the reading that separates *practice* from *schema*,
**could not be computed**. Every brief in this repository's history carries one
Git author, because one participant commits work produced by several. That is
why `written_by` is now a required brief field: without it this pilot can rule
out a path-class problem and cannot confirm a practice problem.

The available substitute is the brief's schema era:

| Era | Unanswerable per trial | Would act | n |
| :-- | --: | --: | --: |
| Before the v0.2 contract | 2.7 | 6 / 18 | 18 |
| Under the v0.2 contract | **0.5** | 1 / 2 | **2** |

**n = 2 on the arm that matters.** This is suggestive and nothing more. It is
recorded because the direction is large, not because two trials establish
anything.

The single v0.2-era failure is instructive on its own: that brief carried
`checkpoint: PENDING`, a placeholder left in a field the schema does specify.
Its participant answered seven of eight and stopped at the resume point. That is
a **practice** failure of a schema that worked — the category the writer axis
exists to count, appearing at n = 1.

## The outlier argues against my own rule

The two best-scoring briefs are the WSLg pair, at 0.5 unanswerable per trial —
and they are the **least** protocol-shaped documents in the corpus. Neither is a
coding path. Neither uses the seven sections. One declares itself "a side
micro-unit, not a path step." They score well because they are dense narratives
that happen to contain the facts: what was tried, what was rejected and why,
which files, which commit, what the owner still has to look at.

The seven-section contract is a way of making those facts likely. It is not what
made these briefs resumable, and a brief can satisfy every structural rule in
`brief-schema` while failing every question a resumer actually has. That is worth
holding onto now, while the schema is new and its passing grade is still being
mistaken for the goal.

## Limits of this measurement

- **Graders are language models, not people.** They are consistent and literal,
  which suits a schema test, and they do not get impatient, confused, or
  resourceful the way a real resumer does.
- **At least one grading inconsistency survived**: a trial marked `must_read`
  ANSWERED while its own justification states no object id was given. The true
  `must_read` failure count is therefore ≥ 15.
- **The path sample is unbalanced** — 10 of 20 trials come from one path.
- **The corpus is historical.** Most briefs were written before the contract
  they are being judged against, which is fair as a baseline and unfair as an
  assessment of the people who wrote them.
- **`would_act` is self-reported.** No participant was asked to actually perform
  the action, so this measures stated readiness, not correctness.

## What this says about v0.3

It says **do not change the normative text yet.**

The failure distribution is flat across paths, which removes the one outcome
that would have justified a schema change. The two dominant failures map onto
fields v0.2 already added. The only clean signal — that the contract helps —
rests on two trials, and the only failure inside it was a placeholder, not a
gap.

The honest next step is not a revision. It is:

1. keep writing briefs under the v0.2 contract, with `written_by` populated;
2. re-run this pilot when there are at least fifteen v0.2-era briefs from more
   than one writer;
3. only then read the writer axis, which is the reading that decides whether the
   remedy is a template or a specification.

A protocol that revises itself faster than it can measure itself is the failure
this pilot was commissioned to prevent.
