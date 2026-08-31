---
type: Cairn Concept
title: Instruction parity
description: One protocol text, over one repository state, produces the same workflow whoever — or whatever — reads it.
tags: [cairn, concept, protocol, context, reader, determinism]
timestamp: 2026-08-31T00:00:00Z
---

# Instruction parity

Instruction parity is the property that one protocol text, over one repository
state, produces the same workflow whoever — or whatever — reads it.

## Build the idea

A protocol is written down so that different people, at different times, do the
same thing. That only works if the writing has one reading.

For a protocol executed partly by language models, "different readers" is a wider
set than it used to be. A human reads the whole page. One model reads it inside a
large context window; another summarises it first; a third has it truncated by
the harness carrying it. These are not misuses — they are the ordinary conditions
the protocol runs under.

So the text meets readers with different capacities, and any part of the document
that depends on being read *whole* has become a part that some readers will not
get. The failure is quiet: nobody reports a truncation, they just execute a
slightly different workflow.

Two properties of the document cause it, and neither is a property of the
environment:

- **Volume.** Past some size, a reader must choose what to keep, and different
  readers choose differently.
- **Interleaving.** When an instruction sits inside a paragraph of justification
  — the rejected alternative, the date of the ruling, the incident that motivated
  it — a reader that skims picks up different sentences than one that reads
  linearly, from the same file.

## In Cairn

The protocol MUST be executable from its
[normative content](../index.md#1-protocol-context-weight-is-a-stated-maxim-with-an-operational-test)
alone. Every artefact separates what a reader must do from why it is so; only the
first is required reading, and the second sits one link away, unabridged.

That separation is what buys instruction parity. A required read that is small
and carries no rationale has nothing left to summarise differently and nothing
worth truncating, so the readings converge.

The property is measured, not asserted: a reader is given only the required
content and either executes correctly or does not, and a failure names the exact
sentence they needed and did not have.

It is the reader-side twin of [gate parity](./gate-parity.md) and a distinct
property rather than a second half of it, because the two break through different
causes. Gate parity breaks when a *predicate* reads a value belonging to the
environment. Instruction parity breaks on the *document's* own volume and
interleaving. Neither failure implies the other, and a protocol can hold one
perfectly while losing the other.

## It does not prove

Parity is agreement, not correctness. Every reader reaching the same workflow
says nothing about whether that workflow is the right one — a clear instruction
can be clearly wrong, and it will then be wrong identically everywhere.

It also does not survive its own definition being ambiguous. The first draft of
Cairn's separation test used the word *index* for "the part a reader must read",
while [OKF](../../../bedrock/26_26-okf-agent-context.md) uses `index.md` for a
folder's map. One word, two meanings, inside the sentence defining this property
— which is exactly the failure the property names, and it was found by a reader
asking what the word meant.

Related: [gate parity](./gate-parity.md),
[proxy predicate](./proxy-predicate.md),
[project memory](./project-memory.md),
[handoff brief](./handoff.md).
