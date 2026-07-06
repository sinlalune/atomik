# ADR-003: Git compatibility contract

Status: accepted
Date: 2026-06-17

## Context

Atomik's file-first philosophy implies that users should be able to version their vaults and project bundles with ordinary Git tooling. AI patch review also becomes safer when every accepted change produces a meaningful diff.

## Decision

Atomik is Git-compatible, not Git-dependent.

Canonical knowledge should live in stable, human-readable, diffable files. Rebuildable state such as caches, indexes, embeddings, thumbnails, and temporary files should be ignored. Binary originals may be committed directly, stored in Git LFS, or kept local with metadata-only/source-dossier references.

## Consequences

- Opening Atomik must not rewrite files unnecessarily.
- Accepted AI operations should produce clear human-reviewable diffs.
- When an operation changes epistemic status, the claim, evidence references, verification metadata, and prose repair should remain reviewable rather than disappearing into a cache.
- Project folders can use branches, history, rollback, and collaboration outside Atomik.
- Git UI can be added later, but the file-writing discipline is required from the beginning.

## Alternatives considered

- Git as mandatory backend: too restrictive and not needed for local-first MVP.
- No Git consideration until later: risks noisy file formats and hidden state that are hard to fix.

## Migration / rollback

Git integration can remain optional. The core requirement is deterministic, readable file output and default ignore templates.

## Links

- `27_27-git-compatibility.md`
- `06_06-ai-patch-pipeline.md`
- `14_14-app-kernels.md`
- `ADR-004-claim-level-truth-evidence.md`
