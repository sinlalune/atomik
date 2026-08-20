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
  (follow-up feedback): fenced code nests exact, lazy language-data
  highlighting (unknowns remain plain), task markers become
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
  inline-data-only Vega-Lite, and ordinary fenced code. Unknown languages stay
  escaped/plain inside shared code chrome. These are third-party projections,
  never the reserved Atomik Scene IR/studio.
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
  `markdown-plugin.ts` emits escaped placeholders. Since S06 every ordinary
  fence selects `code`; unknown languages still render exact plain source.
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

S06 connects rich fenced code and passive parser feedback without adding an
LSP client or changing note bytes:

- `code-languages.ts` replaces the six fixed nested grammars with the pinned
  `@codemirror/language-data` catalog. Its synchronous resolver matches exact
  names/aliases/extensions with fuzzy matching disabled; each description
  loads its grammar on demand and unknown/misspelled names remain plain. The
  now-unused direct CSS/HTML/JavaScript language dependencies leave the app
  manifest; the catalog still owns those same packages transitively.
- Untouched live and read fences use the shared `code` placeholder/adapter;
  touching a live fence restores raw nested CodeMirror. `code.ts` reviews 37
  Shiki languages and imports their subpaths explicitly. One cached highlighter
  uses fine-grained core, the JavaScript regex engine, and explicit light/dark
  themes; no full/web Shiki bundle, Wasm, Twoslash, or unknown grammar load.
- `code-core.ts` reconstructs token spans only from authored source slices via
  `textContent`; it accepts hex colors plus documented font bits, never Shiki
  HTML. Its token-based responsive header reports language/problems and offers
  native Copy, source/highlight, wrap, and expand/collapse buttons. Copy closes
  over authored source, so generated chrome cannot enter the clipboard.
- `code-diagnostics.ts` converts bounded local Lezer error nodes to relative
  `RichDiagnostic` ranges, then maps them to note offsets. Source mode lazily
  installs `@codemirror/lint` squiggles, gutter markers, messages, and keymap;
  live stays gutter-free and uses the block count/details. The 64-block and
  200-document caps report their omission. Every LSP-shaped capability besides
  passive diagnostics is pinned false and diagnostics have no actions.
- S06 build inspection measures 2,454,528 B eager entry (+70,920 B from S05,
  +125,030 B from S01), 140,228 B CSS (+4,185 B), a 23,033 B lazy code adapter,
  and a 35,017 B lazy diagnostics chunk. Shiki core (226,275 B), JS engine
  (111,669 B), themes (14,198/14,475 B), and grammar chunks remain on demand;
  28,570 B of the path's 150 KiB eager ceiling remains.

## Renderer environment: colors, CSP, dark-ness (CP-RICH-MARKDOWN S07)

The first owner bench of this path (2026-08-17) ran S01–S06 in the real app and
found Mermaid and Vega-Lite both dead while every gate was green. ADR-014 §8
carries the decisions; the operational shape:

- `adapters/css-color.ts` is the ONLY place a renderer turns an app token into
  a color. `createColorResolver(host)` resolves through a hidden probe inside
  the render host — not the document root, which would use the wrong theme
  inside a themed subtree — and returns `rgb()`; `toHexColor` narrows that for
  Vega, whose palette mixes with integer arithmetic over hex pairs. An adapter
  reading `getPropertyValue('--token')` itself is a defect: the design system's
  `light-dark()`/`color-mix()` values come back unresolved, which Mermaid
  rejects loudly and Vega ignores silently.
- `adapters/vega-lite.ts` parses with `{ ast: true }` and evaluates with
  `vega-interpreter`. Vega's default path compiles expressions through
  `Function(...)`, which `script-src 'self'` refuses (13). Never relax the CSP
  to make a chart work.
- `rich-markdown/theme.ts` owns dark-ness for BOTH the rich renderers and
  `EditorPane`'s CodeMirror theme. Five themes declare `color-scheme: dark`
  (`dark`, `moss`, `biolum`, `ember`, `hearth`); the two that used to be
  missing rendered code dark-on-dark. `dark-themes-match-stylesheet` parses
  `styles.css` and fails on drift, so a new theme cannot reintroduce it.
- `editor/clipboard.ts` is the renderer's ONE clipboard. Its `doc` parameter
  exists so document-owning surfaces (the code frame) reuse it instead of
  writing a second copy. The async clipboard API is PRESENT in this Electron
  renderer and REJECTS; the code frame's own implementation fell back to
  `execCommand` only when the API was absent, so every Copy reported "Copy
  failed" (owner bench 2026-08-17). Falling back on rejection is the case that
  actually happens.
