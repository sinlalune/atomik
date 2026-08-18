---
type: Atomik Session Record
title: CP-RICH-MARKDOWN S05 — secure lazy inline-data Vega-Lite projection
timestamp: 2026-08-17T00:00:00Z
tags: [rich-markdown, vega-lite, vega, charts, security, accessibility, performance]
path: CP-RICH-MARKDOWN
branch: path/cp-rich-markdown
start_head: 66c7bda
---

# CP-RICH-MARKDOWN S05 Vega-Lite

## Result

S05 connects pinned Vega-Lite 6.4.3 and Vega 6.4.0 to the shared renderer for
read and live Markdown. `vega-lite`, `vegalite`, and `vl` fences with bounded
structured inline data become accessible static SVG. Raw JSON stays canonical;
invalid, external, generated, oversized, timed-out, cancelled, or unsafe charts
return to escaped source with the host's text diagnostic.

S06 is now active: broad lazy code presentation and decoration-only diagnostic
feedback, with every non-decoration LSP capability remaining excluded.

## Implementation shape

- `vega-lite-core.ts` is runtime-free and injected in tests. It owns JSON/data
  admission, structural budgets, token theme defaults, the deny-all loader,
  view lifecycle, output limits, and the shared SVG postflight call.
- The registry loads the small `vega-lite.ts` adapter for an accepted fence.
  Its second dynamic boundary imports `vega-lite` and `vega` only after the
  core has parsed and completely preflighted the source. A bad chart never
  evaluates either heavy runtime.
- Only one JSON object is accepted. Hard ceilings are 256 KiB source/string
  bytes, depth 32, 50,000 properties, 5,000 inline rows/collection entries,
  100,000 primitive cells, and 2 MiB SVG. Caller budgets may lower but cannot
  raise these limits.
- Data is structured inline `data.values` or a reference resolved against
  top-level inline `datasets`. Nested arrays are included in row accounting.
  Encoded CSV/DSV text is deliberately excluded because its true rows/cells
  cannot be bounded before a parser runs.
- The policy rejects URL/generated/unresolved data, nested dataset registries,
  image marks, href/url channels, loaders, patches, action/export keys, and
  bound controls. It stops capability scanning inside admitted records, so
  columns named `url`, `href`, and `data` remain ordinary values.
- The adapter calls `vega-lite.compile`, `vega.parse`, then constructs
  `vega.View` directly with `renderer: 'svg'`, `hover: false`, and denied
  `load`/`sanitize`/`http`/`file` methods. `vega-embed` is absent.
- An abort listener finalizes an in-flight View on timeout, replacement, or
  unmount. A `finally` path finalizes exactly once on success and every
  runtime/output/postflight error. The successful handle owns only the
  sanitized static SVG node.
- Read and live reuse the same hydrator, theme, source fallback, and 128-block
  budget. Touching/clicking a live chart reveals its exact fence bytes. Chart
  SVG shares Mermaid's responsive opaque surface and reduced-motion rule.

## Security invariants proved

```text
accepted root             one parsed JSON object
data authority            structured inline values/top-level datasets only
named data                must resolve to admitted top-level inline data
external/generated data   rejected before runtime import
image/href/url channels   rejected before runtime import
embed actions/bindings    absent and rejected
View renderer             SVG
View hover binding        false
loader methods            all deny
view.finalize             success + error + abort, exactly once
raw SVG string sink       none on the note surface
```

The shared `safe-svg.ts` postflight still rejects foreign/scriptable/resource
content, base URLs, active CSS and non-fragment references; removes events and
navigation; namespaces IDs; and adds or preserves title/description plus
`role="img"`. Identical charts in different hydration generations cannot
collide in one renderer document.

## Runtime package smoke

The focused suite renders a real inline bar spec through the built-in registry,
pinned compiler, pinned runtime, headless SVG View, shared sanitizer, and
hydration disposer. The result contains visible Vega geometry, an accessible
title, no `<image>`, and no anchor. A direct pinned-package smoke measured:

```text
serialized SVG    7,614 bytes
image element     absent
external href     absent
finalize          completed
```

The injected runtime tests separately prove that all four loader methods
reject and that finalization happens immediately during an in-flight abort.

## Verification

Focused gate:

```text
tests/note-markdown.test.ts    19 passed
tests/live-preview.test.ts     38 passed
tests/rich-markdown.test.ts    35 passed
total                           92 passed
typecheck                       pass
```

Bare integrated gate:

```bash
npm run cairn-check && npm run typecheck && npm test && npm run build
```

Result:

```text
cairn       PASS — expected closure-only coherence-audit advisory
typecheck   PASS
tests       PASS — 75 files / 974 passed + 1 skipped
build       PASS — 2,558 renderer modules transformed
```

Focused coverage includes real package compatibility, aliases, read hydration,
live theme/source reveal, three-renderer shared cap, structured/named data,
record-field/capability separation, malformed roots, source/depth/property/
row/cell hard limits, pre-import security rejection, encoded-data rejection,
light/dark tokens, loader denial, SVG accessibility/sanitization, output caps,
runtime failures, cancellation, immediate and idempotent finalization, and
disposal.

## Production output

| Asset | S05 bytes | Delta from S04 |
| --- | ---: | ---: |
| eager renderer entry | 2,383,608 | +443 |
| global renderer CSS | 136,043 | +271 |
| Vega policy/lifecycle adapter (lazy) | 15,357 | new lazy chunk |
| Vega-Lite compiler (second-stage lazy) | 618,083 | new lazy chunk |
| Vega runtime (second-stage lazy) | 940,911 | new lazy chunk |

The 15,357-byte adapter imports the compiler/runtime chunks through a static
second-stage dependency map only after validation. Mermaid and KaTeX retain
their own lazy chunks. The eager entry is +54,110 B from S01's 2,329,498-byte
baseline, still well inside the +150 KiB closure ceiling.

## Deferred deliberately

- Rapid edit/theme/tab stress and owner visual/keyboard/screen-reader benches
  remain S07/S08; S05 supplies deterministic real-runtime and lifecycle proof.
- Broad CodeMirror language loading, fine-grained Shiki read presentation, code
  block controls, and decoration-only parser/analyzer diagnostics belong to
  S06.
- Vega interactions, remote datasets, image marks, export actions, embed
  controls, code execution, and persisted chart state remain excluded.
