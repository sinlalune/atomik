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

## 2026-09-01 — the seed teaches the shape the protocol already states

The normative text moved to born-sliced path records at the folder migration and
to generation-aware retention at ADR-021, but the pages an adopter copies from —
the layout reference, the operations sequences, the repair procedures and the
path template — still taught the flat record and the ungenerated ref namespace.
Two of those notations also survived inside the canonical index itself. They are
now one shape: the layout tree carries `g<NN>/` and the record folder, the
operations rebase sequence opens the next generation before the rewriting push
completes, and the template creates a folder with one file per step. The flat
record and pre-notation refs remain conforming and are documented as such. A test
now holds the seed pages to the current shapes, so this particular drift cannot
reopen quietly; it checks documentation currency, not repository state.

## 2026-09-01 — the host binding becomes executable

Schema 1, its JSON Schema and a dependency-free loader now bind portable Cairn
roles to one repository before the checker, active view or audit scaffold reads
state. The tools consume configured roots, source areas, trunk, remote, metadata
namespace, route default, digest and retention policy, and the checker prints
the effective binding and enforcement profile. The conformance matrix remains
narrow: schema migrations, install/update mechanics, generated adapters and
transport tests are still open, and `cairn-init` is the next unit.

## 2026-09-01 — portable protocol, host constitution, named binding

ADR-020's PORTABLE / HOST / BINDING classification is now the installed entry
shape. A new reference article carries the portable coding-session order;
canonical, concept and reference pages carry role names only; and the
repository-layout reference sends installed paths, commands and examples to one
host binding appendix. The conformance row says what remains: `cairn-init` must
scaffold this classified shape before general release.

## 2026-09-01 — a step append is proved from the record, not the gate's base

`record-integrity` treated any Git `M` status on a born-sliced step as a
rewrite, even though the specification permits exact suffix appends. The
reference checker now follows the step through renames to its adding blob: that
blob must remain a prefix, link targets may be repointed only during a step
relocation, and immutable event records keep their original path. The
conformance matrix moves only the born-sliced prefix half to implemented; flat
live-ledger and verbatim-roll proof remain open.

## 2026-08-27 — owner review: the trail, the role names, and a modern reader

**The answerable-alone contract said the wrong thing.** It required a reader
holding "only `AGENTS.md` and the brief — no ledger" to answer eight questions,
which contradicts what `AGENTS.md` actually does: it points at the operating
convention, which points at the live view, which names the path and its ledger.
Reconstructing that chain is the protocol working, not a failure of the brief.
"Alone" now constrains **context, not file count** — no conversation, no prior
session, no memory — and each answer must be in the brief or in a record the
brief names at an exact object id.

The companion sentence was inverted for the same reason. It named only the
*thick* failure (a brief that reproduces the ledger becomes a second ledger) and
left the thin one unnamed, so a brief could satisfy the text by saying almost
nothing. Both are now stated: deciding which of the ledger's history is still
the situation is the brief's own job, and a brief that hands it back has been
silent rather than terse. The frontmatter's lack of an objective field is now
explained where a reader would otherwise read it as an oversight.

The [cold-resume pilot](../cairn-cold-resume-pilot-2026-08-26.md) was run under
the earlier wording and carries a note saying which of its numbers move: the two
dominant failures test brief fields and do not, `outcome` becomes an upper
bound, and the finding that decides v0.3 is unaffected.

**Role names, everywhere but one table.** The specification carried
`atomik-project/` — the folder name of the application Cairn was extracted from
— through fifty-six examples, templates and command sequences. Every one now
reads `project/`. The single place a host binding belongs is the installed
binding table in the [layout reference](./reference/repository-layout.md), which
gained a column and a paragraph saying why two roles are bound to legacy names
and that no adopting repository should inherit them.

**Three things the text asked a reader to already know.** The `governs:` pin
demanded a *blob* object id and then dropped `git rev-parse HEAD:<path>` with no
explanation; the command now has its output, its `<commit>:<path>` form, and the
`git show` that reads the pinned version back. `[route]` linked to the
lightweight-path article, so the field and its default were the same page; route
is now its own concept with the four routes, the five triggers, the ledger
backstop and one-way escalation. The `refs/cairn/checkpoints/` namespace was
described but never located: it is now in the reference tree under `.git/refs/`,
in the role table, and has a paragraph naming the three commands that make refs
visible at all.

**Two rows left the tree.** `sources/` and `projects/` were vault fixtures from
the host repository's first use as an Atomik vault, and the frozen `log.md`
archive predates the one-file-per-entry journal. None is Cairn structure.

**The reader.** The two panes were peers with an active-pane model that added a
selection step before every click. The specification is now fixed in the left
pane and every link and tree entry opens on the right, which removes the model,
the Pane A/Pane B labels, and the coloured rule lines that marked active state —
current state reads as a subtle fill against the layout's one separator line.
Body text moved to a modern sans with a serif display title, rounded corners
landed on the search field, code blocks, tables, quotes and buttons, and the
edition label is now read from the specification's own frontmatter rather than
hard-coded, where it had been saying v0.1 since the text moved to v0.2.

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
