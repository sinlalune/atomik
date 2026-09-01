---
type: Cairn Reference
title: Repository layout and binding boundary
description: The complete portable Cairn-owned directory tree and ref namespace, file roles, identifiers, ownership conventions, and the boundary where a host supplies its own names.
tags: [cairn, reference, repository, layout, naming]
timestamp: 2026-08-26T00:00:00Z
---

# Repository layout and binding boundary

The [specification](../index.md#the-repository-around-the-path) defines roles
before paths: application source, the Cairn
[control plane](../concepts/control-plane.md), durable project knowledge, and
durable execution state. A portable implementation may bind those roles to
folders it already has.

This page uses the protocol's own **role names** throughout — `project/`,
`docs/architecture/`. Which folder a given repository binds each role to is
recorded in its [host binding appendix](#host-binding-appendix). Nothing here
repeats an installed repository's local vocabulary, because a specification
that carries one adoption's folder names through every example is teaching that
adoption rather than the protocol.

## The reference tree

This tree is exhaustive for active Cairn-defined files, folder roles, and refs.
Angle brackets mark repeatable names. Application code, domain knowledge, and
non-normative research material may add files outside this tree without becoming
protocol structure.

```text
repository/
├── .git/
│   └── refs/
│       ├── heads/
│       │   ├── <trunk>
│       │   └── path/<lowercase-path-id>
│       └── cairn/
│           └── checkpoints/
│               └── <lowercase-path-id>/
│                   └── g<NN>/
│                       └── <ledger-unit-ordinal>
├── AGENTS.md
├── cairn.config.json
├── cairn.lock.json
├── package.json
├── .github/
│   └── workflows/
│       └── cairn.yml
├── tools/
│   ├── cairn-check.mjs
│   ├── cairn-check.test.mjs
│   ├── cairn-config.mjs
│   ├── cairn-config.schema.json
│   ├── cairn-config.test.mjs
│   ├── cairn-active.mjs
│   ├── cairn-active.test.mjs
│   ├── cairn-audit.mjs
│   ├── cairn-audit.test.mjs
│   ├── cairn-init.mjs
│   ├── cairn-init.test.mjs
│   ├── cairn-rules.mjs
│   ├── cairn-rules.test.mjs
│   ├── cairn-spec-build.mjs
│   └── cairn-spec.test.mjs
├── apps/
│   └── <application-files>
├── packages/
│   └── <shared-package-files>
├── shared/
│   └── <optional-shared-source-files>
├── docs/
│   ├── architecture/
│   │   ├── index.md
│   │   ├── log.md
│   │   ├── <numbered-architecture-page>.md
│   │   └── archive/
│   │       └── <superseded-page>.md
│   ├── adr/
│   │   ├── index.md
│   │   ├── log.md
│   │   └── ADR-<NNN>-<decision>.md
│   ├── modules/
│   │   ├── index.md
│   │   ├── log.md
│   │   └── <implemented-area>.md
│   └── cairn/
│       ├── index.md
│       ├── specification.html
│       └── specification/
│           ├── index.md
│           ├── log.md
│           ├── concepts/
│           │   ├── index.md
│           │   └── <concept>.md
│           └── reference/
│               ├── index.md
│               └── <reference-article>.md
└── project/
    ├── index.md
    ├── log.md
    ├── coding-paths/
    │   ├── index.md
    │   ├── log.md
    │   ├── paths.md
    │   ├── binding.md
    │   ├── ACTIVE.md
    │   ├── CP-<ID>/
    │   │   ├── index.md
    │   │   ├── log.md
    │   │   ├── plan.md
    │   │   └── steps/
    │   │       ├── index.md
    │   │       ├── log.md
    │   │       └── S<NN>.md
    │   ├── CP-<ID>.md
    │   └── history/
    │       ├── index.md
    │       ├── log.md
    │       └── CP-<ID>-S<NN>.md
    ├── sessions/
    │   ├── index.md
    │   ├── log.md
    │   ├── <date>-<path-id>-<event>.md
    │   └── <date>-<session>/
    │       └── <session-artifact>.md
    ├── audits/
    │   ├── index.md
    │   ├── log.md
    │   └── <path-id>-<full-subject-commit>.md
    ├── briefs/
    │   ├── index.md
    │   ├── log.md
    │   ├── <path-id>-handoff.md
    │   └── <date>-<subject>.md
    ├── log/
    │   ├── index.md
    │   └── <date>-<path-id>.md
    └── brainstorm/
        ├── index.md
        ├── log.md
        └── <provisional-note>.md
```

`.git/refs/` is shown because two of Cairn's durable objects are refs rather
than files and are therefore invisible to every directory listing: the path
branches, and the [checkpoint retention](../concepts/checkpoint-retention.md)
namespace described [below](#the-cairn-ref-namespace). A reader who searches the
working tree for them finds nothing and reasonably concludes they do not exist.

`shared/` is a guarded source root supported by the example binding even when a
repository does not currently contain it. Repeatable records may be absent when
no event of that kind exists; their directory, index, and folder log still name
the role. `cairn.config.json`, its schema, and its loader are shown because the
reference tools now consume that binding before evaluating repository rules.

A host repository may of course hold folders Cairn says nothing about. Those are
that repository's business and are deliberately absent here: this tree lists
what Cairn defines, not what any one adoption happens to contain.

## What every part does

| Path | Role | Write rule |
| :-- | :-- | :-- |
| `AGENTS.md` | small bootloader pointing participants to operating state and doctrine | change only with the protocol entry route |
| `cairn.config.json` | versioned machine-readable binding from portable roles to this host | host configuration change |
| `cairn.lock.json` | the protocol release installed here, and one digest per installed file, so an update can tell a pristine file from an edited one | written by `cairn-init`; never hand-edited |
| `tools/cairn-init.mjs` | transactional installer: resolves the whole file set, refuses to overwrite, rolls back on failure | independently reviewed control-plane change |
| `package.json` | exposes the reference commands without making Node a protocol requirement | control-plane change |
| `.github/workflows/cairn.yml` | current CI adapter; reports checks for the supplied comparison refs | independently reviewed control-plane change |
| `tools/cairn-check.mjs` | deterministic blocking and advisory predicates | independently reviewed control-plane change |
| `tools/cairn-config.mjs` | dependency-free binding loader and schema-1 validator | independently reviewed control-plane change |
| `tools/cairn-config.schema.json` | editor-readable schema for the installed binding | same work unit as the loader |
| `tools/cairn-active.mjs` | rebuilds the live-path projection | independently reviewed control-plane change |
| `tools/cairn-audit.mjs` | scaffolds and checks one exact-candidate audit | independently reviewed control-plane change |
| `tools/cairn-rules.mjs` | projects checker metadata into the rule catalogue | independently reviewed control-plane change |
| `tools/cairn-spec-build.mjs` | projects canonical Markdown into the universal HTML reader | specification tooling change |
| `tools/*.test.mjs` | executable contract for each reference tool | same work unit as the tool |
| `docs/architecture/` | accepted architecture and constitutional doctrine | path plus decision record when meaning changes |
| `docs/adr/ADR-*.md` | one durable architecture or protocol decision | path making the decision |
| `docs/modules/<area>.md` | implemented-area flow, boundaries, and tests | path changing that area |
| `docs/cairn/specification/index.md` | canonical normative protocol | accepted specification change |
| `docs/cairn/specification/concepts/*.md` | one explanatory article per specialised object | same specification work unit |
| `docs/cairn/specification/reference/*.md` | exact layouts, schemas, and operations | same specification work unit |
| `docs/cairn/specification.html` | generated self-contained reader | generator only |
| `project/index.md` | entry map for durable project knowledge and execution state | project-plane change |
| `project/coding-paths/paths.md` | portable operating convention for opening, running, integrating, and cleaning paths | accepted protocol operation change |
| `project/coding-paths/binding.md` | human-readable host adapter: installed roots, commands, worktree/runtime details, and local examples | host configuration change |
| `project/coding-paths/CP-<ID>/` | one path as a born-sliced record: live header in `index.md`, forward plan in `plan.md`, one file per step under `steps/` | current assigned writer |
| `project/coding-paths/CP-<ID>/steps/S<NN>.md` | one step's complete record, written to be read alone | append-only once written |
| `project/coding-paths/CP-*.md` | the same path as a flat record — the older shape, still conforming | current assigned writer |
| `project/coding-paths/ACTIVE.md` | generated live-path index | generator only |
| `project/coding-paths/history/*.md` | verbatim completed ledger sections rolled out of a FLAT record; a born-sliced record has no rollup and writes the step where it lives | created by that path; immutable thereafter |
| `project/sessions/*.md` | opening, closing, and other human decisions | participant recording the event; immutable thereafter |
| `project/audits/*.md` | one audit bound to one full candidate hash | auditor; immutable thereafter |
| `project/briefs/*.md` | disposable current handoff projection | current assigned writer |
| `project/log/*.md` | one integrated outcome per file | integration unit; immutable thereafter |
| `project/brainstorm/` | explicitly provisional thinking | normal path work; never treated as accepted doctrine |
| `refs/heads/path/<id>` | one path's branch, carrying every checkpoint it has pushed | current assigned writer |
| `refs/cairn/checkpoints/<id>/g<NN>/<n>` | one immovable pin per ledger-named checkpoint, inside the generation that was current when it was written | append-only; never moved or deleted while the path record lives |
| each meaningful folder's `index.md` | what belongs there and how to navigate it | update when folder meaning or contents change materially |
| each meaningful folder's `log.md` | recent meaningful changes in that scope | newest-first folder history; not an event record |

The ownership classes are canonical knowledge, path-owned state, generated
views, mutable navigation, provisional knowledge, and immutable event records.
Independent events receive independent files so parallel paths do not append to
one shared record.

## The Cairn ref namespace

Not everything Cairn owns is a file. One ref namespace lives outside every
working tree and outside every directory listing:

```text
refs/cairn/checkpoints/<path-id>/g<NN>/<n>
```

**This namespace exists only where the host declares
`pathHistoryPolicy: retained`.** Under `forbidden` — the default
(**ADR-022**) — nothing is
rewritten, the branch itself keeps every ledger-named commit reachable, and this
part of the tree is simply absent.

Each ref pins one ledger-named checkpoint so that a rewriting push cannot orphan
it. `<n>` is the ledger's own ordinal for that checkpoint. `g<NN>` is the
[generation](../concepts/checkpoint-retention.md) — one linear version of the
branch, opened when a rewrite closes the previous one. The refs are append-only
for the life of the path record, and they are not released by integration.

The current generation is **derived, never stored**: it is the highest-numbered
generation present whose refs are all ancestors of the branch tip. Nothing in
this tree records it, and nothing should — a stored generation is a claim about
ancestry that ancestry can already answer, and the two drift apart at the first
rewrite. A ref written before this notation carries no generation segment; it
MUST NOT be moved into one. Opening a generation belongs to the same work unit
as the rewrite that forced it.

**Where this actually is.** Refs are not in the working tree, so no amount of
`ls` will find them. They live inside the repository's own database — under
`.git/refs/` and `.git/packed-refs` locally, and in the equivalent store on the
remote. Git will not show them with `git branch` either, because that command
only reads `refs/heads/`. Three commands make the namespace visible:

```bash
$ git for-each-ref refs/cairn/checkpoints          # every retained checkpoint here
$ git ls-remote origin 'refs/cairn/checkpoints/*'  # every one the remote holds
$ git show-ref cp-example-001                      # one path's pins
```

Being invisible to a file listing is the point: a record kept as a file can be
edited by the work it describes, and a checkpoint pin must survive exactly the
operation — a rewriting push — that rewrites files.

A repository that clones with a restricted refspec, or a mirror that copies only
`refs/heads/*`, will silently lose this namespace. Fetch configuration is part of
conforming to [checkpoint retention](../concepts/checkpoint-retention.md), not an
optional convenience.

## Host binding appendix

Everything above this heading uses role names. A repository trades them for its
installed folders, commands, branch, remote and runtime details in exactly one
human-readable file:

```text
project/coding-paths/binding.md
```

That file is classified **BINDING**, not PORTABLE. It names the host and MAY
contain application paths, local command names, worktree examples, runtime
variables and known conflict surfaces. The root `AGENTS.md` points to it beside
the portable path convention and
[execution protocol](./execution-protocol.md). Host architecture remains outside
the unconditional protocol route and is selected through each path's
documentation coverage.

The [configuration contract](./configuration.md) is the machine-readable
counterpart. The schema-1 loader now resolves the installed binding for the
checker, active view, and audit scaffold. Schema migrations, installation,
updates, and generated host adapters remain open, so that loader is not by
itself a claim of complete portable conformance. Installed names still MUST NOT
leak into portable documentation.

## Naming relationships

### Path identity

```text
CP-ROADMAP-010
  → project/coding-paths/CP-ROADMAP-010/index.md   (born-sliced record)
  → project/coding-paths/CP-ROADMAP-010.md         (flat record, older shape)
  → path/cp-roadmap-010
  → project/briefs/cp-roadmap-010-handoff.md
```

A record's identity is the id it declares, not the file that carries it. Both
shapes above are the same path, and a record may migrate between them without
its registration, lifecycle or history appearing to restart. Every rule keys on
the id; a rule that keys on the filename is reading an address for a fact.

The id uses uppercase `CP-` followed by uppercase letters, digits, and hyphens.
It is stable, globally unique within the repository, and never reused. The
branch field remains present for `running`, `blocked`, and `ready`.

### Opening and closing records

```text
project/sessions/YYYY-MM-DD-<lowercase-path-id>-opening.md
project/sessions/YYYY-MM-DD-<lowercase-path-id>-closing.md
```

Root-level metadata, not the filename, defines `path` and `ceremony`.

### Audit record

```text
project/audits/<lowercase-path-id>-<full-40-character-subject-commit>.md
```

### Journal entry

```text
project/log/YYYY-MM-DD-<lowercase-path-id>.md
```

If a journal name would collide, add a stable subject suffix. Never overwrite
an existing entry.

## Derived relationships

```text
live path records
  └── project/coding-paths/ACTIVE.md

one path ledger
  ├── project/briefs/<id>-handoff.md
  └── project/coding-paths/history/<id>-S<NN>.md   (FLAT records only)

integrated path + exact audit + exact closing acceptance
  └── project/log/YYYY-MM-DD-<id>.md

canonical Markdown article graph
  └── docs/cairn/specification.html
```

An arrow means “generated or projected from,” not “maintained as another
independent truth.”

Return to [one bounded path](../index.md#put-one-bounded-change-on-a-coding-path)
or open the [repository concept](../concepts/repository.md).
