---
type: Cairn Concept
title: Conformance
description: A precise account of which protocol requirements an implementation satisfies, and which it has only written down.
tags: [cairn, concept, implementation]
timestamp: 2026-08-26T00:00:00Z
---

# Conformance

Conformance is the relationship between the canonical protocol and a concrete
[repository](./repository.md) or tool implementation.

## In Cairn

A conformance statement distinguishes required behaviour, implemented
predicates, host-dependent protection, and unimplemented capability. It names
the enforcement profile and versioned configuration it actually uses.

Every normative requirement in this specification appears as one row of the
[conformance matrix](../index.md#current-conformance) with an honest
reference-tools column. A requirement may be canonical before any tool checks
it — that is how a protocol grows — but the row must say so, in the same table,
where a reader comparing claims to mechanisms will see both at once.

Partial conformance is useful when it is explicit. It is unsafe when
documentation turns a future mechanism into a present guarantee.

## It does not prove

Passing the implemented rule catalogue does not imply complete protocol
conformance or general-purpose readiness. A matrix is a claim about mechanisms,
not a measurement of a team.

Related: [schema](./schema.md), [enforcement profile](./enforcement-profile.md),
[control plane](./control-plane.md).
