---
type: Atomik Coding Path
title: Wikimedia-augmented chat — live public knowledge, model-driven tools, external citations, and save-as-source (M8/M10)
description: Extends CP-MVP-010's vault-grounded chat with a bounded model-driven tool loop and a Wikimedia-first external rung: Wikipedia article extracts, Wikidata entities in the existing graph contract, Commons P18 media with licence and attribution, Wiktionary etymology, external citations, and an explicit gesture that promotes transient consulted material into a durable source dossier.
tags: [coding-path, m8, m10, wikimedia, wikipedia, wikidata, commons, wiktionary, tool-use, citations, sources]
timestamp: 2026-08-17T00:00:00Z
atomik:
  id: CP-MVP-011
  status: running
  accepted: 2026-08-17
  current_step: S04
  base_commit: 783c7c6
  branch: path/cp-mvp-011
  writes:
    - apps/desktop/shared/wikimedia.ts
    - apps/desktop/shared/generation-tools.ts
    - apps/desktop/shared/chat-citations.ts
    - apps/desktop/shared/context-packet.ts
    - apps/desktop/shared/graph-core.ts
    - apps/desktop/shared/ipc-contract.ts
    - apps/desktop/electron-main/wikimedia.ts
    - apps/desktop/electron-main/generation.ts
    - apps/desktop/electron-main/*-generation-adapter.ts
    - apps/desktop/electron-main/graph-index.ts
    - apps/desktop/electron-main/action-trace.ts
    - apps/desktop/electron-main/web-import.ts
    - apps/desktop/electron-main/web-provenance.ts
    - apps/desktop/electron-main/index.ts
    - apps/desktop/electron-preload/index.ts
    - apps/desktop/renderer/src/workspace/ChatView.tsx
    - apps/desktop/renderer/src/workspace/chat-run.ts
    - apps/desktop/renderer/src/workspace/chat-presentation.ts
    - apps/desktop/renderer/src/editor/citation-chips.ts
    - apps/desktop/renderer/src/editor/chat-file.ts
    - apps/desktop/renderer/src/styles.css
    - apps/desktop/tests/**
    - docs/modules/atomik-desktop-ai.md
    - docs/modules/atomik-desktop-graph.md
    - docs/modules/atomik-desktop-sources.md
    - docs/modules/atomik-desktop-shell.md
    - docs/modules/atomik-desktop.md
    - docs/adr/ADR-015-bounded-wikimedia-grounding-and-model-tools.md
    - docs/learning/**
    - docs/research/**
    - atomik-project/coding-paths/CP-MVP-011.md
    - atomik-project/coding-paths/ACTIVE.md
    - atomik-project/coding-paths/index.md
    - atomik-project/sessions/**
    - atomik-project/audits/**
    - atomik-project/log/**
---

# Goal

CP-MVP-010 made chat aware of what the vault already knows. It deliberately
stops at a `covered | thin | empty` verdict and a list of missing terms. This
path gives the chat harness a bounded next move when local knowledge is thin:

1. **Wikipedia** — search the appropriate language edition and fetch a bounded
   article extract with canonical URL, page/revision identity, and access time.
2. **Wikidata** — resolve an entity to its QID, multilingual labels,
   description, sitelink, and a deliberately small property vocabulary; map
   the result into the same node/edge contract as the vault graph, with
   provenance and no hidden canonical database.
3. **Commons P18** — resolve the curated image associated with an entity and
   show it only with machine-readable licence and attribution. Transient chat
   display may use a remote thumbnail outside private/offline mode; durable
   use requires an explicit local import.
4. **Wiktionary** — retrieve a language-specific entry and expose bounded
   etymology material without upgrading reconstructed or disputed material to
   fact.
5. **Model-driven tools** — add a provider-neutral, budgeted loop in the main
   process. A capable model can choose `search_vault` or `search_wiki`, receive
   typed results, and continue; adapters that cannot express tool calls keep
   the deterministic CP-MVP-010 pre-pass and fail visibly rather than losing
   chat.
6. **External citations and persistence** — external passages reuse the one
   citation renderer CP-MVP-010 established. Consulted material stays
   transient unless the user invokes **Save as source**, which routes through
   the existing web-source machinery and records revision plus `accessed_at`.

The detailed feature rulings came from CP-MVP-010's opening check. The short
opening check for this path reconfirmed the package on 2026-08-17 and kept the
optional `explore_tree` / `file_history` tools out of scope.

# Definition of done

- Wikimedia access is one typed main-process seat with injected transport,
  cancellation, bounded response sizes, timeouts, an identifying user agent,
  explicit language, and typed empty/rate-limit/network/malformed outcomes.
  Renderer code receives data through narrow IPC only and never receives a
  provider key or a generic network primitive.
- Wikipedia search/extract results carry project, language, page ID, revision
  ID or timestamp where exposed, canonical URL, title, exact consulted text,
  and access time. CI tests use pinned fixtures; no test depends on a live API.
- Wikidata resolution returns QID, labels/aliases, description, sitelinks, and
  an S01-pinned allowlist of claims. External entity nodes and relations use
  the existing graph shapes, carry provenance, and remain disposable
  projections until an explicit file import makes knowledge durable.
- P18 resolution follows the Wikidata entity to Commons metadata and refuses
  to present an image without creator/attribution, licence identifier and URL,
  source page, and media URL. Remote media is disabled in private/offline mode;
  durable media is copied locally rather than hotlinked.
- Wiktionary lookup is edition- and language-aware. Etymology output preserves
  attested/reconstructed/disputed/unknown status when the source exposes it;
  absence or parser uncertainty is visible, not rewritten as a confident
  origin story.
- A model tool request is parsed into a provider-neutral discriminated union,
  schema-validated in main, executed through an allowlist, appended as an
  untrusted tool result, and returned to the adapter. Per-turn call count,
  depth, text, byte, time, and cancellation budgets prevent runaway loops.
- The loop can call CP-MVP-010's existing `search_vault` contract and this
  path's `search_wiki` contract. `thin` / `empty` plus `missingTerms` is an
  input to the model, not an automatic network request; the per-thread tool
  control and every actual call remain visible to the user.
- Tool-call support is capability-declared per adapter and regression-tested
  against recorded payloads. Unsupported models retain deterministic
  vault-grounded chat with a visible limitation. No provider-native web-search
  feature bypasses Atomik's tool contract.
- Every external request emits a privacy-safe child ActionTrace with tool,
  corpus, language, result count, bytes, latency, execution location, parent
  operation, and outcome. Queries, article text, prompts, and model outputs are
  not written into telemetry.
- External citations are represented as another source kind in the existing
  citation map: phrase links when emitted, numbered markers otherwise, plus a
  source block. Links open through the app's safe external-navigation path;
  unresolved or stale citations render a diagnostic.
- Chat presents the useful augmentations without confusing illustration with
  evidence: Wikipedia/Wiktionary text and Wikidata claims are cited; a Commons
  image is labelled as media with attribution, never as proof of the prose.
- **Save as source** is explicit and previewable, deduplicates canonical URLs,
  creates or updates the ordinary Markdown source dossier through source-core,
  records source/revision/access metadata, and refreshes the vault/index. A
  cancelled or failed save leaves no partial dossier or orphaned asset.
- A fixture evaluation covers: covered vault (no needless external call), thin
  vault, multilingual entity, ambiguous entity, no result, rate limit,
  malformed tool arguments, unsupported adapter, loop-budget exhaustion,
  cancellation, citation resolution, attribution completeness, and
  save/cancel round trips. A dated owner-vault bench records observed latency
  and tool-call reliability before acceptance.
- Module notes, a first-use learning note, this Work Ledger, and affected docs
  move with each step. The journal is written once at merge. Typecheck, tests,
  build, and Cairn gates run bare and are green on the rebased result.

# Documentation coverage

## Required

- 29-verification-grounding-router — Wikimedia is layer B; misses and
  escalation states remain honest even though M7 verification is later
- 30-public-knowledge-dictionary + ADR-006 — public-knowledge, language,
  revision, licence, attribution, and etymology requirements
- 28-truth-evidence-model + ADR-004/005 — transient grounding is not durable
  knowledge; citation relevance is not epistemic proof
- 33-retrieval-local-execution-cost + ADR-007/008/013 — the external rung
  follows the evaluated lexical baseline and emits bounded receipts
- 26-okf-agent-context — the agent sees typed tools and inspectable omissions,
  never an opaque context dump
- 06-ai-patch-pipeline — generation stays behind one operation door and useful
  output becomes a reviewable durable change
- 04-file-first-model + 07-source-adapters + 08-capture-source +
  09-web-source-tab — files and source dossiers remain canonical; reuse the
  existing web-source import lifecycle
- 13-electron-security — remote content, IPC, navigation, CSP, and provider
  secrets stay behind explicit trust boundaries
- 20-relations-future + ADR-011 — Wikidata entities join the existing graph
  shapes instead of creating a rival graph
- 36-ui-design-system — chat controls, source marks, media, attribution,
  focus, themes, motion, and accessibility floors
- 15-maintainability — one provider-neutral contract, injected transports,
  bounded adapters, and fixture-driven tests
- 17-self-evolving-docs · 18-roadmap §M8/§M10 · 22-agent-handoff ·
  24-doc-templates · 35-coding-path-execution-state · paths.md — scope and
  execution law
- ADR-001/002/003/009/012 — file-first bundles, dossier form, Git-compatible
  writes, durable ledgers, and self-merge

## Conditional

- 03-workspace-tabs — if the per-thread Wikimedia/tool toggle needs persisted
  workspace state
- 05-resource-selection-model — if an explicit selection constrains a tool
  call or save destination
- 11-markdown-page-model — before writing the saved source dossier template
- 12-electron-mvp + 14-app-kernels — if the Wikimedia client earns a distinct
  main-side seat rather than remaining beside generation/source-core
- 27-git-compatibility — when save-as-source creates or updates files
- 31-truth-lens-ux — only if external citation presentation touches truth
  labels; CP-MVP-011 does not implement claim verification
- 32-truth-investigation-record — recheck dated Wikimedia/API/licensing facts
  before choosing endpoints or persistence fields
- 23-references — only for a new external technical dependency; the intended
  implementation uses platform `fetch`

## Deliberately excluded

- `explore_tree` and `file_history` — useful future agent doors, explicitly
  kept outside this path at its opening confirmation
- generic `search_web`, Tavily/SearXNG/scraping backends, provider-native web
  search, claim judging, and layer-C fall-through — M7, not this Wikimedia path
- bulk Wikidata dumps, SQLite entity subsets, Kiwix/ZIM, offline knowledge
  packs, SPARQL self-hosting, and automatic crawl/index — later measured M10
  rungs; live APIs only here
- Wikiquote, Wikisource, Wikispecies, Wikibooks, Wikiversity, Commons depicts
  search, and arbitrary Wikidata properties — possible later corpus routing,
  not the four augmentations accepted here
- embeddings, rerankers, query-rewrite models, a vector store, and a local
  generative model — M9 or a separately evaluated path
- hover cards across every note, automatic image insertion, automatic source
  ingestion, or hotlinks in durable notes — this path's first surface is chat
  and persistence always requires a gesture
- Truth Lens verdicts, claim extraction, background re-verification, and
  contradiction repair — M6/M7
- note-rendering changes owned by CP-RICH-MARKDOWN; CP-MVP-011 touches only
  chat/external-source presentation and rebases around any mechanical overlap
- DSL, studio/canvas, mobile, and packaged Windows work

# Opening-check decisions (2026-08-17)

```text
SCOPE       reconfirm the package already ruled in at CP-MVP-010's opening:
            Wikipedia + Wikidata + Commons P18 + Wiktionary, tool loop,
            external citations, and explicit save-as-source
DEPTH       live APIs; no dump, SQLite entity store, or offline pack
PERSIST     transient by default; only a user gesture creates durable files
TOOLS       search_vault + search_wiki; explore_tree/file_history stay out
WEB         Wikimedia only; generic web-search providers remain M7
ACTIVATE    owner reply, verbatim: "You right"
BASE        783c7c6; branch path/cp-mvp-011; dedicated worktree
```

# Execution

- [x] S01 Bootstrap + contract pins: read every Required document; verify the
      inherited chat, adapter, graph, citation, trace, source-import, security,
      and test seams against the clean baseline; recheck current official
      Wikimedia API/etiquette/licensing documentation; pin the typed contracts,
      budgets, supported language flow, claim allowlist, provenance, adapter
      capability matrix, and fixture corpus in code/tests/docs.
- [x] S02 Wikipedia seat: implement the injected, abortable main-side client,
      bounded search + article extract, typed failures, revision/canonical URL
      provenance, traces, fixtures, and module/learning notes.
- [x] S03 Wikidata + graph bridge: entity search/resolution, labels/aliases,
      sitelinks and pinned claims; disposable external nodes/edges using the
      existing graph contract; provenance, ambiguity handling, and tests.
- [ ] S04 Commons + Wiktionary: P18 metadata/attribution and safe thumbnail
      policy; language-aware Wiktionary/etymology result with status honesty;
      fixture tests, lifecycle/security notes, and no durable hotlinks.
- [ ] S05 Typed Wikimedia door: expose the narrow `search_wiki` operation to
      the harness and renderer through validated IPC where needed; add call
      budgets, cancellation, action-trace parenting, and security regressions.
- [ ] S06 Provider-neutral tool loop: add discriminated tool requests/results
      to generation, implement bounded multi-turn execution, adapt supported
      providers using recorded payload fixtures, and preserve a loud,
      deterministic fallback for unsupported providers.
- [ ] S07 Augmented chat + external citations: per-thread visible tool control,
      call/result disclosure, Wikipedia/Wikidata/Wiktionary sources, attributed
      Commons media, external citation marks/source block, safe navigation,
      persistence, accessibility, and presentation tests.
- [ ] S08 Save as source: explicit preview/confirm gesture through the existing
      source-core/web import lifecycle, revision/access metadata,
      canonical-URL deduplication, rollback/cancel behavior, graph/index
      refresh, and round-trip tests.
- [ ] S09 Evaluation + hardening: full fixture matrix, privacy/security and
      prompt-injection boundaries, loop/cancellation/rate-limit stress,
      no-content telemetry, multilingual checks, and dated owner-vault/tool-use
      bench. Reconcile any declared-write widening in this ledger.
- [ ] S10 Owner acceptance + close: owner re-bench and closing ceremony; rebase
      on local master, run bare typecheck/tests/build/Cairn gates, create the
      coherence audit and per-entry journal, mark `done`, and self-merge.

## S01 work unit — complete 2026-08-17

- **Code:** added pure fixed-host Wikimedia contracts, endpoint/language
  validation, provenance/result/error shapes, conservative product budgets,
  the 21-property Wikidata allowlist and fixture obligations. Added the
  provider-neutral two-tool union, policy/budgets, strict call parser and
  required fail-closed capability declaration on every generation adapter.
- **Tests:** `wikimedia-contract.test.ts` pins host injection resistance,
  endpoint families, explicit language, malformed/widened requests, the
  property/fixture sets, both allowed calls, disabled/unknown/oversize calls,
  and all seven adapters remaining final-only. Full result: 75 files,
  936 passed + 1 skipped; typecheck and production build green.
- **Docs:** ADR-015 records the new main-side Wikimedia/tool-loop boundary;
  the dated research snapshot records official APIs, licensing, rate handling
  and provider codec targets; learning note 25 teaches the pattern; AI,
  sources, graph and shell area notes carry their side of the contract.
- **Ledger notes:** ADR-015 widened the declared write set because changing the
  AI operation/tool boundary is an ADR trigger, not an implementation detail.
  The learning index edit is deliberate catalogue maintenance (17), not a
  generated ACTIVE view. No live response became a fixture or canonical file.

## S02 work unit — complete 2026-08-17

- **Code:** added the injected main-side `WikimediaClient` Wikipedia seat,
  fixed Core REST routing, streaming per-response/total byte gates, sequential
  request budget, linked timeout/caller cancellation, typed HTTP/JSON/empty/429
  failures, main-side HTML-to-bounded-text extraction, canonical revision and
  licence provenance, and a content-free parented Wikimedia trace line.
- **Tests:** dated minimal English/French search/page fixtures plus empty and
  malformed responses; pure extraction; fixed URL/User-Agent/no-redirect;
  provenance; response byte limits; Retry-After; timeout versus cancel; and a
  real private ActionTrace assertion that query/article text cannot leak.
- **Docs:** extended the research snapshot with the French probe, learning note
  25 with streaming/abort/receipt methodology, and source/AI module notes with
  the implemented seat and trace seam.
- **Deviations:** S05 still owns IPC/tool execution and parent generation-trace
  creation. S02 records through an injected sink now, so no unparented live
  trace or premature renderer network door was introduced.

## S03 work unit — complete 2026-08-17

- **Code:** added Action API Wikidata search/entity/label batches to the same
  fixed-host client; language-aware ranked candidates, ambiguity, CC0 revision
  provenance, aliases/descriptions/sitelinks, typed ranks/values, strict
  allowlist and statement/reference caps. Added pure QID-URL GraphIndex
  projection plus a non-mutating session-view merge with separate provenance.
- **Tests:** dated `atom` five-candidate ordering and multilingual Marie Curie
  fixtures; Action API URLs/maxlag; label batching; QID/time/P18 normalization;
  P999 sentinel exclusion; empty/omitted/maxlag outcomes; content-free trace;
  graph node/edge/provenance shapes, no media/time edges, JSON round trip and
  proof that the canonical base graph stays untouched.
- **Docs:** learning note 25 now teaches parse/reduce/enrich and disposable
  graph projection; sources/graph/shell notes record the concrete boundary;
  the research snapshot distinguishes live values from the synthetic sentinel.
- **Deviations:** external edges carry canonical URL objects in the existing
  GraphEdge contract, whose comment now admits that transient form. No writer
  or cache path consumes the merged view; S07 owns presentation integration.

# Current checkpoint

```text
base commit : 783c7c6 (local master and origin/master at activation)
changed     : S01 contracts; S02 Wikipedia; S03 Wikidata normalization and
              disposable QID-URL graph projection with offline fixtures
tests       : typecheck green; 77 files / 947 pass / 1 skip; build + Cairn green
next action : execute S04 — Commons P18 attribution/media policy and bounded,
              language-aware Wiktionary etymology extraction
blockers    : none
parallel    : CP-RICH-MARKDOWN is running; styles.css and broad renderer/test/
              docs surfaces overlap advisory-only. Rebase at step boundaries.
```

# Blockers

None at activation.
