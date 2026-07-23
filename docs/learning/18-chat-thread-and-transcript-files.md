---
type: Atomik Learning Note
title: 'Learning: a chat surface without a chat backend — threads on one contract, transcripts as files'
description: Beginner-first walkthrough of CP-MVP-008 S06 — how multi-turn chat rides the existing operation contract as a validated thread, why transcripts are ordinary vault notes born at the first message, and how a pane-chrome column reaches the editor through a registered surface.
tags: [learning]
timestamp: 2026-07-23T00:00:00Z
---

# Learning: a chat surface without a chat backend — threads on one contract, transcripts as files

*Covers CP-MVP-008 S06 (2026-07-23). First-use rule (17): the
conversational AI surface is a first mobilization.*

## Who this is for and what you can do afterwards

You have seen chat UIs backed by a sessions table, a message store,
and a streaming socket. Atomik's chat has none of those, on purpose.
Afterwards you can explain why "add chat" here meant roughly four new
ideas rather than a subsystem: a `thread` field, a file convention, a
pane column, and a registered surface — and why each landed where it
did.

## The four ideas, from zero

**A thread is just prior messages on the same request.** Chat
completions APIs are stateless: "memory" is the caller resending
history in the `messages` array. So multi-turn needed no new channel
and no session state in main — `AiOperation` gained an optional
`thread: {role: 'user'|'assistant', content}[]`, validated in main
like every other field (≤24 turns, ≤8k chars each; `system` is NOT a
legal thread role — history must not be able to smuggle behavior
past the composed system prompt). `buildMessages` replays the thread
verbatim between the system message and the live turn; only the live
turn composes through the layered template. The mock stamps
`(turn N)` into its answer, which is what makes multi-turn provable
offline in tests and smoke.

**A transcript is a note, born at the first message.** No hidden
database (04): a chat file is `chats/YYYY-MM-DD-<slug>.md` with
`type: Atomik Chat` frontmatter, and every turn is a `## you` /
`## atomik` section appended through the ordinary read→write verbs
(mtime handshake included). Two consequences worth internalizing:
the file is BORN at the first send — opening the panel writes
nothing (no writes on open); and because it is an editable note, the
parser is deliberately lenient — preamble ignored, unknown headings
kept inside turns, empty turns dropped. `createNote` is exclusive,
so name collisions retry with `-2`, `-3` instead of clobbering. The
user's turn is written BEFORE the provider call: a cancelled or
failed run still keeps what was asked.

**A pane column is state first, component second.** The chat column
copies the pane-tree pattern exactly: the leaf carries a validated
flat string map (`chat: {on, w, file}`), the pane grid gains a
column whose width comes from that map, and — the migration trick —
an ABSENT map simply reads as hidden, so every pre-S06 saved layout
is already valid with zero migration code. When "add a field" can be
phrased as "absent means the old behavior", the migration writes
itself.

**A registered surface instead of prop drilling.** The chat column
is pane chrome; the editor is inside a tab. Rather than lifting
editor internals up the tree, the mounted editor REGISTERS a
`PaneAiSurface` (notePath + getSelection/getDoc/insert) with its
pane — the same bridge shape the S07d dirty-guard proved — and the
chat reads it AT SEND TIME through a ref. Insert goes through that
surface into the editor buffer + save, i.e. the exact path every
accepted AI patch takes; the chat never gains a write path of its
own.

## Traps hit (so you don't)

- **The prop echo race.** The panel creates the chat file, patches
  pane state, and the new `file` prop echoes back while the answer
  is still in flight; a naive "reload transcript on file change"
  effect would clobber the local turn list mid-run. Guard: remember
  what you created (`loadedRef`) and skip the reload when the prop
  merely catches up.
- **Closures hold the old file.** The answer's append runs in the
  same closure that created the file — reading the path from props
  there returns null. The live path lives in a ref the create-step
  updates immediately.

## Exercises

1. Add a `## note` role to the transcript convention and watch which
   layers refuse it (parser, thread mapper, main validation) — count
   how many places one vocabulary word lives.
2. Hand-edit a transcript file mid-chat (add a heading inside a
   turn, delete an answer) and send again; explain what the thread
   contains now and why that is correct behavior for a file-first
   chat.
