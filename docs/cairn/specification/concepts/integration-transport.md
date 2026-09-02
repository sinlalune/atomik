---
type: Cairn Concept
title: Integration transport
description: The defined mechanism that checks and lands an exact candidate on the remote trunk.
tags: [cairn, concept, integration, governance]
timestamp: 2026-08-26T00:00:00Z
---

# Integration transport

An integration transport is the complete route by which a proposed
[Git](./git.md) [commit](./commit.md) is checked and made the
[remote](./remote.md) [trunk](./trunk.md).

## In Cairn

The transport must identify the exact candidate, attach required checks to that
identity, prevent implementation changes after acceptance, record `done` only
while integrating, and prove the landed result remotely. A checked local merge,
a host-managed queue, a candidate-ref fast-forward, or a trusted bot can qualify
only when the repository implements and tests the whole route.

What the transport MUST NOT do is require the trunk to be unchanged since the
candidate was accepted. Equality with the accepted base is the obvious rule and
a livelock: see [acceptance drift](./acceptance-drift.md) for the predicate that
replaces it, and why.

Registration needs a corresponding route that avoids requiring a path to already
exist on trunk before its declaration can land.

## It does not prove

A branch-protection switch or a passing status on a different commit is not a
transport.

Related: [merge](./merge.md), [acceptance drift](./acceptance-drift.md),
[trunk registration](./trunk-registration.md),
[enforcement profile](./enforcement-profile.md).
