---
type: Atomik Coding Path History
title: CP-MVP-008 S06 — Chat lateral panel
description: Completed-step record rolled out of CP-MVP-008.md at CP-OPS-002 S04. Verbatim; nothing summarized.
tags: [coding-path, history, cp-mvp-008]
timestamp: 2026-08-24T00:00:00Z
path: CP-MVP-008
step: S06
---

# CP-MVP-008 S06 — Chat lateral panel

Rolled out of [CP-MVP-008.md](../CP-MVP-008.md) at CP-OPS-002 S04, VERBATIM:
moved, never summarized. The live path file keeps its declaration, its index
over these records, its ledger and its next action; the execution detail lives
here. The convention is in [paths.md](../paths.md).

Text that says "the checkpoint below" or "this ledger" was written when these
entries sat in the path file; it points at the Work Ledger in
[CP-MVP-008.md](../CP-MVP-008.md). Deixis was the only casualty of the move, and
repairing it in place would have made the record no longer verbatim.

Entries in this record: S06, S06b, S06c, S06c2, S06c3, S06c4, S06c5, S06c5b, S06c6, S06c7, S06c8, S06c9, S06c10, S06c11, S06c12, S06c13, S06c14, S06c15, S06c16, S06c17, S06c18, S06c19.

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
- [x] S06c13 (owner correction of S06c12: "there only the tree panel
      and two panes, 1 vault 1 chat — I need to be able to close the
      last vault pane and have only tree panel and chat pane open";
      plus: sessions may START as tree + chat) — DONE 2026-07-25.
      The S06c12 landing kept an empty vault PANE beside the chat —
      not what the owner meant: the PANE should go, the TREE PANEL
      should live on. Mechanism: chat panes now CARRY the vault tree
      panel like every pane (S06c2's "no tree at all" amended) —
      OPT-IN hidden by default (paneTreeHidden: absent 'off' reads
      hidden for kind chat, so a chat beside a note pane never
      doubles the tree; existing layouts unchanged) — and a close
      that REMOVES a pane runs ensureVisibleTree: if no survivor
      shows a tree, the first pane that has one shows its
      (closePane/closeTab/closeEmptyPane). Result: closing the last
      vault pane beside the chat collapses it away and the chat pane
      presents the vault tree — "tree panel + chat pane", which then
      persists as a session-start arrangement. The S06c12 in-place
      landing remains only for a pane with NO tree-bearing sibling
      (lone web pane closing its last tab still lands on the visible
      tree). PaneTreePanel needed no change (unknown scopes fall
      through to vault rendering); notes opened from a chat pane's
      tree join it as ordinary note tabs (mixed tabs per the owner).
      Chat-left/artifact-right confirmed already working
      (openNoteInNewPane splits beside the chat wherever it sits).
      The DnD/docking directive (tree→tab/pane drops, tab tear-out,
      smart drop-zone previews, drag docking) recorded VERBATIM in
      brainstorm/2026-07-25-dnd-docking-and-chat-workflows.md as the
      candidate path after this one — too large for a c-series
      sub-step. Dev-mode CDP pin + screenshot (vault+chat → close
      vault → 1 pane: tree with notes + chat compose). Tests
      582→583/52 (S06c12/13 block rewritten to the corrected
      semantics); typecheck/build/smoke green.
- [x] S06c14 (owner: "I need to be able to start a chat without prior
      context" + "get rid of the autoloaded context … in case I like
      the current workspace state but need to launch a new subject")
      — DONE 2026-07-25. (1) CONTEXTLESS CHAT: the send path no
      longer errors when no context resolves — the TRANSCRIPT note
      anchors the operation (it exists by send time: for a fresh
      contextless exchange the you-turn persists FIRST), the
      selection is empty, and the thread alone carries the
      conversation; a PICKED context that fails to READ still errors
      instead of silently degrading. Works from the S06c13 tree+chat
      session with zero notes open. (2) DISMISSABLE AUTO: the auto
      pill gains × — patching ctx to the serialized EMPTY list, the
      new EXPLICIT no-context pick (chatContextsExplicitNone; absent
      ctx still means auto) — a "no context ↺" pill shows the state
      and restores auto; removing the last picked pill now lands on
      explicit none too (it used to silently fall back to auto). The
      pick rides ordinary tab params: survives remounts, restarts,
      relocation. Dev-mode CDP pin (contextless send with no note
      open; auto → × → none → send → ↺ auto, note staying open
      throughout). Tests 583→584/52 (chatContextsExplicitNone);
      typecheck/build/smoke green.
- [x] S06c15 (owner: "get rid of the add chat button next to history —
      duplicate with the add tab one" + "chat pane is active but the
      [open chat] button is still here") — DONE 2026-07-25. Two
      redundant doors removed: (1) the chat bar's "+" (S06c7-era new
      chat tab) deleted — the chat pane's TABSTRIP + already makes
      chat tabs (chat-typed pane); (2) the tabstrip's "Open chat pane"
      button now hides whenever ANY chat tab exists (hasChatTab,
      model) — with a chat open, its tab IS the door (S06c9 keeps the
      right conversation); the button returns when the last chat tab
      closes. Dev-mode CDP pin both ways. Tests 584/52 unchanged
      (hasChatTab exercised via the pin; pure walk);
      typecheck/build/smoke green.
- [x] S06c16 (owner: "I don't have token monitoring in the chat — I
      need input output and latency") — DONE 2026-07-25. The
      runAiOperation handler already measured wall time and received
      provider usage (both trace-bound since S09/S02) — they now ride
      the RESPONSE too: AiResponseBundle gains optional `usage`
      {inputTokens, outputTokens, basis} and `durationMs`; the chat
      stores them in the turn's session meta and each answer's header
      shows `2.4s · ↑123 ↓456 tok` (~ marks estimated bases; the mock
      shows latency alone — it reports no usage; hover spells the
      numbers out). Same figures the trace records — no new
      measurement, no telemetry widening. ALSO DECIDED at this
      exchange (owner): default engine when a key is configured =
      mistral CONFIRMED ("there is only one model seat right now, of
      course it is default") — the S07-bench OPEN question closes.
      Tests 584/52; typecheck/build/smoke green.
- [x] S06c17 (owner, decision B redirect: "the generated text
      highlighted in different color code for the different
      epistemological status, label status on hover, sourced claims
      clickable — never been in a good UI state") — DONE 2026-07-25.
      The truth-chip ROW retires from the chat; the ANSWER TEXT now
      carries its labels inline: claim-highlight.ts NEW (pure,
      tested) locates each claim — a sentence of the RAW markdown —
      inside the RENDERED text (inline markdown stripped, matching
      whitespace-flexible with \s* because breaks:true renders
      hard-wrapped lines as <br>, which contributes NOTHING to
      textContent and fuses the words around it — found via live HTML
      dump after the pure functions matched and the DOM didn't);
      applyClaimMarks wraps located ranges in labeled <mark>s
      (multi-text-node spans wrap per slice, back-to-front so offsets
      hold). Colors ride the truth-chip palette (ok/warn/info tokens
      — themes stay coupled in one place); hover spells the label out
      (claimTitle); SOURCE-BACKED marks are clickable → revealNote
      (model, tested): an existing tab viewing the source activates
      anywhere, else the note opens beside. Claims/evidence are
      session meta (restored transcripts stay plain — documented
      S06c). Mock caveat: its quote candidate is the WHOLE selection
      (not an answer substring), so source-backed marks appear only on
      the real provider — mistral extracts candidates FROM the answer.
      FUTURE (owner): triggering claim VERIFICATION with tools —
      recorded in the brainstorm note. Dev-mode CDP pin (model-only /
      needs-citation / interpretive marks + titles + <br>-fused spans).
      Tests 584→593/53 (claim-highlight suite NEW + revealNote);
      typecheck/build/smoke green.
- [x] S06c18 (owner: "we should be able to save layout as
      'workspaces' that we can load when we want to work on a
      specific subject and get it back to the same state we left
      it") — DONE 2026-07-25. NAMED WORKSPACES: snapshots are
      ordinary validated WorkspaceState files under
      `.atomik/workspaces/<name>.json` — same trust boundary, atomic
      write, and caps as the live layout; disposable, never
      knowledge (03). workspace-state.ts grows
      sanitize/save/list/read/delete (create AND delete in one unit —
      the lifecycle rule); four narrow channels ride the
      contract/preload/main pattern (preload-surface drift test
      covers them). UI: ☰ menu "Workspaces" section — name a save of
      the CURRENT layout (read lazily via useWorkspace.getState, the
      menu keeps its narrow subscriptions), click a listed snapshot
      to LOAD (current native web views destroyed first; snapshot
      passes the same load-time migrations as startup), × deletes.
      Because chat tabs carry conversation pointers and context
      picks in params, a loaded workspace restores its chats too.
      Dev-mode CDP pin: save "philosophy" → open chat pane → load →
      exact original layout back. Tests 593→598/53 (snapshot suite);
      typecheck/build/smoke green.
- [x] S06c19 (owner: "I need message cost and also thread/chat level
      input/output + current incrementable cost") — DONE 2026-07-25.
      (1) PER-MESSAGE COST: the adapter's billing estimate (dated
      price snapshot, always labeled 'estimated') now rides the
      response bundle beside usage/durationMs; the answer's metrics
      line appends `· ~$0.0004` (hover spells the 6-decimal figure).
      (2) CONVERSATION TOTALS: running input/output tokens + cost
      ride the chat TAB's params (tokIn/tokOut/cost —
      chatTotalsOf/addChatTotals, model, tested; garbage reads as
      zero, unknown tab no-ops) — incremented per exchange by the
      run closure, so they persist through remounts, restarts, and
      workspace snapshots, and travel with the conversation. The
      chat bar shows `Σ ↑12310 ↓4102 · ~$0.0234` once nonzero.
      Mock caveat: it reports neither usage nor billing — totals
      appear on the real provider. Tests 598→599/53;
      typecheck/build/smoke green.
