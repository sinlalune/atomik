---
type: Atomik Coding Path
title: Semantic graph foundation — inline typed edges, link pills everywhere, rebuildable nodes/edges index, typed backlinks (M8 front half)
description: The vault's links become the visible, typed semantic knowledge graph — ADR-011's inline grammar parsed and rendered on every surface, type pills with edge authoring on link pills, an owner-vocabulary label registry with autocomplete, a rebuildable nodes/edges index, and typed backlinks — so the definitive vault accumulates real edges from day one, before the retrieval and Wikidata slices build on the same tables.
tags: [coding-path, m8, semantic-graph, wikilinks, typed-edges, pills, backlinks, index, adr-011]
timestamp: 2026-08-04T00:00:00Z
atomik:
  id: CP-MVP-009
  status: active
  accepted: 2026-08-04
  current_step: S01
  base_commit: fba010d
---

# Goal

Bedrock 20 (recast 2026-08-04) is law: notes are concepts and the
note-to-note link graph IS the semantic knowledge graph. ADR-011 fixes
the serialization: `[[target]]{label}` inline decoration, reverse
`{^label}`, kebab labels, immediate adjacency, same decoration after
standard md links. But nothing renders a wikilink today, no surface
shows an edge, no index exists, and the definitive vault (started at
008's close, Q1 record) is already accumulating `[[links]]` that die
as plain text.

This path builds the FOUNDATION half confirmed at the 008 closing
ceremony (owner vision 2026-07-21, amended by brainstorm session A
2026-08-03, confirmed 2026-08-04):

1. **Grammar** — one parser for ADR-011's grammar shared by rendering
   (markdown-it) and editing (Lezer/CM6), collision suite from the
   session-A evidence.
2. **Pills everywhere** — every rendered link (wikilink or md link)
   carries a type-colored pill + icon per node type (note, folder,
   chat, prompt, PDF, web, anchor …); a typed edge shows its label
   chip. Owner UI vision verbatim: "every links … has a color pill
   depending on its type and a little icon."
3. **Edge authoring on the pill** — the little "+" after the link
   label proposes adding an edge; input widens the pill temporarily;
   labels autocomplete from the owner's OWN language (registry,
   kebab-normalized); ⇄ flips direction (`{^label}`); edit and delete
   complete the lifecycle (bedrock 03 rule) — each gesture one clean
   diff.
4. **Rebuildable nodes/edges index** — built main-side from vault
   files alone, incrementally maintained by the write verbs, gone =
   rebuilt identical; label registry with counts; broken targets are
   diagnostics, never silent repair or auto-create.
5. **Typed backlinks** — the backlink pane renders inbound edges with
   the label's inverse reading (fixing untyped-backlink tools);
   clicks route through revealNote.

The BACK half — retrieval over the graph (FTS5 + link expansion,
context packets, M8 proper) and the Wikidata slice joining the same
nodes/edges tables (M10 shape, verification layer B) — is the NEXT
path, per the thinness rule. This path lays the tables they join.

Consumers on record (no scope change here): the future STUDIO
(brainstorm 2026-08-04, register note) reads the nodes/edges index as
a projection for its graph layer and reuses the pill edge-lifecycle
discipline and write path for canvas edge-drawing — design the index
read contract as a clean projection, nothing more.

# Definition of done

- ADR-011 grammar parses and renders on every surface that renders a
  note (read view, AI panel blocks, inline widget, chat transcripts,
  tab simulation — the note-markdown factory is the single door);
  the collision suite (escaped-HTML comment case, pandoc-attr case,
  adjacency/whitespace, kebab validation, `{^label}`) is green.
- Every rendered link shows its type pill + icon; typed edges show
  the label chip; unresolved targets render as a visible diagnostic
  style (no silent auto-create, no auto-repair).
- Edge lifecycle complete in the same path: add (+ on the pill,
  widening input), edit label, flip direction, delete — each gesture
  lands one clean, previewable diff in the note's markdown.
- Label autocomplete offers the owner's previously used labels
  (registry with counts, rebuildable `.atomik/` artifact) and
  kebab-normalizes free input; `[[` autocompletes note titles.
- Chat surfaces render pills WITHOUT the "+" (per-surface authoring
  capability flag; owner: "think later" for edge birth from chat).
