---
{
  "id": "36-ui-design-system",
  "title": "UI design system — organic future, zen minimalism, glass chrome",
  "status": "foundational",
  "tags": [
    "ui",
    "design-system",
    "tokens",
    "themes",
    "accessibility",
    "css",
    "workbench"
  ],
  "relations": [
    { "to": "01-workbench-first", "kind": "serves" },
    { "to": "03-workspace-tabs", "kind": "styles" },
    { "to": "13-electron-security", "kind": "constrained-by" },
    { "to": "15-maintainability", "kind": "enforces" },
    { "to": "17-self-evolving-docs", "kind": "governed-by" }
  ],
  "agent": {
    "purpose": "Give every UI change one visual doctrine — tokens, themes, component rules, and accessibility floors — so interfaces built by different sessions read as one product.",
    "inputs": [
      "UI change",
      "new component",
      "new view",
      "theme work",
      "styles.css edit"
    ],
    "outputs": [
      "token-conformant styles",
      "accessible controls",
      "theme-safe colors",
      "consistent bars and controls"
    ],
    "invariants": [
      "Any work unit that touches renderer markup or styles reads this page first; deviations are recorded in the unit, never silent.",
      "Chrome consumes tokens, never raw values; a new literal in styles.css outside the token blocks is a defect.",
      "Content is opaque; translucency lives in chrome and overlays only.",
      "Every interactive control has an accessible name; icon-only controls carry aria-label + title.",
      "Same role, same box: bars share --bar-h and --gutter; in-bar controls share --control-h.",
      "Semantic state colors come from the --error/--warn/--ok/--info families in every theme.",
      "backdrop-filter is reserved for small overlays; standing chrome uses alpha tints only (software-GL budget)."
    ]
  }
}
---

# UI design system — organic future, zen minimalism, glass chrome

## Identity (owner decisions, 2026-07-21)

Recorded from the owner's taste interview at the S07 bench:

```text
reference feel   macOS / Apple glass — content opaque, chrome and
                 overlays subtly translucent
color family     "all four" organic-future directions, as themes:
                 sage & stone · eucalyptus & fog · moss & charcoal ·
                 bioluminescent
density          balanced — disciplined compactness in chrome,
                 air in content
translucency     chrome + overlays; NEVER the reading surface
character        zen, minimalist, organic-future: calm geometry,
                 curved attachments, quiet color, one accent voice
```

## The two-surface doctrine (standing, extended)

