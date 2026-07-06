# ADR-005: Live web grounding is transient verification, not canonical knowledge ingestion

Status: accepted
Date: 2026-06-22

## Context

Atomik needs current information and external cross-checking. The first provider direction is Gemini API with Grounding with Google Search. Live grounding can improve freshness and provide links, but it has cost, privacy, presentation, storage, and reuse constraints.

Current Google terms checked on 2026-06-22 restrict caching, analysis, training, automated collection, link harvesting, and database/index construction from Grounded Results, Search Suggestions, and related links, except for narrow stated purposes. The terms also state additional grounding-related retention and presentation requirements. Pricing is model-family-dependent and a single user prompt may execute multiple billable search queries.

## Decision

Atomik treats provider-grounded output as a transient verification/display object for the prompting user.

```text
provider-grounded result != Atomik source dossier
provider link != permission to crawl/import automatically
search result count != independent evidence count
one user prompt != necessarily one billable search query
```

Durable reusable knowledge must come from:

```text
local project sources
user-imported destination pages/documents
versioned public knowledge packs
user-authored or accepted Markdown with inspectable evidence
```

A user may open a destination link and explicitly import the actual source through Atomik's normal web/source adapter. That import records URL, access date, snapshot/extract, anchors, provenance, and applicable license information independently from the provider-grounded result.

Cloud verification is routed by claim risk, freshness, local evidence, privacy policy, and budget. Private context is minimized. Production defaults should use an appropriately configured paid API project and still disclose known retention/processing constraints.

Provider pricing, terms, model IDs, and capabilities are volatile configuration with `checked_at` metadata.

## Consequences

- Grounded results need a distinct UI component that preserves provider-required links/search suggestions.
- Grounding output is not silently transformed into a canonical note or local encyclopedia.
- The verification router records actual query usage where available and enforces budgets.
- The web source adapter remains the only path for durable page ingestion.
- Provider integration tests include term-sensitive behavior, context minimization, and no automated link harvesting.
- A provider can be replaced without changing the file model.

## Alternatives considered

### Ground every prompt automatically

Rejected. It adds cost, latency, data exposure, and unnecessary provider dependency for local transformations and stable explanations.

### Use grounding results to bootstrap a crawler/index

Rejected because it conflicts with the current provider-use restrictions and blurs transient verification with durable source ingestion.

### Never use live grounding

Rejected. Local knowledge alone cannot reliably answer current, rapidly changing, or missing specialist questions.

### Store provider output as the only evidence

Rejected. The user needs inspectable durable sources and source anchors independent of a transient model synthesis.

## Migration / rollback

The provider adapter is optional. Atomik can operate in local-only mode. If Google terms, pricing, or capabilities become unsuitable, the adapter can be disabled or replaced while preserving local sources, claims, and verification reports.

## Links

- `29_29-verification-grounding-router.md`
- `32_32-truth-investigation-record.md`
- `09_09-web-source-tab.md`
- `13_13-electron-security.md`