- The nodes/edges index is rebuildable from files alone: delete the
  index artifact → rebuild produces identical content (round-trip
  test, 03 lifecycle rule); no writes on app open; write verbs keep
  it incremental.
- Rename/relocate (27 tracked refactor) rewrites wikilinks with the
  same preview/rollback machinery as md links; dirty-editor guard
  holds.
- Typed backlinks pane per note shows inbound edges with inverse
  label rendering; navigation via revealNote/revealSource contracts.
- Direction doctrine holds everywhere: stored once, directed,
  subject = the authoring note; symmetry/inverse live on the LABEL.
- Module notes, learning notes (17 first-use rule), log.md, and this
  ledger updated at every step; tests/typecheck/build/smoke green at
  every step; gates run bare (24).

# Documentation coverage

## Required

- 20-relations-future (recast 2026-08-04) — the doctrine this path implements
- ADR-011 — the grammar spec and collision evidence
- 04-file-first-model — links are content; no hidden DB; index = projection
- 11-markdown-page-model — page/frontmatter model the grammar lives in
- 36-ui-design-system — pill/chip recipes, tokens, themes, accessibility floors
- 33-retrieval-local-execution-cost — rebuildable-projection discipline; the ladder the back half will climb
- 26-okf-agent-context — the 'link' ladder stage these edges feed
- 27-git-compatibility — rename refactor, one-gesture-one-diff
- 15-maintainability — zero-dep bias (hand-made grammar rules, no parser dependency)
- 03-workspace-tabs — pane-state precedent for the backlink pane + derived-artifact lifecycle rule
- 17-self-evolving-docs · 18-roadmap (M8) · 22-agent-handoff · 24-doc-templates · 35-coding-path-execution-state — standing execution law
- atomik-project/brainstorm/2026-08-03-brainstorm-session.md — owner rulings verbatim (UI vision, direction, vocabulary, pills scope)

## Conditional

- 13-electron-security + 12-electron-mvp — before ANY new IPC channel (index rebuild/query verbs)
- 14-app-kernels — if the index earns a new main-side module seat
- 05-resource-selection-model — if edge authoring hooks into selections
- 06-ai-patch-pipeline + 02-learning-loop — if AI edge suggestions land inside this path (link proposals, 20 §How links are born)
- 28-truth-evidence-model + 31-truth-lens-ux — ONLY at overlay touchpoints (naming the optional overlay in UI copy); no overlay work here
- 25-use-cases — consult when a scoping doubt needs pressure-testing
- 00-orientation + 01-workbench-first — re-read if any step seems to bend the constitution

## Deliberately excluded

- 07/08/09/10 (source adapters, capture, web, PDF tabs) — pills render over existing link types; adapters and tabs unchanged
- 16-dev-docs-tab — untouched
- 19-dsl-future — block relation DSL retired by ADR-011; DSL out of scope
- 21-canvas-future — graph visualization is a later consumer of the index, not this path
- 29-verification-grounding-router · 30-public-knowledge-dictionary — the Wikidata/verification slice is the NEXT path (back half)
- 32-truth-investigation-record — M6 territory; the overlay stays optional and absent
- 34-local-execution-investigation-record — no local model work in this path
- 23-references — no new external corpus decisions expected

# Execution

- [x] S01 Bootstrap: read Required docs; verify ledger vs repo reality;
      record the opening-check amendments (below) and the S01 pins —
      grammar constants from ADR-011, node-type → pill taxonomy
      (note, folder, chat, prompt, pdf, pdf-anchor, web, transcript,
      built-in), index storage decision (opening-check Q4), edge
      record shape ({subject, label, object, direction, position})
      — docs-only step, DONE 2026-08-04 (pins in the checkpoint).
      INDEX STORAGE DECIDED at the opening check
      (2026-08-04, owner): JSON sidecar — main-side scan builds the
      in-memory graph, persisted as a rebuildable `.atomik/` JSON
      cache, zero new dependency (15); SQLite arrives with the
      retrieval/Wikidata path and the index migrates then
      (rebuildable = free migration).
