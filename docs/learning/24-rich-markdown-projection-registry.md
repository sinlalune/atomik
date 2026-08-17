---
type: Atomik Learning Note
title: 'Learning: rich Markdown as a safe lazy projection'
description: How Atomik discovers math and rich fences synchronously, then renders them through one cancellable registry without changing Markdown or loading heavy libraries at startup.
tags: [learning, markdown, registry, lazy-loading, cancellation, security]
timestamp: 2026-08-17T00:00:00Z
---

# Learning: rich Markdown as a safe lazy projection

## Who this is for and what you can do afterwards

This note starts from a normal Markdown string and explains the first brick of
Atomik's rich technical reader. Afterwards you can:

- explain why the note stays plain Markdown even when it displays math, a
  diagram, a chart, or highlighted code;
- follow a `$...$` expression from parsing to its safe source fallback;
- add a renderer adapter without making it load at app startup;
- reason about cancellation, stale promises, output caps, and cleanup;
- write a focused test that proves a renderer can fail without losing source.

The concrete implementation is under
`apps/desktop/renderer/src/editor/rich-markdown/`. ADR-014 is the durable
decision; this page teaches the mechanics.

## The technologies involved, from zero

### Markdown-it: text becomes tokens, then HTML

Markdown-it has two relevant phases:

```text
raw Markdown
  -> block + inline parser rules
  -> tokens (paragraph, fence, text, ...)
  -> renderer rules
  -> HTML string
```

Atomik already had one factory, `editor/note-markdown.ts`, with raw HTML
disabled. The rich plugin in `rich-markdown/markdown-plugin.ts` adds parser
rules for strict inline/display math and wraps every fence in an inert
placeholder. An accepted DSL kind chooses its adapter; every other fence
chooses `code`. It does not import KaTeX, Mermaid, Vega, or Shiki.

The plugin emits an inert shape:

```html
<span data-rich-block data-rich-kind="math" data-rich-info="inline">
  <code data-rich-source>x + y</code>
  <span data-rich-output hidden></span>
  <span data-rich-status role="status" hidden></span>
</span>
```

“Inert” means the markup contains no executable handler and does not render the
math itself. Authored text goes through Markdown-it's `escapeHtml`, so a
Mermaid label containing `<script>` remains text.

### A registry: kind → loader → adapter

A registry is a table that maps a small stable name to an implementation:

```text
math       -> () => import KaTeX adapter later
mermaid    -> () => import Mermaid adapter later
vega-lite  -> () => import Vega adapter later
code       -> () => import Shiki adapter later
```

`rich-markdown/registry.ts` caches the loader promise. Two math blocks share
one module load; a rejected load is removed so an explicit retry is possible.
It also checks that a loader registered as `math` did not accidentally return
a `mermaid` adapter.

This is dependency inversion: the stable host knows the adapter contract, not
the library. Heavy libraries depend on the contract when their modules load.
The host never imports their concrete runtime eagerly.

### Dynamic import and code splitting

`import()` returns a promise. Vite sees a static dynamic-import target and
emits it as another production chunk. Installation size and bundle size are
different facts: Mermaid can occupy many megabytes in `node_modules` while
contributing zero runtime bytes to Atomik's entry chunk until a loader imports
it.

S02 proves the empty-host cost. The production entry changed from 2,329,498 B
to 2,345,119 B (+15,621 B), CSS stayed 123,707 B, and the emitted asset list
contained no KaTeX/Mermaid/Vega/Shiki chunk.

The required rebase onto CP-MVP-010 changed both comparison bundles. On that
same trunk, the empty host is 2,373,425 B versus 2,358,560 B (+14,865 B,
+0.63%); CSS is byte-identical at 132,917 B and the heavy chunks remain absent.

S03 adds the first real target without making it eager. Math range/widget
wiring moves the entry to 2,382,051 B (+8,626 B from S02) and global CSS to
134,861 B (+1,944 B). KaTeX is a separate 485,408 B JavaScript chunk and
28,946 B CSS chunk; its 59 locally packaged font assets total 1,072,948 B.
Those files exist in the build, but the browser requests the dynamic chunk only
when a mounted note contains accepted math syntax.

