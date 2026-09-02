---
type: Cairn Concept
title: Gate parity
description: One gate, run in different places on the same tree, must reach the same verdict — and what it means when it does not.
tags: [cairn, concept, enforcement, checker, continuous-integration]
timestamp: 2026-09-02T00:00:00Z
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

It broke a second time from the other side, and this one is the sharper lesson.
The repair for the first break taught the checker to ask the host — GitHub's
branch variables — before asking Git, because a detached checkout cannot name
its branch. That answer is correct for the repository the host checked out and
wrong for any other. The checker's own fixture suite builds small repositories
and runs the real checker inside them; in CI those runs inherited the host's
variables and were judged as the branch under test, `path/cp-ops-002`, which
none of them had. Every fixture passed on a laptop and seventeen failed in CI
for seven pushes, unread. The environment is a [proxy](./proxy-predicate.md) for
"which branch is this tree on", and it is only a truthful one when the tree is
the one the environment describes. The checker now trusts a host variable only
when the host's workspace is the repository being checked.

The repair is worth as much as the defect, because the obvious fix was the wrong
one. Keying the exemption on the path's declared `status` instead of the branch
name would have satisfied the rule above — the status is in the tree — and it
was the recorded plan for months. It was still unnecessary: the generated view
is *already* a projection of those statuses, so a checkout can disagree with it
only when something there moved a status without regenerating. The exemption was
deleted rather than rewritten. When a predicate branches on where it runs, look
first for the branch that does not need to exist.

The second break is plainer, and therefore the more useful example: not a rule
skipping itself, but the two invocations handing every rule a different **input**.

```text
npm run cairn-check                            working tree vs HEAD    0 files    OK
node cairn-check.mjs --base origin/master      branch vs trunk       224 files    9 blocking
```

Both runs are local, on one branch, one tree, one command name — and the green
one is what a developer runs before every commit. Nothing exotic is involved: no
detached ref, no environment-only condition. The green line had been going into
ledger entries as their verification.

A second, independent break was running underneath this one on the same branch,
and it is worth keeping beside it because the two look identical from a green
local run and have nothing else in common. The remote checkout was ALSO missing
a ref namespace the local one had, so a rule there answered a question it could
not see the evidence for. Parity can break through the *inputs* a gate is given
as easily as through the predicates it runs, and neither is visible from inside
the passing side.

What makes this a parity break rather than a preference is that the base is
chosen *before* any predicate runs, so every changed-file rule inherits it
without ever mentioning it. The repair is to make the default the comparison
that decides the merge, keep the narrower one as an opt-out, and have the run
name the base it used in the line people copy into a record.

## It does not prove

Parity is agreement, not correctness. Two environments can agree perfectly on the
same wrong answer, and a rule that is [unsound](./unsound-gate.md) is unsound
identically everywhere. Parity removes one class of surprise — the gate that
changes its mind — and says nothing about whether the verdict was ever right.

Related: [unsound gate](./unsound-gate.md),
[proxy predicate](./proxy-predicate.md),
[continuous integration](./continuous-integration.md),
[enforcement profile](./enforcement-profile.md), [exit code](./exit-code.md).