`--bg` is CHROME (window shell, tabstrip, tree panels, media stage);
`--surface` is the CONTENT COLUMN (editors, viewers, popover bodies,
and the column's own header bars). The displayed tab of every pane
wears `--surface` and attaches to it with curved shoulders; the
focused pane adds the accent top line. Ladder order per scheme:
light `chrome < code-bg < surface`; dark `chrome < surface < code-bg`.

## Tokens (the only vocabulary chrome may speak)

Defined in `:root` of `apps/desktop/renderer/src/styles.css`. New
chrome styling MUST consume these; content typography keeps its own
`--note-*` family.

```text
type scale      --fs-xs 0.7 · --fs-sm 0.75 · --fs-md 0.8 · --fs-lg 0.85 (rem)
space scale     --space-1 0.15 · --space-2 0.3 · --space-3 0.5 ·
                --space-4 0.75 · --space-5 1 (rem)
radius scale    --radius-sm 4px · --radius-md 6px · --radius-lg 8px ·
                --radius-pill 999px · --tab-r 9px (tab tops + shoulders)
boxes           --bar-h (every bar) · --control-h (every in-bar control) ·
                --gutter (every bar's horizontal padding)
z tiers         --z-bar 1 · --z-float 5 · --z-pop 40 · --z-menu 60
                (native WebContentsViews paint over ALL renderer z —
                overlay coordination happens via the web-overlay guard,
                never via z escalation)
elevation       --shadow-pop (one popup shadow, not per-popup ad hoc)
state colors    --error/-bg · --warn-fg/bg/border · --ok-fg/bg/border ·
                --info-fg/bg/border (semantic, theme-overridable)
glass           --glass-chrome (alpha bg tint) · --glass-pop
                (alpha surface tint for overlays)
```

## Component rules

```text
bars        min-height --bar-h, box-sizing border-box, padding
            --space-1 --gutter, hairline border-bottom, font --fs-md;
            content-column bars wear --surface, chrome bars wear the
            glass chrome tint; start-aligned, actions pinned right
controls    every in-bar control sits in a --control-h box, centered
            with inline-flex; one hover language (code-bg wash or
            accent border), one focus language (1px accent outline)
buttons     chrome VERBS are SVG icons from icons.tsx (16 viewBox,
            stroke 1.3, aria-hidden) inside .icon-button, with
            aria-label + title; PRIMARY/destructive actions keep
            sentence-case text labels ("Save", "Delete extraction…");
            busy states keep a stable width, never a morphing label
pills       one .note-bar-button/.pill recipe (radius-pill, --fs-sm);
            no new pill forks — extend with modifiers
tabs        connected-tab shape: --tab-r top radius, curved shoulders
            into the surface, separator drawn as a breakable layer;
            active = the pane's DISPLAYED tab; focus = accent top line
inputs      background one step below their container (--bg on
            surface, never same-on-same), radius-md, accent focus
            outline, always an accessible name (aria-label — a
            placeholder is not a name)
popovers    --glass-pop + backdrop blur, radius-lg, --shadow-pop,
            registered with the web-overlay guard when they can open
            over a native web view
trees       folder and note rows share one row box and one left edge;
            row text --fs-md, section labels --fs-xs uppercase
```

## Glass (the macOS identity, budgeted)

```text
standing chrome   alpha tint ONLY (--glass-chrome over the body wash):
                  no backdrop-filter — WSLg renders software GL and
                  the perf audit made large blurs a named cost
overlays          real frosted glass: --glass-pop + backdrop-filter
                  blur(14px) saturate(1.15) — small areas only
                  (menus, popovers, dialogs)
content           100% opaque, always (reading is sacred)
fallbacks         @supports not (backdrop-filter) → opaque --surface;
                  prefers-reduced-transparency → opaque everywhere
floors            text containers keep ≥ 86% opacity tints; body text
                  never sits on less
```

## Theme family (organic future)

Four canonical themes over the same token contract — each keeps the
surface ladder ordered and the state-color families legible:

```text
sage-stone     light · warm grey-green neutrals, moss accent — the
               refined evolution of the original green
eucalyptus     light · cool misty eucalyptus + silver fog — spa-bright
moss           dark · warm charcoal + bark neutrals, lichen accent
biolum         dark · deep blue-grey base, luminous green-cyan accent —
               the most "future" voice
```

`light`/`dark`/`system` remain the neutral bases. The pre-system
pastels (green/blue/orange/grey/pink) are LEGACY: kept until the owner
prunes them at a bench, not to be extended.

## Accessibility floors

```text
names       every control announces a real name (aria-label on
            icon-only; never a bare glyph)
contrast    ≥ 4.5:1 body text, ≥ 3:1 large text and UI glyphs,
            in EVERY theme including glass tints
keyboard    menus/popovers close on Escape; forms submit on Enter;
            focus visible via the accent outline
state       toggles expose aria-pressed; tab structure exposes the
            active tab programmatically
```

## The automatic contract

- `AGENTS.md` names this page: UI work reads it before editing.
- A UI work unit's definition of done includes: tokens consumed (no
  new literals), names on new controls, both light and dark themes
  checked, deviation recorded if any rule is knowingly broken.
- The 2026-07-21 audit reports (scratchpad `audit-styles.md`,
  `audit-markup.md`) are the backlog's origin; remaining consolidation
  items live in the CP-MVP-007 ledger (S07n feed).

## Deviations register (running)

- Tabstrip keeps its own inner geometry (shoulder padding) instead of
  `--gutter` — the connected-tab optics own that spacing.
- `.mode-switch` and AI presets keep lowercase labels as deliberate
  "token style" vocabulary — declared, not accidental.
- Pointer-only pane dividers (no keyboard resize yet) — accepted debt,
  revisit with the accessibility pass.
