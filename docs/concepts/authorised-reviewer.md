---
type: Cairn Concept
title: Authorised reviewer
description: A participant allowed by repository governance to accept path scope or an exact candidate, with role collapse made visible.
tags: [cairn, concept, role, governance]
timestamp: 2026-08-26T00:00:00Z
---

# Authorised reviewer

An authorised reviewer may record
[opening acceptance](./opening-acceptance.md) or
[closing acceptance](./closing-acceptance.md) under the
[repository's](./repository.md) declared governance.

Cairn does not require one permanent owner. The reviewer may be a developer,
domain specialist, or agent when policy permits. The record names the actor,
time, decision, and scope.

## Role collapse is recorded, not forbidden

A path has five role-bearing positions —
[initiator](./path-initiator.md), [writer](./path-writer.md), reviewer,
[auditor](./auditor.md), and [integrator](./integrator.md). A solo developer
working with agents holds all five, which makes closing acceptance a signature
the signer issued to themselves.

Cairn does not forbid that; forbidding it would make the protocol unusable for
the setup most likely to adopt it first. It requires the collapse to be
**visible**. Acceptance records name the roles the actor held, and an
[advisory finding](./advisory-finding.md) is raised when the same actor recorded
both the opening and the closing acceptance for one path.

The distinction that matters is between a weakness that is stated and a weakness
that is invisible. A repository whose every path shows one actor in all five
roles has a real property of its governance, and it should be able to read that
property off its own records rather than discover it during an incident.

Stronger [enforcement profiles](./enforcement-profile.md) may require separation
outright — for example, independent approval when a path changes the
[control plane](./control-plane.md) — and must also prove that the recorded
identity was authorised.

Related: [opening acceptance](./opening-acceptance.md),
[closing acceptance](./closing-acceptance.md),
[advisory finding](./advisory-finding.md), [control plane](./control-plane.md).
