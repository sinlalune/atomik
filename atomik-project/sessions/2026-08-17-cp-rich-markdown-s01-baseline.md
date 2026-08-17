---
type: Atomik Session Record
title: CP-RICH-MARKDOWN S01 — dependency, security, and performance baseline
timestamp: 2026-08-17T00:00:00Z
tags: [rich-markdown, baseline, performance, security, dependencies]
path: CP-RICH-MARKDOWN
branch: path/cp-rich-markdown
head: eec8107
---

# CP-RICH-MARKDOWN S01 baseline

## Result

S01 completed the decision work before dependency installation or source
implementation. ADR-014 now fixes the canonical/projection boundary, the
synchronous-discovery + asynchronous-hydration seam, adapter lifecycle,
security policy, diagnostic-only scope, resource caps, and bundle/performance
budgets.

No package or source file changed in S01 by design. The next step installs only
the accepted pins while implementing the registry and source fallback.

## Repository baseline

```text
branch        path/cp-rich-markdown
activation    eec8107 CP-RICH-MARKDOWN: record opening check and activate path
path base     98561b4
node          v24.14.0
npm           11.9.0
date          2026-08-17
environment   WSL2/WSLg, prebuilt production output, warm filesystem after pass 1
```

The branch matched the path ledger and was clean before measurement.
CP-MVP-010 had not merged; its eventual editor/styles changes remain a required
step-boundary rebase, not part of this baseline.

## Bare gates

Executed exactly:

```bash
npm run cairn-check && npm run typecheck && npm test && npm run build
```

Result:

```text
cairn       PASS — one expected advisory: coherence audit belongs at closure
typecheck   PASS
tests       PASS — 68 files / 807 tests
build       PASS
```

Production output:

| Asset | Bytes | Build display |
| --- | ---: | ---: |
| renderer entry JS | 2,329,498 | 2,329.50 kB |
| renderer CSS | 123,707 | 123.71 kB |
| SourceImageView lazy JS | 873,961 | 873.96 kB |
| ImportView lazy JS | 105,302 | 105.30 kB |
| PDF worker | 1,255,067 | 1,255.07 kB |
| main entry | — | 282.11 kB |
| preload entry | — | 12.12 kB |

Renderer build: 261 modules transformed in 2.86 s. This is the exact bundle
comparison point; dependency install size is not a substitute for emitted
chunk inspection.

## Startup baseline

Method: build once, then run the real prebuilt smoke path three times with a
fresh smoke state directory per pass:

```bash
ATOMIK_SMOKE=1 ../../node_modules/.bin/electron .
```

Every pass reached:

```text
ATOMIK_SMOKE_OK atomik-desktop 0.1.0 devdocs=10groups/106files panes=1
```

| Pass | Wall | Maximum RSS reported by `time` |
| ---: | ---: | ---: |
| 1 | 3.09 s | 152,044 KiB |
| 2 | 1.74 s | 161,252 KiB |
| 3 | 1.72 s | 161,820 KiB |

Pass 1 includes cold-process/cache variance. The warm two-pass median/reference
is 1.73 s; the closure ceiling is +10% (1.90 s, rounded) unless a dated rerun
demonstrates environment noise.

## Read and live microbaseline

Method: a temporary, deleted `vite-node` script constructed deterministic
200,000 B and 1,000,000 B technical Markdown corpora containing headings,
emphasis, inline code, links, task lists, tables, TypeScript fences,
blockquotes, and semantic edges. Each operation had one warm-up; samples below
are sorted and the median is the comparison value. Large Lezer documents use
`markdownLanguage.parser.parse()` directly, preserving the 2026-07-15 audit's
recorded headless-`ensureSyntaxTree` caveat.

| Operation | 200 kB median | 1 MB median |
| --- | ---: | ---: |
| `noteMarkdown().render` (read) | 40.95 ms | 152.69 ms |
| full Lezer Markdown parse | 22.35 ms | 108.45 ms |
| full syntax-tree walk (live recompute shape) | 3.12 ms | 13.02 ms |

Samples:

```text
read_200kb       34.26 36.57 38.19 40.95 42.77 44.49 45.94
parse_200kb      20.10 20.23 21.33 22.35 23.95 24.24 27.40
walk_200kb        2.91  3.00  3.01  3.12  3.18  3.46  4.32
read_1mb        114.26 114.85 152.69 157.73 159.80
parse_1mb       101.90 107.81 108.45 117.69 123.88
walk_1mb         11.63  12.11  13.02  13.25  19.88
```

The no-rich-syntax closure target is within 10% of these medians. Adapter
benchmarks are additive and are measured separately rather than hiding their
load/compile time in this baseline.

## Registry metadata checked

Read-only `npm view` checks on 2026-08-17 established:

| Candidate | Version | License | Unpacked size | Runtime note |
| --- | ---: | --- | ---: | --- |
| KaTeX selected line | 0.16.47 | MIT | 4,037,040 B | satisfies Mermaid range |
| KaTeX registry latest | 0.18.4 | MIT | 4,034,233 B | would duplicate Mermaid's copy |
| Mermaid | 11.16.1 | MIT | 83,547,314 B | depends on `katex ^0.16.45`; lazy only |
| Vega | 6.4.0 | BSD-3-Clause | 3,727,817 B | direct View runtime |
| Vega-Lite | 6.4.3 | BSD-3-Clause | 5,814,897 B | Node >=20 |
| Shiki umbrella (not selected) | 4.4.3 | MIT | 602,856 B | pulls both engines + all catalogs |
| `@shikijs/core` | 4.4.3 | MIT | 64,493 B | Node >=20 |
| `@shikijs/engine-javascript` | 4.4.3 | MIT | 10,699 B | Node >=20 |
| `@shikijs/langs` | 4.4.3 | MIT | 8,653,550 B | selected subpaths only |
| `@shikijs/themes` | 4.4.3 | MIT | 1,479,330 B | selected subpaths only |
| CodeMirror language data | 6.5.2 | MIT | 71,718 B | dynamic language loaders |
| CodeMirror lint | 6.9.7 | MIT | 97,441 B | decorations only |

No package reported a deprecation. Exact transitive resolution and
vulnerability state are checked after lockfile installation; every emitted
chunk is inspected after each adapter step.

## Accepted package shape

```text
katex                    0.16.47
mermaid                  11.16.1
vega                     6.4.0
vega-lite                6.4.3
@shikijs/core            4.4.3
@shikijs/engine-javascript 4.4.3
@shikijs/langs           4.4.3
@shikijs/themes          4.4.3
@codemirror/language-data 6.5.2
@codemirror/lint         6.9.7
```

Explicit non-selections:

```text
no markdown-it math wrapper      delimiter/source contract stays local
no Vega-Embed                    no actions or loader wrapper
no full/web Shiki bundle         explicit fine-grained lazy modules
no Oniguruma Wasm                JavaScript engine is the browser pin
no Twoslash                      decoration-only owner ruling
no LSP client/server             no process, transport, workspace, or edit verbs
no Graphviz/WaveDrom/etc yet      later adapter evaluation, same registry
```

## Recheck triggers

- Mermaid widens its KaTeX range to 0.18 or later.
- A security advisory affects any accepted direct/transitive version.
- Electron/Node drops compatibility with a selected package engine.
- The entry chunk contains a heavy runtime or exceeds +150 KiB.
- Warm smoke exceeds 1.90 s or no-rich content exceeds +10%.
- A renderer needs network, raw HTML, generic IPC, a worker, or canonical
  sidecar state; that is a scope/architecture trigger, not an implementation
  convenience.
