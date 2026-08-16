---
type: Atomik Coding Path
title: Retrieval over the graph — lexical baseline, link expansion, inspectable context packets, and vault-grounded chat (M8 back half, first half of the split)
description: The vault's typed graph becomes something the app can SEARCH and something the chat can be GROUNDED in — a rebuildable lexical index over paths, titles, headings, frontmatter, link text and bodies; expansion over the nodes/edges tables CP-MVP-009 laid; a bounded, inspectable context packet with omitted-entry diagnostics; a retrieval trace per query; citations back to the notes that grounded the answer; and a small evaluation set that keeps the no-embeddings baseline honest. The Wikimedia augmentation half is CP-MVP-011, opened immediately after.
tags: [coding-path, m8, retrieval, bm25, context-packet, link-expansion, rag, chat, traces, evaluation]
timestamp: 2026-08-16T00:00:00Z
atomik:
  id: CP-MVP-010
  status: running
  accepted: 2026-08-16
  current_step: S07b
  base_commit: 2370546
  branch: path/cp-mvp-010
  writes:
    - apps/desktop/shared/retrieval-core.ts
    - apps/desktop/shared/retrieval-expand.ts
    - apps/desktop/shared/context-packet.ts
    - apps/desktop/shared/graph-core.ts
    - apps/desktop/shared/ipc-contract.ts
    - apps/desktop/electron-main/vault-index.ts
    - apps/desktop/electron-main/retrieval.ts
    - apps/desktop/electron-main/search.ts
    - apps/desktop/electron-main/graph-index.ts
    - apps/desktop/electron-main/index.ts
    - apps/desktop/electron-main/action-trace.ts
    - apps/desktop/electron-main/ai-mock.ts
    - apps/desktop/electron-preload/index.ts
    - apps/desktop/renderer/src/workspace/PaneTreePanel.tsx
    - apps/desktop/renderer/src/vault/**
    - apps/desktop/renderer/src/workspace/ChatView.tsx
    - apps/desktop/renderer/src/editor/request-breakdown.ts
    - apps/desktop/renderer/src/styles.css
    - apps/desktop/renderer/src/editor/**
    - apps/desktop/tests/**
    - docs/modules/atomik-desktop-graph.md
    - docs/modules/atomik-desktop-ai.md
    - docs/modules/atomik-desktop-vault.md
    - docs/modules/atomik-desktop-shell.md
    - docs/modules/atomik-desktop.md
    - docs/learning/**
    - docs/adr/**
    - docs/index.md
    - atomik-project/coding-paths/CP-MVP-010.md
    - atomik-project/log/**
---

# Goal

CP-MVP-009 made the vault's links a visible, typed graph and left a
rebuildable nodes/edges index behind one read-only channel. Nothing
reads that index for RETRIEVAL yet: the app's only search is a
case-insensitive substring scan (`electron-main/search.ts`, written as
the placeholder M8 replaces), a chat message reaches the model with no
vault context at all, and no packet, trace or evaluation exists.

This path builds the BACK half of M8, ruled at the CP-MVP-009 closing
ceremony (2026-08-13) as the next path, and shaped by the opening check
of 2026-08-16 (`../sessions/2026-08-16-cp-mvp-010-opening-check.md`):

1. **Lexical baseline** — ranked retrieval over the vault (bedrock 33
   rung 1: paths, filenames, headings, frontmatter, link text, bodies),
   replacing the substring scan behind the same contract. No
   embeddings, no vector database — 33's ladder forbids them before the
   lexical baseline is evaluated.
2. **Link expansion over the graph** — seeds found lexically expand
   through the typed nodes/edges tables, so retrieval answers with the
   neighbourhood of an idea and not only the notes containing the word.
3. **The context packet** — one bounded, INSPECTABLE object: what was
   selected, why (which stage found it), and what was left out and for
   which reason. Omitted-entry diagnostics are part of the contract,
   not a debug afterthought.
4. **Vault-grounded chat** — the owner's stated first use, verbatim at
   the opening check: *"The first use is definitally the RAG, in chat
   discussion for exemple, the agent harness (current state and future
   true harness) should be able from a given question to trigger
   search... but it need at least to know if: we already have knowledge
   as note or source in the vault or that we need to gather more."*
   This path builds the DETERMINISTIC half of that: every chat message
   retrieves vault context first, the packet is inspectable before the
   send, and the answer cites the notes it stood on. The model-driven
   tool loop and the external half are CP-MVP-011.
5. **Retrieval traces** — one ActionTrace line per query: stages,
   candidate counts, selected entries, estimated context tokens,
   latency; deterministic location; no content recorded.
6. **A small evaluation set** — queries with expected notes, run on
   demand, reporting recall and latency, so "the lexical baseline is
   enough" is a measured claim and the embeddings question has a dated
   answer instead of a preference.

Plus the three deviations the closing ceremony assigned here: **index
invalidation broadcast** (a push channel, which also fixes the
relations strip's stale refresh), **incremental per-file index
patching** (a retrieval index rebuilt wholesale on every save is the
wrong shape), and the **vault-wide broken-links list**, whose deferral
trigger — "the back half builds a vault-wide scan anyway" — fired at
this opening check.

The truth slice, unchanged and standing (33/28): retrieval relevance is
never truth; supporting and contradicting evidence coexist in a packet.

## What this path is NOT (CP-MVP-011, opened immediately after)

The owner ruled the whole vision in at this opening check and then
ruled it into TWO back-to-back paths, so a working vault RAG lands
before the external half starts. Recorded here so nothing is lost:

```text
Wikimedia augmentation   Wikipedia search + article extract
                         Wikidata entity (QID, labels, claims) joining
                           the SAME nodes/edges tables
                         Commons image (P18) with licence + attribution
                         Wiktionary etymology
the model-driven loop    the model itself calls search_vault /
                         search_wiki on terms it chooses, over the tool
                         contract this path defines
web citations            phrase links + numbered markers pointing at
                         external pages, beside the vault ones
persistence gesture      transient by default; "save as source" turns
                         consulted material into a real dossier with
                         revision + accessed_at (existing web-source
                         machinery); no auto-persist
```

Two consequences bind THIS path: the retrieval entry point is shaped as
a TOOL CONTRACT from the start (a `search_vault` a model could call,
mirroring the shape session C reserved for `search_web`), and the
citation renderer is built so an external source is a new source KIND,
never a second renderer.

Recorded inputs this opening read (register pointers, not decisions):

- brainstorm 2026-08-03 session B — M8 has a named consumer in claim
  verification: a claim index, top-k passages, link expansion. What
  this path builds must be able to serve M6 without redesign.
- brainstorm 2026-08-03 session C — the eventual `search_web` tool
  mirrors the `searchVault` contract SHAPE; the function-calling tool
  loop in the harness is named as M8's; Wikimedia-first is the owner's
  recorded lean, confirmed again here; local rerank and query rewrite
  stay later roles.
- brainstorm 2026-08-04 studio — the studio projects the same
  nodes/edges index; expansion helpers stay pure so it can reuse them.
- brainstorm 2026-08-15 layered depth reader — a grounded answer is
  exactly where synthesis layering applies; read at S07/S08 as an
  output-shape candidate, not a requirement.
- CP-MVP-009 S01 pin — "SQLite arrives with the retrieval/Wikidata
  path and the index migrates then (rebuildable = free migration)":
  RE-DECIDED at this opening check, not inherited — see below.

# Definition of done

- A ranked lexical retrieval exists over the vault, field-aware
  (path · filename · title/headings · frontmatter · link text · body),
  diacritic-folded, phrase-capable, and it is the engine behind the
  app's existing search perimeters (vault, project bundle, docs) —
  the substring scan is replaced, not doubled.
- The retrieval index is rebuildable from files alone (delete it →
  identical rebuild, round-trip test, 03/33), builds LAZILY (no scan
  on app open), and is maintained per-file by the write verbs rather
  than rebuilt wholesale.
- Every vault mutation broadcasts an index-changed event to the
  renderer; the relations strip and the retrieval surfaces refresh from
  it (closing-ceremony deviation 2, closed here).
- Link expansion over the nodes/edges tables is pure, budgeted,
  direction- and label-aware, and unit-tested without a DOM.
- `compileContextPacket` returns a BOUNDED packet whose entries each
  carry their origin stage and score, plus an omitted list where every
  omission carries a reason (budget, threshold, scope, duplicate).
  Inspectable in the app, not only in tests.
- A chat message can be answered WITH vault context: retrieval runs
  before the send (per-thread toggle), the packet is inspectable before
  and after, and the answer carries citations back to the notes that
  grounded it — phrase-level links where the model emits them, numbered
  markers otherwise, plus a sources block. Every citation is a
  CP-MVP-009 pill that opens the note; a citation that resolves to
  nothing renders as a visible diagnostic, never a silent drop.
- A "we already have this" verdict is visible: the packet says whether
  the vault covered the question or came up thin — the signal
  CP-MVP-011's external half will branch on.
- One ActionTrace line per retrieval (`action: 'retrieve'`,
  `location: 'deterministic'`), with stage counts, selected entries,
  estimated context tokens and wallMs; the existing
  no-content-in-telemetry test extends to cover it.
- A vault-wide diagnostics list (broken wikilinks and md links) rides
  the same scan and is reachable from the search surface.
- The evaluation set runs on command, reports recall@k and latency
  against an in-repo fixture vault, and a dated bench record captures
  the same measures on the owner's real vault at a pinned commit
  (33 §Evaluation gates) — together the entry condition any future
  embedding experiment must beat.
- Module notes, learning note (17 first-use rule), the log entry at
  merge, and this ledger updated in the same work unit as the code;
  typecheck, tests and build green at every step, run BARE (24).

# Documentation coverage

## Required

- 33-retrieval-local-execution-cost — the spine: the ladder, the
  ContextPacket, the trace, the evaluation gates, the cost model
- 26-okf-agent-context — the retrieval ladder as the agent sees it
- 04-file-first-model — files are canonical; every index is a
  rebuildable projection, never a source of record
- 20-relations-future + ADR-011 — the graph the expansion walks
- 18-roadmap §Milestone 8 — the scope boundary of this half
- 06-ai-patch-pipeline — the chat/operation door the packet enters
- 03-workspace-tabs — derived artifacts ship their lifecycle;
  per-thread toggles are tab state, never knowledge
- 15-maintainability — zero-dependency bias; a new dependency is a
  decision with an owner, not a convenience
- 13-electron-security — every new IPC channel is typed, validated,
  read-only where it can be
- 36-ui-design-system — the packet inspector, citation pills and
  diagnostics obey tokens, themes, glass rules, accessibility floors
- 17-self-evolving-docs · 22-agent-handoff · 24-doc-templates ·
  35-coding-path-execution-state · coding-paths/paths.md — standing
  execution law (this path runs in its own worktree and merges itself)

## Conditional

- 28-truth-evidence-model + 31-truth-lens-ux — when a citation sits
  beside a claim; retrieval score is never epistemic support
- 02-learning-loop — when grounded answers feed the reuse loop
- 12-electron-mvp + 14-app-kernels — if the index earns its own
  main-side seat rather than joining the graph seat
- 05-resource-selection-model — scope, selection, open-resource
  perimeter feeding rung 0
- 27-git-compatibility — if index maintenance touches rename/relocate
- 16-dev-docs-tab — the docs perimeter rides the same engine
- 25-use-cases — when a scoping doubt needs pressure-testing
- 00-orientation + 01-workbench-first — re-read if a step seems to
  bend the constitution

## Deliberately excluded

- 29-verification-grounding-router + 30-public-knowledge-dictionary —
  the external half is CP-MVP-011; nothing in this path calls the
  network
- 07/08/09/10 (source adapters, capture, web, PDF) — retrieval reads
  what they already wrote; no adapter changes here (CP-MVP-011 reuses
  the web-source machinery for its persistence gesture)
- 19-dsl-future · 21-canvas-future — the studio is a later consumer
- 32-truth-investigation-record — M6 territory
- 34-local-execution-investigation-record — no local model work; no
  reranker, no embedding experiment
- 23-references — no new external corpus decisions expected
- embeddings, rerankers, and any vector store — forbidden before the
  lexical baseline is evaluated (33); the evaluation set is what would
  ever unlock them

# Opening-check decisions (2026-08-16)

```text
ENGINE      pure TypeScript BM25 core in shared/, zero dependency —
            overrides CP-MVP-009's "SQLite arrives with this path" pin.
            Native modules cost an Electron rebuild per version; the
            vault is note-scale; 33 asks for a BM25 baseline, not for
            SQLite. Rebuildable = the migration stays free.
SCOPE       the whole vision ruled IN, then split: this path = vault
            retrieval + chat RAG; CP-MVP-011 = Wikimedia + tool loop.
INDEX       per-file patching AND the change broadcast, early (S03).
DIAGNOSTICS the broken-links list rides the vault-wide scan (S09).
CHAT        deterministic pre-pass first; the model-driven tool loop
            is CP-MVP-011, over the same tool contract.
CITATIONS   phrase links where emitted + numbered markers otherwise +
            a sources block. Vault notes here; external kinds later.
EVALUATION  in-repo fixture vault (CI-runnable) AND a dated bench on
            the owner's real vault at a pinned commit.
PERSISTENCE (CP-MVP-011) transient by default, dossier on gesture.
```

# S01 pins (2026-08-16)

Everything below is a starting point pinned by tests, not a truth:
weights and thresholds move only on evidence from the S10 evaluation
set, and every move is recorded there.

```text
ENGINE + STORAGE  ADR-013. Pure `shared/retrieval-core.ts` (no fs, no
                  Electron, no DOM — graph-core's rules). The main-side
                  seat persists `.atomik/index/retrieval.json` (04's
                  layout for derived indexes). `.atomik/graph.json`
                  stays where CP-MVP-009 put it: moving it would be
                  churn with no reader asking for it.

TOKENIZER         lowercase · Unicode NFD diacritic folding (so
                  `ethos` finds `éthos`, the exact miss that bit
                  CP-MVP-009 S07b) · split on non-letter/non-digit ·
                  elision split for French clitics (`l'ethos` →
                  `ethos`, keeping the whole form too) · kebab tokens
                  indexed whole AND in parts (`part-of` → `part-of`,
                  `part`, `of`) · positions stored, so phrases work ·
                  NO stemming (a real French stemmer is a dependency
                  and a quality question the evaluation set must ask
                  first — recorded as S10's open question).

FIELDS + WEIGHTS  title/H1 3.0 · headings 2.0 · filename+path 2.0 ·
                  frontmatter (title/description/tags) 1.8 · link text
                  and edge labels 1.5 · body 1.0. Per-field length
                  normalization; a hit reports its field contributions
                  so "why this result" is computed, never narrated.

BM25              k1 = 1.2, b = 0.75 (the standard defaults; the eval
                  set is what may move them).

PACKET            bedrock 26's ContextPacket shape — the superset —
                  with 06's `budget { maxTokens, policy }`. Entries:
                  { path, reason, stage, score, excerpt, span }.
                  `omitted[]` entries always carry a reason
                  (budget · threshold · scope · duplicate).
                  ADDED by this path: `coverage` — 'covered' | 'thin'
                  | 'empty' — the "do we already know this?" verdict
                  the owner named as the harness minimum and the
                  branch point CP-MVP-011 reads. Threshold pinned at
                  S05 against the fixture set, never by feel.

BUDGET DEFAULTS   maxContextTokens 4000 (estimated, chars/4 — the
                  existing convention, kept honest by 33's "do not
                  manufacture precision") · max 12 entries · max 800
                  chars per excerpt.

TOOL CONTRACT     `search_vault({ query, scope?, limit?, expand? })`
                  → hits, shaped from S05 as something a model could
                  call, mirroring what brainstorm session C reserved
                  for `search_web` (CP-MVP-011 adds the loop, not a
                  second contract).

TRACE             `action: 'retrieve'`, `execution.location:
                  'deterministic'`, usage { candidates, selected,
                  contextTokens (estimated) }, performance.wallMs,
                  outcome.status, privacy.contentRecorded false —
                  the ledger's existing content-leak test extended to
                  cover retrieval lines.
```

**Reality check against the ledger (22 step 4).** The trunk baseline is
**773 tests / 64 files**, not the 767 the CP-MVP-009 ceremony recorded:
CP-OPS-001's S06 ratification added six after that ceremony closed. The
ledger below carries the corrected number.

**Declared-write overlap (advisory, `paths.md`).** CP-PROVIDERS is
running in parallel and declares `shared/ipc-contract.ts`,
`electron-main/index.ts`, `electron-main/action-trace.ts` and
`electron-preload/index.ts` — all four also declared here, and the
first two are the hot files the convention names. Resolution is
mechanical (distinct channels appended). This path rebases on the trunk
at every step boundary rather than at the end.

# The workflow diagram — decided 2026-08-16 (owner request, timing delegated)

Owner: *"At one moment I will need a exhaustive diagram of the workflow,
decide when is the best moment"*. Read as the RETRIEVAL workflow — a
question travelling through the ladder into a grounded, cited answer —
not the Cairn protocol one, which already exists as D14 and would only
need a refresh.

```text
DRAW IT AT S10, after the evaluation set produces its first dated
baseline and BEFORE the S11 owner bench.
```

Four reasons, in the order they decide it:

1. **The register's own rule.** A diagram is a DERIVED VIEW: "the figure
   never introduces structure the corpus does not contain". Today half
   the pipeline is intention. S05 already proves the risk — the coverage
   verdict changed shape from what the S01 pin predicted, and a figure
   drawn at S04 would have shipped the wrong branch point.
2. **Exhaustive means every stage.** Rung 0 · lexical · link · packet
   with its omissions · the coverage branch · the trace · the chat
   pre-pass · the citations. The last two do not exist until S07/S08.
3. **At S10 the picture can carry FACTS.** The evaluation set gives real
   candidate → selected → token → latency numbers, so the figure shows
   what the pipeline actually does on a real vault instead of boxes.
4. **The bench is when it is most useful.** The owner benches S11 with
   the map in hand rather than reconstructing it from behaviour.

Shape, decided with it: **D15, GENERATED** like D14
(`tools/gen-d15-*.py`, geometry asserted — no overlaps, nothing out of
bounds), and it must show CP-MVP-011's external branch hanging off the
`thin`/`empty` coverage verdict as a clearly-marked NEXT-PATH lane. A
picture of vault retrieval that stops at "the vault does not know this"
would lie by omission about where that answer goes.

If something sooner is wanted to steer the build, the honest instrument
is not a diagram but S07's packet inspector: it shows the real stages,
live, on real notes.

# Execution

- [x] S01 Bootstrap + pins (DONE 2026-08-16, docs-only): Required
      documents read (33, 26, 04, 06 §Input/Context/Operation, 18 §M8,
      ADR-007, ADR-011, 22, 24, paths.md); repository reality verified
      against this ledger (one correction below); **ADR-013 written and
      accepted** — the engine decision that overrides CP-MVP-009's
      SQLite pin, with the dated thresholds that would reopen it. The
      pins the rest of the path executes against are in §S01 pins.
- [x] S02 Lexical core (DONE 2026-08-16): `shared/retrieval-core.ts` NEW
      — pure, dependency-free, `graph-core`'s rules. Tokenizer (NFD
      folding, elision-only clitic drop, kebab runs indexed whole AND in
      parts, ordinals for phrases), six-field extraction (title ·
      heading · path · frontmatter · link · body, link text and labels
      read through `parseEdges` so the grammar never forks), a
      field-aware inverted index, BM25F with the S01 weights, quoted
      phrases as a FILTER, and `extractMatches` for snippets with
      highlight spans. `search.ts` is now the I/O half only — same
      contract, same caps, same channels, results ordered by score.
      Index determinism pinned by a round-trip test (sorted inputs,
      sorted term keys → byte-identical rebuild in any input order).
      +20 tests (773 → 793); typecheck, tests, build green, run bare.
      DEVIATION from the S01 pin, recorded: the pin said a one-letter
      part is always noise; `oppose-a` proved otherwise, so the drop is
      now elision-only. Vocabulary after a hyphen is vocabulary.
      Two advisories answered in the ledger rather than by silence:
      `docs/learning/index.md` is a SHARED file and the edit is
      deliberate — 17's first-use rule requires the new note to be
      listed, and one line at the end of a list is the cheapest
      possible collision; and `retrieval-core.ts` draws a `shell`
      area-note advisory only because Cairn's AREA_MAP has no retrieval
      entry yet, which is a mapping gap fixed on the trunk in
      CP-OPS-001 rather than by writing into the wrong note.
- [x] S03 Index seat + incremental maintenance + broadcast (DONE
      2026-08-16). `electron-main/retrieval.ts` NEW — lazy, cached per
      ROOT (the same engine serves the vault and the docs bundle),
      persisted as `.atomik/index/retrieval.json`, round-trip pinned.
      `patchRetrievalIndex` and `patchGraphIndexForSave` NEW in the pure
      cores, both proved by the only assertion that makes patching safe
      to trust: a patched index equals a rebuilt one, byte for byte.
      `electron-main/vault-index.ts` NEW — ONE door
      (`recordVaultChange`) that every write verb reports through, with
      the per-projection policy in one readable table, plus the
      `atomik:index-changed` push. The relations strip subscribes to it,
      closing deviation 2; per-file patching closes deviation 3.
      SCOPE WIDENED, recorded: `shared/graph-core.ts` and the new
      `electron-main/vault-index.ts` were not declared at S01 — the
      graph patch has to live beside the builder it must match, and the
      maintenance door only became necessary once there were two
      projections to keep in step.
      FOUND AND FIXED IN PASSING: the verbs that LAND files
      (transcription, cloud OCR, PDF import/extract, web reader, web
      import, the resets) pushed `vaultFilesChanged` for the trees but
      never invalidated the graph index — a freshly imported dossier's
      edges stayed invisible until an unrelated save reset it. Seven
      hand-written invalidation calls became one door that a new verb
      cannot forget. +12 tests (808 → 820); typecheck, tests, build
      green, run bare.
      GRAPH PATCH SCOPE, deliberate: only a content SAVE is patched.
      Creates, deletes and relocates move the node set or rewrite links
      in other notes, so they rebuild — invalidation is always correct
      and merely slower, and a wrong graph is worse than a slow one.
- [x] S04 Link expansion (DONE 2026-08-16): `shared/retrieval-expand.ts`
      NEW — pure, reads only a `GraphIndex`. Both directions of every
      resolved internal edge; per-hop decay 0.4; untyped links weighted
      0.8 against a typed edge's 1.0; per-label weights accepted as DATA
      so no ontology is ever built in; contributions SUM across seeds
      while the strongest single path is kept as the `via` the packet
      will show. External and unresolved targets excluded — expansion
      looks for vault material to read. Budgeted, deduped, deterministic
      (score, then path). +9 tests (820 → 829).
      KNOWN LIMIT recorded, not guessed at: summing also rewards a hub
      that links everything. If S10's evaluation shows hubs crowding out
      answers, the fix is a measured degree penalty, not a threshold
      invented today.
- [x] S05 Context packet (DONE 2026-08-16): `shared/context-packet.ts`
      NEW (pure, reader injected) + `compileVaultContextPacket` in the
      seat + the read-only `atomik:compile-context-packet` channel,
      shaped as the `search_vault` tool contract CP-MVP-011 will drive.
      Walks 33's ladder cheapest-first — direct → lexical → link — and
      returns bedrock 26's shape with 06's budget. Every entry carries
      its stage and a reason; every omission carries `budget` ·
      `threshold` · `scope` · `duplicate`; the budget is enforced in
      estimated tokens and named estimated.
      COVERAGE, decided here rather than pinned at S01: term coverage
      (`matchedTerms` / `missingTerms`) instead of a score threshold.
      BM25 scores are unbounded and corpus-dependent, so a numeric floor
      would mean something different in every vault; "which of your
      words does the vault have material for" means the same everywhere,
      needs no explanation to a human, and hands CP-MVP-011 exactly the
      list its wikisearch must go and find.
      Validation in main (13): bounded query, contained scope folder,
      rung-0 paths filtered rather than trusted — read-only is not
      unvalidated. +11 tests (829 → 840).
- [x] S06 Retrieval trace (DONE 2026-08-16): `recordRetrieval` on the
      existing ledger — one `action: 'retrieve'` line per packet with
      stages, candidates, selected, estimated context tokens, wallMs,
      deterministic location, zero external billing, and the packet id
      as a ONE-WAY link (telemetry points at knowledge, never the
      reverse). Appended immediately, unlike a generation draft:
      retrieval has no accept/reject decision to wait for. Failures
      record a failed line and rethrow. The QUERY is never written —
      user text is content like a prompt — and the content-leak test
      now greps for it too. +2 tests (840 → 842).
- [x] S07 Vault-grounded chat (DONE 2026-08-16, owner confirmed the
      main-side composition): `AiOperation.grounding` is a REQUEST,
      never a payload — the renderer asks and may bound it, main
      compiles the packet from the instruction and injects its entries
      as read-only reference selections through the EXISTING chat
      contract (no new prompt block, no forked composition). Direct
      entries are not re-sent (already in the operation's selections);
      the excerpt travels, never the whole note, so the packet's budget
      still means something at send time. The packet returns on the
      bundle, so the answer and what produced it travel together.
      UI: a `vault` toggle in the composer (session state like the model
      drafts) + a packet strip showing each entry's STAGE and why, the
      omissions summarized by reason, and the words the vault has no
      material for; `preview` compiles for the current draft through the
      same channel, so what is inspected is what a send would compile.
      One traced compile serves both call sites — a packet can never be
      produced without its trace line.
      CONSEQUENCE NAMED, not hidden: retrieved excerpts are real vault
      text supplied as selections, so an answer quoting one exactly
      earns `source-backed` through the ordinary containment rule (28).
      Retrieval still asserts nothing about truth — only that the
      sentence stands on that note. +4 tests (842 → 846).
- [x] S07b PACKET SCOPE (owner bench round 1, 2026-08-16 — DONE same
      day): *"it seems that the packet information surface is emerging
      on the chat input ui when it is a message bounded information no?
      Also it is accessible but after sending the message, is that
      normal?"* Both halves right, one root cause: the composer is
      about the NEXT message, and a packet was compiled for ONE past
      message. The used packet moved onto its own turn as a `vault N
      notes · ~T` pill in that turn's request breakdown (opens to the
      entries with their stage, reasons, omissions and missing terms;
      the count persists in sent meta, the detail stays session-live
      like `copy request`). The composer keeps the toggle — a
      preference for the next sends — plus a FORWARD preview labelled
      "next send", dismissible, cleared on send. Rule recorded in the
      module note: derived information inherits the scope of what
      derived it.
- [ ] S08 Citations: phrase-level links where the model emits them,
      numbered markers otherwise, a sources block under the answer,
      every marker a CP-MVP-009 pill that opens its note; unresolved
      citations render as diagnostics.
- [ ] S09 Search surface + diagnostics: ranked results with kind pills
      and "why this result", the packet disclosure, and the vault-wide
      broken-links list docked there.
- [ ] S10 Evaluation set: fixture vault + queries + expected notes, a
      runnable evaluation reporting recall@k, MRR and latency, plus
      the dated real-vault bench record (33 §Evaluation gates).
      AND **D15 — the retrieval workflow**, exhaustive, generated with
      asserted geometry, carrying the evaluation's real numbers and
      showing CP-MVP-011's external branch off the coverage verdict
      (owner request 2026-08-16; timing reasoned above).
- [ ] S11 Owner bench rounds + acceptance record, then the closing
      ceremony, the coherence audit, and the self-merge — after which
      CP-MVP-011 opens with its own (short) opening check.

# Current checkpoint

```text
base commit : 2370546 (branch rebased onto trunk tip 260f964, which
              carries CP-PROVIDERS merged + the two CP-OPS-001 fixes)
current step: S07b done (owner bench round 1 absorbed) — S08 next
changed     : apps/desktop/shared/{retrieval-expand,context-packet}.ts (new)
              apps/desktop/electron-main/{retrieval,vault-index}.ts (new)
              apps/desktop/shared/{retrieval-core,graph-core,ipc-contract}.ts
              apps/desktop/electron-main/{search,graph-index,index,action-trace}.ts
              apps/desktop/electron-preload/index.ts
              apps/desktop/renderer/src/vault/RelationsStrip.tsx
              apps/desktop/tests/{retrieval-core,vault-index,search}.test.ts
              docs/modules/atomik-desktop-{vault,graph,shell}.md
              docs/learning/22-lexical-retrieval-without-a-database.md + index
              docs/adr/ADR-013-lexical-retrieval-without-a-database.md
              docs/index.md · atomik-project/coding-paths/CP-MVP-010.md
tests       : 846 passing / 70 files (this path added 58 so far),
              typecheck and build green, each gate run BARE (24)
next action : S08 — citations: phrase-level links where the model emits
              them, numbered markers otherwise, a sources block under
              the answer, every marker a CP-MVP-009 pill that opens its
              note, unresolved citations rendered as diagnostics
rebase note : the learning index collided at the rebase (note 22 here,
              note 23 from CP-PROVIDERS) — mechanical, both kept in
              order. Exactly the shared-prose conflict paths.md
              predicts, and the only one in the whole rebase.
blockers    : none
```

# Blockers

None.

## Found, not this path's to fix (reported to the owner, S01)

`tools/cairn-check.mjs` eats the first character of the FIRST file in
`git status --porcelain`: `git()` trims the whole stdout before the
per-line `slice(3)`, so a leading `" M path"` becomes `"M path"` and the
path comes back as `tomik-project/…`. Seen on this path's own S01 run
(`scope-drift` reported `tomik-project/coding-paths/CP-MVP-010.md`,
which also defeated the `startsWith(PATH_DIR)` exemption). It silently
misreads one file in every local run, including in the BLOCKING rules,
and CI is unaffected only because CI passes `--base`, where the
committed list is read separately. One-line fix (`split` before
`trim`, or a `/^..[ ]/` strip) plus a test. The file belongs to
CP-OPS-001's surface, so the owner decides whether it goes there or
into a short labelled path.
