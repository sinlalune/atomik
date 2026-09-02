---
type: Atomik Coding Path History
title: CP-MVP-008 S07 — bench rounds and M2 acceptance
description: Completed-step record rolled out of CP-MVP-008.md at CP-OPS-002 S04. Verbatim; nothing summarized.
tags: [coding-path, history, cp-mvp-008]
timestamp: 2026-08-24T00:00:00Z
path: CP-MVP-008
step: S07
---

# CP-MVP-008 S07 — bench rounds and M2 acceptance

Rolled out of [CP-MVP-008.md](../CP-MVP-008.md) at CP-OPS-002 S04, VERBATIM:
moved, never summarized. The live path file keeps its declaration, its index
over these records, its ledger and its next action; the execution detail lives
here. The convention is in [paths.md](../paths.md).

Text that says "the checkpoint below" or "this ledger" was written when these
entries sat in the path file; it points at the Work Ledger in
[CP-MVP-008.md](../CP-MVP-008.md). Deixis was the only casualty of the move, and
repairing it in place would have made the record no longer verbatim.

Entries in this record: S07, S07b7, S07b8, S07b8b, S07b8c, S07b9, S07b10, S07b11, S07b12, S07b13, S07b14, S07b15, S07b16, S07.

- [ ] S07 bench round 1 (2026-08-03, owner live-vault pass on a PDF
      import; verbatim feedback + triage:
      `../sessions/2026-08-03-s07-bench-round1.md`) — six findings,
      fixes S07b1–S07b6 gate the acceptance re-run (the intents re-run
      waits for S07b3/S07b4: they change the request shape — one real
      run after, not two):
      - [x] S07b1 (owner: "chat history picklist layout should be
            aligned on the left not vertically centered") — DONE
            2026-08-03. Cause: the S07o centering sweep
            (`.tabstrip button` et al., late in styles.css) reaches
            the history popup's list rows because the chat bar lives
            inside the tabstrip — its `justify-content: center` beats
            `.chat-pop button`'s `text-align: left` (flex row: only
            justify-content matters). Fix: corrective rule AFTER the
            sweep — popup list rows are content rows, not chrome
            verbs — `justify-content: flex-start`. Dev-mode CDP pin
            (before/after screenshots: rows centered → left). Tests
            599/53 unchanged; typecheck/build green.
      - [x] S07b2 (owner: "Chats files should be stored in per current
            date folder and without current date timestamp in the
            title") — DONE 2026-08-03. chats/ pin AMENDED:
            `chats/YYYY-MM-DD/<slug>.md` — the day is the FOLDER
            (createNote materializes it + S07k conventions per
            level), the title stays date-free. chatHistoryOf walks
            BOTH eras — day folders and pre-amendment flat files —
            interleaved chronologically by a shared `<day>-<name>`
            sort key (a flat file's name IS that key); convention
            files excluded at both levels; NO rewrite of old files.
            Dev CDP pin on the LIVE vault: real mistral send → born
            at chats/2026-08-03/reply-with-one-short-sentence…md,
            day-folder index/log written, history lists the date-free
            title first above the flat era. Tests 599/53 (chatRelPath
            + chatHistoryOf cases rewritten to the new convention);
            typecheck/build green.
      - [x] S07b3 (owner: "I still don't have access to all the
            request content sent … it misses hidden built-in blocks
            (chat system, rules, guardrails etc) … create a tree
            hierarchy in /prompts/built-in with all of that but I need
            to be able to manage easily and completely every bit of
            token sent") — DONE 2026-08-03. Every fixed block of the
            system template is now a NAMED block in a registry
            (prompt-composition: identity, grounding-rules,
            output-replace-selection/append/new-note, closing-rule)
            with its default = EXACTLY what composed before — and a
            vault overrides any of them with
            `prompts/built-in/<id>.md` files: body below optional
            frontmatter replaces the block VERBATIM; resolution walks
            the SAME nearest-wins chain as prompts (a project can
            override a block); being a subfolder, block files never
            join the prompt menus. Overrides ride the operation as
            `builtins` (contract + strict validation: registry keys
            only, 8k/block) into composeSystemPrompt in the adapter;
            the inspector's copy-request composes with the same
            overrides — display = sent holds. ☰ menu gains "Create
            built-in block files" beside the starters (same explicit
            action + idempotence rules; fresh files byte-match the
            defaults so materializing alone never changes a request —
            tested for all three destinations). Chat + inline + both
            editor flows load overrides per send. LIVE pin: menu
            action created the 6 block files + conventions in the
            owner's vault. Tests 599→608/53;
            typecheck/build green.
      - [x] S07b4 (owner: "I need pills that retrace the context
            (system, prompts, notes, other text document, medias)
            with the associated amount of token in each pills") —
            DONE 2026-08-03. request-breakdown.ts NEW (pure, tested):
            re-composes the operation through the SAME shared
            composers the adapter uses and attributes EVERY char of
            the wire request to a part — system (built-ins/prompt
            stack), history (thread), instruction, context (primary
            selection), document (further selections), note state,
            and TEMPLATE (the user-message scaffolding gets its own
            pill instead of hiding in the total). Tokens = the
            adapter's chars/4 heuristic, labeled estimated (~)
            everywhere; hover spells chars + basis. The you-turn
            header shows `↑~N tok sent`; the pill row rides the
            you-turn as SESSION meta (like claims — restored
            transcripts stay plain) + a `copy request` action
            (requestAsText, built-in overrides included — display =
            sent; closes the "no access in chat" half of the S07b3
            report). Live pin: real send showed system ~354 ·
            instruction ~10 · context ~981 · note state ~750 ·
            template ~195 = ~2289 est vs 2128 provider-counted.
            Tests 608→612/54; typecheck/build green.
      - [x] S07b5 (owner: "source dossier tab not collapsable to get
            full pdf view (better if source are on the first panel
            and source dossier on the right no?)") — DONE 2026-08-03
            (layout confirmed: "source left"). The earlier
            dossier-first flex-order swap RETIRED (this directive
            supersedes it): DOM order is visual order again — media
            stage first/left, dossier right with the separator
            border. Collapse: a SidebarToggleIcon door at the end of
            the dossier bar hides the column (full media view); a
            floating door at the media stage's BOTTOM-right (top-right
            belongs to rotate tools/pdf nav) brings it back; the
            state rides the tab params (dossierOff) like the PDF
            page — survives remounts, restarts, workspace snapshots.
            Dev CDP pin: order verified by geometry (source left of
            dossier), collapse → full-width PDF + show door, expand →
            restored. Tests 612/54 unchanged; typecheck/build green.
      - [x] S07b6 (owner: "I can't interact with the pdf text, as I
            would be needing to do if I want to anchor highlighted
            passage (maybe in need of a proper pdf viewer with basic
            tooling)") — DONE 2026-08-03 (split confirmed: text layer
            now, full viewer tooling — search, zoom presets,
            thumbnails — post-008 backlog for the closing ceremony).
            PdfView gains the pdf.js TextLayer over the raster:
            transparent spans positioned over the painted glyphs
            (CSS-pixel viewport — spans live in layout space, the
            devicePixelRatio belongs to the raster alone;
            --total-scale-factor set per render; the essential subset
            of upstream pdf_viewer.css inlined under .pdf-page
            .textLayer) — page text SELECTS and copies. A
            selectionchange listener arms "Anchor selection" in the
            pdf bar only while the selection lives INSIDE our layer →
            onAnchorPassage(page, quote) → withPassageAnchor (dossier,
            pure, tested): quote-identified rows `p<page>q<n>` —
            Meaning carries the exact excerpt (whitespace collapsed,
            pipes neutralized, 120-char cap), Target stays the page
            link (the finest the PDF format offers), same-quote
            re-anchor is a no-op, several passages per page coexist
            with page anchors. Live pin on the owner's dossier: cold
            mount renders 292 spans (StrictMode-safe), select →
            anchor → `p1q1 | “Devis normalisé…”` row written. Tests
            612→613/54; typecheck/build green.
- [x] S07b7 (owner bench round 2, 2026-08-03: "if I close the last
      note tab beside a chat pane and then click on a note in the
      tree panel, it opens a tab in the chat pane instead of a note
      tab in a new panel") — DONE 2026-08-03. The S06c13 landing let
      a chat pane's tree ADOPT notes as its own tabs
      (openNoteFromTree added to node.id whatever the pane kind).
      Amended: a CHAT pane's tree is a browser, never a tab feeder —
      note clicks route through revealNote (a tab already viewing
      the note activates wherever it lives, else a vault-typed pane
      opens beside, tree hidden); source clicks through revealSource
      NEW (model, tested — same activate-or-open-beside contract,
      source-image tab; the doors audit: notes AND sources were both
      leaking into the chat pane). Dev CDP pin on the owner's exact
      repro state (tree + lone chat pane): tree click → 2 panes,
      chat intact, note in the new pane — and the chat's auto
      context follows the newly opened note. Tests 613→614/54;
      typecheck/build green.
- [x] S07b8 (owner bench round 3, 2026-08-03, verbatim in the round-1
      session note: "we need an easy way to select and visualize what
      is included in by default request and change it if needed … a
      simple system section with its preload builtin module with
      possibility to rearrange delete and add prompts, first section
      in both UI … put the context menu element in the chat message
      ui as it active for next message interaction … apply best
      practices in ai chat ui for prompt and context engineering") —
      DONE 2026-08-03. The SYSTEM MESSAGE becomes an ordered,
      visible, editable PLAN: (1) prompt-composition gains
      WireSystemPlanEntry ({block} refs incl. the
      destination-resolved 'output' pseudo-block; {body,label} for
      system-prompt files) + composeSystemFromPlan — the DEFAULT
      plan composes BYTE-IDENTICALLY to the pre-plan template
      (tested for all three destinations) — + systemTextOf, the ONE
      plan-aware resolver the adapter, both inspectors, and the
      breakdown pills now share (display = sent everywhere);
      (2) operation.systemPlan (contract + strict validation: known
      blocks, sized bodies, ≤16 entries) outranks the legacy stack;
      (3) SystemPlanSection NEW — chips preloaded with the built-in
      blocks: hover = live body preview + ~tokens (override-aware),
      ‹ › reorder on hover, × remove, + adds the vault's system
      prompts, ↺ restores defaults, chip click opens the backing
      file (chat: revealNote); (4) FIRST section of the contextual
      AI menu (the S04 system-stack pills fold into +) and of the
      chat composer — a slim SYSTEM disclosure above options whose
      badge shows `custom · N`, the plan riding the tab params
      (sys), so a conversation KEEPS its arranged system for every
      next message, across remounts/restarts/snapshots (garbage
      params read as default); chat keeps @/typed input as its
      message-prompt door (owner: "prompt input only for now").
      Practices applied: chips-with-preview, progressive
      disclosure, live token accounting, persistent per-conversation
      state, one-click restore. Dev CDP pin both surfaces: chat —
      open section (4 chips ~343 tok) → +Tone → ×closing-rule →
      badge `custom · 4` → ‹ reorder → ↺ default; menu on a real
      note — SYSTEM section first, then message/built-in/
      destination. Tests 614→624/55 (composeSystemFromPlan parity +
      plan semantics; serialize/parse/wire; validation);
      typecheck/build green. NOTE: GeneratedNoteScreen (new-tab
      Note stage) still runs the legacy stack path — fold-in
      recorded for the ceremony backlog.
- [x] S07b8b (owner, same day: the S07b8 directive's research half —
      "research and apply best practices … make it modern, clean,
      visual and intuitive", refined: "use well established designers
      or coders as shadcn or t3 ideas (not the library) or respected
      opensource projects for their modernity") — DONE 2026-08-03.
      RESEARCH RECORDED: docs/research/ai-chat-ui-practices.md —
      primary source read from CODE: Vercel ai-chatbot's PromptInput
      + shadcn InputGroup (the canonical composer: ONE rounded
      bordered card, chips row + borderless auto-sizing textarea +
      block-end toolbar ghost-tools-left/submit-right, focus ring on
      the CARD); secondary pattern survey (intent preview, ambient
      optional token detail, one chip language, reading comfort,
      hover-revealed actions) with applied/held/deferred marks.
      APPLIED (36 tokens throughout, no raw literals): chat composer
      rebuilt as `.chat-card` — field-sizing:content textarea
      (borderless, min 3.2rem/max 12rem), card-level accent focus
      (border + 1px outline), footer = SYSTEM ghost toggle (badge
      `custom · N`, aria-expanded) · INTENT PREVIEW (`→ ~N tok
      + context`, live from plan bodies + visible turns + draft,
      hover spells parts; the context note stays a named unknown
      read at send time) · send; the system section opens as a SHEET
      above the card; ONE pill recipe now shared by context pills,
      request pills, and system chips (36 "no new pill forks" made
      real); answer bodies get line-height 1.6 + 72ch measure;
      per-turn actions reveal on hover/focus-within. Deviations
      recorded: options row stays its own disclosure (popover
      fold-in = follow-up); GeneratedNoteScreen untouched. Dev CDP
      pin: card + sheet + preview live in the owner's terracotta
      theme AND the moss dark probe (muted-on-card ≈7:1); pin script
      hardened to target the renderer page (a web tab had hijacked
      the first-page pick). Tests 624/55 unchanged;
      typecheck/build green.
- [x] S07b8c (owner bench round 4, 2026-08-03: "context section is
      still on top it should be integrated to next message section …
      the token counter … doesn't live estimate context as message
      pills do, same for the model options — it should be floating
      pills like system with for example the model used and a dynamic
      section opening on click, same for context") — DONE 2026-08-03.
      The COMPOSER CARD now owns everything about the NEXT message:
      (1) the top bar keeps only CONVERSATION chrome (history + Σ
      totals) — the context select/+ removed; (2) context chips moved
      INTO the card's chips row (the reference's attachments slot)
      WITH live token estimates — mounted surfaces measure free,
      unmounted notes read once and cache (ctxSizes); ranged pills
      count their slice; auto pill shows its note's ~tok; (3) THREE
      floating pill-toggles in the footer, one dynamic sheet above
      the card at a time: `+ context` (rows of open notes to add,
      × no context, ↺ auto), `system` (the S07b8 plan section),
      `model` (pill shows the LIVE model id + a `tuned` badge when
      sampling is overridden; sheet = the sampling grid —
      GenOptionFieldRows extracted from GenOptionsFields, menus keep
      the disclosure); (4) the intent preview is now COMPLETE and
      consistent — context counts like every part (`~N tok`, hover
      spells system · context · history · draft) — and stays
      ambient (fs-xs muted, one figure). Dev CDP pin in the owner's
      live session: chips row `◉ orgasm ~725 ×` + `+ context`,
      footer `system · mistral-small-2603 · ~1323 tok`, all three
      sheets opened (context rows incl. read-only marks, sampling
      grid with the owner's tuned values). Tests 624/55 unchanged;
      typecheck/build green.
- [x] S07b9 (owner bench round 5, 2026-08-03: "chat pane doesn't need
      a tree panel, I just said one time that if only chat pane stays
      last active, keep a tree panel alive — but now I have a
      collapsed tree panel each time I open a chat pane") — DONE
      2026-08-03. The S06c13 landing gave EVERY chat pane a hidden
      tree panel, so its floating show-tree door appeared on every
      chat pane. Scoped to the owner's actual rule: a chat pane
      renders NO tree door at all — EXCEPT as the SOLE surviving
      pane, where the tree must stay reachable (paneCount(state)
      === 1; the private node-level leafCount exposed as a
      state-level paneCount, tested). ensureVisibleTree (S06c13's
      close-time flip) untouched — closing the last vault pane still
      lands on tree + chat. Dev CDP pin, all three states: chat
      beside a note → 0 tree doors; other pane closed → sole chat
      PRESENTS the tree; sole chat hides its tree → the door
      appears; restored. Tests 624→625/55; typecheck/build green.
- [x] S07b10 (owner bench round 6, 2026-08-03: "the token count split
      pills in my message don't survive tab switch or app reload") —
      DONE 2026-08-03. The breakdown now PERSISTS IN THE TRANSCRIPT
      FILE — an HTML comment on the you-turn heading
      (`## you <!-- sent: system=1415|context=2900:name|… -->`):
      invisible in rendered markdown, visible and hand-editable in
      source, diff-friendly, no hidden store — consistent with "a
      chat IS a note". Only derived FIGURES persist (kind/label/
      chars; ~tok re-derives at display) — request TEXT never does,
      so the copy-request action exists only for THIS session's
      sends. Mechanics: the ANSWER's write stamps the last you
      heading (withSentMetaOnLastYou — one write persists both;
      re-stamp replaces, never duplicates); parseChatTurns reads the
      meta back leniently (unknown comments ignored, mangled meta
      degrades to none, the heading still starts its turn; old flat
      files unaffected). ALSO: a contextless chat's empty transcript
      anchor no longer emits a noisy `context ~0` pill (filtered at
      creation and at restore). Live pin: real send → the stamp in
      the owner's live transcript; full window reload → the pill row
      re-renders from the file, copy button rightly absent. NOTE:
      the pin's test exchange rode the owner's focused Marc-Aurèle
      chat — two stray turns, ordinary note text, owner deletes at
      will. Tests 625→628/55; typecheck/build green.
- [x] S07b11 (owner bench round 7, 2026-08-03, screenshot: "un
      problème de math dans les token counts — 354+6+200 vs ~559 —
      et je comprends system mais pas instruction ni template") —
      DONE 2026-08-03. (1) MATH: the header estimated the total
      chars in one ceil while pills ceil per part — the header
      disagreed with its own pills by a rounding step; now ONE
      arithmetic: totalTokensEst IS the pill sum (tested). (2)
      SEMANTICS: the instruction pill labels itself "your message"
      (kind unchanged — old stamps still parse) and every pill kind
      carries a hover DESCRIPTION (PART_DESCRIPTIONS, tested
      exhaustive): system = the composed system message, template =
      the fixed request scaffolding (headings/steps/quoting rules)
      the app always sends, context/document/history/note-state
      spelled out likewise; restored pills get the same hovers.
      Live pin on the owner's exact message: header ↑~560 = 354+6+
      200, hovers verified. Tests 628/55; typecheck/build green.
- [x] S07b12 (owner bench round 8, 2026-08-03, with the pasted
      copy-request as evidence: "what worries me the most is that we
      are using note generation prompt structure and content for a
      chat interface" + "yes trim it" on the note-state redundancy) —
      DONE 2026-08-03. THE CHAT GETS ITS OWN CONTRACT. (1) Request
      MODE on the operation (`mode: 'chat'`, validated; absent = the
      note contract, byte-untouched — tested): the system plan's
      blocks resolve to chat variants — grounding-rules →
      grounding-rules-chat (answer the QUESTION; the notes are
      reference material, never the forced topic; the exact-quote
      contract kept word-for-word so the claim checker still labels
      chat answers), output → output-chat (conversational plain
      markdown, concise; note-shaped only when asked to draft) —
      two NEW registry blocks with defaults + materialized files
      (menu action created both in the owner's vault). (2) The chat
      USER message is question-first (composeChatUserMessage:
      ## Question verbatim — never demoted to "style guidance" —
      + ## Reference notes, quotable; no Steps, no Landing point;
      empty anchors skipped); userTextOf joins systemTextOf as the
      shared mode-aware resolver (adapter, breakdown, copy — one
      set of bytes). (3) NOTE-STATE TRIM (the round-7 confirm):
      chat never sends it; whole-note scopes drop it everywhere —
      the excerpts repeated bytes the request already carried
      (~750 tok observed). (4) system section preview + click-to-
      edit resolve mode-aware (chat's 'output brief' chip previews
      and opens output-chat.md). Live pin after a main restart
      (HMR pitfall: the renderer sent mode before main knew the
      field — 'ai: rejected operation'; the memory rule about dev-
      mode pins earning their keep): "quelle est la différence
      entre ethos et logos ?" → one direct conversational French
      sentence, no heading, no topic hijack. Tests 628→631/55;
      typecheck/build green.
- [x] S07b13 (owner bench round 9, 2026-08-03: "prompt transparency
      is not respected as you introduce an abstract layer on chat
      dedicated prompt — I want full transparency and choice; the
      system section reacts badly to 'add a system prompt' (a
      scrollable section); the separation of input / history /
      options could be improved") — DONE 2026-08-03. (1)
      TRANSPARENCY: the S07b12 mode-RESOLUTION retired — no chip
      ever says one thing and sends another. The chat's DEFAULT plan
      carries the chat blocks BY NAME (identity · grounding · chat ·
      output · chat · closing rule — DEFAULT_CHAT_SYSTEM_PLAN;
      variant-aware parse/default/reset); composeSystemFromPlan
      composes exactly the chips (only the menu's 'output'
      pseudo-block stays destination-dynamic); operation.mode now
      shapes the USER template alone. (2) CHOICE: the + opens
      INLINE add rows — BLOCKS (every registry block not in the
      plan: note grounding in a chat, chat output in the menu —
      the owner's call, visibly) and PROMPTS (vault system
      prompts); the absolute popover retired — it clipped into a
      scroll trap inside the sheet (the reported bug). (3)
      SEPARATION: sheets ATTACH to the card — same margins/border
      family, rounded top, card's top flattens under an open sheet:
      one composer block. Live pin in the owner's session: chips
      read `identity · grounding · chat · output · chat · closing
      rule`, add rows inline (no scroll trap — measured), note
      blocks offered as choices; the owner's own 5-turn Hume chat
      running conversationally beside. Tests 631→632/55;
      typecheck/build green. NOTED for round 10: a promoted chat
      note titled "Bien sûr ! Voici une version en français"
      produced a note-not-found on reveal — punctuation in
      chatNotePathForMessage vs createNote sanitization suspected;
      not yet triaged.
- [x] S07b14 (owner bench round 10, 2026-08-03: "make the input card
      FLOAT above the chat history, no white bg; harmonize font
      sizing/format throughout the message card; a separate floating
      card with glass/translucent effect for the dynamic upper part
      (system and model for now); prompt icon for system, brain icon
      for model") — DONE 2026-08-03. (1) FLOAT: .chat-compose is
      absolute over the history (z-float, transparent, pointer-events
      pass-through outside its children); the history scrolls beneath
      (10rem clearance); the card carries the pop shadow; the error
      floats with the composer as its own card. (2) GLASS: the
      dynamic sheets are a SEPARATE floating card — --glass-pop +
      blur(18px) saturate(1.2) + shadow (the 36 overlay idiom, small
      area, @supports fallback to opaque surface) — history text
      visibly frosts beneath it. (3) TYPE: one scale inside the card
      (textarea --fs-md, everything else --fs-sm, uppercase/tracking
      dropped from the tools). (4) ICONS: PromptIcon (terminal
      chevron + input line) on the system pill, BrainIcon (two
      hemispheres over a stem) on the model pill — NEW in icons.tsx
      (16 viewBox, stroke 1.3, aria-hidden). Live pin in the owner's
      session: absolute/transparent compose measured, blur measured
      on the sheet, both icons rendered; dark probe fine for this
      unit's surfaces (the probe's light turn-cards are a
      direct-attribute artifact — turn styles untouched here).
      Tests 632/55 unchanged; typecheck/build green.
- [x] S07b15 (owner bench round 11, 2026-08-03, screenshot: input-card
      transparency; narrower with a max width — it overlapped the
      scrollbar; history button → the tab navigation before the split
      button; the model menu "out of size scale, oversized"; a close
      button on every over-card menu) — DONE 2026-08-03. (1) The
      input card FROSTS like the sheets (--glass-pop + blur + the
      opaque fallback). (2) Card, sheets, and floating error share
      one measure: width 100%−2·space-5, max 44rem, centered — clear
      of the history scrollbar. (3) PAST CHATS live in the chat
      pane's TABSTRIP (before the split buttons): lazy vault-verb
      load on open, same route-never-replace openChatTranscript; the
      chat bar slims to the Σ totals alone and renders only when
      nonzero. (4) The model sheet composes at the card's scale —
      four compact fields in ONE row (measured 49px tall, was a
      menu-sized grid). (5) Every sheet carries a corner × (and the
      footer pill still toggles). Live pin: card blur + 44rem
      measured, history in the tabstrip, compact model row with ×.
      Tests 632/55 unchanged; typecheck/build green.
      S07b15b (owner: "message card and menu cards are not same
      width") — cause: no global border-box reset in styles.css;
      same CSS width, but the sheet's padding+border widened its box
      (content-box; 470 vs 461 measured, left edges offset). Fix:
      ONE shared measure rule (.chat-card / .chat-sheet /
      .chat-error: border-box + width + max 44rem + centered) —
      padding and border live INSIDE the shared width. Verified
      live: 458.75px and identical left for card and sheet.
- [x] S07b16 (owner bench round 12, 2026-08-03: "token counters on
      response messages don't persist") — DONE 2026-08-03. The
      answer's measured metrics (tokens in/out + basis, wall time,
      estimated cost) now persist in the transcript the S07b10 way:
      a `run:` comment on the `## atomik` heading
      (`<!-- run: in=2128|out=31|basis=provider|ms=1834|
      usd=0.000341 -->`), written WITH the answer (turnSection/
      appendChatTurn gain the comment slot); parseChatTurns reads it
      back (sent: and run: comments dispatch per heading, unknown
      comments still ignored); the metrics line renders from live
      TurnMeta first, else the transcript's persisted figures — tab
      switches and reloads keep the counters. Serialization partial-
      friendly (mock = latency alone), garbage degrades to none.
      App closed at land time — no live pin this unit; the idiom is
      S07b10's, and the append→parse round trip + coexistence of
      sent/run stamps are unit-tested. Tests 632→635/55;
      typecheck/build green.
- [x] S07 Acceptance: 18 §M2 intents re-run on the REAL provider
      (selected passage → source-linked note; uncited detail labeled;
      one accepted patch = one meaningful diff; budget/cancel
      enforced below renderer; source-backed reproducible by the
      deterministic check) + owner bench on the live vault: a real
      question over a real source selection via the context menu, an
      inline accept, a chat exchange, a prompt file edited and
      re-used, a cancel mid-flight, the receipt inspected; review
      and close.
      AGENT HALF DONE 2026-08-03 (post-S07b, real mistral, live
      vault, CDP-driven): (1) real question over a real context →
      answer; (2) the answer's EXACT quote of the source labeled
      source-backed and its uncited explanation labeled model-only —
      the deterministic checker reproduced on REAL output; (3)
      answer promoted → ONE clean source-linked note file
      (`Quote and Explanation.md`); (4) cancel mid-flight → typed
      `ai(cancelled)` taxonomy error surfaced with retry, transcript
      kept the you-turn, no partial answer; (5) usage + billing on
      every real run (↑2140 ↓58 · ~$0.0004; estimate ~2305 vs 2140
      provider-counted); budget ceilings main-side (S02, unit-
      tested — not re-driven live).
      OWNER HALF VALIDATED 2026-08-04 ("I validate all owner bench
      task") after the twelve live bench rounds S07b1–S07b16 —
      every bench item exercised in the rounds themselves (real
      sends, inline accept, chat exchanges, prompt/system-plan
      editing, cancel, receipts inspected). PATH CLOSED; acceptance
      record: ../sessions/2026-08-04-cp-mvp-008-acceptance.md.
      Bench artifacts left in the vault for inspection:
      chats/2026-08-03/*, `Quote and Explanation.md`, dossier
      anchor `p1q1` — delete at will.
