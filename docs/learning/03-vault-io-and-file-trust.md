---
type: Atomik Learning Note
title: 'Learning: vault IO — writing knowledge without betraying it'
description: Beginner-first walkthrough of the S05 vault — native dialogs as consent, edit vs exclusive create, byte fidelity, and no-rewrite-on-open.
tags: [learning, vault, filesystem, git, atomic-writes, security]
timestamp: 2026-07-06T00:00:00Z
---

# Learning: vault IO — writing knowledge without betraying it

**Who this is for.** You read notes [01](./01-electron-shell-from-zero.md)
and [02](./02-react-state-panes-and-disposable-persistence.md). After this
note you should understand `electron-main/vault.ts` end to end — and more
importantly, the promises it keeps.

**Scope.** CP-MVP-001 S05: open a vault, list/read/create/write Markdown.
This is the first step where the app touches your *knowledge*, so almost
every line is about trust.

## 1. A vault is a folder — and the app is a guest

The file-first model (04) says: your knowledge lives as plain Markdown in a
plain folder, useful with or without atomik — greppable, syncable, editable
in anything, versioned by ordinary Git. So the vault module treats itself
as a **guest in someone else's house**: it reads what it's shown, writes
only what you asked, and moves nothing else. Every promise below is a form
of that stance.

## 2. Choosing the vault: a consent boundary, not a text field

The renderer cannot type a path and get access. `openVault` shows a
**native folder picker** (`dialog.showOpenDialog`) owned by the main
process; access exists only after the user picks a folder. The renderer
then works exclusively in vault-relative paths, validated like the dev-docs
ones (note 01 §5) plus a denylist: `.git`, `.atomik`, `node_modules`, and
any hidden dot-directory are neither listed nor addressable. Symbolic links
are not followed at all — a link pointing outside the vault is invisible to
the tree AND unreadable if addressed directly (`tests/vault.test.ts` proves
both).

Concept: **user-mediated capability**. The OS dialog converts a human
gesture into a scoped power; no gesture, no power. The remembered vault
(`.atomik/local-settings.json`) is written by main only — there is
deliberately NO IPC channel for it, because the renderer has no business
naming filesystem roots.

## 3. Edit and create are different verbs

```text
writeNote(relPath, content)   edit semantics: target MUST already exist
createNote(relPath, content?) create semantics: target must NOT exist
```

Why split them? Because "save" silently creating files and "new note"
silently overwriting files are both data-loss bugs waiting to happen.
`createNote` uses the filesystem's **exclusive-create flag** (`wx`): the OS
itself refuses if the file exists. That is stronger than checking first
and writing after — between a check and a write, the world can change (the
classic **TOCTOU** race, time-of-check vs time-of-use); `wx` makes check
and write one atomic act.

Writes reuse the S04 pattern: temp file + rename (note 02 §5), so a crash
never leaves half a note.

## 4. Byte fidelity: your file, your bytes

`writeNote` writes **exactly** the string it was given. No trailing-newline
"fix", no whitespace cleanup, no frontmatter reordering, no timestamp
touch. The test locks this with content that deliberately lacks a final
newline, and the smoke check verified it through the whole app with `cmp`
(byte-for-byte comparison).

Why so strict? Bedrock 27: **one edit must produce one understandable Git
diff**. Every "helpful" normalization the app performed would show up in
your diffs as noise you didn't write — and the diff is where you review
what AI proposes later (S08). An app that edits your bytes uninvited is
an app whose diffs you can't trust.

## 5. No rewrite on open — proven, not promised

The strongest promise: **opening atomik mutates nothing**. There is simply
no code path that writes during open/list/read — writes happen only inside
the two explicit verbs. We proved it mechanically: seed a Git-tracked
vault, launch the app, let it restore the workspace and render a note,
then run `git status` in the vault → zero changes.

Patterns that would break this promise (and that reviews must reject):
updating a "last opened" field inside the note, normalizing files while
indexing, rewriting frontmatter on render. UI state belongs in `.atomik/`
(note 02 §4), never in your files.

## 6. Small vocabulary of file trust

```text
mtimeMs            file modification time; readNote returns it so S07 can
                   detect "changed on disk since you opened it" conflicts
exclusive create   open with wx: fails if the file exists, atomically
TOCTOU             time-of-check/time-of-use race; why wx beats check+write
symlink            a file pointing at another path; vault policy: ignored
denylist           segments never served: .git, .atomik, node_modules, .*
byte fidelity      write exactly what was given; no normalization
no-rewrite-on-open reading/rendering never writes
```

## 7. Try it yourself

1. **Adopt a real folder.** `npm run dev`, +vault, "Open vault folder…" —
   pick any folder of Markdown you already have (it is safe: the app
   cannot rewrite on open, and you can `git status` to hold it to that).
2. **Create and diff.** Make the folder a Git repo (`git init && git add
   -A && git commit -m seed`), create a note in the app, then `git status`
   — exactly one untracked file, nothing else moved.
3. **Watch the verbs refuse.** In DevTools:
   `await window.atomik.createNote('welcome.md')` on an existing note →
   rejected (wx). `await window.atomik.writeNote('ghost.md', 'x')` →
   rejected (edit needs an existing target).
4. **Probe the boundary.** `await window.atomik.readNote('.git/config.md')`
   and `('../outside.md')` → both rejected in main, whatever the renderer
   says.
5. **Verify no-rewrite yourself.** Close the app, `git status` clean, open
   the app, browse notes, `git status` again — still clean.

## 8. What arrives next

- **S06 project bundles** — `index.md` / `log.md` conventions and the
  project manifest become code on top of this vault layer.
- **S07 editor** — CodeMirror; `mtimeMs` earns its keep (conflict
  detection), and explicit save / safe autosave rules arrive.
- **S08 AI patch loop** — AI proposals become reviewable diffs against
  vault files; every promise in this note is what makes those diffs
  trustworthy.
