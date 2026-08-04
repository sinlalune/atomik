---
type: Atomik Brainstorm Note
title: Brainstorm session C — websearch tool: contract, backends, Wikimedia-first grounding
timestamp: 2026-08-03T00:00:00Z
status: provisional
---

# 2026-08-03 brainstorm session (concurrent session C)

Q/A session opened by the owner, running concurrently with the day's sessions A and B. Nothing here is a decision; promotion goes through reviewed patches (bedrock/ADR). Research base: repo sweep (bedrock 13/28/29, ADR-005, generation seam, web plumbing) + dated external research sweep (2026-08-03; pricing/ToS cited inline, re-verify before committing).

## Subject — how do we build the websearch tool (chat tool-use + grounding verification of claims)?

**Owner question (condensed):** how will we build our websearch tool, used in the chat AND in grounding verification of claims? What is current SOTA best practice and the best solution for us?

### The 2026 SOTA converged on our own 2026-07-08 charter

Every serious multi-provider assistant (LibreChat, Open WebUI, Cherry Studio — nearest analog, desktop multi-provider — LobeChat) ships **one app-side, provider-agnostic `web_search` pipeline exposed to any model via function calling**, backends swappable behind it. Provider-native server tools (Anthropic/OpenAI/Mistral connectors) are an optional tier, never the primary path. Open WebUI notably *migrated* from RAG-injection to an agentic function-calling mode with `fetch_url` — direction of travel matches the harness bet ("intelligence into the harness: typed tools"). This is the 07-08 brainstorm directive verbatim: **own the TOOL CONTRACT, not a search engine** — `search → typed results; fetch → reader text`, swappable backends, behind main.