- Block spacing is SOURCE-TRUE in both modes. Read has done this since S05o
  (`md-tight` for no blank line, N gaps for N blank lines); live carried a
  fixed `padding-block` on `.lp-rich-widget--display`, so two adjacent fences
  touched in read and floated apart in live (owner bench 2026-08-17). Blank
  lines are real lines in live and render their own height, so any fixed
  padding there can only disagree with the source. Pinned by
  `read/live spacing parity` against `styles.css`.
- `npm --workspace atomik-desktop run smoke:rich` is the mechanical guard.
  `apps/desktop/tools/rich-smoke.mjs` seeds a temp vault + `local-workspace.json`
  and launches the real app; `runRichSmoke` in `electron-main/index.ts` asserts
  each adapter drew its real shape (`svg`, `.katex`, `.rich-code-token`), that
  no CSS-level color survived, and that no `img`/`script` node was created.
  Wait on the SHAPE, never on the output element — an empty render host
  satisfies the latter. Validated by reverting both adapter fixes and watching
  it reproduce the owner's error strings.
- Two repeatable benches ship with the renderers.
  `npm --workspace atomik-desktop run bench:rich` reproduces the S01
  read/parse/walk medians and fails past a +10% ceiling — S01 measured with a
  script it then deleted, which is a baseline that cannot gate anything.
  `smoke:rich` measures first render and repeat render, and asserts teardown
  leaves exactly one projection per block, that caps refuse VISIBLY with source
  intact, that the page never scrolls sideways at 420 px, and the a11y floors
  (toolbar role, native named focusable controls, aria-pressed, MathML, group
  role, focus movement). A real screen-reader pass stays human work.
- Tests run on linkedom: no `getComputedStyle`, no CSP. Both defects passed the
  full suite unchanged before and after the fix until each regression was
  rewritten to install the engine surface the adapter talks to. **Renderer
  coverage is not evidence of rendering** — bench in the real app, early.

## The model is told what the surface can do (CP-AI-CAPABILITIES S01)

- `shared/prompt-composition.ts` gained two ordinary plan blocks:
  `rendering-capabilities` (in BOTH default plans) and `note-conventions` (note
  plan only). They are `BUILTIN_BLOCK_IDS` entries like any other — composed
  through the plan, individually overridable, named in the system-plan UI,
  verbatim in the sent-request inspector. No new prompt mechanism.
- The renderers were hydrated in chat, inline AI and the AI note preview since
  CP-RICH-MARKDOWN S02, but NOTHING told the model they existed. ADR-015 has
  the reasoning; the operational rule is that the refusal half of the block
  earns its tokens as much as the capability half — a model that does not know
  Vega takes inline data only writes a `url` dataset the reader never sees.
- `note-conventions` stays OUT of chat on purpose: authoring a typed edge is a
  note act. Chat may point at a note with a plain `[[wikilink]]` (S02), which
  is a different affordance from citation and must stay visibly so.
- **The block text is pinned to the code**, not maintained by memory.
  `tests/prompt-composition.test.ts` checks every fence identifier against
  `richKindForFence` and every limit against `DEFAULT_RICH_LIMITS`, because a
  wrong number in a prompt fails no build — it teaches the model to write
  blocks the app refuses. Validated by changing a number and watching it fail.
- Cost is measured, not assumed: +262 tokens per chat send, +380 per note
  generation, roughly doubling the system message. A size ceiling is asserted
  in the same test file, so growing it is a decision rather than a drift.
- The legacy `composeSystemPrompt` template and `DEFAULT_SYSTEM_PLAN` must stay
  byte-identical — an existing test pins it. Both change together or neither
  does. Capabilities sit BEFORE `# Rules` so `## Output` stays inside it.

## The diagram block is a canvas (CP-RENDER-REPAIRS S05)

S04 gave a wide diagram its natural size and let the frame scroll. At the bench
the owner said what they had wanted from the start: an infinite canvas inside
the block, with the expand control kept. Pan and zoom were in the path's
Deliberately excluded list, so the list was AMENDED — the exclusion was
written down, so its removal is too.

- `diagram-canvas.ts` holds two numbers and a scale, applied as a CSS
  transform. Nothing re-parses, re-renders or re-sanitizes: the reader is
  panning the same node `safeSvgNode` approved (13).
