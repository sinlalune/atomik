---
type: Cairn Concept
title: Enforcement profile
description: A declaration of where Cairn checks run and what prevents unsafe integration.
tags: [cairn, concept, enforcement, governance]
timestamp: 2026-08-25T00:00:00Z
---

# Enforcement profile

An enforcement profile states which Cairn mechanisms a
[repository](./repository.md) actually installs.

## In Cairn

`local` provides runnable checks. `ci` publishes checks from a remote runner.
`protected` additionally requires the exact candidate's results before trunk
integration and protects the control plane independently.

A profile is a capability claim, not a preference. A repository cannot claim
`protected` until its registration and integration transports are implemented
and tested.

## It does not prove

No profile makes judgement automatically correct. Host settings can also drift,
so their effective state needs independent evidence.

Related: [continuous integration](./continuous-integration.md),
[integration transport](./integration-transport.md),
[control plane](./control-plane.md).
