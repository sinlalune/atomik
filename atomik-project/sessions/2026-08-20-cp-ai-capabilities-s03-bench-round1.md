---
type: Atomik Session Record
title: CP-AI-CAPABILITIES S03 bench round 1 — the block worked, the renderers did not
timestamp: 2026-08-20T00:00:00Z
tags: [bench, ai, prompt, vega-lite, mermaid, katex, math, renderer]
path: CP-AI-CAPABILITIES
branch: path/cp-ai-capabilities
start_head: 35e5066
---

# CP-AI-CAPABILITIES S03 — owner bench, round 1

## Setup

```text
lane    ATOMIK_LANE=ai-capabilities, ATOMIK_LANE_PORT=5181
vault   ~/vault-ai-capabilities-bench  (fresh; Attention / Transformer / Softmax
        as pointing targets, 00 Bench guide carrying rounds A-D)
model   google gemini-3.7-flash, key already in the worktree's .atomik
```

Round A ran. Rounds B, C and D did not — round A produced enough.

## The finding that matters: the block worked

The model reached for the right projection every single time. A `mermaid`
fence for the attention flow, a `vega-lite` fence with inline `data.values`
for the parameter counts, display math for the softmax derivation. No `url`
dataset, no `click` directive, no invented fence. Before S01 it had never been
told any of this existed.

So the prompt half of the path is doing its job. What round A actually
exercised was the RENDERER — and it found three ways a correct-looking block
shows the reader nothing.

## Trap 1 — a bar mark on a log scale draws nothing

The owner's screenshot: axis titles, no y tick labels, no bars. The generated
spec was read back out of the bench chat file and is CORRECT.

Reproduced with plain `vega` + `vega-lite` in Node — no Electron, no theming,
no AST interpreter:

```text
y domain : [0,10000]
bar paths: M1,0h18v0h-18Z | M21,0h18v0h-18Z | M41,0h18v0h-18Z | M61,0h18v0h-18Z
warnings : "Log scale domain includes zero: [0,1800]"
```

All four bars are emitted with ZERO HEIGHT. A bar's baseline is zero; zero is
illegal on a log scale; the scale collapses and takes the tick labels with it.

```text
log + zero:false            still flat — Vega-Lite DROPS zero on log scales
log + explicit domain       ticks return, bars still flat
log + domain + y2 datum     correct
linear                      correct
log + point/line mark       correct
```

Upstream behaviour, not an Atomik defect. But Vega WARNED and the adapter
swallowed it, so the reader got a silent empty frame. The owner's ruling:
*"patch the prompt first a warning could be sufficient"* — the block now names
the trap; surfacing the adapter's own warnings is the follow-on.

## Trap 2 — math in a Mermaid label refuses the whole diagram

The owner asked directly: can KaTeX render inside Mermaid, e.g. a neural-net
diagram with formulas in the boxes? Traced through Mermaid 11.16.1's source:

```js
if (hasKatex(textContent)) {
  useHtmlLabels = true;      // overrides Atomik's htmlLabels: false
}
```

Mermaid force-enables HTML labels for math and emits the label inside a
`<foreignObject>`. `safe-svg.ts` lists `foreignobject` in `FORBIDDEN_ELEMENTS`
and fails the whole SVG — correctly; that guard is not negotiable over
untrusted note content, and `rich-markdown.test.ts:1050` already pins it.

**So the answer is no, and it fails whole-diagram rather than degrading.** The
block now says so, and points the model at a math block beside the diagram.

## Trap 3 — a multi-line `$$` block needs `$$` alone on its own line

From the owner's REAL vault (`vault-juju`, note of 2026-08-17), not a fixture:

```text
$$\begin{aligned}
\text{Total Flour Used} &= ... \\
\end{aligned}$$
```

Rendered as raw text. Both scanners require the delimiter to own its line:

```text
markdown-plugin.ts:83   if (line.trim() !== '$$') return false
syntax.ts:149           if (trimmed !== '$$') continue
```

