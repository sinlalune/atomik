---
type: Atomik ADR
title: 'ADR-019: Cairn v0.2 — retention, provisional commits, the brief contract, and the lightweight default'
description: Closes the gaps between Cairn's promises and its predicates - checkpoint retention before force-push, marked provisional commits, a specified handoff-brief contract, field-level closure, scope digests, an acceptance-drift predicate over declared surfaces, structured advisory dispositions, typed work units, repair procedures, redaction, and the lightweight route as the default.
tags: [adr, cairn, protocol, retention, resumability, closure, cost, v0-2]
timestamp: 2026-08-26T00:00:00Z
adr:
  id: ADR-019
  status: proposed
  date: 2026-08-26
---

# ADR-019: Cairn v0.2 — retention, provisional commits, the brief contract, and the lightweight default

Status: proposed
Date: 2026-08-26
Amends: ADR-018 (candidate-bound closure, truthful lifecycle, team enforcement boundaries)

## Context

An external review of the v0.1 specification produced nineteen findings across
four severity bands, plus one structural gap. The findings are accepted. Two of
them identify places where the protocol's own stated promises are broken by its
own rules, which is a different class of defect from an unimplemented feature.

This ADR records the decisions. The normative text lives in
[`docs/cairn/specification/`](../cairn/specification/index.md); this page states
what was decided and why, and what was deliberately not decided.

**No checker rule is implemented by this decision.** Every requirement below is
canonical and carries a conformance-matrix row whose reference-tools column says
`not implemented`. That is a deliberate sequencing choice: the specification is
being corrected first so that the tooling has a correct target, and a matrix row
that lies about a mechanism is the failure mode this whole revision exists to
remove.

## Decision

### 1. Checkpoint retention precedes any rewriting push

Rebase-before-close force-pushes the path branch. Every checkpoint the ledger
names becomes unreachable, and the ledger — which promises resumability by
naming exact object ids — starts pointing at nothing. Resumability is Cairn's
central claim, so this is not a corner case.

Before any rewriting push of a path branch, every ledger-named commit MUST be
reachable from `refs/cairn/checkpoints/<path-id>/<n>` on the same remote. A
repository that will not maintain that namespace MUST instead forbid rewriting
pushes on path branches and reach a current base by merge. Rewriting without
retention is not a conforming option.

### 2. Provisional commits are pushed and marked

v0.1 required work under pre-acceptance inspection to stay uncommitted and
unpushed. That rule forbids publishing precisely the state the protocol exists
to protect — an agent's working tree, mid-session — in order to protect the
meaning of the word "complete".

A **provisional commit** is pushed like any other commit and carries the trailer
`Cairn-Provisional: <reason>`. It is durable, is not a remote checkpoint, is not
a resume point, and is excluded from candidate identity: every provisional
commit is folded into the work unit it was drafting before `C` exists. This
amends ADR-018's inspection rule.

### 3. The handoff brief has a specified contract

The brief is the bootstrap document and was unspecified. It now has frontmatter
(`checkpoint`, `checkpoint_pushed`, `base_commit`, `trunk_seen`, `writes`,
`governs` as `path@<object-id>`, `verify` as exact commands, `budget_tokens`),
seven capped body sections, a ~1200-token budget, and an **answerable-alone
contract**: a reader with only `AGENTS.md` and the brief must be able to state
the outcome, the resume commit, the single next action, the write surface, what
to read and at which object id, what is blocking, what was tried and rejected,
and the exact verification commands. Needing the ledger to answer any of those
means the brief failed.

The brief is mutable and rewritten per work unit; the ledger is append-only
history. **Cold resume** — a participant with no prior context performing the
next action from the brief alone — becomes the pilot's primary metric.

### 4. Closure is restricted field by field

The definition of done and both declared surfaces live inside the path record,
so permitting `A` to "change the path record" permits closure to rewrite the
standard its own acceptance was measured against. `A` may change only `status`,
`subject_commit`, one appended ledger entry, and the brief's checkpoint pointer,
plus the two new records it adds.

### 5. Scope is bound by digest

`scope_ref` is a mutable pointer while implementation is bound to an object id.
Opening acceptance records a `scope_digest` of the resolved section; closing
re-computes it and refuses to proceed on a mismatch. A legitimate change is a
scope amendment — a new opening acceptance with a new digest, superseding the
old record.

### 6. Drift is decided by predicate, not by equality

The closing record names the base `T`. An acceptance survives while the trunk
delta from `T` to `T'` touches nothing matched by `writes:` ∪ `governs:`.

`remote_trunk == T` at integration is explicitly **rejected**. It is the obvious
rule and it is first-come-first-served: every landing invalidates every other
open acceptance, and where audit plus acceptance take longer than the trunk's
landing interval, nothing closes. The failure mode is worst on the busy
repositories the protocol is for.

### 7. Advisory dispositions are structured

`advisory_disposition` becomes a list of `{rule, disposition, reason}`, with
`owner` and `follow_up` on deferrals, required to match the advisories raised at
`C` exactly. As a free-text string, "every advisory MUST be recorded" is
unenforceable and a false record reads as a complete one.

### 8. Role collapse is recorded, not forbidden

Acceptance records name the roles the actor held. An advisory fires when one
actor recorded both the opening and the closing acceptance. Solo and agent
setups collapse all five roles, which makes acceptance a self-issued signature;
forbidding that would make Cairn unusable for its most likely first adopter, so
the decision is to make the degradation visible instead of invisible. A
repository whose acceptances routinely collapse MUST NOT claim a profile above
`local` on their strength.

### 9. Scope drift blocks unless the declaration moves with it

Writing outside `writes:` is permitted only when the same work unit updates the
declaration and records why. This is what the prose already prescribed; the rule
now says it.

