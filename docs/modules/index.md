---
type: Atomik Index
title: Module notes — what each area owns
description: The directory map of module notes, the area map cairn-check uses to route a source change to its note, and the same-work-unit rule that keeps them true.
tags: [modules, index, contracts, areas, okf]
timestamp: 2026-08-24T00:00:00Z
---

# Module notes

A module note states CONTRACTS for someone who already knows the stack: what an
area owns, what it must not own, its public surface, data flow, failure modes and
tests. The beginner-first layer is next door in [`../learning/`](../learning/index.md),
which teaches the technologies themselves; the template is in
[bedrock 24](../bedrock/24_24-doc-templates.md#module-learning-note).

## Notes

- **[atomik-desktop](./atomik-desktop.md)** — the root note: cross-cutting contracts
  plus the area table below. It was ONE 1,689-line note until CP-OPS-001 S02, which
  made it a guaranteed merge conflict for every concurrent path.
- **[shell](./atomik-desktop-shell.md)** — Electron shell, window and security
  posture, the IPC contract surface, the workspace pane tree, the Dev Docs tab and
  the smoke hook.
- **[vault](./atomik-desktop-vault.md)** — vault IO, lexical search, project
  bundles, the note trees and their fold state, and link-click routing.
- **[ai](./atomik-desktop-ai.md)** — the AI patch loop and its real engines, the
  chat pane, the ActionTrace ledger, mechanical truth labels and URL provenance.
- **[editor](./atomik-desktop-editor.md)** — the CodeMirror editor pane, optimistic
  saves and live preview.
- **[sources](./atomik-desktop-sources.md)** — capture, image, transcription and OCR
  seats, PDF import/viewer/anchors, and the web tab, reader and import.
- **[graph](./atomik-desktop-graph.md)** — the nodes/edges index consumers: the
  relations strip, note titles as the graph reads them, and source bundles as graph
  nodes.

This list and the area table inside the root note describe the same six areas from
two angles — the directory map here, the module's own decomposition there. Adding an
area changes both, in one work unit.

## The area map is code

`cairn-check` routes a changed source file to its area note with `AREA_MAP` in
[`tools/cairn-check.mjs`](../../tools/cairn-check.mjs), first pattern wins, falling
back to `shell`:

```text
apps/desktop/renderer/src/editor/ …                  -> editor
apps/desktop/electron-main/(capture|pdf|web|ocr…)    -> sources
apps/desktop/electron-main/(ai-|generation|truth…)   -> ai
apps/desktop/(shared/retrieval-core|electron-main/vault…) -> vault
everything else under apps/desktop/                  -> shell
```

Two rules keep these notes from becoming fiction:

- **blocking `same-work-unit`** — source under `apps/` changed with no module note
  and no coding path in the same change fails the build. Undocumented code is wrong
  in the repository, which is the test a rule must pass to block.
- **advisory `area-note`** — the precise area note went untouched while its own
  source changed. Advisory because the map is a judgment call, and a false blocking
  verdict costs more than a missed one.
