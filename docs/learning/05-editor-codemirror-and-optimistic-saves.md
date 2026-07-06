---
type: Atomik Learning Note
title: 'Learning: the editor — CodeMirror, dirty state, and optimistic saves'
description: Beginner-first walkthrough of S07 — CodeMirror 6 architecture, imperative libraries inside React, and mtime-based conflict detection.
tags: [learning, editor, codemirror, react, concurrency, saves]
timestamp: 2026-07-06T00:00:00Z
---

# Learning: the editor — CodeMirror, dirty state, and optimistic saves

**Who this is for.** You read notes [02](./02-react-state-panes-and-disposable-persistence.md)
and [03](./03-vault-io-and-file-trust.md). After this one you can read
`renderer/src/editor/EditorPane.tsx` and the S07 changes to
`electron-main/vault.ts`, and explain every safety net between your
keystrokes and the bytes on disk.

**Scope.** CP-MVP-001 S07: CodeMirror 6 editing over vault notes, explicit
save, and conflict detection.

## 1. CodeMirror 6 in one idea — you already know this pattern

CodeMirror 6 is not "a textarea with colors". It is an immutable-state
system:

```text
EditorState   an immutable value: the document, selection, history
EditorView    the DOM face rendering one state
transaction   a description of change, applied via view.dispatch(...)
extension     a composable unit of behavior (markdown(), keymaps,
              line wrapping, the update listener, the dark theme)
```

Sound familiar? It is exactly the architecture of our workspace model
(note 02): immutable state, changes as dispatched operations, views
re-rendering from values. The pattern you learned on 60 lines of pane code
is the same one a world-class editor uses at scale — that is why the
concepts are worth naming.

Our extension stack (`EditorPane.tsx`): `basicSetup` (line numbers,
history, fold gutter…), `markdown()` (syntax), `oneDark` when the OS
prefers dark, line wrapping, a `Mod-s` keymap, and an update listener that
recomputes the dirty flag on every document change.

## 2. An imperative library inside React, done right

React owns its virtual DOM; CodeMirror owns its own DOM. Two owners, one
node — the S03 innerHTML lesson taught us how that ends. The rules used
here:

```text
the EditorView lives in a REF, created in a mount-only effect
  (recreating it per render would destroy selection, undo history,
  and scroll on every keystroke)
a different note = a different component instance, via key={note.relPath}
  (mount/unmount, never "reuse the view for another file")
fresh closures reach the view through refs (saveRef, markDirtyRef)
  so the mount-only effect never captures stale functions
```

That third one is subtle and worth re-reading in the code: the keymap was
built once at mount, but `Ctrl+S` must always run the LATEST save logic —
so the keymap calls `saveRef.current()`, and an effect keeps the ref
pointed at the newest callback.

## 3. What you edit is the file — all of it

The buffer shows the raw Markdown **including frontmatter**. No template,
no hidden fields, no "smart" normalization on save: the string in the
buffer is exactly the string handed to `writeNote`, which writes it
byte-for-byte through the atomic temp+rename path (notes 03/§4–5). Chain:

```text
keystrokes -> EditorState -> doc.toString() -> writeNote(...)
           -> validate -> temp file -> rename -> your file, your bytes
```

One save = one clean Git diff. The editor adds nothing and removes
nothing you didn't type (11, 27).

## 4. Save policy, dirty state, and the three data-loss nets

Saving started explicit-only at S07 (the thin honest start). On MVP-001
owner feedback, **auto-save became the default policy**, layered ON TOP of
the same machinery — the button and `Ctrl+S` still work, and a `manual`
toggle in the note bar restores the strict behavior (the preference is an
app-wide workspace setting, i.e. disposable UI state).

Auto mode has three moments: a **debounced save** ~800 ms after you stop
typing, a **flush on leave** when the editor unmounts (switching notes or
closing the tab), and **save-then-switch** when you click Read. Because it
reuses the ordinary save path, it inherits every guarantee below — and it
deliberately NEVER forces: when a conflict banner is up, auto-save pauses
until a human picks reload or overwrite. Concept: an automation must not
escalate its own privileges over the manual path it automates.

Three nets stop silent loss:

```text
dirty flag      buffer text !== last saved text -> the ● marker and an
                enabled Save button
navigation guard (manual mode) clicking another note with a dirty buffer
                asks before discarding; auto mode navigates freely because
                the unmount flush carries the buffer to disk instead
conflict check  saving cannot silently overwrite a file that changed on
                disk since you read it (next section)
```

Honest residual window in auto mode: a hard app kill inside the debounce
(≤ 800 ms of typing) or a flush that hits a conflict is lost — the same
class of loss manual mode accepts when you confirm a discard.

## 5. Optimistic concurrency — the mtime handshake

Remember the two-writers question from the S05 discussion (you and an
agent session editing the same repo)? This is the answer's first half.

`readNote` returns `mtimeMs` — the file's modification time. The editor
keeps it and sends it back with every save. In main, `writeNote` compares:
same mtime → write and return the NEW mtime (the handshake chains save
after save); different mtime → refuse with a conflict error, and the
editor shows a banner: **Reload from disk** or **Overwrite anyway**.

This strategy is called **optimistic locking**: instead of locking files
(pessimistic, complex, deadlock-prone), everyone works freely and the
conflict is detected at write time. It fits our world exactly — conflicts
are rare, and when they happen the human should decide.

The unit test (`vault.test.ts`) stages a real one: read, modify the file
out-of-band (with `utimesSync` forcing a distinct mtime — filesystem
timestamps can be coarse; determinism in tests matters), then prove the
stale save throws, the fresh save passes, and an omitted mtime still
writes unconditionally (that is the "Overwrite anyway" path).

## 6. Try it yourself

1. **The clean-diff promise.** Open a Git-tracked note, edit one line in
   the app, `Ctrl+S`, then `git diff` in the terminal: one file, your
   line, nothing else.
2. **Provoke a real conflict.** Open a note in the editor. In a terminal:
   `echo "changed elsewhere" >> the-note.md`. Type something in the app
   and save → the conflict banner appears. Try **Reload from disk**, then
   redo your edit and save.
3. **Feel the dirty guard.** Type without saving, click another note in
   the tree → the confirmation stops you.
4. **Watch the mode persist.** Switch a tab to Edit, restart the app —
   the tab comes back in Edit mode on the same note (workspace state,
   note 02).

## 7. Vocabulary you now own

```text
transaction        a change applied to immutable editor state
extension          composable editor behavior unit
keymap             key bindings as an extension (Mod-s = Ctrl/Cmd+S)
dirty              buffer differs from the last saved content
optimistic locking detect conflicts at write time instead of locking
mtime handshake    save sends the mtime it read; gets the new one back
remount-by-key     new resource = new component instance, not a reuse
```

## 8. What arrives next

**S08 — the AI patch loop**, the heart of the product: select text, run a
(mocked) AI operation, receive a structured response bundle, preview the
patch, accept/edit/reject. Everything built so far converges there: the
editor's clean diffs become the review surface, `writeNote`'s guarantees
make patches trustworthy, and the response bundle contract (06) meets its
first implementation.
