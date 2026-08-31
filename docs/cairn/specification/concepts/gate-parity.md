---
type: Cairn Concept
title: Gate parity
description: One gate, run in different places on the same tree, must reach the same verdict — and what it means when it does not.
tags: [cairn, concept, enforcement, checker, continuous-integration]
timestamp: 2026-08-27T00:00:00Z
---

# Gate parity

Gate parity is the property that one gate, run on one tree, reaches the same
verdict wherever it runs.

## Build the idea

A Cairn gate runs at least twice on the way to integration. A person runs it
locally before committing, and
[continuous integration](./continuous-integration.md) runs it again on the
proposed result. The whole point of the local run is that it answers the same
question the remote one will: work is checked before it is published, not after.

If the two can disagree, the local run stops being a check and becomes a guess.
Worse, it is a *confident* guess — it prints the same OK, in the same format,
from the same command.

Parity breaks when a predicate reads something that is a property of the
**environment** rather than of the **tree**. The tree is the same in both places;
the environment is not. Anything the checker learns from outside the tree is a
candidate:

- the current branch name — a person is on `path/x`, CI is on a detached ref;
- whether a remote ref is fetched — a person has origin, a shallow clone may not;
- the working directory, the user, the clock;
- which comparison base is passed in.

## In Cairn

The local and CI invocations of one gate MUST reach the same verdict on the same
tree. `AGENTS.md` already promises it in prose — *"These run locally with the
same command CI runs"* — and a promise with no test is a
[proxy](./proxy-predicate.md) for the property, not the property.

A predicate MUST NOT branch on a value that varies with where it runs. Where a
rule genuinely needs to know its context, it MUST derive that from the tree — the
path record's declared `status`, the presence of a record — never from the name
of the branch it happens to be sitting on.

The reference checker broke this once, and the break is worth keeping as the
worked example. The derived-view rule skipped itself when the branch matched
`path/*`, on reasoning that was sound when it was written: a running path never
hand-writes the generated view. CI checks out a detached merge ref, whose branch
is `HEAD`, so the rule ran there. One tree, two verdicts, one command:

```text
local, on path/cp-ui-typography   OK — protocol satisfied
CI,    on HEAD (detached)         FAILED — the derived running-paths view is stale
```

Both runs were correct about the question they asked. Only one of them asked the
right one.

## It does not prove

Parity is agreement, not correctness. Two environments can agree perfectly on the
same wrong answer, and a rule that is [unsound](./unsound-gate.md) is unsound
identically everywhere. Parity removes one class of surprise — the gate that
changes its mind — and says nothing about whether the verdict was ever right.

Related: [unsound gate](./unsound-gate.md),
[proxy predicate](./proxy-predicate.md),
[continuous integration](./continuous-integration.md),
[enforcement profile](./enforcement-profile.md), [exit code](./exit-code.md).
