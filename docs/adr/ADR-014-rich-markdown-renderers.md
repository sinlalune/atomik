# ADR-014: Rich Markdown is a bounded, lazy projection registry

Status: accepted
Date: 2026-08-17

## Context

Atomik's note renderer is deliberately small and synchronous today. Raw
Markdown is parsed by one `noteMarkdown()` factory with raw HTML disabled;
read surfaces consume its string immediately, while live mode decorates the
same bytes through CodeMirror. Fenced code has six eager nested-language
parsers and no read highlighting, math renderer, diagram renderer, chart
renderer, or diagnostic source.

The owner accepted a rich technical surface in this order: KaTeX math, secure
Mermaid, inline-data Vega-Lite, broad code highlighting, and code feedback
limited to decoration. The same opening check also kept future renderer
adapters possible without promising every notation now.

The main risk is architectural, not syntactic. KaTeX, Mermaid, Vega, and Shiki
are large runtimes operating on authored, untrusted text. Making them eager,
letting them fetch resources, storing their output, or treating them as
Atomik's own scene language would violate the file-first, security,
maintainability, and DSL boundaries.

## Decision

### 1. Markdown stays canonical; rich output is disposable

Raw Markdown bytes are the only canonical form. Math markup, SVG, chart DOM,
highlight spans, and diagnostics are projections. Rendering never changes the
note, frontmatter, fence info string, whitespace, or delimiters. A failed,
unsupported, oversized, cancelled, or stale render leaves an escaped source
view plus a visible diagnostic.

Third-party fenced renderers are not Atomik DSL. `mermaid` and `vega-lite`
describe third-party projections. Atomik's reserved `scene` language remains
the Scene-IR-backed bound layer governed by bedrock 19 and ADR-010, with its
own parser, printer, provenance, and studio milestones.

### 2. Keep Markdown parsing synchronous; hydrate inert placeholders

`noteMarkdown()` remains synchronous so existing read, chat, AI-preview, and
imperative consumers do not acquire an async return type. A small Markdown-it
plugin discovers supported math/fence syntax and emits escaped, inert
placeholders containing the authored source. It never imports a heavy runtime.

After a Markdown body is mounted, one hydrator discovers those placeholders
and calls a typed renderer registry. Every adapter is reached through a local
dynamic import. Vite must put KaTeX, Mermaid, Vega/Vega-Lite, Shiki engines,
themes, and grammars outside the renderer entry chunk.

This split is also the live-mode contract. Away from the active editing range,
a CodeMirror block widget mounts the same registry request; touching the block
destroys the projection and reveals the raw source. Source mode is always raw.

### 3. One host-owned lifecycle contract

The registry normalizes aliases and returns a lazy adapter. The stable contract
is equivalent to:

```ts
type RichSeverity = 'error' | 'warning' | 'info' | 'hint'

type RichDiagnostic = {
  from: number
  to: number
  severity: RichSeverity
  message: string
  source: string
  code?: string
}

type RichRenderRequest = {
  id: string
  kind: 'math' | 'mermaid' | 'vega-lite' | 'code'
  source: string
  info: string
  theme: RichTheme
  limits: RichLimits
  signal: AbortSignal
}

type RichRenderHandle = {
  diagnostics: readonly RichDiagnostic[]
  dispose(): void
}

type RichRendererAdapter = {
  render(host: HTMLElement, request: RichRenderRequest): Promise<RichRenderHandle>
}
```

Adapters receive no vault bridge, file path, provider key, generic fetch
capability, or canonical-write callback. The host owns a monotonic generation,
`AbortController`, loading/error/source states, deadline, theme, and teardown.
It mounts a result only when the generation is still current; otherwise it
immediately disposes it. Cancellation is therefore correct even for a library
whose synchronous parse cannot be interrupted.

Stable block IDs derive from the note-render generation plus source range, not
from persisted metadata. Adapter caches may retain compiled runtimes or a
bounded source/result entry, but never become canonical and must expose a
deterministic reset/dispose seam.

### 4. Syntax and alias boundary

Initial renderer aliases are deliberately finite:

```text
inline math        $...$
display math       a line/block delimited by $$...$$
math fences        math · latex · tex · katex
diagrams           mermaid
charts             vega-lite · vegalite · vl
everything else    ordinary fenced code
```

An inline `$` opener is unescaped, is not part of `$$`, and is not followed by
whitespace; its closer is unescaped, not part of `$$`, and not preceded by
whitespace. Inline math cannot cross a newline. Markdown code spans, links, and
fences keep their normal precedence. These rules avoid treating ordinary
currency such as `cost $5 and tax` as math. Display delimiters either occupy
their own lines or enclose the complete trimmed line. Unclosed or ambiguous
delimiters remain literal source.

Aliases are normalized case-insensitively from the first fence-info token.
Unknown identifiers and any adapter added later keep the ordinary code
fallback until their own security, accessibility, lifecycle, and performance
contract is accepted.

### 5. Adapter security pins

#### KaTeX

- Render locally with `output: 'htmlAndMathml'`, `trust: false`,
  `globalGroup: false`, `throwOnError: true`, `maxExpand: 1000`, and
  `maxSize: 20`.
- Pass a fresh null-prototype macro object for every expression. Definitions
  never cross an expression or note.
- KaTeX 0.16 expects that macro table to expose `hasOwnProperty`; the
  null-prototype table therefore receives only the unmodified
  `Object.prototype.hasOwnProperty` as a non-enumerable own compatibility
  method. It does not regain a prototype or shared macro storage.
- Escape source and error messages as text. KaTeX's thrown message may contain
  authored source and is never inserted as HTML.
- Package fonts and CSS locally; no CDN or external font request.
- Live mode discovers dollar forms outside CodeMirror-owned code ranges and
  treats accepted math fences as display expressions. A disposable replacement
  widget exists only while no selection touches its source lines; theme
  reconfiguration and widget destruction run the same host disposer as read.