### 10. The lightweight route is the default

Every item above is a tightening, and a revision made only of tightenings is
strictly harder to adopt than what it replaces. The **lightweight path** becomes
the default route: opening acceptance inside the path record, coherence
questions answered inside the closing record, `A` permitted to share `C`'s
commit — with exact candidate identity and exact acceptance retained.

`route: full` is **required** for control-plane changes, architecture or
decision changes, multi-area `writes:`, multi-unit work, and policy-designated
high-risk areas. Escalation is one-way; no path may declare itself down a route.

This item is the counterweight to items 1–9, not polish. Shipping the
tightenings without it was explicitly rejected.

### 11. Work units are typed

Types `implementation`, `documentation`, `decision`, `foundation`, `repair`, and
`closure` each name the parts that must move together. An untyped rule demanding
documentation from every unit trains writers — human and agent — to manufacture
empty documentation deltas until the gate goes quiet.

### 12. Repair procedures are specified

A protocol with no repair procedure has one implicit instruction for a path that
already violated a rule: tidy the history until the rule looks satisfied. Repair
is now a typed work unit that leaves the violation visible in the ledger and is
never the same unit as the work that caused it. Procedures cover unregistered
branches, post-acceptance implementation change, edited immutable records,
retention-less force-push, a branch declaring `done`, digest mismatch,
undeclared writes, and committed secrets.

### 13. Redaction is a ceremony

Rotate the credential first — redaction is not un-disclosure. Then write an
immutable redaction record, replace the content in place with a marker in its
own commit, and treat any history rewrite as a separate work unit that updates
every retention ref and ledger reference.

### 14. Identity is object-format agnostic

"Full object id in the repository's configured object format", not forty
hexadecimal characters. SHA-1 gives forty, SHA-256 gives sixty-four, and a
"universal" edition that hard-codes the first is not universal.

### 15. The lifecycle diagram and table are reconciled both ways

`ready → blocked` exists — acceptance stalls, and a stalled candidate should say
so rather than let a `ready` age quietly. `blocked → ready` does not exist,
because reaching `ready` requires execution. `archived → archived` is removed:
an unchanged state is not an event, and validators MUST accept an unchanged
state for every state.

### 16. The concept wiki separates borrowed from defined vocabulary

Twenty-one borrowed Git and general-practice terms are presented separately from
forty-five Cairn concepts. **No article was added to achieve this**; the split is
structural. Net concept count is held at 66: `file`, `markdown`, `fetch`,
`push`, and `working-tree` were merged away to pay for `checkpoint-retention`,
`provisional-commit`, `scope-digest`, `acceptance-drift`, and `foundation-path`.

### 17. Foundation and adoption paths close the origin gap

A **foundation path** covers a repository's own first hour: write surface
`docs/**` plus `draft` path records, documents as work units, verification by
`links` + `schema` + coherence audit — all three already existing corpus rules,
so no new gate — and a deliverable of foundational text plus a roadmap of
`draft` path records awaiting opening acceptance. Governing documents are pinned
as `path@<object-id>`, which is also what makes the scope digests of the paths
it produces cheap.

An **adoption** variant back-documents an existing repository into an initial
`docs/modules/` set, so a brownfield repository has a legal entry point and its
first change is not also its first record.

## Consequences

- Cairn v0.2 requires strictly more evidence per acceptance than v0.1 and,
  through the lightweight default, strictly fewer artifacts for ordinary work.
  Whether that trade is net cheaper is an empirical question the cold-resume
  pilot is meant to answer.
- The reference tools now lag the specification by fourteen requirements. That
  gap is stated row by row in the conformance matrix. Any conformance report
  marking those rows `pass` on the strength of the reference tools is wrong.
- Retention refs impose an operational obligation outside the working tree.
  Clones and mirrors with restricted refspecs will silently drop them, which
  makes fetch configuration part of conformance.
- This repository's own paths do not yet declare `route:` or `governs:`, and its
  ledger-named checkpoints are not yet retained. Migrating them is separate work
  and is not claimed here.

## Alternatives considered

- **Ship P1 alone.** Rejected. Every P1 item is a tightening; without the
  lightweight default the revision is strictly harder to adopt than what it
  replaces, and a protocol people route around enforces nothing.
- **Fix trunk drift with `remote_trunk == T`.** Rejected — see decision 6.
- **Forbid role collapse.** Rejected — see decision 8.
- **Implement the checker rules in the same change.** Rejected. Nineteen
  normative changes and their predicates in one candidate is not a reviewable
  work unit, and the specification is the correct target for the tooling to be
  written against.
- **Add a "glossary" article to separate borrowed terms.** Rejected. The
  separation is structural, and solving a presentation problem by adding a
  concept is what produced the undifferentiated glossary in the first place.

## Migration / rollback

The specification supersedes v0.1 in place; the delta is recorded in
[`docs/cairn/specification/log.md`](../cairn/specification/log.md). Rollback is a
revert of the specification commit — no data migration exists, because no tool
reads the new fields yet.

Existing paths continue to conform to the parts the reference tools check. They
acquire `route:`, `governs:`, retention refs, and typed ledger entries when the
corresponding tooling lands, not before.

## Links

- [Canonical specification](../cairn/specification/index.md)
- [Conformance matrix](../cairn/specification/index.md#current-conformance)
- [Deliberate non-goals](../cairn/specification/index.md#deliberate-non-goals)
- [Handoff-brief contract](../cairn/specification/reference/handoff-brief.md)
- [Repair procedures](../cairn/specification/reference/repair.md)
- [ADR-018](./ADR-018-cairn-candidate-bound-closure.md) — amended by decisions 2 and 4
- [ADR-017](./ADR-017-coding-path-lifecycle.md) — extended by decision 15