S04 keeps the same property for diagrams. The entry is 2,383,165 B, only
1,114 B above S03, and global CSS is 135,772 B (+911 B). Mermaid's core is a
separate 1,097,914 B chunk; its diagram definitions remain separate again (the
flowchart definition is 102,800 B), so an ordinary note pays none of that cost
and a flowchart does not load every other diagram implementation.

S05 uses two lazy doors for charts. The eager entry is 2,383,608 B (+443 B)
and CSS is 136,043 B (+271 B). An accepted chart first loads the 15,357-byte
Vega policy adapter. Only after JSON preflight succeeds does it load the
618,083-byte Vega-Lite compiler and 940,911-byte Vega runtime chunks. An
invalid or external-data chart therefore never evaluates either heavy
runtime; an ordinary note requests none of the three chunks.

S06 adds broad code presentation without importing the highlighter at startup.
The eager entry is 2,454,528 B (+70,920 B from S05, +125,030 B from the S01
baseline) and global CSS is 140,228 B. The 23,033-byte code adapter and
35,017-byte source-diagnostic module are lazy. Shiki core (226,275 B), its
JavaScript regex engine (111,669 B), the two 14 KiB themes, and every reviewed
grammar are independent on-demand chunks. Loading diagnostics only when source
mode is selected recovered 32,136 eager bytes and kept the path 28,570 B under
its 150 KiB ceiling.

### KaTeX: safe TeX is still untrusted input

KaTeX turns a TeX expression into visual HTML and semantic MathML. Atomik asks
for both (`htmlAndMathml`) so the equation is visible and assistive technology
has a mathematical tree. The adapter also sets `trust: false`: commands that
could create a URL, image, class, id, or style do not gain those capabilities.
`maxExpand` stops recursive macro expansion and `maxSize` caps attacker-sized
layout dimensions.

Each render receives a new macro table. That matters because TeX can define a
macro: sharing the table would let one note silently change how a later note
renders. KaTeX 0.16 calls `hasOwnProperty` on the table, so Atomik keeps its
prototype null and adds only that one built-in method as a non-enumerable own
property. A first expression may define `\\foo`; a second still reports it as
undefined.

Read and live reuse the same adapter and hydrator. Read mode starts from inert
escaped placeholders. Live mode replaces an exact CodeMirror source range only
while the cursor is elsewhere; touching or clicking it reveals the raw bytes.
Destroying or recoloring the widget invokes the same abort/dispose path as a
React read surface.

### Mermaid: generated SVG still crosses a trust boundary

Mermaid is not inserted through a document-scanning helper. The adapter gets
one accepted fence, renders it locally with strict site configuration, and
never calls Mermaid's optional `bindFunctions`. That last detail matters:
bindings are where diagram-authored click behavior would become live DOM
behavior.

There are three gates:

```text
authored fence
  -> preflight source + complexity/resource limits
  -> strict Mermaid render in an off-screen staging node
  -> parse and inspect returned SVG
  -> import a static, fragment-local DOM tree
```

The preflight rejects note config, click/link directives, image/resource
syntax, external schemes, and more than 200 ordinary edges before heavy parse
work. The Mermaid config repeats those limits and keeps security, HTML labels,
theme, IDs, and layout in its secure-key list. The limits are hard ceilings:
passing a larger test/custom host budget cannot turn 200 into 10,000.

The SVG guard is independent of Mermaid's own sanitizer. It rejects foreign or
scriptable elements, event handlers, base URLs, external `href`/CSS resources,
active CSS, processing instructions, entities, and duplicate IDs. Allowed
`url(#marker)` references stay local. Every generated ID is then namespaced to
the rich request and every fragment reference is rewritten before
`document.importNode` publishes it. This prevents two identical diagrams from
sharing marker, filter, clip-path, or accessibility IDs in one window.

