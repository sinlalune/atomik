---
type: Atomik ADR
title: 'ADR-017: The coding-path lifecycle — archived is the terminal state, and an abandoned path has a way out'
description: Settles the path status machine that three documents described differently - done is a completion, archived is the single terminal state and the exit for abandoned paths too, active is retired, and staleness is noticed without blocking.
tags: [adr, cairn, lifecycle, paths, status, protocol]
timestamp: 2026-08-25T00:00:00Z
adr:
  id: ADR-017
  status: accepted
  date: 2026-08-25
---

# ADR-017: The coding-path lifecycle — `archived` is the terminal state, and an abandoned path has a way out

Status: accepted
Date: 2026-08-25
Amends: ADR-012 (parallel coding paths, self-merge, and a protocol check in CI)

## Context

Three documents described the same state machine and no two agreed. `AGENTS.md`
says that when they disagree it is a defect to report; the audit reported it
(2026-08-24, F11 and F15), and the owner ruled that a specification may not
settle it — an ADR must (opening check, ruling 5).

- **`docs/bedrock/35_35-coding-path-execution-state.md`**: *"A finished path
  moves to `status: done`, then `archived` (or `coding-paths/archive/`) —
  demotion, never deletion."* Two states after completion, in that order.
- **Round 3's D2 §2.2** declares `done` **terminal** and draws
  `running → archived` as the abandonment edge. That is the same two words
  arranged into a different machine, and it was authored in a deliverable rather
  than decided anywhere.
- **[ADR-012](./ADR-012-parallel-paths-self-merge.md)** records the hole plainly:
  an abandoned path keeps `status: running`, lingers in the generated views, and
  *"no terminal transition exists"*.

Underneath the disagreement sits a fourth state that means nothing. `active` is
accepted by `PATH_STATUSES` and rejected by `PATH_BRANCH_STATUSES`, so a path
declaring it passes `schema` and is then refused by `branch-path` with a message
about something else. `paths.md` reserved it for CP-OPS-001, which is `done`, so
the reservation is spent (F11).

The validator has never checked any of this. It reads the status a file declares
*right now*; it has never seen a transition, because a working tree is one state
and not a history.

## Decision

### 1. `archived` is the single terminal state; `done` is a completion, not an end

Bedrock wins, because `AGENTS.md` says bedrock states the doctrine and
`paths.md` carries operating detail. The machine is:

```text
draft ──────► running ──────► done ──────► archived   ── the ordinary life
                │  ▲                          ▲
                │  └── blocked ──┘            │
                └─────────────────────────────┘
                     abandonment
```

- `done` means **accepted, rebased, audited and merged**. It is the state a path
  is in when its work is in the trunk and its record is still current reading.
- `archived` means **off the portfolio**: retained as history, no longer
  something a person opening the repository needs to read. Demotion, never
  deletion — the same lifecycle bedrock 11 gives a note.

Round 3's D2 §2.2 is corrected to this and stops being the source.

### 2. Abandonment is `running → archived`, and it takes no new word

An abandoned path exits the same door a finished one eventually uses. It does
**not** pass through `done`: `done` asserts that work landed on the trunk, and
that assertion would be false. The two roads differ in what the record says, not
in the vocabulary — `archived` already means *"scope superseded, retired, or
preserved as historical record"*, which is exactly an abandoned path.

Adding an `abandoned` status was rejected. It would be a fifth word for a shelf
that already exists, and every consumer — the generated view, the register,
`branch-path` — would need to learn it in order to treat it identically to
`archived`.

**The closing ceremony is not side-stepped by this.** The ceremony gate keys on
`done`, which is the claim that a merge happened; archiving claims the opposite.
A path may not reach `done` without an accepted closing note, and archiving is
not a cheaper route to `done` — it is a different destination.

### 3. `active` is retired from the vocabulary

Removed from `PATH_STATUSES`. No path file declares it, so this deletes dead
vocabulary rather than migrating anything, and a path declaring `active` now
fails `schema` with a message about the actual problem instead of failing
`branch-path` with a message about a different one.

### 4. Transitions are stated doctrine; INVARIANTS are what a gate can check

This is the honest half, and it is stated so no later document claims more.

A validator run sees one commit. It cannot know that a `done` path was `running`
yesterday, and a rule that guessed would be wrong the first time a path file was
created already-complete. So the state machine above is doctrine for the people
and agents executing it, and what CI enforces is the set of **per-state
invariants**, which are facts about one file:

