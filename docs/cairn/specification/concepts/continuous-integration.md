---
type: Cairn Concept
title: Continuous integration
description: Automated checks run by a shared service against proposed repository states.
tags: [cairn, concept, foundation, ci]
timestamp: 2026-08-25T00:00:00Z
---

# Continuous integration

Continuous integration, or CI, runs declared commands in a fresh shared
environment when [repository](./repository.md) events occur.

## Build the idea

CI reduces dependence on one participant's machine. A job is useful only when
it runs for the relevant refs, sees the required history, and reports the exit
code for the exact commit under consideration.

## In Cairn

CI can repeat the local checker on path branches and integration candidates. A
`ci` profile means those results are published; only a correctly configured
`protected` profile means the host requires them.

## It does not prove

CI does not make judgement-bearing records true and cannot protect a workflow
that ordinary path work may silently weaken.

Related: [exit code](./exit-code.md), [enforcement profile](./enforcement-profile.md),
[control plane](./control-plane.md).
