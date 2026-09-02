---
type: Atomik Index
title: Agent documentation contract
description: What an agent must read, write and never invent — and where the executable version of that contract lives.
tags: [agents, contract, index, okf]
timestamp: 2026-08-24T00:00:00Z
---

# Agents

Two documents, both about how a coding agent behaves here. The **executable**
version of this contract is elsewhere and takes precedence: `AGENTS.md` at the
repository root points at the portable
[`paths.md`](../../atomik-project/coding-paths/paths.md), Atomik's
[`binding.md`](../../atomik-project/coding-paths/binding.md), and the
[Cairn execution protocol](../cairn/specification/reference/execution-protocol.md);
`npm run cairn-check` enforces the mechanical half.

- [agent_documentation_contract.md](./agent_documentation_contract.md) — what
  documentation an agent must produce, in the same work unit as the code.
- [first_prompt_for_coding_agent.md](./first_prompt_for_coding_agent.md) — the
  opening prompt for a chat-based session that starts outside this repository.
