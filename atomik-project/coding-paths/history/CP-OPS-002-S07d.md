---
type: Atomik Coding Path History
title: 'CP-OPS-002 S07d — The binding names, and the document read downward (owner, 2026-08-25) — SUPERSEDED by S07e'
description: Completed-step record rolled out of CP-OPS-002.md at CP-OPS-002 S07g. Verbatim; nothing summarized.
tags: [coding-path, history, cp-ops-002]
timestamp: 2026-08-26T00:00:00Z
path: CP-OPS-002
step: S07d
---

# CP-OPS-002 S07d — The binding names, and the document read downward (owner, 2026-08-25) — SUPERSEDED by S07e

Rolled out of [CP-OPS-002.md](../CP-OPS-002.md) at CP-OPS-002 S07g, VERBATIM:
moved, never summarized. The live path file keeps its declaration, its index over
these records, its Work Ledger and its next action; the execution detail lives
here. The convention is in [paths.md](../paths.md#the-ledger-has-a-boundary).

Two mechanical adjustments were unavoidable and are named rather than made
silently. **Deixis**: text saying "below", "this ledger" or "the checkpoint" was
written when this entry sat in the path file and points at the Work Ledger in
[CP-OPS-002.md](../CP-OPS-002.md); repairing it in place would have made the
record no longer verbatim. **Link depth**: a relative link is an address, not
content — moving the file one directory down changes the address of the *same*
target, so `../sessions/…` became `../../sessions/…`. The characters differ; the
reference does not.

---

### S07d — The binding names, and the document read downward *(owner, 2026-08-25)* — **SUPERSEDED by S07e**

Two owner corrections, one after the other.

**`atomik-project/` was being taught as if it were the protocol.** *"you use reference of
/atomik-project when it should be /project right ? because it is gonna be apply to any kind of
project"* — correct, and it is the same defect class this path exists to close, pointed at the
handbook itself: a document about portability was writing this repository's binding into the
protocol's prose.

- The handbook now writes **`project/`** for the execution-state plane root, with a
  **Notation** section stating that Cairn talks about roles and each repository binds them to
  its own names. Three places keep the real name on purpose and say why: **links**, which are
  addresses and must resolve; the **generated rule catalogue**, which prints whatever the
  validator has compiled in; and the **declared properties** section, which is where
  repository-specific facts belong.
- **The frontmatter namespace key is a binding too**, and it is the one that could not be
  genericised: the parser reads `atomik:` hardcoded. Publishing `cairn:` while the parser looks
  for `atomik:` would be *a published rule the implementation does not honour* — the exact
  failure the surrounding page is about. So the real key is shown, with the reason.
- The generated catalogue gained a line under it: its messages name this repository's bindings
  **because the validator has them compiled in**, and that is the clearest available statement
  of what S08 has left to do. Until those are configuration, Cairn is this repository's protocol
  that *could* be portable — not a portable protocol.

**The handbook is one stance, and the owner asked for its inverse.** *"you made the document
from foundation to cairn, which is a stance, but what would it look like from cairn to it
foundation elements manipulated, create a second file"*.

`docs/cairn/anatomy.md` + `anatomy.html` — **Cairn taken apart**.

- **The inversion is structural, not a reordering.** The handbook is organised by *concept*;
  this is organised by **primitive**, so every rule touching the commit graph sits together
  regardless of which feature it belongs to. That grouping is the value: it shows how few things
  the protocol touches and exactly where each one runs out.
- **The claim it makes:** Cairn manipulates seven primitives and nothing else — the commit
  graph, refs, the filesystem, file content, exit codes, the host environment, wall-clock time.
  Each construct is reduced to its exact predicate (`merge-base(trunk, HEAD) == trunk`;
  `∃ file with root-level path == <id> AND ceremony == <kind>`; `changed ∖ declared globs`) with
  what it reads, its verdict, and a **cannot** line naming where the primitive gives out.
- **The eighth input is a human judgement, and the central move is what happens to it**: every
  judgement is reduced to primitive 4, a file. An owner's acceptance becomes two metadata keys;
  an agent's architectural read becomes a record naming an outcome. That is what lets a protocol
  built for human decisions run in a script containing no intelligence — and it fixes the
  ceiling, which is why judgement-derived rules are advisory and existence-derived rules block.
- **The negative space is a section of its own**: eight primitives Cairn had available and
  refused, each with the reason — a model inside a gate, git hooks, server-side state, a lock on
  declared surfaces, timestamps as ordering authority, rewriting history to fit a later rule,
  summarising a rolled step, and a person as gatekeeper.
- **Two payoff tables the upward reading cannot produce.** All eighteen rules with their
  primitive, operation and verdict on one screen — showing that **nothing in the blocking set
  requires judgement**, which is the admission test applied eighteen times. And the **seams**:
  seven names, all inputs rather than logic, which is the honest measure of the distance to
  portability and makes it S08's checklist.
- The page reuses the handbook's theme with the accent shifted, so the pair reads as one set
  while the direction is legible at a glance, and adds two components the downward reading needs
  — a monospace `operation` block and a `cannot` rule.
