---
type: Atomik Module Note
title: 'Module: atomik-desktop — semantic graph'
description: The nodes/edges index consumers: the relations strip, note titles as the graph reads them, and source bundles as graph nodes.
tags: [module, graph, relations, wikilinks, adr-011]
timestamp: 2026-08-14T00:00:00Z
---

# Module: atomik-desktop — semantic graph

> AREA NOTE of [Module: atomik-desktop](./atomik-desktop.md), split out at
> CP-OPS-001 S02 so concurrent lanes append to different files instead of
> colliding in one 1689-line note. The root note keeps what is cross-cutting
> (public contracts, data flow, alternatives, common mistakes, tests, agent
> checklist, dependency facts); this note keeps what THIS AREA owns.

## The relations strip — the graph as a picture (CP-MVP-009 S07)

- Owner ruling that shaped it (2026-08-13, `sessions/
  2026-08-13-cp-mvp-009-s07-form.md`): asked to confirm a backlinks
  PANE, the owner answered "why not directly an ontology in a canvas?"
  The canvas is on the books as a LATER consumer of the same index
  (bedrock 21; the studio brainstorm's "the canvas PROJECTS the
  nodes/edges index"), so S07 shipped its note-scale v0 instead: a
  1-hop mini-graph. The lesson generalizes — when the owner asks for
  the ambitious surface, look for the version of it that reads the
  SAME data through a cheaper renderer, and say what it costs.
- `vault/relations-graph.ts` is PURE and holds all the geometry:
  `neighborhoodOf(index, notePath)` (direction doctrine resolved on
  BOTH ends — `{^label}` flips the reading, not the storage, so an
  edge written here can be an INBOUND relation), dedupe per
  (neighbour, direction, label) with counts, then `layoutRelations`
  → columns + cubic beziers + label midpoints. No simulation, no
  randomness, no stored positions: the same index yields the same
  picture, and the layout is unit-testable without a DOM.
- `vault/RelationsStrip.tsx` only paints it. Chips are HTML over an
  SVG edge layer (not `foreignObject`): that is what lets a node reuse
  the `.link-pill` recipe unforked (36) — `.relations-node` joins the
  recipe's selector list beside `.markdown-body a.link-pill` and
  `.cm-content .link-pill`, so a neighbour wears its kind's colour and
  mask icon for free. Chip widths are FIXED constants so the pure
  layout can compute connector endpoints without measuring the DOM.
- Mounted under BOTH note surfaces (VaultView and ProjectView) inside
  the existing `.vault-content` flex column: the graph belongs to the
  note, not to a view mode, so read and live show the same strip.
  The disclosure bit is TAB state (`relationsOpenOf`, 03) — the graph
  itself is never UI state.
- Two defects the CDP pin caught, both worth remembering: an edge
  label placed at the curve midpoint lands ON the neighbour chip
  unless the column gap is far wider than it looks on paper (56 →
  120 px, plus a surface-coloured `paint-order: stroke` halo behind
  the glyphs); and `clientWidth` INCLUDES padding, so laying a figure
  out at the scroll container's clientWidth overflows it by exactly
  the padding — measure the content box.
- Refresh model (deviation on record): the strip re-reads the index on
  note change and on content-length change. There is no push channel
  from the main-side index, so an edge authored in ANOTHER pane is not
  reflected until the note changes or the content does.

## Titles, not file names (CP-MVP-009 S07b, owner bench round 11)

- Two independent causes hid behind one report ("display first title of
  note pills instead of file name, looks like it is not always the
  case"), and only one of them was in the pills:
- ROOT CAUSE: `firstHeadingOf` was start-anchored (`/^#{1,6} /`) while
  the owner's `ethos.md` opens on `" # L'ethos"` — ONE leading space.
  markdown-it renders that as an H1 (CommonMark allows up to three),
  so the READER showed the title while every title CONSUMER fell back
  to the filename stem. Fixing the rule fixed the strip centre, the
  relation sentences, and the wikilink candidates at once. Lesson: when
  a display rule and the markdown renderer disagree about what counts
  as a heading, the renderer is the spec.
- The pills themselves showed the AUTHORED text, which for every @-menu
  insert is the file's name (`[crédibilité](<crédibilité.md>)`).
  `pillDisplayText` (pure, shared by the read decoration pass and the
  live widget) swaps in the target's title ONLY when the authored text
  names the file — stem or path, case-insensitive, percent-DECODED
  (markdown-it encodes accented hrefs; the first pin still read
  `crédibilité` for exactly that reason). Deliberate wording inside a
  sentence is never rewritten.
- Deviation on record: a bundle contract file keeps its authored text.
  `sources/web/<slug>/source.md` is titled "Source dossier" in the
  index, so swapping would LOSE the slug the owner wrote.
- The relations strip gained a TYPE FILTER in the same round: one pill
  per kind actually present, wearing that kind's own colour (the legend
  IS the control). Filtering is a view act — `filterNeighborhood` is
  pure and the bar keeps the whole counts plus "· N hidden", so a
  filtered strip can never be mistaken for an empty one. Hidden kinds
  ride the same tab-state rung as the disclosure bit.

## Source bundles in the graph (CP-MVP-009 S07d, owner bench round 13)

- The vault index used to hold `.md` files ONLY. Every consequence of
  that showed up in one owner report: a link to `snapshot.mhtml`
  resolved to a path with no node record, so the strip dropped it
  without a word. Nodes are now EVERY vault file — non-markdown ones
  are collected without being read (they carry no edges), which keeps
  the scan cheap and the projection honest. `[[wikilinks]]` still
  resolve to notes only; that filter moved into `wikiCandidatesFor`.
- A file inside a source BUNDLE (a folder holding `source.md`) wears
  the SOURCE's name plus its own `form`. The name comes from the
  dossier's FRONTMATTER `title:` — its body H1 is the contract
  heading "Source dossier", which is why every source used to look
  identical in the graph — falling back to the bundle index's heading,
  then the folder name. Forms: dossier · index · reader text ·
  extracted text · transcript · snapshot · media (a subfolder names
  its own form).
- Because node titles also feed the relation sentences, this fixed
  "cite Source dossier" → "cite Curlew sandpiper - Wikipedia" for
  free. One title rule, every consumer.
- EXTERNAL targets are nodes of the strip (not of the index): an
  http(s) edge has no file to point at, so the URL itself is the node,
  titled host-first (`en.wikipedia.org/wiki/Curlew_sandpiper`) since
  the chip ellipsizes from the right. A source's original URL is its
  provenance — the strip that hides it is lying by omission.
- DOORS: each chip carries `{ door, target }` computed in the pure
  layer — 'note' for markdown, 'web' for a URL, 'source' for a
  non-markdown form (whose target is its BUNDLE's dossier, because
  that is the view where a snapshot is visible). `readNote` rejects
  anything that is not `.md`, so before this a snapshot chip landed on
  "vault: rejected path". A door the host has not wired renders the
  chip disabled rather than clickable-and-broken.
- Bundle chips share one name, so inside a bundle the siblings
  truncated to "Curlew s… | snapshot". A neighbour of the CENTRE's own
  bundle now shows its form alone — the centre already says which
  source you are in.