Mermaid's site config is global mutable state even though `render()` returns a
promise. The adapter therefore serializes the complete config-and-render pair.
Without that queue, note A could choose a dark palette and seed, note B could
replace them, and note A could finish with B's IDs or colors. Cancellation
removes staging immediately; publication checks the signal again, so a late
diagram never enters a stale note.

### Vega-Lite: data is input, not loading authority

Vega-Lite normally accepts inline data, URL data, generated data, image marks,
links, and embedding controls. Atomik needs only the first capability. A
`vega-lite`/`vegalite`/`vl` fence therefore crosses this pipeline:

```text
authored JSON fence
  -> parse one object + enforce hard structural/data budgets
  -> admit structured inline values or named top-level inline datasets
  -> load Vega-Lite + Vega only after that preflight
  -> compile, run a headless SVG View with a deny-all loader
  -> finalize the View in every exit path
  -> pass SVG through the shared static-resource postflight
```

The policy walk treats inline records as records: a column called `url` or
`href` is ordinary data. The same key in a chart encoding or data-source
object would create a capability and is rejected. URL-backed and generated
data, unresolved names, nested dataset registries, image marks, href/url
channels, patches, actions/exports, loaders, and bound controls all fail before
the heavy import. Encoded CSV/DSV strings also fail because their true row and
cell count would not be known until parsing; arrays and objects can be bounded
up front.

No `vega-embed` wrapper exists. Atomik constructs `vega.View` directly with
the SVG renderer, hover off, and a loader whose `load`, `sanitize`, `http`, and
`file` methods all reject. Theme colors come from Atomik tokens and override
visual defaults without changing authored encodings. `runAsync()` and
`toSVG()` produce a disposable snapshot; an abort listener plus `finally`
finalize the View on success, failure, timeout, replacement, or unmount. The
remaining handle owns only the sanitized static node.

### Code: two lazy catalogs, one source of truth

CodeMirror and Shiki solve different presentation problems. CodeMirror parses
the editable Markdown buffer and can locate syntax errors. Shiki supplies the
high-quality read colors. Neither result is canonical:

```text
raw fenced source
  -> exact CodeMirror LanguageDescription -> editable nested grammar/errors
  -> reviewed Shiki alias -> read-only token colors
  -> unknown alias -> escaped plain code
```

`code-languages.ts` deliberately disables CodeMirror's fuzzy language match.
`ts`, `py`, `rs`, and exact file extensions work; `script` and `typscript` stay
plain. The catalog carries lazy descriptions, so broad support does not mean
loading every parser. `adapters/code.ts` separately lists 37 reviewed Shiki
grammars as explicit package subpaths. It creates one cached highlighter from
fine-grained core, the native JavaScript regex engine, and light/dark GitHub
themes. It never imports Shiki's full/web bundle, Wasm engine, or Twoslash.

Shiki can return HTML, but Atomik does not accept that sink. `code-core.ts`
rebuilds spans from token offsets and slices of the authored source using
`textContent`. Only hex colors and the documented italic/bold/underline/
strikethrough bits cross the boundary. Copy receives the closed-over source
string, not `textContent` from a frame that also contains language, status, and
buttons.

`code-diagnostics.ts` loads the same exact CodeMirror description, walks local
Lezer error nodes, and produces ranges relative to the fence. Source mode maps
those ranges back to document offsets and dynamically installs CodeMirror lint
squiggles, gutter marks, messages, and keyboard navigation. Read/live chrome
shows the count and messages but no gutter. There is no language-server process
or protocol, and diagnostics have no actions; fixing the source simply makes
the parser error decoration disappear.

### AbortSignal: a shared cancellation vocabulary

`AbortController` owns a signal. Code that receives the signal can stop work
when `signal.aborted` becomes true. Atomik gives every block its own controller
and aborts it on timeout, rerender, theme change, or unmount.

Not every third-party parse can stop halfway through a synchronous call. The
host therefore needs two defenses:

1. cooperative cancellation through `AbortSignal` when the adapter supports
   it;
2. stale-result suppression even when the library ignores cancellation.

The second defense is why each render gets its own DOM host. When a newer
hydration starts, the old host is detached. A late promise can mutate only that
detached node; its returned handle is immediately disposed.

