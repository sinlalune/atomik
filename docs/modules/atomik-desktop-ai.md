---
type: Atomik Module Note
title: 'Module: atomik-desktop — AI, traces and truth'
description: The AI patch loop and its real engines, the chat pane, the ActionTrace ledger, mechanical truth labels and URL provenance.
tags: [module, ai, patch-loop, chat, traces, truth]
timestamp: 2026-08-14T00:00:00Z
---

# Module: atomik-desktop — AI, traces and truth

> AREA NOTE of [Module: atomik-desktop](./atomik-desktop.md), split out at
> CP-OPS-001 S02 so concurrent lanes append to different files instead of
> colliding in one 1689-line note. The root note keeps what is cross-cutting
> (public contracts, data flow, alternatives, common mistakes, tests, agent
> checklist, dependency facts); this note keeps what THIS AREA owns.

## What it owns

- Mechanical truth labels (06 §labeling rule, S10): `electron-main/truth.ts`
  (truth-core validator seat, 14 — validators never call AI). Providers
  submit ClaimCandidates that can assert FORM only (interpretive /
  needs-citation; the type admits nothing else); `labelClaims` computes
  every label: exact containment in a supplied selection → source-backed
  with hashed EvidenceRecord (quote + sha256, reproducible); no fuzzy
  matching by design (a paraphrase is model-only); derivability outranks
  asserted forms; smuggled labels fall to model-only (adversarial-tested).
  Panel UI: one chip per claim, [source] opens the anchor in the editor
  (select + scroll), [challenge] qualifies the claim inside the editable
  proposal — the repair patch preview accepted through the normal path.
