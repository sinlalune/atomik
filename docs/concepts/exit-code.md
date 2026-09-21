---
type: Cairn Concept
title: Exit code
description: The integer a process returns to report success or failure.
tags: [cairn, concept, foundation, quality]
timestamp: 2026-08-25T00:00:00Z
---

# Exit code

An exit code is the integer status a command returns when it finishes. By
convention, zero means success and non-zero means failure.

## In Cairn

The checker and product gates use exit codes as their mechanical verdict.
Critical failure or inconclusive evidence returns non-zero. Commands run bare
so a downstream filter cannot replace the gate's status with its own.

## It does not prove

A zero exit code is meaningful only if the command implemented the right
predicate and received the required inputs.

Related: [test](./test.md), [blocking finding](./blocking-finding.md),
[inconclusive finding](./inconclusive-finding.md).

