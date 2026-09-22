---
type: Cairn Concept
title: Control plane
description: The files and host settings that define how Cairn validates and integrates work.
tags: [cairn, concept, governance, security]
timestamp: 2026-08-25T00:00:00Z
---

# Control plane

The control plane is the mechanism that interprets and enforces Cairn.

## In Cairn

It includes the checker, its configuration and schemas, templates, rule
catalogue generator, CI workflow, and host integration settings. If ordinary
path work can change the validator and its expected tests in the same approval
unit, the mechanism is not an independent security boundary.

A protected profile requires separate ownership or approval for control-plane
changes.

## It does not prove

Generated agreement between a checker, its tests, and its documentation proves
internal consistency only; all three can agree on a weakened rule.

Related: [enforcement profile](./enforcement-profile.md),
[conformance](./conformance.md), [tamper evidence](./tamper-evidence.md).