- [x] S02 Grammar core (DONE 2026-08-04): `shared/edge-grammar.ts`
      NEW — pure, dependency-free; matchWikilinkAt /
      matchDecorationAt / matchMdLinkAt (position matchers shaped
      for the markdown-it inline rule and the Lezer extension),
      parseEdges document scan (fence/inline-code/image skipping,
      offsets + line/col), serializeWikilink round-trip,
      normalizeLabel (kebab + diacritics: "définit" → "definit" —
      the owner writes French). Alias syntax inside `[[…]]`
      deliberately NOT invented (header note; needs an ADR
      amendment). Session-A collision suite = 17 unit tests
      (adjacency strictness, {<label} escape trap, {.attr} pandoc
      trap, non-kebab prose, nesting/newline/unclosed rejection,
      image/fence/code skipping, two-per-line boundaries).
- [x] S03 Pills on every rendered surface (DONE 2026-08-04): the
      note-markdown factory gains semanticEdges — a wikilink inline
      rule + md-link `{label}` chip rule + link_open pill classing,
      ALL consuming shared/edge-grammar (the grammar cannot fork);
      link-pills.ts NEW (classifyLinkKind pure kind-from-target,
      resolveWikiTarget nearest-wins over the @ menu's proximity
      order, decorateWikiLinks post-render swap); useVaultNote
      resolves wikilinks via listVaultFiles (zero new IPC), effect
      restructured so wiki + image passes compose over one `current`
      (cleanup fixed for the imageless path), wiki clicks route by
      data-rel BEFORE the hash guard, broken = inert diagnostic;
      styles: --kind-* tokens, ONE .link-pill recipe + kind
      modifiers with CSS-mask icons (16-viewBox family — resolution
      swaps one class and the icon follows), edge-chip + ⇄ reverse,
      broken dashed; the external-↗ rule scoped :not(.link-pill).
      DEVIATIONS (recorded): wikilink RESOLUTION lives in the read
      view for now — chat/AI-preview surfaces render wiki pills
      unresolved until S06's index feeds every surface; wikilinks
      resolve to notes only (index.md/source.md contract files stay
      out of candidates, the @ menu rule). Dev-mode CDP pin
      (StrictMode, isolated user-data-dir + state/vault fixtures):
      6 pills probed — resolved note pill with data-rel, ghost
      broken dashed no-rel, [[hello]] → chat kind by stem, md pdf +
      web kinds, chip title "edge: normalizes", spaced brace stayed
      prose, radius 999px, mask icons on; screenshot verified.