### A disposer: ownership made explicit

Rendering may create timers, listeners, caches, or a Vega View. Garbage
collection cannot know the library-specific teardown verb. Every successful
adapter therefore returns:

```ts
{
  diagnostics: [],
  dispose() { /* release this render */ }
}
```

The registry may also dispose an adapter-global cache, such as one cached Shiki
highlighter. “Who cleans this up?” is part of the type, not a comment.

## The architecture concepts mobilized (named)

### Canonical data versus projection

The Markdown file is canonical. HTML, SVG, highlight spans, and diagnostics are
projections: delete them and the note loses nothing. This is the file-first
model from bedrock 04 and the same reason live-preview decorations never write
back to the buffer.

### Trust boundary

The authored source is untrusted. The synchronous plugin may only escape it;
the adapter receives no `window.atomik` bridge, file path, provider key, write
callback, or generic network capability. The host caps source before it even
loads an adapter and caps serialized output before accepting it.

### Strategy pattern

Every adapter satisfies one `RichRendererAdapter` interface, but each chooses a
different rendering strategy. The host can treat KaTeX and Vega uniformly for
lifecycle without pretending their security rules are identical.

### Generation / latest-wins concurrency

Async results can arrive out of order. Atomik's latest hydration owns the live
output node; older generations are aborted and detached. This is the same
latest-wins principle used for search responses and media rendering.

### Loud degradation

Unsupported, oversized, invalid, timed-out, or unavailable renderers show the
escaped source and a text diagnostic. “Nothing happened” is not an error
state. The fallback is also the rollback path: remove an adapter and its fence
becomes readable source again.

## Walkthrough of the real code

1. `rich-markdown/syntax.ts` owns aliases and strict dollar rules. Currency
   without a closing delimiter stays prose; inline math cannot cross a line.
2. `rich-markdown/markdown-plugin.ts` adds Markdown-it rules. Ordinary and
   unknown fences become escaped `code` placeholders; an unknown language
   stays plain inside the common block chrome.
3. `rich-markdown/contracts.ts` defines requests, diagnostics, handles, theme,
   and the ADR budgets.
4. `rich-markdown/registry.ts` lazily loads and caches kind-correct adapters.
5. `rich-markdown/hydration.ts` finds placeholders, checks count/source caps,
   loads an adapter, races it against abort/timeout, caps output, changes the
   visible state, and disposes every owned resource.
6. `rich-markdown/RichMarkdownBody.tsx` bridges React's mounted DOM to that
   imperative lifecycle. Its effect cleanup runs on HTML/theme change and
   unmount.
7. `rich-markdown/adapters/katex.ts` is the first concrete strategy; the live
   editor reaches it through disposable source-range widgets, not a second
   renderer.
8. `rich-markdown/adapters/mermaid-core.ts` owns source policy, strict config,
   global serialization and staging. `safe-svg.ts` owns the renderer-neutral
   SVG postflight; the tiny `mermaid.ts` module is the only runtime import.
9. `vega-lite-core.ts` owns the JSON/data policy, token theme, deny loader,
   finalization, and shared SVG postflight. The tiny `vega-lite.ts` adapter
   loads the compiler and runtime only after preflight.
10. `code-languages.ts` owns exact CodeMirror descriptions;
    `code-diagnostics.ts` owns local bounded ranges and source-mode lint
    decorations; `adapters/code-core.ts` owns safe DOM and controls; the tiny
    `adapters/code.ts` module owns reviewed Shiki dynamic imports.
11. Vault, project, source-dossier, chat, new-note preview, and inline-AI
   surfaces now enter that same host rather than growing per-surface renderers.

## How it was built (methodology)

The path measured before installing anything: entry/CSS bytes, production
startup, Markdown rendering, Lezer parsing, and live tree walks. It then wrote
ADR-014 before source code, including non-selections and rollback.

S02 implemented the smallest useful vertical slice:

