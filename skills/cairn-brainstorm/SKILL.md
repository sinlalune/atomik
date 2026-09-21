---
name: cairn-brainstorm
description: Write the notes of the first two stages of a Cairn project — a brainstorm note kept verbatim from one ideation session, and a research note that pins its sources and says what they change — and promote them into vision when they are ready. Use when an idea arrives, before or during a coding cycle, instead of coding it.
---

# cairn-brainstorm

You get an idea. Instead of coding it, you write it down and sit on it. This
skill writes the two notes that come before any specification, in the shape
the [specification](https://github.com/sinlalune/cairn/blob/bff7e2af18c17a909e67eec4a8e69c1f5855cfe7/spec/index.md) states in its chapters 1 and 2, and
knows when one of them is ready to become vision.

## When an idea arrives

Ask which stage it is at:

- **Not yet argued** — a thought, a possibility, a "what if": write a
  **brainstorm note**.
- **Argued, but on things nobody has checked** — write a **research note**
  first, then decide.
- **Argued on checked things, and a coding cycle is running** — do not code it
  into the cycle. Write the note, and record in the current step that the
  idea was parked and where.

## A brainstorm note

One file per session, in the project plane's brainstorm space:

```text
project/brainstorm/YYYY-MM-DD-<slug>.md
```

```yaml
---
type: Cairn Brainstorm
title: Offline sync — first pass
timestamp: 2026-03-04T00:00:00Z
cairn:
  status: provisional
---
```

The body says what was thought, in the order it happened, including what was
rejected and why. End it with one line that says **what the idea is waiting
for**: a question research would answer, a constraint nobody has checked, a
person to ask. That line is what turns sitting on an idea into the next stage.

Three rules, all about honesty rather than form:

- **Never edit it after the session.** A later thought is a later note.
  Editing the record of a session is how a team comes to remember deciding
  something it did not decide.
- **Never cite it as authority.** Nothing is built because a brainstorm said
  so; chapter 3 is where an idea becomes a reason.
- **Keep it verbatim.** A cleaned-up brainstorm is a specification pretending
  to be a memory.

## A research note

Same space, same provisional status, three parts a reader needs separately:

```yaml
---
type: Cairn Research Note
title: Offline sync — what the literature says
timestamp: 2026-03-06T00:00:00Z
cairn:
  status: provisional
---
```

1. **Sources** — each pinned precisely enough to be found again: a URL and
   the date read, a paper, a repository at a commit, a conversation with a
   named person. A source worth keeping whole goes into `project/sources/`,
   one record per source, so the link keeps resolving when the internet does
   not.
2. **Summary** — what each source says, in the note's own words, short.
3. **Conclusion** — what this changes about the vision, and what it does not
   settle.

## When a note is ready

A note becomes vision through **promotion**: one reviewed work unit that adds
or amends the architecture page the note argued for, adds a decision record
for any choice the page now makes, links the page back to the note as
*promoted from*, and leaves the note exactly as it was. Promotion is a path
like any other — open it with `cairn-open`, on the `full` route, with a
documents-only write surface — and the pull request that lands it is the
review.

Do not promote a note that still names what it is waiting for. Write the
research note that answers it first.

## What the tools check

Links and frontmatter, nothing more. This is the stage where a rule would
cost the most and catch the least, and the specification says so.
