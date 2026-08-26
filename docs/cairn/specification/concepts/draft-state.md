---
type: Cairn Concept
title: Draft state
description: A proposed coding path that has not entered execution.
tags: [cairn, concept, state]
timestamp: 2026-08-25T00:00:00Z
---

# Draft state

`draft` means a path is being designed and has not been registered for
execution.

It requires a stable id but need not yet have a base [commit](./commit.md) or
[remote checkpoint](./remote-checkpoint.md).
[Opening acceptance](./opening-acceptance.md) moves it to `running` through
registration. A proposal that will not execute may archive as `abandoned` or
`superseded`.

It does not authorise implementation.

Related: [opening acceptance](./opening-acceptance.md),
[running state](./running-state.md), [archived state](./archived-state.md).
