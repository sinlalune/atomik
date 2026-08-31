---
type: Cairn Reference
title: Versioned Cairn configuration
description: The specified portability interface, including the fields and implementation obligations that are not yet delivered by the reference tools.
tags: [cairn, reference, configuration, portability, conformance]
timestamp: 2026-08-26T00:00:00Z
---

# Versioned Cairn configuration

## Status

This page specifies the portable configuration contract. The reference
checker does **not** yet load it: its layout, metadata namespace, source roots,
area map, runtime assumptions, and trunk binding remain repository-specific.
Therefore the reference implementation MUST NOT claim portable conformance.

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
    "project": "atomik-project",
    "architecture": "docs/bedrock",
    "decisions": "docs/adr",
    "modules": "docs/modules",
    "source": ["apps", "packages", "shared"]
  },
  "areas": [
    {
      "match": "apps/**",
      "note": "docs/modules/application.md"
    }
  ],
  "staleAfterDays": 14,
  "defaultRoute": "lightweight",
  "checkpointRetentionRef": "refs/cairn/checkpoints",
  "scopeDigestAlgorithm": "sha256",
  "transport": {
    "registration": "declared-adapter-name",
    "integration": "declared-adapter-name"
  }
}
```

These values describe the [installed reference binding](./repository-layout.md#portable-roles-and-installed-names).
Another repository may choose different paths once the configuration loader is
implemented and validated.

## Fields

| Field | Meaning | Constraint |
| :-- | :-- | :-- |
| `version` | configuration schema version | positive supported integer |
| `trunk` | shared integration branch | resolvable local and remote ref |
| `remote` | shared checkpoint remote | configured Git remote |
| `metadataNamespace` | nested path and audit metadata key | one validated key |
| `enforcementProfile` | installed capability | `local \| ci \| protected` |
| `roots.project` | execution-state plane | normalised repository-relative path |
| `roots.architecture` | accepted doctrine | normalised repository-relative path |
| `roots.decisions` | decision records | normalised repository-relative path |
| `roots.modules` | implemented-area notes | normalised repository-relative path |
| `roots.source` | guarded source roots | non-empty path array |
| `areas` | source pattern to module-note routing | deterministic ordered matches |
| `staleAfterDays` | quiet-path advisory window | positive integer, advisory only |
| `defaultRoute` | route assumed when a path omits `route:` | `lightweight \| full` |
| `checkpointRetentionRef` | ref prefix for [checkpoint retention](../concepts/checkpoint-retention.md) | a ref prefix the remote accepts, or `null` where the repository forbids rewriting pushes instead |
| `scopeDigestAlgorithm` | digest used for [scope digests](../concepts/scope-digest.md) | a named algorithm; the digest is never abbreviated |
| `transport` | registration and integration adapters | installed and tested adapter identifiers |

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

## Metadata syntax

A portable implementation SHOULD use a maintained YAML parser for
YAML-frontmatter. If it intentionally accepts a smaller grammar, it MUST name
that grammar distinctly, reject unsupported constructs, and provide a
versioned schema. A custom subset MUST NOT be presented as full YAML.

Return to [current conformance](../index.md#current-conformance) or the
[conformance checklist](./conformance.md).
