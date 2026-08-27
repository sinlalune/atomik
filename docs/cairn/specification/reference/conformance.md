---
type: Cairn Reference
title: Cairn conformance checklist
description: A claim-by-claim checklist for a Cairn repository or implementation.
tags: [cairn, reference, conformance, enforcement]
timestamp: 2026-08-26T00:00:00Z
---

# Cairn conformance checklist

A conformance report names the protocol version, implementation version,
configuration version, enforcement profile, host adapter, and date evaluated.
For each row it records `pass`, `fail`, `inconclusive`, `host-dependent`, or
`not implemented` with executable evidence where possible.

## Route

- [ ] Every path declares `route:`.
- [ ] No path on `route: lightweight` meets a full-route trigger.
- [ ] No path on `route: lightweight` declares more than one `cairn-unit`.
- [ ] Every escalation from lightweight to full is recorded in the ledger, and
      no path was ever de-escalated.
- [ ] A lightweight path still names an exact candidate and an exact
      acceptance.
- [ ] Foundation and adoption paths declare `docs/**` plus `draft` path records
      and verify by `links`, `schema`, and coherence audit.

## Core path

- [ ] Canonical path ids, filenames, and branch names are unique.
- [ ] Opening acceptance precedes trunk registration.
- [ ] Opening acceptance records a `scope_digest` of the resolved `scope_ref`.
- [ ] The declared base commit equals the registration commit's parent.
- [ ] Running, blocked, and ready path branches exist remotely.
- [ ] One writer assignment per writable worktree is visible.
- [ ] Each completed work unit updates code, tests, documents, ledger, and
      handoff together where relevant.
- [ ] Each work unit declares a `cairn-unit` block with a step, a ledger
      ordinal, a type from the vocabulary, and a verification result.
- [ ] Each work unit's type's required parts actually moved together.
- [ ] Each completed work unit is committed and pushed immediately.
- [ ] Incomplete work under review is a pushed commit carrying
      `Cairn-Provisional:`, not an uncommitted working tree.
- [ ] Every declared unit except the newest resolves a retention ref at
      `refs/cairn/checkpoints/<path-id>/<unit>`, or the repository forbids
      rewriting pushes on path branches.
- [ ] Those refs are pushed, so retention survives the machine that wrote it.
- [ ] No retention ref has been moved or deleted while its path record is
      retained.
- [ ] The handoff brief carries `checkpoint`, `checkpoint_pushed`,
      `base_commit`, `trunk_seen`, `writes`, `governs` as `path@<object-id>`,
      `verify`, and `budget_tokens`.
- [ ] The brief's body holds the seven capped sections and stays within
      `budget_tokens`.
- [ ] A reader with `AGENTS.md`, the brief, and the repository at `checkpoint` —
      and no conversation, prior session, or memory of the path — can answer all
      eight answerable-alone questions from the brief or from a record it names
      at an exact object id.
- [ ] A cold resume has been performed and its success rate and
      time-to-first-correct-action recorded.
- [ ] Another authorised participant can resume from the recorded checkpoint.

## Closure and lifecycle

- [ ] Critical unavailable inputs return an inconclusive non-zero verdict.
- [ ] The path rebases before candidate `C` is produced.
- [ ] No commit between the base and `C` carries `Cairn-Provisional:`.
- [ ] Product and protocol checks run against `C`.
- [ ] Audit and closing acceptance name the same full object id `C`, in the
      repository's configured object format, never abbreviated — and the
      implementation accepts that format rather than assuming SHA-1.
- [ ] The closing record's `scope_digest` equals the opening digest, or a scope
      amendment supersedes the opening record.
- [ ] The closing record names the base `T` the candidate was accepted against.
- [ ] The closing record attests `advisories_at_candidate`, and
      `advisory_disposition` covers that set exactly, with an owner and
      follow-up on every deferral.
- [ ] No advisory raised at the closure commit is absent from the attested set.
- [ ] Acceptance records name the roles the actor held, and a collapsed
      opening/closing actor is reported as an advisory.
- [ ] Exactly one allowlisted administrative commit `A` follows `C` on a ready
      path, and it changed only `status`, `subject_commit`, one appended ledger
      entry, the brief's checkpoint pointer, and the two new records.
- [ ] A path branch never declares `done`.
- [ ] The exact integration candidate contains `C` and `A` without later
      implementation changes.
- [ ] `done` is recorded only in the trunk integration unit.
- [ ] Integration applies the drift predicate over `writes:` ∪ `governs:` and
      does not require the trunk to equal `T`.
- [ ] `ready → blocked` is available and recorded when acceptance stalls.
- [ ] An unchanged state is accepted for every state, and no
      `archived → archived` edge is claimed.
- [ ] The landed remote trunk is verified.

## Records

- [ ] Existing session, audit, rolled-history, and journal records cannot be
      modified, renamed, or deleted.
- [ ] Live ledger append-only and verbatim roll behaviour is either proved or
      reported as not implemented.
- [ ] Generated views are reproducible from canonical inputs.
- [ ] Git history is described as tamper-evident, not inherently immutable.
- [ ] Every redaction is preceded by rotation, carries an immutable redaction
      record, and touches only redaction in its own commit.
- [ ] Every protocol violation was repaired as a `repair` work unit, in a
      different unit from the one that caused it, with the violation left
      visible in the ledger.
- [ ] Writing outside `writes:` is accompanied by a declaration update in the
      same commit.

## Governance and portability

- [ ] Control-plane files are explicitly identified.
- [ ] A `protected` claim names and tests exact registration and integration
      transports.
- [ ] A `protected` claim independently protects control-plane changes.
- [ ] Configuration and record schemas are versioned.
- [ ] Runtime, package manager, Git, shell, path-normalisation, installation,
      update, and migration requirements are published.
- [ ] Transactional `init`, `new`, and `close` commands are either present or
      reported as not implemented.
- [ ] The emergency route is either specified and tested or reported as
      deliberately unspecified.
- [ ] Operational cost has been measured on a representative pilot before a
      general-purpose claim is made.

## Reference v0.2 result

The current reference tools satisfy only the subset marked “implemented” in the
[canonical matrix](../index.md#current-conformance). Every requirement added in
v0.2 — checkpoint retention, provisional commits, the brief contract,
field-level closure, scope digests, the drift predicate, structured
dispositions, recorded roles, blocking scope drift, typed work units, routes,
repair, and redaction — is canonical and **not implemented** by those tools.
They also do not yet satisfy portable configuration, ledger-prefix proof,
protected transport, independent control-plane protection, transaction commands,
or a measured general-release pilot.

A conformance report that marks any of those rows `pass` on the strength of the
reference tools alone is wrong. They can be satisfied by a repository's practice
and evidenced by hand; the column that says so is “Additional dependency”, not
“Reference tools”.
