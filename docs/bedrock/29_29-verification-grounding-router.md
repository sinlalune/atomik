---
{
  "id": "29-verification-grounding-router",
  "title": "Verification router, grounding, and model strategy",
  "status": "foundational",
  "eyebrow": "Cost-aware verification",
  "summary": "Atomik routes claims through local project evidence, local public knowledge, live web verification, and human review according to risk, freshness, privacy, and cost; Google Search grounding is a transient verifier, not a knowledge-ingestion pipeline.",
  "tags": [
    "verification",
    "grounding",
    "google-ai-studio",
    "gemini-api",
    "local-models",
    "cost",
    "privacy",
    "providers",
    "action-trace",
    "execution-policy",
    "local-transcription",
    "autocomplete"
  ],
  "relations": [
    {
      "to": "28-truth-evidence-model",
      "kind": "implements"
    },
    {
      "to": "06-ai-patch-pipeline",
      "kind": "routes"
    },
    {
      "to": "09-web-source-tab",
      "kind": "separates-from"
    },
    {
      "to": "13-electron-security",
      "kind": "extends-provider-boundary"
    },
    {
      "to": "14-app-kernels",
      "kind": "adds-incubating-contracts"
    },
    {
      "to": "26-okf-agent-context",
      "kind": "uses-local-context-first"
    },
    {
      "to": "30-public-knowledge-dictionary",
      "kind": "uses-local-baseline"
    },
    {
      "to": "32-truth-investigation-record",
      "kind": "derived-from"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "uses-cross-action-ledger-from"
    },
    {
      "to": "34-local-execution-investigation-record",
      "kind": "uses-dated-capability-evidence-from"
    }
  ],
  "agent": {
    "purpose": "Choose the cheapest adequate evidence path without sacrificing privacy, freshness, source quality, inspectability, or provider-term compliance.",
    "inputs": [
      "claim set",
      "claim risk",
      "temporal volatility",
      "local evidence availability",
      "user privacy policy",
      "provider capabilities",
      "cost budget",
      "requested verification depth"
    ],
    "outputs": [
      "verification plan",
      "provider calls",
      "query budget",
      "verification report",
      "source import suggestions",
      "cost trace",
      "privacy warnings",
      "ActionTrace hierarchy",
      "execution receipt"
    ],
    "invariants": [
      "Use local project evidence before external search when it is adequate.",
      "Do not search the web merely to decorate stable explanations with links.",
      "Current, disputed, consequential, or weakly supported claims receive stronger checks.",
      "Provider-grounded output is not canonical project knowledge and is not mined into a database.",
      "Importing a destination source is a separate user-visible source-adapter action.",
      "Private project content is minimized before any cloud call.",
      "Provider pricing, terms, and model identifiers are treated as volatile configuration, not timeless architecture.",
      "Small local models are orchestration and transformation workers first, not presumed universal authorities.",
      "Provider usage is a specialization of the cross-action ActionTrace contract.",
      "Local execution is measured even when external billing is zero.",
      "Model candidates are chosen by workload/device evaluation, not generic leaderboard rank."
    ]
  }
}
---

# Verification router, grounding, and model strategy

## Goal

The balanced solution is not “always use the web,” “always trust the model,” or “download the whole internet.” It is a layered router that spends cost and latency only where the epistemic risk justifies them.

```text
user request or draft
  -> split into claims
  -> classify claim nature and risk
  -> inspect local project evidence
  -> inspect local public knowledge if available
  -> invoke deterministic tools when appropriate
  -> use live web verification only when needed
  -> compare evidence and record limitations
  -> present answer + Truth Lens + patch proposal
```

The router must remain provider-neutral even when the first cloud implementation uses Gemini API and Google Search grounding.

## Four knowledge and verification layers

### Layer A — Local project evidence

```text
project notes
source.md dossiers
PDFs and page anchors
web snapshots and reader extracts
captures and transcripts
quotes
logs and ADRs
accepted corrections
```

This is the fastest, cheapest, most private, and most contextually relevant layer. It is also the user's actual knowledge environment.

The router should ask:

