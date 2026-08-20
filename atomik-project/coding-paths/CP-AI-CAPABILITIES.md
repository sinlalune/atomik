---
type: Atomik Coding Path
title: AI capabilities — tell the model what the surface it writes into can do (labelled)
description: The renderers, the typed-edge grammar and the pointing affordance already exist; nothing tells the model they do. Adds two composable prompt blocks pinned by drift tests to the code they describe, and makes a pointing wikilink in chat actually open the note.
tags: [coding-path, ai, prompt, renderer, wikilink, chat, capabilities]
timestamp: 2026-08-19T00:00:00Z
atomik:
  id: CP-AI-CAPABILITIES
  status: done
  accepted: 2026-08-19
  current_step: done
  base_commit: 80b131a
  branch: path/cp-ai-capabilities
  writes:
    - apps/desktop/shared/prompt-composition.ts
    - apps/desktop/renderer/src/editor/prompts.ts
    - apps/desktop/renderer/src/editor/system-plan.ts
    - apps/desktop/tests/system-plan.test.ts
    - apps/desktop/tests/prompts.test.ts
    - apps/desktop/renderer/src/workspace/ChatView.tsx
    - apps/desktop/shared/generation-params.ts
    - apps/desktop/electron-main/ai-settings.ts
    - apps/desktop/electron-main/mistral-generation-adapter.ts
    - apps/desktop/tests/gen-options.test.ts
    - apps/desktop/tests/ai-settings.test.ts
    - docs/modules/atomik-desktop-ai.md
    - apps/desktop/tests/prompt-composition.test.ts
    - apps/desktop/tests/chat-view.test.ts
    - docs/adr/ADR-015-ai-surface-capabilities.md
    - docs/modules/atomik-desktop-editor.md
    - docs/modules/atomik-desktop-shell.md
    - atomik-project/coding-paths/CP-AI-CAPABILITIES.md
    - atomik-project/coding-paths/index.md
    - atomik-project/sessions/**
    - atomik-project/audits/**
    - atomik-project/log/**
---

# Goal

CP-RICH-MARKDOWN built a rich reading surface. The only writer in the system —
the model — has never been told it exists. Grepping the whole prompt surface
(`shared/prompt-composition.ts`, `editor/prompts.ts`, `editor/system-plan.ts`)
for `mermaid`, `vega`, `katex`, `math`, `diagram`, `chart` and `[[` returns
nothing. Meanwhile chat, inline AI and the AI note preview all already hydrate
through the same registry, so anything the model emits WOULD render.

1. A `rendering-capabilities` block tells the model what renders and, just as
   importantly, what is refused — a chart with a `url` dataset is not a
   creative risk, it is a visible error for the reader.
2. A `note-conventions` block carries the ADR-011 typed-edge grammar into note
   generation, where authoring an edge is meaningful. It stays OUT of chat.
3. Chat may POINT at a note with a plain `[[wikilink]]`. Pointing is not
   citing: citation is already solved and the owner ruled against the pill
   treatment for it.

# Definition of done

- Both blocks exist as ordinary `BUILTIN_BLOCK_IDS` entries: composed through
  the plan, individually overridable, visible by name in the system-plan UI and
  verbatim in the sent-request inspector. No new prompt mechanism.
- `rendering-capabilities` is in BOTH default plans; `note-conventions` is in
  the note plan only. A chat answer never asserts a typed edge into the graph.
- Every fence identifier the blocks name equals what `richKindForFence`
  actually accepts, and every limit they state equals `DEFAULT_RICH_LIMITS`.
  Both are pinned by drift tests that read the source of truth, not by prose.
  A wrong number here does not fail a build on its own — it quietly teaches the
  model to write blocks the app refuses (carried forward from the
  CP-RICH-MARKDOWN coherence audit).
- A `[[wikilink]]` in a chat answer resolves through the SAME pipeline the
  vault uses (`readGraphIndex` → `wikiCandidatesFor` → `resolveWikiTarget` →
  `data-rel`) and opens the note on click. Unresolved stays the inert broken
  pill — a diagnostic, never an auto-create.
- Pointing and citation stay visibly distinct. Citation keeps its numbered
  marker and chip; pointing is an ordinary link pill.
- The blocks cost tokens on every request: their size is measured and recorded,
  not assumed.
- Owner bench on real generations, closing ceremony, rebase, bare gates,
  coherence audit, journal, `status: done`, self-merge.

# Documentation coverage

## Required

- 06-ai-patch-pipeline — what the model is told shapes what it proposes
- 11-markdown-page-model — the fences and inline forms a note may contain
- 13-electron-security — a capability statement must not become a capability
- 14-app-kernels — prompt composition stays pure shared code
- 19-dsl-future + ADR-010 — third-party fenced projections are NOT the Atomik
  DSL, and the model must not be told they are
- 20-semantic-graph + ADR-011 — the typed-edge grammar the model may author
- 28-truth-evidence-model — citation stays citation; pointing is a different act
- 36-ui-design-system — the pill a pointing wikilink renders as
- ADR-014 — the renderer contract these blocks describe
- 17-self-evolving-docs · 22-agent-handoff · 24-doc-templates ·
  35-coding-path-execution-state · coding-paths/paths.md — standing law

## Conditional

- 33-retrieval-local-execution-cost — if block size materially moves per-request
  cost, it earns a receipt rather than an assumption

## Deliberately excluded

- Teaching the model the Atomik DSL/Scene IR — reserved, not a fenced renderer
- Any new renderer, fence identifier or relaxed limit
- Rewriting the citation mechanism — benched and ruled on (CP-MVP-010 round 6)
- Auto-creating notes from an unresolved pointing wikilink
- Tuning prompt wording for output quality beyond the accepted text; that is a
  bench, never a gate

# Execution

- [x] S01 The two blocks: add to `BUILTIN_BLOCK_IDS`/defaults, wire into the
      note and chat default plans with their section scaffolding, and pin them
      with drift tests against `richKindForFence` and `DEFAULT_RICH_LIMITS`.
      Measure the added per-request size. Tests, ADR-015, module note, ledger.
- [x] S02 Pointing wikilinks in chat: reuse the vault's resolution pipeline,
      route `data-wiki` by resolved `data-rel`, keep unresolved inert, keep
      citation visibly distinct. Focused tests, docs, ledger.
- [x] S03 Owner bench on real generations + closure. Bench round 1 (2026-08-20)
      found three rendering traps and they are warned about in the block, each
      pinned to the code that causes it. Remaining: rounds B/C/D, acceptance,
      closing ceremony, rebase, bare gates, coherence audit, journal,
      `status: done`, self-merge.

# Current checkpoint

```text
base commit : 80b131a
changed     : S01 two capability blocks in prompt-composition —
              `rendering-capabilities` in BOTH default plans,
              `note-conventions` in the note plan only; block descriptions and
              plan labels; the legacy composeSystemPrompt template kept
              byte-identical to the default plan; drift tests pinning fences to
              richKindForFence and limits to DEFAULT_RICH_LIMITS
widening    : prompts.ts, system-plan.ts and their tests added to writes: on
              2026-08-19. Both carry EXHAUSTIVE Record<BuiltinBlockId, string>
              maps (descriptions, chip labels), so a new block cannot compile
              without them — the widening was discovered by the compiler, not
              chosen (paths.md).
cost        : rendering-capabilities 1,046 chars (~262 tokens);
              note-conventions 471 chars (~118 tokens); note system message
              2,987 chars (~747 tokens); chat 2,120 chars (~530 tokens).
              Roughly DOUBLES the system message. Ceiling asserted in
              tests/prompt-composition.test.ts so growth is a decision.
tests       : prompt-composition 8 new; system-plan chat-plan expectation
              updated for the new chip (intentional change, not a break).
              Drift test validated by changing 5000 -> 4000 and watching it
              fail.
              S02 chat pointing wikilinks — decoration on the HTML string
              before mount (so citation chips and rich hydration still see
              final markup), candidates from the vault root loaded ONCE per
              view rather than per streamed token, click routed by resolved
              data-rel AFTER citation, unresolved left inert.
bench 1     : 2026-08-20, lane ai-capabilities, vault
              ~/vault-ai-capabilities-bench, gemini-3.7-flash. Round A ran.
              The model DID reach for the right projection every time —
              mermaid for structure, vega-lite with inline data.values for
              data, display math for the derivation. The block works. What
              broke was the RENDER, three ways:
                1 bar mark on a log scale -> zero-height bars (upstream
                  Vega-Lite; reproduced with plain vega/vega-lite, no
                  Electron). `zero: false` does not rescue it.
                2 `$$..$$` in a Mermaid label -> mermaid force-enables HTML
                  labels, emits <foreignObject>, safe-svg refuses the WHOLE
                  diagram. Answers the owner's question: no, KaTeX in mermaid
                  boxes does not work today.
                3 multi-line `$$` only parses with `$$` alone on its own
                  line; `$$\begin{aligned}` degrades to raw text in BOTH read
                  and live mode. A real renderer defect, found in the owner's
                  own vault-juju note of 2026-08-17.
              Owner ruling: patch the prompt for all three; the renderer
              repair (3) and a surfaced Vega warning (1) come after.
cost        : rendering-capabilities 1,046 -> 1,572 chars (~+131 tokens on
              EVERY request). Ceiling raised 1,400 -> 1,700 deliberately —
              the test comment demands that be a conversation, not a bump.
bench 2     : after 46e3814. The patch HELD — every display block in the new
              generation writes `$$` alone on its own line. The one block the
              owner saw raw is the truncated tail (max tokens 2000, cut
              mid-expression, never closed), not the trap returning.
              Two more defects, both outside this path:
                4 chatSlug does not strip `<!--…-->`, so a chat filename can
                  be made of token counts
                  (`you-!---sent-system=2120-instruction=828.md`). SAME class
                  CP-MVP-010 S07c fixed in graph-core.ts:109; the slug path
                  was missed. How the stamp reached the text is unproven —
                  a paste from the source pane is the likeliest trigger.
                5 a large mermaid diagram is shrunk to unreadable with no
                  zoom/pan/expand. styles.css:3708-3734 puts `overflow: auto`
                  on the container and `max-width: 100%` on the SVG, so it
                  never overflows and the scroll never engages.
widening 2  : generation-params.ts, ai-settings.ts,
              mistral-generation-adapter.ts and two tests added to writes:
              on 2026-08-20. Owner directive after the bench: gemini 3.7
              flash as the default engine, 5000 as the default output cap.
              Both are bench consequences — the blocks make generations
              longer, and 2000 truncated one mid-formula — but neither was in
              the accepted scope, so they are recorded here rather than
              folded in silently. docs/modules/atomik-desktop-ai.md joined
              them — cairn-check named it, which is the check doing its job.
accepted    : owner, 2026-08-20 — "bench is validated on my side", the whole
              bench and not round A alone.
defaults    : engine fallback leads with google/gemini-3.7-flash; output
              budget 2000 -> 5000 in BOTH main and the renderer, pinned equal
              by a test because they are one budget seen from two sides.
next action : none — path closed. Closing ceremony recorded in
              ../sessions/2026-08-20-cp-ai-capabilities-closing-ceremony.md.
              Defects 1a/3/4/5 leave unfixed for a follow-on labelled path;
              their grouping belongs to THAT path's opening check.
blockers    : none — S03 needs the owner
```

# Blockers

None recorded.