```text
pure ambiguity rules
  -> escaped placeholders
  -> typed registry
  -> cancellable DOM host
  -> every current noteMarkdown consumer
  -> adversarial lifecycle tests
  -> typecheck + production chunk inspection
```

S03 then connects only KaTeX. S04 connects Mermaid through an independently
tested preflight/postflight instead of trusting library output. S05 reuses
only the renderer-neutral SVG postflight: its JSON/data admission and View
lifecycle remain independently testable. S06 gives code its own safe token-DOM
adapter and local diagnostic seam instead of hiding either inside chart work.

## Lessons learned the hard way

### Cancelling a race does not cancel its losing promise

`Promise.race([render(), aborted])` stops waiting when `aborted` wins, but the
`render()` promise still exists. If it later returns a handle and nobody
observes it, its listeners or timers leak. `hydration.ts` attaches a cleanup
continuation to the render promise itself, in addition to racing it.

The regression test distinguishes two cases:

```text
cancel before adapter.render starts   no per-render handle exists
cancel after adapter.render starts    a late handle MUST be disposed
```

### Error strings are also untrusted text

KaTeX documents that thrown errors may include authored LaTeX. The generic
host always assigns `status.textContent`; it never interpolates an exception
into HTML. The test throws an `<img onerror=...>` string and proves no image
node appears.

### A dependency audit needs a baseline

The post-install audit reported four high advisories. Running the identical
audit against the pre-rich trunk proved all four were inherited: PDF.js plus
Vite/Electron tooling. Without that comparison, S02 could wrongly claim either
“the new stack is unsafe” or “the audit is clean.” Neither would be true.

### Directory names are not globs

The path's `writes:` contract uses a minimal glob language. A trailing slash is
not recursive; `rich-markdown/**` is. Declaring the real surface keeps scope
drift useful without pretending it is a lock.

### “Sanitized SVG string” is not yet a mount contract

Mermaid sanitizes its own output, but its policy and Atomik's policy are not
identical. Atomik forbids every external resource and every binding; Mermaid
supports features that intentionally need them in other products. Assigning
the returned string with `innerHTML` would silently make Mermaid's current
policy Atomik's permanent policy.

The extra parse/inspect/import step also found a less obvious correctness
problem: SVG IDs are document-visible. Deterministic output makes identical
diagrams more likely to collide, not less. Request-generation namespacing plus
targeted rewriting of `href`, `url(#...)`, ARIA references, and CSS selectors
keeps determinism without cross-note collisions. Rewriting every `#id` as raw
text is incorrect because `#fff` may be a color; references must be rewritten
in their grammatical positions.

## Try it yourself (exercises)

1. Run `npm --workspace atomik-desktop test -- tests/rich-markdown.test.ts`.
   Change the math source cap to four bytes and explain why the adapter loader
   count remains zero.
2. Give two fake Mermaid requests different seeds, hold the first render open,
   and prove the second config is not applied until the first finishes.
3. Render a `graphviz` fence through the code adapter. Prove Shiki is never
   loaded and the exact escaped source still appears under the common chrome.
4. Temporarily import a heavy package eagerly from `registry.ts`, run the
   production build, and inspect the renderer entry delta. Revert the import.
5. Add a diagnostic containing `<script>` as its message. Prove it stays text.

## Vocabulary you now own

```text
canonical form       the file that owns truth and survives cache deletion
projection           disposable presentation derived from canonical data
adapter              one implementation behind a stable interface
registry             a mapping from stable keys to adapter loaders
dynamic import       promise-based module load that enables a separate chunk
hydration             turning inert mounted markup into an interactive/rendered view
AbortSignal          shared cancellation state passed into async work
stale result          an older async answer arriving after a newer generation
disposer              explicit release function for owned resources
loud degradation      visible source + diagnostic instead of blank/silent failure
diagnostic decoration  disposable feedback range; never a canonical edit
```

## What arrives next

S07 stress-tests rapid edits, cancellations, theme/tab switches, large input,
cache teardown, responsiveness, keyboard and screen-reader behavior, and the
production chunk graph. None of those checks grants a renderer file, IPC,
network, execution, or mutation authority.
