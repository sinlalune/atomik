---
type: Atomik Session Record
title: CP-UI-TYPOGRAPHY opening check — one proportional face, defined once
timestamp: 2026-08-27T00:00:00Z
tags: [opening-check, ui, typography, design-system, dogfooding]
path: CP-UI-TYPOGRAPHY
branch: path/cp-ui-typography
ceremony: opening
---

# CP-UI-TYPOGRAPHY opening check

Opened from owner feedback while reviewing the Cairn reader built in CP-OPS-002
S07o/S07p:

> "i LOVE this font can we use the same in atomik ?"

Revised 2026-08-27 after PR review found two defects in the first draft of this
note. Both are recorded below rather than silently corrected, because the second
one changed the accepted scope.

## Correction 1 — "the only `font-family` declaration" was false

The first draft stated that `apps/desktop/renderer/src/styles.css:3` is the only
`font-family` declaration in the file. It is not. The proportional stack is
written out **four** times:

| Line | Selector | What it is |
| --: | :-- | :-- |
| 3 | `:root` | the document default every surface inherits |
| 2438 | `.editor-host.live .cm-scroller` | the **live editor**, escaping the monospace set at 2347 |
| 2554 | `.editor-host .lp-rich-limit` | a notice label inside live preview |
| 5213 | `.cm-inline-ai-rendered` | the inline AI widget, escaping the same monospace |

The claim came from a `grep … | head -40`, whose truncation hid the other three,
and it was written down as a measured fact. That is the failure this repository
already names twice — a check whose output is piped and then trusted.

Changing only `:root` would have moved rendered notes to the new face while
leaving the live editor at 2438 on the old one. The stylesheet forbids exactly
that, twice, in its own words:

> `.note-scroll/.markdown-body`, **so read <-> live never shifts the text**
> — comment at line 2444

> the READ view and the LIVE view both consume THESE, **never their own
> copies**: a value changed here moves both modes together, so read <-> live
> stays a seamless transition by construction
> — the `--note-*` token block, line 36

So the four literals are already a standing violation of the file's own rule.
This path does not merely avoid adding a fifth; it removes the four.

## Correction 2 — four of the five accepted properties do nothing

The first draft told the owner that five rendering properties "are what actually
produce the look", and the scope was chosen on that basis. Measured in Electron
on this host, rather than asserted:

**Text advance**, one 65-character line at 16px:

| Declaration | Width | vs. new stack |
| :-- | --: | :-- |
| old stack | 555.063 px | same |
| new stack | 555.063 px | — |
| `+ -webkit-font-smoothing: antialiased` | 555.063 px | same |
| `+ text-rendering: optimizeLegibility` | 555.063 px | same |
| `+ font-optical-sizing: auto` | 555.063 px | same |
| `+ letter-spacing: -0.003em` | 552.141 px | **−2.922 px** |

**Rendered pixels**, same paragraph captured per variant, SHA-256 of the PNG:

```text
plain              9b74f4b7d2406d49
webkit-smoothing   9b74f4b7d2406d49
moz-smoothing      9b74f4b7d2406d49
text-rendering     9b74f4b7d2406d49
optical-sizing     9b74f4b7d2406d49
```

Byte-identical. The four are inert here, and each for a knowable reason:
`-webkit-font-smoothing` and `-moz-osx-font-smoothing` are macOS-only,
`font-optical-sizing: auto` is the CSS **initial value**, and
`text-rendering: optimizeLegibility` only forces on the kerning and standard
ligatures Chromium already applies. Shipping them would be dead CSS.

`letter-spacing` is the one that does something, and what it does is change
metrics — roughly 0.5% narrower, which re-wraps existing notes. It also lands on
content typography, which `docs/bedrock/36_36-ui-design-system.md` keeps
deliberately separate from chrome:

> New chrome styling MUST consume these; **content typography keeps its own
> `--note-*` family**.

The PR reviewer raised both points independently, and both hold.

## What is actually different, then

Read with CDP `CSS.getPlatformFontsForNode`, not inferred from the stack: on
this WSL host every proportional stack in play resolves to **DejaVu Sans** —
Inter is not installed and `system-ui` maps to DejaVu through fontconfig.

On Windows 11 they diverge for one reason: the reader's stack puts
`ui-sans-serif` and `"Segoe UI Variable Text"` **ahead of** `"Segoe UI"`, so it
is served Segoe UI Variable while the app is served Segoe UI.

**The family is the whole of the visible change, and it is visible on Windows
only.** On Linux this path changes no pixels; what it changes there is that the
face is defined once instead of four times.

## Feature check — revised ruling

Owner accepted "stack plus rendering settings" against the first draft's claim
that the five properties mattered. That claim was wrong, so the accepted scope
reduces to the half that survives measurement, plus the three declarations
parity requires.

| Option | Ruling |
| :-- | :-- |
| `:root` only | **rejected** — leaves the live editor on the old face and breaks the read/live invariant at line 2444 |
| **The stack, at all four sites, through one token** | **accepted** |
| The four inert rendering properties | **dropped** — measured byte-identical; dead CSS |
| `letter-spacing` at `:root` | **dropped** — the only metric change, re-wraps existing notes, and crosses the chrome/content line bedrock 36 draws |
| Note heading tracking retune | rejected, unchanged from the first ruling |
| Bundling Inter as a local asset | rejected for now — ~350 KB and an OFL obligation |

## How

`--note-text-font` joins the `--note-*` block as the proportional counterpart of
the `--note-code-font` already there, and all four sites consume it.

This needs no change to `docs/bedrock/36_36-ui-design-system.md`: that page
enumerates the chrome vocabulary and then explicitly delegates content
typography to the `--note-*` family without enumerating it. A new **chrome**
token would have been an architecture change and would have forced `route: full`;
a new `--note-*` token is the contract working as written.

`font-family: inherit` was considered instead of a token and rejected: it is
correct at 2438, whose parent chain reaches `:root`, and **wrong** at 5213, whose
parent is the monospace `.cm-scroller`. The comment there records the bug that
produced — S05f, bold and italic faces vanishing under WSLg. One token is right
at all four sites; `inherit` is right at two of them.

## Definition of done

1. `--note-text-font` defined once; lines 3, 2438, 2554 and 5213 consume it.
2. A test asserts the token is defined **and** that no proportional stack literal
   survives anywhere in the stylesheet, so the duplication cannot silently return.
3. `docs/modules/atomik-desktop.md` records the measurement — the four sites, the
   inert properties, and the DejaVu finding — so nobody re-derives it.
4. `npm run cairn-check`, `typecheck`, `test`, `build` green.

## Deliberately excluded

`letter-spacing` anywhere, the four inert properties, note heading tracking, the
`--fs-*` chrome scale, bundling a font file, and dark-mode colour. The monospace
stack is untouched: it is already single-sourced at `--note-code-font` for note
code, and its remaining literals are a separate cleanup this path does not claim.

## Boundaries

- `apps/desktop/renderer/src/styles.css` is also declared by **CP-MVP-011**.
  Advisory overlap, not a lock: this path writes the `--note-*` block and four
  font-family lines. Whichever integrates second rebases.
- `docs/bedrock/36_36-ui-design-system.md` governs and is **not** written.
