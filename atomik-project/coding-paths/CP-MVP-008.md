---
type: Atomik Coding Path
title: Real AI generation + the AI interaction pass — Mistral Small behind the provider-neutral contract, reached from the selection (M2 completion)
description: The M2 loop leaves the mock — a Mistral Small adapter in main generates real knowledge behind the unchanged provider-neutral contract — and is reached the way the owner works — select text, right-click, quick action or custom prompt with inline preview in the note, chat in a right lateral panel, prompts as vault files.
tags: [coding-path, m2, ai, generation, provider, mistral, prompts, context-menu, inline-preview, chat]
timestamp: 2026-07-20T00:00:00Z
atomik:
  id: CP-MVP-008
  status: active
  accepted: 2026-07-21
  current_step: S05
  base_commit: 6cacfa2
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
- **Prompts folders, SCOPED** (owner amendment 2026-07-21, prompted
  exchange — supersedes the root-only S01 pin): a `prompts/` folder
  may live at the vault root, inside any folder, and inside a project
  bundle; resolution is NEAREST-WINS from the note outward — the
  note's own folder chain upward → project bundle → vault root →
  built-ins; a same-named prompt closer to the note SHADOWS the
  distant one (a project can override a root prompt, not just add);
  the AI menu groups prompts by scope so shadowing stays visible.
  A prompt file is markdown + frontmatter `kind: system | message`;
  scanned through the EXISTING vault verbs (`listVaultFiles`/
  `readNote` — prompts are vault files, zero new IPC); built-in
  defaults serve when no folder provides one; starter prompts
  materialize only on an EXPLICIT action, PER SCOPE (no writes on
  open); editing a prompt is an ordinary note edit.
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

- [x] S01 Bootstrap (22) — done 2026-07-21: reconciled (base 6cacfa2,
      435/43 green, working tree carries only pre-existing owner
      files); full reads done (06, 05, 28, 33, 26; 13 §IPC/keys/
      cloud/local-worker; 14 §ai-core/dependencies). PINS in the
      checkpoint below.
- [x] S02 Mistral adapter in main, end to end — done 2026-07-21:
      `generation.ts` (typed GenerationAdapter seam + mock behind it +
      the eight-kind GenerationError taxonomy) and
      `mistral-generation-adapter.ts` (chat completions, model id
      pinned LIVE `mistral-small-2603` from provider docs 2026-07-21;
      budgets 2k out / 60s wall / input pre-check; deterministic claim
      candidates → unchanged labelClaims; provider-reported usage
      labeled, USD cost from the dated snapshot). Engine selection
      persisted (`setAiEngine` channel; resolution explicit → key →
      mock) + `cancelAiOperation` mid-flight; AppMenu engine picker;
      AiPanel Cancel. Trace lines wear cloud identity + labeled
      usage/billing + snapshot id + privacy.mode cloud. Tests
      455/44 (was 435/43): generation-adapter.test.ts fixture-only,
      ai-settings + action-trace extended, preload surface holds;
      typecheck/build green; smoke `ai=ok` through the new async
      handler; live rung PROVEN with the owner key (.env.local dev
      override, the CP-MVP-005 precedent, now honored by the
      generation handler too): `aiLive=ok:cloud-model/mistral-small/
      150+11tok/0.000029USD:cancel=cancelled` — real completion,
      cloud trace with provider-reported usage + snapshot cost,
      mid-flight cancel over real latency.
- [x] S03 Prompts folders (scoped — owner amendment 2026-07-21) —
      done 2026-07-21: `renderer/src/editor/prompts.ts` (chain walk
      root + any folder + project — a project IS a folder, one rule
      covers all scopes; nearest-wins shadowing; frontmatter
      `kind: system | message`; injected `listVaultFiles`/`readNote`,
      zero new IPC); AiPanel: message prompts join the preset row
      scope-tagged, system selector → `AiOperation.systemPrompt`
      (bounded 8k main-side; replaces the IDENTITY line only — the
      grounding rules/destination brief compose main-side regardless,
      28); starters via explicit ☰ action, idempotent missing-only;
      prompts reload on vaultFilesChanged (edit→use). Tests 455→467/45
      (prompts.test.ts + validation/composition cases); typecheck/
      build/smoke green (smoke op now rides a systemPrompt). Pills +
      chat consumption land with their surfaces (S04/S06). No
      learning note: convention + scanner over proven patterns (S07k
      folder conventions, injected-verb testing) — no first
      mobilization; the S02 note covers the adapter seam.
