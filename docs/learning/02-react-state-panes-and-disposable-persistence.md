---
type: Atomik Learning Note
title: 'Learning: React state, the pane tree, and disposable persistence'
description: Beginner-first walkthrough of state management, immutability, recursive layouts, and atomic writes behind the S04 workspace.
tags: [learning, react, state, zustand, immutability, persistence, atomic-writes]
timestamp: 2026-07-06T00:00:00Z
---

# Learning: React state, the pane tree, and disposable persistence

**Who this is for.** You read [01 — the Electron shell](./01-electron-shell-from-zero.md)
and can follow an IPC call. After this note you should understand every file
under `renderer/src/workspace/` and `electron-main/workspace-state.ts`, and
be able to add a new pane operation yourself.

**Scope.** CP-MVP-001 S04: tabs, split panes, and the workspace state saved
under `.atomik/`. Contract note: [Module: atomik-desktop](../modules/atomik-desktop.md).

## 1. The problem: many components, one layout truth

React's basic tool is `useState`: a value owned by ONE component. That was
enough for S03 — the Dev Docs page lived inside the DevDocs component. But a
pane layout is different: the tab strip, the split dividers, the content
area, and the persistence code all need the SAME state, and clicking a
button deep in one pane must update it. Passing values down through six
levels of props ("prop drilling") gets unmanageable fast.

