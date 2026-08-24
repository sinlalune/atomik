---
type: Atomik Coding Path History
title: CP-MVP-008 S04 — Selection context menu
description: Completed-step record rolled out of CP-MVP-008.md at CP-OPS-002 S04. Verbatim; nothing summarized.
tags: [coding-path, history, cp-mvp-008]
timestamp: 2026-08-24T00:00:00Z
path: CP-MVP-008
step: S04
---

# CP-MVP-008 S04 — Selection context menu

Rolled out of [CP-MVP-008.md](../CP-MVP-008.md) at CP-OPS-002 S04, VERBATIM:
moved, never summarized. The live path file keeps its declaration, its index
over these records, its ledger and its next action; the execution detail lives
here. The convention is in [paths.md](../paths.md).

Text that says "the checkpoint below" or "this ledger" was written when these
entries sat in the path file; it points at the Work Ledger in
[CP-MVP-008.md](../CP-MVP-008.md). Deixis was the only casualty of the move, and
repairing it in place would have made the record no longer verbatim.

Entries in this record: S04, S04b, S04c, S04d, S04e, S04f, S04g, S04h+i, S04j, S04k, S04l, S04m, S04n, S04o.

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
