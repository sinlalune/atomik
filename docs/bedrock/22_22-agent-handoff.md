---
{
  "id": "22-agent-handoff",
  "title": "Atomik host pointer to the portable Cairn execution protocol",
  "status": "ready-to-use",
  "tags": ["agent", "handoff", "cairn", "binding", "execution"],
  "relations": [
    { "to": "35-coding-path-execution-state", "kind": "implements" },
    { "to": "26-okf-agent-context", "kind": "uses" },
    { "to": "13-electron-security", "kind": "binds" },
    { "to": "17-self-evolving-docs", "kind": "binds" }
  ],
  "agent": {
    "purpose": "Point Atomik implementation sessions to Cairn's portable execution protocol and Atomik's separate host binding without duplicating either.",
    "inputs": ["AGENTS.md", "portable Cairn execution protocol", "Atomik binding appendix"],
    "outputs": ["the correct portable and host-specific entry route"],
    "invariants": [
      "The portable protocol is authoritative for execution order.",
      "Atomik-specific paths, commands and product constraints live in the binding or selected bedrock pages.",
      "The product constitution is selected by path coverage, not required merely because a coding session starts."
    ]
  }
}
---

# Atomik host pointer to the portable Cairn execution protocol

This page no longer carries a second copy of the coding-session procedure.
[ADR-020](../adr/ADR-020-protocol-context-weight.md) classifies that procedure as
**PORTABLE** and moves it into the Cairn specification:

- [portable coding-session execution protocol](../cairn/specification/reference/execution-protocol.md)
- [portable parallel-path convention](../../atomik-project/coding-paths/paths.md)
- [Atomik binding appendix](../../atomik-project/coding-paths/binding.md)

The repository-root [`AGENTS.md`](../../AGENTS.md) orders those documents and
retains the absolute Atomik rules that must survive a truncated read. A path's
documentation coverage then selects the product architecture relevant to its
work. In particular, Electron and IPC work reads
[bedrock 13](./13_13-electron-security.md), and durable documentation changes
obey [bedrock 17](./17_17-self-evolving-docs.md).

Atomik's product constitution remains [bedrock 00](./00_00-orientation.md). It is
host knowledge, not protocol required reading, and therefore is no longer in the
coding-session entry chain.

The former combined bootstrap page is retained unabridged as
[explanatory history](./archive/22_22-agent-handoff-pre-cairn-extraction.md).
It records why the operating rules evolved; it does not override the current
portable protocol or host binding.
