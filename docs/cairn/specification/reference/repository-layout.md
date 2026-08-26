---
type: Cairn Reference
title: Repository layout and reference binding
description: The complete Cairn-owned directory tree, installed v0.1 bindings, file roles, identifiers, and ownership conventions.
tags: [cairn, reference, repository, layout, naming]
timestamp: 2026-08-25T00:00:00Z
---

# Repository layout and reference binding

The [specification](../index.md#the-repository-around-the-path) defines roles
before paths: application source, the Cairn
[control plane](../concepts/control-plane.md), durable project knowledge, and
durable execution state. A portable implementation may bind those roles to
different names. The v0.1 tools in this repository do not yet load that
configuration, so an operator also needs the exact installed binding below.

## Installed v0.1 tree

This tree is exhaustive for active Cairn-defined files and folder roles in the
reference repository. Angle brackets mark repeatable names. Application code,
domain knowledge, and non-normative research material may add files outside
this tree without becoming protocol structure.

```text
repository/
├── AGENTS.md
├── package.json
├── .github/
│   └── workflows/
│       └── cairn.yml
├── tools/
│   ├── cairn-check.mjs
│   ├── cairn-check.test.mjs
│   ├── cairn-active.mjs
│   ├── cairn-active.test.mjs
│   ├── cairn-audit.mjs
│   ├── cairn-audit.test.mjs
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
│   ├── bedrock/
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
└── atomik-project/
    ├── index.md
    ├── log.md
    ├── coding-paths/
    │   ├── index.md
    │   ├── log.md
    │   ├── paths.md
    │   ├── ACTIVE.md
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
    ├── brainstorm/
    │   ├── index.md
    │   ├── log.md
    │   └── <provisional-note>.md
    ├── sources/
    │   ├── index.md
    │   ├── log.md
    │   └── <source-record>.md
    └── projects/
        ├── index.md
        ├── log.md
        └── <nested-project>/
            ├── index.md
            ├── log.md
            └── project.atomik-project.json
```

`shared/` is a guarded source root supported by the checker even when a
repository does not currently contain it. Repeatable records may be absent when
no event of that kind exists; their directory, index, and folder log still name
the role. `cairn.config.json` is not shown because it is a specified portability
target, not an installed v0.1 file.

## What every part does

| Path | Role | Write rule |
| :-- | :-- | :-- |
| `AGENTS.md` | small bootloader pointing participants to operating state and doctrine | change only with the protocol entry route |
| `package.json` | exposes the reference commands without making Node a protocol requirement | control-plane change |
| `.github/workflows/cairn.yml` | current CI adapter; reports checks for the supplied comparison refs | independently reviewed control-plane change |
| `tools/cairn-check.mjs` | deterministic blocking and advisory predicates | independently reviewed control-plane change |
| `tools/cairn-active.mjs` | rebuilds the live-path projection | independently reviewed control-plane change |
| `tools/cairn-audit.mjs` | scaffolds and checks one exact-candidate audit | independently reviewed control-plane change |
| `tools/cairn-rules.mjs` | projects checker metadata into the rule catalogue | independently reviewed control-plane change |
| `tools/cairn-spec-build.mjs` | projects canonical Markdown into the universal HTML reader | specification tooling change |
| `tools/*.test.mjs` | executable contract for each reference tool | same work unit as the tool |
| `docs/bedrock/` | accepted architecture and constitutional doctrine | path plus decision record when meaning changes |
| `docs/adr/ADR-*.md` | one durable architecture or protocol decision | path making the decision |
| `docs/modules/<area>.md` | implemented-area flow, boundaries, and tests | path changing that area |
| `docs/cairn/specification/index.md` | canonical normative protocol | accepted specification change |
| `docs/cairn/specification/concepts/*.md` | one explanatory article per specialised object | same specification work unit |
| `docs/cairn/specification/reference/*.md` | exact layouts, schemas, and operations | same specification work unit |
| `docs/cairn/specification.html` | generated self-contained reader | generator only |
| `atomik-project/index.md` | entry map for durable project knowledge and execution state | project-plane change |
| `atomik-project/coding-paths/paths.md` | current operating convention for opening, running, integrating, and cleaning paths | accepted protocol operation change |
| `atomik-project/coding-paths/CP-*.md` | one path's plan, state, ledger, checkpoint, and next action | current assigned writer |
| `atomik-project/coding-paths/ACTIVE.md` | generated live-path index | generator only |
| `atomik-project/coding-paths/history/*.md` | verbatim completed ledger sections | created by that path; immutable thereafter |
| `atomik-project/sessions/*.md` | opening, closing, and other human decisions | participant recording the event; immutable thereafter |
| `atomik-project/audits/*.md` | one audit bound to one full candidate hash | auditor; immutable thereafter |
| `atomik-project/briefs/*.md` | disposable current handoff projection | current assigned writer |
| `atomik-project/log/*.md` | one integrated outcome per file | integration unit; immutable thereafter |
| `atomik-project/log.md` | frozen compatibility archive, not the writable journal | never append or rewrite |
| `atomik-project/brainstorm/` | explicitly provisional thinking | normal path work; never treated as accepted doctrine |
| `atomik-project/sources/` | optional imported specifications and references | source-capture work |
| `atomik-project/projects/` | optional nested project bundles | project-specific policy |
| each meaningful folder's `index.md` | what belongs there and how to navigate it | update when folder meaning or contents change materially |
| each meaningful folder's `log.md` | recent meaningful changes in that scope | newest-first folder history; not an event record |

The ownership classes are canonical knowledge, path-owned state, generated
views, mutable navigation, provisional knowledge, and immutable event records.
Independent events receive independent files so parallel paths do not append to
one shared record.

## Portable roles and installed names

| Protocol role | Installed v0.1 binding | Intended configuration field |
| :-- | :-- | :-- |
| execution-state plane | `atomik-project/` | `roots.project` |
| accepted architecture | `docs/bedrock/` | `roots.architecture` |
| decision records | `docs/adr/` | `roots.decisions` |
| implemented-area notes | `docs/modules/` | `roots.modules` |
| guarded application source | `apps/`, `packages/`, `shared/` | `roots.source` |
| shared integration branch | `main` | `trunk` |
| shared checkpoint remote | `origin` | `remote` |

The portable role names used in the specification—`project/` and
`docs/architecture/`—describe these semantics without forcing the installed
names on another repository. The [configuration contract](./configuration.md)
defines the intended mapping. Until the loader exists, operators MUST use the
installed bindings and MUST NOT claim portable conformance.

## Naming relationships

### Path identity

```text
CP-ROADMAP-010
  → atomik-project/coding-paths/CP-ROADMAP-010.md
  → path/cp-roadmap-010
  → atomik-project/briefs/cp-roadmap-010-handoff.md
```

The id uses uppercase `CP-` followed by uppercase letters, digits, and hyphens.
It is stable, globally unique within the repository, and never reused. The
branch field remains present for `running`, `blocked`, and `ready`.

### Opening and closing records

```text
atomik-project/sessions/YYYY-MM-DD-<lowercase-path-id>-opening.md
atomik-project/sessions/YYYY-MM-DD-<lowercase-path-id>-closing.md
```

Root-level metadata, not the filename, defines `path` and `ceremony`.

### Audit record

```text
atomik-project/audits/<lowercase-path-id>-<full-40-character-subject-commit>.md
```

### Journal entry

```text
atomik-project/log/YYYY-MM-DD-<lowercase-path-id>.md
```

If a journal name would collide, add a stable subject suffix. Never overwrite
an existing entry.

## Derived relationships

```text
live path records
  └── atomik-project/coding-paths/ACTIVE.md

one path ledger
  ├── atomik-project/briefs/<id>-handoff.md
  └── atomik-project/coding-paths/history/<id>-S<NN>.md

integrated path + exact audit + exact closing acceptance
  └── atomik-project/log/YYYY-MM-DD-<id>.md

canonical Markdown article graph
  └── docs/cairn/specification.html
```

An arrow means “generated or projected from,” not “maintained as another
independent truth.”

Return to [one bounded path](../index.md#put-one-bounded-change-on-a-coding-path)
or open the [repository concept](../concepts/repository.md).
