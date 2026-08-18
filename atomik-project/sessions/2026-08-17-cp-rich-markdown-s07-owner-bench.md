---
type: Atomik Session Record
title: CP-RICH-MARKDOWN S07 — first owner bench, and the six defects it found
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

### 5. Every code-block Copy failed (bench round 2, note 04)

Owner screenshot: the code frame's header showed `Copy failed`. S06 had written
a SECOND clipboard implementation in `adapters/code-core.ts`, which fell back to
`execCommand` only when `navigator.clipboard.writeText` was ABSENT. In this
Electron renderer it is PRESENT and REJECTS, so the fallback never ran.

`renderer/src/editor/clipboard.ts` — the renderer's existing helper, used by
chat, inline AI and the AI note preview — has handled exactly this since S04l,
and its own comment says so: *"the async API can reject silently; execCommand
still works."* The code frame now defers to it; the helper gained an optional
`doc` parameter so document-owning surfaces can share it. Same lesson as the
colors: the duplicate was the defect.

### 6. Read and live disagreed on block spacing (bench round 3)

Owner: *"in live mode it display naturally a space between two blocks when in
read mode if no line break the blocks are touching."* Read has been source-true
since S05o — `md-tight` when the author left no blank line, N gaps for N blank
lines, "read spacing IS the source, byte for byte". Live never got that rule:
`.lp-rich-widget--display` carried a fixed `padding-block`, so every live rich
block gained a gap the source did not contain.

Blank lines are REAL LINES in live mode and already render their own height, so
a fixed padding there can only ever disagree with the source. Removed; live is
now source-true too, and the definition of done's read/live parity holds for
spacing as well as meaning.

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
- `editor/clipboard.ts` — gained an optional `doc` parameter; the code frame's
  private implementation is gone. Declared-writes widening recorded in the
  ledger.
- `styles.css` — `.lp-rich-widget--display` no longer adds fixed vertical
  padding, so live block spacing follows the source exactly as read does.

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
focused    tests/rich-markdown.test.ts     59 passed (45 at S06 + 14)
full       75 files                        998 passed + 1 skipped
typecheck  PASS
```

Regressions added: `light-dark()` never reaching the Mermaid config; the
resolved color being used rather than the authored expression; the probe never
outliving the call; `dark-themes-match-stylesheet` (parses `styles.css`);
engine `color-scheme` preferred over the mirrored set; the mirrored fallback;
`toHexColor` across `rgb()`/`rgba()`/space-separated/percentage/short-hex and
unresolved input; charts following the resolved theme; Vega's AST + interpreter
wiring; and the clipboard falling back when the async API REJECTS rather than
only when it is absent.

## Owner verdict

Bench round 3, after the spacing fix: *"everything is good."* The six defects
above are accepted as fixed against the running app — diagrams and charts
render in every theme, code chrome and diagnostics behave, Copy lands the
authored source, and read/live spacing agree.

This is acceptance of the BENCH, not of the path: S07's hardening scope below
is still open, and the closing ceremony remains a separate event under
bedrock 22.

## Still open

- The bench covered 02, 03 and 04's chrome. Note 01 (math), 04's deliberate
  syntax errors / `<img onerror>` probe / unknown fences / wrap-expand, note 05
  (edge cases), and the Mermaid and Vega security probes were never walked. The
  owner's verdict covers what was seen, which is most of the rendering surface
  and none of the security claims.
- Byte-stability HOLDS: all six content notes are md5-identical to their
  pre-bench baseline after rendering, mode switching, theme switching and the
  owner's own edits. `index.md` changed, but by the app's `adoptVaultRoot`
  contents block on vault adoption — not a renderer rewrite.
- S07's original hardening scope is untouched: rapid edit/cancel/theme/tab
  stress, cache teardown, responsive checks, keyboard/screen-reader benching,
  and repeat/first-render timing.
- Whether S07 should add a smoke lane that runs the renderers in real Electron
  rather than linkedom — the only mechanical guard against this defect class.
- `/home/toure/projects/4tom1k` (the trunk the owner dogfoods) still has the
  unpacked-Electron problem; left untouched deliberately, one writer per tree.
