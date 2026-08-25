---
type: Cairn Reference
title: 'Reference: cairn.config.json'
description: Canonical configuration roles and defaults for binding Cairn to a repository without changing protocol semantics.
tags: [cairn, reference, configuration, portability, enforcement]
timestamp: 2026-08-25T00:00:00Z
---

# `cairn.config.json`

## Purpose

The protocol names roles: trunk, project plane, architecture, decisions, module
notes, guarded source, metadata namespace, and enforcement tier. Configuration
binds those roles to one repository's names.

Changing a binding must not change rule semantics. Generated messages and paths
must use the configured names so the checker never publishes a different model
from the one it evaluates.

## Canonical default

```json
{
  "$schema": "./tools/cairn-config.schema.json",
  "version": 1,
  "trunk": "main",
  "enforcement": "local",
  "metadataNamespace": "cairn",
  "roots": {
    "project": "project",
    "architecture": "docs/architecture",
    "decisions": "docs/adr",
    "modules": "docs/modules",
    "source": ["src"]
  },
  "areas": [
    {
      "match": "src/**",
      "note": "docs/modules/core.md"
    }
  ],
  "staleAfterDays": 14
}
```

## Fields

| Field | Meaning | Constraint |
| :-- | :-- | :-- |
| `version` | configuration schema version | positive integer understood by the checker |
| `trunk` | shared mainline ref | resolvable local or remote branch name |
| `enforcement` | installed tier | `local`, `ci`, or `protected` |
| `metadataNamespace` | nested path/audit metadata key | simple key used consistently by parsers and templates |
| `roots.project` | execution-state plane | repository-relative directory |
| `roots.architecture` | accepted doctrine | repository-relative directory |
| `roots.decisions` | ADR records | repository-relative directory |
| `roots.modules` | implemented-area notes | repository-relative directory |
| `roots.source` | guarded source roots | non-empty array of repository-relative directories |
| `areas` | source glob → module note routing | ordered; first matching rule wins |
| `staleAfterDays` | quiet-running-path advisory window | positive integer; advisory only |

## Enforcement declaration

`enforcement` describes what is actually installed:

- `local` — local checker only;
- `ci` — a workflow publishes results for trunk and path branches;
- `protected` — the host requires those results before trunk integration.

The checker prints this value in its header. Operators change it only when the
repository's real enforcement changes.

## Portability rules

A conforming implementation:

1. validates the configuration before evaluating repository rules;
2. resolves every managed path from the configured roots;
3. uses the configured trunk for registration and ancestry checks;
4. uses the configured metadata namespace for path and audit records;
5. keeps ceremony `path:` and `ceremony:` fields at root level;
6. prints the active bindings in diagnostic output;
7. fails visibly when a required binding is absent or invalid.

Configuration may rename a role. It may not weaken a MUST from the
[canonical specification](../index.md).

Return to [Enforcement tiers](../index.md#102-enforcement-tiers).
