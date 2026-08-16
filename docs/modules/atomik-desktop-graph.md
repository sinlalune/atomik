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

## Link expansion — the graph as a retrieval stage (CP-MVP-010 S04)

- `shared/retrieval-expand.ts` is PURE and reads only a `GraphIndex`:
  lexical search finds the notes that CONTAIN the words, expansion finds
  the notes the author already said were related. That is the return on
  CP-MVP-009 — an edge nobody retrieves through is decoration.
- `adjacencyOf` walks every RESOLVED internal edge in both directions
  (an edge is stored once and directed; relatedness reads both ways, per
  the direction doctrine). External and unresolved targets are left out:
  expansion exists to find more vault material to read, and neither is a
  file.
- Scoring pins (S01, movable only on S10 evidence): per-hop decay 0.4,
  untyped link 0.8 against a typed edge's 1.0 — a typed edge is a
  stronger statement of relatedness than a bare mention — and per-label
  weights accepted as DATA, so no ontology is ever built in (ADR-011:
  the vocabulary is the owner's).
- Contributions SUM across seeds, so a note reached from several hits
  outranks one reached from a single hit; the strongest single path is
  kept separately as the `via` the packet shows for "why this entry".
  Known limit, recorded rather than guessed at: summing also rewards a
  hub that links everything (a folder `index.md`). If the S10 evaluation
  shows hubs crowding out answers, the fix is a measured degree penalty.

## Incremental index maintenance (CP-MVP-010 S03)

- `patchGraphIndexForSave(index, path, content)` is PURE and returns
  `null` when it refuses: a content save is patchable because the NODE
  SET does not move — the file's own edges are re-parsed against the
  same candidates and its title recomputed — while anything whose effect
  reaches past one file is refused rather than approximated. Refused:
  an unknown path (a create), a bundle contract file (`source.md` /
  `index.md` name their whole bundle, so every sibling's title could
  move), a non-markdown path.
- Edges are re-sorted by (subject, line, col) after a patch, which is
  the order a whole build produces, so a patched index is byte-identical
  to a rebuilt one. Pinned by a test that patches and rebuilds the same
  change and compares — the only assertion that makes patching safe to
  trust.
- Structure changes still invalidate. They are rare, and a wrong graph
  is worse than a slow one.
- The strip now refreshes from the `indexChanged` PUSH (closing-ceremony
  deviation 2, closed): an edge authored in another pane arrives without
  waiting for this note to change. It re-reads rather than filtering on
  the pushed paths — a 1-hop neighbourhood can be reshaped by a note it
  does not yet touch, so filtering would be a guess and the read is one
  cached IPC call.

## What a title is NOT (CP-MVP-010 S07c, owner bench round 2)

- A heading may carry an HTML comment the app wrote for itself — a chat
  turn heading is `## you <!-- sent: system=1042|instruction=21 -->`.
  `firstHeadingOf` now strips comments before returning a title, so
  machine bookkeeping stops reaching the pills, the relations strip and
  the context packet as if it were someone's title.
- Stripping was not enough: what remained was `you`. A chat transcript
  is now titled by its STEM — the file name is the question that started
  the conversation, which names it; its first turn names nobody. Same
  rule in `graph-core` (node titles) and `retrieval-core` (document
  fields), because one title rule serving every consumer is the lesson
  CP-MVP-009 S07b already paid for.

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

## External web edges versus captured web sources (CP-FEEDBACK S05)

- `classifyLinkKind` remains the one shared classifier, but no longer folds two
  different nodes into `web`: a raw `http(s)` target is `web`; any durable form
  under `sources/web/` is `web-source`. Because the index is a rebuildable
  projection, reopening/rebuilding upgrades existing nodes without editing one
  byte of authored Markdown or migrating durable truth.
- The difference is presentation/classification, not evidence semantics. A raw
  URL still uses the web door; a local dossier/form still uses its existing
  note/source door. Relations nodes and kind filters inherit the additive kind
  through their unforked `link-pill--${kind}` recipe.
- The renderer deliberately makes the cue redundant: external web keeps the
  blue globe; a capture gets its own light/dark green token and saved-document
  icon. Read anchors and live widgets also share `linkKindDescription`, exposing
  “External web link” versus “Captured web source” as accessible description
  (and in live's hover title), so colour is never the only distinction.
