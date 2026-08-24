---
type: Atomik Session Record
title: CP-RICH-MARKDOWN opening check — safe rich renderers and decoration-only code feedback
timestamp: 2026-08-17T00:00:00Z
path: CP-RICH-MARKDOWN
branch: path/cp-rich-markdown
ceremony: opening
---

# CP-RICH-MARKDOWN opening check (2026-08-17)

Run per `docs/bedrock/22_22-agent-handoff.md` §Between paths and
`atomik-project/coding-paths/paths.md` §Opening a path. CP-FEEDBACK had carried
Language Notes, Open & Dock, and PDF Reader in that order. During the Language
Notes opening check, the owner inserted a rich-note-rendering path and then
explicitly moved it to the front.

## Owner rulings, verbatim

After accepting that KaTeX, Mermaid, Vega-Lite, and an extensible safe renderer
registry should remain separate from Atomik's reserved custom DSL/studio path,
the owner changed the order and added code-block feedback:

> “wait can you do rich markdown first and maybe add lsp decoration for code
> block or maybe add lib that do it”

Asked to distinguish syntax/diagnostic decoration from a full language-server
runtime, the owner narrowed the contract:

> “for lsp feedback keep only decoration related”

The owner then explicitly retained the earlier rich-renderer scope:

> “and ofc keep the KATEX + other dsl you found”

These directives are the opening acceptance. The carried execution order is
now **CP-RICH-MARKDOWN → CP-LANGUAGE-NOTES → CP-OPEN-DOCK → CP-PDF-READER**.

## Accepted feature contracts

1. **LaTeX math via KaTeX** — inline and display math render in read and live
   note surfaces, preserve the exact Markdown source, expose accessible MathML,
   and fail visibly back to source. Untrusted commands, remote resources,
   unbounded macro expansion, and pathological sizes remain disabled/capped.
2. **Mermaid diagrams** — fenced `mermaid` blocks render locally and lazily,
   obey Atomik light/dark tokens, remain editable as source, expose an
   accessible description/source fallback, and run with strict HTML/click/link
   behavior plus text/edge/time/size limits.
3. **Vega-Lite charts** — fenced `vega-lite`/`vl` JSON renders locally and
   lazily with inline data only. URL-backed data/config/patch loading and
   external action links are rejected; malformed or over-budget specs remain
   readable as source with a diagnostic.
4. **Renderer registry, not “all DSLs”** — one typed, lazy, bounded adapter
   contract owns render, cancellation, diagnostics, theme, accessibility, and
   source fallback. Unknown fences remain ordinary code. Graphviz, WaveDrom,
   PlantUML, Typst, and other candidates require later evidence-backed adapter
   additions; this path does not make an unbounded compatibility promise.
5. **Best-in-class fenced code presentation** — extend the current installed
   JS/TS/HTML/CSS parsers through CodeMirror's dynamically loaded language-data
   registry; use a fine-grained lazy Shiki seat for VS Code-quality read-mode
   highlighting; add language/copy/wrap-or-expand/source affordances without
   changing the fenced bytes.
6. **Decoration-only diagnostics** — CodeMirror lint-style ranges may show
   severity squiggles, a problem count/gutter cue, and a keyboard-accessible
   diagnostic message. The internal shape stays compatible with LSP
   diagnostics, but this path adds no language-server subprocess or protocol
   transport and no completion, signature help, protocol hover, definition,
   references, rename, formatting, code actions, or workspace indexing.
   Parser/local-analyzer feedback is honest: no provider means no invented
   diagnostic.
7. **Read/live/source parity** — rendered blocks replace source only away from
   the active editing range. Selecting/touching a block reveals its Markdown;
   source mode is always raw. Rendering is a disposable projection and cannot
   mutate note bytes.

## Architecture boundary

This is rich **Markdown rendering**, not implementation of the Atomik DSL.
Bedrock 19 and ADR-010 reserve Atomik scenes for a parser → AST → validator →
Scene IR → studio renderer pipeline with truth/provenance and semantic editing.
Third-party math/diagram/chart renderers remain isolated projections over
human-readable fenced source. S01 records that distinction and the dependency,
security, performance, and rollback decisions in a dedicated ADR before code.

## Current implementation pins

- `noteMarkdown()` is the single synchronous MarkdownIt factory used by every
  read/AI-preview surface. It has raw HTML disabled and no math, diagram, chart,
  or syntax-highlight renderer.
- Live/source CodeMirror already mounts nested language parsers for
  JS/TS/JSX/TSX/HTML/CSS. Its own comment names `@codemirror/language-data` as
  the deferred registry seam; unknown fences are plain mono.
- Live preview folds fence markers but does not replace a fenced body with a
  diagram/chart widget. It already has the active-range convention this path
  must preserve.
- No LSP client, language-server process seat, renderer registry, Shiki,
  KaTeX, Mermaid, Vega, or Vega-Lite dependency exists.

## Parallel-path overlap

CP-MVP-010 is still running and is at its closing bench. It already rebased
CP-FEEDBACK and overlaps `styles.css`, editor tests/module notes, and adjacent
chat/citation presentation—not the math/DSL contract. CP-RICH-MARKDOWN declares
the overlap, rebases after that path self-merges, and resolves shared prose and
tokens without absorbing retrieval work.

## State

Opening check accepted. CP-RICH-MARKDOWN may activate on branch
`path/cp-rich-markdown` in its own worktree.
