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

Vega-Lite explicitly supports both inline values and URL data; Atomik admits
only the former ([data model](https://vega.github.io/vega-lite/docs/data.html)).
Vega requires the custom loader at View construction time and documents
`finalize()` as the listener/timer cleanup path
([View API](https://vega.github.io/vega/docs/api/view/)).

#### Code and diagnostics

- Live/source nested parsers resolve through
  `@codemirror/language-data`'s lazy `LanguageDescription` loaders. Direct
  matches are used; fuzzy language-name matching is off. Unknown languages
  remain plain text.
- Read highlighting uses `@shikijs/core`, selected language/theme submodules,
  and `@shikijs/engine-javascript`. The `shiki` full/web bundles, Oniguruma
  Wasm, precompiled experimental grammars, and Twoslash are excluded.
- One highlighter instance is cached and disposed by the registry. Only a
  reviewed, explicit high-value language map is emitted as lazy chunks; an
  unknown alias falls back to escaped code.
- Local parser/analyzer results use the `RichDiagnostic` shape and are mapped
  from fence-relative offsets to note offsets. `@codemirror/lint` renders
  squiggles, severity, source-mode gutter markers, a count, and accessible
  messages. Live remains gutter-free and exposes the count in block chrome.
- Diagnostics contain no `actions`. No server discovery/spawn/transport,
  completion, protocol hover, definition, references, rename, formatting,
  code actions, or workspace indexing is implemented.

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
