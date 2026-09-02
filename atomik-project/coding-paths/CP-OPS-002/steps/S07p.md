---
type: Atomik Coding Path History
title: 'CP-OPS-002 S07p — Repair: a dead button, a low glyph, and the face that stayed old'
timestamp: 2026-08-31T00:00:00Z
atomik:
  path: CP-OPS-002
  step: S07p
---

# CP-OPS-002 S07p

Rolled verbatim from the live ledger when `ledger-size` fired at S07t. The move
is cut-and-paste, never a summary: the record below reads exactly as it did in
`CP-OPS-002.md`.

### S07p — Repair: a dead button, a low glyph, and the face that stayed old — **COMPLETE**

```cairn-unit
step: S07p
unit: 12
type: repair
verified: cairn-check, cairn-check:test, typecheck, test, build
```

Owner review of S07o's reader. Three defects, one of which the new test suite should
have caught and did not.

- **The back and forward buttons did nothing.** Each pane sets `data-article` on itself
  to say what it is showing, and the click handler looked for `closest('[data-article]')`
  before it looked for the history button. Every click anywhere inside a pane — the
  buttons included — therefore matched the *pane*, re-rendered the article already open,
  and returned before the history branch was ever reached. Fixed by matching the history
  button first and by matching links as anchors (`a[data-article]`) rather than as any
  element carrying the attribute.
- **The test suite could not see it.** Both reader tests dispatched clicks on `<a>`
  elements, where the bug does not appear, and asserted on `disabled` state, which was
  computed correctly the whole time. A test now clicks the buttons themselves and walks
  two steps back and two forward. The lesson is the one this path keeps relearning:
  a predicate that asks about a *declaration* passes while the behaviour it names is
  broken — here, asserting the control was enabled rather than that it moved.
- **The h1 was still wearing the old face.** S07o kept a serif for display titles on the
  theory that it carried research character. It carries whatever the machine has, and on
  a machine with no Source Serif that is a dated fallback — the exact thing the owner
  asked to be rid of. The `--serif` token is gone; one face for prose and display, with
  the display weight and tracking doing the work instead.
- **The arrow glyphs sat on their baseline** inside a fixed-size box. The buttons are
  `inline-flex` and centre both axes.
