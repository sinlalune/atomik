---
type: Cairn Reference
title: 'Reference: Canonical repository layout'
description: The default Cairn directory tree, file naming conventions, ownership classes, and generated relationships.
tags: [cairn, reference, repository, layout, naming]
timestamp: 2026-08-25T00:00:00Z
---

# Canonical repository layout

## Default tree

```text
repository/
├── .git/
├── AGENTS.md
├── cairn.config.json
├── src/ …
├── docs/
│   ├── architecture/
│   │   └── index.md
│   ├── adr/
│   │   ├── index.md
│   │   └── ADR-001-example.md
│   └── modules/
│       ├── index.md
│       └── example.md
└── project/
    ├── index.md
    ├── coding-paths/
    │   ├── index.md
    │   ├── ACTIVE.md
    │   ├── CP-EXAMPLE-001.md
    │   └── history/
    │       ├── index.md
    │       └── CP-EXAMPLE-001-S01.md
    ├── sessions/
    │   └── 2026-01-15-cp-example-001-opening.md
    ├── audits/
    │   └── cp-example-001-a1b2c3d.md
    ├── briefs/
    │   └── cp-example-001-handoff.md
    └── log/
        └── 2026-01-18-cp-example-001.md
```

`src/` is illustrative. Repositories bind their actual guarded source roots in
`cairn.config.json`.

## File roles

| Path | Role | Writer |
| :-- | :-- | :-- |
| `AGENTS.md` | minimal bootloader that points to the live protocol and active paths | architecture/process change |
| `cairn.config.json` | repository bindings and declared enforcement tier | accepted configuration change |
| `docs/architecture/` | accepted system doctrine | path with an ADR when the decision changes |
| `docs/adr/ADR-NNN-*.md` | one durable architectural decision | the path making that decision |
| `docs/modules/<area>.md` | implemented-area ownership, contracts, flow, tests | path changing that area |
| `project/coding-paths/CP-*.md` | accepted route and live ledger for one bounded task | its one path writer |
| `project/coding-paths/ACTIVE.md` | generated running-path portfolio | generator only |
| `project/coding-paths/history/*.md` | verbatim completed ledger sections | owning path, at a step boundary |
| `project/sessions/*.md` | opening and closing decisions | participant recording the ceremony |
| `project/audits/*.md` | one coherence judgement bound to path + commit | auditing agent or reviewer |
| `project/briefs/*.md` | disposable handoff projection | owning path, generated/refreshed from ledger |
| `project/log/*.md` | one integrated outcome per file | path at merge time |

## Identifier and filename conventions

### Path id

```text
CP-ROADMAP-010   roadmap-numbered work
CP-SEARCH        named bounded work
```

Requirements:

- uppercase `CP-` prefix;
- stable for the path's whole life;
- exact matching in every record;
- never reused for unrelated work.

### Branch

```text
CP-ROADMAP-010  →  path/cp-roadmap-010
CP-SEARCH       →  path/cp-search
```

### Session record

```text
YYYY-MM-DD-<lowercase-path-id>-opening.md
YYYY-MM-DD-<lowercase-path-id>-closing.md
```

The filename aids navigation. Root-level `path:` and `ceremony:` metadata define
identity and kind.

### Audit

```text
<lowercase-path-id>-<reviewed-commit-short-id>.md
```

### Handoff brief

```text
<lowercase-path-id>-handoff.md
```

One path overwrites its current brief; Git retains prior projections.

### Journal

```text
YYYY-MM-DD-<lowercase-path-id>.md
```

If one path produces more than one integrated entry on a date, append a stable
short subject instead of overwriting an entry.

## Derived relationships

```text
registered CP-*.md files on trunk
  └──► ACTIVE.md

one CP-*.md work ledger
  ├──► briefs/<id>-handoff.md
  └──► coding-paths/history/<id>-SNN.md

merged path + audit + closing record
  └──► log/YYYY-MM-DD-<id>.md
```

The arrow means “derived from or indexed over,” never “second independent source
of truth.”

Return to [The project model](../index.md#2-the-project-model).
