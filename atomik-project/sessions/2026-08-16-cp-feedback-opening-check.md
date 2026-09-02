---
type: Atomik Session Record
title: CP-FEEDBACK opening check — heterogenous workbench feedback contracts and path split confirmed
timestamp: 2026-08-16T00:00:00Z
path: CP-FEEDBACK
branch: path/cp-feedback
ceremony: opening
---

# CP-FEEDBACK opening check (2026-08-16)

Run per `docs/bedrock/22_22-agent-handoff.md` §Between paths and
`atomik-project/coding-paths/paths.md` §Opening a path. The owner requested a
coding path for eight pieces of heterogenous backlog feedback. We inspected the
current implementation and then reviewed each proposed contract before
activation.

Owner acceptance, verbatim: **“i confirm”**.

## Confirmed contracts

1. **AI chat presentation** — user turns remain compact, contained, and right
   aligned. Assistant turns lose the chat bubble/card, span the readable
   conversation width from the left, and expose turn actions on hover and
   keyboard focus. The stream uses accessible chat-log semantics.
2. **Language variants and quick translation** — translated notes are durable
   sibling Markdown variants (provisional example: `topic.fr.md`) with explicit
   language, source identity, and source-revision metadata. A language switcher
   and quick Translate action produce a previewed patch; translations do not
   silently overwrite or continuously synchronize. Final naming/frontmatter
   requires an ADR in its own path.
3. **Quick blank note** — a global/contextual quick action creates a real,
   collision-safe `Untitled.md` next to the active note, then current project,
   then vault root. Its first non-empty H1 becomes the filename once through the
   safe file-management transaction; later heading changes do not keep renaming
   it.
4. **Web metadata identity** — page-title metadata drives the web tab label and
   in-pane header, with hostname/URL fallback and the full URL retained as
   secondary or tooltip information.
5. **Web source versus web link** — a captured durable source under
   `sources/web/` receives a distinct `web-source` pill treatment from a raw
   `http(s)` destination; appearance and accessible text convey the difference
   without changing truth semantics.
6. **Open-target interaction** — one contextual opening model exposes current
   tab, new tab, new pane right, and new pane below, with discoverable keyboard
   and pointer shortcuts. This is designed with docking rather than accumulated
   as one-off menus.
7. **Tab and pane drag/dock** — native drag-and-drop gains a visible five-zone
   docking preview (center/current target plus edge splits), tab reorder/move,
   cancellation/invalid-drop behavior, and equivalent keyboard commands.
8. **PDF reader and anchors** — replace the one-page fit-width surface with a
   real continuous reader including thumbnails/search/zoom, and persist durable
   highlight anchors with page, quoted text, and geometric coordinates while
   retaining a human-readable source-note representation and explicit removal
   lifecycle.

The chat interaction reference used for the proposal was the flat AI-message
pattern: assistant output is visually uncontained/full width while user output
remains contained. The accessibility reference was the WAI-ARIA chat-log
pattern; implementation still needs to avoid noisy per-token announcements.

## Scope decision

The owner confirmed the recommended decomposition rather than one high-risk
eight-feature lane:

- **CP-FEEDBACK (activate now):** contracts 1, 3, 4, and 5 — chat presentation,
  quick note, web metadata identity, and distinct web-source pills.
- **CP-LANGUAGE-NOTES (carried, not yet activated):** contract 2, including its
  file/frontmatter ADR and translation preview workflow.
- **CP-OPEN-DOCK (carried, not yet activated):** contracts 6 and 7 as one
  opening/docking interaction model, reconciled with the existing native-DnD
  brainstorm.
- **CP-PDF-READER (carried, not yet activated):** contract 8, including renderer
  evaluation, durable coordinate-anchor schema, and migration.

Only CP-FEEDBACK receives a running path file now. Carried labels are confirmed
work, not running paths, and must each repeat the short opening ceremony when
activated so any new trunk evidence can refine their execution plan.

## Current implementation pins

- Assistant turns currently use the same `.chat-turn` card geometry as other
  turns and are centered inside the assistant container.
- The New Tab chooser's blank-note route currently selects a vault view without
  creating a Markdown file; only the tree panel exposes actual creation.
- Web workspace state already has a `title` field, but the web view persists
  only URL changes and tab labels are derived from hostname.
- Canonical link classification currently maps both raw HTTP URLs and
  `sources/web/` paths to the same `web` kind.
- The PDF surface is currently one page at fit width; selection anchors retain
  page and quote but no durable rendered geometry.

## Overlap check

- CP-MVP-010 may touch chat, editor, vault, graph, and shared renderer surfaces
  for retrieval. CP-FEEDBACK will rebase at step boundaries and keep its changes
  presentation/workflow-specific.
- CP-PROVIDERS currently touches AI/settings styling. CP-FEEDBACK declares
  `styles.css`, avoids its settings components, and will reconcile token-level
  additions during rebase.
- `writes:` entries are advisory signals, not locks. Any newly discovered root
  cause is recorded in the path ledger before widening.

## State

Opening check accepted. `CP-FEEDBACK` is ready for activation on branch
`path/cp-feedback` in its dedicated worktree.
