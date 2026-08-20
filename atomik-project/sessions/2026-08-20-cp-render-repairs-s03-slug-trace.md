---
type: Atomik Session Record
title: CP-RENDER-REPAIRS S03 — the slug fix, and the trace that says it was a paste
timestamp: 2026-08-20T00:00:00Z
tags: [chat, naming, trace, reproduction, negative-result]
path: CP-RENDER-REPAIRS
branch: path/cp-render-repairs
---

# S03 — chatSlug, and where the stamp came from

The owner asked for both halves: fix the slug, AND try to reproduce the leak,
because *an unreproduced trigger is not a fixed one*. This records the second
half, including its negative result.

## The artifact

```text
chats/2026-08-20/you-!---sent-system=2120-instruction=828.md
```

and inside it, two headings where there should be one:

```markdown
## you

## you <!-- sent: system=2646|instruction=904:your message|template=25 -->

Generate a NOTE (AI note / new-note destination) for each.
```

Note the mismatch: the NAME carries `2120/828`, the FILE carries `2646/904`.
The name was fixed at creation from an earlier send's stamp.

## The mechanism, proven

`newChatFileContent(engine, now, text)` emits `## you\n\n{text}`. If `text`
already begins with a stamped heading, the output is exactly the file above —
an empty `## you`, then the pasted heading, then the body. The later
`withSentMetaOnLastYou` re-stamps the LAST you-heading, which is the pasted
one, which is why its numbers moved on while the filename's did not.

So the question is only: what put a stamped heading into `text`?

## The trace — no in-app path does

```text
send   -> runExchange(input.trim(), false)   ChatView.tsx:1063
          text = the COMPOSER's contents. Only typing or pasting reaches it.

retry  -> runExchange(last.text, true)       ChatView.tsx:1073
          alreadyPersisted = true, so persistTurn never creates a file;
          and `last.text` cannot contain the heading anyway, because
          parseChatTurns CONSUMES `## you <!-- … -->` as a heading line and
          parses its comments into turn METADATA, never into turn text.
```

Both callers are accounted for. There is no in-app path that composes a
stamped heading into the text that names a NEW chat file.

**Negative result, recorded as such: it was a paste.** The owner's split view
had the chat SOURCE open in the left pane at the time, which is the obvious
place to copy that exact string from.

## What was fixed anyway

`chatSlug` now strips HTML comments as a unit before anything else, the same
treatment `graph-core.ts:109` already gives a heading before it becomes a title
(CP-MVP-010 S07c). One defect class, now fixed at both layers. Correct however
the stamp reaches the text — which is the point of fixing it rather than
relying on the trace above staying true.

## Deliberately not done

A guard that strips a leading `## you` heading from a pasted first message.
That would silently rewrite what the user pasted, and pasting a transcript
fragment into a chat is a legitimate thing to do. The name is now sane either
way; the double heading is cosmetic and honest.
