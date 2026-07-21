---
type: Atomik Coding Path
title: Real AI generation + the AI interaction pass — Mistral Small behind the provider-neutral contract, reached from the selection (M2 completion)
description: The M2 loop leaves the mock — a Mistral Small adapter in main generates real knowledge behind the unchanged provider-neutral contract — and is reached the way the owner works — select text, right-click, quick action or custom prompt with inline preview in the note, chat in a right lateral panel, prompts as vault files.
tags: [coding-path, m2, ai, generation, provider, mistral, prompts, context-menu, inline-preview, chat]
timestamp: 2026-07-20T00:00:00Z
atomik:
  id: CP-MVP-008
  status: draft
  current_step: S01
  base_commit: null
---

# Goal

M2 completion (18 §M2 + the register's completion-pass pattern that
M3 used for CP-MVP-004/005): real LLM knowledge generation is
scheduled NOWHERE — the ask-AI loop still runs the deterministic mock
from CP-MVP-001 S08 (`electron-main/ai-mock.ts`, wired at
`electron-main/index.ts`), and no milestone M6–M13 owns the swap
(M7 is verification grounding, M9 is autocomplete; survey 2026-07-20,
grep over bedrock + coding paths). The owner spotted the gap and took
three scoping decisions the same day (recorded in
[sessions/2026-07-20-generation-swap-decisions.md](../sessions/2026-07-20-generation-swap-decisions.md)):

1. **Sequencing** — this path opens right after CP-MVP-007 closes,
   BEFORE M6: challenge/repair is only meaningful over real model
   output, and the experiential gate is starved by a mock that always
   answers the same thing.
2. **Cloud first, local next** — the first real engine is a cloud
   adapter; a local llama.cpp generation seat follows LATER as its own
   evaluated tier under 33's capability gates (evidence in 34), the
   way speech did.
3. **Mistral Small first** — the smallest real diff: the main-only key
   seam (`ai-settings.ts`, mode 0600, masked hint) and a working
   Mistral cloud adapter pattern (`mistral-ocr-adapter.ts`) exist
   since CP-MVP-005; French lab, EU residency; dated prices in
   `docs/research/model-research.md`.

The same session, three owner UX directives ("ai generation") define
HOW the loop is reached — this path ships them with the engine:

- **Prompts folder** — `prompts/` at vault root holds the actually
  used system/message prompts as ordinary vault files, referenced by
  quick AI actions, custom requests, and chat.
- **AI from the selection's context menu** — highlight note text →
  right-click → contextual AI request menu: quick AI actions, quick
  custom input (field spawning at the click location, quick
  system-prompt pills), or open a chat. The AI trigger LEAVES the
  note-bar top row; the top row keeps editing concerns only.
  (Owner clarification: this is NOT the existing `@` "quick actions"
  citation menu in `quick-actions.ts` — different need, new surface.)
- **Inline preview / lateral chat** — quick requests do NOT open the
  AI panel: the proposal previews live IN the note before accepting;
  the default conversational surface is a lateral panel on the right.

# Definition of done

