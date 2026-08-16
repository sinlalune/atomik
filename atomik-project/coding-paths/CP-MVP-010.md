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
  current_step: S10
  base_commit: 2370546
  branch: path/cp-mvp-010
  writes:
    - apps/desktop/shared/retrieval-core.ts
    - apps/desktop/shared/retrieval-expand.ts
    - apps/desktop/shared/context-packet.ts
    - apps/desktop/shared/chat-citations.ts
    - apps/desktop/shared/prompt-composition.ts
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
    - apps/desktop/renderer/src/search/**
    - apps/desktop/renderer/src/workspace/ChatView.tsx
    - apps/desktop/renderer/src/editor/request-breakdown.ts
    - apps/desktop/renderer/src/editor/citation-chips.ts
    - apps/desktop/renderer/src/editor/chat-file.ts
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
    - docs/diagrams/**
    - docs/research/**
    - tools/gen-d15-retrieval-workflow.py
    - package.json
    - apps/desktop/package.json
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

# Convention files, and the shape of the harness (owner, 2026-08-16)

Owner question, after three bench rounds where `index.md` / `log.md`
kept ranking into packets: *"explain me a use case where we would want
to have index and log of the vault or other folder in the context, maybe
after with the agent harness, we would have specific tool to explore
tree and file history rather than a global search context tool"*.

The honest answer, recorded because it shapes CP-MVP-011:

```text
a MAP is only worth sending to something that can act on it
```

- There ARE questions a folder's `index.md` answers: "what is in my
  rhetoric project", "where did I put the XML notes". Bedrock 26 says
  exactly that — read the nearest index.md BEFORE opening many files.
  And `log.md` answers time-scoped questions: what changed, what was
  decided recently.
- But those are different INTENTS, and no BM25 pool can separate them,
  because the distinguishing signal is not in the document text: it is
  in the question and in the file's ROLE. Asked about XML, a log line
  reading "created xml.md" matches lexically and answers nothing.
- The deciding argument is the owner's own: in a ONE-SHOT pre-pass a map
  is a dead end — nothing can follow it — while in a LOOP a map is a
  launchpad, because the model can read it and then ask for what it
  named. So convention files belong to the loop's tools, not to the
  deterministic packet.

Agreed direction, therefore: not "tools INSTEAD of search" but one door
per kind of question, all over the SAME index —

```text
search_vault(query)          concepts        (this path; conventions demoted)
explore_tree(path)           the map         index.md + children, deterministic
file_history(path | since)   what changed    log.md lines, later git (27)
```

Recorded as opening input for CP-MVP-011, whose tool loop is what
chooses among doors. In THIS path the only change is a weight, decided
with S10's numbers rather than by impression: convention files are
DEMOTED in the concept packet, never banned — a question that names the
folder should still reach its index.

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
- [x] S07c BENCH ROUND 2 (2026-08-16, owner ran a real question against
      the real vault and read the preview aloud — DONE same day). Three
      defects in one report, one of them older than this path:
      (a) TITLES — the preview showed entries called
      `you <!-- sent: system=1042|instruction=21 -->`. A chat turn
      heading carries the app's own bookkeeping comment, and
      `firstHeadingOf` returned it verbatim, so it had been reaching the
      pills and the relations strip since CP-MVP-009 too. Comments are
      now stripped, and since what remained was `you`, a transcript is
      titled by its STEM in BOTH cores — the file name is the question
      that started the conversation; its first turn names nobody.
      (b) DIALOGUE AS KNOWLEDGE — six of the twelve retrieved entries
      were old chat transcripts. A chat grounded in old chats compounds
      its own output. Transcripts are now excluded from the packet at
      both stages with the omission reason `dialogue`, while staying in
      the index so the search panel still finds them.
      (c) A TOKENIZER ARTIFACT SHOWN AS A GAP — coverage reported
      `not in the vault: qu-est-ce`, which is the welded form of
      `qu'est-ce`, whose parts all matched. A welded compound whose
      parts matched is no longer reported missing.
      +4 tests (846 → 850).
      STILL OPEN, deliberately unfixed without evidence: folder `log.md`
      files rank into the packet (`2026-08-16 — log`). They are
      management history, rarely an answer — but down-ranking convention
      files is a weight decision, and S10's evaluation set is where
      weights get decided rather than guessed.
- [x] S07d BENCH ROUND 3 — THE HUB (2026-08-16, owner preview for the
      query "XML"; DONE same day). Four of twelve entries were AI, Le
      logos, Characteristics and Peloponnesian War, every one of them
      `linked from vault-juju` — a note that links to dozens of others
      and matched "XML" weakly in its body. This is exactly the limit
      S04 recorded and refused to guess a fix for; the bench supplied
      the evidence, so both halves landed together:
      (a) HUB PENALTY in expansion — a link from a note counts for
      `HUB_DEGREE / degree` (five links or fewer unaffected, thirty
      links worth a sixth). A note with five links speaks about each
      one; a note with thirty is a catalogue.
      (b) RELEVANCE FLOOR in the packet — a linked note below 15% of the
      best lexical score is omitted as `threshold`, not dropped
      silently. Expansion scores are lexical scores times attenuation,
      so the comparison is in one unit and honest.
      +3 tests (850 → 853).
- [x] S08 Citations (DONE 2026-08-16): `shared/chat-citations.ts` NEW,
      pure. Reference notes are sent NUMBERED with one short
      instruction — the numbering IS the contract. `rewriteCitations`
      turns `[1]` / `[1, 2]` into real markdown links BEFORE rendering,
      so a citation wears the same pill as every other link (ADR-011)
      rather than growing its own renderer; code spans and fences are
      skipped (`arr[1]` is not a citation) and a phrase-level link the
      model emitted is left alone, being already a citation. An invented
      number stays visible as `unresolved: [7]` — silently dropping it
      would hide the one failure mode that matters. The map persists as
      a `cited:` heading comment beside `run:` (a heading now carries a
      LIST of comments), so a reopened transcript still resolves its
      markers. Sources block under the answer; markers and sources open
      their note through the ordinary reveal path. +8 tests (853 → 861).
- [x] S08b BENCH ROUND 4 (2026-08-16, query "parle moi de l'éthos" —
      DONE same day). Two reports, two fixes:
      (a) "matches are weird" — SVG, Sociologie, Le logos and three
      daily notes came back, because `de`, `moi` and `parle` are in half
      the vault and their small contributions accumulated. A term in
      more than half the documents is now dropped from ranking
      (`COMMON_TERM_SHARE`). Textbook BM25 lets IDF go negative for
      those; dropping them is the same effect and far easier to
      explain. Corpus-driven, NOT a French stopword list — the vault
      decides which of its own words are noise, in any language. They
      count as PRESENT for coverage: everywhere is not missing.
      (b) "we don't know what content of the request has matched" — a
      row now reads `“ethos” in title, body` instead of `matched title,
      body`, and hovering the reason shows the excerpt actually sent.
      +5 tests (861 → 866).
- [x] S08c BENCH ROUND 5 (2026-08-16, one screenshot, four reports —
      DONE same day):
      (1) THE TOKEN COUNT LIED. A grounded send showed `~273 tok sent`
      for a request carrying a thousand: S07b taught the PERSISTED
      breakdown about the vault part but not the LIVE one the turn
      actually displays. Both learn it now, so the vault pill appears on
      the turn and opens its packet — which was also the missing
      "inspect what was sent".
      (2) CITATIONS LOOKED LIKE LINKS. A citation is not another link to
      somewhere; it is a reference marker on the sentence before it. It
      drops the pill chrome for the shape every reader knows: a small
      raised number in the accent colour.
      (3) CLAIM TYPOLOGY UNREADABLE, and its cohabitation with citations
      undecided. Ruled: in a CONVERSATION "the model said it" is the
      default, not news — marking model-only / interpretive /
      needs-citation underlined nearly every line and taught the reader
      to ignore all of it. Chat marks ONLY `source-backed`, the one
      thing a reader cannot verify by looking. Tint = "verbatim from
      this note"; marker = "attributed to note 1". The full typology
      stays where it is actionable (AI panel) and M6 freezes the
      vocabulary.
      (4) THE SECOND QUESTION WENT UNANSWERED — "the notes do not
      contain information about…". Retrieval is a SERVICE, not a fence:
      a model handed only notes reads them as the boundary of what may
      be said. Main now passes the packet's coverage into the request
      (main-set, overwriting anything a renderer supplies) and the
      reference section names the words the vault lacks, instructing the
      model to answer those from its own knowledge and cite nothing for
      them. The vault having nothing on a subject is a fact about the
      VAULT, never about the world.
      +3 tests (866 → 869). DEVIATION recorded: the renderer's
      sent-request inspector composes BEFORE main grounds, so it cannot
      show the coverage line or the retrieved notes — "what you see is
      what is sent" now holds up to grounding, and the turn's vault pill
      is what closes the gap after the fact.
- [x] S08d BENCH ROUND 6 (2026-08-16 — DONE same day). Three reports:
      (1) THE PILLS DID NOT MATCH and the packet list trapped a second
      scrollbar. The vault pill is a BUTTON among spans and wore the
      browser's font instead of the shared recipe; fixed by inheriting
      it. The list extends instead of scrolling — a list inside a
      scrollable conversation should not trap a scrollbar. And the whole
      breakdown now hides behind the `↑~N tok sent` total it explains
      (owner: "hide the themed token count pill by default making it an
      expendable part of the sent token on top right of message").
      (2) A CITATION IS NOT A LINK. Rewriting `[1]` into markdown made
      the pill recipe render it as one more link — the owner's diagnosis
      was structural, not cosmetic. The answer's markdown is now left
      exactly as the model wrote it and the markers are DECORATED
      afterwards (`editor/citation-chips.ts`, beside `claim-highlight`:
      same job, same shape), as a small round chip in the accent colour,
      skipping code and existing links. An invented number keeps its
      plain brackets, so a bad citation still looks like one.
      (3) NOTHING SURVIVED A TAB SWITCH. The citation map already
      persisted; the packet did not, so the vault pill opened onto
      nothing. The you-heading now carries `packet:` beside `sent:` —
      stage and path per entry. Excerpts stay session-only: figures
      persist, prompts never do, and a transcript must not become a
      second copy of the vault.
      +1 test net (869 → 870: two new cases, one obsolete rewrite
      assertion retired with the markdown-rewriting approach).
- [x] S08e BENCH ROUND 7 (2026-08-16, query "Que peux tu me dire de
      platon (Plato) ?" — DONE same day). Two reports:
      (1) CHAT INDEXES AND PROMPTS IN THE PACKET. S07c filtered on the
      node KIND, but the graph rightly calls `chats/2026-08-03/index.md`
      a FOLDER, so a chat index walked straight past it. The rule is now
      on the PATH FAMILY: everything under `chats/` is omitted as
      `dialogue`, everything under `prompts/` as `machinery`. Prompt
      files are worse than noise — feeding them back as reference is the
      model reading its own instructions as if they were the owner's
      knowledge.
      (2) WORD NOISE — the owner's own suggestion, "maybe use fast
      principal subject ranking algo?". Implemented as the vault's own
      statistics: only terms whose document frequency is within 4× the
      query's RAREST term rank anything. The comparison is on document
      frequency, not IDF — a logarithm compresses a 10× difference in
      rarity into a 2× difference in score, and that compression is
      precisely what let `peux`, `dire`, `que` compete with `platon`. No
      grammar, no language list, no model.
      +5 tests (870 → 875). Two fixtures had to grow into real vaults:
      in a five-file corpus every term looks common, which is a lesson
      about test fixtures for a statistical ranker.
- [x] S08f THE VAULT NAMES ITS OWN SUBJECTS (2026-08-16, owner research
      on subject-weighting algorithms — DONE same day). A query term
      appearing in some note's TITLE is principal whatever its
      frequency. The df rule alone gets one case badly wrong: a vault
      ABOUT notes, asked "what is a note?", where the subject is also
      the commonest word in the corpus. The vault's titles ARE its
      entity list — the owner named them — so the dependency-free half
      of what a POS tagger buys is already in the index.
      DECIDED AGAINST, with reasons (owner shared an LLM survey of
      dependency parsing / POS tagging / SPLADE / attention):
      • a syntactic parser (spaCy, Stanza) means a Python runtime plus
        per-language models in an app with zero native dependencies
        (15, ADR-013), for a gain nothing has measured;
      • the survey's own point 2 concedes that BM25 already downweights
        common words through document frequency — which is exactly the
        rule this path implements, in the corpus's own statistics
        rather than in grammar;
      • SPLADE and attention-based weighting are the embedding rung,
        which 33 and ADR-007 forbid before the lexical baseline is
        evaluated. Recorded for M9's local-embedding experiment.
      Where a parser WOULD win, recorded so S10 can measure it: word
      order ("Plato's influence on Kant"), and subjects that are common
      words the vault never titled. +2 tests (875 → 877).
- [x] S08g BENCH ROUND 8 (2026-08-16 — DONE same day):
      (1) A CITATION HAS AN EXTENT. The chips render, but a marker says
      only where a citation ENDS — "there is still no visual clue or cue
      of the citation (the length of it for exemple)". The sentence
      carrying a marker is now wrapped with it (`cited-span`, walked
      backward over siblings to the sentence boundary so bold and links
      inside it are captured whole); hovering anywhere in the sentence
      lights the sentence and its chip together. Quiet until asked — a
      permanent tint would repeat the claim-overlay mistake — and pure
      CSS from there.
      (2) REACH, the owner's "sensibility option like from title only to
      title + link pages to etc" — MISREAD FIRST, corrected at S08h by
      the owner: *"links for me was the fact that a note is linked to a
      found note with title match"*. The first implementation made it a
      set of index FIELDS; the real axis is 33's ladder — what MATCHED,
      then how far the graph is WALKED from it:
      `titles` (title match, no expansion) · `linked` (the same match
      plus the notes linked to it, DEFAULT) · `full` (every field
      including bodies, plus expansion). An explicit `hops` still wins.
      Exposed as a `reach · linked` button beside the vault toggle, and
      carried through the packet request, the grounding request and
      main-side validation.
      The correction is worth keeping: `linked` is the whole argument
      for having built the graph — a note earns its place by being
      CONNECTED to a note whose title answered, not by containing the
      word somewhere. Reading it as a field set would have shipped a
      wider lexical net under a graph-shaped name.
      COST NAMED: at `titles`/`linked`, a note that discusses a subject
      without naming it anywhere is invisible — a recall trade, and the
      first thing S10's evaluation should measure. +3 tests (877 → 880).
- [x] S08i BENCH ROUND 9 (2026-08-16, query "what plato brought to
      philosphy" — DONE same day). Two notes arrived through the word
      `what` in a HEADING (`bibi`, `Superheroes`), and bibi's neighbours
      followed through expansion. Frequency alone could not catch it: in
      a bilingual vault `what` is uncommon enough to look like a
      subject. Rule added: when the vault has notes NAMED after some of
      the query's words, only those words rank — the rest is phrasing.
      The df tier still applies inside that pool, so a note titled "What
      is an ethos?" cannot make `what` a subject forever.
      SECOND FIX, found by the first: coverage was computed from what
      RANKED, so it told the owner the vault had nothing on `emotions`
      while a note discussed them. "Does the vault know this word" and
      "should this word decide which notes to send" are different
      questions; coverage now reads the index directly.
      TRIED AND REVERTED, recorded: a relative floor on lexical hits
      (below 25% of the best). It killed the noise, and also killed the
      legitimate case — a note that discusses a subject in its body
      while another is titled after it. The naming rule does the work
      without the collateral damage; a second line of defence that
      cuts real answers is not a defence. +3 tests (880 → 883).
- [x] S08j TITLE IS NOT HEADING (2026-08-16, owner bench round 10: "you
      are not isolating # h1 heading for title search. What the
      difference between heading and title?" — DONE same day). The
      `titles` and `linked` reaches matched the HEADING field, which
      holds every `##` in a note's body, so a title-only search found
      notes through boilerplate — "What is inside", the heading the
      folder-index convention writes into every index. That is how a
      note called `bibi` answered a question about Plato even at reach
      `titles`. Both reaches now match TITLE and PATH only; headings
      belong to `full`, with the rest of what a note says.
      The distinction, recorded because it is easy to blur: the TITLE is
      what a note is CALLED (frontmatter title, else first heading, else
      file name — one string); HEADINGS are its internal structure.
      +2 tests (883 → 885). ranked results with kind pills
      and "why this result", the packet disclosure, and the vault-wide
      broken-links list docked there.
- [x] S10 Evaluation set + D15 (DONE 2026-08-16). `npm run
      retrieval-eval` runs fourteen cases over a 40-file fixture vault
      versioned with the tests — each case written because a real
      question exposed a real rule across the twelve bench rounds — and
      reports recall@5, MRR, per-case coverage and latency. Passing it
      is now a gate: recall 100%, MRR 0.955, and ADR-013's own
      thresholds (cold build < 2 s, p95 < 50 ms) are CHECKED rather than
      remembered. `ATOMIK_EVAL_VAULT=<path>` runs the cost half on a
      real corpus.
      THE INSTRUMENT PAID FOR ITSELF IN AN HOUR, twice:
      (a) a note titled "What is an ethos ?" answered a question about
      Plato — S08f's naming rule treated ANY title token as naming, so
      a term now has to carry half a title (`NAME_TITLE_SHARE`), which
      also retires the frequency patch S08l needed for `to`. While
      fixing it I found that S08l's tier change had never actually
      landed in the file; both constants are now applied and tested;
      (b) a vault containing the word `constructor` CRASHED the index —
      `terms['constructor']` returned Object.prototype's member and the
      build died on `.push`. Null-prototype maps and guarded reads, in
      the retrieval index and in the graph's label registry (kebab
      labels can be `constructor` too). Neither was visible to fourteen
      hand-written test files or to twelve rounds of human benching.
      BENCH RECORD: `docs/research/retrieval-baseline-2026-08-16.md` —
      115-file corpus, build 166 ms, index 8.4 MiB, p95 0.4 ms. Three
      of ADR-013's four thresholds are clear by 12–100×; INDEX SIZE is
      the one to watch, since position lists scale with word count and
      linear extrapolation crosses 100 MB around 1,500 notes. Two cheap
      answers exist before SQLite is needed, and they are recorded.
      D15 GENERATED (`tools/gen-d15-retrieval-workflow.py`) with the
      asserted-geometry discipline extended twice: text must FIT its box,
      and no drawn point may leave the canvas. The second check caught a
      loop elbow twelve pixels past the right edge — which D14's checks
      would have shipped. It carries the evaluation's real numbers and
      shows CP-MVP-011's branch off the coverage verdict, because a
      picture of vault retrieval that stops at "the vault does not know
      this" lies by omission about where that answer goes.
      +6 tests (892 → 898).
- [ ] S11 Owner bench rounds + acceptance record, then the closing
      ceremony, the coherence audit, and the self-merge — after which
      CP-MVP-011 opens with its own (short) opening check.

# Current checkpoint

```text
base commit : 2370546 (branch rebased onto trunk tip 260f964, which
              carries CP-PROVIDERS merged + the two CP-OPS-001 fixes)
current step: S10 done — S11 next (owner bench, acceptance, ceremony, merge)
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
tests       : 892 passing / 71 files (this path added 104 so far),
              typecheck and build green, each gate run BARE (24)
next action : S11 — owner bench on the restarted app, the acceptance
              record, the closing ceremony, `npm run cairn-audit`, then
              status: done and the self-merge
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
