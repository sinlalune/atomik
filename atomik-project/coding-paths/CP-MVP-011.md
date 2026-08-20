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
  current_step: S07
  base_commit: 783c7c6
  branch: path/cp-mvp-011
  writes:
    - apps/desktop/shared/agent-trace.ts
    - apps/desktop/shared/wiki-sections.ts
    - apps/desktop/shared/html-comments.ts
    - apps/desktop/renderer/src/editor/note-markdown.ts
    - apps/desktop/shared/wikimedia.ts
    - apps/desktop/shared/generation-tools.ts
    - apps/desktop/shared/chat-citations.ts
    - apps/desktop/shared/context-packet.ts
    - apps/desktop/shared/graph-core.ts
    - apps/desktop/shared/ipc-contract.ts
    - apps/desktop/electron-main/wikimedia.ts
    - apps/desktop/electron-main/ai-mock.ts
    - apps/desktop/electron-main/generation.ts
    - apps/desktop/electron-main/generation-tool-executor.ts
    - apps/desktop/electron-main/openai-tool-codec.ts
    - apps/desktop/electron-main/*-generation-adapter.ts
    - apps/desktop/electron-main/graph-index.ts
    - apps/desktop/electron-main/action-trace.ts
    - apps/desktop/electron-main/web-import.ts
    - apps/desktop/electron-main/web-provenance.ts
    - apps/desktop/electron-main/index.ts
    - apps/desktop/electron-preload/index.ts
    - apps/desktop/renderer/src/workspace/ChatView.tsx
    - apps/desktop/renderer/src/workspace/ConsultedBlock.tsx
    - apps/desktop/renderer/src/workspace/agent-trace-note.ts
    - apps/desktop/renderer/index.html
    - apps/desktop/renderer/src/icons.tsx
    - apps/desktop/renderer/src/workspace/chat-run.ts
    - apps/desktop/renderer/src/workspace/chat-presentation.ts
    - apps/desktop/renderer/src/editor/request-breakdown.ts
    - apps/desktop/renderer/src/editor/citation-chips.ts
    - apps/desktop/renderer/src/editor/chat-file.ts
    - apps/desktop/renderer/src/styles.css
    - apps/desktop/tests/**
    - docs/modules/atomik-desktop-ai.md
    - docs/modules/atomik-desktop-graph.md
    - docs/modules/atomik-desktop-sources.md
    - docs/modules/atomik-desktop-editor.md
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

# Vision-check decisions (2026-08-17, mid-path)

Session note: `../sessions/2026-08-17-cp-mvp-011-vision-and-provider-order.md`.
Run between S06 and S07 after the owner reported that no bench had happened and
that they had not been walked through the framing. The scope did not change;
the control shape and the provider order became explicit.

```text
CONTROL     wiki mirrors the vault tool: enable toggle + `reach` depth +
            four per-source switches (owner's selection)
CITATION    the citation/media surface is a named S07 deliverable
PROVIDERS   Google → OpenAI ("luna", id to confirm) → Anthropic
            (`claude-fable-5`) → OpenRouter as the BENCHMARKING seat
DIALECTS    two only. openai-chat-completions covers Mistral, Google (its
            adapter uses Gemini's OpenAI-compatible endpoint), OpenAI,
            OpenRouter and DeepSeek; anthropic-messages is the sole second
            codec. S06's codec is generic to the first, so the first four
            of the owner's priorities are a shared extraction plus plumbing
BENCH       moves earlier than S09 — run as soon as a surface exists
OPEN        provider-step position vs S07; the "luna" model id; whether
            ADR-015's pins survive the owner reading it
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
- [x] S04 Commons + Wiktionary: P18 metadata/attribution and safe thumbnail
      policy; language-aware Wiktionary/etymology result with status honesty;
      fixture tests, lifecycle/security notes, and no durable hotlinks.
- [x] S05 Typed Wikimedia door: expose the narrow `search_wiki` operation to
      the harness and renderer through validated IPC where needed; add call
      budgets, cancellation, action-trace parenting, and security regressions.
- [x] S06 Provider-neutral tool loop: add discriminated tool requests/results
      to generation, implement bounded multi-turn execution, adapt supported
      providers using recorded payload fixtures, and preserve a loud,
      deterministic fallback for unsupported providers.
- [x] S06b Shared dialect codec + Google: extract S06's wire grammar into one
      `openai-chat-completions` codec behind adapter hooks, prove the dialect
      against the live endpoint, opt Google in with recorded fixtures, and keep
      every unproven adapter fail-closed. (Added 2026-08-17 from the owner's
      provider order and their ask for provider-transparent layering.)
- [x] S06c Live-bench repairs: run the real rung end to end on the owner's
      provider and fix what only a live request could reveal — partial-success
      loss in `auto`, and read-time `maxlag` disabling the Wikidata seat.
- [x] S07a Wiki control contract + surface: the ruled control shape in the
      composer (enable toggle · reach · four source switches, default off) and
      the main-side authority it derives — allowed corpora, result ceiling,
      media rule, schema emission and independent enforcement.
- [x] S07b Consulted-sources surface: after the owner's bench found the
      lookup invisible, show what each answer read — sources with their exact
      revision, attributed media, corpus warnings — plus the edition control
      the first bench proved necessary.
- [x] S07c Separate the verbs, surface the tool-driven vault read: one switch
      per verb after the owner's bench found wiki silently enabling vault, and
      a surface for the vault notes the model pulls in mid-answer.
- [x] S07d Response-budget degradation: an oversized article no longer fails
      the whole search, and the ceilings match what Wikimedia actually returns.
- [x] S07e External citations through the vault mechanism, one call across
      every enabled source, and the image leading the block.
- [x] S07f Citations that survive a tab switch, an honest hover extent, and
      the velocity question answered by measurement rather than intuition.
- [x] S07g The agent trace, durable beside the transcript: the run becomes a
      note in its own folder next to the chat, linked from the answer, with
      one JSON block — the owner's shape, the architecture delegated.
- [x] S07h The owner's first trace bench: trace every turn, the packet's
      excerpts inside the trace, a wikilink instead of a path, the image
      leading the answer, and two warnings that say something.
- [x] S07i Relevance, not position: the per-article budget is spent by the
      vault's own lexical scorer on the sections that answer the query, and
      the result says what it read and what it left out.
- [x] S07j The bench that read the trace: stop ranking when the query cannot
      discriminate, stop rendering the app's own heading comments as prose,
      and leave a record when an exchange dies.
- [x] S07k The request inspector learns about tools: the tool leg of the
      request is measured, totalled, persisted and openable — the last
      deliverable from the 2026-08-18 bench.
- [ ] S07 Augmented chat + external citations: the wiki control MIRRORS the
      vault tool — a per-thread enable toggle, a `reach` depth control, and
      four per-source switches (Wikipedia · Wikidata · Commons image ·
      Wiktionary etymology), per the 2026-08-17 vision check. Plus call/result
      disclosure, external citation marks/source block with attributed Commons
      media as a named deliverable, safe navigation, persistence,
      accessibility, and presentation tests.
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

## S04 work unit — complete 2026-08-17

- **Code:** completed the two remaining project seats in the injected
  `WikimediaClient`. Wikidata P18 filenames resolve through one bounded Commons
  Action API request only in explicit remote media mode; selected extmetadata
  becomes bounded plain text, upload URLs must be HTTPS on the pinned host, and
  creator/licence/source completeness gates every `CommonsMedia`. Private and
  offline modes skip Commons entirely. Wiktionary now uses fixed-host Core REST
  search/page calls for pinned English/French section pairs, isolates the
  correct language's etymology sections, preserves conservative source status,
  and enforces per-section plus whole-result text budgets.
- **Tests:** added dated minimal Commons and English/French Wiktionary fixtures
  and 12 focused tests for complete attribution, explicit unknown creator,
  missing attribution, non-HTTPS upload rejection, private/offline request
  suppression, exact revision/licence provenance, cross-language isolation,
  conservative status markers, unsupported editions, absent etymology and text
  ceilings. Full result: 78 files, 959 passed + 1 skipped; typecheck and
  production build green.
- **Docs:** the dated research snapshot records the observed Q7186/P18 media
  metadata and English/French Wiktionary revision/section shapes; learning and
  sources/shell notes explain the two fail-closed rules and unchanged IPC
  boundary.
- **Deviations:** Wikimedia's Public Domain metadata did not expose a licence
  URL for the probed file, so the normalizer maps that exact named case to the
  Commons Public-domain reuse page instead of inventing a CC deed. S04 changes
  no preload/IPC surface and writes no media or dossier; S05 and S08 retain
  those responsibilities.

## S05 work unit — complete 2026-08-17

- **Code:** added the unified `WikimediaClient.search` harness door. Specific
  corpora dispatch only to pinned seats; `auto` allocates its result limit
  across Wikipedia/Wikidata and shares one HTTP-call counter, response-byte
  counter and caller AbortSignal across both. One empty corpus can fall through
  to the other, while cancellation and non-empty failures stop immediately.
  Added strict `AiOperation.tools` wire validation and policy language pinning.
  `ActionTraceLedger.beginGeneration` now reserves the root trace before a
  provider turn, accepts Wikimedia children only for that live id/operation,
  reuses the id on completion/failure and flushes interrupted roots. Duplicate
  live operation ids are rejected before replacing their controller.
- **Tests:** unified-door dispatch/auto allocation, fixed host set, shared call
  and byte budgets, cancellation between corpora, partial empty and malformed
  pre-transport rejection; strict tool-preference/mismatched-language cases;
  parent-child id reuse, orphan rejection and interrupted-parent flush; plus
  preload assertions that neither `fetch` nor direct `searchWiki` is exposed.
  Full result: 78 files, 970 passed + 1 skipped; typecheck and production build
  green.
- **Docs:** AI, sources, shell and learning notes record the operation door,
  shared-budget semantics, early parent trace, and unchanged preload surface.
- **Deviations:** S05 adds no second renderer IPC channel. The renderer's
  bounded `tools` preference rides the existing validated `run-ai-operation`
  door; actual `search_wiki` execution remains internal to main. This is the
  narrower reading of “through validated IPC where needed” and prevents an
  out-of-loop renderer search from bypassing policy, parent trace and the AI
  cancellation lifecycle. The declared writes widen to `ai-mock.ts` because
  it owns the existing main-side `AiOperation` wire validator; duplicating
  tool-preference validation elsewhere would leave the IPC gate split. S06 now
  owns actual provider tool round trips.

## S06 work unit — complete 2026-08-17

- **Code:** added `runGenerationWithTools` — the one authority seat for the
  bounded client-tool loop. Adapters expose `startToolLoop` returning a
  discriminated `final` / `tool-calls` turn whose `continue(results)` closure
  keeps provider message state adapter-side, so the loop stays provider-neutral
  while owning parsing, allowlist, call/depth/char/byte/wall budgets, execution
  and cancellation. A rejected or failing call returns an untrusted error result
  the model can recover from; a budget breach, empty turn, undeclared parallel
  calls or a mismatched executor result ends the operation as a typed
  `GenerationError`, with caller cancel and wall exhaustion reported apart.
  Added `generation-tool-executor.ts` binding `search_vault` to the traced
  packet compiler and `search_wiki` to `WikimediaClient.search`, holding the
  parent trace/operation ids and media policy out of renderer and model reach,
  plus `boundedToolContent`, which clips structurally (longest prose, then
  repeated array entries, then a truncation marker) so bounded output stays
  valid JSON. Added `generationToolDefinitions` so advertised schemas derive
  from the enforcing policy. Adapted `mistral-generation-adapter.ts` as the
  first and only native opt-in (`openai-chat-completions`, `parallelCalls:
  false`). `recordRetrieval` now takes the parent triple and refuses a parented
  vault receipt with no live root; `AiResponseBundle.toolExecutions` carries the
  transient typed activity home for S07.
- **Tests:** new `generation-tool-loop.test.ts` — recorded Mistral round trip
  (exact request schemas, call/result id matching, summed usage), malformed
  native arguments returned as an untrusted error without executing, visible
  limitation for final-only adapters, depth and call ceilings, undeclared
  parallel calls, oversize executor output rejected before continuation, unknown
  verb refused as not-allowed without executing, wall budget checked at every
  provider/tool boundary, in-flight executor cancellation, both verbs executing
  with parent context held below renderer state, and hostile long text staying
  valid, untrusted and in budget. No test contacts a live provider or API. Full
  result: 79 files, 983 passed + 1 skipped; typecheck and production build green.
- **Docs:** the AI note records the loop's authority split, the fail-loud
  fallback and the executor's sole ownership of parent ids; the shell note
  records that the loop rides the unchanged `run-ai-operation` door and adds no
  IPC surface; learning note 25 teaches the closure-owned transcript, the bad
  call versus broken operation distinction, why cancellation keeps two causes
  apart, and why bounding happens inside the structure.
- **Ledger notes:** the declared writes widen by
  `electron-main/generation-tool-executor.ts`. The loop's authority and the
  executor's bindings are separate concerns — keeping them in `generation.ts`
  would have given the provider-neutral core direct knowledge of the vault
  compiler and the Wikimedia client, which is exactly the dependency the
  contract exists to invert.
- **Deviations:** a mid-step session change of hands (the prior session
  exhausted its budget with one unresolved `tsc` error). Reality was reconciled
  against this ledger before any new work: `index.ts` captured the reserved root
  trace id in a `const` for the executor closures, keeping the outer `let` for
  the failure path where the id may never have been reserved. Only Mistral is
  adapted; the remaining six adapters stay final-only by capability declaration.
  S07 owns rendering `toolExecutions` as disclosure and external citations.

## S06b work unit — complete 2026-08-17

- **Code:** added `electron-main/openai-tool-codec.ts` — the
  `openai-chat-completions` dialect in one place: schema emission, call
  parsing, `role:"tool"` continuation, usage accumulation, and an
  `OpenAiTurnHooks` seam through which an adapter supplies only transport,
  usage arithmetic and result shaping. Mistral moved onto it (its local
  wire type and duplicate parser deleted). Google refactored from a monolithic
  `generate` into `request`/`usageOf`/`completionResult` and opted in natively
  through the same codec. The codec ECHOES the provider's assistant turn
  verbatim instead of rebuilding it, and Google's usage folds
  `total_tokens - prompt_tokens` into output.
- **Tests:** the fail-closed capability test now asserts exactly which ids are
  native and that both proven adapters declare the same dialect with parallel
  calls off. Added dated Gemini call/final fixtures and two tests: a full
  two-turn round trip proving the emitted schemas match Mistral's, the absent
  `content` key parses, the executor receives the VALIDATED call with pinned
  defaults, and `extra_content.google.thought_signature` survives the
  continuation byte-for-byte; plus a usage test pinning the thinking-token
  correction (118 tokens that `completion_tokens` alone would have missed).
  Full result: 79 files, 985 passed + 1 skipped; typecheck and build green.
- **Docs:** `docs/research/provider-tool-calling-snapshot-2026-08-17.md` records
  the live probe, the dialect map, and the documentation-only facts for
  OpenAI's `gpt-5.6-luna` and Anthropic's `claude-fable-5`. The AI note carries
  the codec seam and the verbatim rule; learning note 25 teaches counting
  dialects rather than vendors, and why a normalized copy never substitutes for
  the original wire.
- **Ledger notes:** the declared writes already covered
  `*-generation-adapter.ts`; they widen by `electron-main/openai-tool-codec.ts`
  and `docs/research/**` (already declared). The owner's broader ask — layering
  transport, auth, model catalogue and pricing so a new provider is a
  declarative profile — is deliberately NOT done here: it would rewrite six
  working adapters and belongs to its own labelled path, agreed with the owner
  on 2026-08-17. S06b does the tool-dialect layer only.
- **Deviations:** one live request was made against Gemini with the owner's own
  key, at their explicit instruction, to observe the tool-call shape rather
  than assume it. It printed structure only, never the secret; the probe script
  was discarded and no live response became a canonical file — the fixtures are
  minimal hand-reduced records with a placeholder thought signature.

## S06c work unit — complete 2026-08-17

- **Bench (the point of the step):** ran the whole rung live for the first
  time — real `gemini-3.7-flash` through the shared codec, the bounded loop,
  and real French Wikimedia, on the question *"Qui était Marie Curie ?"*. It
  works: the model called `search_wiki`, received bounded French articles, and
  answered in French with content-free parented receipts. The run also exposed
  two defects no fixture could have shown.
- **Code:** (1) `auto` rethrew any non-`empty` corpus failure, so a transient
  Wikidata error DISCARDED articles Wikipedia had already returned — observed
  live. A corpus failing after the other has delivered now yields a
  `corpus-unavailable` warning (new `WikimediaWarningKind`) instead of failing
  the search; `cancelled` and `budget-exceeded` still stop it, because those are
  decisions rather than weather. (2) Removed `maxlag=5` from the Action API
  READS: it counts the query service's lag (~16.6s at the time), returns the
  error under HTTP 200, and made the Wikidata seat fail on every attempt.
  Measured directly: with maxlag, `error.code: maxlag`; without, Q7186 returned
  immediately.
- **Tests:** two regressions pinning the bench findings — a transient Wikidata
  failure keeps Wikipedia's results and surfaces the warning while the failed
  corpus still files its receipt, and cancellation is never degraded to a
  warning. The maxlag assertions now pin its ABSENCE with the reason. Full
  result: 79 files, 987 passed + 1 skipped; typecheck and build green.
- **Docs:** the dated Wikimedia snapshot records the maxlag measurement and the
  HTTP-200-with-error-body trap; the sources note carries both corrections and
  their measured effect; learning note 25 teaches what only a live run tells
  you — politeness that disables the feature, and degrading weather but never a
  decision.
- **Measured effect** on one French question, across three live runs:

```text
before          2 tool calls · Wikidata dead   · 11.9s · $0.0039
partial-success 1 tool call  · Wikidata dead   ·  9.6s · $0.0026
maxlag removed  1 tool call  · Wikidata ALIVE  ·  5.6s · $0.0034
```

- **Deviations:** three live Gemini requests and two direct Wikidata probes on
  the owner's key, at their instruction. Structure and prose printed, never the
  secret; the bench script stayed outside the repository and was discarded. No
  live response became a fixture. `claims: 2 / evidence: 0` is expected here —
  binding external passages to citations is S07's work, and this run is the
  evidence that there will be something to cite.

## S07a work unit — complete 2026-08-17

- **Code:** widened the tool preference to `{mode, wikiLanguage, wikiReach,
  wikiSources}` — the renderer half optional, main resolving defaults — and
  split the wire type from the resolved one so omitting the fine-tune is
  correct rather than an error. `createGenerationToolPolicy` now derives
  `wikiCorpora`, `wikiLimit` and `wikiMedia` from the switches; every source
  off removes `search_wiki` from the allowlist. `generationToolDefinitions`
  advertises only the live corpora and the reach ceiling;
  `parseGenerationToolCall` refuses a switched-off corpus and clamps reach and
  media. `ChatView` gained the control group mirroring the vault tool, a
  `GlobeIcon`, source-switch styles, and `wikiLanguageOf` deriving the edition
  from the user's locale. The image switch disables itself when Wikidata is
  off, because P18 is how a file is found.
- **Tests:** contract-level — derived corpora/limit/media, a switched-off
  corpus refused, reach and media clamped, the schema advertising only live
  corpora, and the verb disappearing when everything is off. Renderer-level —
  the toggle defaults OFF, `tools` rides only while it is on, the control
  mirrors the vault tool's parts, the image switch is disabled without
  Wikidata, on/off states are visually distinguishable, and the locale label is
  validated. Full result: 79 files, 989 passed + 1 skipped; typecheck and
  build green.
- **Docs:** the AI note records the control shape, the renderer-asks/main-derives
  split, and the advice-versus-authority rule between schema and parser.
- **Ledger notes:** declared writes widen by `renderer/src/icons.tsx` — the
  control needed a glyph of its own, and the icon set is where every other
  chat control's glyph already lives; putting it anywhere else would have been
  the odd choice.
- **Deviations:** default OFF and the locale-derived edition were my calls
  inside the owner's ruling — they asked for "possibility to enable it" and
  named no language control. A visible language picker is deliberately NOT
  added here; if the owner wants to read a different edition than their locale,
  that is a small follow-on. S07 still owes the call/result DISCLOSURE and the
  citation/media surface — this step delivers the control, not the display.

## S07b work unit — complete 2026-08-18

- **Owner bench that drove it:** S07a shipped the control and the owner ran it
  on David Hume. The trace ledger proves the rung worked — `search_vault`
  (92ms), `search_wiki` wikipedia (3 requests, 2 results, 1.8 MB, 4.1s) and
  wikidata (4 requests, 1 result, 198 KB, 1.8s), all parented to one
  generation — but the answer surfaced none of it. Verdict, verbatim: *"no wiki
  citation or element surfacing on the answer UI after 7300 input token, no way
  to inspect the packet send, no photo"*. The same trace also showed
  `language: "en"` on a French user's machine.
- **Code:** `consultedMaterialOf` (pure) flattens `toolExecutions` into
  deduplicated sources, attributed media and warnings; `ConsultedBlock` renders
  them under the answer with kind, title, project·language, the exact revision
  read, and a copy-link. A Wikidata entity displays its label rather than its
  QID. Media shows creator and licence beside the image and is dropped
  entirely if any part of the attribution is missing. Added the `lang · xx`
  edition control, seeded from the locale but no longer dictated by it.
- **Security:** the renderer CSP's `img-src` widens by one pinned host,
  `https://upload.wikimedia.org` — the transient thumbnail this path's
  definition of done allows, on the same host the main-side client validates.
  A test pins the exact policy string so another host cannot be added quietly.
- **Tests:** the pure layer — one source per page across repeated calls, the
  revision carried through, entity label over QID, media dropped when
  attribution is incomplete, warnings deduplicated, vault payloads and failed
  calls inventing nothing. The surface — consulted material attaches to the
  ANSWER turn, attribution sits beside the image, the revision is shown, and
  the edition is a choice. Plus the CSP assertion. Full result: 80 files,
  1004 passed + 1 skipped; typecheck and build green.
- **Docs:** the AI note records why this is a source surface rather than a
  second citation system; the shell note records the image-policy widening and
  its limits.
- **Deviations:** two of the owner's four asks are deliberately NOT in this
  step. In-app navigation for a consulted URL belongs with the web-source
  lifecycle that S08 already owns, so links copy rather than pretend. And the
  request INSPECTOR — seeing the exact packet sent, including tool results —
  plus persisting the agent trace beside the transcript for audit, is its own
  work unit (S07c): it changes the chat file format, which deserves its own
  gates rather than riding along here.

## S07c work unit — complete 2026-08-18

- **Owner bench that drove it, verbatim:** *"separate the toggle of vault and
  wiki, wiki alone don't need vault, still no surface of context packet
  accessible"* — with a screenshot showing an answer that began "Based on your
  note zinedine zidane.md" while the vault switch was OFF.
- **Code:** `createGenerationToolPolicy` derives the allowlist from each switch
  separately: `vault` gates `search_vault`, the wiki sources gate
  `search_wiki`. The renderer sends `vault: grounding` alongside the wiki
  preference; an omitted `vault` still resolves to true, so no pre-S07c caller
  changes behaviour. `runGenerationWithTools` returns the plain generate path
  when the allowlist is empty, rather than sending `tools: []`.
  `consultedMaterialOf` gained `notes`, flattening `vault-context` payloads
  into the notes the model asked for by calling the verb, and `ConsultedBlock`
  renders them with the stage, estimated tokens and the reason as a tooltip;
  clicking one reveals the note in the pane.
- **Tests:** the vault verb appears only with its switch on and is refused
  otherwise; wiki-only and vault-only policies each expose exactly one verb;
  both off yields no verbs, no schemas, and no loop start at all (proven
  through `runGenerationWithTools` with an adapter that fails if entered).
  Plus tool-driven notes deduplicated per path, and a payload-less call
  inventing nothing. Full result: 80 files, 1007 passed + 1 skipped; typecheck
  and build green.
- **Docs:** the AI note records the one-switch-per-verb rule, the empty-allowlist
  behaviour, and the question/answer split between the pre-pass packet and a
  tool-driven read.
- **Still open from the same bench:** the request INSPECTOR does not yet
  represent tool activity — the breakdown pills describe the pre-pass packet
  only, so a turn whose context came from a tool call shows nothing there.
  That, plus persisting the agent trace beside the transcript for audit, is
  S07d.

## S07d work unit — complete 2026-08-18

- **Owner bench that drove it:** `ai(budget-exceeded): wiki(budget-exceeded):
  response body exceeds budget` — a hard failure on an ordinary question.
- **Diagnosis, measured live:** the French "Zinedine Zidane" article comes back
  as 3.4 MB of decompressed `with_html`, against a 2 MB per-response ceiling.
  The biggest articles are the famous subjects people actually ask about, so
  the limit failed precisely the useful cases.
- **Code:** ceilings raised to 6 MB per response / 18 MB per search, and an
  oversized page inside a multi-hit search is skipped with a `truncated`
  warning naming it rather than failing the search. Every candidate too large
  reports `empty`, the one kind `auto` falls through on, so the other corpus is
  still consulted. A single-hit search still fails loudly — nothing to keep.
- **Tests:** skip-one-keep-the-rest over a new two-hit fixture, the
  all-too-large case reporting `empty`, and the single-hit case still failing.
  Full result: 80 files, 1009 passed + 1 skipped; typecheck and build green.
- **Verified live:** the owner's exact query now returns 2 French articles, the
  Q1835 entity AND an attributed Commons photograph (Hadi Abyar, CC BY 4.0),
  with the truncation and ambiguity warnings surfaced.
- **Docs:** the dated snapshot records the measured article size, that the
  counter is decompressed bytes, and that `with_html` fetching megabytes for a
  6,000-character extract is the real inefficiency — raising the ceiling treats
  the symptom, and a lighter endpoint would move revision provenance with it.
  Latency is the other half: 11.8s for the Wikipedia leg at limit 3, which
  argues for `quick` being the honest conversational default.

## S07e work unit — complete 2026-08-19

- **Owner bench that drove it, verbatim:** *"where are wiki citations? It is
  just using quoteblocks instead of the mechanism we built for vault
  citation... The photo appear but in the end with the context packet list,
  but would want it first and well presented. Also it seems that it didnt use
  all sources when all were activated, but was capable to use it if asked in
  chat"* — with a transcript showing blockquote attributions and one corpus per
  question.
- **Code:** citation numbers are assigned in the executor, continuing after the
  request's vault references (`citationOffset` from main), and travel back in
  the tool result's `_atomik` envelope with `EXTERNAL_CITATION_INSTRUCTION`.
  `CitationSource` gained an `external` arm so one numbering, one parser and
  one chip renderer serve both kinds; external chips carry a URL rather than a
  path. `auto` became "every corpus switched on", carried from the policy into
  the search context with the allowance spread across them, and Wiktionary
  joined the shared-budget convention. Tool descriptions now state WHEN to
  call. The consulted block leads with the image, captioned with file, creator
  and licence, and lists each source with the number the model was given.
- **Tests:** the number main assigns reaches the displayed source and an
  unnumbered source stays unnumbered; the executor hands the model a `cite`
  list plus an instruction that names the blockquote failure mode; `auto`
  covers every enabled corpus with the old 3/2 split preserved for two.
  Full result: 80 files, 1012 passed + 1 skipped; typecheck and build green.
- **Verified live** on the owner's own question (`biologie`, all four sources
  on): ONE `auto` call returned Wikipedia [1], Wikidata [2], Wiktionary [3] and
  one attributed image, and the French answer carried 26 numbered markers with
  ZERO blockquote attributions.
- **Open, deliberately:** trace persistence and the request inspector remain
  S07f. The owner delegated the trace architecture and suggested a separate
  folder linked from the chat note with a JSON block — that shape is accepted
  and not yet built. Fetches are still deliberately sequential (S02), which is
  where the 8–12s exchanges come from; parallelising the per-article reads
  behind the shared budget is the next velocity lever and is not attempted
  here.

## S07f work unit — complete 2026-08-19

- **Owner bench:** *"the render of citation disapeared after tab switching,
  also I don't know if it was the purpose but when it rendered the whole
  paragraph had the highlight on hover when the number pill was in the
  middle"*, plus a question about parallel fetching.
- **Code:** external citations persist with the turn through the existing
  `cited:` meta (the URL is the path) and are restored as external, so a
  reopened chip points outward rather than at a note. The cited extent ends at
  the sentence's last marker when prose still follows it, keeping one extent
  per sentence so spans never overlap.
- **Velocity, measured rather than assumed:** page reads were parallelised at
  concurrency two and the change was REVERTED. Three samples (15.5s / 12.3s /
  12.4s) bracket the 11.8s sequential baseline: the leg moves ~3.4 MB, so it is
  bandwidth-bound and two downloads share one pipe. Corpus-level parallelism
  was measured at ~11% (Wikipedia 11.8s versus Wikidata 1.5s) and rejected
  because it costs two guarantees S05 bought deliberately — the shared byte
  ceiling stopping a later corpus from starting, and cancellation preventing
  one from starting at all. The real lever is fetching LESS: `prop=extracts`
  with `explaintext` returns the text directly, with the revision from the same
  query, at a few KB instead of megabytes.
- **Tests:** the owner's own sentence pinned as a regression (the extent stops
  at the pill), a marker before punctuation still covering its sentence, and
  the existing same-extent invariant still passing. Full result: 81 files,
  1085 passed + 1 skipped; typecheck and build green.
- **Docs:** the dated snapshot carries the three latency samples and names the
  `extracts` change as the next lever; the AI note records both fixes.

## S07g work unit — complete 2026-08-19

- **Owner ask that drove it:** the 2026-08-18 bench left the run invisible
  after the fact. The owner DELEGATED the trace architecture and gave one
  shape — a separate folder linked from the chat note, with a JSON block.
  S07e recorded that shape as accepted and unbuilt; this unit builds it.
- **Code:** `shared/agent-trace.ts` (pure) turns one finished exchange into a
  record and a readable note; `renderer/src/workspace/agent-trace-note.ts`
  writes it through an INJECTED `createNote` — the exclusive vault verb, so
  parents are made by the verb and a taken name walks the same `-2`, `-3`
  suffix ladder the transcript's birth uses. The note lands in
  `chats/<day>/<slug>-traces/turn-NN.md`, one level below where `chatHistoryOf`
  looks, so a trace can never be mistaken for a chat. The answer's heading
  carries `<!-- trace:<path> -->` beside `run:`/`cited:`/`packet:`, and a
  receipt button on the turn opens it. ChatView's tool preference became a
  named `toolPreference` so the trace records what the send actually carried
  rather than state re-read afterwards.
- **The ruling this step needed, recorded in ADR-015:** two ledgers, two
  questions. `.atomik/usage/private/actions.jsonl` stays content-free
  telemetry ("what did this cost"); the trace note answers "what did THIS
  answer stand on" and therefore records the query the model wrote, the
  corpus, the revision and the licence. It NEVER records the fetched prose —
  article extracts, packet excerpts, the untrusted `content` — because that
  would make a durable copy of public material as a side effect of
  consultation, the exact promotion S08's Save as source exists to make
  deliberately.
- **Deliberate limits:** only an exchange with real tool activity earns a
  file (a plain answer is already described by its own heading comments), and
  a trace that cannot be written returns null instead of throwing — the answer
  is the user's work and must land; the missing trace button beside a
  populated consulted block is itself the visible signal.
- **Tests:** 18 new — the query is recorded verbatim, a failed call and its
  error code survive, the distinctive fetched prose and packet excerpt appear
  NOWHERE in the serialized note while every identity does, coverage terms
  explain the escalation, a record stays valid with no packet and no usage,
  the note round-trips, a mangled note reads as null, the folder never enters
  the history menu, the `trace:` comment parses and a mangled path reads as
  absent, and the writer retries a taken name, writes nothing without tools,
  and loses the audit rather than the answer when the vault refuses. The S07a
  assertion that pinned the inline `...(wiki` conditional was updated to the
  named preference, same intent. Full result: 82 files, 1103 passed + 1
  skipped; typecheck and build green.
- **Declared writes widened, recorded here per `paths.md`:** two new files the
  opening declaration could not have named — `shared/agent-trace.ts` (the pure
  record and note) and `renderer/src/workspace/agent-trace-note.ts` (the IO
  half) — plus `docs/modules/atomik-desktop-editor.md`, which owns the chats
  convention the trace's address extends. All three are now in `writes:`.
- **Not benched yet:** written and gated, not yet run in the real app on the
  owner's provider — the request-inspector half of the 2026-08-18 bench is
  still unbuilt, and the two want one bench together.

## S07h work unit — complete 2026-08-20

- **Owner bench, verbatim:** *"Why not trace for every turn? why not bringing
  packets temporary in a different folder? Also in chat log, we mention the
  path of the trace but maybe wikilink better? … photo still after text …
  why articles clipped? what means ambiguous for wikidata?"* — benched live on
  `google`, against `vault-juju/chats/2026-08-20/emmanuel-macron.md` and its
  `emmanuel-macron-traces/turn-03.md`, both read directly before answering.
- **Every turn is traced.** The S07g rule ("only exchanges with tool
  activity") was refuted by turn 1 of the owner's own file: no tools, so no
  trace, on the exchange most worth auditing — *"Je ne trouve aucune
  information concernant Emmanuel Macron dans les notes de référence"*.
- **Packet excerpts ride the trace** (owner chose one file per turn over a
  separate packets folder). The no-prose rule bars fetched PUBLIC text; a
  vault excerpt is the user's own note quoted from a file one folder away, so
  it duplicates nothing and is the only way to see what was read of your own
  vault after the tab closed. ADR-015 now states both halves of the line.
- **The link is a wikilink.** `<!-- trace:[[chats/…/turn-03]] -->`:
  `parseEdges` skips fenced blocks and code spans but NOT html comments, so
  the trace becomes a graph node while staying invisible in the render — and
  stays out of the thread history a visible link line would join.
  `parseTraceMeta` still reads the S07g bare path; only the wikilink form may
  omit `.md` (a bare `x.txt` stays wrong instead of becoming `x.txt.md`).
- **The trace note's H1 is plain text** with the chat wikilink on its own
  line. Found while answering, not reported: an H1 containing a markdown link
  had become the note's TITLE everywhere the graph shows one.
- **The image leads the ANSWER** (`ConsultedMediaBlock` above `ClaimBody`).
  S07e's claim that "the image leads" was true only inside the consulted
  block, which renders after the prose AND after the citation footer — so
  first-in-the-block was still last on screen.
- **Two warnings that say something.** `truncated` names the articles and the
  cap they hit (`maxArticleTextChars`, 6 000 — the fr Macron article is
  hundreds of thousands of characters, so the model read its head).
  `ambiguous` never meant "this entity is doubtful": Wikidata returned more
  candidates than the reach's slots and the top-ranked one was taken; it now
  names the chosen entity with its QID and how many it beat.
- **Tests:** 21 in the trace file (up from 18) plus one in the chat view — the
  wikilink round-trips and the bare path still resolves, a no-tool turn IS
  traced, the excerpt is kept while the fetched prose still cannot appear, the
  H1 is plain and the chat link is a wikilink, and the media block renders
  before the answer body while the consulted block no longer holds media. The
  Wikidata ambiguity assertion was rewritten for the new message. Full result:
  82 files, 1107 passed + 1 skipped; typecheck and build green.
- **Open, unanswered by the owner:** whether 6 000 chars per article is still
  the right budget now that its cost in answer depth is visible — S07f already
  named `prop=extracts&explaintext` as the way to buy more text for fewer
  bytes.

## S07i work unit — complete 2026-08-20

- **Owner ruling, verbatim:** *"We cant set a limit to a page if we have no
  tool to semanticaly or lexicaly assert that we have reach the part that fit
  the answer"* — after reading the `truncated` warning in their own trace.
  Correct, and it names a real defect: `maxArticleTextChars` cut the FIRST
  6 000 characters of the flattened page, so a question about a 2023 pension
  reform got the lead and the early biography, with a warning implying the
  loss was incidental.
- **Code:** `shared/wiki-sections.ts` (pure) scores sections with BM25 over
  `retrieval-core`'s tokenizer — the vault's own scorer, same constants, same
  folding, no new dependency and no embeddings (M9; 33's lexical baseline is
  what this rung is measured against). The SECTION is the document and the
  ARTICLE is the corpus, because an idf over all of Wikipedia says nothing
  about which paragraph of this page answers. `wikipediaTextOfHtml` splits at
  top-level headings (Parsoid `<section>` first, `h2/h3` walk as fallback),
  takes the query, and returns `{text, truncated, kept, skipped}`; the lead is
  always kept, capped at 40% of the budget, and reclaims what the competitors
  do not spend. Winners return to READING order, each labelled with its
  heading. `WikipediaArticle.sections` carries `{kept, skipped}` and the
  warning names them.
- **Deliberately NOT done here** (owner's scope call, 2026-08-20): the
  Wikidata-first tree, sitelink routing to other Wikimedia projects, and
  harvesting the source links on a page open as their own path. Two findings
  recorded for its opening check: `wikipediaSitelinksOf` keeps only
  `${lang}wiki` and `enwiki` and drops every other sitelink Wikidata returns,
  and `REMOVE_FROM_ARTICLE` strips `.mw-references-wrap`/`.reflist`/
  `.catlinks` before flattening to `textContent`, so no link of any kind
  survives. The boundary that path must respect: handing the model a link
  with its context stays inside ADR-015's fixed-host allowlist; FETCHING an
  arbitrary reference is generic web retrieval — M7, bedrock 13.
- **Tests:** 13 new — the answering section wins over the first one, the lead
  always leads and is capped but reclaims unspent budget, kept sections come
  back in reading order and carry their headings, a heading match outscores a
  longer irrelevant body, an empty query falls back to reading order, a
  fitting article reports nothing dropped, and an empty article survives.
  Full result: 83 files, 1119 passed + 1 skipped; typecheck and build green.
- **Not benched:** the selection changes what the model reads, so it wants a
  real question against a long page — the owner's `réforme des retraites`
  case is the obvious one.

## S07j work unit — complete 2026-08-20

- **Owner bench** on `chats/2026-08-20/macron-et-la-réforme-des-retraites.md`,
  three exchanges, live on `google`. Verified from the owner's own files: every
  answered turn traced (turn-02 with `calls: []` — the hole the first bench
  found), wikilink comments, plain H1 plus `Chat: [[…]]`, accented paths
  round-tripping, and S07i reporting *"read (lead), Manifestations et grèves
  en 2023; 12 other sections did not fit"*. Verdict: *"seems ok for me"* —
  with two things it did not cover.
- **Ranking that could not rank.** The model searched *"réforme des retraites
  en France en 2023"* and got the article of that name. Every section carries
  every query term, so the idf collapses and ranking measures keyword DENSITY
  — §Manifestations et grèves beat §Contenu because it is long and repeats the
  topic. `SATURATION_SHARE` (0.6 of sections, four sections minimum) detects
  the case and returns to reading order; `focused: false` travels with the
  article so the warning says the page was read from the top rather than
  ranked. The owner's instruction on being shown this: *"now"*.
- **The app's bookkeeping rendered as prose.** `noteMarkdown()` runs
  `html: false`, which ESCAPES comments instead of dropping them, so every
  transcript opened as a note displayed `you <!-- sent: system=2646… -->`.
  `shared/html-comments.ts` strips comments from the source before parsing,
  skipping fences and inline code so a note teaching html comments still can.
  `html: true` would have hidden them and opened the door 13 keeps shut.
  Pre-existing since CP-MVP-008's `sent:` idiom; S07g's `trace:` comment made
  it impossible to ignore.
- **The stray `## you`, explained and recorded.** Two identical questions, the
  first with no answer: the design deliberately keeps a question whose run
  failed or was cancelled, but nothing said so. The trace record gained
  `outcome`, the failure path writes one with the error, the you-turn is
  stamped `unanswered:[[…]]` when a trace actually landed (a marker pointing
  at no record would claim a record exists), and the turn shows a quiet line
  offering to open it. The recording sits in its own catch: a failed record
  must never replace the failure the user needs to see.
- **Declared writes widened:** `shared/html-comments.ts` and
  `renderer/src/editor/note-markdown.ts`. The latter is note RENDERING, which
  this path's excluded list assigned to CP-RICH-MARKDOWN — that path has
  merged, and the defect is this path's own comment idiom leaking, so the fix
  belongs here rather than in a path that no longer exists.
- **Tests:** 7 new for comment stripping and the failure record (the heading
  bookkeeping never renders, a fence or code span keeps its example, a
  multi-line comment swallows a fence marker, raw html is still escaped, the
  failure path traces and marks) plus 2 for saturation (reading order when the
  query matches the whole page; ranking still applies when it discriminates).
  Full result: 85 files, 1146 passed + 1 skipped; typecheck and build green.
- **Re-benched the same day** (`macron-et-la-réforme-des-retraites-4`), and it
  failed twice over — the finding, and the fix:
  - The saturation rule did not trip. A MEAN share across query terms is the
    wrong instrument: "2010" discriminated, dragging the average under the
    threshold while "réforme", "des", "retraites" and "en" still appeared in
    every section. The rule is per TERM now — a term in ≥ 80% of sections is a
    stopword for this page and does not vote; when none survive, reading order
    and `focused: false`.
  - Worse, and unreported: `Réforme des retraites en France en 2010 — read
    (lead), Notes et références`. The reference list won the entire budget,
    because a bibliography repeats the page title in every citation. Apparatus
    sections (notes/références, bibliographie, voir aussi, liens externes,
    annexes, and their English forms) are dropped before scoring, and the
    truncation figure is measured against what remained readable.
  - Two more tests pin both. Full result: 85 files, 1148 passed + 1 skipped.
- **Third iteration** (`macron-et-la-réforme-des-retraites-5`, checked at the
  owner's invitation): the apparatus fix landed — the candidate pool fell from
  14 sections to 12 — but §Manifestations et grèves STILL took the budget and
  the warning still claimed to have ranked. One surviving term ("2023", which
  also sits in that heading) was enough to keep the scorer confident. Two
  indirect instruments had now failed, so the page is asked directly: when
  ≥ 80% of the query's terms appear in the article TITLE, the query restates
  the subject and cannot rank its parts (`TITLE_MATCH_SHARE`), and the article
  is read from the top. Two more tests: the title case reads in document order
  and never lets the long repetitive section in; a query that goes BEYOND the
  title ("motion de censure") still ranks. Full result: 85 files, 1150 passed
  + 1 skipped; typecheck and build green.

## S07k work unit — complete 2026-08-20

- **The gap, from the 2026-08-18 bench:** the breakdown pills described the
  pre-pass packet only. An answer that called three corpora looked like it had
  sent nothing but the packet, and the header's "~N tok sent" disagreed with
  the provider's reported input for no visible reason.
- **Code:** `toolRequestParts` (pure, in `request-breakdown.ts`) turns each
  execution into a part of the same shape as the others — label
  `search_wiki · auto · 3 results`, chars as the executor measured them
  returning to the model, `search_wiki · failed` when the call did not land.
  They join the SAME breakdown the header totals and persist in `sent:` like
  every other figure. The pill opens, as the vault pill does, onto each call
  with the query THE MODEL WROTE, its result count, chars and wall time, or
  its error. Calls attach to the QUESTION (their results are input); consulted
  material stays with the answer.
- **Tests:** 7 — the part's figures and label, a failed call counting no
  phantom results, a vault call named by its own verb, the hover copy, the
  parts reaching the totalled breakdown and the persisted meta, the pill
  opening, and the calls attaching to the question rather than the answer.
  Full result: 86 files, 1157 passed + 1 skipped; typecheck and build green.
- **Declared writes widened:** `renderer/src/editor/request-breakdown.ts` —
  the inspector's own module, which the opening declaration named only through
  `chat-presentation.ts`. Same surface, one file further in.
- **Not benched.** With S07j it wants one pass on a restarted dev server —
  the round-6 trap is one commit above this in the ledger.

# Current checkpoint

```text
base commit : 783c7c6 (local master and origin/master at activation)
changed     : S01 contracts; S02 Wikipedia; S03 Wikidata/graph projection;
              S04 Commons+Wiktionary; S05 unified main-side search_wiki door,
              strict IPC preference, shared budgets and early parent traces;
              S06 provider-neutral bounded tool loop, main-side executor with
              parented vault receipts, and the native Mistral opt-in;
              S06b shared openai-chat-completions codec + native Google;
              S06c live-bench repairs (partial-success in `auto`, read maxlag);
              S07a wiki control contract + composer surface (default off);
              S07b consulted-sources surface, attributed media, edition control;
              S07c one switch per verb + tool-driven vault read surfaced;
              S07d response-budget degradation (skip the page, keep the search);
              S07e external citations, one call across every enabled source;
              S07f citations persist, honest hover extent, velocity measured;
              S07g agent trace persisted beside the transcript, linked from
              the answer, public-prose-free by rule (ADR-015);
              S07h owner's first trace bench — every turn traced, packet
              excerpts inside the trace, wikilink not path, image leads the
              answer, truncated/ambiguous warnings name what they mean;
              S07i the per-article budget SELECTS by lexical relevance
              instead of cutting the first 6 000 characters;
              S07j saturation fallback, html comments never render, and a
              dead exchange leaves a trace + an unanswered marker;
              S07k the request inspector accounts for the tool leg
rebased     : 2026-08-20 onto trunk tip f58093e (the owner merged
              CP-AI-CAPABILITIES mid-session). One conflict, in
              `tests/chat-view.test.ts`: both paths opened a new describe
              block at the same line. Both kept. Gates re-run on the REBASED
              result, per the rule.
tests       : typecheck green; 86 files / 1157 pass / 1 skip; build green
bench       : 2026-08-20 (second), `macron-et-la-réforme-des-retraites`, live
              on google — S07g/S07h/S07i all confirmed in the owner's own
              files; the two gaps it exposed became S07j. Earlier the same
              day, live, google + fr.wikipedia + wikidata + wiktionary
              + Commons — one `search_wiki` call, 6.8s, 3 sources numbered
              [1][2][3], ~$0.00047, French answer; the trace note landed and
              the owner read it. Findings became S07h. Earlier: 2026-08-17,
              gemini-3.7-flash, one call, 5.6s, ~$0.0034
reconciled  : 2026-08-19 on resume. S07f is DONE (656e6d8) and this line
              still ordered it — the checkpoint-accuracy hole paths.md names.
              Verified on the rebased branch: clean tree, contains trunk tip
              80b131a, cairn-check OK (1 advisory: no audit for this head),
              typecheck + 81 files / 1085 pass / 1 skip + build all green
bench trap  : ROUND 6 (13:48) measured ROUND 5's code. The Electron main
              process serving it (PID 113855, cwd this worktree) started at
              13:39:50 and never restarted; the title fix landed at 13:44:51.
              Identical output was the correct behaviour of stale code, not a
              failed fix. Before trusting any bench of a MAIN-side change:
              `ps -o lstart= -p <electron main pid>` must be later than the
              commit. Verified the fix instead against the real article,
              fetched directly (`fr.wikipedia.org/api/rest_v1/page/html/…`):
              query = title gives focused:false and reads (lead) · Contexte ·
              Origine, évolution et chronologie du projet · Projet de réforme
              présenté par le gouvernement, 8 skipped, with §Manifestations
              gone; `motion de censure 49.3` still ranks and reads Aspects
              juridiques · Procédure et calendrier.
observed    : the lead carries the infobox as prose ("Loi retraites Données
              clés Autre(s) nom(s) LOI no 2023-270 …"). Useful data (official
              name, dates) in an ugly shape; not fixed, recorded for S09.
next action : RESTART the dev server, then bench S07j + S07k together — the
              apparatus must never be selected, a saturated query must say it
              read from the top, a transcript opened as a note must show no
              comments, and the request pills must now carry a tool part that
              opens onto the model's own query. S07 closes with that bench.
              Then S08 save-as-source — its breakdown pills still describe
              the pre-pass packet only, so an answer that called three corpora
              looks like it sent nothing but the packet; build it against the
              trace record. Then S08 save-as-source, which also brings
              navigation to a consulted URL.
              OUT OF THIS PATH, owner ruling 2026-08-20: the Wikidata-first
              tree — hub entity, sitelink routing to the other Wikimedia
              projects, page source links delivered with their context so the
              agent can go further — opens as its own path with its own
              opening check and an ADR-015 amendment. `prop=extracts` folds
              into that design rather than being bolted on here.
blockers    : none
parallel    : CP-MVP-012 branches from THIS path's head (399ea5e) rather than
              the trunk, by owner ruling 2026-08-20, because it extends the
              section selector and the trace introduced here. CP-MVP-012 MUST
              NOT merge before this path does. CP-AI-CAPABILITIES and
              CP-RICH-MARKDOWN have both merged; no other path is running.
```

# Blockers

None at activation.
