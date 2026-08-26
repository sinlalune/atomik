---
type: Cairn Reference
title: Cairn conformance checklist
description: A claim-by-claim checklist for a Cairn repository or implementation.
tags: [cairn, reference, conformance, enforcement]
timestamp: 2026-08-25T00:00:00Z
---

# Cairn conformance checklist

A conformance report names the protocol version, implementation version,
configuration version, enforcement profile, host adapter, and date evaluated.
For each row it records `pass`, `fail`, `inconclusive`, `host-dependent`, or
`not implemented` with executable evidence where possible.

## Core path

- [ ] Canonical path ids, filenames, and branch names are unique.
- [ ] Opening acceptance precedes trunk registration.
- [ ] The declared base commit equals the registration commit's parent.
- [ ] Running, blocked, and ready path branches exist remotely.
- [ ] One writer assignment per writable worktree is visible.
- [ ] Each completed work unit updates code, tests, documents, ledger, and
      handoff together where relevant.
- [ ] Each completed work unit is committed and pushed immediately.
- [ ] Another authorised participant can resume from the recorded checkpoint.

## Closure and lifecycle

- [ ] Critical unavailable inputs return an inconclusive non-zero verdict.
- [ ] The path rebases before candidate `C` is produced.
- [ ] Product and protocol checks run against `C`.
- [ ] Audit and closing acceptance name the same full hash `C`.
- [ ] Advisory disposition is recorded.
- [ ] Exactly one allowlisted administrative commit `A` follows `C` on a ready
      path.
- [ ] A path branch never declares `done`.
- [ ] The exact integration candidate contains `C` and `A` without later
      implementation changes.
- [ ] `done` is recorded only in the trunk integration unit.
- [ ] The landed remote trunk is verified.

## Records

- [ ] Existing session, audit, rolled-history, and journal records cannot be
      modified, renamed, or deleted.
- [ ] Live ledger append-only and verbatim roll behaviour is either proved or
      reported as not implemented.
- [ ] Generated views are reproducible from canonical inputs.
- [ ] Git history is described as tamper-evident, not inherently immutable.

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
- [ ] Lightweight and emergency paths are either defined and tested or
      reported as not implemented.
- [ ] Operational cost has been measured on a representative pilot before a
      general-purpose claim is made.

## Reference v0.1 result

The current reference tools satisfy only the subset marked “implemented” in the
[canonical matrix](../index.md#current-conformance). In particular, they do not
yet satisfy portable configuration, ledger-prefix proof, protected transport,
independent control-plane protection, transaction commands, lightweight or
emergency paths, or a measured general-release pilot.