Read mode and live mode fail identically. This is the standard LaTeX form and
what models emit by default, so it is a REAL renderer defect — the only one of
the three that is Atomik's own. Owner ruling: patch the prompt first; the
parser repair is its own work, outside this path's Deliberately excluded line.

## What landed

The `rendering-capabilities` block gained one TRAPS bullet covering all three,
and three drift tests pinning each warning to the code that causes it —
`discoverDollarMath`, `safeSvgNode`, and Vega-Lite's own compiler. The pin
direction is deliberate: when a trap is FIXED the test fails and the block must
stop describing it. A prompt that keeps warning about a repaired defect burns
tokens on every request to teach the model something untrue.

Validated the way S01 validated its pins — by breaking the claim and watching
the test fail, then restoring it.

## Cost, and a ceiling raised on purpose

```text
rendering-capabilities   1,046 -> 1,572 chars   (~+131 tokens, EVERY request)
asserted ceiling         1,400 -> 1,700
```

The test comment says the ceiling is a decision, not a measurement. It was
raised deliberately and recorded here rather than bumped quietly.

## Still open

Rounds B (note conventions), C (pointing wikilinks, the S02 work), and D
(system-plan UI, sent-request inspector, the owner's keep-or-cut verdict on the
doubled system message) have not run.

# Round 2 — the patch works, and two more defects surfaced

Same lane and vault, after `46e3814`.

## The prompt patch held

Every display block in the round-2 generation is written the way the block now
instructs — `$$` alone on its own line, above and below:

```text
$$
S_i = \frac{e^{z_i}}{\sum_{k=1}^K e^{z_k}}
$$
```

The one block the owner saw rendered raw is the LAST one in the response:

```text
427: **Matrix (Layer-Wide) Form:**
429: $$\begin{bmatrix} z_1^{[1]} \\ z_2^{[1]} \\ \vdots \\ z_{n^{[1]}}^{[
```

Cut mid-expression, never closed. `max tokens` was 2000 and the response hit
it. So this is truncation, not the trap returning: instruction adherence
decays in the tail, and an unclosed `$$` renders raw no matter what the parser
does. Raise the ceiling before reading anything into a truncated tail.

## Defect 4 — the chat filename carries the app's own bookkeeping

```text
chats/2026-08-20/you-!---sent-system=2120-instruction=828.md
```

`chatSlug` (`chat-file.ts:69`) drops `<`, `>` and `#` one character at a time
and never treats `<!-- … -->` as a unit, so a message carrying a stamped
heading becomes a filename made of token counts.

This is the SAME defect class CP-MVP-010 S07c already fixed one layer up:
`graph-core.ts:109` strips `<!--…-->` from a heading before it becomes a title,
with a comment explaining that the stamp is machine bookkeeping and not part of
anyone's title. The slug path was missed. Fixing `chatSlug` the same way is
correct regardless of how the stamp got into the text.

How it got there is a separate question and NOT proven. The file carries two
headings — an empty `## you`, then `## you <!-- sent: system=2646|… -->` with
the body — which is what `newChatFileContent` produces when the passed `text`
already begins with a stamped heading. The name's counts (2120/828) are from an
EARLIER send than the file's (2646/904). The owner's split view had the chat
SOURCE open in the left pane, so a paste from there is the likeliest trigger.
Reproduce before treating it as an app-side leak.

## Defect 5 — a large diagram is shrunk to unreadable, with no way to explore it

The neural-net diagram rendered at roughly a fifth of legible size in a 560px
note column. There is no zoom, no pan, no expand — `mermaid-core.ts` has no
affordance at all.

The cause is one CSS pair fighting itself (`styles.css:3708-3734`):

```css
> [data-rich-output] { overflow: auto; }      /* the container CAN scroll */
[data-rich-render-host] > svg { max-width: 100%; height: auto; }
```

The SVG is capped at the container's width, so it never overflows, so the
`overflow: auto` never engages. The scroll affordance is already there and is
disabled by the rule beside it. Letting a diagram keep its natural width would
buy panning for nothing; a fit/actual-size toggle and an expand overlay are the
real fix, and belong with the other renderer repairs.