- [x] S03b (owner directives, same day) — done 2026-07-21: (1) the
      tree context menu shows "New prompt…" inside any prompts/
      folder — kind radio (message | system) + name autofill the
      frontmatter (`buildPromptFileContent`; TreeMenu morph pattern,
      same createNote verb, file opens for editing); (2) BUILDABLE
      LAYERS: a full-line `{{prompt: name}}` inserts the named prompt
      as a layer (`expandPromptLayers`), system and message composing
      freely with the OUTER kind governing; layer names resolve
      through the SAME nearest-wins scoping (a project overrides a
      layer), depth 8, unknown/cycle/inline stay LITERAL (broken
      references visible, never dropped), expansion at load after
      shadowing. Tests 467→473/45; typecheck/build/smoke green.
- [x] S03c (owner directive, same day) — done 2026-07-21: `@` in the
      AI instruction field opens the prompt quick-action menu (the @
      citation-menu precedent, hand-rolled textarea popup, zero
      deps): token at start-or-after-whitespace `@` (emails inert),
      live name+title filter, full keyboard (arrows/Enter/Tab/
      Escape) + click; message → composed body inserted at the
      caret, system → selector set + token removed; kind + scope
      tags on every row (36 popover idiom). Pure helpers tested.
      Tests 473→477/45; typecheck/build/smoke green.
- [x] S03d (owner bench corrections, same day) — done 2026-07-21:
      (1) @ pick inserts the LAYER DIRECTIVE, not the flattened body
      (`insertDirectiveAt`, own-line padding preserves the full-line
      rule) — the instruction IS a buildable custom prompt; it
      composes at RUN TIME (`expandInstruction`) through the note's
      resolved scopes, the box keeps the layered form, unknown
      layers stay visibly literal; pills APPEND the directive
      (never overwrite typed text). (2) prompt pills visibly
      file-backed (dashed ring + @ glyph, scope in the tooltip).
      (3) CRLF tolerance in `parsePromptFile` — the likely cause of
      a prompt not showing: a Windows-side edit's line endings
      failed the fence match and the file vanished silently;
      nearest-first (folder → root) order verified and PINNED by
      test through the filter. Tests 477→481/45; gates green.
- [x] S03e (owner bench screenshots, same day) — done 2026-07-21:
      the owner's @ was the EDITOR's citation menu (authoring
      prompts/tone.md), not the AI panel — prompts surfaced only as
      generic note links, buried under sources. `promptLayerEntries`
      joins quick-actions.ts: when the edited note lives in a
      prompts/ folder the @ menu LEADS with the note's resolved
      prompts — `prompt` chip (accent), kind + scope in the detail,
      nearest-first folder→root via CodeMirror boost, picking
      inserts the LAYER DIRECTIVE (never a link), the file never
      offers itself; ordinary notes keep the unchanged citation
      menu (a directive is inert there). Tests 481→484/45; gates
      green.
- [x] S03f (owner brainstorm: "nesting system prompts was choosing
      multiple prompts and order them … personality > tone >
      objectives … modularity and/or interconnection … in the future
      agent behavior"; prompted exchange chose drag-and-drop +
      save-now) — done 2026-07-21: the system side becomes an
      ordered STACK of blocks in the AI panel — @ picker appends,
      pills drag to reorder, × removes; run composes bodies in stack
      order into ONE systemPrompt (blocks pre-expanded; deleted
      blocks drop silently; grounding rules still main-side on top);
      "save" persists the stack as a prompt FILE of directive lines
      in root prompts/ — round-trip PROVEN (expanding the saved file
      reproduces the composition). The same convention is the
      FORWARD PATH for agent behavior: a future vault-writing agent
      authors sub-agent prompts as these exact files (recorded for
      the roadmap conversation at the closing ceremony). Tests
      484→487/45; gates green.
