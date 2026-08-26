---
type: Atomik Coding Path History
title: 'CP-OPS-002 S07g — Cairn v0.2: close the gaps between the promises and the predicates — COMPLETE'
description: Completed-step record rolled out of CP-OPS-002.md at CP-OPS-002 S07m. Verbatim; nothing summarized.
tags: [coding-path, history, cp-ops-002]
timestamp: 2026-08-26T00:00:00Z
path: CP-OPS-002
step: S07g
---

# CP-OPS-002 S07g — Cairn v0.2: close the gaps between the promises and the predicates — COMPLETE

Rolled out of [CP-OPS-002.md](../CP-OPS-002.md) at CP-OPS-002 S07m, VERBATIM:
moved, never summarized. The live path file keeps its declaration, its index over
these records, its Work Ledger and its next action; the execution detail lives
here. The convention is in [paths.md](../paths.md#the-ledger-has-a-boundary).

Two mechanical adjustments are named rather than made silently. **Deixis**: text
saying "below" or "this ledger" was written when this entry sat in the path file
and points at the Work Ledger in [CP-OPS-002.md](../CP-OPS-002.md). **Link
depth**: a relative link is an address, not content — moving the file one
directory down changes the address of the *same* target.

---

### S07g — Cairn v0.2: close the gaps between the promises and the predicates — **COMPLETE**

```cairn-unit
step: S07g
unit: 02
type: documentation
verified: cairn-check, cairn-check:test, typecheck, test, build
```

A nineteen-item external review of the v0.1 specification, delivered by the user. Every
item is now resolved in normative text or listed under *Deliberate non-goals* with a
reason; none is deferred silently. **Specification text only** — no checker rule was
implemented, and every added requirement carries a conformance-matrix row whose
reference-tools column says `not implemented`. That ordering is the decision: the
specification is corrected first so the tooling has a correct target, and a matrix row
that lies about a mechanism is the exact failure this revision exists to remove.

- **Two items were broken promises, not missing features.** Rebase-before-close
  force-pushes the path branch and orphans every checkpoint the ledger names — so the
  ledger's resumability promise resolves to nothing at the moment the ledger is most
  complete. Retention refs under `refs/cairn/checkpoints/<path-id>/<n>` are now required
  before any rewriting push, with "forbid rewriting pushes on path branches" as the only
  other conforming option. And the rule that kept pre-acceptance work uncommitted and
  unpushed forbade publishing the single most losable state in the protocol: an agent's
  mid-session working tree. A **provisional commit** is pushed, carries
  `Cairn-Provisional: <reason>`, is never a checkpoint or a resume point, and is folded
  into its work unit before `C` exists.
- **The brief was the bootstrap contract with no fields.** It now has frontmatter
  (`checkpoint`, `checkpoint_pushed`, `base_commit`, `trunk_seen`, `writes`, `governs` as
  `path@<object-id>`, `verify` as exact commands, `budget_tokens`), seven capped body
  sections, a ~1200-token budget, and an **answerable-alone contract** — eight questions a
  reader with only `AGENTS.md` and the brief must be able to answer. Needing the ledger to
  answer any of them means the brief failed. **Cold resume** becomes the pilot's primary
  metric, ahead of ceremony time.
- **Records now mean what they claim.** `A` is restricted **field by field**, because the
  definition of done and both declared surfaces live inside the path record — a file-level
  restriction would let closure rewrite the standard its own acceptance was measured
  against. `scope_ref` gained a **scope digest** recorded at opening and re-verified at
  closing. `advisory_disposition` became a structured list required to match the findings
  raised at `C`; as one free-text string, "every advisory MUST be recorded" was
  unenforceable. Acceptance records name the roles the actor held, and a collapsed
  opening/closing actor raises an advisory — the degradation is made visible rather than
  forbidden, because forbidding it would exclude the setup most likely to adopt Cairn
  first.
- **Drift is a predicate, and the obvious rule was rejected by name.** The closing record
  names its base `T`; an acceptance survives while the trunk delta from `T` to `T'` touches
  nothing in `writes:` ∪ `governs:`. `remote_trunk == T` at integration is refused in the
  normative text with its reason: it is first-come-first-served, every landing invalidates
  every other open acceptance, and where audit plus acceptance outlast the trunk's landing
  interval nothing ever closes — worst on exactly the busy repositories the protocol is
  for.
- **The counterweight, without which this revision would be strictly harder to adopt than
  what it replaces.** Every item above is a tightening. The **lightweight path** becomes
  the **default route**: opening acceptance inside the path record, coherence questions
  answered inside the closing record, `A` allowed to share `C`'s commit — with exact
  candidate identity and exact acceptance fully retained. `route: full` is *required* by
  five named triggers, and escalation is one-way; no path may declare itself down.
- **Typed work units** (`implementation`, `documentation`, `decision`, `foundation`,
  `repair`, `closure`) make "where relevant" exact. The untyped rule demanded a module note
  from a typo fix, which trains a writer — human or agent — to manufacture an empty
  documentation delta until the gate goes quiet.
- **Repair procedures** for the eight violations real deployments hit, each a `repair` work
  unit that leaves the violation visible in the ledger and is never the same unit as the
  work that caused it. **Redaction** is a ceremony beginning with rotation, because
  redaction is not un-disclosure.
- **Editorial.** Identity is the full object id in the repository's configured object
  format, not forty hex characters — the "universal" edition was SHA-1-specific. The
  lifecycle diagram and table are reconciled both ways: `ready → blocked` exists (acceptance
  stalls), `blocked → ready` does not (reaching `ready` is execution), and
  `archived → archived` is removed because an unchanged state is not an event.
- **The origin gap.** A **foundation path** covers a repository's own first hour: write
  surface `docs/**` plus `draft` path records, documents as work units, verification by
  `links` + `schema` + coherence audit — three rules that already existed, so no new gate —
  and a deliverable of foundational text plus a roadmap of `draft` path records awaiting
  opening acceptance. Its **adoption** variant back-documents a brownfield repository into
  a legal entry point. Governing documents pinned as `path@oid` are also what make the
  scope digests cheap.
- **Concept budget held at 66.** `file`, `markdown`, `fetch`, `push` and `working-tree`
  merged into `project-memory`, `frontmatter`, `fetch-and-push` and `worktree`, paying for
  `checkpoint-retention`, `provisional-commit`, `scope-digest`, `acceptance-drift` and
  `foundation-path`. The Git-glossary split (21 borrowed terms, 45 Cairn concepts) is
  structural and **added no article**, which the brief required.
- **ADR-019** records the decisions and amends ADR-018 on the two rules v0.2 contradicts.
  It stays `proposed`. Five regression tests added to the executable documentation
  contract; suite 118 → 123.
