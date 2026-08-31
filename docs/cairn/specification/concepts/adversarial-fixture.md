---
type: Cairn Concept
title: Adversarial fixture
description: A test that proves a rule REJECTS a crafted violation — the only evidence that a gate can fail, and therefore that passing it means anything.
tags: [cairn, concept, enforcement, checker, test, soundness]
timestamp: 2026-08-27T00:00:00Z
---

# Adversarial fixture

An adversarial fixture is a test that builds a violation on purpose and asserts
the rule **rejects** it.

## Build the idea

Start with a question that sounds silly and is not: *how do you know a check
works?*

The usual answer is that the test suite is green. Consider what a green suite
actually establishes. The tests feed the checker valid repositories and assert it
reports OK. That is a real property, and it rules out one thing: the rule does
not fire when it should not.

Now consider a rule that never fires at all — one whose predicate is a tautology,
or that returns early on the branch under test, or that asks a filename question
already true for every input. **It passes every one of those tests too.** A
green suite cannot distinguish a working rule from a rule that has been asleep
since the day it was written.

So a suite of valid-input tests, however large, is not evidence that a gate
works. The only evidence is a case the gate **must reject**, which it does.

```text
this proves the rule is quiet   →  a valid repository, gate reports OK
this proves the rule is awake   →  a crafted violation, gate reports FAILED
                                   with that rule's name in the finding
```

The second is what an adversarial fixture is, and the finding must name the rule
— otherwise a test can pass because some *other* rule fired, and the rule under
test is still asleep.

## In Cairn

Every **blocking** rule MUST have at least one fixture that it rejects. A
blocking rule with no such fixture is unproven and SHOULD be treated as
[unsound](./unsound-gate.md) until one exists.

This is not a stylistic preference; it is the check that would have caught every
enforcement defect found so far. The reference checker's suite was large and
green while four of its rules were passing over live violations, because the
suite asked all of them the only question they could already answer.

A fixture is cheap in a way the rule is not. Writing `checkpoint-retention` means
reasoning about refs, rewrites and orphaned commits. Writing its fixture means
producing one repository with one orphaned commit and asserting the gate says so.

## It does not prove

A fixture proves the rule catches **that** violation, not the class of violation.
`checkpoint-retention` had a fixture for a missing ref and still passed over a
*moved* ref, because a moved ref is a different shape of the same idea and nobody
had built one.

So the fixture set is itself incomplete, always, and the honest response is to
add a fixture every time a real violation escapes — the violation that got
through is, by definition, the shape nobody imagined.

Related: [unsound gate](./unsound-gate.md),
[proxy predicate](./proxy-predicate.md), [test](./test.md),
[Cairn checker](./cairn-checker.md).