Claim-verification SOTA is SAFE-shaped (DeepMind: decompose → search per claim → judge against retrieved snippets), refined by: Claimify-style extraction (disambiguate-or-abstain), **multi-query reformulation** (never search the claim's own wording only — retrieval circularity: you find pages repeating the claim, incl. LLM pollution), and **verbatim quotes string-matched against the fetched page** (kills judge quote-hallucination — literally our `truth.ts` containment check pointed at a fetched page).

### The decisive constraint: search-API storage ToS

Search APIs largely **forbid persisting their results** (Brave: transient-only default; Exa: written permission required; Mistral connector: view-only, no caching — and it requires the Conversations API at $30/1k, 3–4× market). Fatal collision with a durable evidence store. Resolution, and the core architectural rule of this session:

> **Search transiently, fetch your own evidence.** The search backend only ever contributes transient URLs+snippets (displayed, discarded — exactly ADR-005's "provider-grounded result ≠ dossier"). Everything STORED is a quote from a page the app fetched itself (invisible WebContentsView + web-reader transient text — machinery that already exists: `importWebUrl`, `webViewReaderText`), recorded as `{url, accessedAt, quote, quoteSha256}` = the existing `EvidenceRecord` + `WebEvidenceProvenance` shape. A user-initiated excerpt of a public page carries no search-API license.

Desktop advantage: residential IP + real Chromium fingerprint passes challenges that kill datacenter fetchers. Fetch rules: honest UA, user/claim-initiated only, no crawling (standing prohibition, bedrock 09/ADR-005), detect paywall truncation → "open in browser", never circumvent.

### Architecture — one seam, two consumers

- **`search(query, opts) → typed results`** (url, title, snippet, publishedDate?, backend id) + **`fetch(url) → reader text`** (wraps existing WebContentsView/reader path). Lives in **main beside the adapters** (adapters stay pure-compute per `generation.ts`); keys main-side (bedrock 13); every invocation a **child ActionTrace** — needs two known ledger extensions: `location: 'web'` and `parentId` (both already in the trace *contract*). Budgets/cancel ride existing `AbortController` + `budget-exceeded`.
- **Chat consumer:** the tool LOOP is greenfield (`buildMessages` emits no `tools`, parses no `tool_calls`). Loop belongs in the `runAiOperation` handler: adapter surfaces tool-call requests → handler executes (validated, budgeted, traced) → appends results → re-invokes adapter. Works on plain Mistral chat completions (no Conversations API). Flags: Mistral tool-calling rated only "good" in model-research — small dated bench of tool-call reliability before trusting the loop (Haiku 4.5 = hard-tool-use fallback tier). The `grounding-rules` prompt block as written FORBIDS outside material — search-enabled operations need an amended/alternate registry block (clean owner-visible diff).
- **Verification consumer:** background, latency-tolerant, storage-critical. Per claim: reformulate 2–3 queries → search (transient) → fetch top pages ourselves → judge restricted to retrieved text → verdict in **session B's frozen vocabulary** (`supports`/`partially-supports`/`contradicts`/`unrelated` + mandatory qualifiers), stored quote string-matched verbatim, receipt records **searches run + not-found** (absence is part of the proof — the tool returns exactly what the receipt needs), bi-temporal re-runnable events (temporal drift documented failure mode). Later local rung per house method: Bespoke-MiniCheck-7B (Ollama) as free support/not-support judge benched against the cloud ceiling.

### How hard is a SERP engine (what Tavily actually is)

Three rungs, ~10×–1000× apart: (1) SERP scraping (Serper/SerpAPI — weeks, legally gray, cat-and-mouse); (2) **aggregation + rerank layer = Tavily** (months, small team): own crawler (official docs; deliberately un-differentiated UA, self-bound to Googlebot rules) + undisclosed third-party aggregation + proprietary rerank/extraction/caching — NOT an index of the web; (3) real index (Google/Bing/Brave ~20B, Mojeek since 2004, Exa neural, Marginalia niche — years, serious capital, littered with corpses). **Supply-chain lesson (live, 2025):** Microsoft retired the Bing Search API (2025-08-11) with months of notice and the whole rung-2 market lost its foundation; Brave then dropped its free tier (2026-02). The swappable-backend seam is not hypothetical robustness — it is the exact failure mode that just happened industry-wide. Our verification pipeline is a **private mini-Tavily** (multi-query fan-out → transient backend → own fetch → extract → local rerank/judge; model-research §1.3 already lists bge-reranker-v2-m3 + small-LLM query rewriting as local roles) at single-user scale where free tiers + residential IP ≈ $0.

### DIY scraping / free-API landscape

Owner probe: why not scrape Google ourselves and fetch ourselves? Viable at our scale (user-initiated, residential, human volume) but three taxes: **parser-maintenance treadmill, solo** (Google SERP = adversarial target, JS-required since 2025, consent walls; SearXNG survives only via community patching — and still breaks; worst failure mode for US: silent empty results poisoning verdicts — "insufficient-evidence" caused by a stale CSS selector); **CAPTCHA friction bleeds into the user's own IP** (verification bursts of 20–30 rapid queries are exactly what tripwires match); **saves nothing** (Tavily free tier already covers hobby scale). Also genuinely the grayest point vs our honest-UA rule.

No truly free unlimited public search API exists — structural (indexes cost money; AI agents turned search APIs into product; Google's official CSE JSON API — 100/day free — reported closed to new customers, deprecation 2027-01, secondary sources, verify). Four bins: renewable free tiers (Tavily 1,000/mo · Exa $10/mo · Firecrawl 1,000/mo · SerpAPI 250/mo; Serper 2,500 one-time); truly-free non-SERP (**Wikipedia/Wikidata APIs — free, unlimited-ish, ToS-clean for storage**); truly-free niche indexes (Marginalia); free-by-not-asking (DDG-html, SearXNG, in-app scrape).

**Backend ladder (recorded, not decided):** (1) **Tavily default** — 1,000 free credits/mo, purpose-built, no hostile storage clause on transient use, someone else maintains the parsers; (2) **SearXNG** for self-hosters — keyless, community-maintained, fits private-leaning modes (Cherry Studio's exact configuration); (3) **in-app scrape backend as last-resort/offline-vendor fallback** — DDG-html first (no JS wall), Google-via-WebContentsView deep fallback, rate-limited, and *loudly instrumented*: "0 results — parser possibly stale" is a distinct state, never a clean empty. Tavily caveat for the owner: their ToS says queries may be used for model training → private mode must not route through it.

## Owner decision-lean (headline): Wikimedia FIRST, Tavily only on fall-through

**Owner (verbatim gist):** "I think it is better if we wikidata first and complete with websearch on tavily on non covered subjects."

This is bedrock 29's layer ladder made concrete: **layer B = the Wikimedia family, layer C = Tavily**, escalation only on recorded miss. Router per claim: entity-link against Wikidata → if entity resolves AND claim kind maps to a modeled property, judge there (cheap, deterministic-ish, re-runnable; "deterministic tools before language-model search"); **fall-through conditions are concrete and receipt-recorded** (entity not found / property absent / claim kind outside vocabulary / freshness signal): "Wikidata: entity resolved, property absent → escalated to web (2 queries)".

- **Layer B is a pair**: Wikidata for *structure* (entity facts: dates, quantities, identities, taxonomy), Wikipedia article text for *prose* judging — one entity-resolution step feeds both; both dump-downloadable → offline/private mode fully real.
- **Caveats recorded**: coverage bias (strong on notable/stable/encyclopedic, weak on recent/niche/non-notable — instrument fall-through rate from day one, the receipt already yields it); tertiary-source honesty (Wikipedia summarizes — Tier 2–3 claims may escalate to primary web sources; a Wikipedia match and a page citing Wikipedia share one `independenceGroup`, not two confirmations); **a layer-B miss with web disabled = "unchecked at layer C", never evidence of absence** (verdicts layer-annotated).
- Economics: free storable rung absorbs the boring majority; Tavily's free tier only sees escalations → realistic paid-search volume ≈ 0.
- **Sequencing consequence**: the Wikidata-backed grounding candidate (register: leading post-008, amended by session A with the semantic-graph front half) now ALSO serves as **layer B of the verification router** — same entity/nodes infrastructure serves generation grounding, the knowledge graph, and claim verification: three consumers, one index.

### The full Wikimedia API family = layer B's real extent

All sister projects share the same API surface (Action API `/w/api.php`: CirrusSearch, `prop=extracts`; REST summaries; api.wikimedia.org portal, optional free key; CC BY-SA = storage-clean with attribution — the existing provenance line satisfies it). Wikidata adds `wbsearchentities`/`wbgetclaims`/SPARQL (query.wikidata.org). **Claim-nature → corpus routing** (maps onto bedrock 28's taxonomy): factual/historical/measurement → Wikipedia+Wikidata; **lexicographic/etymological → Wiktionary** (+ lexemes); **quote attribution → Wikiquote** (notorious hallucination category, dedicated free corpus); **primary-text claims → Wikisource** (upgrade past tertiary); taxonomy → Wikispecies (mostly subsumed); Wikibooks/Wikiversity → candidate import sources for a learning vault, not verification. Pageviews API = cheap notability/quality signal. Same client code, no auth, routed by claim nature.

### Serving "all of Wikimedia" — the ladder (sizes checked 2026-08-03)

- **Rung 0 — live APIs (online default)**: zero storage, always fresh; layer B needs nothing built beyond the router.
- **Rung 1 — entity subset in SQLite (= what M10 should be)**: stream the Wikidata dump (~1.6 TB raw / ~130 GB compressed, ~115M items), keep labels+aliases+descriptions+sitelinks+chosen properties, filter to entities with Wikipedia sitelinks → **few-GB SQLite + FTS5**: exactly the M8 retrieval contract, no-vector-DB guardrail, `.atomik/` rebuildable-only doctrine. Serves entity linking + structured facts + the graph path.
- **Rung 2 — Wikipedia prose offline**: Kiwix ZIM text-only (EN ≈ 49 GB; FR a fraction; full-text Xapian index INSIDE the file) via libzim/kiwix-serve on localhost (documented-local-endpoint precedent: capture server). Private/offline verification: rung 1 facts + rung 2 prose, no byte leaves the machine.
- **Rung 3 — declined**: full Wikidata SPARQL self-hosted (QLever, server-class) and Commons media at scale — exist, not our business.
- Rungs 1–2 are **opt-in "offline knowledge packs"** — download AND delete/update ship in the same unit (house lifecycle rule); evidence stamps the **dump/ZIM version date** (bi-temporal verdicts: "true as of the 2026-07 snapshot"). Router doesn't care live-API vs local — same layer B interface, only provenance differs.

### Commons for UI enhancement (notes + chat)

Entity linking (built for verification anyway) is also the image key: entity → Wikidata **P18** → curated Commons file → stable thumbnail URL. No search/ranking problem for the 90% case; `depicts`-search deferred. Uses, ascending: **hover cards** on entity pills (thumbnail + description, Wikipedia-preview pattern), **chat answer decoration**, **note insertion** (= an IMPORT: file into vault assets + provenance sidecar via `extmetadata` (author/license machine-readable), through patch preview — propose-never-impose; remove/replace ships in the same unit; never hotlink inside durable notes). Transient tier hotlinks Commons thumbs + hover attribution, stores nothing (ADR-005 posture for media). Cautions: CSP allowlist for wikimedia.org = explicit bedrock-13 trust-boundary change; **private/offline mode disables hotlinking** (viewing a note must not phone Wikimedia); **decoration ≠ evidence** — no truth-mark styling on illustrations (bedrock 36 register discipline). Cheap unit once session A's entity pills land — a fourth consumer of the same index.

### Addendum (owner idea, post-persist): entity reference links as a curated subject search index

A resolved entity's OUTGOING links — statement references (`P854` reference URL / `P248` stated-in), external identifiers (DOI, PubMed, ORCID, official website `P856`, library/database IDs…), and the Wikipedia article's own citation list (richer than Wikidata's patchy references; extractable from the article we already fetch) — form a community-curated, pre-ranked list of authoritative pages about exactly that subject. **New rung between layer B and Tavily**: on fall-through, fetch the entity's reference/identifier links first (own fetch machinery, bounded per-claim — ADR-005's no-crawl-seed respected); generic web search only if those don't settle it. Wins: anti-circular by construction (editor-chosen sources, not pages matching the claim's wording — counters retrieval pollution), free + ToS-clean, naturally high-authority. Caveat: double `independenceGroup` discipline — Wikipedia and the source Wikipedia cites are ONE evidence chain, not two confirmations.

## Open questions (owner)

- Tavily privacy posture as managed default (queries may train their models) — acceptable outside private mode? Alternatives each taxed (SearXNG: self-host; Brave: storage plan + card).
- Chat search: rides M7 or waits for the M8 harness?
- Provider-native search toggle: reserve the tier or drop it entirely for now?
- Before any backend commit: dated research record for search-API pricing/ToS (the model-research gap named in the sweep — Google CSE deprecation and Tavily/Jina prices need in-browser verification).

## Feeds

- **M7 opening** (primary): this session IS the websearch path's design sketch — tool contract, seam placement, backend ladder, transient-search/own-fetch evidence rule, trace/budget extensions, grounding-rules block amendment.
- **M6 opening**: receipt gains "searches run + not-found"; layer-annotated verdict semantics; independenceGroup for tertiary chains.
- **M8 opening**: tool LOOP in the harness (chat consumer); local rerank/query-rewrite roles; search seam shape mirrors `searchVault`.
- **Post-008 path (Wikidata candidate)**: strengthened — layer B of the verification router = the same nodes/entity index (three consumers, one index; Commons P18 hover cards a fourth); rung-1 SQLite subset = M10's concrete shape.
- **008**: nothing lands in the closing path (web grounding explicitly excluded — M7 territory; thinness rule).
