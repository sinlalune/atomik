---
type: Cairn Concept
title: Test
description: An executable example that compares observed behaviour with an expected result.
tags: [cairn, concept, foundation, quality]
timestamp: 2026-08-25T00:00:00Z
---

# Test

A test runs a defined operation and reports whether its observed result matches
an expectation.

## Build the idea

Small tests can isolate one rule; larger tests can exercise components or a
whole product. A regression test preserves the behaviour associated with a
known requirement.

## In Cairn

Each work unit updates relevant tests with implementation. Closing runs both
product tests and protocol checks against the exact implementation candidate,
then repeats if implementation changes.

## It does not prove

A passing suite proves only the cases it expresses in the environment where it
ran.

Related: [exit code](./exit-code.md),
[continuous integration](./continuous-integration.md),
[coherence audit](./coherence-audit.md).

