---
{
  "id": "32-truth-investigation-record",
  "title": "Truth iteration investigation record",
  "status": "living-research",
  "eyebrow": "Research record · 2026-06-22",
  "summary": "A dated record of the architectural, product, cost, privacy, provider-term, Wikimedia, lexicographic, and local-model findings that led to Atomik's truth/evidence design, including volatile facts that must be rechecked.",
  "tags": [
    "research",
    "truth",
    "grounding",
    "cost",
    "privacy",
    "terms",
    "wikimedia",
    "local-models"
  ],
  "relations": [
    { "to": "23-references", "kind": "extends" },
    { "to": "28-truth-evidence-model", "kind": "motivates" },
    { "to": "29-verification-grounding-router", "kind": "motivates" },
    { "to": "30-public-knowledge-dictionary", "kind": "motivates" },
    { "to": "31-truth-lens-ux", "kind": "motivates" },
    { "to": "18-roadmap", "kind": "changes" }
  ],
  "agent": {
    "purpose": "Preserve the costly investigation and its caveats so future agents do not reduce the decision to slogans or rely on stale provider facts.",
    "inputs": [
      "official provider documentation",
      "official provider terms",
      "official pricing pages",
      "Wikimedia documentation",
      "Atomik bedrock constraints",
      "cost/performance analysis",
      "local-model strategy"
    ],
    "outputs": [
      "dated findings",
      "architectural decisions",
      "volatile-fact register",
      "recheck triggers",
      "open risks"
    ],
    "invariants": [
      "Separate stable architecture from time-sensitive provider facts.",
      "Record official source URLs and access date.",
      "Do not convert legal or pricing research into timeless guarantees.",
      "Preserve unresolved ambiguity rather than inventing certainty.",
      "Update this record when a material assumption changes."
    ]
  }
}
---

# Truth iteration investigation record

## Record metadata

```text
Investigation date: 2026-06-22
Project timezone/context: Europe/Paris
Scope:
  truth in generated content
  claim-level evidence and verification
  Google AI Studio / Gemini API first implementation
  Grounding with Google Search
  cost and privacy balance
  Wikipedia/Wiktionary/Wikidata baseline
  smart dictionary and etymology
  future small local models and harness design
```

This note preserves the reasoning that should survive the conversation. It is not legal advice, a provider guarantee, or a final implementation specification. Provider facts are dated and must be rechecked.

## Executive conclusion

The strongest product position is:

> Atomik does not ask users to trust a model. Atomik lets them inspect the claim, source, anchor, verification procedure, freshness, uncertainty, disagreement, and patch history.

The balanced architecture is:

```text
local project evidence first
  + versioned local public knowledge second
  + targeted live verification when justified
  + human editorial review
  + durable Markdown/source files
  + derived indexes and local models around those files
```

The central distinction introduced by this iteration is:

```text
Files determine durable project state.
Evidence determines epistemic support.
```

## Why “mistake-proof” cannot mean “model never errs”

A generative model may:

```text
fabricate a source
misread a real source
collapse uncertainty
confuse publication and event dates
merge people or concepts
repeat a common misconception
synthesize incompatible sources
state an interpretation as fact
state a moral judgment as neutral description
use fluent prose to hide missing evidence
```

An application cannot honestly guarantee the absence of error. It can make errors much harder to hide and much easier to question, detect, and repair.

The product target therefore became:

```text
mistake-resistant
challenge-native
evidence-inspectable
source-anchored
freshness-aware
repairable through patches
```

## Why claim-level structure matters

A paragraph can contain:

```text
one direct fact
one statistic
one interpretation
one analogy
one prediction
one moral judgment
```

Attaching a citation badge to the paragraph or one model confidence value to the answer loses this structure. The investigation therefore rejected a universal truth score and selected composable dimensions:

```text
claim nature
evidence origin
verification state
freshness
workflow state
```

This allows subtle epistemology to surface without turning every note into a philosophy seminar.

