---
type: Atomik Folder Log
title: Log — Cairn canonical specification
description: Meaningful changes to the specification project; this log is historical and non-normative.
tags: [cairn, specification, log, okf]
timestamp: 2026-08-26T00:00:00Z
---

# Log — Cairn canonical specification

The companion entry point is [index.md](./index.md). This log records changes to
the documentation project; it is not part of the protocol's normative prose.

## 2026-08-26 — v0.2

The specification moves from v0.1 to v0.2 against an external nineteen-item
review. Every item is resolved in normative text or listed under *Deliberate
non-goals* with a reason; none is deferred silently. No checker rule was
implemented in this revision, and every added requirement carries a
conformance-matrix row whose reference-tools column says so.

**Promises that were being broken.** Rebase-before-close force-pushes a path
branch and orphans every checkpoint the ledger names, which breaks resumability
at the exact moment the ledger is most complete; retention refs under
`refs/cairn/checkpoints/<path-id>/<n>` are now required before any rewriting
push, with "forbid rewriting pushes" as the only other conforming option. The
rule that kept pre-acceptance work uncommitted and unpushed contradicted the
protocol's own thesis by forbidding publication of the most losable state there
is; a marked, pushed **provisional commit** replaces it, excluded from candidate
identity and folded before `C`. The handoff brief — the bootstrap contract,
mentioned throughout and specified nowhere — now has frontmatter fields, seven
capped body sections, a token budget, an answerable-alone contract, and a
cold-resume benchmark as the pilot's primary metric.

**Records that did not mean what they claimed.** Administrative closure is
restricted field by field rather than file by file, because the definition of
done lives inside the path record. `scope_ref` gained a **scope digest**
recorded at opening and re-verified at closing. The closing record names the
base `T` it was accepted against, and an **acceptance-drift** predicate over
`writes:` ∪ `governs:` decides whether that acceptance survives a moved trunk —
deliberately not `T' == T`, which is first-come-first-served and livelocks a
busy repository. `advisory_disposition` became a structured list required to
match the findings raised at `C`. Acceptance records name the roles the actor
held, and a collapsed opening/closing actor is an advisory rather than an
invisible weakness. Writing outside `writes:` blocks unless the declaration
moves in the same commit.

**Cost, so the tightenings are affordable.** The **lightweight path** is now the
default and the full ceremony is opt-in, required by named triggers, with
one-way escalation. Work units are **typed**, so "where relevant" is exact
instead of a rule that trains writers to manufacture empty documentation deltas.
**Repair procedures** cover the mid-path violations real deployments hit, and a
**redaction ceremony** handles secrets in immutable records — rotation first,
because redaction is not un-disclosure.

**Editorial.** Identity is stated as the full object id in the repository's
configured object format rather than forty hexadecimal characters. The lifecycle
diagram and transition table are reconciled in both directions: `ready → blocked`
exists, `blocked → ready` does not, and `archived → archived` is not a
transition because an unchanged state is not an event. The concept wiki now
separates twenty-one borrowed Git and general-practice terms from forty-five
Cairn concepts.

**The origin gap.** A **foundation path** describes a repository's own first
hour: write surface `docs/**` plus `draft` path records, documents as work
units, verification by `links` + `schema` + coherence audit — three checks that
already existed — and a deliverable of foundational text plus a roadmap of
`draft` path records awaiting opening acceptance. An **adoption** variant
back-documents an existing repository into a legal entry point.

**Concept budget.** Held at 66. `file`, `markdown`, `fetch`, `push`, and
`working-tree` merged into `project-memory`, `frontmatter`, `fetch-and-push`,
and `worktree`; `checkpoint-retention`, `provisional-commit`, `scope-digest`,
`acceptance-drift`, and `foundation-path` added. `commit-hash` was retitled to
*Object id*.

## 2026-08-26 — reader defects and the exhaustive repository map

- Replaced the early jargon-only protocol chain with a plain-language action
  map whose formal Cairn term in every row links to its concept article.
- Audited concept definitions so specialised terms encountered through direct
  wiki navigation link at first use rather than relying on a later glossary.
- Expanded the repository map from an illustrative tree into an exhaustive map
  of active Cairn roles, then documented the installed `atomik-project/` and
  `docs/bedrock/` bindings separately from portable role names.
- Fixed two reader defects: both pane states now exist before the first render,
  and each pane is a bounded internal scroll region. Direct article URLs and
  cross-pane wiki routing now have executable browser-DOM tests.
- Removed the gutters between the tree and peer panes. The interface remains
  flat and research-oriented while navigation chrome uses restrained
  translucent blur instead of decorative depth.

## 2026-08-25

- Reframed the canonical document as a simple-to-complex learning route while
  keeping every protocol requirement in one authoritative specification.
- Replaced combined foundation chapters and the central glossary with a
  concept wiki: one focused page per specialised Git or Cairn object.
- Bound audit and closing acceptance to one exact implementation candidate;
  introduced `ready` before integration and reserved `done` for the trunk.
- Added transition checks, critical inconclusive outcomes, record integrity,
  team writer handoffs, a trusted-collaborator threat boundary, and explicit
  conformance gaps.
- Reworked the implementation reference around full-hash records, a
  metadata-only closure commit, exact integration transport, versioned
  configuration status, and a claim-by-claim checklist.
- Rebuilt the universal reader with a restrained paper-like visual language and
  two equal article panes.
