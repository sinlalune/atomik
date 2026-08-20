---
type: Atomik Journal Entry
title: CP-RENDER-REPAIRS — the blocks behave like the surface promised
timestamp: 2026-08-20T00:00:00Z
atomik:
  path: CP-RENDER-REPAIRS
  step: S06
---

# CP-RENDER-REPAIRS — the blocks behave like the surface promised

CP-AI-CAPABILITIES proved that the model knew which rich projection to choose.
Its bench then exposed four Atomik defects behind that prompt: display math in
the form models naturally emit rendered as prose, Vega's own warning vanished,
app bookkeeping could name a chat file, and a Mermaid diagram could not be
explored. This labelled path repaired all four and discharged the inherited
prompt-drift obligation.

## What landed

Display math discovery now has one grammar shared by the Markdown-it and live
scanners. `$$\begin{aligned}` may open a multi-line block, a later line may
close with `\end{aligned}$$`, while `$$` in the middle of prose and unclosed
openers remain literal. The owner's indented real-note form is a fixture. The
moment that parser worked, CP-AI-CAPABILITIES' trap pin failed as designed; the
obsolete warning was deleted rather than its assertion loosened, and the
per-request block ceiling fell from 1,700 to 1,450.

Vega-Lite and Vega now receive the same small logger. Compile-time and run-time
warnings are deduplicated into the existing rich diagnostic channel, so a
chart Vega is willing to draw still renders while the reader sees why it looks
wrong. No new status UI or chart authority was created.

`chatSlug` strips HTML comments as a unit before applying its existing link and
filename rules. The observed `you-!---sent-system=…` name has a regression
fixture. A separate trace found no in-app route that feeds stamped heading
metadata into a new chat's first message: the trigger was a paste, recorded as
a negative result instead of rewritten into a provenance story.

Mermaid blocks now use the same sanitized SVG as a bounded canvas. Drag pans;
Ctrl/Cmd-wheel zooms about the pointer; a bare wheel still scrolls the note;
arrows, `+`, `-`, `0`, and visible named controls cover the same actions. Expand
moves that one SVG into a native dialog and back, avoiding duplicate IDs and
any reparse/resanitize cycle. Fit pins Mermaid's element box to its intrinsic
drawing size before transforming it; inline layout ownership prevents CSS from
centring the node a second time. Small diagrams get a compact natural height,
the overlay fills its pane, and Vega-Lite charts retain natural-width scrolling
instead of inheriting a spatial interaction model.

## What the bench taught

The first diagram implementation solved the reported width but not the intended
form. The owner clarified that the block itself should be an infinite canvas,
so the path's explicit pan/zoom exclusion was amended in writing. Two later
rounds showed that correct transform arithmetic is not enough when Mermaid's
`width="100%"` element and a higher-specificity stylesheet both own layout.
The final rule is broader than this diagram: JavaScript-driven transforms must
own every layout property their coordinates assume.

The owner accepted the final Fit, zoom, pan, page-scroll, overlay, compact
height, and icon-label checklist with: *"ok for all go for closure"*.

## Contracts and gates

ADR-014 now records both the repaired display grammar and the host-owned canvas
lifecycle. No IPC/preload/network/filesystem capability changed, no SVG guard
relaxed, and no provider fact was rechecked or introduced.

CP-OPEN-DOCK merged while this path's closing ceremony was being recorded. The
eight path commits rebased cleanly onto trunk `7f8d026`, and the combined result
passed `cairn-check`, typecheck, 78 test files / 1,101 passing / 1 skipped,
production build, and the real-Electron rich smoke (`firstRender=466ms`,
`repeatRender=285ms`).

## What remains

Vega-Lite's log-scale bar baseline and Mermaid's math-label `foreignObject`
behavior remain upstream/refused traps and stay truthfully warned about. The
coherence audit also carries two advisory process/design findings: an
imperative DOM toolbar currently owns a small static icon path table because
it cannot consume React `icons.tsx`, and trunk-derived `ACTIVE.md` cannot list
running paths whose files exist only on unmerged branches. The same Cairn gap
also makes `branch-path` reject the required final `status: done` while the
commit is still checked out on its path branch; the rebased gates ran green
before that metadata transition and the deterministic check runs again after
merge on trunk. Neither finding widens this renderer repair; both execution-
plane corrections belong to the CP-OPS-001 pilot.