## Google Search grounding findings

### What the service is useful for

The official Gemini API documentation describes Grounding with Google Search as a built-in tool that can use Google Search to help answer a prompt. With current Gemini 3 behavior, one request may lead the model to execute multiple search queries.

Useful Atomik roles:

```text
current facts
recent research or documentation
external cross-checks
source discovery for the immediate user prompt
citation-bearing live answers
```

### Current cost finding

Official sources checked on 2026-06-22:

- https://ai.google.dev/gemini-api/docs/google-search
- https://ai.google.dev/gemini-api/docs/pricing

Recorded finding:

```text
For Gemini 3, billing can be per search query executed by the model.
One prompt may create several billable queries.
The pricing page currently shows a 5,000 grounded prompt/request monthly allowance shared across Gemini 3, followed by USD 14 per 1,000 search queries for the referenced tiers.
```

This creates an important cost-design implication:

```text
Do not estimate grounding cost by prompt count alone.
Record provider query counts when available.
Use hard query budgets and claim-level routing.
```

Pricing is volatile. The architecture must not hard-code the amount or allowance.

### Current provider-use restriction finding

Official source checked on 2026-06-22:

- https://ai.google.dev/gemini-api/terms

The current Grounding with Google Search terms contain material restrictions. In paraphrase, they prohibit using Grounded Results, Search Suggestions, or links as a cacheable/analyzable/training corpus or as a way to programmatically collect links, identify pages for crawling, or build an index/database, except for narrow stated storage uses.

This invalidates a tempting but dangerous architecture:

```text
search grounding
  -> harvest every returned URL
  -> crawl automatically
  -> build Atomik encyclopedia
```

The selected architecture is:

```text
search grounding
  -> transient result displayed to the prompting user with required associated links/suggestions
  -> optional user-selected destination source
  -> separate Atomik source import
  -> durable source.md dossier and local extract
```

The actual destination page is imported through Atomik's own source adapter, subject to its own access, copyright, licensing, snapshot, and provenance rules. The grounded output itself does not become a reusable knowledge database.

### Current provider data-use finding

Official source checked on 2026-06-22:

- https://ai.google.dev/gemini-api/terms

Recorded findings:

```text
Unpaid-service content may be used to improve Google products and may be processed by human reviewers; sensitive, confidential, and personal information should not be submitted under those terms.

For paid services, the current terms say prompts and responses are not used to improve Google products and are processed under the referenced data-processing terms.

Grounding with Google Search has an additional stated 30-day storage period for prompts, contextual information, and output for grounding-system operation/debugging/testing; paid-quota processing is linked to the provider's data-processing addendum.

Account, region, billing configuration, and service mode matter.
```

The investigation therefore rejects simplistic statements such as:

```text
“Google never stores paid requests.”
“Using AI Studio is always private.”
“Free quota and paid quota have identical data treatment everywhere.”
```

The production default should use a Cloud project with active billing, explicit policy links, minimized context, and a local-only mode. This does not eliminate retention or provider risk; it gives a clearer contractual posture than casual unpaid use.

### Current presentation constraint finding

The current terms also require grounded results to be displayed with associated search suggestions/links to the end user who submitted the prompt and restrict certain modification/interspersion behavior.

Implementation implication:

```text
provider-grounded result component
  remains visually and structurally distinct
  preserves provider-required link/suggestion presentation
  is not silently rewritten into a local authoritative note
```

Any production UI must be reviewed against the current Client Application Guidelines as well as the API terms.

## Wikipedia, Wiktionary, and Wikidata findings

### Wikimedia dumps

Official sources checked on 2026-06-22:

- https://dumps.wikimedia.org/
- https://dumps.wikimedia.org/legal.html

Wikimedia provides public wiki content exports/dumps suitable for reproducible local snapshots. The licensing page explains that Wikimedia knowledge is broadly reusable under the applicable open licenses, while users still need to follow the relevant license and attribution requirements.