```text
running    requires branch + base_commit, an opening-check note, a trunk
           registration, and a branch containing the trunk tip
done       requires a closing-ceremony note
archived   carries no branch obligations
draft      carries no branch obligations
blocked    carries no branch obligations
```

Those already exist. This ADR adds no blocking rule, and that is a decision
rather than an omission: the admission test is *objectively checkable AND
breaking it leaves something wrong in the repository*, and "which state was this
in last week" fails the first half.

### 5. Staleness is NOTICED, never blocked

ADR-012's hole was two things: no terminal transition, and nothing that notices
a path needing one. Decision 2 supplies the first. The second is an **advisory**
`path-staleness` finding: a path declaring `running` whose branch has had no
commit for longer than the declared window is reported, with the two ways out —
push the work, or archive the path.

Advisory is the whole point. A slow path is not a wrong path; a path can be
legitimately parked for a fortnight while its owner ships something else, and a
build that failed for it would teach people to lie about status. The window is
therefore a **declared property of a repository**, not a truth about
software — the same shape enforcement tiers took in
[ADR-016](./ADR-016-cairn-enforcement-integrity.md) §3. It starts at 14 days and
becomes configurable when `cairn.config.json` lands (CP-OPS-002 S08).

A branch the checkout cannot resolve — a shallow CI clone, a path whose branch
lives only on another machine — reports **nothing**. Unknown must never read as
stale, for the same reason it must never read as fresh.

## Consequences

- `paths.md`'s first open hole is closed, both halves of it. The remaining two —
  `base_commit` accuracy and checkpoint accuracy — are untouched and still open.
- Round 3's D2 §2.2 documents an accepted outcome instead of proposing a machine
  of its own, and its status vocabulary table loses the `active` row.
- One dead word leaves the vocabulary; no path file changes, because none used it.
- The specification (CP-OPS-002 S07) inherits a lifecycle it can describe by
  reference. It must carry decision 4 verbatim in spirit: a document that says
  Cairn "enforces the path lifecycle" would be a fresh instance of F13 — a
  published rule the implementation does not honour.
- Nothing here requires a host, an account, or a network. It is tier 0.

## Alternatives considered

- **Make `done` terminal, as D2 drew it.** Rejected: it contradicts bedrock,
  and it leaves a repository's path register growing without bound, since
  nothing may ever be demoted off it.
- **Add an `abandoned` status.** Rejected — see decision 2. A fifth word for an
  existing shelf, which every consumer would then have to special-case into
  behaving exactly like `archived`.
- **Require a ceremony note to archive.** Rejected: an abandoned path never
  earned an owner acceptance, and demanding a ceremony for the act of giving up
  is how paths stay `running` forever instead. The reason belongs in the path's
  own ledger, where the audit can read it and no gate has to judge it.
- **Make staleness blocking after some window.** Rejected: it fails the
  admission test, it punishes a legitimately parked path, and its first false
  verdict would be an argument for switching the validator off.
- **Enforce the transitions with a rule that reads Git history.** Rejected as
  unaffordable honesty-for-money: it would need the previous state of a file
  that may have been created complete, on a branch CI may have shallow-cloned,
  to block on something that is not wrong in the repository.

## Migration / rollback

None. No path file declares `active`, and no path is currently abandoned, so the
corpus already satisfies every invariant this record states. Rollback would mean
restoring a vocabulary word with two contradictory meanings and a hole that
ADR-012 recorded and nothing closed.

## Links

- Amends: [ADR-012](./ADR-012-parallel-paths-self-merge.md) §"Holes still open"
- Enforcement integrity: [ADR-016](./ADR-016-cairn-enforcement-integrity.md)
- Doctrine: [`docs/bedrock/35_35-coding-path-execution-state.md`](../bedrock/35_35-coding-path-execution-state.md)
- Operating detail: [`atomik-project/coding-paths/paths.md`](../../atomik-project/coding-paths/paths.md)
- Findings F11 and F15: [`docs/cairn/cairn-audit-2026-08-24.md`](../cairn/cairn-audit-2026-08-24.md)
- Owner ruling 5: [`atomik-project/sessions/2026-08-24-cp-ops-002-opening-check.md`](../../atomik-project/sessions/2026-08-24-cp-ops-002-opening-check.md)
