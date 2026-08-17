---
type: Atomik Module Note
title: 'Module: atomik-desktop — editor'
description: The CodeMirror editor pane, optimistic saves and live preview.
tags: [module, editor, codemirror, live-preview]
timestamp: 2026-08-17T00:00:00Z
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

## Rich Markdown architecture pin (CP-RICH-MARKDOWN S01)

- ADR-014 keeps `noteMarkdown()` synchronous. Pure Markdown-it discovery emits
  escaped inert placeholders; one post-mount registry hydrates them through
  local dynamic imports. Existing read/chat/AI-preview callers do not become
  async, and every heavy runtime must remain outside the renderer entry chunk.
- The registry owns one lifecycle for DOM read surfaces and live CodeMirror
  block widgets: normalized alias, theme, limits, `AbortSignal`, monotonic
  stale-result suppression, accessible loading/error/source fallback, and a
  mandatory `dispose()`. Adapters receive no vault bridge, write callback,
  generic fetch, or provider context.
- Initial adapters are KaTeX (`$`, `$$`, `math`/`latex`/`tex`/`katex`), Mermaid,
  and inline-data-only Vega-Lite. Unknown fences remain ordinary code. These
  are third-party projections, never the reserved Atomik Scene IR/studio.
- CodeMirror language-data replaces the six-language switch lazily; read mode
  uses fine-grained Shiki packages with its JavaScript regex engine. The full
  Shiki bundles, Oniguruma Wasm, and Twoslash are excluded.
- Code feedback is diagnostics-as-decoration only: relative fence ranges map
  back to raw note offsets, with squiggle, severity, count, source-mode gutter,
  and accessible message. No diagnostic action and no LSP process, transport,
  completion, hover protocol, navigation, refactor, or formatting capability.
- S01's dated dependency/security/performance evidence is
  `atomik-project/sessions/2026-08-17-cp-rich-markdown-s01-baseline.md`.
  The production baseline is 2,329,498 B entry JS / 123,707 B CSS; a no-rich
  note must stay within 10% of the pinned read/parse/live medians.

S02 implements that host in `renderer/src/editor/rich-markdown/`:

- `syntax.ts` is the pure alias/dollar-ambiguity seam;
  `markdown-plugin.ts` emits escaped placeholders and calls Markdown-it's
  saved fence renderer unchanged for unknown languages.
- `registry.ts` caches kind-checked lazy loaders and drops a failed load for an
  explicit retry. The built-in map is intentionally empty until S03; source +
  an unavailable diagnostic is a complete safe state.
- `hydration.ts` owns the 128-block cap, pre-import source cap, total 3 s
  deadline, detached-generation isolation, 2 MiB output cap, text-only errors,
  `AbortSignal`, late-handle cleanup, and idempotent teardown.
- `RichMarkdownBody.tsx` puts that lifecycle behind one React effect. Vault,
  project, source-dossier, chat, AI note preview, and inline-AI output all use
  the same hydrator; no surface owns a renderer library.
- Exact packages are locked but remain unimported. S02 build inspection:
  entry JS 2,345,119 B (+15,621 B / +0.67% from S01), CSS unchanged at
  123,707 B, no heavy rich-runtime chunk. The post-lock four-high npm audit is
  identical to the pre-rich trunk (existing PDF.js and Vite/Electron tooling),
  so S02 introduced no advisory delta.
- Focused contracts live in `tests/rich-markdown.test.ts` and
  `tests/note-markdown.test.ts`; beginner walkthrough:
  `docs/learning/24-rich-markdown-projection-registry.md`.

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

## Chat citation decoration (CP-MVP-010 S08/S10i/S10j)

- `renderer/src/editor/citation-chips.ts` is the DOM half of chat
  citations. It decorates rendered `[1]` markers without rewriting the
  answer's Markdown, skips code and existing links, and leaves unresolved
  numbers visible.
- Ordinary sentence choice stays in the pure shared helper
  `citedSentenceRange`; a marker that closes a blockquote instead uses
  `citedQuotedPassageRange`, because the evidence unit is the complete
  quoted passage even when it has several sentences. A marker followed
  by more quoted prose remains sentence-local. The DOM half supplies the
  innermost Markdown block, groups markers with the same range, wraps
  that range once, and then turns its resolved markers into clickable
  chips. This keeps decimals such as `€77.5`, abbreviations, terminal
  punctuation, quoted passages, and multiple markers unit-testable; the
  existing LinkeDOM dependency now also pins the range-selection half.
