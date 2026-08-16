---
type: Atomik Coding Path
title: Daily workbench feedback — flat assistant turns, quick untitled notes, page-title web tabs, distinct web-source pills (labelled)
description: Resolves the first low-coupling slice of the owner's heterogenous backlog feedback by making chat read like a modern AI conversation, adding a real quick-note flow with one-time first-heading rename, using captured page metadata for web-tab identity, and visually distinguishing durable web sources from raw external links.
tags: [coding-path, feedback, chat, notes, web, metadata, links, ui]
timestamp: 2026-08-16T00:00:00Z
atomik:
  id: CP-FEEDBACK
  status: running
  current_step: S01
  base_commit: b32df20
  branch: path/cp-feedback
  writes:
    - apps/desktop/renderer/src/ai/ChatView.tsx
    - apps/desktop/renderer/src/NewTabChooser.tsx
    - apps/desktop/renderer/src/Workspace.tsx
    - apps/desktop/renderer/src/editor/
    - apps/desktop/renderer/src/vault/
    - apps/desktop/renderer/src/web/WebView.tsx
    - apps/desktop/renderer/src/workspace/
    - apps/desktop/renderer/src/styles.css
    - apps/desktop/shared/graph-core.ts
    - apps/desktop/shared/note-markdown.ts
    - apps/desktop/tests/chat-run.test.ts
    - apps/desktop/tests/file-manage.test.ts
    - apps/desktop/tests/graph-core.test.ts
    - apps/desktop/tests/link-pills.test.ts
    - apps/desktop/tests/live-preview.test.ts
    - apps/desktop/tests/web-view.test.ts
    - apps/desktop/tests/workspace-model.test.ts
    - docs/modules/atomik-desktop-ai.md
    - docs/modules/atomik-desktop-editor.md
    - docs/modules/atomik-desktop-graph.md
    - docs/modules/atomik-desktop-shell.md
    - docs/modules/atomik-desktop-sources.md
    - docs/modules/atomik-desktop-vault.md
    - atomik-project/coding-paths/CP-FEEDBACK.md
    - atomik-project/sessions/
    - atomik-project/audits/
    - atomik-project/log/
---

# Goal

Turn four concrete pieces of daily workbench friction into small, tested
contracts without smuggling the larger language, docking, or PDF designs into
this path:

1. Assistant chat turns are flat, full-width, and left aligned; user turns
   retain a compact right-aligned bubble. Conversation updates expose an
   accessible log and turn actions remain discoverable by focus as well as
   hover.
2. A quick-note action creates a real, collision-safe blank Markdown file near
   the user's current note context. Its provisional `Untitled` filename adopts
   the first non-empty H1 once, through the existing safe file-management
   transaction; subsequent heading edits do not continually rename the file.
3. A web tab and its in-pane header use the page title reported by the isolated
   web surface, with hostname and URL fallbacks, and preserve the URL as
   secondary/tooltip information.
4. A durable captured web source and a raw external HTTP link no longer share
   one pill kind. The graph classifier and editor decoration expose a distinct
   `web-source` treatment while keeping their navigation behavior explicit.

The exact accepted contracts and the split from the remaining owner feedback
are recorded in
`atomik-project/sessions/2026-08-16-cp-feedback-opening-check.md`.

# Definition of done

- Assistant messages have no enclosing bubble/card, occupy the readable chat
  column from the left edge, and keep controls keyboard reachable; user
  messages remain visually distinct and right aligned.
- The message stream uses suitable live-region/log semantics without causing
  every token in a streamed response to become a disruptive announcement.
- Quick New Note is available outside the tree-only creation flow and creates
  an actual `.md` file using the current note's parent, current project, or
  vault root as deterministic fallback order.
- Quick-note names are collision safe (`Untitled.md`, `Untitled 2.md`, ...),
  sanitize the first H1 through the existing file rules, and perform at most
  one automatic rename for the note's lifetime/session contract.
- Web tabs update from trusted page-title metadata, persist that title in the
  workspace state already owned by the renderer, and fall back cleanly when a
  page omits or clears its title.
- Raw `https://…` links and imported `sources/web/…` links render with distinct
  semantic kinds, labels, and accessible cues; both light and dark themes meet
  the design-system floors.