- **Real generation behind the unchanged contract**: a typed
  `GenerationAdapter` seam in main (14 §ai-core owns "model provider
  adapters"); Mistral Small chat-completions implementation; key via
  the existing `readMistralKey` seam — never in the renderer (13);
  the mock remains a selectable engine (test/fallback; offline path).
  Renderer-side contract untouched — the ai-mock header's own promise
  ("swapping the mock for a provider adapter later changes nothing
  renderer-side") is the acceptance bar.
- **Budgets and cancellation below renderer state** (18 §M2
  acceptance): request timeout via AbortController, input/output
  token caps, request-size caps reusing ai-mock's validation
  constants; cancel works mid-flight over real latency.
- **ActionTrace per real call** (06 §operation cost, 33): location =
  cloud-model, provider/model/version, provider-reported usage
  preferred over estimates (each labeled), external cost estimated
  from a DATED price snapshot, wall-clock latency, outcome;
  `contentRecorded = false` stays the default.
- **Truth labels stay mechanical**: `labelClaims` runs over real
  output unchanged; source-backed remains a deterministic check; the
  model never self-grades; uncited factual detail defaults model-only
  (18 §M2 guardrails).
- **Prompts folder**: `prompts/` vault-root convention; a prompt file
  is markdown + frontmatter `kind: system | message`; scanned through
  the EXISTING vault verbs (`listVaultFiles`/`readNote` — prompts are
  vault files, zero new IPC); built-in defaults serve when the folder
  is absent; starter prompts materialize only on an EXPLICIT action
  (no writes on open); editing a prompt is an ordinary note edit.
- **Selection context menu**: right-click (and a keyboard equivalent)
  on an editor selection opens the AI menu — quick actions (prompt
  files + built-ins), custom instruction input spawning at the click
  location with system-prompt pills, "Open chat" — following the
  TreeMenu machinery (hand-rolled popup, on-screen clamping, action →
  input morph in place, errors inside the popup); the AI button
  leaves the note-bar; zero new dependencies.
- **Inline live preview**: a quick request renders its proposal IN
  the note over the target range as a CodeMirror widget (the
  `live-preview.ts` WidgetType pattern) with accept / edit / reject
  controls, a compact claim-label strip, and the trace badge; the
  preview is VISUAL ONLY — the buffer changes exactly once, on
  accept, through the existing `applyChange` + save path (06: accept
  is the single moment a diff is born; one op = one reviewable diff).
- **Chat lateral panel**: a right pane-chrome column mirroring the
  pane-tree pattern (the pane grid gains a right column; pane state
  gains a validated chat field, migration-safe); multi-turn requests
  travel through the operation contract with thread context validated
  main-side; responses are insertable into the note through the SAME
  patch flow; the old docked AiPanel retires into the two new
  surfaces; chat history PERSISTS as ordinary vault FILES (owner
  revision at the 2026-07-21 opening check — supersedes the
  ephemeral-default proposal): a transcript IS a note, editable and
  linkable; the exact convention (a `chats/` vault folder beside
  `prompts/`, frontmatter shape, when a file is born) is pinned at
  S01; no hidden database (04) holds.
- Every new channel obeys 13 §IPC (typed, main-validated, preload
  surface test extended in the same change); zero new dependencies
  (menus/chat hand-rolled; if one becomes tempting, a dated 15
  decision FIRST); no live API calls in the test suite (adapter
  mapping/errors on fixtures; an env-gated `ATOMIK_SMOKE_*` rung
  proves the live chain); tests round-trip every surface per the
  standing lifecycle rule; tests/typecheck/build/smoke green per
  unit; module notes + learning notes (first-use rule, 17 — the real
  provider adapter and the inline/chat AI surfaces qualify; clause
  restored 2026-07-21 after the CP-003→007 learning-layer stall) +
  ledger + log.md in the same work unit as EVERY step.

# Documentation coverage

Completeness rule (35): every bedrock page 00–36 accounted for
(36 added 2026-07-21).

## Required

- `docs/bedrock/00_00-orientation.md`
- `docs/bedrock/01_01-workbench-first.md` (AI must not tax the
  workbench feel; latency and cancel are daily-use properties)
- `docs/bedrock/04_04-file-first-model.md` (prompts as files; chat
  leaves no hidden canonical state; one op = one reviewable diff)
- `docs/bedrock/05_05-resource-selection-model.md` (the selection IS
  the entry point of the whole pass)
- `docs/bedrock/06_06-ai-patch-pipeline.md` (THE page — contracts,
  patch discipline, trace shape)
- `docs/bedrock/12_12-electron-mvp.md` (provider calls behind the
  trusted boundary)
- `docs/bedrock/13_13-electron-security.md` §IPC + keys (re-read
  before S02)
- `docs/bedrock/14_14-app-kernels.md` §ai-core (the seat this path
  makes real)
- `docs/bedrock/17_17-self-evolving-docs.md` (decision recording)
- `docs/bedrock/18_18-roadmap.md` §M2 + §Continuous constraints
- `docs/bedrock/22_22-agent-handoff.md`
- `docs/bedrock/26_26-okf-agent-context.md` (chat context grows
  beyond selection-first — the trigger the AiPanel comment reserved)
- `docs/bedrock/27_27-git-compatibility.md` (accepted patches only;
  no rewrite side effects)
- `docs/bedrock/28_28-truth-evidence-model.md` (minimal contract over
  real output)
- `docs/bedrock/33_33-retrieval-local-execution-cost.md` (THE cost
  page — budgets, traces, cloud rung posture)
- `docs/bedrock/35_35-coding-path-execution-state.md`
- `docs/bedrock/36_36-ui-design-system.md` (every new AI surface —
  context menu, inline preview, chat column — is born conformant:
  tokens, control boxes, accessible names, glass rules)
- `docs/agents/agent_documentation_contract.md`

## Conditional

- `docs/bedrock/11_11-markdown-page-model.md` — if the prompt-file
  frontmatter shape raises questions beyond `kind: system | message`.
- `docs/bedrock/15_15-maintainability.md` — if any dependency (menu,
  chat UI, HTTP client) is considered; the default is zero new deps.
- `docs/bedrock/24_24-doc-templates.md` — before new module notes.
- `docs/bedrock/02_02-learning-loop.md` — if inline accept interacts
  with correction-state flips unexpectedly.
- `docs/bedrock/31_31-truth-lens-ux.md` — if the compact claim strip
  in the inline preview needs more than the existing chip language.

## Deliberately excluded

- `docs/bedrock/29_29-verification-grounding-router.md` — no live
  web grounding in this path; generation only. M7 territory.
- `docs/bedrock/03_03-workspace-tabs.md` — consumed (pane grid,
  state migration) but not changed in doctrine; the chat column
  follows the established pane-chrome pattern.
- `07`–`10`, `16` — shipped source views; untouched.
- `19`, `20`, `21`, `30`, `32`, `34` — later milestones; 34 joins
  when the LOCAL generation seat opens (reserved follow-up).
- `23_23-references.md` — ad hoc. `25_25-use-cases.md` — narrative.

# Execution

- [ ] S01 Bootstrap (22): reconcile ledger vs repo; pin `base_commit`;
      read 06 + 13 §IPC + 14 §ai-core + 33 + 28 + 05 + 26 in full;
      pin the adapter contract (request/bundle mapping, error
      taxonomy, dated price snapshot), the prompt-file shape
      (frontmatter `kind: system | message`), and the open design
      decisions: chat persistence DECIDED at the 2026-07-21 opening
      check — vault FILES (S01 pins the `chats/` convention: folder,
      frontmatter, file-birth moment); inline claim-label surfacing
      (compact strip in the preview widget); default engine when a
      key is present (owner bench decision, recorded open).
- [ ] S02 Mistral adapter in main, end to end: typed
      `GenerationAdapter` seam; Mistral Small chat-completions impl
      (key via `readMistralKey`, AbortController timeout, token/size
      budgets from ai-mock's constants); ActionTrace with
      provider-reported usage + dated-snapshot estimated cost; engine
      selection (mock | mistral) in settings via typed channel +
      preload surface test; network/auth/quota failures surfaced;
      offline → mock selectable. Tests: request building, response →
      bundle mapping, error taxonomy — fixtures only; env-gated live
      smoke rung.
- [ ] S03 Prompts folder: `prompts/` convention + scanner over the
      existing vault verbs (zero new IPC; pattern: the
      `sourceBundlesOf` walk); prompts feed quick actions, pills, and
      chat system prompts; built-in defaults when absent; explicit
      starter materialization (no writes on open); tests (scan,
      frontmatter parse, fallback, round-trip create→use→edit→use).
- [ ] S04 Selection context menu: right-click + keyboard on an editor
      selection → AI menu (TreeMenu machinery pattern): quick actions
      from prompt files + built-ins, custom input at the click
      location with system-prompt pills, "Open chat"; the AI button
      leaves the note-bar (top row = editing concerns only); tests
      where the DOM seam allows + pure helpers tested.
- [ ] S05 Inline live preview: proposal rendered over the target
      range as a CM widget (live-preview WidgetType pattern) with
      accept / edit / reject + compact claim strip + trace badge;
      buffer untouched until accept → existing `applyChange` + save;
      AiPanel's loop logic (run/accept/reject/challenge/trace)
      extracted into shared hooks consumed by both new surfaces;
      cancel mid-flight; tests (widget lifecycle, accept path byte
      fidelity, reject leaves zero trace in the buffer).
- [ ] S06 Chat lateral panel: right pane-chrome column (pane grid
      gains the column; pane state gains a validated chat field,
      migration derives absent as hidden); multi-turn over the
      operation contract (thread context main-validated); responses
      insertable through the patch flow; docked AiPanel retired;
      persistence per the S01 pin; tests (state migration, thread
      validation, insert path).
- [ ] S07 Acceptance: 18 §M2 intents re-run on the REAL provider
      (selected passage → source-linked note; uncited detail labeled;
      one accepted patch = one meaningful diff; budget/cancel
      enforced below renderer; source-backed reproducible by the
      deterministic check) + owner bench on the live vault: a real
      question over a real source selection via the context menu, an
      inline accept, a chat exchange, a prompt file edited and
      re-used, a cancel mid-flight, the receipt inspected; review
      and close.

# Current checkpoint

```text
base commit : not pinned — path PROPOSED 2026-07-20, not yet accepted
changed     : nothing; docs-only proposal unit (this file, register
              row, decisions record, log entry)
tests       : n/a — no execution yet (repo at 407/41 green from
              CP-MVP-007)
next action : owner review of this proposal; activation is gated on
              (1) owner acceptance, (2) CP-MVP-007 S07 closing
              (owner bench — still the vault's immediate next
              action), and (3) the vision-alignment review closing
              with owner answers — the standing pre-path gate (22),
              first instance:
              ../sessions/2026-07-21-vision-alignment-before-cp-mvp-008.md.
              Then ACTIVE.md flips here, base_commit pins, execution
              starts at S01.
blockers    : CP-MVP-007 still active (one-active-parent-path rule);
              alignment review open.
```

# Blockers

- CP-MVP-007 is the active parent path until its S07 acceptance
  closes; this path must not begin execution before then (35).
- The vision-alignment review
  (`../sessions/2026-07-21-vision-alignment-before-cp-mvp-008.md`)
  must close with owner answers before acceptance — the standing
  pre-path gate added 2026-07-21 (22 §If no active path exists).