```text
Is the answer already supported by the selected source?
Does a project note contain a cited conclusion?
Is there a newer source dossier or correction in log.md?
Can the claim be verified by opening the original page, PDF page, or quote anchor?
```

### Layer B — Local public knowledge baseline

```text
versioned Wikipedia snapshots or selected article packs
Wiktionary snapshots
Wikidata entities and Lexemes
open or public-domain dictionaries
open textbooks and official documentation packs
user-installed specialist source packs
```

This layer gives small local models broad retrieval without expecting the model weights to memorize all human knowledge. It should be versioned, licensed, attributable, and replaceable.

### Layer C — Live external verification

```text
Google Search grounding or another search provider
official websites and APIs
current research databases
recent laws, prices, schedules, releases, and events
specialist sources not present locally
```

This layer provides freshness and discovery. It is slower, costs money, sends some context outside the device, and is governed by provider-specific restrictions.

### Layer D — Human curation

```text
accept or reject a patch
mark a claim disputed
promote or demote a source
correct scope
write a synthesis
choose a moral or interpretive frame explicitly
commit or roll back with Git
```

Human editorial authority remains central. Human acceptance does not magically prove truth, but it determines what Atomik stores as the user's current knowledge state.

## Risk and freshness classification

The router should classify operations, not users, into practical tiers.

| Tier | Typical request | Default path |
|---|---|---|
| 0 — transformation | rewrite, translate, format, extract from supplied text | no web; preserve source boundary |
| 1 — stable explanation | explain a well-established concept using selected/local sources | local context; citations optional unless factual detail is added |
| 2 — factual verification | dates, attribution, etymology, statistics, disputed history, recent software behavior | local evidence plus targeted external verification when local support is weak or stale |
| 3 — high consequence | medical, legal, financial, safety-critical, major public decisions | authoritative current sources, explicit scope, stricter cross-check, strong human-review affordance |

Risk factors include:

```text
temporal volatility
consequence of error
controversy or disagreement
source quality
claim novelty
precision requested
jurisdiction or population dependence
whether the answer introduces facts beyond supplied material
whether the user explicitly asks for verification
whether private material would leave the device
```

## Truth router sketch

```ts
type VerificationPolicy = {
  mode: 'off' | 'local-only' | 'automatic' | 'strict' | 'user-confirmed-web'
  maxWebQueries?: number
  maxEstimatedCost?: number
  requirePrimarySourceFor?: string[]
  requireTwoIndependentSourcesFor?: string[]
  allowPrivateContextToCloud: boolean
  redactBeforeCloud: boolean
  staleAfter?: Record<string, string>
}

type VerificationPlan = {
  claims: Array<{
    claimId: string
    riskTier: 0 | 1 | 2 | 3
    volatility: 'stable' | 'slow' | 'current' | 'live'
    localChecks: string[]
    deterministicChecks: string[]
    webChecks: string[]
    humanReview: 'optional' | 'recommended' | 'required'
  }>
  budget: {
    maxQueries: number
    maxTokens?: number
    maxCost?: number
  }
}
```

The policy should be visible and configurable. “Automatic” must not mean “unbounded provider calls.”

## Deterministic tools before language-model search

Some claims are better checked by a calculator, parser, code runner, schema validator, date library, or source hash than by another model.

```text
arithmetic -> calculator
code behavior -> tests or sandboxed execution
file integrity -> hash
citation anchor -> direct source lookup
schema validity -> deterministic validator
current time -> trusted clock service
unit conversion -> deterministic conversion
```

Model-based verification should not replace a tool that can directly establish the result.

## Google Search grounding: correct role

For the first cloud implementation, Grounding with Google Search can help answer current or externally verifiable questions. It can let the model decide to issue one or more search queries, synthesize a result, and return grounding metadata.

Atomik should use it as:

```text
live answer aid
current-information verifier
source-discovery aid for the end user's immediate prompt
citation-bearing result shown to that same user
```

Atomik should not use it as:

```text
web crawler
dataset builder
link harvesting system
persistent source index
training-data generator
background encyclopedia builder
replacement for source dossiers
```

This is both an architectural and provider-compliance boundary.

## Provider result and durable source are different objects