Architectural conclusion:

```text
Wikimedia dumps are suitable for local public-knowledge packs.
They are not “free of all obligations.”
Pack manifests need project, language, snapshot, license, and attribution metadata.
```

### Wikimedia Enterprise

Official sources checked on 2026-06-22:

- https://enterprise.wikimedia.com/
- https://enterprise.wikimedia.com/project-data/
- https://enterprise.wikimedia.com/docs/

Wikimedia Enterprise offers structured/high-volume access to Wikipedia and other supported Wikimedia projects. It can reduce parsing work and support current structured delivery.

Architectural conclusion:

```text
Enterprise is an optional ingestion/update provider.
Dumps and direct imports remain viable.
Atomik's durable pack contract must not depend on one delivery vendor.
```

### Wikidata lexicographical data

Official source checked on 2026-06-22:

- https://www.wikidata.org/wiki/Wikidata:Lexicographical_data

Wikidata models lexical information using Lexemes, Forms, and Senses. This is valuable for a structured dictionary layer, while Wiktionary remains richer in many human-authored definitions, etymologies, quotations, pronunciations, and usage notes.

Architectural conclusion:

```text
Wiktionary + Wikidata Lexemes, not one instead of the other.
```

### Why Wikipedia is a baseline rather than final authority

Wikipedia is broad, linked, cited, multilingual, community-maintained, and extraordinarily useful for orientation. It can also be uneven across language editions, topics, recency, and specialist domains.

The selected source posture is:

```text
Wikipedia for orientation, mainstream framing, terminology, and bibliography.
Primary/official/specialist sources for high-stakes, technical, disputed, or narrow claims.
```

This avoids both blind authority and reflexive dismissal.

## Smart dictionary and etymology findings

A “smart dictionary” should not flatten a word into one definition. The useful object includes:

```text
lemma
language and variety
part of speech
forms
pronunciations
senses
usage labels
examples and attestations
semantic relations
etymology paths
cognates and borrowings
sources
uncertainty and dispute
```

Etymology deserves special treatment because it often includes reconstruction and inference rather than direct observation.

Required distinctions:

```text
attested form vs reconstructed form
inheritance vs borrowing
word-form history vs sense history
scholarly proposal vs consensus
reputable alternate hypothesis vs folk etymology
simplified pedagogical chain vs full philological account
```

A beautiful etymology visualization that hides a disputed transition would be less truthful than plain text with an uncertainty label.

## Cost/performance analysis

### Why always-on web search is unbalanced

```text
adds latency
adds provider cost
sends context outside the device
can produce redundant searches
may create false confidence from fresh-looking citations
is unnecessary for supplied-text transformation and many stable concepts
is subject to provider-specific use limits
```

### Why local-only is also unbalanced

```text
cannot reliably answer current questions
local packs become stale
specialist coverage is incomplete
small models may not recognize missing knowledge
important corrections may exist only online
```

### Selected balance

```text
Layer A: local project evidence
Layer B: local versioned public knowledge
Layer C: targeted live external verification
Layer D: human review and patch acceptance
```

### Why small local models remain central

The future local model does not need to memorize the entire encyclopedia if it can reliably:

```text
route requests
split claims
classify epistemic type
retrieve local evidence
map citations
summarize and explain
format dictionary records
detect candidate contradictions
propose small patches
```

A good harness turns a small model into a dependable worker by constraining what it must invent.

The larger/cloud model remains useful for hard synthesis, multimodal understanding, difficult reasoning, and live web grounding. The provider should be replaceable behind stable contracts.

## Architectural decisions produced by the investigation

```text
ADR-004
  Claim-level truth, evidence, and epistemic status.

ADR-005
  Live web grounding is transient verification, not canonical knowledge ingestion.

ADR-006
  Wikimedia/open public knowledge packs form a versioned local baseline; lexicographic data uses Wiktionary and Wikidata Lexemes with specialist escalation.
```

New documentation pages:

