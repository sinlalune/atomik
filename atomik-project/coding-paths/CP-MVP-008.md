---
type: Atomik Coding Path
title: Real AI generation + the AI interaction pass — Mistral Small behind the provider-neutral contract, reached from the selection (M2 completion)
description: The M2 loop leaves the mock — a Mistral Small adapter in main generates real knowledge behind the unchanged provider-neutral contract — and is reached the way the owner works — select text, right-click, quick action or custom prompt with inline preview in the note, chat in a right lateral panel, prompts as vault files.
tags: [coding-path, m2, ai, generation, provider, mistral, prompts, context-menu, inline-preview, chat]
timestamp: 2026-07-20T00:00:00Z
atomik:
  id: CP-MVP-008
  status: done
  accepted: 2026-07-21
  closed: 2026-08-04
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

This path is `done`. Its completed steps were rolled into `history/` at CP-OPS-002
S04 — moved VERBATIM, one file per major step, nothing summarized away. Sub-steps
live in the record of the step they belong to. The convention is in
[paths.md](./paths.md); the index over the records is
[history/index.md](./history/index.md).

- [x] **S01** Bootstrap — [full record](./history/CP-MVP-008-S01.md)
- [x] **S02** Mistral adapter in main, end to end — [full record](./history/CP-MVP-008-S02.md)
- [x] **S03** Prompts folders · 6 entries — [full record](./history/CP-MVP-008-S03.md)
- [x] **S04** Selection context menu · 14 entries — [full record](./history/CP-MVP-008-S04.md)
- [x] **S05** Inline live preview: proposal rendered over the target — [full record](./history/CP-MVP-008-S05.md)
- [x] **S06** Chat lateral panel · 22 entries — [full record](./history/CP-MVP-008-S06.md)
- [ ] **S07** bench rounds and M2 acceptance · 14 entries · 1 entry left unchecked in the record as written — [full record](./history/CP-MVP-008-S07.md)

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
changed(S06c13): model.ts (paneTreeHidden chat opt-in default;
              isTreeBearingLeaf includes chat; ensureVisibleTree on
              pane-removing closes); Workspace.tsx (chat panes render
              the tree panel + reopen toggle); brainstorm note NEW
              (dnd-docking directive verbatim); tests (block
              rewritten).
tests(S06c13): 583 passing / 52 suites; typecheck/build/smoke
              green; dev-mode CDP pin + screenshot.
changed(S06c14): model.ts (chatContextsExplicitNone); ChatView
              (contextless send anchored on the transcript; auto
              pill ×; no-context pill with ↺); tests.
tests(S06c14): 584 passing / 52 suites; typecheck/build/smoke
              green; dev-mode CDP pin.
changed(S06c15): ChatView (chat-bar + removed); model.ts
              (hasChatTab); Workspace.tsx (chat door hides while a
              chat tab exists).
tests(S06c15): 584/52 unchanged; typecheck/build/smoke green;
              dev-mode CDP pin.
changed(S06c16): ipc-contract (bundle usage/durationMs); index.ts
              (returned on the bundle); ChatView (turn meta +
              metrics line); styles.css (.chat-turn-metrics).
tests(S06c16): 584/52; typecheck/build/smoke green.
changed(S06c17): claim-highlight.ts NEW; ChatView (ClaimBody, chips
              row retired); model.ts (revealNote); styles.css
              (.claim-mark tints); tests (2 suites).
tests(S06c17): 593 passing / 53 suites; typecheck/build/smoke
              green; dev-mode CDP pin.
changed(S06c18): workspace-state.ts (snapshot verbs); ipc-contract +
              preload + index.ts (4 channels); AppMenu (Workspaces
              section); styles.css; tests.
tests(S06c18): 598 passing / 53 suites; typecheck/build/smoke
              green; dev-mode CDP pin (save→mutate→load).
changed(S06c19): ipc-contract + index.ts (bundle.billing); model.ts
              (chatTotalsOf/addChatTotals); ChatView (per-message
              cost, totals increment + chat-bar Σ); styles.css;
              tests.
tests(S06c19): 599 passing / 53 suites; typecheck/build/smoke green.
changed(S07b1): styles.css (post-sweep corrective rule: .chat-pop
              button justify-content flex-start).
tests(S07b1): 599/53 unchanged; typecheck/build green; dev CDP pin.
changed(S07b2): chat-file.ts (chatRelPath day-folder paths;
              chatHistoryOf two-era walk); chat-file.test.ts.
