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
  explicit retry. S02 proved an empty built-in map as a complete safe state;
  S03 adds only the static dynamic-import target for KaTeX.
- `hydration.ts` owns the 128-block cap, pre-import source cap, total 3 s
  deadline, detached-generation isolation, 2 MiB output cap, text-only errors,
  `AbortSignal`, late-handle cleanup, and idempotent teardown.
- `RichMarkdownBody.tsx` puts that lifecycle behind one React effect. Vault,
  project, source-dossier, chat, AI note preview, and inline-AI output all use
  the same hydrator; no surface owns a renderer library.
- Exact packages are locked but remain unimported. On the mandatory
  CP-MVP-010 rebase, S02 build inspection measured 2,373,425 B entry JS versus
  2,358,560 B on the same trunk (+14,865 B / +0.63%), byte-identical 132,917 B
  CSS, and no heavy rich-runtime chunk. The post-lock four-high npm audit is
  identical to the pre-rich trunk (existing PDF.js and Vite/Electron tooling),
  so S02 introduced no advisory delta.
- Focused contracts live in `tests/rich-markdown.test.ts` and
  `tests/note-markdown.test.ts`; beginner walkthrough:
  `docs/learning/24-rich-markdown-projection-registry.md`.

S03 connects safe math without changing the canonical editor buffer:

- `adapters/katex.ts` renders HTML+MathML locally with `trust: false`,
  `globalGroup: false`, thrown parse errors, the ADR expansion/size limits,
  and a fresh null-prototype macro table per expression. KaTeX 0.16's
  `hasOwnProperty` expectation is met by one non-enumerable own method; macro
  definitions still cannot cross expressions.
- Read surfaces hydrate the existing escaped `$…$`, `$$…$$`, and
  `math`/`latex`/`tex`/`katex` fence placeholders. Parse/limit failures restore
  source and a text-only status; untrusted resource commands create no anchor,
  image, or external request.
- Live mode combines the Lezer-owned code ranges with pure dollar discovery,
  then uses CodeMirror replacement widgets only away from the selected lines.
  Touch/click reveals raw source; link/math containment has deterministic
  precedence; the 129th block stays raw beside one accessible limit status.
  App theme is a facet, so a theme compartment reconfigure disposes/rebuilds
  widgets rather than keeping stale output.
- S03 build inspection: the no-math entry is 2,382,051 B (+8,626 B from S02)
  and global CSS 134,861 B (+1,944 B). KaTeX remains a separate 485,408 B JS +
  28,946 B CSS chunk; 59 local font assets total 1,072,948 B. No Mermaid,
  Vega-Lite, or Shiki runtime entered the eager bundle.
- Focused proof is 72 assertions across note rendering, registry/hydration,
  KaTeX security/accessibility/limits, and live source-range parity.

S04 connects Mermaid without granting a diagram file, IPC, binding, or network
authority:

- `adapters/mermaid.ts` is the only static Mermaid import and remains behind
  the registry's `import()` target. `mermaid-core.ts` is separately testable
  with a fake runtime: it rejects note config, clicks/links, images, URL/CSS
  resources, and source/character/edge floods before render; repeats immutable
  strict/HTML-label/deterministic-ID/200-edge policy in Mermaid's secure site
  config; and maps Atomik light/dark tokens across the main Mermaid diagram
  families.
- Mermaid's site config is process-global. One adapter queue encloses each
  config + render pair, so concurrent notes cannot exchange theme variables or
  deterministic seeds. Rendering uses an off-screen non-interactive staging
  node, never calls `bindFunctions`, checks abort before publication, and
  removes staging immediately on cancellation and in `finally`.
- `adapters/safe-svg.ts` parses returned SVG, rejects foreign/scriptable/
  resource content and active CSS, strips event/navigation attributes,
  namespaces IDs per hydration generation, rewrites only grammatical fragment
  references (without mistaking colors such as `#fff` for IDs), adds/preserves
  title and description, then imports a DOM node. Mermaid's raw string is never
  assigned to the note surface. This guard is the S05 Vega postflight seam.
- Read mode uses the existing escaped `mermaid` fence placeholder. Live mode
  generalizes the S03 math widget: a Mermaid fence projects through the same
  hydrator only away from touched lines, reveals exact source on click/touch,
  rebuilds on theme change, and shares the 128-block cap with math. Source mode
  remains raw.
- S04 build inspection measures 2,383,165 B eager entry (+1,114 B from S03),
  135,772 B global CSS (+911 B), a separate 1,097,914 B Mermaid core, and a
  102,800 B lazy flowchart definition. The pinned package's own headless smoke
  returned `flowchart-v2` SVG with no `foreignObject` or external href; focused
  proof is 83 assertions across note, live, lifecycle, SVG security, config
  isolation, cancellation, theme, limits, IDs, and accessibility.

S05 connects inline-data-only Vega-Lite without granting a chart network,
file, image, embedding-control, or canonical-write capability:

- `adapters/vega-lite-core.ts` parses one JSON object and applies hard
  256 KiB / depth-32 / 50,000-property / 5,000-row / 100,000-cell ceilings.
  It admits structured `data.values` and named top-level inline `datasets`,
  while rejecting URL/generated/missing data, nested datasets, encoded text,
  image marks, href/url channels, loaders, patches, actions/exports, and bound
  controls before a heavy module loads. Record fields with capability-shaped
  names remain ordinary record data.
- The registry imports a lightweight adapter first. Only a successful
  preflight crosses the adapter's second dynamic boundary into pinned
  `vega-lite` 6.4.3 and `vega` 6.4.0. The adapter compiles without
  `vega-embed`, creates a headless SVG View with all loader methods denied and
  hover off, and finalizes on success, error, cancellation, replacement, and
  unmount. It publishes only a node accepted by `safe-svg.ts`.
- Light/dark app tokens own chart background, axes, labels, legends, marks,
  and categorical defaults. Read and live use the same adapter; a live chart
  replaces only an untouched `vega-lite`/`vegalite`/`vl` fence, reveals exact
  source on touch/click, and shares the 128-block cap with math and Mermaid.
- S05 build inspection measures 2,383,608 B eager entry (+443 B from S04) and
  136,043 B CSS (+271 B). The 15,357 B policy adapter, 618,083 B Vega-Lite
  compiler, and 940,911 B Vega runtime are separate lazy chunks. The pinned
  runtime bar smoke emitted 7,614 B of static SVG with no image or external
  href; focused proof is 92 assertions across note, live, real/fake runtime,
  admission, budgets, loader denial, lifecycle, theme, SVG, and accessibility.

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
