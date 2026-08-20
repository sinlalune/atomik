---
type: Atomik Coding Path
title: Render repairs — the four defects the AI-capabilities bench found behind the prompt (labelled)
description: The bench proved the model writes the right blocks and the renderers mishandle them. Repairs a display-math parser that requires its delimiters alone on a line, a swallowed Vega warning, a chat slug built from the app's own bookkeeping, and a diagram that cannot be explored. Discharges a drift-pin obligation inherited from CP-AI-CAPABILITIES.
tags: [coding-path, renderer, math, mermaid, vega-lite, chat, repair]
timestamp: 2026-08-20T00:00:00Z
atomik:
  id: CP-RENDER-REPAIRS
  status: running
  accepted: 2026-08-20
  current_step: S05
  base_commit: f58093e
  branch: path/cp-render-repairs
  writes:
    - apps/desktop/renderer/src/editor/rich-markdown/markdown-plugin.ts
    - apps/desktop/renderer/src/editor/rich-markdown/syntax.ts
    - apps/desktop/renderer/src/editor/rich-markdown/adapters/vega-lite-core.ts
    - apps/desktop/renderer/src/editor/rich-markdown/adapters/vega-lite.ts
    - apps/desktop/renderer/src/editor/rich-markdown/adapters/mermaid-core.ts
    - apps/desktop/renderer/src/editor/rich-markdown/diagram-expand.ts
    - apps/desktop/renderer/src/editor/rich-markdown/hydration.ts
    - apps/desktop/renderer/src/editor/rich-markdown/contracts.ts
    - apps/desktop/renderer/src/editor/chat-file.ts
    - apps/desktop/renderer/src/styles.css
    - apps/desktop/shared/prompt-composition.ts
    - apps/desktop/tests/rich-markdown.test.ts
    - apps/desktop/tests/prompt-composition.test.ts
    - apps/desktop/tests/chat-file.test.ts
    - docs/modules/atomik-desktop-editor.md
    - docs/modules/atomik-desktop-shell.md
    - atomik-project/coding-paths/CP-RENDER-REPAIRS.md
    - atomik-project/coding-paths/ACTIVE.md
    - atomik-project/sessions/**
    - atomik-project/audits/**
    - atomik-project/log/**
---

# Goal

CP-AI-CAPABILITIES benched the prompt and found the renderers. The model
reached for the right projection every time; four defects sat behind it, and
three of them are currently WARNED ABOUT in a prompt block that costs tokens on
every request. Repairing them is how those warnings get deleted.

1. A multi-line `$$` block parses only when both delimiters sit alone on their
   own line. `$$\begin{aligned}` — the form models emit by default, and the
   form in the owner's own vault — degrades to a paragraph in read mode and
   live mode alike.
2. Vega logs its own diagnosis (`Log scale domain includes zero`) and the
   adapter throws it away, so a broken chart mounts silently.
3. `chatSlug` never treats `<!-- … -->` as a unit, so a chat file can be named
   `you-!---sent-system=2120-instruction=828.md`.
4. A wide diagram is capped at the container width, so the `overflow: auto`
   already sitting on that container never engages and there is nothing to
   grab.

# Definition of done

- A display block opens on `$$` followed by content and closes on a line
  ending in `$$`, in BOTH `markdown-plugin.ts` and `syntax.ts`, without
  breaking the two forms that already work and without matching a stray `$$`
  mid-paragraph. Fixtures come from the owner's real notes.
- **The drift pin fires and the warning is deleted.** When the parser is
  fixed, `tests/prompt-composition.test.ts` fails on the trap it pins. The
  correct response is to remove that clause from `RENDERING_CAPABILITIES` —
  never to loosen the assertion (CP-AI-CAPABILITIES coherence audit). The
  block's asserted size ceiling comes down with it.
- Vega's warnings reach `[data-rich-status]`, the slot every block already
  has. The chart still renders; the reader learns why it looks wrong.
- `chatSlug` strips HTML comments the way `graph-core.ts:109` already does,
  and a focused test covers the stamped-heading input. Separately, an attempt
  to REPRODUCE how a stamped heading reached the message text — recorded
  either way, because an unreproduced trigger is not a fixed one.
- A diagram keeps its natural width and its container scrolls; an expand
  control opens it in a full-pane overlay. Keyboard reachable, dismissible,
  and it must not trap focus.
- Owner bench in the real app, closing ceremony, rebase, bare gates, coherence
  audit, journal, `status: done`, self-merge.

# Documentation coverage

## Required

- 11-markdown-page-model — the inline and fenced forms a note may contain
- 13-electron-security — the SVG guards stay exactly as they are; an expand
  overlay renders the SAME sanitized node, never a re-parse
- 36-ui-design-system — the expand control, the overlay, focus and contrast
- ADR-014 — the renderer contract these repairs sit inside
- ADR-015 — the capability blocks whose warnings this path deletes
- 17-self-evolving-docs · 22-agent-handoff · 24-doc-templates ·
  35-coding-path-execution-state · coding-paths/paths.md — standing law

## Conditional

- 19-dsl-future + ADR-010 — only if diagram exploration starts growing toward
  a scene viewer; that is the Scene IR question and does not belong here
- 28-truth-evidence-model — only if chat file naming turns out to touch
  provenance rather than cosmetics

# Deliberately excluded

- Zoom and pan. The owner chose natural-width scrolling plus an expand
  overlay; wheel-zoom competes with page scroll and is not the ask.
- Relaxing any Mermaid or SVG guard. `foreignobject` stays refused, so math
  inside a Mermaid label stays refused, and its prompt warning STAYS.
- Fixing Vega-Lite's log-scale baseline. It is upstream behaviour; the repair
  here is that the reader is told, not that the chart is rescued. That
  warning also stays.
- Any new renderer, fence identifier or relaxed limit.
- The Excalidraw / Scene IR question (19, ADR-010) — roadmap material.

# Execution

- [x] S01 Display math delimiters: both scanners, fixtures from the owner's
      real notes, then DELETE the trap clause the pin fires on and lower the
      block's size ceiling. Tests, docs, ledger.
- [x] S02 Vega warnings reach the block's status line. Tests, docs, ledger.
- [x] S03 `chatSlug` strips comments; reproduce-or-record the stamped-heading
      trigger. Tests, docs, ledger.
- [x] S04 Diagram exploration: natural width, scrolling container, expand
      overlay. Tests, docs, ledger.
- [ ] S05 Owner bench + closure.

# Current checkpoint

```text
base commit : f58093e
changed     : S01 — `displayMathOpen` / `displayMathClose` /
              `joinDisplayMath` in syntax.ts, called by BOTH scanners, so the
              rule has one definition instead of two copies that already
              drifted the same way. A delimiter must still START its line;
              that is the only guard against a false positive, and it is
              tested (`costs $$5 today` stays prose, an unclosed opener stays
              prose). displayMathOnLine still runs first.
pin fired   : as designed. tests/prompt-composition.test.ts failed on the
              trap it pinned to discoverDollarMath the moment the parser
              worked. Discharged the CP-AI-CAPABILITIES audit obligation:
              DELETED the clause from RENDERING_CAPABILITIES and lowered the
              asserted ceiling 1,700 -> 1,450. The assertion was not touched.
              The replacement test now pins the ABSENCE of the warning.
              Two traps survive on purpose — both describe upstream
              behaviour Atomik does not own.
fixtures    : the owner's real note (vault-juju, 2026-08-17), including the
              two-space indent inside a list item. An invented fixture would
              have missed the indent.
tests       : 4 new in rich-markdown.test.ts; 1 replaced in
              prompt-composition.test.ts. 1020 passing.
S02         : captureVegaLog() builds a Vega-shaped sink in the PURE half of
              the adapter — unit-testable with no chart runtime — and it
              deduplicates, because Vega repeats a warning per dataflow pulse.
              The same sink goes to compile (Vega-Lite's half) and to the View
              (Vega's half). A warning is NOT a refusal: the chart still
              mounts. Nothing new was built to show it —
              RichRenderHandle.diagnostics was always the channel and
              hydration.ts already paints diagnostics[0] into
              [data-rich-status]; the adapter was returning [].
              Mermaid deliberately not audited for the same gap (owner
              scoped S02 to the defect the bench found).
widening    : adapters/vega-lite.ts joined writes: on 2026-08-20 — the thin
              loader is where the real vega-lite compile call lives, so the
              logger could not reach it from core alone. cairn-check named
              the file; declared rather than absorbed.
tests       : 3 new. 1023 passing.
S03         : chatSlug strips HTML comments as a UNIT before anything else —
              the same treatment graph-core.ts:109 already gave a heading
              (CP-MVP-010 S07c). One defect class, now fixed at both layers.
trace       : NEGATIVE, and recorded as such
              (../sessions/2026-08-20-cp-render-repairs-s03-slug-trace.md).
              No in-app path composes a stamped heading into the text that
              names a new chat file: `send` takes the composer's contents,
              `retry` never creates a file, and parseChatTurns consumes a
              stamped heading into turn METADATA rather than turn text. It
              was a paste. The fix is correct regardless, which is why it
              was made rather than left to the trace staying true.
tests       : 1 new (3 assertions incl. the real observed input). 1026.
S04         : dropped `max-width: 100%` from the block SVG — that one rule
              was disabling the `overflow: auto` already on the container, so
              panning came back for free. diagram-expand.ts adds the Expand
              control and a native <dialog> overlay at up to 96vw.
              The node is MOVED, not cloned: safeSvgNode already made its ids
              unique in the document, and a clone would put two elements with
              the same marker/clip-path ids in one document where url(#id)
              takes whichever comes first. A comment node holds its place.
              Control mounts OUTSIDE the scroll container and only after a
              diagram actually rendered.
              One dismissal path (Close / Esc / dispose all route through
              dismiss(); restore() clears state first so it is idempotent —
              dialog.close() fires 'close' asynchronously and dispose cannot
              wait). No-<dialog> fallback is tested, not assumed.
focus note  : showModal() CONTAINS focus while open and restores it to the
              trigger. The DoD line said "must not trap focus"; read literally
              that forbids a modal. Intent — never strand the reader — is met
              by Esc + restoration. Flagged rather than reinterpreted quietly;
              owner's call at the bench.
widening    : diagram-expand.ts (new) and hydration.ts joined writes: —
              the declared surface assumed mermaid-core.ts, but the control
              belongs to BOTH diagram kinds and mounts generically after any
              successful render, so hydration is its only correct home.
              Discovered by building it, declared when cairn-check said so.
              mermaid-core.ts was declared and never touched.
tests       : 5 new. 1029 passing.
next action : S05 — owner bench in the real app, then closure. This is the
              step the owner asked to be present for.
blockers    : none
```

# Blockers

None recorded.
