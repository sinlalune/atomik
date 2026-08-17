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
  diagram, or a chart;
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
rules for strict inline/display math and wraps only the accepted fence aliases.
It does not import KaTeX, Mermaid, Vega, or Shiki.

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
2. `rich-markdown/markdown-plugin.ts` adds Markdown-it rules. Unknown fences
   call the saved ordinary fence renderer byte-for-byte.
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
9. Vault, project, source-dossier, chat, new-note preview, and inline-AI
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
tested preflight/postflight instead of trusting library output. Vega-Lite and
Shiki remain absent until their own steps, so every later security boundary
stays independently testable.

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
3. Render a `graphviz` fence through `noteMarkdown()` and compare the exact
   HTML to an ordinary Markdown-it fence. Why is silent “best effort” worse?
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
```

## What arrives next

S05 adds inline-data-only Vega-Lite behind the same host and reuses the SVG
postflight before it finalizes each view. S06 adds broad lazy code languages,
fine-grained Shiki read highlighting, and decoration-only diagnostics. None
receives file, IPC, network, or mutation authority merely because KaTeX and
Mermaid proved the adapter shape.