- **A bare wheel still scrolls the note.** Zoom takes Ctrl or Cmd. A canvas
  that eats the wheel makes a long note unreadable the moment a diagram is in
  the way, and the reader is given no way to understand why. This is the one
  behaviour to protect if the module is ever refactored, and it is pinned by a
  test that asserts `defaultPrevented` is false without a modifier.
- Inside the expand overlay a bare wheel DOES zoom, because no page sits behind
  it to scroll. The difference rides on a data attribute on the viewport, so
  the same canvas follows the diagram into the overlay via `retarget` — the
  node is moved, not copied, so its controller has to move with it.
- Every gesture has a control and a key: −, +, Fit; arrows pan, `+`/`-` zoom,
  `0` fits. The viewport is `role="application"` with a label naming them (36).
- `naturalSize` reads Mermaid's own `viewBox` before reaching for layout, so a
  fit is computable without a rendered box — and returns null rather than
  guessing when neither exists, because a wrong fit is worse than none.
- **The SVG is pinned to its intrinsic size before any transform.** Mermaid
  emits `width="100%"` with `style="max-width: Npx"`, so the ELEMENT fills its
  container while the drawing sits inside it under the viewBox. Centring the
  element therefore centres a full-width box and shoves the drawing sideways,
  which is what the first bench round saw: Fit put a wide diagram in the
  upper-left and a small one hard right. Setting `width`/`height` in pixels and
  `max-width: none` makes the element box and the drawing box the same thing,
  which is what the arithmetic assumed all along. Every one of those inline
  styles is handed back on dispose.
- **Everything the transform depends on is set INLINE.** The second bench
  round still showed the diagram jammed against the right edge, clipped. The
  arithmetic was never wrong: the S04 rule `… [data-rich-render-host] > svg {
  margin-inline: auto }` centres the element on its own, and its selector
  outranks any attribute selector this module can write, so CSS centred the
  element and the transform centred it again. `width`, `height`, `max-width`,
  `margin` and `display` are now written as inline styles, where no stylesheet
  can reach them, and all of them are handed back on dispose. **The lesson is
  general: a JS-driven transform cannot share ownership of layout with a
  stylesheet.**
- Controls are icon + a label revealed on hover and on FOCUS (owner directive,
  S05 bench). The accessible name lives on the button once — the icon is
  decorative, the visible label is `aria-hidden` — so a screen reader hears one
  name rather than the name twice plus a drawing.
- **The canvas is only as tall as its diagram.** `canvasHeight` measures the
  diagram at the scale it will actually be drawn — width decides the scale,
  since the canvas is as wide as its column either way — bounded to
  140–460px. The first cut gave everything 460px and a two-node flowchart sat
  in an acre of emptiness. The overlay is exempt: it fills the pane.
- Charts are deliberately NOT canvases. Pan and zoom are for spatial content;
  a bar chart is not spatial, so vega-lite keeps S04's behaviour.

## Room to look at a diagram (CP-RENDER-REPAIRS S04)

A wide Mermaid diagram arrived in a 560px note column at about a fifth of
legible size with nothing to grab. **The scroll affordance was already there
and switched off by the rule beside it**: `overflow: auto` on the output
container, `max-width: 100%` on the SVG, so the SVG was scaled to the column
and never overflowed, so the container never had anything to scroll. Removing
the cap bought panning for free.

- `diagram-expand.ts` adds the second half: an Expand control opening the
  diagram in a native `<dialog>` at up to 96vw. `max-width: 100%` returns only
  INSIDE the overlay, where fitting the pane is the point.
- **The node is MOVED, never cloned and never re-parsed.** `safeSvgNode` has
  already sanitized it and rewritten its ids to be unique in the document; a
  clone would put two elements carrying the same marker and clip-path ids into
  one document, where `url(#id)` resolves to whichever comes first. A comment
  node holds its place so it returns exactly where it was, not appended to the
  end of a host that may have siblings (13 — the overlay shows what was
  approved, byte for byte).
- The control mounts OUTSIDE the scrolling container, or it would slide away
  with the diagram it belongs to, and only after a diagram actually rendered —
  a block showing its source has nothing to expand.
- One dismissal path. Close, Escape and `dispose()` all route through
  `dismiss()`; `restore()` clears its state first, so it is idempotent, which
  matters because `dialog.close()` fires its `close` event asynchronously and
  `dispose()` cannot wait for it.
- Where `<dialog>` is unavailable (linkedom under test) the overlay still
  mounts and still closes — it simply is not modal. That fallback is exercised
  by the tests rather than assumed.

