---
type: Atomik Index
title: Coherence audits
description: One record per path merge — what an agent found reading the rebased diff against bedrock and the ADRs, with a verdict that informs and never blocks.
tags: [audit, coherence, index, cairn, okf]
timestamp: 2026-08-24T00:00:00Z
---

# Coherence audits

Removing the integrator removed the person who noticed two paths drifting apart
architecturally, so the noticing is delegated to an agent — without letting a
non-deterministic judgment block a merge:

```text
the AGENT produces the judgment   reads the rebased diff against bedrock,
                                  the ADRs, and the path's declared coverage
CI checks only that it EXISTS     a deterministic gate on a
                                  non-deterministic activity
its verdict never blocks          findings are advisory, read by a human
```

`npm run cairn-audit` scaffolds a record; the agent fills it in. **One file per
audit**, named `<path-id>-<head>.md`, so two paths auditing at once never collide.
The advisory `coherence-audit` rule reports a missing or unfilled record for the
current head. **Unfilled** means what an agent can be held to deterministically: the
record must name an outcome from the vocabulary below and answer at least one of its own
findings questions. It is never a judgment about the answers — that is the human's read,
and the reason the verdict does not block. Convention:
[paths.md](../coding-paths/paths.md#the-coherence-audit-is-automated-its-verdict-is-not).

`paths.md` asked whether this ceremony earns its place — whether it finds anything
a human would not have, and says to delete it if the answer is no after the pilot.
The audit of 2026-08-24 closed that question with evidence: `cp-render-repairs`
caught ADR-014 §4 contradicting the implemented `$$` grammar, and recorded a real
bedrock-36 icon exception with the condition for revisiting it. **Answer: keep it.**

## Records

- **[CP-AI-CAPABILITIES @ 9007e07](./cp-ai-capabilities-9007e07.md)** · 2026-08-20 · verdict: drift noted, proceeding
- **[CP-FEEDBACK @ 583b4f6](./cp-feedback-583b4f6.md)** · 2026-08-16 · verdict: drift noted, proceeding
- **[CP-MVP-010 @ 23f47da](./cp-mvp-010-23f47da.md)** · 2026-08-17 · verdict: drift noted, proceeding
- **[CP-OPEN-DOCK @ c927c03](./cp-open-dock-c927c03.md)** · 2026-08-20 · verdict: clean
- **[CP-OPS-001 @ a495095](./cp-ops-001-a495095.md)** · 2026-08-24 · verdict: drift noted, repaired before merge
- **[CP-PROVIDERS @ fade33b](./cp-providers-fade33b.md)** · 2026-08-16 · verdict: clean
- **[CP-RENDER-REPAIRS @ d44d381](./cp-render-repairs-d44d381.md)** · 2026-08-20 · verdict: drift noted, proceeding
- **[CP-RICH-MARKDOWN @ 9885ab3](./cp-rich-markdown-9885ab3.md)** · 2026-08-18 · verdict: drift noted, proceeding
- **[CP-WORKTREE-CLEANUP @ 382ba30](./cp-worktree-cleanup-382ba30.md)** · 2026-08-24 · verdict: clean
- **[CP-OPS-002 @ e409e85](./cp-ops-002-e409e85c4e70a09da8b2f7f743aa4cdc2806ae00.md)** · 2026-09-02 · verdict: drift noted, proceeding — voided, CI red on the candidate
- **[CP-OPS-002 @ 041c713](./cp-ops-002-041c713a9328cbe6bc8948e399545057fc7a4d41.md)** · 2026-09-02 · verdict: drift noted, proceeding — voided, immutable records found edited at integration