```text
28 Truth, evidence, and epistemic status
29 Verification router, grounding, and model strategy
30 Public knowledge baseline and smart dictionary
31 Truth Lens and challenge-repair UX
32 This investigation record
```

## MVP conclusion

The truth iteration should not delay the daily-use workbench with a complete epistemic graph. The smallest valuable slice is:

```text
AI response can label:
  source-backed
  model-only
  needs citation
  web-checked
  interpretive

source-backed text links to source dossier + anchor

user can:
  open evidence
  verify one claim
  challenge one claim
  preview a repair patch
  accept/edit/reject
```

The full claim ledger, contradiction inbox, stale-claim dashboard, local Wikimedia packs, and advanced dictionary can follow.

## Volatile fact register

| Item | Checked | Why volatile | Recheck trigger |
|---|---:|---|---|
| Gemini model identifiers and availability | 2026-06-22 | previews and deprecations | before implementation and each release |
| Search grounding pricing/allowance | 2026-06-22 | provider pricing changes | before budget defaults; monthly in production |
| Search grounding billable unit | 2026-06-22 | model-family-dependent | when changing model family |
| Gemini data-use terms | 2026-06-22 | legal/service updates | before production, region/account changes |
| Grounding storage and display rules | 2026-06-22 | terms/guideline updates | before UI launch |
| Wikimedia dump formats | 2026-06-22 | export evolution | before parser implementation |
| Wikimedia Enterprise features/pricing | 2026-06-22 | product evolves | before choosing ingestion provider |
| Wikidata lexical model/tooling | 2026-06-22 | schema/tooling evolves | before lexicographic importer |

## Open risks and unresolved questions

```text
How much claim extraction can be automatic before it becomes noisy?
Which truth metadata belongs visibly in Markdown versus an adjacent sidecar?
How should exact claim text ranges survive user edits?
How should source independence be inferred without overclaiming?
What is the minimum useful specialist-source policy per domain?
Which Wikimedia pack sizes are practical on desktop and phone?
How should phone storage constraints affect knowledge-pack selection?
How should user-private knowledge and cloud verification be redacted?
Which local model size/architecture best handles claim splitting and citation mapping?
How should team disagreement and review roles be represented later?
```

These are implementation questions, not reasons to abandon the architecture.

## Recheck checklist

Before enabling a cloud verification provider:

```text
read current official pricing
read current official API terms
read current grounding-specific terms
read current client application/display guidelines
confirm service region and billing account state
confirm data-use classification
confirm retention statements
confirm model and tool compatibility
run cost tests with multi-query prompts
write provider-specific integration tests
update checked_at and source URLs
```

Before shipping a public knowledge pack:

```text
confirm source project and snapshot
confirm content and media licenses
produce attribution file
record parser/normalizer version
preserve revision trace
test deletion/rebuild of indexes
check device storage requirements
check update and rollback path
```

## Primary official sources used

### Google

- Grounding with Google Search: https://ai.google.dev/gemini-api/docs/google-search
- Gemini Developer API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini API Additional Terms of Service: https://ai.google.dev/gemini-api/terms
- Gemini API changelog: https://ai.google.dev/gemini-api/docs/changelog
- Gemini API rate limits: https://ai.google.dev/gemini-api/docs/rate-limits

### Wikimedia

- Wikimedia downloads: https://dumps.wikimedia.org/
- Wikimedia dump licensing: https://dumps.wikimedia.org/legal.html
- Wikimedia Foundation Terms of Use: https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use
- Wikidata lexicographical data: https://www.wikidata.org/wiki/Wikidata:Lexicographical_data
- Wikimedia Enterprise: https://enterprise.wikimedia.com/
- Wikimedia Enterprise project data: https://enterprise.wikimedia.com/project-data/
- Wikimedia Enterprise documentation: https://enterprise.wikimedia.com/docs/

All external facts above were checked on 2026-06-22 and should be treated as dated evidence.
