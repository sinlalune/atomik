---
type: Cairn Reference
title: Versioned Cairn configuration
description: The versioned host-binding schema, the fields consumed by the reference tools, and the portability obligations that remain open.
tags: [cairn, reference, configuration, portability, conformance]
timestamp: 2026-08-26T00:00:00Z
---

# Versioned Cairn configuration

## Status

The schema-1 binding and its dependency-free loader are installed. Before any
repository rule runs, `cairn-check`, `cairn-active`, and `cairn-audit` load and
validate `cairn.config.json`. The checker prints the effective enforcement
profile and consumes the configured roots, source areas, trunk, remote,
metadata namespace, route default, checkpoint policy, and digest algorithm.

This is **partial portable conformance**, not the completed distribution story.
`cairn-init` now installs a repository transactionally and writes this file, and
`cairn.lock.json` records the release and a digest per installed file — which is
what an update would need to tell a pristine file from an edited one. The update
itself, and schema-to-schema migrations and transport tests, are still absent.
The checked-in workflow is an installed host adapter. Those open obligations remain visible
in [current conformance](../index.md#current-conformance).

## Intended file

```json
{
  "$schema": "./tools/cairn-config.schema.json",
  "version": 1,
  "trunk": "main",
  "remote": "origin",
  "metadataNamespace": "cairn",
  "enforcementProfile": "local",
  "roots": {
    "documentation": "docs",
    "project": "project",
    "architecture": "docs/architecture",
    "decisions": "docs/adr",
    "modules": "docs/modules",
    "concepts": "docs/cairn/specification/concepts",
    "source": ["src", "packages"]
  },
  "areas": [
    {
      "name": "application",
      "match": ["src/**"],
      "note": "docs/modules/application.md"
    }
  ],
  "sharedFiles": [
    "project/coding-paths/ACTIVE.md",
    "project/coding-paths/index.md"
  ],
  "staleAfterDays": 14,
  "defaultRoute": "lightweight",
  "checkpointRetentionRef": null,
  "pathHistoryPolicy": "forbidden",
  "scopeDigestAlgorithm": "sha256",
  "transport": {
    "registration": "declared-adapter-name",
    "integration": "declared-adapter-name"
  },
  "migration": {
    "unregisteredPaths": [],
    "undeclaredOpenings": [],
    "v02Records": []
  }
}
```

These are role-name defaults rather than one installed repository's paths. A
host records its concrete names here and explains operational details in the
binding appendix described by the
[repository-layout reference](./repository-layout.md#host-binding-appendix).
Repository paths use forward slashes on every operating system; absolute,
parent-traversing, dot-segment, empty-segment, and backslash forms are rejected.

## Fields

| Field | Meaning | Constraint |
| :-- | :-- | :-- |
| `$schema` | editor and validator pointer | optional non-empty string |
| `version` | configuration schema version | exactly one supported integer; unknown versions fail before any rule runs |
| `trunk` | shared integration branch | resolvable local and remote ref |
| `remote` | shared checkpoint remote | configured Git remote |
| `metadataNamespace` | nested path and audit metadata key | one validated key |
| `enforcementProfile` | installed capability | `local \| ci \| protected` |
| `roots.documentation` | durable documentation plane | normalised repository-relative path |
| `roots.project` | execution-state plane | normalised repository-relative path |
| `roots.architecture` | accepted doctrine | normalised repository-relative path |
| `roots.decisions` | decision records | normalised repository-relative path |
| `roots.modules` | implemented-area notes | normalised repository-relative path |
| `roots.concepts` | one-idea explanatory wiki | normalised repository-relative path |
| `roots.source` | guarded source roots | non-empty path array |
| `areas` | source pattern to module-note routing | ordered `{ name, match[], note }` entries; first matching entry wins |
| `sharedFiles` | generated or shared statements of record | repository-relative file array |
| `staleAfterDays` | quiet-path advisory window | positive integer, advisory only |
| `defaultRoute` | route a new-path generator writes and a missing-field diagnostic recommends | `lightweight \| full`; the resulting path record still declares it explicitly |
| `checkpointRetentionRef` | ref prefix for [checkpoint retention](../concepts/checkpoint-retention.md) | a ref prefix the remote accepts, or `null` where the repository forbids rewriting pushes instead |
| `pathHistoryPolicy` | which conforming rewrite policy the host chose | `retained` with a ref prefix, or `forbidden` with a null prefix |
| `scopeDigestAlgorithm` | digest used for [scope digests](../concepts/scope-digest.md) | a named algorithm; the digest is never abbreviated |
| `transport` | registration and integration adapters | installed and tested adapter identifiers |
| `migration` | finite exceptions for records predating installed predicates | three explicit path-id arrays; not a schema-version migration mechanism |

`checkpointRetentionRef: null` is a conforming value only when the repository
also forbids rewriting pushes on path branches. It is not a way to opt out of
retaining checkpoints; it is the declaration that the other conforming option
was chosen.

## Implementation obligations

A portable implementation MUST:

1. validate configuration before evaluating repository rules;
2. reject unknown schema versions and supply explicit migrations;
3. normalise paths consistently across supported operating systems;
4. publish its Node or other runtime, package manager, Git version, and shell
   requirements;
5. use configured roots, trunk, remote, and metadata namespace in parsing,
   diagnostics, templates, and generated views;
6. define installation and update mechanics;
7. test every supported host transport against the exact commit it lands;
8. print the effective bindings and enforcement profile;
9. refuse to start when `checkpointRetentionRef` is `null` and the repository
   has not also declared that rewriting pushes are forbidden on path branches.

Configuration may rename a role. It may not weaken a protocol `MUST`.

The installed schema-1 loader currently satisfies obligations 1, 3, and the
binding portion of 5; rejects unknown versions for obligation 2; and prints the
effective profile plus branch/base binding for obligation 8. It does **not**
claim the missing half of 2 or obligations 4, 6, and 7. A declaration of
`pathHistoryPolicy: forbidden` satisfies the paired declaration in obligation
9; whether a host actually prevents the push is an enforcement-profile claim,
not something a local JSON reader can prove.

## Metadata syntax

A portable implementation SHOULD use a maintained YAML parser for
YAML-frontmatter. If it intentionally accepts a smaller grammar, it MUST name
that grammar distinctly, reject unsupported constructs, and provide a
versioned schema. A custom subset MUST NOT be presented as full YAML.

Return to [current conformance](../index.md#current-conformance) or the
[conformance checklist](./conformance.md).
