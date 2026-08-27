---
type: Cairn Reference
title: The handoff-brief contract
description: The exact frontmatter fields, capped body sections, budget, and answerable-alone test for a Cairn handoff brief.
tags: [cairn, reference, handoff, brief, resumability, template]
timestamp: 2026-08-26T00:00:00Z
---

# The handoff-brief contract

The [handoff brief](../concepts/handoff.md) is the protocol's bootstrap
document: the first thing a new participant reads and, for several minutes, the
only thing they have read. This page gives it exact fields, because a bootstrap
contract described only in prose is not a contract.

Filename:

```text
project/briefs/<lowercase-path-id>-handoff.md
```

One brief per path. It is **mutable** and rewritten at every completed
[work unit](../concepts/work-unit.md). The
[work ledger](../concepts/work-ledger.md) is the append-only history; the brief
is the current situation. A brief that can only be understood by someone who has
also read the ledger has become a second ledger and has failed.

## Frontmatter

| Field | Type | Meaning |
| :-- | :-- | :-- |
| `written_by` | participant id | who refreshed this brief. Required so a cold-resume pilot can tell a practice problem from a schema problem; git authorship cannot, because one committer may publish several participants' work |
| `checkpoint` | full object id | the last **retained** checkpoint; the exact resume point |
| `checkpoint_unit` | ledger ordinal | that checkpoint's `unit:`, so the brief and its retention ref agree |
| `checkpoint_pushed` | boolean | whether `checkpoint` is present on the remote path branch. `false` is a defect to repair, not a state to hand over |
| `base_commit` | full object id | the trunk commit the path was registered from |
| `trunk_seen` | full object id | the trunk tip last fetched, so a reader knows how stale the path's view is |
| `writes` | list of path patterns | copied from the path record; what this path may change |
| `governs` | list of `path@<object-id>` | the documents that bind this work, each pinned at an exact id |
| `verify` | list of exact commands | run verbatim to confirm the checkpoint is what the brief says |
| `budget_tokens` | integer | the size budget for the whole brief; default `1200` |

`checkpoint` cannot be the commit that contains the brief. A brief is refreshed
inside the work unit it describes, so at write time that commit does not exist —
the same self-reference the `cairn-unit` ordinal solves. It names the last
checkpoint that is already retained and resumable.

`governs` entries MUST carry the `@<object-id>` pin. An unpinned document
reference means "read whatever this says now", which is precisely the ambiguity
the field exists to remove.

`verify` entries MUST be runnable as written, with no placeholder and no
description of a command. A reader must be able to paste them.

## Body — seven capped sections

The body holds these seven sections, in this order, and no others. Each SHOULD
stay within roughly 150 tokens; the whole brief SHOULD stay within
`budget_tokens`.

| Section | Answers | Cap guidance |
| :-- | :-- | :-- |
| `## Outcome` | what this path is for, in one paragraph | ~100 tokens |
| `## State` | where the work stands at `checkpoint` | ~200 tokens |
| `## Next action` | the single next thing to do | ~120 tokens |
| `## Blockers` | the named condition and its unblock condition, or `none` | ~120 tokens |
| `## Tried and rejected` | approaches already eliminated, each with its reason | ~250 tokens |
| `## Reading order` | which `governs` documents to read, in what order, and why | ~200 tokens |
| `## Verification` | what the `verify` commands should produce | ~150 tokens |

**Next action is singular.** A list of three next actions is a plan, and plans
belong in the path record. The brief names the one action a resuming participant
should take before anything else.

**Tried and rejected is the section people skip and the one that saves the most
time.** Without it, a cold reader's first instinct is usually the approach the
last writer already eliminated, and they will spend an hour rediscovering why.

## The answerable-alone contract

A reader holding only `AGENTS.md` and this brief — no ledger, no conversation,
no prior session — MUST be able to state:

1. the outcome this path is for;
2. the exact commit to resume from;
3. the single next action;
4. what the path may write;
5. what it must read, and at which object id;
6. what is blocking, if anything;
7. what has already been tried and rejected;
8. the exact commands that verify the checkpoint.

If answering any of these requires opening the ledger, the brief has failed its
contract, and refreshing it is part of the next work unit.

## Cold resume

The same test, run as a measurement: place a participant with no prior context
in front of `AGENTS.md`, this brief, and the repository at `checkpoint`, and ask
them to perform the next action. Record whether they did it correctly and how
long it took to the first correct action.

Record `written_by` and the path id with **every** trial. The aggregate over the
eight questions is the least useful reading: failures clustering by writer mean
the schema is fine and the practice is not, failures clustering by path mean the
schema is underspecified for a class of work, and those point in opposite
directions. The aggregate hides which one you are in.

This is the pilot's **primary** metric, ahead of ceremony time, artifact count,
or advisory volume. A protocol whose briefs cannot be resumed cold has failed at
the thing it exists for, however cheap its ceremony has become.

## Template

````md
---
type: Cairn Brief
title: Handoff — CP-EXAMPLE-001
timestamp: 2026-01-15T16:00:00Z
cairn:
  path: CP-EXAMPLE-001
  branch: path/cp-example-001
  written_by: participant-id
  checkpoint: fedcba9876543210fedcba9876543210fedcba98
  checkpoint_unit: 07
  checkpoint_pushed: true
  base_commit: 0123456789abcdef0123456789abcdef01234567
  trunk_seen: 4444444444444444444444444444444444444444
  writes:
    - src/example/**
    - docs/modules/example.md
  governs:
    - docs/architecture/example.md@89ab89ab89ab89ab89ab89ab89ab89ab89ab89ab
    - docs/adr/ADR-004-example.md@cdefcdefcdefcdefcdefcdefcdefcdefcdefcdef
  verify:
    - npm run cairn-check
    - npm test
  budget_tokens: 1200
---

# Resume CP-EXAMPLE-001 here

## Outcome

One paragraph: the bounded result this path exists to produce.

## State

What is done at the checkpoint, and what is not.

## Next action

Exactly one action.

## Blockers

The named condition and what would clear it, or `none`.

## Tried and rejected

- Approach A — rejected because …
- Approach B — rejected because …

## Reading order

1. `docs/architecture/example.md@89ab…` — why it binds this work.
2. `docs/adr/ADR-004-example.md@cdef…` — the constraint it fixes.

## Verification

What `npm run cairn-check` and `npm test` should print at this checkpoint.
````

Return to [make progress resumable](../index.md#make-progress-resumable) or the
[handoff-brief concept](../concepts/handoff.md).
