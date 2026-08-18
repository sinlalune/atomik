---
type: Atomik Coding Path
title: AI capabilities — tell the model what the surface it writes into can do (labelled)
description: The renderers, the typed-edge grammar and the pointing affordance already exist; nothing tells the model they do. Adds two composable prompt blocks pinned by drift tests to the code they describe, and makes a pointing wikilink in chat actually open the note.
tags: [coding-path, ai, prompt, renderer, wikilink, chat, capabilities]
timestamp: 2026-08-19T00:00:00Z
atomik:
  id: CP-AI-CAPABILITIES
  status: running
  accepted: 2026-08-19
  current_step: S03
  base_commit: 80b131a
  branch: path/cp-ai-capabilities
  writes:
    - apps/desktop/shared/prompt-composition.ts
    - apps/desktop/renderer/src/editor/prompts.ts
    - apps/desktop/renderer/src/editor/system-plan.ts
    - apps/desktop/tests/system-plan.test.ts
    - apps/desktop/tests/prompts.test.ts
    - apps/desktop/renderer/src/workspace/ChatView.tsx
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
- [ ] S03 Owner bench on real generations + closure: acceptance, closing
      ceremony, rebase, bare gates, coherence audit, journal, `status: done`,
      self-merge.

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
next action : S03 owner bench on REAL generations — does the model actually
              reach for a diagram when structure is the point, and does it
              stay inside the limits it was told? That is a bench, never a
              gate: the drift tests can only prove the block says true things.
blockers    : none — S03 needs the owner
```

# Blockers

None recorded.