- URL provenance on web-reader evidence (09/28, CP-MVP-006 S06):
  `electron-main/web-provenance.ts` resolves a `sources/web/<slug>/
  reader.md` selection to its dossier's identity (original_url,
  accessed_at, unquoted title) — CALLER-side in the `run-ai-operation`
  handler, so truth.ts/ai-mock.ts stay fs-free; `labelClaims` takes the
  resolved map and spreads it into `EvidenceRecord.source` (the
  url/dossierPath/accessedAt/title slice of 28's evidence sketch,
  renderer never asserts it). The relPath match is strict (one dot-free
  slug segment — can't climb out of sources/web/); resolution is
  best-effort by design (a broken dossier degrades to no-URL evidence,
  never a failed operation). Downstream: a new-note/append proposal
  from a web reader carries `Source: [title](url) — accessed date ·
  [dossier](relative-link)` (09 "create note with URL/provenance"; the
  dossier link is computed RELATIVE to the target note — root-absolute
  hrefs are dead clicks in the link router), and the AiPanel claim chip
  grows [page ↗] beside [source] (onOpenWebUrl threaded VaultView/
  ProjectView → EditorPane → AiPanel). E2E rung `ATOMIK_SMOKE_AI_WEB=1`
  seeds a fixture bundle and proves the whole chain on the real app.
- VAULT-GROUNDED CHAT (CP-MVP-010 S07): `AiOperation.grounding` is a
  REQUEST, never a payload — the renderer may ask for retrieval and
  bound it, but the packet is compiled MAIN-side from the instruction
  and its contents can never be supplied from the renderer. A prompt
  file can no more opt out of grounding than out of the mechanical
  grounding rules (28).
  - The packet's entries join `operation.input` as read-only reference
    selections (`referenceSelectionsOf`, pure and tested), which the
    existing chat contract already renders as "Reference notes —
    read-only, quotable". No new prompt block, no forked composition.
  - DIRECT entries are dropped from that injection: what the user
    already had open is in the operation's own selections, and sending
    it twice would pay twice for it.
  - The EXCERPT travels, never the whole note: the budget was decided
    when the packet was compiled, and re-reading files at send time
    would quietly undo it.
  - The packet returns on the bundle (`contextPacket`), so the answer
    and what produced it travel together and the reader never takes the
    grounding on faith. Consequence worth naming: because the excerpts
    are real vault text supplied as selections, an answer that quotes
    one EXACTLY earns `source-backed` through the ordinary containment
    rule (28) — retrieval still asserts nothing about truth, only that
    the sentence stands on that note.
  - UI: a `vault` toggle in the chat composer (session state like the
    model drafts beside it — a preference for the next sends, never
    knowledge) plus a packet strip that shows, per entry, the STAGE that
    found it and why, the omissions summarized by reason, and the words
    the vault has no material for. `preview` compiles the packet for the
    current draft without sending — the same channel, so what you
    inspect is what the send would compile.
- RETRIEVAL traces (CP-MVP-010 S06): `recordRetrieval` appends one
  `action: 'retrieve'` line per compiled context packet — stages,
  candidates, selected entries, estimated context tokens, wallMs,
  `location: 'deterministic'`, zero EXTERNAL billing (33's rule: a local
  result reports zero external cost without claiming zero cost, and the
  wall time sits right beside it). Appended IMMEDIATELY, unlike a
  generation draft: retrieval has no accept/reject decision to wait for.
  The QUERY is never recorded — user text is content like a prompt — and
  a test greps the ledger to keep it that way. The line points at its
  packet by id, one-way: telemetry points at knowledge, never the
  reverse.
- The ActionTrace ledger (S09, 33-minimal): `electron-main/action-trace.ts`
  (the execution-core seat, 14) — ONE JSON line per operation appended to
  `.atomik/usage/private/actions.jsonl` at DECISION time (drafts in
  memory; failures append immediately; quit flushes undecided). Exactly
  the S09 minimum in 06's ActionTrace shape: ids, deterministic location +
  provider/model identity, estimated tokens (named estimated, chars/4),
  wallMs, EUR 0 estimated external, status + decision, contentRecorded
  false — a test greps the ledger for prompt/selection text and fails if
  content ever leaks. Badge in the AI panel via `get-ai-trace-summary`;
  decision reported via `resolve-ai-trace` (fire-and-forget: telemetry
  never blocks UX).
- The AI patch loop (06, S08; REAL engines CP-MVP-008 S02; MULTI-PROVIDER CP-PROVIDERS S02/S03/S05): the typed
  `GenerationAdapter` seam in `electron-main/generation.ts` (the ai-core
  seat, 14) behind `atomik:run-ai-operation` — engines are PURE COMPUTE;
  identity travels in the answering adapter's output, so the renderer
  contract is unchanged from the mock era. Multiple selectable engines:
  `ai-mock.ts` (S08, the deterministic offline path), `mistral-generation-adapter.ts`
  (Mistral chat completions: Mistral Large 2, Mistral Small 3, Codestral 2501, Pixtral Large),
  `openrouter-generation-adapter.ts` (OpenRouter gateway: Claude Sonnet 5, Claude Fable 5,
  Claude Opus 5, GPT-5.6 Sol/Terra/Luna, DeepSeek V4 Pro/Flash, Kimi K3, GLM 5.2, etc.
  with strict privacy controls: `allow_fallbacks: false`, `require_parameters: true`,
  `data_collection: 'deny'`, `zdr: true`, disabled lossy compression, and router metadata),
  and direct adapters `openai-generation-adapter.ts` (GPT-5.6 Sol, Terra, Luna, GPT-4.1, o3, o4-mini),
  `anthropic-generation-adapter.ts` (Claude Sonnet 5, Claude Opus 5, Claude Fable 5, Claude Opus 4.8),
  `deepseek-generation-adapter.ts` (DeepSeek-V3, DeepSeek-R1), and
  `google-generation-adapter.ts` (Gemini 3.7 Flash, Gemini 3.6 Flash, Gemini 3.5 Flash, Gemini 3.1 Pro Preview).
  Keys attached in MAIN only (13), budgets below renderer
  state (2k output tokens, 60s wall via AbortController, input token
  pre-check), and the eight-kind typed error taxonomy carried as
  `ai(<kind>): …` — offline / timeout / auth / rate-limit /
  provider-request / provider-server / cancelled / budget-exceeded —
  with NO silent fallback to the mock (13 explicit-policy rule).
  Engine selection and per-provider model overrides persist in `ai-settings.json`
  (`atomik:set-ai-engine`, `atomik:set-provider-api-key`, `atomik:set-selected-model`). `atomik:cancel-ai-operation` aborts the in-flight call
  by operation id (the AiPanel shows Cancel while running). Claim
  candidates over real output are extracted deterministically
  (sentences, fences dropped, capped) and `labelClaims` runs unchanged
  — exact containment stays the only road to source-backed (28).
  Traces (33, CP-PROVIDERS S06): provider-reported usage preferred over estimates, each
  labeled; external cost estimated in USD from the dated snapshot
  `model-research@2026-08-16` across all providers (Mistral, OpenRouter, OpenAI, Anthropic, DeepSeek, Google Gemini), snapshot
  id in the line; cloud lines wear `location: 'cloud-model'` +
  `privacy.mode: 'cloud'`, `contentRecorded` stays false.   The env-gated `ATOMIK_SMOKE_AI_LIVE=1` rung proves the live chain across providers
  (with optional `ATOMIK_SMOKE_AI_PROVIDER=<name>`, default 'mistral': engine switch,
  one real completion, cloud trace, mid-flight cancel; honest `skip:no-key` without a key).
  SCOPED PROMPT FOLDERS (S03, owner amendment 2026-07-21):
  `renderer/src/editor/prompts.ts` — a `prompts/` folder may live at
  the vault root, in ANY folder, and in a project bundle (a project IS
  a folder, so ONE walk covers all scopes); resolution NEAREST-WINS
  from the note outward with same-name shadowing (a project overrides
  a root prompt), scope tags keep shadowing visible; a prompt file is
  markdown + frontmatter `kind: system | message` (+optional
  title/description), non-prompts in prompts/ are skipped (never an
  error), index/log convention files excluded; scanned through the
  EXISTING verbs (`listVaultFiles`/`readNote` injected — zero new
  IPC). Message prompts join the AiPanel preset row (click loads the
  body); system prompts feed a selector whose body rides
  `AiOperation.systemPrompt` (bounded 8k in `isValidAiOperation`) —
  it replaces the built-in IDENTITY line only; the exact-quote
  grounding rules, destination brief, and no-preamble rule are
  composed main-side REGARDLESS (no prompt file opts out of the
  mechanical contract, 28). Starters materialize ONLY via the
  explicit ☰ → "Create starter prompts" action
  (`materializeStarterPrompts` — idempotent, missing-only, createNote
  births the folder with its S07k conventions; no writes on open).
  S03b (owner directive 2026-07-21): the TREE context menu shows
  "New prompt…" inside any prompts/ folder (`isPromptsFolder`) — a
  kind radio (message | system) + name input autofill the frontmatter
  (`buildPromptFileContent`: kind, name→title, a layer hint in the
  description) through the same createNote verb, and the file opens
  for editing. LAYERS: a full-line `{{prompt: name}}` directive
  inside a prompt body inserts the named prompt as a buildable layer
  (`expandPromptLayers` — system and message compose freely, the
  OUTER prompt's kind governs use); names resolve through the SAME
  nearest-wins scoping, so a project overrides a layer like it
  overrides a prompt; nesting capped at 8; unknown names, cycles, and
  inline mentions stay LITERAL — a broken reference is visible, never
  silently dropped; expansion runs at load, after shadowing.
  S03c (owner directive 2026-07-21): `@` in the AI instruction field
  summons the prompt menu (the editor's @ citation-menu precedent,
  hand-rolled for the textarea): a token opens at an `@` that starts
  the text or follows whitespace (emails/mid-word @ inert), filters
  name+title as you type, arrows/Enter/Tab/Escape + click; picking a
  MESSAGE prompt inserts its LAYER DIRECTIVE `{{prompt: name}}` at
  the caret (padded onto its own line mid-text so the full-line rule
  holds — S03d owner correction: never the flattened body; the
  instruction IS a buildable custom prompt), picking a SYSTEM prompt
  sets the system selector and removes the token; rows wear kind +
  scope tags (36 popover idiom, glass + opaque fallback). Prompt
  PILLS wear a dashed ring + @ glyph (visibly file-backed) and a
  click APPENDS the directive — never overwrites typed text. The
  instruction composes at RUN TIME (`expandInstruction`) against the
  note's resolved scopes; the box keeps the layered form; unknown
  layers travel visibly literal. `parsePromptFile` tolerates CRLF —
  a Windows-edited prompt must not vanish from the menus. Pure
  helpers `atPromptToken`/`applyAtInsertion`/`insertDirectiveAt`/
  `expandInstruction`/`filterPrompts` (nearest-first order pinned
  through the filter). S03e (owner bench screenshots): the EDITOR's
  own @ citation menu leads with PROMPTS when the edited note lives
  in a prompts/ folder — `promptLayerEntries` in quick-actions.ts:
  chipped `prompt` (accent pill beside note/source), nearest-first
  via CodeMirror boost (chain position encoded), inserting the layer
  directive `{{prompt: name}}`, never a link; the file never offers
  itself; outside prompts/ folders the menu is unchanged (a
  directive is inert in an ordinary note). S03f (owner brainstorm,
  prompted exchange: drag-and-drop + save-now): the system side is a
  STACK — ordered composable blocks (`personality › tone ›
  objectives`) built in the panel: @ picker appends (duplicates
  no-op), pills drag to reorder (`reorderStack`), × removes; the run
  composes bodies in order (`composeSystemStack`, already
  layer-expanded; deleted blocks drop silently) into ONE
  `systemPrompt` — grounding rules still compose main-side on top.
  "save" writes the stack as a prompt FILE of directive lines
  (`stackFileContent`, root prompts/) — round-trip tested: expanding
  the saved file reproduces the composition, which is what makes
  stacks reusable, shareable, and AGENT-AUTHORABLE (a future agent
  with vault access writes sub-agent behaviors as these same files).
  S04 (the selection is the entry point, 05): the AI trigger LEFT the
  note-bar (top row = editing concerns only) — right-click in the
  editor (or Shift+F10 at the caret) opens
  `renderer/src/editor/AiSelectionMenu.tsx` at the click location
  (TreeMenu machinery: overlay, on-screen clamping, morph in place):
  S04c (owner redesign): ONE flat composer, no morph — an orderable
  MESSAGE section and the BUILT-IN section share one numbered click
  sequence, the SYSTEM section numbers its own (the stack); the
  sequence composes via `composeMenuInstruction` (layer directives
  for files, raw lines for built-ins, the OPTIONAL typed input
  last); Enter runs and closes (Shift+Enter newline); display capped
  per section (`visibleMenuPrompts`) with a search bar past the
  threshold — picked pills never leave view; "Open chat" in the
  footer opens the PANE's chat column (S06). A menu run previews
  INLINE (S05b): `editor/inline-ai.ts` renders the proposal over the
  target range as a CM block widget (accept / edit / reject + claim
  strip + trace badge, cancel while running; the anchor maps through
  edits), new-note runs preview as a simulated tab
  (`AiNotePreview.tsx`); either way the buffer changes exactly ONCE,
  on accept, through applyChange + save. The docked
  `AiPanel.tsx` RETIRED at S06 into the two surfaces (inline +
  chat); its `BufferChange`/`PRESETS` live in `editor/ai-helpers.ts`.
  The AI channel has no filesystem path — "AI wrote my file" is
  structurally impossible.
- The chat pane (CP-MVP-008 S06 column → S06c own pane → S06c2 pane
  TYPE, 26/06; owner: "a specific pane, not a tab — but tabs handle
  multiple chats in the chat pane"): 'chat' is a PANE TYPE beside
  vault/project/docs (`tree.kind === 'chat'`; no tree panel at all)
  whose tabs are CONVERSATIONS — `ChatView.tsx` renders each
  (`view: 'chat'`), the pane's `+` opens another chat tab, and the
  transcript pointer (`file`) + context pick (`ctx`) ride ordinary
  validated tab params, relocated like every other view's
  (`relocateTabPaths` includes `file`), so no other pane's lifecycle
  can touch a conversation. `openChatPane` (model) spawns the pane —
  focus an existing chat tab anywhere, else split right into a
  chat-typed pane — from the tabstrip ChatIcon, the selection menu's
  "Open chat", or pane birth (the New Pane chooser gained Chat). The
  CONTEXT picklist covers EVERY open note-bearing tab: mounted views
  register in a workspace-wide registry
  (`workspace/ai-context.ts`, useSyncExternalStore module store —
  editors as EDITABLE entries with selection/doc/insert through
  their buffer + save, read-mode notes as READ-ONLY), and
  `openNoteTabPaths` (model) adds open-but-INACTIVE note and source
  tabs from workspace state — picked while unmounted, the note is
  read on demand as a read-only whole-note context (options wear a
  "— read-only" marker; insert needs an editor). S06c3 (owner):
  contexts are MULTIPLE — ordered pills in the `ctx` tab param (JSON
  list, legacy single-path reads as one; capped at 6 — the operation
  input cap is 8), the FIRST is the primary insert/append target
  (◉), the rest ride the operation as additional bounded selections;
  the candidate select + "+" adds, each pill's × removes, and the
  tree's existing drag payload DROPS into the chat as context (a
  note adds itself, a folder its notes recursively, capped). The
  S06c5 LAND FIX: the answered dropEffect must sit inside the
  source's effectAllowed (`compatibleDropEffect`,
  editor/drag-context.ts — the old 'link' answer under the tree's
  'move' made Chromium refuse every real drop), and two more drag
  SOURCES join: note-bearing TABS drag their note (`tabDragSource`:
  vault/project notePath, source dossier, a chat tab its transcript;
  effectAllowed 'copy'), and an EDITOR SELECTION drags with its path
  + range (EditorPane enriches dragstart with SELECTION_DRAG_MIME;
  the chat answers 'copy' so CodeMirror never deletes the source),
  landing as a RANGED pill `path#from-to` (`parseChatContextEntry`) —
  the send quotes exactly that slice, range-anchored so the checker
  can mark it source-backed.
  `relocateTabPaths` rewrites paths inside the ctx list too (ranged
  entries keep their suffix).
  Double-clicking a chat TAB renames its transcript in place
  (`chatRenameTarget` sanitizes; `relocateApply` rewrites links and
  broadcasts, so the tab's file param follows through the ordinary
  relocation path). The S06 pane-chrome
  column and its leaf `chat` map are RETIRED — the validator still
  accepts the map (saved states stay loadable), nothing renders it. Multi-turn rides the SAME
  operation contract: prior turns travel as `operation.thread`
  (`{role: user|assistant, content}`, validated in main — ≤24 turns,
  ≤8k chars each; `buildMessages` replays them verbatim between
  system and the live composed turn; the mock stamps `(turn N)` so
  multi-turn is provable offline). Each send runs `prepareAiRun`
  over the pane's ACTIVE editor (registered as `PaneAiSurface` via
  the S07d guard pattern: notePath + getSelection/getDoc/insert), so
  selection, prompt layers, and note context behave exactly like any
  AI run. Transcripts are vault FILES (S01 pin):
  `chats/YYYY-MM-DD-<slug>.md`, frontmatter `type: Atomik Chat` +
  engine + timestamp, BORN at the first message (never on open;
  createNote is exclusive — collisions retry `-2`, `-3`…), each turn
  appended as `## you` / `## atomik` through readNote/writeNote with
  the mtime handshake; `editor/chat-file.ts` holds the pure
  convention (slug/birth/append/lenient parse/thread mapping) —
  round-trip tested. "Insert into note" lands an answer AT THE
  CURSOR through the same buffer + save path as any accepted patch
  (`insertionChange` pads it into its own block) and resolves the
  turn's trace as accepted. S06b (owner bench on the REAL provider,
  six directives): turns wear chat ORIENTATION (you right as tinted
  bubbles, atomik left); a header HISTORY menu lists `chats/`
  newest-first (`chatHistoryOf`; the 36 popover idiom `.chat-pop`)
  and reopens any transcript; the S05d GENERATION OPTIONS became
  shared — pure drafts→params in `editor/gen-params.ts`, fields UI
  in `gen-options.tsx`, consumed by the selection menu AND the chat
  compose area; an answer PROMOTES to its own note
  (`chatNotePathForMessage`: first heading names it, first words the
  fallback, links stripped) opening BESIDE the chat via
  `openNoteInNewPane` (split right, pane typed, tree born hidden —
  the note is the point); `@` in the input QUOTES prompts/notes/
  sources (`editor/chat-at.ts` over the same providers as the editor
  @ menu: message prompts insert their layer directive, notes and
  source dossiers a relative markdown link that the S04o
  linked-note pipeline quotes automatically). Robustness from the
  owner's disappeared-chat report: a failed transcript read KEEPS
  the file pointer (transient failures no longer wipe the chat),
  `relocateTabPaths` drags `chat.file` on rename/move, close paths
  are regression-pinned, and both side columns cap at a pane
  fraction (tree 35%, chat 45%) so a split never crushes the note.
  CP-FEEDBACK S02 corrects the message geometry after daily use:
  user turns remain compact right-aligned bubbles, while Atomik turns
  are flat, stretch across the conversation measure, and begin at the
  pane's left edge (`.markdown-body` normally auto-centers, so
  `.chat-turn-body` explicitly resets that margin). The scroll stream
  carries `role="log"`, a polite live policy limited to additions, and
  `aria-busy` while an exchange runs; this announces completed turns
  without treating changing metrics as new messages. Assistant actions
  remain quiet until pointer hover or keyboard focus-within, so the same
  controls are discoverable without permanently crowding the answer.
  The presentation follows the flat assistant variant documented by
  [Vercel AI Elements](https://v6.ai-sdk.dev/elements/components/message)
  and the chronological update semantics of the
  [WAI-ARIA log pattern](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA23);
  neither reference changes Atomik's file-backed transcript contract.
