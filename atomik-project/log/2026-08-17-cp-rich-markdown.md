---
type: Atomik Journal Entry
title: CP-RICH-MARKDOWN — a rich reading surface, and the bench that proved it
timestamp: 2026-08-17T00:00:00Z
atomik:
  path: CP-RICH-MARKDOWN
  step: S08
---

# CP-RICH-MARKDOWN — a rich reading surface, and the bench that proved it

Made technical Markdown read as richly as it is authored, without turning a
note into executable or hidden state:

1. One typed projection registry owns every rich block's lifecycle — normalized
   fence aliases, lazy adapters behind local dynamic imports, cancellation and
   stale-result suppression, theme input, budgets, accessible diagnostics, a
   source fallback, and mandatory teardown. Read surfaces and live CodeMirror
   widgets mount the SAME request; source mode stays raw. Raw Markdown remains
   canonical and byte-stable throughout.
2. Four adapters land on it: KaTeX with HTML+MathML and per-expression macro
   isolation, Mermaid with strict security and a parsed/re-imported SVG rather
   than an assigned string, Vega-Lite restricted to inline data with URL-backed
   sources and external actions refused before render, and fenced code with
   exact lazy CodeMirror grammars plus fine-grained Shiki highlighting.
3. Code feedback stops at decoration. Bounded local parser diagnostics map from
   a fence's virtual range back to raw note offsets;
   `CODE_FEEDBACK_CAPABILITIES` makes the no-LSP boundary executable and its
   test requires every other capability to stay false.

## What this path actually taught

The first six steps shipped with every gate green — protocol, typecheck, 984
tests, build — and two of the three renderers had NEVER rendered. The unit
suite runs on linkedom: no CSS engine, no Content Security Policy. It could not
see that Mermaid was being handed `light-dark(...)` its parser rejects, or that
Vega compiles expressions with `Function(...)` the renderer CSP forbids.

The owner's first bench found six defects in an afternoon. Every one was the
same shape: a SECOND definition of something that already had one — two
adapters re-reading colours the engine resolves, three disagreeing definitions
of which themes are dark, a second clipboard missing the failure case that
actually occurs, and live inventing its own block spacing while read had been
source-true since S05o.

So the path closed with the guards that make the class mechanical rather than
lucky: `smoke:rich` runs the real adapters in real Electron and asserts each
one drew its actual shape, plus teardown, responsiveness and the accessibility
floors; `bench:rich` makes S01's deleted baseline re-runnable and fails past a
+10% ceiling. Both were validated by breaking the code and watching them fail —
`smoke:rich` reproduces the owner's two error strings verbatim.

The standing rule, now in ADR-014 §8: **a passing suite is not evidence that a
renderer renders.** Bench the real app, early.

## Deliberately left

Full LSP, code execution, notebooks, remote data loading, raw HTML, and any
renderer-originated network access remain excluded. The Atomik DSL / Scene IR
stays distinct from these third-party projections (19, ADR-010). A real
screen-reader pass is the one definition-of-done line no machine closed here.