```text
Google grounded result
  transient provider response for one user prompt
  displayed with required associated links/search suggestions
  retained only within permitted purposes and durations

Atomik web source dossier
  user-visible import of an actual destination page or document
  processed by Atomik's own web source adapter
  preserves URL, access date, snapshot/extract, anchors, provenance, and license notes
```

The safe workflow is:

```text
verify with grounding
  -> show grounded result and links
  -> user opens a destination source
  -> user explicitly imports that source
  -> Atomik creates source.md / snapshot / reader.md
  -> durable claims cite the imported source
```

The application must not automatically take grounding links, crawl them, and build a local index. The provider terms current on 2026-06-22 explicitly restrict caching, analysis, training, automated collection, link harvesting, and database construction from Grounded Results, Search Suggestions, and associated links, subject to narrow listed exceptions.

## Current Google grounding cost model — volatile research note

As checked on 2026-06-22:

```text
Gemini 3 grounding billing:
  each search query executed by the model can be billable
  one user prompt may trigger multiple search queries

Pricing page:
  currently advertises 5,000 grounded prompts/requests per month
  shared across Gemini 3
  then USD 14 per 1,000 search queries
```

The pricing page and documentation use both prompt/request allowances and per-query billing language. Atomik must therefore record actual query counts returned by the provider where available and must not estimate cost as “one prompt equals one search.”

These values are implementation inputs, not architecture constants. Put them in a versioned provider capability file with:

```text
checked_at
source_url
billing_unit
free_allowance
price_after_allowance
model_scope
notes
```

Re-check before shipping, after provider changelog notices, and whenever billing anomalies appear.

## Cost controls

A good router reduces cost without weakening trust.

```text
local-source-first retrieval
claim-level search instead of whole-answer re-generation
query deduplication within one operation
hard maximum query count
per-project and global monthly budgets
cost preview for strict/deep verification
reuse of previously imported durable sources
freshness windows by domain
avoid rechecking stable claims unnecessarily
stop when evidence is sufficient, not when every search path is exhausted
```

Do not “cache the grounded result for reuse as knowledge.” Persist Atomik's own operation metadata and verification conclusion only to the extent allowed, and cite durable imported sources for reusable knowledge.

Provider usage is represented through the cross-action `ActionTrace` contract in `operation_trace_contract_v0_1.json`. A provider call may be one child trace inside a larger verification action. Record actual provider query/token counts when available, keep estimated and reported/billed cost separate, and link every estimate to a dated price snapshot.

## Privacy and data minimization

Cloud verification can expose selected project context. The router should minimize by default:

```text
send the claim, not the whole vault
send the smallest supporting excerpt
remove unrelated personal identifiers
never send secrets or API keys
ask before sending private/sensitive source material when policy requires
keep a provider trace visible to the user
support local-only mode
```

For production use with private vault content, the default Google integration should use Gemini API through a Cloud project with active billing rather than relying on casual unpaid-service assumptions. Current Google terms say paid-service prompts and responses are not used to improve products, while unpaid-service content can be used for product improvement and may be human reviewed; regional rules and account configuration can alter the classification. Grounding additionally carries a stated 30-day storage period for prompts, contextual information, and output for grounding-system operation, including under paid quota and its data-processing terms.

Atomik should not summarize this into “Google stores nothing” or “paid means zero retention.” The UI should say what is actually known and link to the checked policy version.

## Provider adapter boundaries

```ts
type ModelProvider = {
  generate(operation: AiOperation): Promise<ProviderResponse>
}

type VerificationProvider = {
  capabilities(): Promise<ProviderCapabilities>
  verify(plan: VerificationPlan): Promise<ProviderVerificationResult>
}

type SourceImportAdapter = {
  canImport(target: string): Promise<boolean>
  import(target: string, destination: ProjectPath): Promise<SourceDossierResult>
}
```

Do not merge these responsibilities:

```text
model provider generates/synthesizes
verification provider performs provider-governed live checks
source adapter imports an actual source into durable local knowledge
truth core compares claims, evidence, and verification events
vault core applies accepted patches
```

This separation allows Google Search grounding to be replaced or supplemented without changing the file model.

## Local does not mean free

