---
type: Atomik Module Note
title: 'Module: atomik-desktop — editor'
description: The CodeMirror editor pane, optimistic saves and live preview.
tags: [module, editor, codemirror, live-preview]
timestamp: 2026-08-14T00:00:00Z
---

# Module: atomik-desktop — editor

> AREA NOTE of [Module: atomik-desktop](./atomik-desktop.md), split out at
> CP-OPS-001 S02 so concurrent lanes append to different files instead of
> colliding in one 1689-line note. The root note keeps what is cross-cutting
> (public contracts, data flow, alternatives, common mistakes, tests, agent
> checklist, dependency facts); this note keeps what THIS AREA owns.

## What it owns

- The editor (S07 + MVP-001 feedback): `renderer/src/editor/EditorPane.tsx`
  — CodeMirror 6 over the RAW note (frontmatter included, no template, no
  normalization; 11/27) with optimistic conflict detection: saves carry
  the mtime from the last read; `writeNote` refuses stale writes with a
  'conflict' error and returns the new mtime, chaining save after save.
  Save policy is AUTO by default (owner feedback): debounced 800 ms after
  typing pauses, flush when the editor unmounts (note switch/tab close),
  save-then-switch on Read — no discard prompts; the button + Mod-s stay.
  'manual' (note-bar toggle, app-wide `saveMode` workspace setting —
  the settings map also carries `theme`: system/light/dark + five soft
  pastels, picked from the top-row selector next to the window controls;
  `<html data-theme>` + color-scheme drive every light-dark() token and
  the editor's oneDark follows through a compartment)
  restores strict S07 behavior with its confirm guards. Auto-save NEVER
  forces: a conflict pauses it until the banner is resolved by a human.
  Note modes are read / live / source (`mode` param per tab; retired
  'edit' maps to source via `noteModeOf`). LIVE is the default: the
  seamless Obsidian-like surface — `editor/live-preview.ts` decorates
  the raw buffer from the syntax tree (headings sized, marks hidden,
  links collapsed, bullets, quote/fence lines; leading frontmatter
  styled as one dim unit with markdown suppressed inside), and any line
  the selection touches reveals its full syntax. Blocks render too
  (follow-up feedback): fenced code nests real language highlighting
  (js/ts/jsx/tsx/html/css packs; others plain), task markers become
  clickable checkboxes that write back through ordinary transactions
  (dirty/auto-save/undo apply; checked items struck), horizontal rules
  draw as rules, tables style mono with dimmed pipes and bold header
  cells. Ctrl/Cmd+click follows internal links (`linkHrefAt`; plain
  click places the cursor; external schemes inert until a vetted
  opener, 13). Live is gutter-free; line numbers/folding/active-line
  are SOURCE chrome (basicSetup retired, extensions composed by hand).
  Pure StateField — unit-tested headless; decoration-only, so 11/27
  byte fidelity is untouched. live<->source reconfigure ONE EditorView
  through a compartment (buffer/undo/selection survive); only the
  switch to read passes the save-first gate. GFM base.
- Foldable AI sampling options (`editor/gen-options.tsx`): model selector grouping
  models by provider from `PROVIDER_CATALOG` with input/output token pricing, temperature,
  top_p, and maxTokens bounds.
- One EditorView per mounted pane, keyed by note path; view lives in a
  ref (mount-only).
- CP-FEEDBACK S03 keeps quick-note naming outside CodeMirror: the editor
  still performs one ordinary optimistic save and reports its successful
  bytes through the existing `onSaved` callback. VaultView/ProjectView add a
  narrow host notification only for the provisional tab lifecycle; Workspace
  decides whether the first H1 names the file. A failed/conflicting save can
  never trigger a rename, and the editor gains no filesystem authority.

## Web-link pill identity (CP-FEEDBACK S05)

- Read and live still ask the shared `graph-core` classifier; neither surface
  guesses from its own markup. Raw `http(s)` links render as `web`, while links
  resolved under `sources/web/` render as the additive `web-source` kind.
- The common pill recipe now gives a capture a saved-document icon and its own
  light/dark token instead of the external globe/blue treatment. The distinction
  survives wikilink post-resolution as well as ordinary Markdown links.
- `linkKindDescription` is the single wording seam for both modes. Read anchors
  carry `aria-description`; live widgets carry the same description plus a
  type-prefixed hover title: “External web link” versus “Captured web source”.
  Authored link text and navigation targets remain untouched.

## Chat citation decoration (CP-MVP-010 S08/S10i)

- `renderer/src/editor/citation-chips.ts` is the DOM half of chat
  citations. It decorates rendered `[1]` markers without rewriting the
  answer's Markdown, skips code and existing links, and leaves unresolved
  numbers visible.
- Sentence choice stays in the pure shared helper
  `citedSentenceRange`; the DOM half supplies one Markdown block at a
  time, groups markers with the same range, wraps that range once, and
  then turns its resolved markers into clickable chips. This split keeps
  decimals such as `€77.5`, abbreviations, terminal punctuation, quotes,
  and multiple markers unit-testable without adding a DOM-test runtime.
