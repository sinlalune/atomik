---
type: Atomik Module Note
title: 'Module: atomik-desktop — vault and files'
description: Vault IO, lexical search, project bundles, the note trees and their fold state, and link-click routing.
tags: [module, vault, files, search, projects, tree]
timestamp: 2026-08-14T00:00:00Z
---

# Module: atomik-desktop — vault and files

> AREA NOTE of [Module: atomik-desktop](./atomik-desktop.md), split out at
> CP-OPS-001 S02 so concurrent lanes append to different files instead of
> colliding in one 1689-line note. The root note keeps what is cross-cutting
> (public contracts, data flow, alternatives, common mistakes, tests, agent
> checklist, dependency facts); this note keeps what THIS AREA owns.

## What it owns

- Vault IO (04/27, S05): `electron-main/vault.ts` (incubating vault-core,
  14) — tree listing (dot-dirs, `.git`, `.atomik`, `node_modules` skipped;
  symlinks not followed), validated vault-relative `.md` paths, byte-exact
  atomic writes, edit vs exclusive-create (`wx`) semantics, no code path
  writes on open. Last vault remembered in `.atomik/local-settings.json`,
  written by main only (no channel). `ATOMIK_VAULT_DIR` overrides for
  tests/smoke/dev.
- Lexical search (M1/S11 + MVP-001 feedback; **engine replaced at
  CP-MVP-010 S02**): `electron-main/search.ts` — now the I/O half only
  (walk the perimeter, read files, map hits back to `SearchResult`),
  with ranking done by the pure `shared/retrieval-core.ts`. Same
  denylist as the tree, same hard caps (query 200, 6 matches/file, 100
  files, 10 MB/file), same channels and same contract — but results are
  ordered by SCORE rather than walk order, and a query for `ethos` now
  finds `éthos`. Perimeters: whole vault, one project
  bundle (`search-vault` optional `scope` folder — `resolveSearchScope`
  rejects traversal/absolute/hidden/denied; a missing folder reads as
  empty), and the docs bundle (`search-dev-docs`, same scan bound to
  docsRoot). UI: every tree panel (vault / project / dev docs) has the
  debounced search box (`useTreeSearch` + `SearchResultsList` shared);
  results replace the tree; Esc clears.
