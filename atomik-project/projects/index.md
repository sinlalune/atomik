---
type: Atomik Index
title: Project bundles inside this plane
description: The project bundles that live in the Atomik plane itself — today, one bundle created by the app while dogfooding it.
tags: [projects, bundle, okf, index]
timestamp: 2026-08-24T00:00:00Z
---

# Projects

Project bundles created *inside* this plane, as opposed to the ones a user creates
in their own vault. A bundle is a folder with a
`project.atomik-project.json` manifest, an `index.md` and a `log.md` — the same
OKF shape this whole repository follows
([ADR-001](../../docs/adr/ADR-001-file-first-okf-project-bundles.md),
[bedrock 04](../../docs/bedrock/04_04-file-first-model.md)).

- [test/](./test/index.md) — created by the app itself on 2026-07-06 (CP-MVP-001
  S06), when project bundles first became real. Kept as the dogfooded instance:
  it is what the software produces, not what a document says it should produce.

Nothing else belongs here. Execution state lives in
[`../coding-paths/`](../coding-paths/ACTIVE.md), knowledge in `docs/`.
