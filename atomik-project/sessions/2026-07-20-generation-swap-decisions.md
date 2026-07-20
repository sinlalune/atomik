---
type: Atomik Session Record
title: Real AI generation — the 2026-07-20 gap survey, three scoping decisions, three UX directives (seeds CP-MVP-008)
timestamp: 2026-07-20T00:00:00Z
---

# Real AI generation — owner decisions, 2026-07-20

Decision authority: these choices are RECORDED in the proposed path
[../coding-paths/CP-MVP-008.md](../coding-paths/CP-MVP-008.md); this
note preserves the reasoning trail (17). The path awaits owner
acceptance and CP-MVP-007's close before execution.

## The gap survey (2026-07-20)

Owner question, verbatim intent: *"I don't read when we are gonna
implement knowledge generation from LLM — from cloud providers or
local models?"* The survey confirmed it is a real roadmap hole:

- The ask-AI loop still runs the DETERMINISTIC MOCK from CP-MVP-001
  S08: `electron-main/ai-mock.ts`, imported at
  `electron-main/index.ts` (`runAiOperation`). Its header states the
  swap contract: a provider adapter replaces it with zero
  renderer-side change.
- 18 §M2 says "start with mocks … use the final trace shape from the
  beginning" — and then NO milestone M6–M13 owns the mock→real swap
  (grep over `docs/bedrock/` and `coding-paths/`: no hit for the
  swap; M7 is a VERIFICATION provider, M9 is autocomplete/local
  assistance).
- Real model usage shipped so far: local speech transcription (M3
  paths), OCR local seats + the opt-in Mistral cloud rung
  (CP-MVP-005), and DSL generation experiments in the atomik-dsl side
  repo (CP-DSL-003/005). None of it is knowledge generation in the
  M2 loop.
- Ready seams the swap inherits: provider-neutral response-bundle
  contract + ActionTrace (06), the main-only key store
  `ai-settings.ts` (mode 0600, masked hint — holds a Mistral key
  since CP-MVP-005 S05b), the real-cloud-call adapter pattern
  `mistral-ocr-adapter.ts`, mechanical truth labeling `truth.ts`.

## The three scoping decisions (owner, this session)

1. **Sequencing: right after CP-MVP-007, before M6.** The register
   gains an M2 (completion) row — the same completion-pass pattern M3
   used (CP-MVP-004/005). Why now: M6's challenge/repair loop is only
   meaningful over real output, and the M1+M2 experiential gate is
   starved by a mock that always answers the same thing.
2. **Cloud first, local next.** The first engine is a cloud adapter
   behind the existing contract. A LOCAL llama.cpp generation seat is
   a reserved follow-up under 33's evaluation gates with dated
   evidence in 34 — the speech precedent, not a promise.
3. **Mistral Small as the first adapter.** Smallest real diff (key
   seam + adapter pattern already in the tree), French lab, EU data
   residency. Dated prices in `docs/research/model-research.md`
   (owner research, mid-2026): Mistral Small $0.10–0.15 in /
   $0.30–0.60 out per M tokens; the research's cheap-tier
   alternatives (Gemini 2.5 Flash-Lite $0.10/$0.40, DeepSeek V4
   Flash $0.14/$0.28, Claude Haiku 4.5 $1/$5) remain candidates for
   LATER adapters behind the same seam.

## The three UX directives ("ai generation", owner, this session)

Recorded near-verbatim; they define how the loop is reached and ship
WITH the engine in CP-MVP-008:

1. **Prompts folder** — "we need prompt folders at vault root, that
   will reference actually used system or message prompt that will be
   available in quick action or in more custom request and chat."
   → `prompts/` vault-root convention; prompt files are ordinary
   markdown (frontmatter `kind: system | message`); zero new IPC.
2. **AI mode from context menu action** — "move the AI mode trigger
   from the top row [keep] only editing modes, to a context menu with
   quick AI actions and quick custom input prompting (input field
   spawning on click location, and quick system prompt pills
   selection) or deciding to open a chat."
   → the note-bar AI button retires; selection right-click (+
   keyboard path) opens the AI menu, built on the CP-MVP-007
   TreeMenu machinery.
   **Owner clarification, same session**: "quick actions" here is a
   DIFFERENT need from the existing `@` quick-actions citation menu
   (`quick-actions.ts`) — it is a quick AI request mode: highlight
   note text → right-click → contextual AI request menu.
3. **Live preview or open lateral AI panel** — "make the AI panel not
   mandatory on quick actions with live preview in the note before
   accepting, and by default a lateral panel on the right for chat
   interface."
   → quick requests preview inline in the note (CM widget over the
   target range; buffer changes only on accept — 06 discipline
   unchanged); chat lives in a right pane-chrome column mirroring
   the pane-tree pattern; the docked AiPanel retires into the two
   surfaces.

## Open design pins for S01 (recorded, not decided here)

- Chat persistence: default = ephemeral disposable workspace state +
  explicit save-transcript-to-note (no hidden database, 04); revisit
  at owner bench.
- Inline claim-label surfacing: compact strip in the preview widget
  (31 conditional if the chip language needs to grow).
- Default engine when a key is present (mock vs mistral): owner bench
  decision at S07.
