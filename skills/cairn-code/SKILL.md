---
name: cairn-code
description: Cairn's own additions to the coding stance for the change movement of a work unit — deletion turned on the protocol itself, the test that never fires, the three-line cap, absorbing the ecosystem, and the two lines on secrets and errors. The decision ladder and the review tags come from Ponytail at a pinned tag and are not repeated here. Use whenever you are about to write, change or explain code inside a coding path.
---

# cairn-code

The manifesto's first threat is more control through more code and more
rules. This is the stance that resists it, one decision at a time. A checker
cannot judge simplicity, which is why this is a skill and not a rule.

The ladder you climb during *change*, and the tags a self-review speaks in,
are Ponytail's: `DietrichGebert/ponytail` at the tag `v4.9.0`, its
`skills/ponytail` and `skills/ponytail-review`. Install them in your harness
as that repository says, beside these skills. What follows is Cairn's own.

## Deletion, turned on the protocol

Ponytail turns deletion on code. Turn it on the protocol too: a rule that
stands behind no stated requirement, a record nothing reads, a folder with one
file — delete them.

## The test that never fires

A test that asserts a valid input passes, and never asserts that a violation is
refused, passes identically whether the rule works or not. Every rule gets the
adversarial case that proves the refusal; without it the rule is decoration.

## The three-line cap

Explain a change in three lines or fewer: what it does, why it is the least,
what it does not do. If the explanation needs more, the change is probably
doing two things; split it into two units. In a step record the plan is those
three lines; the self-review is the tagged lines `cairn-unit` names.

## Absorb the ecosystem

When a tool the ecosystem has standardised does what a home-made piece does,
adopt the standard and delete the piece. The cost of not embracing progress
outside the protocol is paid in maintenance of things nobody else maintains.

## Secrets and errors

- No secret in code and none in a record. A secret that reached either is
  rotated before it is redacted, and the redaction ceremony follows.
- An error is handled where data would be lost or a trust boundary is crossed,
  and swallowed nowhere.
