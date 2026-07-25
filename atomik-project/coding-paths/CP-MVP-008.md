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
  current_step: S07
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
- [x] S04m (owner directive: "when creating new notes, name of the
      files should be the selected text") — done 2026-07-22:
      `newNotePathForSelection` — the selection names the file,
      sanitized (fs/link-hostile chars dropped, whitespace
      collapsed, 60-char cap, Windows-safe edges), beside the
      source note; empty/unusable selection falls back to the old
      `-ai` default. The path field PREFILLS live when new-note is
      picked (panel radio + menu handoff) while untouched — the
      destination stays visible, never a surprise; a customized
      path always wins. Tests 496→499/45; gates green.
- [x] S04n (owner: playground and app outputs still differ) — done
      2026-07-22: EXPECTATION PINNED — the remaining delta is
      SAMPLING (t=0.2 is low, not zero; neither side sets a seed;
      byte-identical cross-tool outputs are not a real target;
      topic/structure now agree, which is what the S04d/k/l chain
      fixed). One REAL artifact from the owner's paste fixed: the
      model quoted ITS OWN sentences as blockquote "citations" (the
      exact-quote rule misfiring on a one-word selection — citation
      theater; the checker labeled them model-only but the note
      carried noise). New grounding rule: quote ONLY selection/note-
      context text, NEVER your own sentences, no quote block when
      nothing supports. Benched 3/3: on-topic, zero fabricated
      quote blocks. Option recorded (not implemented): Mistral's
      random_seed could make app runs repeatable if the owner wants
      it at the bench. Tests 499/45; gates green.
- [x] S04o (owner: "use note link in prompts as an insertion of it"
      + mid-turn "same in custom input field on contextual menu") —
      done 2026-07-22: markdown `.md` links in the COMPOSED
      instruction (typed in the panel, typed in the menu's custom
      input — one run() path covers both — or living inside prompt
      files) become LINKED-NOTE insertions: `extractNoteLinks`
      (angle-bracketed or plain, anchors stripped, deduped, cap 4) +
      `linkedNoteCandidates` (resolve vs the note's folder → vault
      root → raw; first readable wins — links written in prompt
      files resolve too); read via the EXISTING readNote verb,
      capped 6k chars each, riding as EXTRA SELECTIONS (input[0]
      stays the subject) — so quotes from a linked note earn
      source-backed with evidence anchored to that note, zero new
      truth machinery. Template: `## Linked notes — read-only
      reference material (quotable)` + a dedicated step; grounding
      rule amended (linked notes are reference, NOT the subject).
      Inspector/copy carry them. LIVE BENCH 2/2: the model added
      the block using the linked note's exact text. Tests
      499→502/45; gates green.
- [x] S05 Inline live preview: proposal rendered over the target
      range as a CM widget (live-preview WidgetType pattern) with
      accept / edit / reject + compact claim strip + trace badge;
      buffer untouched until accept → existing `applyChange` + save;
      AiPanel's loop logic (run/accept/reject/challenge/trace)
      extracted into shared hooks consumed by both new surfaces;
      cancel mid-flight; AUTO-LINKING (owner amendment 2026-07-22):
      accepting a new-note run replaces the source selection with a
      relative link to the created note (label = the selected text;
      whole-note runs skip; same undoable buffer path); tests
      (widget lifecycle, accept path byte fidelity, reject leaves
      zero trace in the buffer, link replacement).
      S05a DONE 2026-07-22: the run pipeline extracted to
      `ai-run.ts` (`prepareAiRun` — layers, note links, landing
      context, stack, operation + sent-request built in ONE place,
      pure over injected readNote; the panel is now one consumer,
      the widget and chat will be the others) + AUTO-LINK live:
      accepting a new-note run replaces the source selection with
      `[selected text](<relative path>)` via the same undoable
      buffer path + save (whole-note runs and drifted buffers skip;
      applied message says "selection linked to it");
      `selectionLinkReplacement` tested (relative walk, label
      whitespace collapse). Tests 502→504/45; gates green.
      S05b DONE 2026-07-22: `inline-ai.ts` — StateField + effects
      (live-preview pattern, headless-computable): block widget
      after the anchor (+ accent highlight over the replace range),
      phases running (Cancel) / review (editable proposal textarea,
      truth-chip claim strip capped at 8, trace badge with
      tokens/cost tooltip, ✓ Accept / ✕ Reject) / error (message +
      dismiss); the ANCHOR MAPS through document edits — never
      stale offsets; buffer untouched until accept → the same
      applyChange + save path (create → createNote + S05 AUTO-LINK
      at the mapped anchor); menu quick/custom runs now render
      INLINE (DoD: quick requests do NOT open the panel; the S04
      panel-handoff wiring retired), "Open chat" still opens the
      docked panel until S06. Tests 505→509/46 (widget lifecycle,
      append anchoring, anchor mapping, reject-zero-trace, accept
      byte fidelity). Honest notes: accept logic lives in the
      inline controller AND the panel (unify when the panel retires
      at S06); the sent-request hover inspector is panel-only —
      inline runs show the trace badge but not the request popover
      (candidate S06 refinement); widget visuals await the owner
      bench. Gates green. S05 COMPLETE.
      S05c (owner bench, three reports) DONE 2026-07-22: (1) "wrong
      generation — stays on etymology": DIAGNOSED from the live
      vault — evergreen.md line 14 says "Always add an
      [Ethymology](…) block at the beginning" — every run carried
      that command + the linked note, and thin subjects got
      swallowed; NOT a pipeline bug, but the composition now pins
      the counterweight: "the output stays ABOUT the subject from
      title to last line; linked notes must NEVER become the topic"
      — benched with the owner's UNMODIFIED prompt: 3/3 "# Stoicism"
      titles WITH the etymology block (the prompt's intent honored,
      the subject kept). (2) copy REGRESSION: menu runs went inline
      where no inspector existed — the inline widget now carries
      the sent request + a "copy request" button (shared clipboard
      util, panel deduped onto it). (3) new-note preview is a
      SIMULATED TAB (AiNotePreview overlay): tab chrome with the
      future path + "preview — not created yet", rendered markdown
      (edit toggle), claim chips, trace badge, copy request,
      ✓ Create note / ✕ Reject (close = reject); created ONLY on
      accept; auto-link applies drift-guarded. Tests 509/46; gates
      green.
      S05d (owner feedback wave) DONE 2026-07-22: (1) linked notes
      moved to the TOP of the user message as the PRIOR-KNOWLEDGE
      context bundle (`## Prior knowledge — linked notes (context
      bundle…)` before Instruction/Subject); (2) Steps follow the
      owner's canon exactly: subject → draw on linked notes → style
      → (note context) → output, numbering pinned by test;
      re-benched 3/3 `# Stoicism` on the reordered template. (3)
      `mistral-medium-2604` joins the allowlist (Medium 3.5 v26.04,
      docs.mistral.ai; prices FETCHED from mistral.ai/pricing/api
      2026-07-22: medium $1.5/$7.5, small $0.15/$0.6 — snapshot id
      updated, per-model billing); shared/generation-params.ts owns
      models/limits/validation; `AiOperation.params` (model,
      temperature, topP, maxTokens — bounded, validated main-side,
      top_p sent ONLY when set) rides the menu's new FOLDABLE
      options section through prepareAiRun into the adapter;
      params recorded in the sent request. (4) TRANSPARENCY restyle
      (owner: "framing an already existing text"): the inline
      widget renders the proposal as `markdown-body` note content —
      transparent ground, subtle accent outline, thin head, ghost
      bottom actions with an edit↔preview toggle; the tab-sim
      body uses `markdown-body` too (regular note rendering).
      Tests 509→511/46; gates green.
      S05e (owner directive: new-tab "new note" → chooser screen +
      from-scratch generation) DONE 2026-07-22: the + tab's 'note'
      pick now opens a STAGE (`NewTabFlow` — transient UI, the tab
      stays view 'new') with the blank "New note" button on top and
      the FULL composer beneath (`GeneratedNoteScreen`): topic input
      (names the note AND is the subject), scoped message/system
      pills with click-order numbering, built-ins, search past the
      cap, the S05d foldable options, an optional ask — Generate
      runs the SAME prepareAiRun pipeline from scratch (empty doc;
      topic = subject selection; composed instruction falls back to
      "Write this note about the subject."), previews as the S05c
      simulated tab, and on accept the created note OPENS IN THIS
      TAB (vault or project pane alike; project panes scope prompts
      and land the file via `<project>/generated.md` anchoring).
      Honest note: the composer markup is shared-by-helpers with
      the selection menu but not yet one component — extraction
      candidate when S06 settles the surfaces. Tests 511/46
      unchanged (all logic reused is already pinned); gates green.
      S05f (owner: "is it normal that we don't have strong/italic
      rendering?") DONE 2026-07-22: NO — the inline widget's rendered
      markdown inherited the EDITOR's monospace stack (it lives in
      .cm-scroller), which under WSLg's font resolution can drop the
      bold/italic faces and in any case broke the S05d "same font as
      the note" transparency goal. Fixed: `.cm-inline-ai-rendered`
      pins read-view typography (system-ui stack, --note-font-size/
      line-height, --fg) and `.markdown-body strong/em` are asserted
      explicitly so NO ancestor chain (CM scroller, widget frames,
      theme spans) can flatten note formatting on any AI surface.
      Tests 511/46; gates green; visual confirmation = owner bench.
      S05g (owner: "task list doesnt [render] anywhere") DONE
      2026-07-22: confirmed — no HTML surface rendered `- [ ]`.
      NEW `note-markdown.ts`: the ONE note renderer — every
      HTML-rendering surface (read view, AI panel blocks, inline
      widget, tab simulation) now builds its MarkdownIt from this
      factory, so rendering conventions cannot drift per surface;
      it carries a HAND-ROLLED GFM task-list rule (15: zero deps) —
      `- [ ]`/`- [x]` render as disabled accent checkboxes
      (read-only; toggling stays an edit in the editor); prose
      brackets untouched, checked state kept, quoted tasks convert.
      Tests 511→514/47 (note-markdown.test.ts); gates green.
      S05h (owner bench, three reports) DONE 2026-07-22: (1) the
      ‹ › history nav joins the EDITOR's note-bar (VaultView AND
      ProjectView pass their guarded nav into EditorPane — it was
      read-mode-only); (2) read/edit column parity: live's
      `.cm-content` was border-box, so --note-pad ate ~5rem of the
      46rem text column vs read (pad on the scroller) — now
      content-box, text width identical across modes; (3) new-note
      preview is a NATIVE note simulation: the tab strip over a
      regular `.note-scroll` + `.markdown-body` column holding ONE
      inline-AI framed block — the same visual as append/replace —
      with trace/claims/copy/edit/accept INSIDE the frame; plus the
      block-alignment fix everywhere: the widget's inner
      markdown-body fills the frame (max-width none) instead of
      re-centering a narrower column, so the AI text lines up with
      the note text and the outline hugs the same width. Tests
      514/47; gates green; visual confirmation = owner bench.
      S05i (owner: "line height space in read and edit mode are
      different") DONE 2026-07-22: base line-height already matched
      (1.6 both modes) — the delta was BLOCK MARGINS: the read view
      stacked browser defaults (p 1em, h2 2rem top…) on top of the
      grid while the editor's rhythm is pure line arithmetic (blank
      line = one line box). markdown-body blocks (p/ul/ol/quote/
      pre/table/hr) now speak line-height multiples
      (margin-block 0 → 1.6em), list items 0, headings drop fixed
      margins and take line-height 1.6 at their own size — read
      spacing IS the editor's blank-line spacing, on every surface
      that renders notes (read view, widget, tab-sim). Tests
      514/47; gates green; rhythm check = owner bench.
      S05j (owner: "worse than before, specially after md titles") —
      DONE 2026-07-22: S05i's zero-margin headings were parity by
      FLATTENING — wrong direction. New shared tokens
      --note-h-above (1.1em) / --note-h-below (0.3em): read headings
      take them as margins, LIVE heading lines take the SAME tokens
      as line padding (em-relative to each heading's own size) — the
      air is back AND the modes still match, tunable in one place.
      Tests 514/47; gates green.
      S05k (owner screenshots: live still airier than read) — DONE
      2026-07-22: the MECHANISM finally named — READ collapses blank
      lines into margins (they render as nothing) while LIVE shows
      every blank line as a real line box; S05j's padding then
      STACKED on those boxes. Model fixed: ONE token
      --note-block-gap = the height of one blank editor line
      (rem-based, heading sizes don't scale it); read margins speak
      ONLY in that unit (blocks: one gap below; headings: one gap
      each side, margin collapse absorbing the neighbor's) and live
      gets NO added padding — the author's blank lines ARE the air,
      identical in both modes wherever the source has one blank
      line between blocks (the normal note shape; multiple blank
      lines drift only live-side — that is markdown, accepted and
      recorded). S05j reverted live-side. Tests 514/47; gates
      green; screenshot re-check = owner bench. S05l (owner: "top
      padding looks smaller in editing mode, bigger preferred"):
      live's .cm-content padding-top gains one --note-block-gap —
      matching read's opening (pad + the first heading's collapsed
      margin). OWNER VALIDATED the rhythm ("ok looks good now").
      S05m (owner screenshot pair, Socrates note): the remaining
      visible delta was LISTS — read hang-indents wrapped bullet
      text, live wrapped flush-left. New shared token
      --note-list-indent (1.6em): read ul/ol take it as
      padding-inline-start, live list LINES gain an `lp-li` line
      class (live-preview.ts, ListMark branch) carrying the same
      token as a hanging indent (padding-left + negative
      text-indent, children reset) — one bullet column in both
      modes, tuned in one place. Tests 514/47; gates green.
      S05n (owner: "lists still not the same, ## ### titles
      neither") — DONE 2026-07-22, three concrete defects: (1) my
      S05m hanging indent MISALIGNED the first line (negative
      text-indent pulled it to column 0 while wraps sat at 1.6em) —
      replaced by the GUTTER model: the bullet widget is
      inline-block, its own width, pulled left into the indent; text
      starts at the same column on every line, read-identical. (2)
      read h1 wears border-bottom + 0.3rem padding that live h1
      lines never got — live lp-h1 now wears the same. (3) a stale
      `.markdown-body h2 { margin-top: 2rem }` was still in the read
      rules (masked by cascade order, a specificity accident away
      from breaking the grid) — removed; the token grid owns heading
      spacing. Tests 514/47; gates green; owner re-check.
      S05o (owner screenshots: gap after `### Key Ideas` in read,
      none in edit — the source has NO blank line there) — DONE
      2026-07-22: the whole fixed-margin approach was structurally
      unable to track the author's blank lines; REPLACED with
      SOURCE-TRUE spacing — note-markdown.ts reads markdown-it's
      token line map and marks every top-level block with its ACTUAL
      preceding blank-line count: 0 → `md-tight` (no gap, exactly
      like the editor), 1 → the default one-gap margin, N → an
      inline calc(N × --note-block-gap). CSS: block/heading margins
      zeroed; one low-specificity :where rule gives the default gap;
      the class and the style win over it. The S05l live-only
      padding reverted; --note-pad top becomes 3rem — the opening
      the owner preferred, now genuinely shared. Read spacing IS the
      source, byte for byte (loose-list interiors recorded as the
      remaining known drift). Tests 514→515/47; gates green.
      S05p (owner screenshots: read mode collapsed to ZERO gaps
      everywhere — S05o shipped broken) — DONE 2026-07-22, two
      defects in S05o itself: (1) the default-gap rule wrapped BOTH
      halves in :where — specificity (0,1,0) LOST to the (0,1,1)
      zeroing rules, so margin-top never applied and every block sat
      tight; the :not(:first-child) half is now bare, (0,2,0), which
      beats the zero rules while `.md-tight` (equal, later) and the
      inline style still win. (2) blankLines came from the previous
      token's map END, but markdown-it list maps swallow their
      trailing blank line — every block after a list read as tight;
      the count now comes from the SOURCE lines above each block's
      start. Verified pixel-level WITHOUT the owner's desktop: app
      launched headless-ish with --remote-debugging-port, CDP
      Page.captureScreenshot + DOM probes (exactly one md-tight — the
      Key Ideas list; one inline 2-gap style; computed h2 margin-top
      = one --note-block-gap). Tests 515→516/47; gates green.
      S05q (owner screenshots: "slight offset after bullet point on
      editing mode") — DONE 2026-07-22: the bullet decoration
      replaced ONLY the dash; the marker's following space stayed as
      text after the widget, pushing the FIRST line one space right
      of its wraps (read has no such space — text starts at the
      padding edge). The replaced range now swallows that single
      space (guarded: only when the next char IS a space). CDP
      verification: bullet widget sits exactly one --note-list-indent
      (24.32px) left of the pad edge; screenshot shows first line and
      wraps on one column. Tests 516/47 (bullet ranges pinned
      dash+space); gates green.
      S05r (owner: "bullet point is not at the same location — more
      on the left in editing mode") — DONE 2026-07-22: read used the
      UA ::marker (glyph hugging the text) while live's widget
      left-aligned its '•' at the gutter's far edge. Both modes now
      draw the SAME '•' in the SAME gutter box: shared rule (width =
      --note-list-indent, right-aligned, new --note-bullet-gap 0.5em
      before the text); read drops the UA marker for an
      absolutely-positioned li::before (absolute, not in-flow — a
      loose item's first child is a <p>, an inline bullet would take
      its own line); task items excluded (checkbox is their marker).
      CDP-measured: glyph right edge read 361.20px / live 361.21px,
      text 368.81px in both — same column to a hundredth of a pixel.
      Probe harness hardened: spawn detached + kill(-pid) (app.kill
      on the npx wrapper orphaned electron — a stale instance held
      the CDP port and answered for the wrong mode). Tests 516/47;
      gates green.
      S05s (owner: "verify justify + text width are the same; add a
      font size slider and input in the menu") — DONE 2026-07-22.
      VERIFIED via CDP body-line probes, read vs live: text-align
      start/start, text-justify auto/auto (neither justifies),
      font-size 15.2/15.2, line-height 24.32/24.32, letter+word
      spacing identical, column left 344.5/344.5, content width
      736/736 — full match. Two editor-inherent deltas: white-space
      (break-spaces in live so consecutive spaces stay visible —
      source-true, not drift) and tab-size 8 vs 4 — FIXED: read
      .markdown-body now tab-size: 4, matching CM. FONT SIZE
      CONTROL: new settings entry noteFontSize (px string, clamped
      12–24, absent = stylesheet default) with noteFontSizeOf /
      setNoteFontSize in model.ts (theme-setting pattern);
      Workspace.tsx sets --note-font-size on :root — BOTH modes and
      every derived token follow, because --note-h1/h2/h3-size
      became calc(--note-font-size × old-ratio) (same px at the
      0.95rem default); AppMenu gains a "Note text" row: range
      slider (direct commit) + number field (draft, commits on
      blur/Enter — per-keystroke commit would clamp "1" before "16"
      is typed) + px unit + reset (shown only when overridden).
      CDP end-to-end: slider→20 gives body 20px, h2 26.32px (ratio
      kept), number field synced, reset back to 15.2px, state file
      carries noteFontSize:"20" across restart. Tests 516→518/47
      (noteFontSizeOf clamps/garbage/round-trip/reset); gates green.
      S05t (owner screenshots: "i dont know why it is justifying
      differently" — wrap points diverged one word on near-full
      lines) — DONE 2026-07-22. Cause CONFIRMED by CDP toggle: CM
      lays text under white-space: break-spaces (the space AT the
      wrap point takes width); read's `normal` lets it hang — lines
      that end within a space-width of the column wrap one word
      apart (fixture bullet: read "…does" vs live "…knowingly";
      injecting break-spaces into read reproduced live's wrap
      exactly). FIX: read's leaf text blocks (p, h1–h6, th, td, and
      inline-only li via :not(:has(> block))) adopt break-spaces;
      the renderer's soft/hard break rules emit '<br>' WITHOUT the
      default trailing '\n' (break-spaces would render it as a
      phantom second break); container li stay excluded — their
      inter-block newline text nodes would become phantom lines.
      Wrap fingerprints (first word of every rendered line, Range
      walk) now IDENTICAL read/live on the owner's Socrates text,
      link paragraph and bullets included. Bonus: runs of spaces now
      show in read exactly as the editor shows them (source-true).
      Tests 518→519/47 (break rules pinned newline-free); gates
      green.
      S05u (owner mid-session: "add a width config in the menu to
      adjust note text width") — DONE 2026-07-22: noteWidth setting
      (px string, clamped 480–1200, absent = the 46rem stylesheet
      default) with noteWidthOf/setNoteWidth (font-size contract);
      Workspace.tsx overrides --note-column on :root — both modes'
      reading column rides the same token, capped by the pane as
      before (max-width). AppMenu: the S05s row generalized into ONE
      NotePxRow component (slider commits direct, number field
      commits a draft on blur/Enter, reset only while overridden) —
      two uses: Size (12–24, step 0.5) and Width (480–1200, step
      10); row class renamed app-menu-fontsize → app-menu-px. CDP
      e2e: width→900 sets the root var, the live column widens to
      the pane cap in a 1200px window (max-width correct), number
      field syncs, noteWidth:"900" persists. Tests 519→520/47; gates
      green.
      S05v (owner: "add warm colors themes single and multicolor; I
      still don't feel any glassy transparency in the panel — is
      that normal?") — DONE 2026-07-22. WARM FAMILY, same token
      contract + surface ladder: terracotta (light single),
      ember (dark single), sunset (light MULTI), hearth (dark
      MULTI). Multicolor = new --wash-a/--wash-b tokens (default:
      accent) feeding the body's two gradient blobs — sunset washes
      orange+rose, hearth ember+wine; window-bg map + tests extended
      (values coupled by hand per the S07q rule). GLASS ANSWER:
      standing chrome is tint-only WITHOUT blur by design (36 §glass
      — WSLg software-GL budget), so bars/sidebar never frost — that
      part IS normal; the menu popover DOES carry the sanctioned
      blur but 66% opacity over a flat wash read as opaque. Tints
      moved: --glass-pop 66→54, wash blobs 14/9→20/14 (36 floor
      note honored: both schemes re-checked on screenshots — text
      through the panel now visible, menu text still clearly
      legible). Verified: all 4 themes screenshot via CDP (menu open
      over note text), 15-theme picker renders, contrast holds
      light+dark. Tests 520/47 (4 new window-bg pins); gates green.
- [x] S06 Chat lateral panel — DONE 2026-07-23. RIGHT pane-chrome
      column on the pane-tree contract: the leaf gained a validated
      `chat` string map (on/w/file; workspace-state validates it like
      `tree`), the pane grid a third column, ChatPanel.tsx the
      component — toggled from the tabstrip (ChatIcon, aria-pressed)
      or the selection menu's "Open chat"; ABSENT map reads hidden =
      the whole pre-S06 migration. MULTI-TURN over the unchanged
      operation contract: `AiOperation.thread` ({role user|assistant,
      content}, main-validated ≤24 turns / ≤8k chars, system role
      REFUSED — history can't smuggle behavior), buildMessages
      replays it verbatim between system and the live composed turn;
      the mock stamps `(turn N)` so multi-turn proves offline; the
      smoke op now rides a thread. PERSISTENCE per the S01 pin:
      chats/YYYY-MM-DD-<slug>.md born at the FIRST message (never on
      open; exclusive create, collision retry -2/-3), turns append as
      `## you`/`## atomik` via readNote/writeNote + mtime handshake;
      chat-file.ts holds the pure convention (slug/birth/append/
      LENIENT parse/thread mapping), round-trip tested. INSERT
      through the SAME patch flow: the mounted editor registers a
      PaneAiSurface (S07d guard pattern: notePath + getSelection/
      getDoc/insert); insert lands at the cursor via applyChange +
      save (insertionChange pads an own-block) and resolves the trace
      accepted. AiPanel RETIRED into the two surfaces (file deleted;
      BufferChange/PRESETS moved to ai-helpers; its S10 evidence-
      anchor/"page" buttons + sent-request popover retired with it —
      inline keeps claim chips + copy-request; ~500 lines of dead CSS
      pruned). Verified via CDP both themes (light + moss): column
      opens from hidden default, two exchanges (turn 3 stamp), file
      on disk with 2×you/2×atomik + frontmatter, insert saved into
      the note, pane state carries the file; screenshots green.
      Tests 520→538/48 (chat-file suite NEW; thread validation +
      buildMessages replay + mock turn stamp + chat map validation +
      paneChat helpers); typecheck/build/smoke green.
- [x] S06b (owner bench on the REAL provider, six directives + one
      bug report) — DONE 2026-07-23. (1) ORIENTATION: you-turns hang
      right as tinted bubbles, atomik left (align-self on the
      column's flex; capped widths). (2) HISTORY: header menu lists
      chats/ newest-first (chatHistoryOf — date-prefixed names make
      reverse name order chronological; index/log excluded), click
      reopens any transcript; 36 popover idiom (.chat-pop, glass +
      opaque fallback). (3) BUG "closed a different pane and the
      chat on the active pane disappeared": NOT reproducible at the
      model layer (CDP repro attempts: pane-✕ on sibling, last-tab
      ✕, both orderings — chat map survives every collapse; now
      regression-PINNED in workspace-model tests). Two real paths
      hardened instead: a failed transcript read no longer WIPES the
      file pointer (transient failure showed as an empty new chat —
      the likely sighting; it now keeps the pointer and says what
      happened), and relocateTabPaths drags chat.file so a renamed/
      moved transcript follows instead of dangling. (4) GENERATION
      OPTIONS: the S05d block extracted into shared modules —
      gen-params.ts (pure drafts→clamped params; plain .ts so the
      node tsconfig tests it) + gen-options.tsx (fields UI) — the
      selection menu refactored onto them, the chat compose area
      gained the same foldable (model/temperature/top-p/max-tokens
      ride the operation's validated params). (5) PROMOTE TO NOTE:
      each answer's second action creates a note from the message
      (chatNotePathForMessage — first heading names it, else first
      words, links stripped) and opens it BESIDE the chat via
      openNoteInNewPane (split right from existing primitives, pane
      typed like its parent, tree born hidden — the note is the
      point; trace resolved accepted). Side columns now cap at a
      pane fraction (tree 35% / chat 45% via CSS min()) so the
      split can't crush the note column. (6) @ QUOTES: the chat
      input's @ token (atPromptToken precedent) offers prompts /
      notes / sources from the SAME providers as the editor @ menu
      (chat-at.ts pure: chatAtItems merge+filter+cap,
      applyChatAtPick — message prompts insert their layer
      directive, notes/sources a note-relative markdown link; the
      S04o linked-note pipeline quotes them with zero new plumbing;
      slugs/note names strip link syntax). CDP-verified end to end
      (@ pick → link → send; orientation computed styles; promote →
      2 panes + file on disk + right pane carries the note; history
      new-chat→reopen restores turns; options present). Tests
      538→557/50 (chat-at + gen-options suites NEW; close-path
      regression pins, relocate-follows-chat, openNoteInNewPane,
      history/naming); typecheck/build/smoke green.
- [x] S06c (owner bench: two bugs + a pane-architecture redirect) —
      DONE 2026-07-23. REDIRECT ("chat should live in its own pane,
      spawn when needed, survive its origin; context via a picklist
      of open panes; a New Pane choice"): the chat COLUMN retired
      after one day — ChatView is now a TAB VIEW (`view: 'chat'`);
      transcript pointer (`file`) + context pick (`ctx`) ride
      ordinary validated tab params (relocateTabPaths includes
      `file`), so no other pane's lifecycle can touch it.
      `openChatPane` (model): focus an existing chat tab anywhere,
      else split right into a vault-typed tree-hidden pane — wired
      from the tabstrip ChatIcon, the selection menu's "Open chat",
      and the New Pane chooser (Chat joined Vault/Projects/Docs).
      CONTEXT PICKLIST: a workspace-wide registry
      (workspace/ai-context.ts, useSyncExternalStore module store) —
      every mounted editor registers an EDITABLE entry (selection/
      doc/insert through its buffer+save), read-mode notes register
      READ-ONLY (whole-note content, insert disabled with a visible
      hint); resolveAiContext prefers the picked path (editable
      mount wins), else the most recent editable, else the most
      recent. Promote-to-note opens beside the CHAT pane. The S06
      leaf `chat` map: validator still accepts it (saved states
      load), nothing renders it. BUG "can't open chat from history":
      not reproducible programmatically NOR with real mouse events
      after the rework (Input.dispatchMouseEvent drive: menu → row
      click → turns restored) — the column-era report is moot with
      the column gone; the flow is CDP-pinned with real clicks. BUG
      "create note erased chat messages": structurally fixed — the
      chat no longer lives inside the pane that splits; CDP-verified
      turns SURVIVE promote (3 panes, 2 turns intact) AND surviving
      the ORIGIN pane's close (the S06c point, also a model test).
      Verified further: context auto-pick, picklist re-pointing
      after the origin editor unmounts, New Pane chooser offers
      Chat, transcript on disk, state persists. Tests 557/50
      (workspace-model: chat-pane suite replaces the column suite —
      spawn/focus/survive/relocate-file/chatFileOf); typecheck/
      build/smoke green.
- [x] S06c2 (owner: "chat a SPECIFIC pane, not a tab — but keep tabs
      for multiple chats in the chat pane; context on open note
      doesn't seem to work") — DONE 2026-07-23. PANE TYPE: 'chat'
      joins vault/project/docs as a tree kind ({kind:'chat'} scope;
      NO tree panel at all); the pane's tabs are CONVERSATIONS —
      its `+` opens another chat tab (tab title = transcript name),
      each with its own file/ctx params. openChatPane types the
      spawned pane 'chat'; the New Pane chooser's Chat pick types
      in place; the in-pane chat button hides inside chat panes.
      CONTEXT FIX: the picklist now covers EVERY open note-bearing
      TAB, not just mounted views — the likely "doesn't work" (only
      ACTIVE tabs mount, so an open-but-inactive note never
      registered): openNoteTabPaths (model, tested) walks workspace
      state for note + source tabs; a pick without a mounted view is
      read ON DEMAND via readNote as a read-only whole-note context;
      options wear a "— read-only" marker; editable mounts win for
      the same path; send resolves the target at send time
      (resolveTarget) so staleness is out. CDP-verified: restored
      chat-typed pane (no tree), options list active-editable +
      inactive-read-only, picking the INACTIVE note answers from ITS
      content (mock echo pinned), '+' adds a second chat tab.
      Legacy note: yesterday's S06c vault-typed chat panes still
      render (the chat TAB view works in any pane); not migrated.
      Tests 557→558/50 (openNoteTabPaths; openChatPane retyped);
      typecheck/build/smoke green.
- [x] S06c3 (owner: multi-context +/×, tree drag-drop as context,
      bigger input, tab-rename) — DONE 2026-07-23. MULTI-CONTEXT:
      the `ctx` tab param became a JSON LIST (legacy single-path
      reads as one; chatContextsOf/serializeChatContexts, capped 6 —
      the operation input cap is 8): ordered pills under the context
      row, FIRST = primary insert/append target (◉ marker), the rest
      ride the send as additional bounded selections (6k cap each,
      mounted doc preferred, readNote fallback, stale pills skipped;
      total input sliced to 8); the candidate select + "+" adds,
      each pill's ×  removes, an empty list shows the AUTO pill;
      relocateTabPaths rewrites paths INSIDE the ctx list.
      DRAG-DROP: the tree's existing drag payload (TREE_DRAG_MIME)
      drops onto the chat pane as context — a note/source/prompt
      adds itself, a FOLDER adds its notes recursively (capped);
      accent-dashed drop highlight. INPUT: rows 2→4 + min-height,
      vertical resize enabled. RENAME: double-click a chat tab →
      in-place input (Enter commits, Escape cancels, blur commits);
      chatRenameTarget sanitizes and renames BESIDE the current file;
      relocateApply rewrites links + broadcasts, so the tab's file
      param (and any ctx references) follow through the ordinary
      relocation path; unborn chats (no file) ignore the
      double-click. CDP-verified: bigger input computed, auto pill,
      + adds, tree drop adds, two-context send answers from the
      primary, × removes, rename lands on disk (Plato deep dive.md)
      with tab title + turns following. Tests 558→562/50
      (chatContextsOf round-trip/cap, ctx relocation,
      chatRenameTarget); typecheck/build/smoke green.
- [x] S06c4 (owner: drop the "chat · <engine>" label; context picker
      joins the history/new-chat row) — DONE 2026-07-23. The chat
      header is ONE bar: context select + "+" (flex-filling) ·
      history · new chat; the engine label retired (the engine still
      stamps transcript frontmatter at birth; the ☰ AI menu remains
      the engine surface). CSS: .chat-context became an in-bar label.
      All S06c3 flows re-verified via CDP on the new header
      (pills/drop/two-context send/×/rename). Tests 562/50;
      typecheck/build/smoke green.
- [x] S06c5 (owner: "drag from tree initiates but doesn't land; do
      the same with tabs; and with a selection in a note" — flagged
      game-changer UX, time deliberately spent) — DONE 2026-07-24.
      LAND FIX (the reported bug): Chromium REFUSES a drop whose
      answered dropEffect is outside the source's effectAllowed —
      the chat answered 'link' while the tree drags with 'move', so
      every real drop died after the drag initiated (synthetic CDP
      events had masked it: they skip the browser's effect
      matching). `compatibleDropEffect` (editor/drag-context.ts,
      unit-pinned) now answers within the source's set, preferring
      'copy' — a context ADD never consumes its source, and a 'move'
      answer would make CodeMirror DELETE a dragged selection. TWO
      NEW DRAG SOURCES: (1) note-bearing TABS drag like tree rows
      (`tabDragSource`, tested: vault/project notePath, source
      dossier, a chat tab its transcript; effectAllowed 'copy';
      same TREE_DRAG_MIME so the chat handler is unchanged);
      (2) an EDITOR SELECTION drags with its note + character range
      (EditorPane onDragStartCapture enriches CodeMirror's own drag
      with SELECTION_DRAG_MIME {relPath, from, to}) and lands as a
      RANGED context pill `path#from-to` (parseChatContextEntry /
      chatContextEntryForSelection, lenient + tested): as PRIMARY it
      pins the operation's selection to exactly that slice
      (range-anchored — the checker marks the echo source-backed),
      as an extra it quotes the slice; ranges clamp to the live doc,
      survive relocation (path half rewrites, suffix kept), and
      display as `name · from–to` on the pill. CDP-verified:
      tree payload with real 'move' semantics lands; a real tab
      dragstart emits the payload; a real editor dragstart emits
      {socrates, 37–52} for the DOM selection; the ranged pill
      renders; the send echoes EXACTLY the dragged slice with a
      source-backed chip. Tests 562→569/51 (drag-context suite NEW:
      effect matrix + payload round-trip; ranged entries, relocation
      suffix, tabDragSource); typecheck/build/smoke green.
- [x] S06c5b (owner: "selection as context — I don't know what you
      implemented as a solution for the drag and drop") — DONE
      2026-07-24. The drag gesture existed but was INVISIBLE (select
      text, press ON the highlighted selection, drag into the chat —
      CodeMirror's native text-drag, enriched with the range
      payload). A VISIBLE door joins it: the right-click AI menu
      gains "+ chat context" beside "Open chat" (selection present
      only) — `addChatContext` (model, tested) opens/focuses the
      chat pane then merges the ranged entry into the active chat
      tab's ctx list (dedup + cap respected). Wired EditorPane →
      views → LeafPane like onOpenChat. CDP-verified: right-click
      on a DOM selection → menu shows both buttons → "+ chat
      context" → chat pane spawns with `◉ socrates · 37–52`.
      Tests 569→570/51; typecheck/build/smoke green.
- [x] S06c6 (owner: Mistral 503 surfaced + "when I switch between
      tabs the content of the chats disappears") — DONE 2026-07-24.
      The 503 itself is the taxonomy WORKING (provider-server,
      surfaced, no silent fallback — Mistral was down; the main-
      process console line is Electron logging the rejected IPC
      promise, the renderer shows the typed message). What the
      outage EXPOSED: tab switching remounts the chat view
      (TabContent is keyed), and two session things died with it —
      the DRAFT input (retyping after every switch, worst exactly
      when 503s force retries; plausibly the owner's "content
      disappears") and the IN-FLIGHT RUN (with real provider
      latency, switch-away-and-back landed the answer invisibly in
      the transcript: no indicator, no refresh, no error). Chat-tab
      switching itself is NOT the bug — CDP repro: two chats, both
      restore across switches, note-pane tab changes untouched.
      FIX (chat-run.ts, session-only, keyed by TAB id, tested):
      drafts survive remounts (typed → roundtrip → intact; send
      clears); every exchange is a REGISTERED RUN that finishes into
      the transcript whether or not the view stays mounted, and a
      remounting view ADOPTS it (thinking indicator + cancel id
      restored, transcript re-read on settle, the closure's error
      surfaced). RETRY: a failed exchange leaves the question in
      the transcript — the error row gains a retry button
      (re-runs the trailing you-turn as the live turn, thread =
      prior turns, nothing re-appended, nothing retyped).
      CDP-verified: draft roundtrip intact, send clears the draft,
      mid-flight switch roundtrip shows both turns. Tests
      570→574/52 (chat-run suite NEW: adopt/settle-clear/
      newer-run-wins/error visibility, draft round-trip);
      typecheck/build/smoke green.
- [x] S06c7 (owner, precise repro: "load old chat from history,
      switch to another tab, come back — wiped") — DONE 2026-07-24.
      Diagnosed ON THE OWNER'S OWN STATE (copied vault +
      local-workspace.json, CDP-driven): the history pick REPLACED
      the invoking tab's conversation pointer — picking platro while
      'intersting-exemples' was active left TWO tabs titled platro
      plus the unborn 'Chat' tab; titles shuffled underneath, so
      "coming back to the loaded chat" landed on the wrong (often
      unborn) tab = NEW CHAT empty = the wipe. Same class: the
      header "+" CLEARED the current tab in place. FIX
      (openChatTranscript, model, tested — 3 branches): a history
      pick ROUTES — a chat tab already holding that transcript
      (anywhere) is ACTIVATED (one conversation = one tab, never
      duplicated), an unborn invoking tab loads it in place, a
      living conversation gets a NEW tab beside it; the header "+"
      now opens a NEW chat tab (tabs are conversations — clear-in-
      place retired). Re-driven on the owner state: pick platro →
      the existing platro tab focuses, every title stays put, all
      turns intact. Tests 574→575/52; typecheck/build/smoke green.
- [x] S06c8 housekeeping (owner audit: stale worktree? ledger
      logged? learning docs?) — DONE 2026-07-25, docs-only.
      (1) The `.claude/worktrees/s07d-pane-tree` git-worktree
      REGISTRATION was a CP-MVP-007-era leftover (directory already
      deleted; branch fully contained in master) — pruned, branch
      deleted, only master remains. (2) Ledger/log audit: every
      S06–S06c7 step carries its ledger entry + log.md entry in the
      same unit as its commit — confirmed complete. (3) Learning
      debt REPAID: notes 17 (S02 adapter) and 18 (S06 chat surface)
      existed, but the c-series first-mobilized two patterns never
      written up — note 19 NEW (module registries: validated params
      vs remount-surviving session stores vs useSyncExternalStore
      subscription registries; the effectAllowed/dropEffect matching
      rule; native-drag payload enrichment; open-as-routing) +
      index entry. Tests unchanged 575/52.
- [x] S06c9 (owner: "we still have the problem where chat content
      disappears after switching from tabs") — DONE 2026-07-25.
      Code inspection (owner directive: inspect, don't re-drive the
      documented repros; the S06c6/c7 paths re-verified green once —
      remount reload, draft survival, restart restore all held). The
      RESIDUAL DOOR was openChatPane: every "Open chat" entry (note
      pane's chat button, editor right-click, "+ chat context")
      activated the strip's FIRST chat tab (`tabs.find`) — with
      several conversations open (exactly the post-S06c7 world: "+"
      and history picks multiply chat tabs), leaving a note tab
      through the chat door landed on the OLDEST or unborn
      conversation instead of the one the owner was on = "my chat
      content disappeared" (same wrong-tab class S06c7 fixed for
      history picks; this door was left on first-match). FIX
      (openChatPane, model, tested): the pane's ACTIVE chat tab wins;
      first chat tab only when none is active — addChatContext
      inherits the fix (it reads the active tab after the focus).
      CDP-pinned on the rebuilt app: two born conversations, second
      active → note pane → chat door → SECOND conversation focused,
      turns intact (first-match would have shown the first). Tests
      575→576/52; typecheck/build/smoke green.
- [x] S06c10 (owner: "the bug is still active" + 4 screenshots: both
      conversations empty after switching between chat tabs) — DONE
      2026-07-25. THE ACTUAL MECHANISM, dev-mode only, present since
      the loadedRef guard was born: main.tsx wraps the app in
      React.StrictMode, and dev builds run every effect
      setup→cleanup→setup on mount. ChatView's transcript-load
      effect: setup #1 claimed `loadedRef.current = file` and started
      the read; cleanup #1 set `live = false` (discarding that read's
      setTurns); setup #2 hit `file === loadedRef.current` and
      early-returned — NO read ever landed, so EVERY remount (= every
      tab switch) rendered an empty chat. Invisible to all prior
      verification because production builds (npm run build + smoke,
      every CDP pin) run effects once — the owner runs electron-vite
      dev (confirmed: their instance is `electron-vite dev`, started
      11:05). During a conversation turns append to local state, so
      the chat LOOKS fine until the next switch — exactly the
      screenshots. FIX (ChatView): the effect's cleanup surrenders
      the claim (`loadedRef.current = null`) so the next setup
      re-reads; the persistTurn prop-echo protection survives (its
      claim is set outside the effect and the null-file run arms no
      cleanup). Pinned in DEV MODE over CDP: restored state mounts
      with turns, switch away and back both reload. Tests 576/52
      unchanged (StrictMode effect semantics live outside the node
      suite — the dev-mode pin is the verification);
      typecheck/build/smoke green.
- [x] S06c11 (owner: "if we close everything we should always have a
      current vault tree panel available") — DONE 2026-07-25. The
      S07e root-✕ behavior (empty root loses its type → New Pane
      chooser, no tree) is SUPERSEDED by this directive: every close
      that collapses the workspace to empty now lands on a
      VAULT-TYPED pane — tree panel present, panel prefs (off/w/open)
      kept on the closePane path — so the vault is always one click
      away. Two doors changed (model): closePane's root branch and
      closeTab's total-collapse fallback (last tab anywhere); ✕
      tooltip follows ("back to the vault tree"). Split-born empty
      panes STAY untyped (the New Pane chooser at pane birth is
      S07e's point and remains). Dev-mode CDP pin: fresh state →
      Close pane → 0 tabs, vault tree present with notes, New Tab
      chooser offered. Tests 576→577/52 (S07e root test rewritten to
      the new contract + prefs-kept case + closeTab collapse typed);
      typecheck/build/smoke green.
- [x] S06c12 (owner, two directives: "web tab should be a pane choice
      and tab choice" + "if chat pane is open and it is the last tab
      the left vault tree pane disappears — will the same happen with
      a web pane?") — DONE 2026-07-25. (1) WEB PANE CHOICE: the New
      Pane chooser gains Web — a vault-typed pane born with a
      source-web tab, tree hidden at birth (the web is the point;
      openNoteInNewPane precedent), so its + serves notes/imports/web
      like any vault pane ("can contain other tab types also"). (2)
      THE LAST-TREE INVARIANT (S06c11 generalized): closePane's
      non-root collapse could still fold the only tree-bearing pane
      into a treeless CHAT sibling — the workspace's LAST tree-bearing
      pane (vault/project/docs typed; hidden tree still counts, chat
      panes bear none by design) now never disappears: closePane and
      closeTab-collapse land it EMPTY ONTO THE VISIBLE vault tree in
      place ('off' dropped — the landing exists to show the tree;
      w/open kept), closeEmptyPane no-ops on it; chat panes themselves
      still collapse away normally. ANSWER to the web wondering: a web
      pane IS tree-bearing (vault-typed, tree one toggle away), so a
      lone web pane keeps the tree reachable, and closing its last web
      tab lands on the visible tree. S06c amendment: the origin pane
      closing beside the chat now leaves TWO panes (empty vault tree +
      untouched chat) — the chat still survives, the tree does too.
      Dev-mode CDP pin, 5 checkpoints (chooser lists Web; web pane
      spawns; lone web pane tree hidden-toggleable; web-tab close →
      visible tree; vault-pane close beside chat → both panes). Tests
      577→582/52 (5 new + S06c survival test amended);
      typecheck/build/smoke green.
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
changed(S06): ipc-contract (AiThreadTurn + AiOperation.thread; leaf
              chat map); ai-mock (thread validation + turn stamp);
              mistral-generation-adapter (buildMessages replays the
              thread; ChatMessage +assistant); workspace-state (chat
              map validated); model.ts (paneChat* helpers +
              updatePaneChat + PaneAiSurface); chat-file.ts NEW;
              ChatPanel.tsx NEW; Workspace.tsx (third grid column,
              chat toggle, surface ref, prop threading); EditorPane
              (registerAiSurface + onOpenChat; AiPanel dock/divider
              state removed; revealRange retired with its only
              consumer); VaultView/ProjectView (prop threading);
              AiPanel.tsx DELETED (BufferChange/PRESETS →
              ai-helpers.ts); icons (Chat/Send/Insert); styles.css
              (chat column tokens-only; retired panel CSS pruned);
              index.ts (smoke op rides a thread); learning note 18 +
              index; module note. CDP driver in session scratchpad
              (s06-cdp.mjs), both themes screenshot.
tests(S06)  : 538 passing / 48 suites; typecheck/build green; smoke
              `ai=ok:2/1/4/1` with a thread riding the smoke op.
changed(S06b): ChatPanel (orientation, history, options, promote,
              @ quotes, hardened transcript load); chat-file.ts
              (chatHistoryOf, chatNotePathForMessage, stripLinks);
              chat-at.ts NEW; gen-params.ts NEW + gen-options.tsx
              NEW (S05d block extracted; AiSelectionMenu refactored
              onto them); model.ts (openNoteInNewPane, relocate
              drags chat.file); Workspace.tsx (side-column caps,
              onNoteCreated wiring); icons (History/NoteAdd);
              styles.css (bubbles, .chat-pop, compose); module note.
tests(S06b) : 557 passing / 50 suites; typecheck/build/smoke green.
changed(S06c): ChatView.tsx NEW (ChatPanel.tsx deleted); ai-context.ts
              NEW (workspace registry + resolveAiContext); model.ts
              (openChatPane, chatFileOf, relocate includes 'file',
              paneChat* helpers removed); Workspace.tsx (chat tab
              view, chooser wiring, column render/grid removed);
              NewTabChooser (Chat pane pick); EditorPane (registers
              the global editable context; registerAiSurface prop
              gone); VaultView/ProjectView (read-mode notes register
              read-only contexts); styles.css (.chat-view + context
              row; column/resize CSS gone); module note; tests
              (chat-pane model suite).
tests(S06c) : 557 passing / 50 suites; typecheck/build/smoke green.
changed(S06c2): model.ts (PaneTreeScope +chat, openChatPane types
              'chat', openNoteTabPaths NEW, PaneAiSurface type
              pruned); Workspace.tsx (chat pane: no tree, '+' = new
              chat tab, chooser/tabForPick); NewTabChooser (Chat
              hint); ChatView (context = registry ∪ open tabs,
              resolveTarget at send time, read-only options marked);
              module note; tests (openNoteTabPaths + retyped spawn).
tests(S06c2): 558 passing / 50 suites; typecheck/build/smoke green.
changed(S06c3): model.ts (chatContextsOf/serializeChatContexts +
              CHAT_CONTEXTS_MAX; relocate rewrites ctx lists);
              chat-file.ts (chatRenameTarget); ChatView (pills +
              candidate select + "+", extra selections on send,
              tree-drop handler, rows 4); Workspace.tsx (chat tab
              double-click rename via relocateApply); styles.css
              (pills, drop highlight, tab-rename, input height);
              module note; tests (ctx round-trip/relocate/rename).
tests(S06c3): 562 passing / 50 suites; typecheck/build/smoke green.
changed(S06c5): drag-context.ts NEW (SELECTION_DRAG_MIME +
              compatibleDropEffect — the land fix); model.ts
              (parseChatContextEntry/chatContextEntryForSelection,
              tabDragSource, relocate keeps range suffixes);
              EditorPane (dragstart enrichment); Workspace.tsx
              (draggable tabs); ChatView (both MIMEs accepted,
              compatible dropEffect, ranged pills/primary/extras);
              module note; tests (drag-context suite + model cases).
tests(S06c5): 569 passing / 51 suites; typecheck/build/smoke green.
changed(S06c5b): model.ts (addChatContext); AiSelectionMenu
              ("+ chat context"); EditorPane (addContextFromMenu) +
              prop threading through VaultView/ProjectView/
              Workspace; tests (addChatContext).
tests(S06c5b): 570 passing / 51 suites; typecheck/build/smoke green.
changed(S06c6): chat-run.ts NEW (session run registry + drafts);
              ChatView (draft-backed input, runExchange extraction,
              run registration + mount adoption, retry button);
              styles.css (.chat-retry); tests (chat-run suite).
tests(S06c6): 574 passing / 52 suites; typecheck/build/smoke green.
changed(S06c7): model.ts (openChatTranscript); ChatView (history
              pick routes via dispatch; header + = new tab); tests.
tests(S06c7): 575 passing / 52 suites; typecheck/build/smoke green.
changed(S06c9): model.ts (openChatPane prefers the pane's ACTIVE
              chat tab; first tab = fallback only); tests
              (multi-conversation regression pin).
tests(S06c9): 576 passing / 52 suites; typecheck/build/smoke green.
changed(S06c10): ChatView (transcript-load effect StrictMode-safe:
              cleanup surrenders the loadedRef claim) — the owner's
              actual "chat wiped on tab switch" (dev-only, since the
              guard existed).
tests(S06c10): 576/52 unchanged; typecheck/build/smoke green;
              dev-mode CDP pin (the failing runtime).
changed(S06c11): model.ts (closePane root branch vault-typed +
              prefs kept; closeTab total-collapse fallback
              vault-typed); Workspace.tsx (✕ tooltip); tests
              (S07e root contract rewritten + 2 new).
tests(S06c11): 577 passing / 52 suites; typecheck/build/smoke
              green; dev-mode CDP pin.
changed(S06c12): NewTabChooser (Web pane option); Workspace
              (pickPaneKind web spawn); model.ts (last-tree-bearing
              invariant: isTreeBearingLeaf/treeBearingCount/
              emptiedOntoVault across closePane, closeTab,
              closeEmptyPane); tests (5 new, 1 amended).
tests(S06c12): 582 passing / 52 suites; typecheck/build/smoke
              green; dev-mode CDP pin (5 checkpoints).
next action : S07 — acceptance: 18 §M2 intents re-run on the REAL
              provider + owner bench on the live vault (real
              question over a real selection via the context menu,
              inline accept, a CHAT exchange, prompt file edited and
              re-used, cancel mid-flight, receipt inspected); decide
              the open default-engine question at the bench; review
              and close.
blockers    : none. OPEN (S07 bench): default engine when a key is
              configured — 'mistral' proposed, implemented as the
              key-present resolution default, mock stays selectable.
              NOTE for the S07 bench: the AiPanel retirement dropped
              the evidence-anchor "source"/"page" buttons and the
              challenge-to-repair affordance (panel-only features) —
              raise at the bench whether either returns on the two
              new surfaces or waits for M6/M7.
```

# Blockers

- None. (Both 2026-07-21 ceremonies recorded: closing ceremony in the
  vision-alignment session note; opening check answers there and in
  this file's DoD/S01 amendments.)