- [x] S04 Selection context menu — done 2026-07-21:
      `AiSelectionMenu.tsx` (TreeMenu machinery: overlay, clamping,
      morph in place) on editor right-click + Shift+F10 at the caret;
      quick actions = resolved message prompts scope-grouped
      nearest-first (`groupPromptsByScope`) + built-ins, a pick runs
      the LAYER DIRECTIVE; "Custom…" = instruction input at the
      click location + system pills whose CLICK ORDER builds the
      stack (`toggleStackBlock`, numbered); "Open chat" opens the
      panel docked right (interim surface until S06). Menu → panel
      handoff via `AiPanelRequest` (id applied once, auto-run
      deferred one render past prefill). The Sparkle button LEFT the
      note-bar. Tests 487→489/45 (grouping order, pill toggling);
      gates green. Honest gaps: the popup's custom input has no @
      menu (the panel's does — iteration continues there); menu
      visuals await the owner bench (no screenshot rung for popups).
- [x] S04b (owner bug report: "generated doesnt correspond to prompt
      sent") — done 2026-07-21: ROOT CAUSE a race in the S04
      auto-run — it fired against the STATE snapshot of prompts,
      empty right after panel mount, so `{{prompt: name}}` resolved
      nothing, stayed LITERAL, and traveled verbatim to the model
      (the system stack emptied the same way). FIX: run() awaits the
      load PROMISE (`promptsReady` ref), never the snapshot —
      composition always sees real prompts, auto-run or manual.
      EXPOSED (26, owner ask): the collapsible "sent request"
      inspector in the panel — the COMPOSED instruction and system
      stack exactly as they traveled (layers expanded), preset,
      selection bounds/chars/whole-note, destination; set before the
      await so failed runs stay inspectable; notes that main adds
      grounding rules + destination brief on top. Limit recorded:
      the hook-level race has no unit seam in this harness (no React
      DOM tests); empty-list literalness already pinned by test.
      Tests 489/45 unchanged; gates green.
- [x] S04c (owner redesign: "first and only contextual display …
      expand 1,2,3 to message prompts as well") — done 2026-07-22:
      the menu is ONE flat composer, no morph — orderable MESSAGE
      section and BUILT-IN section sharing one numbered click
      sequence (`composeMenuInstruction`: directives for files, raw
      lines for built-ins, optional typed input LAST), orderable
      SYSTEM section (the stack), optional input, one Run; Enter
      runs and closes (Shift+Enter = newline); display capped per
      section (`visibleMenuPrompts`, MENU_SECTION_MAX 6) with a
      search bar past MENU_SEARCH_THRESHOLD 10 total — picked pills
      never drop out of view; preset recorded only for a single
      untyped pick; "Open chat" survives in the footer. Tests
      489→491/45; gates green.
- [x] S04d (owner report: highlighted "ethymology" in philosophy.md,
      answer was about philosophy) — done 2026-07-22: VERIFIED the
      right variable travels (the capture's inspector: selection
      110–120 · 10 chars = the highlighted word) — the leak was the
      MESSAGE SHAPE: the selection header led with the file path, so
      a 10-char subject sat under a loud "philosophy". Fix in
      buildMessages: subject-first block (`### Subject selection N`,
      content fenced, path demoted to a trailing provenance line) +
      a system rule ("the selected text IS the subject; never infer
      the topic from a path or filename") — pinned by test (subject
      before provenance, no path in the header). The inspector now
      shows the captured selection TEXT (200-char excerpt) beside
      its bounds. Tests 491→492/45; gates green.
- [x] S04e (owner capture: "input field is off and also we cant
      chose the way it will integrate") — done 2026-07-22: the menu
      gets a fixed width (330px) with full-width search/input
      (box-sizing; the textarea no longer overflows the popup), and
      a DESTINATION section — replace / append / new note radio
      pills (replace disabled without a selection, default append) —
      traveling through AiMenuRequest → AiPanelRequest to the panel
      BEFORE the auto-run fires. Tests 492/45 unchanged (UI wiring);
      gates green.
- [x] S04f (owner report: "answers are very short" + capture) —
      done 2026-07-22: the request RECONSTRUCTED verbatim from the
      owner's vault (evergreen system block + built-in explain +
      10-char subject, new-note): NOT a bug — every stacked layer
      asked for short (atomic evergreen style × "explain simply" ×
      one-word subject × selection-only rule; 22 output tokens, no
      truncation flag, budget 2000) — the model OBEYED the
      composition; guidance to the owner: richness belongs in the
      prompt file body (the stack carries it). Two real fixes from
      the capture: the panel header now shows the RESOLVED ENGINE
      (was hardcoded "mock provider" since S08 while traces said
      cloud-model — 28 honest identity) and the new-note brief no
      longer invites the `# #` doubled-hash title. Tests 492/45;
      gates green.
- [x] S04g (owner directive: "store request content sent and make it
      displayable on hover somewhere") — done 2026-07-22: the sent
      request persists per run (renderer memory only — the trace
      ledger stays content-free, contentRecorded=false untouched)
      and the click-to-expand details became a CHIP + hover/focus
      POPOVER (36 popover idiom, glass + opaque fallback, keyboard
      focus shows it too): summary on the chip (destination · bounds
      · chars), full composed system/instruction/selection in the
      popover. Tests 492/45 unchanged (presentation); gates green.
- [x] S04h+i (owner: "you didn't expose the main side default and
      grounding rules" + "I need the full request copiable") — done
      2026-07-22: composition moved to shared/prompt-composition.ts
      — ONE source of truth for the adapter AND the inspector
      (identity/rules/briefs/closing + subject-first user message);
      the popover now shows the FINAL system prompt verbatim (stack
      or built-in + grounding rules + destination brief + closing)
      and the exact user message shape; "copy full request" button
      (hover/focus-within safe, copied feedback) yields
      `=== SYSTEM === / === USER ===` portable text with the FULL
      selection content (stored renderer-memory only). Pinned by
      test: buildMessages halves === the shared composer outputs;
      the portable text carries both verbatim. Tests 492→493/45;
      gates green.
- [x] S04j (owner playground comparison) — done 2026-07-22:
      DIAGNOSIS of "different result in the playground": (1)
      sampling, not composition — playground ran
      mistral-small-latest at temp 0.7 vs the app's pinned
      mistral-small-2603 at 0.2 (single samples not comparable);
      (2) structural: evergreen rode as the INSTRUCTION (its
      frontmatter now kind: message → message section → preset
      file:evergreen; system was built-in) — an instruction ABOUT
      evergreen style + a 10-char subject = two competing topics;
      guidance: behavior prompts belong kind: system, picked in the
      SYSTEM section; (3) my popover's labeled-blocks layout invited
      a wrong manual reconstruction — the popover now shows the TWO
      API MESSAGES VERBATIM (composeUserMessage view) + a params
      line (temp/max_tokens/pinned model) for fair external tests.
      Tests 493/45; gates green.
- [x] S04k (owner pushback: evergreen was in the MESSAGE in BOTH
      runs — the S04j structural point could not explain the delta)
      — done 2026-07-22: A/B-BENCHED the EXACT app wire against the
      owner's paste on the pinned model via API (owner key, ~21
      calls): app wire → "# Evergreen" 3/3 at t0.2; owner paste →
      "# Etymology" 2/2 — the DELTA was WIRE FRAMING, not params and
      not message-vs-system: the prompt body's opening H1
      ("# evergreen") behind "Instruction:" was being ADOPTED as the
      note title (the new-note brief asks for an H1 title; the
      instruction handed one over). Fix benched then shipped:
      grounding rule "headings inside the instruction are
      STYLE/BEHAVIOR guidance only — topic and title come from the
      subject selection" (3/4 alone) + the instruction travels
      BLOCKQUOTED in the user message (4/4 with both). Shared
      composer updated — wire, popover, and copy moved together;
      test updated to the quoted form. Tests 493/45; gates green.
- [x] S04l (owner: copy broken + "reforge the composition — clearly
      layered template, deterministic injection, note state for
      append/replace, step-by-step") — done 2026-07-22: the shared
      composer is REFORGED as a fixed layered markdown template —
      SYSTEM: `# Role / # Rules (## Grounding, ## Output)`; USER:
      `# Request / ## Instruction (quoted) / ## Subject (###
      Selection N) / ## Note context / ## Steps` — every dynamic
      part injected into its slot deterministically. NEW
      `AiOperation.noteContext` (validated, 8k/part): append sends
      the note's TAIL + "appended right after the ending shown —
      do NOT duplicate"; replace sends BEFORE/AFTER excerpts +
      "must read seamlessly"; captured renderer-side at run
      (3000/1500-char windows), rides wire+popover+copy identically.
      Explicit `## Steps` gives the integration order (subject →
      style → context check → output). LIVE BENCH on the pinned
      model: etymology case 3/3 on-topic; append probe produced a
      distinct sibling section at the right heading level, no
      content duplicated. COPY FIXED: navigator.clipboard rejection
      no longer swallowed — execCommand fallback + visible
      "copy failed" state. Tests 493→496/45; gates green.
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
base commit : 6cacfa2 — ACTIVATED 2026-07-21 (owner: "ok lets go"
              after both ceremonies; chats-persist-as-files
              amendment from the opening check).
changed     : S01 docs-only (this ledger + log). S01 PINS:
              — GenerationAdapter (ai-core seat, 14): main-only
                module, PURE COMPUTE like ai-mock (never touches the
                fs; accepted patches ride the editor buffer + vault
                verbs). `{ id: 'mock' | 'mistral'; generate(op,
                signal) -> { bundle: AiResponseBundle;
                usage?: provider-reported tokens; providerMeta } }`.
                The ai-mock header's promise IS the bar: renderer
                contract unchanged; identity travels in the
                answering adapter's output (transcription-seat
                precedent). Mapping: instruction + selection(s) →
                chat-completions messages (system prompt from
                prompts/ or built-in; selection bounded by ai-mock's
                MAX_INSTRUCTION=4000 / MAX_SELECTION=100k); response
                → answer block + one PatchProposal for op.target
                (replace-range | append | create — the mock's
                destinations); labelClaims runs MECHANICALLY over
                real output (28: the model never self-grades).
              — Error taxonomy (typed, surfaced, NEVER silent
                fallback to mock — 13 explicit-policy rule):
                offline/network, timeout (AbortController),
                auth (401/403 → "Settings → AI"), rate/quota (429,
                retry-after surfaced, no auto-retry loops),
                provider-4xx (request bug), provider-5xx, cancelled,
                budget-exceeded (main-side pre/post check).
              — Model id: EXACT pinned string constant (precedent
                mistral-ocr-4-0 / voxtral-mini-2602); S02 confirms
                the current Mistral Small id against provider docs
                and records it dated; upgrades = new dated decision.
              — Price snapshot (dated, 33): docs/research/
                model-research.md — Mistral Small $0.10–0.15 in /
                $0.30–0.60 out per MTok, 128K ctx, EU residency, no
                caching, batch −50%. Trace billing: basis
                'estimated' from this snapshot (priceSnapshotId →
                the research file), tokens provider-reported when
                present, estimated otherwise, each labeled (06).
              — Budgets in MAIN below renderer state (06/33):
                default maxOutputTokens 2k, maxWallMs 60s via
                AbortController, input bounded by the mock's
                constants; cancel mid-flight required.
              — prompts/ pin (AMENDED 2026-07-21, owner prompted
                exchange: root + ANY folder + project, nearest-wins
                from the note outward, same-name shadowing, menu
                grouped by scope — supersedes root-only): file =
                markdown + frontmatter `kind: system | message`
                (optional title/description); scanned via EXISTING
                vault verbs (zero new IPC); built-ins when no scope
                provides one; starter materialization only on
                explicit action, per scope.
              — chats/ pin (owner: files): vault-root `chats/`
                beside prompts/; one chat = one markdown note
                `chats/YYYY-MM-DD-<slug>.md`, frontmatter
                `type: Atomik Chat` + engine + timestamp; the file
                is BORN at the first message (never on panel open —
                no writes on open), turns append as `## you` /
                `## atomik` sections through the ordinary write
                path; a transcript is an editable, linkable note;
                appears in Contents like any note (S07k conventions
                apply to its folder like any other).
              — Inline claim strip: compact chips reusing the
                existing truth-chip language (31 joins Required only
                if more is needed).
              — OPEN (owner bench at S07): default engine when a key
                is configured — proposed default 'mistral', mock
                stays selectable.
tests       : 455 passing / 44 suites (S02: +generation-adapter suite,
              ai-settings + action-trace extended). Typecheck + build
              green; smoke `ai=ok:2/1/4/1 … labels=source-backed,
              model-only,needs-citation,interpretive` through the new
              async handler; LIVE rung proven (owner pointer to
              .env.local): `aiLive=ok:cloud-model/mistral-small/
              150+11tok/0.000029USD:cancel=cancelled`. Generation
              handler + live rung honor the MISTRAL_API_KEY dev
              override (CP-MVP-005 precedent, index.ts transcription
              site); settings-file key still wins when present; the
              override is invisible to publicAiSettings (same as the
              OCR rung) — engine 'mistral' must be chosen explicitly
              when only the override exists.
changed(S02): generation.ts + mistral-generation-adapter.ts NEW;
              ai-mock.ts (provenanceLine exported); ai-settings.ts
              (engine field + resolution); action-trace.ts (engine
              meta, labeled usage, USD billing + priceSnapshotId,
              privacy cloud); index.ts (async handler, engine
              resolution, cancel + setAiEngine channels, live smoke
              rung); ipc-contract + preload (+cancelAiOperation,
              +setAiEngine, AiEngine, AiSettingsPublic.
              generationEngine); AppMenu engine picker; AiPanel
              Cancel; learning note 17 + index; module note.
              S02 FACTS: model id `mistral-small-2603` pinned live
              2026-07-21 (docs.mistral.ai models overview — Mistral
              Small 4); cost snapshot upper bound $0.15/$0.60 per
              MTok, id docs/research/model-research.md@2026-07-20;
              error kinds ride messages as `ai(<kind>): …`; smoke
              engine restore writes the resolved engine explicitly
              (accepted quirk of the rung).
tests(S04)  : 489 passing / 45 suites; typecheck/build green; smoke
              `ai=ok` (panel loop unchanged through the S04 handoff).
next action : S05 — inline live preview: proposal rendered over the
              target range as a CM widget (live-preview WidgetType
              pattern) with accept / edit / reject + compact claim
              strip + trace badge; buffer untouched until accept →
              existing applyChange + save; AiPanel loop logic
              (run/accept/reject/challenge/trace) extracted into
              shared hooks consumed by both new surfaces; cancel
              mid-flight; tests (widget lifecycle, accept byte
              fidelity, reject leaves zero trace).
blockers    : none. OPEN (S07 bench): default engine when a key is
              configured — 'mistral' proposed, implemented as the
              key-present resolution default, mock stays selectable.
```

# Blockers

- None. (Both 2026-07-21 ceremonies recorded: closing ceremony in the
  vision-alignment session note; opening check answers there and in
  this file's DoD/S01 amendments.)
