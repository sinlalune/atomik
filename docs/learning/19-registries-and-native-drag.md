---
type: Atomik Learning Note
title: 'Learning: module registries and the native drag contract — how panes talk without touching'
description: Beginner-first walkthrough of CP-MVP-008 S06c–c7 — workspace-wide module stores with useSyncExternalStore, session state that must outlive a remount, and the HTML5 drag protocol lessons (effectAllowed matching, payload enrichment) behind the chat's drag-anything-as-context UX.
tags: [learning]
timestamp: 2026-07-25T00:00:00Z
---

# Learning: module registries and the native drag contract — how panes talk without touching

*Covers CP-MVP-008 S06c–S06c7 (2026-07-23/24). First-use rule (17):
workspace-wide registries and cross-surface native drag are first
mobilizations; written after the owner pass settled the shapes.*

## Who this is for and what you can do afterwards

You know React state flows down through props and up through
callbacks — and you have felt the pain when two distant panes need
each other. Afterwards you can decide between a prop chain, a module
registry, and persisted state for any cross-surface need; explain
why a dragged item "initiates but doesn't land"; and enrich a native
drag the browser already owns.

## Three kinds of state, three homes

The chat pane forced a taxonomy worth keeping:

**Durable, owner-visible → validated persisted state.** The
transcript pointer and context picks ride TAB PARAMS (a flat string
map the main process validates, relocation rewrites, restarts
restore). Rule of thumb: if losing it on restart would surprise the
owner, it belongs here — never in a component.

**Session-only, remount-surviving → a module store.** A tab switch
UNMOUNTS the view (React keys), but a half-typed draft and an
in-flight provider call must not die with it (`chat-run.ts`). A
plain module `Map` keyed by TAB ID does this with zero ceremony —
the remounting component ADOPTS what it finds. The subtlety is
ownership: the run's closure keeps writing to the FILE whether or
not any view is mounted; the view only re-reads on settle. State
machines outlive their spectators.

**Live capability, many-to-one → a subscription registry.**
Editors anywhere register as AI contexts (`ai-context.ts`); the chat
subscribes with `useSyncExternalStore` — three pieces: a module
array, a `Set` of listeners, and a `getSnapshot` returning the SAME
reference until something changes (React bails out on identity).
No React context threading, no prop drilling through the pane tree,
and mounting order stops mattering. The picklist then UNIONS this
registry with workspace state (`openNoteTabPaths`) because only
ACTIVE tabs mount — a registry alone silently misses open-but-
inactive tabs, which read to the owner as "context doesn't work."

## The native drag contract (two hard-won rules)

**1. The drop target must answer within the source's vocabulary.**
A drag source declares `effectAllowed` ('move' for tree rows,
'copyMove' for CodeMirror selections); every `dragover` answers with
`dropEffect`. If the answer is not in the allowed set, Chromium
REFUSES the drop — the drag visibly starts and silently never lands
(the S06c5 bug: we answered 'link' under the tree's 'move').
Synthetic test events skip this matching, so only a real mouse finds
it. `compatibleDropEffect` prefers 'copy' deliberately: a context
ADD never consumes its source, and answering 'move' to a CodeMirror
selection makes CM DELETE the dragged text.

**2. Enrich native drags; don't reimplement them.** The browser
already drags selected text (with CM's blessing). A capture-phase
`dragstart` listener on the editor host ADDS a custom MIME
(`{relPath, from, to}`) to the same DataTransfer — the text payload
still works everywhere else, and our drop targets get the range.
One payload namespace (the tree's MIME) serves tree rows AND tabs,
so the chat's drop handler never grew a special case.

## The routing lesson (S06c7)

When one thing (a transcript) can be shown by many holders (tabs),
"open" must ROUTE, not assign: focus the existing holder, fill an
empty one, otherwise create. Assigning into the current holder
duplicated titles and shuffled identity under the owner — reported,
reasonably, as data loss. The invariant that fixed it: one
conversation = one tab, everywhere, always.

The corollary (S06c9): every DOOR to a multi-holder surface must
respect the holder the user was last in. `openChatPane` still picked
the strip's FIRST chat tab (`tabs.find`) — correct in the one-tab
world it was written in, wrong the day tabs multiplied: coming back
through "Open chat" landed on the oldest conversation, read again as
"my chat disappeared". When a first-match pick is written, it
silently encodes "there is only one" — recheck every such pick when
the one becomes many. The fix shape: active-holder wins, first-match
is only the no-active fallback.

## Exercises

1. Add a third drag source (a search-result row) that drops into the
   chat as context. Count how many files change (it should be two:
   the source's dragstart, nothing on the drop side).
2. Break `getSnapshot` by returning `[...entries]` each call and
   watch React loop. Explain why identity is the contract.
3. Kill the app mid-exchange and reopen: say exactly which of the
   three state kinds survived and why that split is the right one.
