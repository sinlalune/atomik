---
type: Cairn Concept
title: Conformance
description: A precise account of which protocol requirements an implementation satisfies.
tags: [cairn, concept, implementation]
timestamp: 2026-08-25T00:00:00Z
---

# Conformance

Conformance is the relationship between the canonical protocol and a concrete
[repository](./repository.md) or tool implementation.

## In Cairn

A conformance statement distinguishes required behaviour, implemented
predicates, host-dependent protection, and unimplemented capability. It names
the enforcement profile and versioned configuration it actually uses.

Partial conformance is useful when it is explicit. It is unsafe when
documentation turns a future mechanism into a present guarantee.

## It does not prove

Passing the implemented rule catalogue does not imply complete protocol
conformance or general-purpose readiness.

Related: [schema](./schema.md), [enforcement profile](./enforcement-profile.md),
[control plane](./control-plane.md).