On focus: `showModal()` contains focus while the overlay is open, which is what
a modal is for, and returns it to the button that opened it. The path's
acceptance line said the overlay "must not trap focus"; read as written that
would forbid a modal, and the intent — never strand the reader — is met by
Escape plus focus restoration. Recorded here rather than quietly reinterpreted.

## The app's bookkeeping never names a file (CP-RENDER-REPAIRS S03)

`chatSlug` stripped `<`, `>` and `#` one character at a time and never saw
`<!-- … -->` as a unit, so a real file in the owner's vault ended up named
`you-!---sent-system=2120-instruction=828.md`. It now strips comments first,
the same treatment `graph-core.ts:109` already gives a heading before it
becomes a title (CP-MVP-010 S07c). **One defect class, fixed at both layers**
— worth remembering that fixing a strip in one place is a prompt to grep for
the others.

The trigger was traced rather than assumed, and the trace came back NEGATIVE:
no in-app path composes a stamped heading into the text that names a new chat
file. `send` takes the composer's contents; `retry` never creates a file and
`parseChatTurns` consumes a stamped heading into turn METADATA rather than
turn text. It was a paste — the full record is in
`atomik-project/sessions/2026-08-20-cp-render-repairs-s03-slug-trace.md`.

Deliberately not added: a guard that strips a leading `## you` from a pasted
message. Pasting a transcript fragment is legitimate, and silently rewriting
it would be worse than a cosmetic double heading.

## Vega's own diagnosis reaches the reader (CP-RENDER-REPAIRS S02)

The bench produced a chart with correct inline data, a correct encoding, and no
bars. Vega had said why — `Log scale domain includes zero: [0,1800]` — into a
logger the adapter never supplied, then drew the empty chart anyway.

- `captureVegaLog()` builds a Vega-shaped logger in the PURE half of the
  adapter, so the capture is unit-testable without a chart runtime. It
  deduplicates: Vega repeats a warning once per dataflow pulse and the reader
  needs it once.
- The same sink goes to BOTH halves — Vega-Lite reports at compile time
  (`y-scale's "zero" is dropped…`), Vega at run time (`Log scale domain
  includes zero…`).
- **A warning is not a refusal.** A chart Vega is willing to draw still draws;
  the diagnostic rides beside it. Only the existing validation failures refuse.
- Nothing new was built to display it. `RichRenderHandle.diagnostics` was
  always the channel and `hydration.ts` already renders `diagnostics[0]` into
  `[data-rich-status]` with its severity — the same slot a refusal uses. The
  adapter had simply been returning `[]`.

Mermaid was deliberately NOT audited for the same gap in this step; the owner
scoped S02 to the defect the bench actually found.

## Display math delimiters no longer own their line (CP-RENDER-REPAIRS S01)

`$$\begin{aligned}` — the LaTeX form, the form models emit by default, and the
form in the owner's own vault — used to degrade to a paragraph. Both scanners
required the delimiter to stand alone (`markdown-plugin.ts`: `line.trim() !==
'$$'`; `syntax.ts`: `trimmed !== '$$'`), so read mode and live mode failed
identically.

- The shape now lives in ONE place — `displayMathOpen`, `displayMathClose` and
  `joinDisplayMath` in `syntax.ts` — and both scanners call it. The two carried
  their own copy of the rule before, which is exactly how they came to be wrong
  in the same way; one definition cannot disagree with itself.
- **The delimiter must still START its line.** That is the whole guard against
  a false positive, and `$$` mid-prose stays inert. An opener with no closing
  line stays prose too.
- `displayMathOnLine` is still tried FIRST: a line that opens and closes on its
  own is complete, not an opener.
- Fixtures are the owner's real note (`vault-juju`, 2026-08-17), including the
  two-space-indented case inside a list item. An invented fixture would not
  have caught the indent.

**This step discharged an obligation, and that is the pattern worth keeping.**
CP-AI-CAPABILITIES had warned the model about this defect in a prompt block
that ships on every request, and pinned the warning to `discoverDollarMath`.
Repairing the parser made that pin FAIL — by design. The answer was to delete
the clause and lower the block's asserted ceiling (1,700 -> 1,450), never to
loosen the assertion. A prompt that keeps describing a repaired defect burns
tokens forever to teach the model something untrue.

The two surviving traps describe behaviour Atomik does not own — Mermaid's
HTML-label override and Vega-Lite's bar baseline — which is why they stay.

