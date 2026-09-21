---
name: cairn-learn
description: Run one learning session — read the concept root, the surface page and the inputs, find out by prompting what the user already knows and where it breaks, then write the learning note as a concept note with an order, plus a concept note for every word the session needed, and link the note from outside the wiki. Use when a user asks to be taught something, or when a learning session offered by a work unit is started.
---

# cairn-learn

A learning session teaches one thing, in order, and leaves a page behind. It
runs in its own context: a unit that met a complex abstraction wrote the
concept note and offered this session, and nothing waited on the offer.

## 1. Read before asking

Read, in order:

- the concept root's three folders — the protocol's terms as this project uses
  them, the product's own domain, and knowledge from outside;
- the page a newcomer reads first for the surface the question is about;
- `docs/inputs` — what the owner had before the protocol, kept as it came.

A session that restates a note the root already holds has taught nothing and
left a second copy to keep true.

## 2. Explore what the user knows

Ask in the chat, one question at a time, and wait. Where does their picture
start, and where does it break? The gap you are looking for is the one place
their model gives a wrong prediction — that is what the note has to fix, and
everything else is padding.

## 3. Write the note

The **learning note** is a concept note with an order, in the concept root's
`learning` folder, from the
[concept template](https://github.com/sinlalune/cairn/blob/bff7e2af18c17a909e67eec4a8e69c1f5855cfe7/spec/concepts/concept-template.md): the plain meaning
of the thing being learned first, then the steps in the order a reader builds
it, each step linking the concept it rests on instead of restating it.

Write a **concept note** for every word the session needed that has none, in
the folder whose vocabulary it belongs to, and link it from where the question
came.

## 4. End by linking it

The session ends when the learning note is linked from a document **outside**
the concept root: the step record of the unit that offered the session, or the
surface page whose glossary it joins. A note that only the wiki links is an
orphan, and `concept-orphan` counts no link from inside.
