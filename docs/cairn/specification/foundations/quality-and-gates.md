---
type: Cairn Foundation
title: 'Foundation: Tests, automation, and gates'
description: A from-zero explanation of tests, exit codes, continuous integration, blocking versus advisory findings, and the limits of deterministic checks.
tags: [cairn, foundation, tests, ci, gates, exit-code]
timestamp: 2026-08-25T00:00:00Z
---

# Tests, automation, and gates

## Test

A **test** runs a piece of software and checks an expected result:

```js
assert.equal(parseDuration('1h30m'), 5400)
```

A **unit test** isolates one small behaviour. A **regression test** captures a
failure or edge case so it cannot return silently. A **test suite** runs many
tests and returns a process status.

A green suite means every implemented check passed. It does not mean every
possible behaviour is correct; nobody can test a case they have not identified.

## Exit code

Every command returns an integer called an **exit code**:

```text
0       success
nonzero failure or another exceptional outcome
```

Automation uses this one number as the verdict. Human-readable output explains
the cause.

## Why a gate runs bare

A **pipeline** sends one command's output into another:

```bash
test-command | output-filter
```

Without explicit shell configuration, the pipeline's visible status may be the
filter's exit code rather than the test command's. The filter can succeed even
when the gate failed.

A Cairn gate therefore runs directly first:

```bash
npm test
```

Formatting or searching its output can happen after the real verdict has been
recorded.

## Continuous integration

**Continuous integration (CI)** is automation that checks out a change in a
clean environment and runs the project's checks. It answers two useful
questions:

- Can the repository reproduce the result without the writer's uncommitted
  files or machine-specific setup?
- Do the checks run for every relevant change rather than only when someone
  remembers?

A workflow that reports a result still does not necessarily prevent a merge.
That depends on host configuration.

## Check, gate, blocking, advisory

A **check** evaluates a condition. A **gate** has authority to stop progress when
the condition fails.

Cairn divides findings by effect:

- **Blocking** — objective failure; contributes to a non-zero exit code.
- **Advisory** — useful signal or judgement-dependent condition; prints but does
  not change the exit code.

The distinction is about evidence, not importance. Architectural coherence can
be extremely important while remaining unsuitable for a deterministic blocking
rule.

## Deterministic boundary

A deterministic check should return the same result for the same repository
state. Good blocking subjects include:

- whether a file exists;
- whether metadata has an allowed value;
- whether one commit contains another;
- whether a generated block matches its inputs;
- whether a command returned success.

Judgements such as “this architecture is elegant” or “this explanation is
accurate” need people or agents. Cairn records the judgement in a file and lets
automation check the record's existence and binding.

## Enforcement tiers

The same local checker may be deployed at three strengths:

```text
local       a writer runs it; no host required
ci          a remote runner publishes the result
protected   the host refuses a merge unless required checks pass
```

The repository declares the installed tier. A CI result that can be bypassed
observes; only a required status check prevents.

Return to [Executing a path](../index.md#6-executing-a-path) or
[The enforcement model](../index.md#10-enforcement-model).
