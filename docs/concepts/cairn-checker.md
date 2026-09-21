---
type: Cairn Concept
title: Cairn checker
description: Deterministic automation that evaluates repository predicates and reports protocol findings.
tags: [cairn, concept, role, enforcement]
timestamp: 2026-08-26T00:00:00Z
---

# Cairn checker

The Cairn checker reads files, metadata, diffs, [Git](./git.md) refs,
[commit](./commit.md) ancestry, and command results to evaluate objective
protocol predicates.

It reports blocking, advisory, or inconclusive findings and returns a
corresponding [exit code](./exit-code.md). It never substitutes its output for product judgement,
architectural reasoning, or reviewer authority.

Because the checker judges Cairn records, its source, tests, configuration, and
workflow belong to the [control plane](./control-plane.md).

Related: [blocking finding](./blocking-finding.md),
[inconclusive finding](./inconclusive-finding.md),
[control plane](./control-plane.md).
