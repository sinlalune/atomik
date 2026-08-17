---
type: Atomik Session Record
title: CP-RICH-MARKDOWN S07 — first owner bench, and the three defects it found
timestamp: 2026-08-17T00:00:00Z
tags: [rich-markdown, bench, mermaid, vega-lite, csp, theme, regression]
path: CP-RICH-MARKDOWN
branch: path/cp-rich-markdown
start_head: b9d54b3
---

# CP-RICH-MARKDOWN S07 owner bench

## Why this session exists

The owner reported, at the start of the session: *"I didn't have any bench since
the start of the path."* True, and not an oversight in the ledger — the app
could not start. `node_modules/electron` had no `dist/` and no `path.txt` in
either working tree, so `npm run dev` died with `Error: Electron uninstall`.
Electron's postinstall had never unpacked. The exact build
(`electron-v43.0.0-linux-x64`) was already in `~/.cache/electron` from
2026-07-06, so it was unpacked from cache — no download, no version change,
nothing added to the repository.

**Six steps of renderers shipped without once being looked at.** Every gate was
green throughout. Two of the three renderers had never rendered.

## Bench setup

```text
lane    ATOMIK_LANE=rich-markdown, ATOMIK_LANE_PORT=5180
vault   ~/vault-rich-markdown-bench   (fresh; the owner's vault untouched)
notes   00 Bench guide, 01 Math, 02 Diagrams, 03 Charts, 04 Code, 05 Edge cases
```

The notes state expected behavior per block so the owner can judge without
reading code, and include the path's own security claims as probes (Mermaid
click handler and HTML label, Vega `url` dataset and action links, `<img
onerror>` inside a code fence).

## What the bench found

### 1. Mermaid refused every themed diagram

```text
mermaid: Unsupported color format: "light-dark(#fbfbf9, #1e1e23)"; source shown.
```

The design system states every color as `light-dark(...)` (36) and derives
shades with `color-mix(...)`. The adapter read those custom properties and
handed the UNRESOLVED text to Mermaid's JS color parser. `color-mix()` would
have broken next for the same reason.

### 2. Vega-Lite refused every chart

```text
vega-lite: Evaluating a string as JavaScript violates the following Content
Security Policy directive because 'unsafe-eval' is not an allowed source of
script: script-src 'self'. ; source shown.
```

Vega compiles chart expressions with `Function(...)`. The renderer CSP forbids
it, correctly, and is not negotiable over untrusted note content.

### 3. Code rendered dark-on-dark in two themes

Owner: *"only code decoration stay dark for plain character in other dark theme
than 'Dark'."* Dark-ness had three definitions that disagreed:

```text
styles.css     5 themes declare color-scheme: dark        ← the truth
hydration.ts   allowlist of 3 — no `ember`, no `hearth`
EditorPane     `appTheme === 'dark'` only — the other four kept the LIGHT
               CodeMirror theme, so unhighlighted text sat near-black on
               a near-black surface
```

### 4. Charts ignored the theme entirely (found while fixing 1–3)

Vega's palette accepted a token only if it was already plain hex, so every
`light-dark()` token failed and charts drew in pinned defaults. Silent, and
unobservable until charts rendered at all.

## Fixes

- `adapters/css-color.ts` — new, the single place a token becomes a color.
  Resolves through a hidden probe INSIDE the render host, where `color-scheme`
  and `[data-theme]` apply; returns `rgb()`, with `toHexColor` narrowing for
  Vega's integer hex arithmetic. Mermaid and Vega both use it; the duplicate
  resolver added to `mermaid-core.ts` earlier in the session was folded into it.
- `adapters/vega-lite.ts` — `vega.parse(spec, {}, { ast: true })` plus
  `expressionInterpreter` from `vega-interpreter` 2.3.2 (BSD-3-Clause, one
  dependency the tree already carries; `npm audit` shows the same 4 inherited
  highs, zero delta). Expression text is never turned into executable code.
- `rich-markdown/theme.ts` — new, one definition of dark-ness for the rich
  renderers AND `EditorPane`'s CodeMirror theme. Asks the engine for the
  computed `color-scheme` first; the mirrored set is only for engine-less
  environments.

## The finding under the findings

**A passing suite is not evidence that a renderer renders.**

Tests run on linkedom, which has no `getComputedStyle` at all and enforces no
CSP. Both defects passed the full suite identically before and after the fix.
Each regression was therefore rewritten to install the engine surface the
adapter actually talks to, then verified by reverting the fix and watching it
fail — the Mermaid pair reproduces the owner's exact error string, and the
chart palette test fails on the pre-fix hex-only reader.

This is the strongest argument the path has produced for its own S07: coverage
was never the missing thing. A real bench was.

## Verification

```text
focused    tests/rich-markdown.test.ts     53 passed (45 at S06 + 8)
full       75 files                        992 passed + 1 skipped
typecheck  PASS
```

Regressions added: `light-dark()` never reaching the Mermaid config; the
resolved color being used rather than the authored expression; the probe never
outliving the call; `dark-themes-match-stylesheet` (parses `styles.css`);
engine `color-scheme` preferred over the mirrored set; the mirrored fallback;
`toHexColor` across `rgb()`/`rgba()`/space-separated/percentage/short-hex and
unresolved input; charts following the resolved theme; and Vega's AST +
interpreter wiring.

## Still open

- The bench stopped after 02 and 03. Notes 01 (math), 04 (code) and 05 (edge
  cases) are unexercised, as are every security probe and the byte-stability
  check. Baseline checksums for all seven bench notes were taken before launch.
- Whether S07 should add a smoke lane that runs the renderers in real Electron
  rather than linkedom — the only mechanical guard against this defect class.
- `/home/toure/projects/4tom1k` (the trunk the owner dogfoods) still has the
  unpacked-Electron problem; left untouched deliberately, one writer per tree.