Local execution removes per-request external billing and can improve privacy and offline availability. It still consumes:

```text
model download and storage
index build/update time
CPU/GPU/NPU time
memory
battery and electricity
latency
runtime integration and maintenance
human correction effort
```

A receipt should display `€0 external` alongside measurable local work rather than presenting the action as costless.

## Local capability ladder

```text
deterministic tools and direct actions
  -> local lexical/link/structural retrieval
  -> local embeddings/reranking when evaluated as useful
  -> local speech recognition or short completion when device capability is adequate
  -> local generative reasoning for bounded tasks
  -> cloud model or live search for capability/freshness gaps
```

Desktop/laptop is the first local-inference target. Mobile is a separate capability class with stricter memory, thermal, battery, and cancellation policies.

## Small local model strategy

The long-term local model should not be evaluated only on encyclopedic recall. A small model becomes valuable when the harness gives it bounded tasks and evidence.

Best early local roles:

```text
intent and risk routing
claim splitting
claim-type classification
local retrieval query generation
source excerpt selection
speech transcript cleanup after preserving verbatim output
debounced or explicit short completion
autocomplete candidate filtering
citation formatting
anchor mapping
summarization
patch drafting
contradiction candidate detection
staleness detection
lexicographic parsing
question generation
style adaptation
```

Use cloud or larger models selectively for:

```text
hard multimodal interpretation
ambiguous synthesis across many sources
deep reasoning where small models fail
high-quality long-form explanation
live web grounding
complex repair after validator failure
```

The harness carries much of the trust:

```text
retrieval
source anchors
claim schema
validators
deterministic tools
provider policy
cost limits
patch review
Git history
```

A future local model can improve or replace individual stages without changing the durable knowledge model.

## Verification modes in the UI

```text
Fast
  local context only unless a claim is obviously current or unsupported

Balanced
  automatic targeted web checks for Tier 2/3 claims

Strict
  stronger source-quality rules, cross-checks, and explicit unresolved claims

Offline
  local project + installed knowledge packs only

Private
  local-only unless the user explicitly approves a minimized cloud request
```

Mode names should explain tradeoffs. “Strict” does not promise certainty; it promises a more demanding verification procedure.

## Stop conditions

The router should stop and report uncertainty when:

```text
no inspectable source supports the claim
available sources merely repeat one origin
sources conflict and scope does not resolve them
provider terms prevent the desired reuse
verification budget is exhausted
current information cannot be reached
high-stakes advice would require professional judgment
the user requests local-only operation and local evidence is insufficient
```

“Insufficient evidence” is a valid result, not a system failure.

## Acceptance tests

```text
Stable rewrite does not trigger web search.
Current factual question triggers a bounded verification plan.
One prompt producing three provider queries records three queries, not one.
Private context is minimized or blocked according to policy.
A grounded result is displayed separately from durable source imports.
Grounding links are not harvested into an index.
A user can import one selected destination page through the normal web adapter.
Provider pricing and terms snapshots carry checked_at dates.
Local-only mode makes no cloud request.
Deleting a provider cache does not remove accepted source-backed notes.
Local and cloud verification children appear under one parent ActionTrace.
A local action displays zero external billing without hiding measured latency/resource use.
Raw claim/source text is absent from telemetry unless explicitly opted in.
```

## Official references to re-check

- Gemini API Grounding with Google Search: https://ai.google.dev/gemini-api/docs/google-search
- Gemini Developer API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini API Additional Terms of Service: https://ai.google.dev/gemini-api/terms
- Gemini API changelog: https://ai.google.dev/gemini-api/docs/changelog
- Gemini API rate limits: https://ai.google.dev/gemini-api/docs/rate-limits

Checked for this iteration: 2026-06-22.


## Cross-action economics

Useful aggregate metrics include:

```text
external cost per accepted patch
input/output tokens per accepted character
retrieval context tokens per opened citation
time and queries per successfully verified claim
transcription compute seconds and correction edits per usable audio minute
autocomplete inference time and tokens per accepted character
local/cloud ratio by project and action
```

These ratios must never become incentives to hide uncertainty, skip necessary verification, or force cheap low-quality output.
