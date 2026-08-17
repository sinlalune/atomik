---
type: Atomik Session Record
title: CP-RICH-MARKDOWN S06 — rich fenced code and decoration-only diagnostics
timestamp: 2026-08-17T00:00:00Z
tags: [rich-markdown, code, shiki, codemirror, diagnostics, accessibility, performance]
path: CP-RICH-MARKDOWN
branch: path/cp-rich-markdown
start_head: 9ccc036
---

# CP-RICH-MARKDOWN S06 code and diagnostics

## Result

S06 replaces the six fixed nested CodeMirror grammars with exact lazy
`@codemirror/language-data`, gives every ordinary read/untouched-live fence a
source-faithful rich code frame, and adds bounded local parser diagnostics as
decorations only. Known fences receive fine-grained lazy Shiki highlighting;
unknown fences remain escaped plain code. Raw Markdown is unchanged and a
failed, cancelled, unknown, or over-budget provider never hides source.

S07 is now active: parity, lifecycle, stress, responsive/accessibility, and
performance hardening. No language notes, dock/open, PDF, or full-LSP scope was
pulled forward.

## Implementation shape

- `code-languages.ts` resolves the pinned CodeMirror catalog by exact
  name/alias and exact extension with fuzzy matching disabled. The catalog's
  metadata is synchronous; every grammar remains behind its description's
  lazy loader. `script`, misspellings, and unknown DSLs stay plain. The three
  obsolete direct CSS/HTML/JavaScript language dependencies are removed from
  the app manifest; language-data continues to own them transitively.
- `markdown-plugin.ts` emits an escaped inert `code` placeholder for every
  ordinary fence. The existing hydrator owns read output; live mode replaces
  only untouched fence ranges and reveals the raw nested CodeMirror source on
  touch. Code joins math/Mermaid/Vega-Lite under the shared 128-block cap.
- `code.ts` contains an explicit 37-language Shiki map and static dynamic
  subpath imports. It uses fine-grained core, the JavaScript regex engine, and
  GitHub default light/dark themes. Grammar loads serialize, cache, and retry;
  one registry-owned highlighter disposes explicitly. The full/web bundles,
  Oniguruma Wasm, experimental precompiled grammars, and Twoslash are absent.
- `code-core.ts` never consumes Shiki HTML. It reconstructs spans from authored
  source offsets using `textContent`, admits only hex colors and documented
  font-style bits, and falls back to exact plain source. The semantic code
  group/header exposes language, problem count, Copy, source/highlight,
  wrap/unwrap, and expand/collapse with native buttons, names, titles, pressed
  states, focus treatment, responsive layout, and authored-source-only copy.
- `code-diagnostics.ts` loads the same exact local grammar, turns bounded Lezer
  error nodes into `RichDiagnostic`, and maps fence-relative ranges to raw note
  offsets. Source mode dynamically imports `@codemirror/lint` and adds
  squiggles, gutter marks, messages, and keyboard navigation. Live/read remain
  gutter-free and show count/details in block chrome.
- Per-block diagnostics cap at 100, analyzable blocks at 64, and document
  results at 200. Oversized input and the first omitted block receive visible
  information diagnostics rather than silent work loss.

## Decoration-only capability pin

```text
enabled              parser diagnostics and their visual/accessibility UI
diagnostic actions   false
server/process       no discovery, spawn, protocol, or transport
virtual workspace    false
language assistance  no completion/signature/hover/navigation/symbols
editing operations   no rename/format/code action/workspace edit
semantic IDE data    no semantic tokens/inlay hints/hierarchies/index
execution/network    none
```

`CODE_FEEDBACK_CAPABILITIES` makes this boundary executable and its regression
test requires every entry except `diagnostics` to remain false. Mapped
diagnostics have no `actions` property.

## Security and source fidelity

- The synchronous sink is still Markdown-it `escapeHtml`; token spans use DOM
  text nodes and authored slices. A code string containing an `<img onerror>`
  creates no image/script node in the real Shiki hydration test.
- Copy closes over `request.source`; it cannot capture header/status text or a
  normalized DOM representation. Late clipboard completion cannot mutate a
  disposed frame.
- Unknown languages do not load Shiki. A provider failure returns escaped
  source plus `highlight-unavailable`; source/line limits return plain source
  plus `highlight-limit`.
- The adapter receives source, info, theme, budgets, and an abort signal only.
  No IPC/preload bridge, vault path, generic fetch, key, file, worker, code
  execution, HTML sink, or canonical write was added.

## Verification

Focused gate:

```text
tests/note-markdown.test.ts    19 passed
tests/live-preview.test.ts     38 passed
tests/rich-markdown.test.ts    45 passed
total                          102 passed
typecheck                      pass
```

Bare integrated gate:

```bash
npm run cairn-check && npm run typecheck && npm test && npm run build
```

Result:

```text
cairn       PASS — expected closure-only coherence-audit advisory
typecheck   PASS
tests       PASS — 75 files / 984 passed + 1 skipped
build       PASS — 2,806 renderer modules transformed
```

Focused coverage pins exact CodeMirror names/extensions and fuzzy rejection,
the reviewed Shiki aliases, real package hydration, source escaping, native
controls/copy/state, unknown/over-limit/failure fallback, adapter disposal,
parser error disappearance, fence-to-note offset mapping, rich-DSL exclusion,
64-block bounds, shared live cap, and every excluded LSP-shaped capability.

## Production output

| Asset | S06 bytes | Delta from S05 |
| --- | ---: | ---: |
| eager renderer entry | 2,454,528 | +70,920 |
| global renderer CSS | 140,228 | +4,185 |
| code adapter/map (lazy) | 23,033 | new lazy chunk |
| source diagnostics/lint (lazy) | 35,017 | new lazy chunk |
| Shiki core (second-stage lazy) | 226,275 | new lazy chunk |
| Shiki JavaScript regex engine (second-stage lazy) | 111,669 | new lazy chunk |
| GitHub light/dark themes (second-stage lazy) | 14,198 / 14,475 | new lazy chunks |

The eager entry is +125,030 B from S01's 2,329,498-byte baseline, leaving
28,570 B under the +150 KiB closure ceiling. An initial build with lint loaded
eagerly measured 2,486,664 B and exceeded that ceiling by 3,566 B. Moving the
source-only diagnostic extension behind its mode compartment recovered 32,136
eager bytes without reducing grammar or diagnostic coverage. Individual Shiki
and CodeMirror grammar chunks remain on demand; ordinary startup evaluates no
Shiki runtime, theme, or grammar.

## Deferred deliberately

- Rapid edit/cancel/theme/tab stress, cache teardown, responsive visual checks,
  keyboard/screen-reader benching, and repeat/first-render timing remain S07.
- Full LSP, code actions, execution/notebooks, remote grammar/data loading, and
  persisted code-frame UI state remain excluded.
- Durable language-note siblings/translation remain the next separate path;
  open/dock/layout and PDF work remain after it in the accepted order.
