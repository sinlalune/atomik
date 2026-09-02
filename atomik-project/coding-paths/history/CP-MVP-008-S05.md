---
type: Atomik Coding Path History
title: CP-MVP-008 S05 — Inline live preview: proposal rendered over the target
description: Completed-step record rolled out of CP-MVP-008.md at CP-OPS-002 S04. Verbatim; nothing summarized.
tags: [coding-path, history, cp-mvp-008]
timestamp: 2026-08-24T00:00:00Z
path: CP-MVP-008
step: S05
---

# CP-MVP-008 S05 — Inline live preview: proposal rendered over the target

Rolled out of [CP-MVP-008.md](../CP-MVP-008.md) at CP-OPS-002 S04, VERBATIM:
moved, never summarized. The live path file keeps its declaration, its index
over these records, its ledger and its next action; the execution detail lives
here. The convention is in [paths.md](../paths.md).

Text that says "the checkpoint below" or "this ledger" was written when these
entries sat in the path file; it points at the Work Ledger in
[CP-MVP-008.md](../CP-MVP-008.md). Deixis was the only casualty of the move, and
repairing it in place would have made the record no longer verbatim.

Entries in this record: S05.

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
