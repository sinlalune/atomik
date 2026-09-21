---
name: cairn-unit
description: Advance one Cairn coding path by exactly one work unit — plan, change, self-review, review, verify — writing the step record and refreshing the resume section, running every gate bare, committing the coherent unit with explicit paths and pushing it immediately. Use whenever you resume a path or complete a bounded piece of work on one, and when incomplete work must be published rather than left in a working tree.
---

# cairn-unit

A work unit is the smallest completed change Cairn recognises. It is coherent
only when everything moves together: the change, its tests, the affected
documents, one step record, the refreshed resume section — one commit, pushed.
"Implemented locally" and "completed" are not synonyms.

## 0. Resume

Read, in order: `AGENTS.md`, the path convention and binding it names, the
live view, then this path's `index.md` — its resume section first. Verify the
repository against it: branch, upstream, clean tree, base. A fresh worktree
has no dependencies: install them before the first gate. Start the persisted
next action. Conversation memory is never stronger than the record and the
repository.

A run that went red since the last unit is read before this one starts — and
where the checker's own step is what failed, the post-mortem it printed, in the
run's log or on the request. Reading it is the whole of the obligation.

An agent you run inside your own session — a subagent, a second context, the
fresh reader of movement 4 — is you, and you answer for what it edits as for
your own hand.

A change to the bootloader this unit did not make is a block some framework
wrote there. Move it into a file the kit does not own — the one the framework
names, else a file beside the bootloader — leave one line there pointing at
it, and never commit it in place or widen `writes:` to hold it.

## 1. Plan

Write, in the new step file `steps/S<NN>.md` — every type but `closure` has
one — what this unit will change and what it deliberately will not, and name
the item of the definition of done it advances. A unit that advances none is the signal to stop: amend the scope
with a superseding acceptance, or open another path.

Name the unit's **type** — it fixes what must move together:

| type | moves together |
| :-- | :-- |
| `implementation` | source, its tests, the affected module note, the step |
| `documentation` | the documents and their indexes, the step |
| `decision` | the decision record, every document it amends, the step |
| `repair` | the corrective change, any superseding record owed, a step naming the violation |
| `closure` | only the administrative closure surface, and no step file |

`repair` is for a violation of the protocol; a bug in the product is an
`implementation` unit.

Where the violation is a published step record that was edited, the repair's
own `cairn-unit` block declares it, in the shape and with the two commands
[the path template](https://github.com/sinlalune/cairn/blob/bff7e2af18c17a909e67eec4a8e69c1f5855cfe7/spec/reference/path-template.md) gives. Both ids are
read, never chosen.

If the plan reveals a `full`-route trigger on a `lightweight` path, escalate
now and say why in the step.

## 2. Change

Do the work with the `cairn-code` stance: does it need to exist, does the
codebase already have it, what is the least code. Write outside `writes:`
only if you widen `writes:` in the same unit and say why in the step. Delete
before you add.

Changing behaviour, write the failing test first and assert the refusal it
exists for; changing only structure, carry no new test and say so in the plan.
An API you change has its documentation refreshed in the same unit, as the
area's module note is.

Explaining a complex abstraction, write its concept note, offer a learning
session on it in one line of the chat, say in the step that you offered it and
on what, and go on: nothing waits on the offer. A decision this unit cannot
make is different — put it to the owner in the chat, signalled as a decision
before anything else, and do nothing further on the path until the answer.

## 3. Self-review

Read your own diff and cut what it should not carry. One line per finding in
the step, under `delete:`, `stdlib:`, `native:`, `yagni:` or `shrink:`, and a
last line with the net line count or *Lean already*. A tag with nothing to
name is absent; a unit of documents is read for the same things, in the tags
that apply to prose. Name any widening of `writes:` here.

## 4. Review

Hand the diff to a second context of your own agent — a fresh session, or a
subagent, or your harness's own review command. Give it the diff and two
criteria — the decision ladder `cairn-code` points at, and correctness — and
nothing else: not the plan, not this conversation, not the step record. When
no fresh context can be obtained — a subagent that hangs, a harness without
one, a command that returns nothing — read the diff yourself against the same
two criteria, and open the section with one line naming the reader: a fresh
context and which kind, or you, with the reason and how long you waited
(ADR-017, decision 4).

Write what it returns into a `#### Review` section of the step, between the
self-review and the verification: one line per finding with its disposition —
fixed in this unit, refused with the reason, or deferred to a named unit or
path — or one sentence saying it found nothing. A step without that section is
not a completed unit.

A finding you fix changes the diff the reader judged. Give the fix back to a
fresh context — only the lines it changed, the same two criteria, nothing else
— and disposition what that second read returns under the same section, under
its own line naming the reader. It is
not read a third time, and the self-review is not repeated: a fix that cuts
more adds a line to it.

## 5. Verify

Run every relevant gate **bare** so the exit code is the verdict:

```bash
npm run cairn-check
npm test
```

`npm test` is this product's own suite. The suite that proves the kit itself
is the protocol repository's, not an adopter's concern.

Then finish the step record with its `cairn-unit` block — step, ordinal, type,
what verified it — and refresh the **resume section** of `index.md`: the
checkpoint (the last completed commit already on the remote, never this one),
the single next action, blockers, tried and rejected, reading order, verify.

## 6. Commit and push

```bash
git status --short
git add <each path of the unit, explicitly>
git commit -m "CP-EXAMPLE-001 S02: what it established"
git push origin path/cp-example-001
```

Never blind-add a live repository; a dirty file you did not write belongs to
someone. Read the push's exit code, then read the request's run if a request is
open — a push to a path branch produces no run of its own. A unit whose push
failed is implemented locally, not complete. The full sequence, and the shape
of a provisional commit for work that is not yet a unit, are in
[reference.md](./reference.md).

## 7. Report the boundary

Every pushed unit is a safe session boundary. Report the outcome, the exact
remote commit, the gate verdict with its advisories, the persisted next action
and blockers, and whether the next unit should run here or fresh. When the
gate stayed green and the protocol still cost more than it should, write a
file under `feedbacks/` naming the movement, the cost and the change to Cairn
that would remove it — when there is something to say, never as a ritual, and
never for a defect of the harness, which goes to its vendor (ADR-028).

## What you must not do

- Rewrite anything published: no amend, rebase, soft-reset fold or force-push.
  Reach a current base by merging the trunk in.
- Edit an earlier step: a step is append-only from the blob that added it. A
  correction is a new step naming the old one.
- Call a narrower verdict the full one, or record a verdict you did not read.
