---
type: Cairn Concept
title: Integrator
description: The participant or automation that operates the repository's exact-commit integration transport.
tags: [cairn, concept, role, integration]
timestamp: 2026-08-26T00:00:00Z
---

# Integrator

The integrator is a path-scoped responsibility: it constructs or supervises the
exact [trunk](./trunk.md) candidate, records the
[done state](./done-state.md), runs required gates, lands the checked
[commit](./commit.md), and verifies it on the [remote](./remote.md).

The integrator can be a developer, a trusted bot, or a host-managed queue.
Cairn does not create a permanent central or human integrator. Each path carries
its own accepted result through the transport, whose authority and exact-commit
behaviour remain explicit.

Related: [integration transport](./integration-transport.md),
[done state](./done-state.md), [authorised reviewer](./authorised-reviewer.md).
