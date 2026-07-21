---
type: Atomik Session Record
title: Vision-alignment review — the main expected features vs the owner's current vision, before CP-MVP-008 activates
timestamp: 2026-07-21T00:00:00Z
---

# Vision-alignment review — before CP-MVP-008 (first instance of the pre-path gate)

Owner directive, 2026-07-21: *"add a step now, before starting a new
active coding path, where we go through the main expected features to
see we are still aligned on my current vision."* The step is now a
standing gate (22 §If no active path exists; register Opening rule).
This note is its first run, at the CP-MVP-007 → CP-MVP-008 boundary.

**How this closes.** The owner walks the three parts and answers the
six questions (inline edits here, or in chat promoted here). CP-MVP-008
acceptance is valid only once this review carries owner answers. The
roadmap (18) stays owner-owned: this review may propose amendments,
never apply them.

## Part 1 — what is SHIPPED and daily-usable

| milestone | main features as built | state |
|---|---|---|
| M0 shell | secure main/preload/renderer split, tabs + split panes, Dev Docs tab, typed IPC only | done 07-06 (CP-001) |
| M1 vault | vault + project bundles (index/log conventions), CodeMirror editor, explicit/auto save with conflict handshake, no rewrite-on-open, lexical search | done 07-06 (CP-001) |
| M2 loop (mock) | select → ask AI → patch preview → accept/reject, mechanical truth labels, ActionTrace receipts — engine is still the deterministic MOCK | done 07-06 (CP-001) |
| M3 capture | phone QR upload over local HTTP, capture inbox → explicit import to source bundles | done 07-07 (CP-002) |
| M3 completion | local speech runtime evaluated + seated (dated capability tiers, 34) | done 07-08 (CP-004) |
| M3 seats | CUDA tiers, OCR seat (Mistral, key seam in main), opt-in cloud rung | done 07-08 (CP-005) |
| M4 PDF | PDF source tab: viewer, extraction, page/text anchors, selection → AI → note, citation return | done 07-13 (CP-003) |
| M5 web | isolated web view, reader extraction, MHTML snapshot dossiers, direct URL import + snapshot preview | done 07-16 (CP-006) |
| M1 friction | tree file management: create note/folder, OS-trash delete, rename/move = backlink refactor behind preview, DnD, per-pane typed tree panels, Import page, @ menu note links | CP-007 active — only the S07 owner bench remains |

Also live since 07-16: ADR-010 "one surface, two layers" (bound
scenes + free ink) — doctrine reserved into bedrock 19/21 for M12/M13.

## Part 2 — the immediate next path: CP-MVP-008 (proposed 07-20)

M2 completion — the loop leaves the mock. Main features as proposed:

- real generation: Mistral Small adapter in main behind the unchanged
  provider-neutral contract; mock stays selectable; budgets + cancel;
  ActionTrace with provider-reported usage and dated prices
- `prompts/` folder at vault root — your system/message prompts as
  ordinary vault files feeding quick actions, pills, and chat
- AI reached from the SELECTION: right-click context menu (quick
  actions, custom input at the click point, "Open chat"); the AI
  button leaves the note-bar
- inline live preview IN the note (accept/edit/reject, claim strip,
  trace badge); buffer changes only on accept
- chat as a right lateral pane-chrome column; docked AiPanel retires;
  chat history ephemeral with explicit save-to-note
- reserved follow-up (not in this path): a LOCAL llama.cpp generation
  seat as its own evaluated tier, the way speech was

**Q1 — Is this still the right next move and the right shape?**
Cloud-first with Mistral Small confirmed? Any surface your current
daily flow needs that the path misses (e.g. a specific quick-action
set for your learning notes), or anything listed you would cut?

## Part 3 — the queue behind it (main expected features, 18)