## The capability bench found three rendering traps (CP-AI-CAPABILITIES S03)

The first owner bench on REAL generations produced a chart with no data in it.
The generated spec was correct — inline `data.values`, no `url`, four rows —
and the block had done its job. The renderer had not. Three shapes then gained
a warning in `rendering-capabilities`, because in all three a model writing
perfectly reasonable source got a reader who saw nothing. CP-RENDER-REPAIRS
has since discharged the third; the history stays here without pretending the
warning still ships:

- **A `bar` mark on a log scale draws zero-height bars.** A bar's baseline is
  zero; zero is illegal on a log scale, so the scale collapses and takes the y
  tick labels with it. Vega-Lite logs `Log scale domain includes zero` and
  renders anyway. `"zero": false` does NOT rescue it — Vega-Lite drops that
  property on log scales. Bars belong on a linear scale; `line` and `point`
  work on log. Reproduced outside Electron with plain `vega`/`vega-lite`, so
  it is upstream behaviour, not an Atomik defect.
- **`$$…$$` inside a Mermaid label refuses the WHOLE diagram.** Mermaid 11
  force-enables HTML labels when it detects math (`if (hasKatex(textContent))
  { useHtmlLabels = true }`) and emits the label inside a `<foreignObject>`,
  which `safe-svg.ts` rejects outright — correctly, and not negotiable over
  untrusted note content. The reader loses the diagram, not just the formula.
  Formulas go in a math block BESIDE the diagram.
- **Resolved by CP-RENDER-REPAIRS S01: a multi-line `$$` block used to require
  `$$` alone on its own line.** `markdown-plugin.ts` and `syntax.ts` both
  carried that rule, so `$$\begin{aligned}` — the form models emit by default
  — degraded to a paragraph in read and live mode. Both scanners now share the
  repaired grammar in `syntax.ts`; its drift pin fired and the warning was
  deleted from the prompt block.

**Those warnings were pinned like every other claim in the block**, to the
code that caused them: `discoverDollarMath`, `safeSvgNode`, and Vega-Lite's own
compiler. The math pin has now proved the direction: fixing the parser failed
the test until the warning was deleted. The two surviving claims remain pinned
to `safeSvgNode` and Vega-Lite's compiler so the prompt must stop describing
them if their underlying behavior changes.
Drift runs in both directions.

The block grew 1,046 -> 1,572 chars (~+131 tokens/request) and the asserted
ceiling was raised 1,400 -> 1,700 with the owner's agreement, per the rule that
the ceiling is a decision rather than a measurement.

## Pointing wikilinks in chat (CP-AI-CAPABILITIES S02)

- A chat answer may POINT at a note with a plain `[[wikilink]]`. Pointing is
  NOT citing: citation keeps its numbered marker and chip, because the owner
  ruled at the CP-MVP-010 bench that a citation must not borrow the link pill.
  Two affordances, deliberately distinct, and the click handler routes
  `a[data-citation]` first and returns before considering `a[data-wiki]`.
- Resolution REUSES the vault pipeline — `readGraphIndex` →
  `wikiCandidatesFor` → `resolveWikiTarget` → `decorateWikiLinks` — rather than
  growing a DOM-shaped twin of the string decorator. Decoration happens on the
  HTML string BEFORE mounting, so citation chips and rich-markdown hydration
  still run over final markup; re-writing `innerHTML` afterwards would destroy
  both.
- Candidates are built from the vault root (`''`): a conversation has no
  subject note, so there is no sibling to prefer. They load ONCE per view —
  an answer streams, and an IPC round trip per chunk would be absurd. Until
  they arrive the pill renders unresolved and simply does not navigate.
- An unresolved target stays the inert broken pill: a diagnostic, never an
  auto-create. Same rule as the vault.

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

## Pill open-as (CP-OPEN-DOCK S02)

- `EdgeFollow` gains an optional `openAs(relPath, x, y)`: Mod+click on a
  RESOLVED rel pill (wikilink or relative `.md` link) reports it to the
  host's `OpenTargetMenu` instead of following. Plain left-click,
  right-click-to-edit, and hash/mailto/external href behavior are untouched;
  without a host callback Mod+click degrades to the plain click.
- The widget reports the pill's own bottom-left rect, so the popover opens
  where the user pointed. The host chain is `EditorPane.onOpenAs` →
  `VaultView`/`ProjectView` (`onOpenAsNote`) → the pane's Workspace instance,
  which owns the menu state and compiles the pick through `openNoteAt`.

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