tests(S07b2): 599/53; typecheck/build green; live-vault CDP pin
              (real mistral send, day folder + conventions born).
changed(S07b3): prompt-composition.ts (block registry + defaults +
              override-aware composeSystemPrompt); ipc-contract
              (AiOperation.builtins); ai-mock (validation);
              mistral adapter (passthrough); prompts.ts (parse/
              collect/load/materialize built-in blocks); ai-run.ts
              (builtins on inputs/operation/sent); ChatView,
              EditorPane ×2, GeneratedNoteScreen (load per send);
              inline-ai + AiNotePreview (inspector parity);
              AppMenu (explicit materialize action); tests ×3 files.
tests(S07b3): 608/53; typecheck/build green; live pin (menu action
              → 6 files in the owner's vault).
changed(S07b4): request-breakdown.ts NEW; ChatView (breakdownByTurn
              session meta, you-turn pills + total + copy request);
              styles.css (pill row, kind colors from the existing
              palette tokens); request-breakdown.test.ts NEW.
tests(S07b4): 612/54; typecheck/build green; live pin (real send,
              pills vs provider count).
changed(S07b5): SourceImageView (dossierHidden/onDossierToggle props,
              hide/show doors); Workspace (dossierOff param
              plumbing); styles.css (order swap retired, dossier
              border, door positions).
tests(S07b5): 612/54 unchanged; typecheck/build green; dev CDP pin
              (geometry + collapse/expand round-trip).
changed(S07b6): PdfView (TextLayer render + selection tracking +
              Anchor selection button); dossier.ts
              (withPassageAnchor); SourceImageView (anchorPassage
              wiring); styles.css (textLayer subset);
              pdf-anchors.test.ts.
tests(S07b6): 613/54; typecheck/build green; live pin (cold-mount
              spans, select → p1q1 row in the owner's dossier).
changed(S07b7): model.ts (revealSource NEW); Workspace
              (openNoteFromTree/openSourceFromTree chat-scope
              routing); workspace-model.test.ts.
tests(S07b7): 614/54; typecheck/build green; dev CDP pin on the
              owner's exact repro state.
changed(S07b8): prompt-composition (WireSystemPlanEntry,
              composeSystemFromPlan, systemTextOf); ipc-contract
              (systemPlan); ai-mock (validation); mistral adapter
              (systemTextOf); system-plan.ts NEW; SystemPlanSection
              NEW; AiSelectionMenu (section first, stack retired
              from AiMenuRequest); EditorPane ×2 (wire plan);
              ChatView (SYSTEM disclosure, sys param, send path);
              ai-run (systemPlan on inputs/operation/sent);
              inline-ai + AiNotePreview (systemTextOf);
              request-breakdown (systemTextOf); styles.css;
              system-plan.test.ts NEW; ai-mock.test.ts.
tests(S07b8): 624/55; typecheck/build green; dev CDP pin (both
              surfaces, full edit cycle).
changed(S07b8b): docs/research/ai-chat-ui-practices.md NEW;
              ChatView (chat-card composer, sys sheet + ghost
              toggle, intent preview, mount-loaded sys data);
              styles.css (card anatomy, one pill recipe, turn
              polish, ghost tools).
tests(S07b8b): 624/55 unchanged; typecheck/build green; CDP pin
              light + dark.
next action : NONE — PATH CLOSED 2026-08-04. Owner bench validated
              ("I validate all owner bench task") after rounds
              S07b1–S07b16; acceptance record
              ../sessions/2026-08-04-cp-mvp-008-acceptance.md.
              Post-008 backlog handled at the closing ceremony
              (candidates carried: full PDF viewer tooling,
              DnD/docking path, S07b12-retired mode chips, plus the
              register's recorded inputs).
blockers    : none. DECIDED 2026-07-25 (owner, S06c16): default
              engine when a key is configured = mistral (key-present
              resolution default, mock stays selectable).
              NOTE: the AiPanel-retirement question RESOLVED by the
              owner's S06c17 redirect — evidence anchors returned as
              clickable source-backed marks; challenge-to-repair
              supersededs into "trigger claim verification with
              tools" (future, brainstorm note).
```

# Blockers

- None. (Both 2026-07-21 ceremonies recorded: closing ceremony in the
  vision-alignment session note; opening check answers there and in
  this file's DoD/S01 amendments.)