| milestone | what you would get |
|---|---|
| M6 Truth Lens + challenge/repair | claim/evidence drawer on answers, challenge a claim end-to-end, repair patch preview, receipts beside results |
| M7 live verification | bounded web grounding behind a provider-neutral contract (Gemini grounding was the candidate), risk/freshness router, hard budgets, private mode |
| M8 hybrid retrieval + context | wikilinks/backlinks, full-text retrieval (ripgrep/FTS5), inspectable context packets, passive link proposals |
| M9 measured local assistance | deterministic completion (links/headings/paths), optional local embeddings/reranker AFTER evaluation, edit-prediction experiments, all budgeted |
| M10 public knowledge + dictionary | Wikipedia/Wiktionary imports as dossiers, Wikidata/Lexeme lookup, etymology status, knowledge packs |
| M11 truth maintenance + cost dashboard | contradiction inbox, stale-claim queue, cost per accepted patch, claim-level history (grown from traces recorded since M2) |
| M12 Atomik DSL | line-oriented scene DSL + renderer + validator/repair; per ADR-010 the DSL is the serialization of the bound layer |
| M13 canvas | notes/sources/scenes as nodes with typed edges over files; one surface with free ink (ADR-010) |

**Q2 — After 008, does M6 still win?** The 18 order says
challenge/repair next (it only became meaningful once output is real —
the 008 sequencing decision). Dogfooding alternatives if your vision
moved: an M8 slice early (wikilinks/backlinks — the @ note-link menu
from S07h suggests linking is pulling), or M9's deterministic
completion. Your call sets the next register row.

**Q3 — Is live verification (M7) still wanted between M6 and M8**, or
has daily use changed its priority? (Provider choice and prices are
re-checked with a dated snapshot when the path opens; this question is
only about the vision slot.)

**Q4 — Do the 07-16/07-20 vision events change the far end?**
ADR-010 reshaped M12/M13 doctrine; a local generation seat is
reserved. Should 18 get an owner-gated amendment pass to absorb these,
or keep carrying them as ADR + register notes (current state)?

**Q5 — Deferred-without-forgetting check.** Anything on that list your
daily use now misses — the spaced review / retention queue is the
usual early puller for a learning workbench?

**Q6 — Learning-layer debt.** Notes 12–15 are owed (PDF, speech/OCR
seats, web source, file management — see docs/learning/index.md
§Coverage debt). Backfill all four as one docs-only unit before 008
S01, or interleave one per session alongside 008 execution?

## Owner answers

- **Q6 — answered 2026-07-21** (owner, in chat: *"can you provide the
  docs/learning/ what it misses by simulating going through the
  development process as we did and populate the docs"*): backfill ALL
  owed notes now, as one docs-only unit, before CP-MVP-008 execution.
  Executed the same day: notes 12–15 written against the dated session
  records, the French log entries, and the real code (anchors
  spot-verified against source); `docs/learning/index.md` §Coverage
  stall records the repayment.
- **Q1 — answered 2026-07-21 via the OPENING CHECK** (prompted
  exchange, the format the owner clarified he wanted): all four
  CP-MVP-008 features confirmed — Mistral Small cloud-first with the
  mock as fallback ✓; AI entry = the selection context menu, button
  leaves the note-bar ✓; quick actions preview INLINE ✓; chat = right
  lateral pane-chrome column ✓ with ONE revision: *"Persist chats as
  files"* — chat history becomes ordinary vault FILES, not ephemeral
  workspace state (the path's DoD and S01 pins are amended).
- **Q2 — answered 2026-07-21** (owner, verbatim): *"I think what come
  to me a need after the AI generation is the integration of wikidata
  as the backbone of ai generation, we will implement truth lens etc,
  but strenghten the generation through local rag architecture could
  be the best move."* → Leading candidate for the post-008 path: an
  M8 retrieval slice (lexical-first, 33) + M10 Wikidata slice as
  LOCAL RAG GROUNDING for generation; Truth Lens (M6) follows on
  grounded output. To confirm at 008's closing ceremony; registered.
- **Q3 — answered 2026-07-21**: M7's slot is decided at the M6 close.
- **Q4 — answered 2026-07-21**: roadmap 18 stays untouched; vision
  events keep living as ADR + register notes.
- **Q5 — answered 2026-07-21**: Git status/diff view pulled from the
  deferred list into the near-term backlog.
- **Process revision (owner, same session)**: this review's format is
  superseded by TWO ceremonies — a CLOSING ceremony at path close
  (metadata recall + backlog management + prompted exchange) and a
  quick OPENING check at path activation (feature-by-feature prompted
  confirmation). Codified in 22 §Between paths; an in-app "ceremony
  tab" is a recorded candidate (brainstorm 2026-07-21).

**REVIEW CLOSED 2026-07-21.** CP-MVP-008 awaits only the owner's
explicit acceptance to activate.