- Focused regression tests cover each behavior; module notes and this ledger
  change in the same step as their implementation.
- `npm run cairn-check`, `npm run typecheck`, `npm test`, and `npm run build`
  pass bare on the branch rebased onto the latest local `master`.
- Owner bench acceptance, closing ceremony, coherence audit, per-entry journal,
  `status: done`, and self-merge complete per the Cairn protocol.

# Documentation coverage

## Required

- 03-workspace-and-tabs — tab identity, persistence, activation, and pane state
- 04-file-first-data-model — the new note is a normal Markdown file, never
  hidden application state
- 09-web-source-strategy — isolated navigation metadata and the difference
  between a live URL and a durable captured source
- 11-markdown-page — heading/title behavior and editor-visible link semantics
- 12-electron — web-surface title events and renderer-owned workspace state
- 13-electron-security — narrow, validated web metadata; no widened renderer
  authority
- 15-maintainability — small seams and tested pure helpers over component-local
  policy
- 20-relations-and-graph-future + ADR-011 — one canonical link classifier and
  additive semantic pill kinds
- 27-git-compatibility — automatic note rename uses the existing transactional
  relocation/refactor boundary
- 36-ui-design-system — chat geometry, tokens, focus visibility, responsive
  behavior, and accessibility floors
- 17-self-evolving-docs · 22-agent-handoff · 24-doc-templates ·
  35-coding-path-execution-state · coding-paths/paths.md — standing execution
  law

## Conditional

- 06-ai-patch-pipeline — only if chat presentation changes cross proposal or
  patch behavior
- 14-app-kernels — only if a pure helper changes kernel ownership
- 28-truth-evidence-model — only if the new source kind changes evidence
  semantics rather than presentation/classification
- 00-orientation + 01-workbench-first — re-read if a step appears to bend the
  constitution

## Deliberately excluded

- Language-note versioning and translation — accepted for a dedicated
  `CP-LANGUAGE-NOTES` path because it requires a durable file/frontmatter ADR
- Open-target menus, shortcuts, and tab/pane docking DnD — accepted for
  `CP-OPEN-DOCK`; it must reconcile the existing DnD brainstorm and keyboard
  equivalents as one interaction system
- Continuous PDF reading and durable highlight anchors — accepted for
  `CP-PDF-READER`; its anchor schema and renderer choice require their own
  evaluation and migration plan
- AI retrieval, graph ranking, provider adapters, and settings — owned by the
  already-running CP-MVP-010 and CP-PROVIDERS paths

# Execution

- [ ] S01 Bootstrap + regression pins: create the isolated worktree, read every
      Required document, verify the pinned trunk behavior, record overlap
      boundaries with CP-MVP-010 and CP-PROVIDERS, and run the baseline gates.
- [ ] S02 Flat assistant chat turns: add focused layout/accessibility regression
      coverage, implement the assistant/user geometry and focus-visible action
      behavior, update AI/UI module knowledge, and checkpoint the ledger.
- [ ] S03 Quick untitled note: pin placement, collision, heading extraction,
      sanitization, and one-time rename cases; implement the quick action using
      existing vault write/relocate transactions; update vault/editor/shell
      notes and checkpoint the ledger.
- [ ] S04 Metadata-led web identity: pin title/fallback/persistence cases,
      connect isolated page-title metadata to tab and header identity, update
      source/shell notes, and checkpoint the ledger.
- [ ] S05 Distinct web-source pills: extend the canonical link kind and editor
      decoration with focused graph/live-preview tests, update graph/editor
      notes, and checkpoint the ledger.
- [ ] S06 Integrated bench + closure: run responsive, keyboard, theme, reload,
      and navigation benches; complete owner acceptance and closing ceremony;
      rebase, run bare gates, produce the coherence audit and journal entry,
      mark the path done, and self-merge.

# Current checkpoint

```text
base commit : b32df20
changed     : path file + 2026-08-16 opening-check session record
tests       : not run for this path yet
next action : activate path/cp-feedback in its own worktree and execute S01
blockers    : none; declared source overlaps require early rebase checks, not ownership locks
```

# Blockers

None recorded.