- The retrieval engine (CP-MVP-010 S02, ADR-013):
  `shared/retrieval-core.ts` — PURE (no fs, no Electron, no DOM), the
  sibling of `graph-core`. Field-aware inverted index over six views of
  a file — title · heading · path · frontmatter · link · body — scored
  with BM25F (`k1 1.2`, `b 0.75`, weights 3/2/2/1.8/1.5/1). Rung 1 of
  33's ladder; no embeddings, no vector store, and deliberately no
  SQLite (ADR-013 carries the dated thresholds that would reverse it).
  - REACH — how FAR retrieval goes (S08g, corrected at S08h). The owner
    asked for "a sensibility option like from title only to title + link
    pages to etc"; the first implementation read that as a set of index
    FIELDS, and the correction was exact: *"links for me was the fact
    that a note is linked to a found note with title match"*. The axis
    is 33's ladder — what MATCHED, then how far the graph is WALKED from
    it — not which columns are searched.
    ```text
    titles   title · path match, no expansion
    linked   the same match, plus the notes LINKED to it   (default)
    full     every field — headings, frontmatter, links, bodies — plus
             expansion
    ```
    TITLE and HEADING are different fields, and confusing them cost a
    bench round (S08j). The TITLE is what a note is CALLED: its
    frontmatter title, else its first heading, else its file name — one
    string per note. HEADINGS are its internal structure, every `##` in
    its body. Matching section headings at a TITLE reach found notes
    through boilerplate like "What is inside", the heading the
    folder-index convention writes into every index, which is how a note
    called `bibi` answered a question about Plato.
    `linked` is the whole argument for having built the graph: a note
    earns its place by being connected to a note whose title answered,
    not by containing the word somewhere. An explicit `hops` in a
    request still wins over the reach's own walk.
    The cost is recall — at `titles`/`linked` a note that discusses a
    subject without naming it anywhere is invisible — and that is the
    first thing S10's evaluation should measure.
  - A FUNCTION WORD INSIDE A TITLE IS STILL A FUNCTION WORD (S08l, owner
    bench round 12: "is there an explanation why `to` has more weight in
    full reach than in title and link"). There was, and it is worth
    keeping: `to` sits in the TITLE "From Plato to Stoicism", so S08f's
    naming signal counted it as a subject; at 4× the rarest term its
    document frequency still fit under the tier. At `titles`/`linked`
    that was invisible — it could only match titles — but at `full` it
    matched the body of every English note. The tier is 2× now, which
    S08k's retry makes safe: over-narrowing falls back instead of
    returning nothing.
  - THE CORPUS A QUESTION IS MEASURED AGAINST IS THE CORPUS IT MAY
    RETURN (S08k, owner bench round 11: "adding more term empty the rag
    context package"). Document frequencies and the naming signal are
    now computed over the ACCEPTED documents only. The failure was
    beautiful and would have been very hard to find by reading: the
    transcript of the conversation asking "what plato brought to
    philosphy" is TITLED after that question, so every word of it
    looked like a named subject; the rarest of them (`brought`) then set
    the tier and pushed `plato` out; and the notes those "subjects"
    named were chat files, which may never ground an answer. Result: a
    longer question returned nothing at all.
  - A NARROWING RULE THAT NARROWS TO NOTHING HAS FAILED (S08k): when the
    principal terms yield no hit, the query is retried with every
    informative term. Silence is never the honest answer to a question
    the vault can partly answer.
  - PHRASING IS NOT SUBJECT (S08i, owner bench round 9: "I don't
    understand the two last hit with bibi"). Asked "what plato brought
    to philosphy", retrieval returned a note called `bibi` because its
    HEADING said "what" — and then bibi's neighbours arrived behind it
    through expansion. Frequency alone could not see the difference: in
    a bilingual vault `what` is uncommon enough to look like a subject.
    Rule: when the vault has notes NAMED after some of the query's
    words, ONLY those words rank; the rest is phrasing. The df tier
    still applies inside that pool, so a note titled "What is an
    ethos?" cannot make `what` a subject forever.
  - COVERAGE IS ABOUT THE VAULT, NOT THE RANKING (S08i): a term counts
    as covered when the index holds it at all, even if it was too
    common — or too peripheral — to decide which notes to send.
    Answering the first question with the second told the owner the
    vault had nothing on `emotions` while a note discussed them.
  - THE VAULT NAMES ITS OWN SUBJECTS (S08f): a query term that appears
    in some note's TITLE is principal whatever the statistics say. The
    frequency rule alone gets one case badly wrong — a vault ABOUT
    notes, asked "what is a note?", where the subject is also the
    commonest word in the corpus. This is the cheap, dependency-free
    half of what a POS tagger would buy: Atomik knows its own nouns
    because the owner titled them, so the entity list is the vault
    itself rather than a language model. Recorded against the
    alternative (spaCy/Stanza dependency parsing, owner research
    2026-08-16): a parser is a Python runtime plus per-language models
    for a gain nothing has measured yet, and 33's ladder is explicit
    that a heavier stage earns its place with numbers — which is what
    S10's evaluation set is for.
  - THE SUBJECT IS WHAT IS RARE (S08e, owner bench round 7: "still a lot
    word noise, maybe use fast principal subject ranking algo?"). "Que
    peux tu me dire de platon (Plato) ?" is one question about one
    subject, but `peux`, `dire`, `me`, `que` sit in dozens of notes —
    under the common ceiling, yet enough that a long note matching four
    of them outranks a short note about Plato. Only terms whose document
    frequency is within `PRINCIPAL_DF_FACTOR` (4×) of the query's RAREST
    term rank anything. The comparison is on document frequency, not
    IDF: a logarithm compresses a 10× difference in rarity into a 2×
    difference in score, and that compression is exactly what let filler
    compete. No grammar, no language list, no model — the vault's own
    statistics find the subject.
  - EVERYWHERE = NOWHERE (S08b): a term present in more than half the
    documents is dropped from ranking. The owner's bench asked "parle
    moi de l'éthos" and got SVG, Sociologie and three daily notes back,
    because `de`, `moi` and `parle` are in half the vault and their
    small contributions accumulated. Textbook BM25 lets IDF go negative
    for such terms; Atomik drops them, which is the same effect and far
    easier to explain. Corpus-driven, never a French stopword list: the
    vault decides which of ITS words are noise, in whatever language it
    is written. `commonTermsOf` exposes them so the packet counts them
    as PRESENT rather than missing — they are everywhere, they simply
    cannot rank.
  - The tokenizer is where the vault's own shape lives: NFD folding so
    `ethos` finds `éthos` (the exact miss that cost CP-MVP-009 S07b a
    bench round), a one-letter part dropped ONLY in the elision
    position (`l'éthos` → `ethos`, but `oppose-a` keeps its `a`), and
    kebab runs indexed whole AND in parts so an ADR-011 edge label is
    findable as written. No stemming until the S10 evaluation set has
    an opinion.
  - Link text, edge labels and link targets are indexed through
    `parseEdges` — the same parser rendering and the graph index use.
    The grammar never forks per consumer (ADR-011).
  - The index stores counts and ordinals, never note TEXT: snippets are
    extracted on demand from the few files a query returned
    (`extractMatches`), which keeps the projection small and stops it
    from becoming a second copy of the vault. Ordinals are also what
    make `"quoted phrases"` a filter rather than a bonus.
  - A hit carries its per-field contributions, so "why this result" is
    computed rather than narrated — the property the S05 context packet
    needs to stay inspectable (26/33).
  - Deterministic by construction: `buildRetrievalIndex` sorts its
    inputs and `serializeRetrievalIndex` sorts term keys, so a rebuild
    from the files alone is byte-identical (03 lifecycle rule) whatever
    order the walk produced. Round-trip pinned by test.
- The SEARCH SURFACE (CP-MVP-010 S09): results arrive RANKED and each
  one says why it is here — `“plato” in title, path`, the same sentence
  the context packet uses, built by the shared `explainHit`. One
  retrieval should speak one language wherever it surfaces, and an order
  the reader cannot account for is just an order. `SearchResult` gained
  `score` and `why`; the contract is otherwise unchanged.
- VAULT-WIDE BROKEN LINKS (CP-MVP-010 S09): `search/BrokenLinksPanel`
  under every tree's search box — the diagnostics list CP-MVP-009
  deferred *with a trigger* ("the back half builds a vault-wide scan
  anyway; when it exists the list becomes nearly free"). It rides the
  graph index retrieval already keeps current, so there is no second
  scan and no new channel, and it refreshes from the S03 push so a link
  repaired in another pane cannot leave a stale complaint. In a project
  scope it filters to that bundle. A broken link stays a DIAGNOSTIC —
  nothing here writes, auto-creates or suggests (bedrock 20) — and the
  clean bill is stated rather than implied: "✓ no broken links", so the
  reader knows the check ran.
- The retrieval SEAT (CP-MVP-010 S03): `electron-main/retrieval.ts` —
  the I/O half, sibling of `graph-index.ts`. Lazy (nothing scans on
  app open), rebuildable (`.atomik/index/retrieval.json`, delete it and
  the next read reproduces it byte-identical), and INCREMENTAL: a save
  patches one document instead of rescanning the vault, which is the
  closing-ceremony ruling that a retrieval index rebuilt wholesale on
  every keystroke-save is the wrong shape. Cached PER ROOT, because the
  same engine serves the vault and the read-only docs bundle.
  - Persistence waits for the next READ, never the write: a keystroke
    save moves memory only. A patch on a root with no cached index is a
    no-op — an absent index is already correct, and building one on the
    write path is exactly the cost this step removes.
  - The index holds EVERY vault file (non-markdown by path alone, S07d's
    rule), but `searchVault` filters to `.md`: the search contract opens
    notes, and a snapshot hit there would be the dead click CP-MVP-009
    S04b spent a step killing. Wider doors come with S05's packet.
- The CONTEXT PACKET (CP-MVP-010 S05): `shared/context-packet.ts`
  (pure, reader injected) + `compileVaultContextPacket` in the seat +
  the read-only `atomik:compile-context-packet` channel. It walks 33's
  ladder cheapest-first — `direct` (what the workspace already has open,
  pinned or selected) → `lexical` (BM25) → `link` (S04's typed
  neighbourhood) — and returns bedrock 26's shape with 06's budget.
  - Both halves are the contract: every entry carries the STAGE that
    found it and a reason in the packet's own words, and every omission
    carries why (`budget` · `threshold` · `scope` · `duplicate`). A
    packet that only listed what it kept would be a prompt with extra
    steps.
  - COVERAGE is this path's addition: `{ verdict, matchedTerms,
    missingTerms }`. Term coverage, not a score threshold — BM25 scores
    are unbounded and corpus-dependent, so a numeric floor means
    something different in every vault, while "which of your words does
    the vault have material for" means the same thing everywhere and can
    be shown to a human without explanation. `missingTerms` is precisely
    what CP-MVP-011's wikisearch will be asked to go and find.
  - Rung 0 outranks search by STAGE, not by a giant score: the packet
    crosses IPC as JSON, where `Infinity` would arrive as `null`.
    A test pins the whole packet as JSON round-trippable.
  - A LINKED note must be comparably relevant to take a slot from a
    lexical one (S07d): expansion scores are lexical scores times
    attenuation, so the two are in the same unit and the comparison is
    honest. Below 15% of the best lexical hit, a neighbour is a footnote
    rather than an answer — reported as `threshold`, never dropped
    silently. Together with the hub penalty in `retrieval-expand`, this
    is what stopped a question about XML from retrieving Peloponnesian
    War.
  - What may GROUND is narrower than what may be FOUND (S07c): chat
    transcripts stay in the retrieval index — the search panel finds
    them — but never enter a packet, with the omission reason
    `dialogue`. `isChatTranscript` reads the frontmatter type, and a
    transcript's title comes from its file name rather than its first
    turn.
  - `toPacketRequest` validates in main (13): bounded query, contained
    scope folder, rung-0 paths FILTERED rather than trusted. Read-only
    is not the same as unvalidated.
- The maintenance DOOR (CP-MVP-010 S03): `electron-main/vault-index.ts`
  — `recordVaultChange(vaultRoot, change, notify)`. Every write verb
  reports its change here and nowhere else; the module decides per
  projection whether to patch or rebuild, then pushes `indexChanged`.
  - saved → patch both · created/deleted → patch retrieval, rebuild the
    graph (the node set moved) · relocated → rebuild both (the rename
    refactor rewrote links in OTHER notes) · bulk → rebuild both.
    Invalidation is always CORRECT and merely slower: it is the honest
    answer whenever a change reaches past the file that carried it.
  - It also closed a silent staleness: the verbs that LAND files
    (transcription, cloud OCR, PDF import/extract, web reader, web
    import, the resets) pushed `vaultFilesChanged` for the trees but
    never touched the graph index, so a freshly imported dossier's edges
    stayed invisible until some unrelated save happened to reset it.
    Seven hand-written `invalidateGraphIndex()` calls became one door
    that no new verb can forget.
- Link-click routing S04b (owner reports, same day): the shared
  note-link handler (`useVaultNote`) kills three dead-click classes —
  external http(s) links open a WEB TAB (`onOpenWebUrl`, threaded from
  Workspace to VaultView/ProjectView/SourceImageView); `.mhtml`
  snapshots open EXTERNALLY (openSourceExternally; `.mhtml` joined the
  asset allowlist for it); image/audio ORIGINALS route to the source
  view of their bundle exactly like PDFs since S06e
  (`isMediaFilePath`) — every dossier's "Original photo/audio" link
  was equally dead. mailto stays inert; no in-place navigation ever.
- Project bundles (04, S06): `electron-main/project.ts` (incubating
  project-core, 14) — manifest-detected bundles
  (`project.atomik-project.json`; scan skips denied dirs and does not
  descend into projects), `createProject` as idempotent ENSURE (creates
  only missing manifest/index.md/log.md, `wx`; adoption never touches
  existing files; manifest identity wins on re-create). Deviation from
  04's example recorded: no `root` field in the manifest (derivable,
  staleness-prone). ProjectView scopes the existing vault tree via the
  pure `findSubtree` helper — reads stay on vault channels.
- Tree fold state (owner request): every tree — vault, project, dev
  docs — opens COLLAPSED by default, and the open set is CONTROLLED and
  remembered per tab (`treeOpen` param, JSON array clamped under the
  param cap; `vault/tree-fold.ts` pure: parse/serialize/toggle/
  allFolderPaths). Expand/collapse-all buttons set the whole set; the
  toggle handler is identity-stable so the details mount event never
  churns the workspace file.
- The note trees (MVP-001 feedback): `renderer/src/vault/NoteTree.tsx` —
  ONE recursive tree for the vault and project panels (extracted from
  their twins). Any folder holding the 04 convention files shows
  [index] [log] pills on its top row and hides those files from its list
  until the row's right-docked eye reveals them; per-folder disposable
  state, `splitPillNotes` (scope.ts) is the pure tested seam. The old
  project-shortcuts row is subsumed. Dev Docs keeps its grouped list:
  the pills express the bundle convention, which the docs corpus does
  not follow.

## One tree panel per pane (CP-MVP-007 S07d, owner directive)

- The tree panel is PANE state, not tab state: each leaf pane carries an
  optional `tree` string map (same validation as tab params, main-side
  `workspace-state.ts`) — `kind` = 'vault' (default) | 'project',
  `projectPath`/`projectTitle` for the project scope, `off`/`w`/`open`
  as panel preferences. Tabs are just VIEWS served from that tree
  (notes → note tabs, `source.md` → source tabs); switching tabs — web
  included — never changes the panel. The web view stays "free": no
  tree relationship, but the pane panel remains beside it.
- `workspace/PaneTreePanel.tsx` consolidates the three former view-owned
  trees (VaultView / ProjectView / SourcesTree, the last deleted): one
  panel per pane hosting the FULL S02–S06 verb set (create note/folder,
  rename/move behind the preview, delete-to-trash, DnD over the Move
  flow, scoped search, ＋PDF import). The bar and inputs stay put; only
  the tree list scrolls; the hide toggle is pinned BOTTOM RIGHT of the
  panel (owner directive), and the show toggle floats bottom left of
  the content when hidden. Known edge: an active web tab's native view
  paints over the show toggle — switch tabs to reach it.
- Routing (Workspace.tsx): a tree click updates the ACTIVE tab's
  `notePath`/`dossierPath` param when it is a matching view (the views
  follow their params — the S07a `noteFollowTarget` discipline), else
  opens a new tab of the pane's kind. Opening a project in a Project
  tab TYPES the pane (`setPaneTreeScope`); the project tree bar carries
  a switch-back-to-vault button; a missing project folder falls back to
  rendering the vault tree.
- The dirty-editor guards moved to the pane door: note views register a
  `PaneNoteGuard` (`dirtyPath()`, refs under a stable callback) — the
  panel confirms manual-mode navigation and refuses rename/move/delete
  of the dirty note, same messages as before.
- Deletes initiated from a pane's tree CLOSE that pane's tabs under the
  deleted path (`closeTabsWithin` — never web tabs, so no native view
  is orphaned); other panes keep the S03 humanized not-found. Renames/
  moves keep flowing through the `note-relocated` push, which now also
  rewrites `dossierPath`/`projectPath` tab params (dossier tabs did not
  follow bundle moves before) and the pane tree's scope + fold state.
- Migration (`migratePaneTrees`, load-time like `migrateRetiredViews`):
  pre-S07d leaves derive their tree from the ACTIVE tab — a project tab
  types the pane; the tab's `tree`/`treeW`/`treeOpen` params carry over
  as `off`/`w`/`open`, so saved widths and fold state survive. The
  per-tab params stay only for Dev Docs, whose docs tree browses the
  APP corpus, not the vault — it keeps its own in-content tree below
  the tabstrip.
- Layout: `.pane` grid unchanged [tree col | tabstrip/content], but the
  column now comes from the PANE tree state; `.pane-tree` is a real
  grid child spanning both rows (the S07c negative-margin pull-up is
  retired); `.pane-content` sits at (row 2, col 2) without the
  padding-top hack.

## Quick untitled notes (CP-FEEDBACK S03)

- A quick note is an ordinary vault Markdown file from birth, never a
  path-less editor or hidden record. The note-add tabstrip action and
  `Mod+N` create an explicit empty string through the existing exclusive
  `createNote` verb. Placement is deterministic: active note parent, then
  current project root, then vault root. Source dossiers are excluded so a
  thought cannot accidentally become a source-bundle contract file; this guard
  also applies when `sources/…/source.md` is open in an ordinary vault/project
  note tab rather than its dedicated source view.
- `workspace/quick-note.ts` owns the pure naming policy: case-insensitive
  collision scans choose `Untitled.md`, `Untitled 2.md`, …; the first H1
  outside fenced code yields a portable sanitized title, with collision and
  Windows/convention-name guards. Tests cover nested trees, lower headings,
  fences, collisions, and a real blank-create → save → relocate round trip.
- Pending auto-naming is recoverable tab state (`quick: '1'`), not note
  metadata. After a successful save, `VaultView`/`ProjectView` report the
  content to Workspace, which runs `relocatePreview` then the ordinary atomic
  `relocateApply`; the relocation push updates every open tab. The folder's
  one managed `index.md` link is expected and follows without a modal. Any
  additional backlink still requires confirmation. Success, same-name H1, or
  decline clears the flag, so later title edits never create a rename loop.
