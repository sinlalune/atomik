---
type: Cairn Concept
title: Lightweight path
description: The default Cairn route, reduced to the artifacts that carry durable meaning, with the full ceremony reserved for changes that earn it.
tags: [cairn, concept, route, adoption, cost]
timestamp: 2026-08-26T00:00:00Z
---

# Lightweight path

The lightweight path is Cairn's **default route**: one bounded change, one work
unit, and the smallest set of records that still makes the change resumable and
its acceptance exact.

## Build the idea

Retention refs, scope digests, structured dispositions, drift predicates and
brief contracts each close a real hole, and each one costs something to satisfy.
A set of rules made only of tightenings is one people eventually route around,
and a protocol routed around enforces nothing at all.

Demanding roughly nine artifacts for any bounded change means demanding them for
a one-line fix. That is the ceremony a control-plane change deserves and it is
absurd for a typo. Making the small route the default is not a concession — it
is what makes the strict route affordable where it matters.

## In Cairn

A lightweight path declares `route: lightweight` and keeps everything that
carries durable meaning:

- a [path record](./path-record.md) with id, branch, base, `writes:`,
  `governs:`, and a definition of done;
- a [handoff brief](./handoff.md) meeting the same answerable-alone contract;
- [remote checkpoints](./remote-checkpoint.md) and
  [checkpoint retention](./checkpoint-retention.md);
- a [closing acceptance](./closing-acceptance.md) naming the exact candidate,
  its [scope digest](./scope-digest.md), and its base;
- a [journal](./journal.md) entry at integration.

It combines what only ceremony separates. Opening acceptance is recorded in the
path record itself rather than as its own session file; the
[coherence-audit](./coherence-audit.md) questions are answered inline in the
closing record rather than in a separate audit file; and
[administrative closure](./administrative-closure.md) may share the candidate's
commit where the repository's transport can still bind acceptance to an exact
id.

### When the full route is required

A path MUST use `route: full` when it changes the
[control plane](./control-plane.md), changes
[architecture](./architecture.md) or a [decision record](./decision-record.md),
declares more than one implemented area in `writes:`, is expected to span more
than one work unit, or is designated high-risk by repository policy.

Escalation is one-way. A lightweight path that meets any full-route trigger MUST
escalate before its next checkpoint, recording the trigger in its ledger. No
path may declare itself down: a change does not become small by being called
small.

## It does not prove

The route is a declaration by the initiator, and the triggers are structural
proxies. A single-file change to one implemented area can still be the most
dangerous change of the quarter, and nothing in the route selection will say so.

Related: [coding path](./coding-path.md),
[foundation path](./foundation-path.md), [emergency path](./emergency-path.md),
[conformance](./conformance.md).
