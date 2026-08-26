---
type: Cairn Concept
title: Draft state
description: A proposed coding path that has not entered execution, including the roadmap a foundation path produces.
tags: [cairn, concept, state]
timestamp: 2026-08-26T00:00:00Z
---

# Draft state

`draft` means a path is being designed and has not been registered for
execution.

It requires a stable id but need not yet have a base [commit](./commit.md) or
[remote checkpoint](./remote-checkpoint.md).
[Opening acceptance](./opening-acceptance.md) moves it to `running` through
registration. A proposal that will not execute may archive as `abandoned` or
`superseded`.

`draft` is also where a repository's roadmap lives. A
[foundation path](./foundation-path.md) delivers its plan as a set of `draft`
path records — one per bounded piece of the intended product, each reviewable,
none yet accepted. They are not a backlog in another tool; they are ordinary
path records waiting on the transition the lifecycle already provides.

It does not authorise implementation.

Related: [opening acceptance](./opening-acceptance.md),
[foundation path](./foundation-path.md), [running state](./running-state.md),
[archived state](./archived-state.md).