These pins follow KaTeX's documented untrusted-input controls: `trust` gates
resource/HTML commands, while `maxExpand` and `maxSize` bound expansion and
layout ([security](https://katex.org/docs/security),
[options](https://katex.org/docs/options)).

#### Mermaid

- Initialize once with `startOnLoad: false`, `securityLevel: 'strict'`,
  `htmlLabels: false`, `suppressErrorRendering: true`,
  `deterministicIds: true`, `maxTextSize: 20_000`, and `maxEdges: 200`.
- Derive `deterministicIDSeed` from the stable request ID. Site configuration
  owns the secure keys; note directives cannot loosen them.
- Render one supplied block through the API—never scan the whole document and
  never enable click callbacks.
- Parse returned SVG, reject scriptable/foreign content and non-fragment
  `href`/`xlink:href`/`url(...)` targets, remove event-handler attributes, then
  mount DOM rather than assigning an unchecked string.
- Use token-derived light/dark theme variables; authored source cannot provide
  theme CSS outside Mermaid's strict configuration.

S04 implements this as a three-part boundary. `mermaid-core.ts` performs a
cheap preflight before calling Mermaid: the hard 64 KiB / 20,000-character /
200-edge ceilings cannot be raised by a host override, and init/YAML config,
click/link directives, image shapes, Markdown images, CSS URLs, raw active
tags, and absolute/protocol-relative schemes fail to escaped source. Mermaid's
site config repeats the limits and locks security, HTML labels, theme,
deterministic IDs, resource behavior, and layout selection in `secure`.

Mermaid owns global mutable site configuration, so one adapter-level promise
queue encloses the complete `updateSiteConfig` + `render` pair. Initialization
still happens once; queued requests cannot exchange a theme or ID seed. The
renderer works in an off-screen, non-interactive staging node, never calls the
returned `bindFunctions`, checks cancellation before publication, and removes
the staging node immediately on abort and in `finally`.

`safe-svg.ts` is the shared postflight seam for S04 and S05. It rejects DTDs,
entities, processing instructions, foreign namespaces/elements, animation and
resource elements, base URLs, non-fragment URI/CSS targets, active or escaped
CSS, and duplicate IDs; removes event attributes and residual anchor
navigation; then namespaces every ID and rewrites fragment references before
importing a DOM node. It never assigns Mermaid's string to the reading surface.
The host's render generation makes two identical blocks collision-free, while
the request ID remains the deterministic seed inside one mount. Existing
`accTitle`/`accDescr` output is retained; otherwise the guard adds a titled,
described `role="img"` rooted in the authored source summary.

Mermaid documents that strict mode encodes HTML labels and disables click
functionality, and exposes text/edge/deterministic-ID caps in its configuration
schema ([security level](https://mermaid.js.org/config/schema-docs/config-properties-securitylevel.html),
[configuration](https://mermaid.js.org/config/schema-docs/config.html)).

#### Vega-Lite

- Accept a JSON object only. Preflight traversal limits depth, property count,
  string bytes, inline rows, and total primitive cells before importing or
  compiling the runtime.
- Permit only inline `data.values` and top-level inline `datasets`. Reject
  URL-backed data, external images, external `href` targets, loaders, patches,
  and action/export links.
- Compile with `vega-lite`, then construct a `vega.View` directly with an SVG
  renderer and a deny-all loader supplied in the constructor. Do not add
  `vega-embed`.
- Postflight the generated SVG with the same external-resource guard used for
  Mermaid. Call `view.finalize()` on cancellation, replacement, unmount, and
  error.

S05 implements a two-stage lazy boundary. The registry first imports a small
policy adapter; that adapter parses and completely preflights the JSON before
its second dynamic import loads either `vega-lite` or `vega`. The 256 KiB,
depth-32, 50,000-property, 5,000-row, 100,000-primitive-cell, and 2 MiB output
ceilings are hard maxima: a host can lower but cannot raise them. Traversal
counts decoded string/key bytes and nested inline collections as well as the
top-level row array. Inline encoded-text datasets are rejected because their
post-parse row/cell count cannot be proved before the runtime loads; admitted
values and top-level datasets are structured JSON arrays or objects.

Outside admitted data records, the policy rejects URL/href channels, image
marks, generated or unresolved named data, nested datasets, loader/patch/
action/export keys, and bound controls. Named data must resolve to a top-level
inline dataset. Ordinary record fields named `url`, `href`, or `data` remain
data, not capabilities. The compiled projection receives site-owned
light/dark token defaults; authored chart semantics and canonical JSON source
remain unchanged.

The adapter does not use `vega-embed`. It constructs a headless SVG
`vega.View` with all four loader methods denied and hover binding disabled,
runs it, obtains SVG, and immediately finalizes the no-longer-needed view. An
abort listener finalizes an in-flight view on timeout, replacement, or
unmount; the `finally` path covers success and every runtime/postflight error.
Only the static SVG node returned by `safe-svg.ts` is published.

Vega-Lite explicitly supports both inline values and URL data; Atomik admits
only the former ([data model](https://vega.github.io/vega-lite/docs/data.html)).
Vega requires the custom loader at View construction time and documents
`finalize()` as the listener/timer cleanup path
([View API](https://vega.github.io/vega/docs/api/view/)).

#### Code and diagnostics

- Every ordinary fence becomes the same escaped inert `code` placeholder in
  read and untouched live mode. A known language receives fine highlighting;
  an unknown language stays visually ordinary escaped code inside the common
  header. Touching the live range restores the nested editable CodeMirror
  source, and source mode is always raw Markdown.
- Live/source nested parsers resolve through `@codemirror/language-data`'s
  lazy `LanguageDescription` loaders. Name/alias and extension matches are
  exact; fuzzy matching is off, so `script` and misspellings cannot silently
  select JavaScript. The catalog metadata is eager because Markdown's nested
  parser resolver is synchronous, while each grammar remains a dynamic chunk.
- Read highlighting uses `@shikijs/core`, selected language/theme submodules,
  and `@shikijs/engine-javascript`. The `shiki` full/web bundles, Oniguruma
  Wasm, precompiled experimental grammars, and Twoslash are excluded.
- One highlighter instance is cached and disposed by the registry. Grammar
  loads serialize and retry after failure. The reviewed map covers 37 common
  web, data, shell, systems, mobile, and framework grammars; every grammar and
  the two GitHub default themes are explicit subpath imports. Unknown aliases
  never invoke Shiki.
- The adapter never mounts Shiki HTML. It reconstructs spans from authored
  source offsets with `textContent`, admits only hex token colors and the four
  documented font-style bits, and ignores any HTML-style/attribute surface.
  Its semantic toolbar names the language and problem count; standard buttons
  copy authored source only, reveal plain source, wrap, and expand/collapse.
- Local CodeMirror/Lezer parser error nodes become bounded `RichDiagnostic`
  values and map from fence-relative offsets to raw note offsets. Source mode
  dynamically imports `@codemirror/lint` only when selected, then renders
  squiggles, severity, gutter markers, messages, and keyboard navigation.
  Live remains gutter-free and exposes the count plus accessible messages in
  block chrome. At most 100 diagnostics per block, 64 analyzable blocks, and
  200 diagnostics per document are admitted; the first omitted block receives
  a visible limit diagnostic.
- Diagnostics contain no `actions`. An executable capability pin keeps server
  discovery/spawn/transport, virtual documents/workspaces, completion,
  signature help, protocol hover, definition/references/symbols, rename,
  formatting, semantic tokens, inlay hints, hierarchies, workspace edits/code
  actions, and workspace indexing false. No LSP client exists in this path.

CodeMirror's `LanguageDescription.load()` and lint `Diagnostic`/`lintGutter`
contracts supply exactly these lazy-language and decoration seams
([reference](https://codemirror.net/docs/ref/),
[lint example](https://codemirror.net/examples/lint/)). Shiki recommends
fine-grained browser bundles, a cached/disposable highlighter, and its native
JavaScript regex engine for bundle/startup control
([bundles](https://shiki.style/guide/bundles),
[performance](https://shiki.style/guide/best-performance),
[regex engines](https://shiki.style/guide/regex-engines)).

### 6. Initial resource and performance budgets

Budgets are user-visible policy, not silent truncation:

| Unit | Initial cap | Failure behavior |
| --- | ---: | --- |
| rich placeholders per mounted body | 128 | later blocks remain source with one summary diagnostic |
| one math expression | 32 KiB source | source + diagnostic |
| one Mermaid block | 20,000 source characters / 200 edges | source + diagnostic |
| one Vega-Lite block | 256 KiB JSON / depth 32 / 50,000 properties / 5,000 rows / 100,000 primitive cells | source + diagnostic |
| one Shiki block | 256 KiB source / 20,000 lines | escaped code without fine highlighting + info diagnostic |
| generated HTML/SVG per block | 2 MiB serialized | discard output; source + diagnostic |
| heavy adapter deadline | 3,000 ms | abort generation; source + diagnostic |

The 10 MiB note cap remains the outer file boundary. These lower projection
caps protect the renderer; they do not reject or rewrite the note.

The S01 production baseline is 2,329,498 B entry JS and 123,707 B CSS. At path
closure:

- no KaTeX, Mermaid, Vega, Vega-Lite, Shiki engine/theme/grammar, or expanded
  CodeMirror grammar may appear in the entry chunk;
- entry JS may grow at most 150 KiB uncompressed from the S01 baseline;
- the median of warm prebuilt smoke passes may regress by at most 10% unless a
  dated bench identifies environment noise and the owner accepts a new pin;
- a note with no rich syntax must stay within 10% of the S01 read/parse/live
  microbench medians;
- first render, repeat render, invalid/oversized input, cancellation, theme
  change, and teardown are measured separately for every heavy adapter in S07.

Simple-block targets on the pinned development machine are: KaTeX first
<300 ms/repeat <50 ms; Mermaid and Vega-Lite first <1,500 ms/repeat <250 ms;
Shiki first <500 ms/repeat <100 ms. The 3 s deadline is the hard safety cap,
not the performance target.

S06 production inspection measures a 2,454,528-byte eager renderer entry
(+70,920 B from S05, +125,030 B from the S01 baseline, leaving 28,570 B under
the 150 KiB ceiling) and 140,228-byte global CSS. Code presentation is a lazy
23,033-byte adapter; source diagnostics are a separate lazy 35,017-byte chunk.
Shiki core (226,275 B), its JavaScript regex engine (111,669 B), the two themes
(14,198/14,475 B), and each selected grammar remain separate on-demand assets.

### 7. UI and accessibility contract

Rich content remains on the opaque reading surface. Block headers and
diagnostic overlays use the existing token vocabulary, control sizes, focus
outline, and semantic state colors. Every icon-only action has `aria-label`
and `title`; Copy copies authored source only. Reduced-motion and reduced-
transparency preferences are respected.

KaTeX retains MathML. Mermaid/Vega SVGs receive a figure name and description
from authored accessibility metadata when available, otherwise a concise
generated label plus the source fallback. Loading and failures announce a
polite status without repeatedly speaking on theme-only rerenders. Keyboard
users can reveal source, copy, wrap/expand, and reach diagnostic messages.

### 8. The renderer's environment is part of the contract (S07, owner bench)

Added after the first owner bench of this path (2026-08-17), which ran S01–S06
in the real app for the first time and found two renderers dead on arrival
while every gate was green. Both failures were environmental — true in a
browser under this app's policies, invisible to a test suite.

**Colors reach a library resolved, never as CSS.** The design system states
every color as `light-dark(...)` (36) and derives shades with `color-mix(...)`.
Reading those custom properties returns their UNRESOLVED text. Mermaid's color
parser rejected it outright (`Unsupported color format: "light-dark(#fbfbf9,
#1e1e23)"`) and fell back to source for every themed diagram; Vega's palette
accepted a token only when it was already plain hex, so it silently ignored the
theme and drew every chart in built-in defaults. `adapters/css-color.ts` now
resolves tokens through a hidden probe **inside the render host** — where
`color-scheme` and `[data-theme]` actually apply — and hands libraries `rgb()`,
narrowed to `#rrggbb` where a library does arithmetic on it. An adapter must
never re-read a design token itself.

**Charts run inside the CSP, not around it.** Vega compiles expressions with
`Function(...)`; the renderer's `script-src 'self'` (13) refuses that, so every
chart fell back to source. The CSP is a security boundary over untrusted note
content and is not negotiable, so Vega is parsed with `{ ast: true }` and
evaluated with `vega-interpreter`. Expression text is never converted into
executable code. Slightly slower per chart, irrelevant at note scale.

**Dark-ness has ONE definition.** It had three that disagreed — an allowlist of
three themes in `hydration.ts`, `appTheme === 'dark'` in `EditorPane`, and five
`color-scheme: dark` blocks in `styles.css` — so `ember` and `hearth` rendered
code dark-on-dark. `rich-markdown/theme.ts` is the single source: it asks the
engine for the computed `color-scheme` and keeps a mirrored set only for
environments with no engine. A test parses `styles.css` and fails if the mirror
drifts.

The standing rule this leaves behind: **a passing suite is not evidence that a
renderer renders.** These tests run on linkedom, which has no `getComputedStyle`
and enforces no CSP; both defects passed the full suite before and after the
fix until the regressions were rewritten to install the engine surface the
adapters actually talk to. Renderer work needs a real bench, early.

**The mechanical half of that rule is `npm --workspace atomik-desktop run
smoke:rich`.** The path's open question — whether a real-Electron lane was the
only guard against this defect class — is answered yes, and built. It seeds a
vault and a workspace state, launches the real app, and asserts in the real
browser that each adapter produced its actual SHAPE: a `<svg>` for Mermaid and
Vega, `.katex` for math, `.rich-code-token` for code. Waiting on "the output
element exists" is not enough — an empty render host satisfies that, and did.
It also asserts no `light-dark()`/`color-mix()` survives into rendered output
and that a note never creates an `img` or `script` node.

It was validated the only way a guard can be: by reverting both adapter fixes
and confirming it reproduces the owner's two error strings verbatim. It needs
no test hook in the renderer — the fixture restores through the app's own
workspace-restore path — and it is a SEPARATE lane from the gates, because
"does the software work" and "does it work in a browser" are different
questions.

## Dependency pin (checked 2026-08-17)

| Package | Accepted version | License | Registry unpacked size | Decision |
| --- | ---: | --- | ---: | --- |
| `katex` | `0.16.47` | MIT | 4,037,040 B | current maintained 0.16 line; satisfies Mermaid's `^0.16.45`, preventing a second KaTeX copy |
| `mermaid` | `11.16.1` | MIT | 83,547,314 B | local lazy diagram adapter only |
| `vega` | `6.4.0` | BSD-3-Clause | 3,727,817 B | direct View runtime; deny-all loader |
| `vega-lite` | `6.4.3` | BSD-3-Clause | 5,814,897 B | compiler; requires Node >=20 (repository uses 24.14.0) |
| `@shikijs/core` | `4.4.3` | MIT | 64,493 B | fine-grained core |
| `@shikijs/engine-javascript` | `4.4.3` | MIT | 10,699 B | browser regex engine; no Wasm |
| `@shikijs/langs` | `4.4.3` | MIT | 8,653,550 B | explicit lazy language subpaths only |
| `@shikijs/themes` | `4.4.3` | MIT | 1,479,330 B | two explicit lazy theme subpaths only |
| `@codemirror/language-data` | `6.5.2` | MIT | 71,718 B | broad dynamic nested-language registry |
| `@codemirror/lint` | `6.9.7` | MIT | 97,441 B | decoration rendering only |
| `vega-interpreter` | `2.3.2` | BSD-3-Clause | 55,842 B | required by §8; only way to run Vega under the renderer CSP |

KaTeX `0.18.4` was current on the registry but is deliberately not selected:
Mermaid `11.16.1` constrains its own KaTeX dependency to `^0.16.45`; selecting
0.18 would install two copies. Recheck this pin when Mermaid widens that range,
when a KaTeX security advisory affects 0.16, or at the next dependency refresh.
All other versions, licenses, engine requirements, and advisories are rechecked
at install/lock time and again before path closure.

## Consequences

Rich Markdown can grow through small adapters without changing file format or
the synchronous Markdown API. Expensive runtimes load only when their syntax
is visible. One lifecycle fixes the common stale-result, cancellation, theme,
fallback, and teardown problems once.

The cost is a post-render hydration layer and some duplicated mounting work
between DOM read surfaces and CodeMirror widgets. Mermaid and Vega remain
large optional chunks; the path must earn them through measured behavior, not
hide their weight behind lazy-loading language.

## Alternatives considered

### Make `noteMarkdown().render()` async

Rejected. It spreads an async migration through note read, chat, claim marks,
AI previews, and imperative widgets, while still needing lifecycle handling
after DOM mount.

### Use Markdown-it renderer wrappers for every feature

Rejected. KaTeX auto-render, Mermaid document scanning, Vega-Embed, and a
Markdown-it Shiki wrapper each own a different lifecycle/security model and
make bundle boundaries harder to prove. Atomik needs one host contract.

### Use the full or web Shiki bundle

Rejected. Shiki documents 6.4 MB and 3.8 MB minified totals respectively and
recommends fine-grained modules for browser/performance-sensitive use. Broad
support comes from explicit lazy grammars and honest plain-code fallback.

### Add a real LSP client/server

Rejected by owner scope. It would introduce process discovery, transport,
virtual documents/workspaces, editing operations, and a much larger trust and
lifecycle surface. Parser/local-analyzer diagnostics satisfy the accepted
decoration-only feedback.

### Treat Mermaid/Vega as the Atomik DSL

Rejected. They render authored third-party grammars but do not carry Atomik's
Scene IR, printer, semantic operations, provenance, claim model, or bound/free
surface contract.

## Migration / rollback

There is no file migration. Removing an adapter and its dependency turns its
aliases back into ordinary escaped code. Removing the registry leaves the
existing Markdown renderer and raw/live/source bytes intact. Caches and
generated DOM can be deleted without data loss.

## Links

- `docs/bedrock/04_04-file-first-model.md`
- `docs/bedrock/11_11-markdown-page-model.md`
- `docs/bedrock/13_13-electron-security.md`
- `docs/bedrock/15_15-maintainability.md`
- `docs/bedrock/19_19-dsl-future.md`
- `docs/bedrock/36_36-ui-design-system.md`
- `docs/adr/ADR-010-one-surface-two-layers.md`
- `atomik-project/coding-paths/CP-RICH-MARKDOWN.md`
- `atomik-project/sessions/2026-08-17-cp-rich-markdown-s01-baseline.md`