- [x] S04 Editor layer (DONE 2026-08-04): live-preview gains
      semantic-edge decorations — parseEdges from the SHARED grammar
      scans the raw doc (fences/inline-code/images already excluded;
      frontmatter suppressed): wikilinks replace with WikiPillWidget
      (the read pill + chip classes, .cm-content joins the shared
      recipe selectors), a typed md link folds ONLY its brace group
      into EdgeChipWidget (the Link node keeps its lp-link
      treatment); active line reveals raw like every other mark.
      edge-complete.ts NEW — pure context matchers (wikiQueryAt,
      labelQueryAt with the adjacency rule, caret kept out of the
      query) + labelsInDoc (most-used-first document vocabulary) +
      applyClosed (closeBrackets-aware insert, cursor lands past the
      closer); `[[` offers linkableNotesOf (nearest-wins, the @
      menu's provider), `{` offers used labels + the
      kebab-normalized free input as "new label".
      INCIDENT (caught by the dev pin, fixed): a second
      autocompletion() extension crashed EditorPane ("Config merge
      conflict for field override") — CodeMirror allows ONE override
      config; the edge source now composes into quick-actions' one
      autocompletion (rule commented at the site).
      DEVIATIONS (recorded): live wiki pills are neutral note-kind
      (resolution/broken diagnostics stay read-view until S06 feeds
      every surface); md links in live keep their existing lp-link
      text treatment (read renders them as pills — full read↔live
      pill parity deferred to owner bench); label vocabulary =
      current document until the S06 registry. Authoring flag: the
      completion sources mount only in the note editor (chat
      renders pills, no authoring). Dev-mode CDP pin (isolated):
      4 wiki pills + 2 chips in live, raw hidden away from cursor,
      active line reveals `[[Attention]]{normalizes}` while other
      lines keep widgets, `[[` popup lists Attention+hello, accept
      writes `[[Attention]]` (auto-close aware), `{` popup lists
      grounded-at+normalizes, accept writes `{grounded-at}`;
      screenshots verified.
- [ ] S05 Edge authoring on the pill: the "+" affordance (widening
      input, owner vision), edit label, ⇄ flip, delete — full
      lifecycle (03), each gesture one clean diff through the
      ordinary write path.
- [ ] S06 Nodes/edges index + label registry: rebuildable `.atomik/`
      artifact built from a main-side vault scan; incremental
      maintenance in the write verbs; delete→rebuild round-trip
      test; broken-target diagnostics surface; wikilinks join
      computeRelocate so rename/relocate rewrites them behind the
      existing preview (27).
- [ ] S07 Typed backlinks pane: per-note inbound edges with inverse
      label rendering (pane state per 03 precedent); counts; click
      navigates; empty state honest.
- [ ] S08 Acceptance: intents re-run + owner bench on the live vault
      (author edges in real notes, autocomplete convergence, flip,
      delete, backlinks, rename refactor over a linked note, index
      delete→rebuild); review and close (closing ceremony).

# Current checkpoint

```text
base commit : fba010d — ACTIVATED 2026-08-04 (owner: "Activate —
              lets go" after the opening check; both gap ceremonies
              recorded: closing 2026-08-04-cp-mvp-008-closing-
              ceremony.md, opening 2026-08-04-cp-mvp-009-opening-
              check.md, all four features confirmed as drafted, no
              deltas; concurrent studio brainstorm read at
              activation — consumer note only, no scope change).
changed     : S01 docs-only (this ledger + log). S01 PINS:
              — Grammar (ADR-011, law): `[[target]]{label}`,
                reverse `[[target]]{^label}`; labels ^[a-z0-9-]+$;
                IMMEDIATE adjacency (any whitespace = prose); same
                `{label}` decoration after standard md links; ONE
                pure dependency-free grammar module (15) consumed by
                BOTH the markdown-it rule and the Lezer extension;
                session-A collision suite = its unit tests.
              — Node-type → pill taxonomy (kind derived from the
                resolved target, never stored in the note): note ·
                folder (index) · chat (`type: Atomik Chat`) · prompt
                (prompts/ kinds; built-in blocks distinct) · pdf
                dossier · pdf anchor (#page= / p<n>q<m>) · web
                dossier · capture/transcript dossier. Pills ride 36:
                ONE .pill recipe extended with modifiers (NO new
                fork), colors from theme tokens, icons in the
                16-viewBox stroke-1.3 family (S07b14 precedent);
                unresolved target = broken modifier (diagnostic,
                never auto-create).
              — Edge record shape: { subject (vault-rel path of the
                authoring note), object (resolved vault-rel path) |
                targetRaw (unresolved string), label (kebab | null =
                untyped), reverse (bool), loc { line, col } } —
                stored ONCE, directed, subject = authoring note;
                inverse is a LABEL property rendered at the
                backlink pane (session-A direction doctrine).
              — Index artifact: `.atomik/graph.json` { version: 1,
                nodes: [{ path, kind, title }], edges: [records],
                labels: { label: count } } — JSON sidecar
                (opening-check Q4), rebuildable from files alone,
                main-side scan, incremental in the write verbs, NO
                writes on app open (build reads only; artifact lives
                in rebuildable-only .atomik/). Read contract = a
                clean projection (studio consumer note). Conditional
                13/12 fires when the query IPC channel lands.
              — Rename refactor (27 §Rename refactor diffs):
                wikilink rewrites join computeRelocate behind the
                existing preview; a refactor diff is NEVER mixed
                with content changes in the same commit.
              — Roadmap fit verified (18 §M8): "wikilinks and
                backlinks" + "note-title/alias/heading link index
                feeding passive link proposals" — the proposals
                themselves stay 20 §How links are born territory
                (Conditional 06/02 trigger, not scheduled).
changed(S02): shared/edge-grammar.ts NEW; tests/edge-grammar.test.ts
              NEW. RECONCILIATION: base measured 633/55 bare — the
              008 close figure "635/55" was off by two (recorded,
              not hidden; no test is failing or missing today).
tests(S02)  : 633→650/56; typecheck + build green (gates bare).
changed(S03): note-markdown.ts (semanticEdges: wikilink rule,
              edge-chip rule, link_open pill classing);
              link-pills.ts NEW; useVaultNote.ts (wiki resolution
              pass + composed effect + data-rel click routing);
              styles.css (--kind-* tokens, .link-pill recipe + kind
              modifiers + mask icons, .edge-chip, ↗ scoped);
              tests/link-pills.test.ts NEW; note-markdown.test.ts
              (+9 semantic-edge tests).
tests(S03)  : 650→668/57; typecheck + build green (gates bare);
              dev-mode CDP pin (isolated instance) probed + shot.
changed(S04): live-preview.ts (WikiPillWidget + EdgeChipWidget,
              edge scan after the tree walk, 'edge' kind);
              edge-complete.ts NEW; quick-actions.ts (edge source
              composes into THE one autocompletion; incident rule
              commented); EditorPane.tsx (comment only);
              styles.css (.cm-content joins the pill/chip
              selectors); tests/edge-complete.test.ts NEW;
              live-preview.test.ts (+5 edge tests).
tests(S04)  : 668→680/58; typecheck + build green (gates bare);
              dev-mode CDP pin: widgets, active-line reveal, both
              autocompletes driven end-to-end via Input events.
changed(S04b): owner bench round 1 ("I don't see the pills in live
              mode and I don't understand why you didn't implement
              the same rendering as read mode") — the S04 deviations
              RETIRED, full read↔live parity: live-preview replaces
              EVERY link away from the cursor with one
              LinkPillWidget (kind pill + chip, hash/mailto stay
              plain like read); wikilinks resolve against
              wikiCandidatesField NEW (StateField + setWikiCandidates
              effect, host-fed at mount from the same nearest-wins
              provider as read; null = unloaded → neutral, never a
              broken flash); livePreviewField recompute gate now
              includes the candidates effect (the pin caught the
              stale-decoration miss); EditorPane registers the field
              OUTSIDE the mode compartment (live⇄source keeps the
              value) and feeds it post-mount; broken style scoped to
              .cm-content. Owner's "no pills at all" attributed to
              their dev session running pre-S04/wedged HMR code —
              restart requested; parity pin: ghost broken-dashed,
              hello chat-kind, paper pdf, web web, icons masked, all
              in live StrictMode.
tests(S04b) : 680→683/58; typecheck + build green (gates bare);
              fresh parity pin probed + shot.
changed(S04c): owner bench round 2 ("in read i dont see different
              colors" + "we can't interact with link in live mode as
              in obsidian, maybe right click?"). (1) COLORS: real
              bug, reproduced by the pin — the compound base rule
              (.markdown-body a.link-pill / .cm-content .link-pill)
              out-weighed the one-class kind modifiers, so
              --pill-kind computed kind-note EVERYWHERE (read too);
              fix = the kind default moved to bare .link-pill (same
              specificity rung, modifiers win by source order);
              mixes also strengthened (border 65%, bg 16%, text
              82%). Measured after: chat violet, pdf red, web blue,
              note accent — distinct. (2) INTERACTION (Obsidian
              model, owner's right-click instinct adopted): LEFT
              click on a live pill FOLLOWS — wiki pills hand their
              RESOLVED vault path to the host (edgeFollowFacet +
              onFollowRel, no note-relative re-resolution), md pills
              route the raw href through the existing Ctrl+click
              resolver (externals stay inert per 13, recorded);
              RIGHT click places the cursor at the pill = the active
              line reveals raw for editing; broken pills stay the
              left-click edit affordance; hover title spells target
              + the right-click hint; hand cursor on live pills.
              Pin: left-click hello → note-bar switches to
              chats/2026-08-04/hello.md; right-click → raw
              [[hello]] revealed; colors measured distinct.
tests       : 683→684/58; typecheck + build green (gates bare).
next action : S05 edge authoring on the pill — the "+" affordance
              (widening input, owner vision), edit label, ⇄ flip,
              delete; full lifecycle (03), each gesture one clean
              diff through the ordinary write path.
blockers    : none.
```

# Blockers

- None. Gap ceremonies: 008 closing ceremony recorded
  (../sessions/2026-08-04-cp-mvp-008-closing-ceremony.md); opening
  check pending below activation.