The standard answer is a **store**: one object outside the component tree
that holds the shared state; components **subscribe** to it and re-render
when it changes. Ours is `renderer/src/workspace/store.ts`, built with
**zustand** (the bedrock's pick in `12_12-electron-mvp.md`) — about twenty
lines: a `state` field, a `load()` that restores from disk, and a
`dispatch(operation)` that applies a change and schedules a save.

## 2. The design split: pure model, thin store

Look at how little `store.ts` does. Everything interesting lives in
`model.ts` as **pure functions**:

```text
splitPane(state, paneId, direction)  -> new state
closeTab(state, paneId, tabId)       -> new state
setFraction(state, splitId, 0.42)    -> new state
```

A pure function reads its inputs, returns a new value, and touches nothing
else — no globals, no disk, no DOM. Two paybacks:

- **Testability.** `tests/workspace-model.test.ts` runs 12 scenarios
  (splits, collapses, focus repair...) in milliseconds, no browser, no
  Electron. If layout logic had lived inside React components, testing it
  would need a rendered UI.
- **Immutability.** Each operation returns a NEW state object instead of
  modifying the old one. React detects changes by identity (`old !== new`),
  so returning a new object is what makes the UI re-render — and returning
  the SAME object is a free "nothing changed" signal (our operations do
  exactly that for no-ops; the store then skips persisting).

Concept names to keep: **single source of truth** (one state object, every
view derives from it), **unidirectional data flow** (click → dispatch →
new state → re-render; never "the UI edits itself").

## 3. A layout is a recursive tree

A pane arrangement is naturally recursive: a pane is either a **leaf**
(tabs) or a **split** holding two more panes. `shared/ipc-contract.ts`:

```text
PaneNode = leaf  { id, tabs[], activeTabId }
         | split { id, direction, fraction, first: PaneNode, second: PaneNode }
```

Recursive data wants recursive code. Two patterns repeat in `model.ts`:

- `mapNode(node, fn)` — rebuild the tree, replacing the one node `fn`
  changes, reusing every untouched branch (**structural sharing**: cheap
  copies because unchanged subtrees are shared, not cloned).
- `closeTab`'s `remove()` — returns `null` for "this node disappeared", and
  the parent split **collapses** into the surviving sibling. One rule keeps
  the system sane: the root leaf may be empty, so the tree never vanishes.

The renderer mirrors the recursion: `Workspace.tsx`'s `PaneNodeView` renders
a leaf directly or renders itself twice around a divider. Recursive data,
recursive component.

## 4. Disposable state — the concept that decides where things live

The bedrock's rule (03): **project bundles are durable knowledge; workspace
layout is recoverable UI state**. Concretely:

```text
.atomik/local-workspace.json   your pane arrangement. Delete it: the app
                               starts with the default layout. Nothing of
                               value is lost. Ignored by Git.
notes, docs, sources           knowledge. Never stored in workspace state.
```

This is why `readWorkspaceState` in `electron-main/workspace-state.ts`
returns `null` for a missing, corrupt, oversized, or invalid file instead
of crashing — the correct recovery from broken UI state is "start fresh".
And it is why the biggest mistake possible here would be smuggling note
content into a tab's `params`: state that must never hold knowledge.

Validation still matters: the payload arrives from the renderer, which is
the untrusted side of the trust boundary you met in note 01. So main
enforces structure and hard caps (depth ≤ 16, ≤ 64 tabs per leaf, string
length limits, 256 KB total) and fixes the file path itself — the renderer
never names a path.

## 5. Atomic writes: temp file + rename

Naive save: `writeFile('local-workspace.json', json)`. If the app dies
mid-write (crash, power cut), the file is left HALF-written — corrupt. For
a disposable layout that's an annoyance; for your future notes (S05) it
would be data loss.

The classic fix, in `writeWorkspaceState`:

```text
1. write the full content to  local-workspace.json.tmp-<pid>
2. rename it onto             local-workspace.json
```

On a POSIX filesystem, `rename` within one directory is **atomic**: readers
see either the complete old file or the complete new file, never a mix. The
test suite proves the roundtrip and that no `.tmp-` residue survives. This
exact pattern — validate, write temp, rename — is what bedrock 27 means by
"atomic, Git-friendly writes", and S05's vault will reuse it verbatim.

One more guard: saves are **debounced** (`store.ts`, 500 ms) — dragging a
divider fires dozens of state changes per second, and debouncing collapses
them into one disk write after the movement settles.

## 6. Component wiring worth understanding

- `TabContent` keys DevDocs by `tab.id`, so each dev-docs tab is its own
  instance with its own current page, persisted per tab via
  `updateTabParams` (that is why your open pages restore after a restart).
- DevDocs became "controlled-ish": it accepts a `docPath` prop and reports
  navigation up through `onDocOpened`. First version of that effect had a
  classic bug we caught in design: if the prop pointed at a nonexistent
  doc, load-failure → state unchanged → effect fires again → infinite
  retry. The fix is a `lastRequested` ref: never re-request the same
  target. Remember the pattern: **an effect that reacts to a prop must not
  re-fire on its own failure.**
- The divider drag uses **pointer capture** (`setPointerCapture`): once you
  press the divider, it keeps receiving move events even when the cursor
  leaves it. Fraction updates flow through the same dispatch as everything
  else — no special path for drags.

## 7. Try it yourself

1. **Trash the state on purpose.** Quit the app, write `not json` into
   `.atomik/local-workspace.json`, relaunch — default layout, no crash.
   That's the disposable-state contract working.
2. **Watch validation defend the disk.** In DevTools
   (Ctrl+Shift+I): `await window.atomik.writeWorkspaceState({ version: 1 })`
   → rejected. Then paste a valid state (copy the JSON file) with
   `"fraction": 0.05` → rejected (caps).
3. **See structural sharing.** In `tests/workspace-model.test.ts`, the
   split test asserts `root.first` IS the original leaf (`toBe`, identity).
   Break `splitPane` by cloning `node` (`{ ...node }`) — the test fails on
   identity while looking "the same". That's what identity-based change
   detection means.
4. **Resize, restart, verify.** Drag a divider, wait a second, restart:
   layout intact. Then delete `.atomik/` entirely: fresh default, nothing
   of value gone.
5. **Stretch: write `moveTabToPane` test-first.** Spec: remove tab from
   source leaf (with collapse rules), append to target leaf, activate it.
   Write the test before the code; the recursion patterns in `closeTab` and
   `addTab` are your building blocks. This is exactly how the next agent
   would do it.

## 8. Vocabulary you now own

```text
store / selector      shared state outside the tree; a subscription to a slice
prop drilling         passing state down many levels by hand (the smell)
pure function         inputs -> output, no side effects
immutability          change = new object; old value never mutated
structural sharing    new tree reuses untouched branches
unidirectional flow   event -> dispatch -> new state -> render
recursion             a function/type defined in terms of itself
disposable state      recoverable UI arrangement; never knowledge
atomic write          temp + rename; readers never see a half file
debounce              collapse a burst of events into one action
pointer capture       a drag keeps its events even off the element
controlled component  behavior driven by props, reporting changes up
```

## 9. What arrives next

- **S05 vault IO** — the atomic-write pattern graduates from disposable
  layout to your actual Markdown knowledge, plus a stricter validated
  channel family and "no rewrite on open" (27).
- **S06 project bundles** — `index.md` / `log.md` conventions become code.
- **S07 editor** — CodeMirror enters; the workspace grows its first
  editable view.
