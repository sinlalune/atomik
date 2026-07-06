---
type: Atomik Brainstorm Note
title: Does read mode survive live preview?
description: Owner question from MVP-001 follow-up dogfooding — if live is read plus interactivity, what is read still for? Provisional; nothing here is a decision.
tags: [brainstorm, ux, editor, live-preview, read-mode, sources]
timestamp: 2026-07-06T00:00:00Z
---

# Does read mode survive live preview?

Owner question from MVP-001 follow-up dogfooding (2026-07-06), promoted
from chat per 17: "I don't understand why we need a read mode if live is
the same with interactivity? maybe after with web sources? I don't know."

## What read mode uniquely provides today

```text
faithful rendering   markdown-it renders the FILE as any external tool
                     would (soft-break policy, full CommonMark); live
                     preview is an approximation decorated over the raw
                     buffer and will always trail it (tables are styled
                     text, images not rendered yet)
plain-click links    navigation without a modifier — reading flow
                     (live now follows links, but via Ctrl/Cmd+click,
                     because a plain click must place the cursor)
no accidental edits  a review/presentation surface where stray keys
                     cannot dirty the buffer
```

## What live took over

Since the follow-up units: gutter-free writing surface, blocks render
(code highlighting, checkboxes, rules, tables styled), links followable
with Ctrl/Cmd+click, auto-save makes the read/edit round-trip pointless
for editing purposes.

## Current lean (not a decision)

Keep read, cheaply, and let usage decide:

- The rendered pipeline is not extra machinery — Dev Docs and the future
  source dossier views (M4/M5) are the SAME rendered-markdown surface;
  read mode is its one-button expression on notes.
- The owner's own hedge points at M5: web/pdf sources arrive as
  read-only rendered surfaces by design (isolated views, 09/10). When
  those exist, re-ask: if nobody has clicked `read` on a NOTE since
  live landed, fold it (modes become live/source, read stays the
  source-tab default).
- Watch-signal recorded: the mode switch order is read·live·source with
  live default — if read stays unclicked through M3 dogfooding, that is
  the evidence.

## Re-entry point

Revisit at the M5 path opening (web source tab) or earlier if the owner
keeps stumbling over the third mode.
