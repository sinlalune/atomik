---
type: Cairn Concept
title: Done state
description: A trunk-recorded fact that an accepted implementation candidate is integrated.
tags: [cairn, concept, state, integration]
timestamp: 2026-08-25T00:00:00Z
---

# Done state

`done` means the exact accepted candidate is reachable from the
[remote](./remote.md) [trunk](./trunk.md) and the integrating trunk unit records
`resolution: completed`.

A path [branch](./branch.md) cannot claim `done` in advance. The
[integration transport](./integration-transport.md) writes it while landing the
checked result. The path may later move to `archived` with the completed
resolution.

It does not by itself prove the remote state; reachability is verified
separately.

Related: [ready state](./ready-state.md),
[integration transport](./integration-transport.md),
[archived state](./archived-state.md).
