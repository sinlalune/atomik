---
type: Cairn Concept
title: Proxy predicate
description: A rule that computes something near what it means, because the thing it means cannot be computed directly — and why the substitution is almost always too permissive.
tags: [cairn, concept, enforcement, checker, soundness]
timestamp: 2026-08-27T00:00:00Z
---

# Proxy predicate

A proxy predicate is an automated rule that checks something *close to* what it
means, because the thing it means cannot be computed directly.

## Build the idea

Every automated rule turns a sentence into code. The sentence is about the world
— *the work is resumable*, *this path was accepted*, *the view is current*. The
code can only read repository state. Something has to bridge that gap, and what
bridges it is a choice: pick a measurable condition that stands in for the
sentence.

That choice is where the interesting bugs live, and it is invisible in the code.
Both of these look like ordinary checks:

```text
the sentence   "every completed checkpoint survives a rewriting push"
the proxy      "every unit named in the ledger resolves to a ref"
```

They agree in every healthy repository, which is why the substitution feels
free. They diverge exactly when something has gone wrong — because **a broken
state usually leaves the declarations internally consistent.** Move a retention
ref forward and every declared unit still resolves; the ledger still names the
same units; the proxy still passes. Only the fact it was standing in for has
become false.

### Substitutions drift in one direction

The proxy is not merely *different* from the intent. It is nearly always
**broader** — it accepts more situations than the sentence does.

That follows from how proxies get chosen. The easy thing to compute is usually a
*necessary* condition of the intent rather than a *sufficient* one: a resumable
path does have a brief, an accepted path does have a session note, a current view
does live on a branch. Checking the necessary part is one line. Checking the
sufficient part means reconstructing the intent.

So the predictable failure is not a rule that complains too much. It is a rule
that **agrees too easily** — see [unsound gate](./unsound-gate.md).

## In Cairn

Four proxies in the reference checker were found standing in for something they
did not imply. Each is written here as the pair, because the pair is the lesson:

| The rule meant | The proxy asked | How they came apart |
| :-- | :-- | :-- |
| every completed checkpoint is retained | every *declared unit* resolves a ref | a ref moved forward: every unit resolved, one real commit was orphaned |
| every advisory at the candidate was disposed | the disposition matches what the checker raises *now* | closure is field-restricted, so its advisory set is a strict subset — the rule could pass with an advisory undisposed |
| this checkout owns the derived view | the branch name matches `path/*` | CI checks out a detached ref, so the same tree gave two verdicts |
| a closing ceremony happened | a session note *names* the path | the note written when the path **opened** satisfies the closing gate |

The fourth is the clearest, because the substitution is visible in one line:

```js
/** A closing ceremony leaves a session note naming the path. */
return readdirSync(SESSION_DIR).some((file) => file.includes(id))
```

The comment states the sentence. The code asks a filename question. Every path
satisfies it from the moment it opens.

**When a predicate can be written either way, write the one that can disagree
with the record.** Walk the branch rather than the ledger's list of units; attest
the candidate's advisory set rather than recomputing it; ask what a checkout owns
rather than what it is called.

## It does not prove

A proxy that is exact today can become a proxy again when the model around it
changes, without anybody editing it. `isPathBranch(branch)` was a fair stand-in
for *does this checkout own the derived view* while a running path never wrote
that view. Self-merge made a path the last writer of its own `status`, so at
closure it became precisely the writer the exemption assumed could not exist.

Nothing in the rule changed. The world it described did.

Related: [unsound gate](./unsound-gate.md),
[adversarial fixture](./adversarial-fixture.md),
[Cairn checker](./cairn-checker.md), [conformance](./conformance.md).
