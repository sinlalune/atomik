---
type: Cairn Concept
title: Unsound gate
description: A gate that can report OK while the condition it names is false — why that failure is invisible by construction, and why it is the one Cairn must fear.
tags: [cairn, concept, enforcement, checker, soundness, evidence]
timestamp: 2026-08-27T00:00:00Z
---

# Unsound gate

A gate is **unsound** when passing it does not mean what it says.

## Build the idea

An automated check can be wrong in two directions, and it is tempting to treat
them as two faces of one problem. They are not remotely equivalent.

| | What it does | How you find out |
| :-- | :-- | :-- |
| **Noisy** | fails when nothing is wrong | immediately, and repeatedly, because it blocks working people |
| **Unsound** | passes when something *is* wrong | never, unless someone goes looking |

A noisy gate is self-reporting. It costs somebody time today, they complain
today, it gets fixed. It cannot accumulate.

An unsound gate produces no signal at all. Nothing is slower, nothing is
blocked, nobody is annoyed. Its output is indistinguishable from the output of a
gate that is working perfectly — a green line. So unsound gates **accumulate
silently**, and a rule set left alone drifts toward permissiveness rather than
toward noise.

### Green is not neutral; it is used as evidence

This is what makes unsoundness worse than an unwritten rule.

A missing check leaves a gap, and everyone can see the gap. An unsound check
fills the gap with a **claim**. In Cairn that claim is durable: a
[closing acceptance](./closing-acceptance.md) records that gates were green, and
a [journal](./journal.md) entry repeats it. The record then says a condition
held, at an exact commit, signed by whoever accepted it.

An unsound gate therefore does not merely fail to catch something. It **launders
a false statement into the permanent record**, and does it with the full
authority of an automated check. A protocol whose whole purpose is durable, exact
records cannot tolerate that quietly.

### The direction is the diagnosis

If a rule set's failures were randomly distributed, roughly half would be noisy
and half unsound. When every one found is unsound, that is not luck. It is the
signature of [proxy predicates](./proxy-predicate.md): the easy stand-in is
almost always the broader condition, so the errors inherit its direction.

## In Cairn

Every enforcement defect found in the reference checker so far has been unsound.
Not one has been noisy.

- retention passed over an orphaned commit;
- advisory disposition passed with an advisory undisposed;
- closure surface accepted fields its own prose forbade;
- the derived-view check skipped itself on the branch that most needed it;
- the ceremony gate accepts the note written when the path opened.

A sixth is not a rule at all: `AGENTS.md` requires a [journal](./journal.md)
entry at merge time, and no predicate asks for one. A path closed, was audited
and was proposed for merge with the entry missing, and every gate reported OK —
because none of them was about that requirement. **An unenforced requirement and
an unsound gate feel identical from inside a green run**, which is why the
[conformance matrix](./conformance.md) has to say which requirements are checked
and which are not.

Cairn therefore prefers a rule set that is **sound but incomplete** to one that
is complete but unsound. Incomplete is honest: it misses things, and it says so.
Unsound is not: it misses things, and it certifies that it did not.

## It does not prove

Soundness is a property of each rule, not of the set. A repository can hold
forty sound rules and still be badly governed, because soundness says only that
a passing rule told the truth — never that the rules asked about the things that
matter. Proving a gate cannot lie is a different job from choosing what to check.

Related: [proxy predicate](./proxy-predicate.md),
[adversarial fixture](./adversarial-fixture.md),
[gate parity](./gate-parity.md), [conformance](./conformance.md),
[exit code](./exit-code.md).
