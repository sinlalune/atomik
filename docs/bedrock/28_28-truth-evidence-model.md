---
{
  "id": "28-truth-evidence-model",
  "title": "Truth, evidence, and epistemic status",
  "status": "foundational",
  "eyebrow": "Epistemic architecture",
  "summary": "Atomik does not treat model output, file persistence, citations, or human acceptance as truth by themselves; it records claim type, evidence, verification, freshness, disagreement, and review state so knowledge can be inspected and repaired.",
  "tags": [
    "truth",
    "evidence",
    "claims",
    "epistemology",
    "provenance",
    "verification",
    "operation-trace",
    "execution-cost"
  ],
  "relations": [
    {
      "to": "00-orientation",
      "kind": "clarifies"
    },
    {
      "to": "04-file-first-model",
      "kind": "distinguishes-record-from-truth"
    },
    {
      "to": "06-ai-patch-pipeline",
      "kind": "extends-response-contract"
    },
    {
      "to": "07-source-adapters",
      "kind": "uses-evidence-from"
    },
    {
      "to": "11-markdown-page-model",
      "kind": "annotates"
    },
    {
      "to": "20-relations-future",
      "kind": "promotes-claims-into"
    },
    {
      "to": "29-verification-grounding-router",
      "kind": "verified-by"
    },
    {
      "to": "31-truth-lens-ux",
      "kind": "surfaced-by"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "separates-execution-receipts-from-epistemic-support"
    }
  ],
  "agent": {
    "purpose": "Make generated and curated knowledge inspectable at claim level without pretending that a model confidence score or a citation badge makes content true.",
    "inputs": [
      "generated statement",
      "user-authored statement",
      "source anchor",
      "evidence record",
      "verification event",
      "claim dispute",
      "freshness requirement"
    ],
    "outputs": [
      "claim record",
      "evidence links",
      "epistemic labels",
      "verification report",
      "uncertainty disclosure",
      "repair patch",
      "action trace references"
    ],
    "invariants": [
      "File authority and epistemic authority are different concepts.",
      "A citation shows traceability, not automatic correctness.",
      "Human acceptance records workflow state, not factual truth.",
      "Claim nature, evidence status, verification result, freshness, and review state remain separate dimensions.",
      "Interpretive and normative claims must not be presented as neutral direct facts.",
      "Unsupported claims remain visible as unsupported instead of receiving invented citations.",
      "Every durable correction remains reviewable and versionable.",
      "An ActionTrace explains execution and cost; it is not evidence that a claim is true.",
      "Provider/model usage is linked through cross-action trace IDs rather than becoming an epistemic status."
    ]
  }
}
---

# Truth, evidence, and epistemic status

## Core position

Atomik should not promise that a language model is always correct. Models are allowed to make mistakes. The product promise is stronger and more realistic:

```text
Every important generated claim can show:
  what kind of claim it is
  where it came from
  what evidence supports or contradicts it
  how it was checked
  when it was checked
  what remains uncertain
  how the user can challenge or repair it
```

The desired path is:

```text
mistake -> detectable
unsupported claim -> visible
uncertainty -> labeled
contradiction -> surfaced
stale claim -> recheckable
accepted correction -> durable patch + history
```

Atomik therefore treats truth as an **inspectable epistemic process**, not a green badge produced by a model.

## Two meanings that must not be confused

The existing file-first principle uses “source of truth” in the software architecture sense. The truth iteration makes the distinction explicit:

```text
file authority
  Which representation is the durable source of record for project state?
  Answer: readable project files, source dossiers, notes, logs, ADRs, and accepted patches.

epistemic authority
  Why should a factual or interpretive claim be believed?
  Answer: evidence, source quality, independent agreement, appropriate method, scope, and freshness.
```

A sentence does not become factually true because it was saved to Markdown, accepted by a user, committed to Git, repeated by several models, or decorated with a citation. Those actions make it durable and traceable. They do not by themselves establish the world-state described by the sentence.

The updated foundation is:

```text
Files are the durable source of record.
Evidence determines epistemic support.
Verification records how support was tested.
Users retain editorial authority over what enters their knowledge base.
```

## Truth is layered, not binary

Generated content often mixes different epistemic objects. Atomik should separate them instead of applying one global confidence value.

| Claim nature | Example | Required treatment |
|---|---|---|
| Direct factual claim | “The paper was published in 2017.” | source, date, anchor, freshness if relevant |
| Measurement or statistic | “The population was X.” | methodology, unit, date, source version, uncertainty |
| Definition | “A derivative measures local rate of change.” | domain and pedagogical scope; cite when formal or contested |
| Scientific claim | “This intervention reduces risk.” | evidence hierarchy, population, study limits, recency |
| Historical claim | “The law entered into force in 1905.” | primary/secondary source distinction, jurisdiction, date |
| Etymological claim | “The word entered French through…” | language stages, attestation, reconstruction, dispute status |
| Interpretation | “This marks a shift in political thought.” | attribute perspective and sources; do not present as raw fact |
| Analogy or explanation | “Attention behaves like a lookup.” | label as analogy; explain where it breaks |
| Prediction | “This technology will become dominant.” | assumptions, horizon, uncertainty; never disguise as fact |
| Normative claim | “This action was unjust.” | surface ethical or political frame and relevant reasons |
| User synthesis | “My current understanding is…” | preserve authorship and sources of influence without laundering it into consensus |

This is the subtle epistemology Atomik needs. The interface should not become a philosophy lecture, but it should stop fact, interpretation, analogy, and value judgment from silently collapsing into one prose voice.

## Reject the single “truth score”

A single percentage such as `truth: 87%` is attractive and usually misleading. It combines unrelated questions:

```text
Did the source really say this?
Is the source competent for the claim?
Are multiple sources independent?
Is the claim current?
Is the statement scoped correctly?
Is it a fact, interpretation, or value judgment?
Did the verifier search widely enough?
Did the model faithfully synthesize the evidence?
```

Atomik may expose calibrated probabilities when a domain genuinely supports them, such as a statistical estimate with a confidence interval. It should not manufacture a universal probability of truth from model self-confidence.

Use **orthogonal epistemic dimensions** instead.

## Epistemic dimensions and labels

Labels are composable. They are not one mutually exclusive status field.

### Claim nature

```text
factual
measurement
scientific
historical
lexicographic
etymological
interpretive
analogical
predictive
normative
user-synthesis
procedural
```

### Evidence origin

```text
model-only
user-authored
local-source-backed
local-public-knowledge-backed
web-grounded
primary-source-backed
secondary-source-backed
```

### Verification state

```text
unchecked
source-linked
locally-verified
web-verified
cross-checked
partially-supported
contradicted
insufficient-evidence
disputed
```

### Freshness state

```text
stable-domain
current-as-of:<date>
stale
freshness-unknown
recheck-required
```

### Workflow state

```text
draft
needs-review
human-accepted
human-edited
superseded
rejected
```

Examples:

```text
factual + primary-source-backed + locally-verified + stable-domain + human-accepted
interpretive + secondary-source-backed + disputed + current-as-of:2026-06-22 + draft
etymological + local-public-knowledge-backed + partially-supported + recheck-required + needs-review
analogical + model-only + unchecked + stable-domain + human-edited
```

`human-accepted` means “the user chose to keep this version.” It does not mean “this is objectively true.”

## Claim record

Atomik should be able to represent a claim independently from its prose rendering. Claim extraction may be ephemeral for ordinary writing; a claim record becomes durable when it matters for citation, verification, disagreement, staleness, or later reuse.

```ts
type ClaimRecord = {
  id: string
  statement: string
  normalizedStatement?: string

  nature:
    | 'factual'
    | 'measurement'
    | 'scientific'
    | 'historical'
    | 'lexicographic'
    | 'etymological'
    | 'interpretive'
    | 'analogical'
    | 'predictive'
    | 'normative'
    | 'user-synthesis'
    | string

  scope?: {
    subject?: string
    jurisdiction?: string
    population?: string
    language?: string
    time?: string
    qualifiers?: string[]
  }

  authorship: {
    kind: 'user' | 'model' | 'source-extract' | 'mixed'
    actor?: string
    operationId?: string
  }

  evidence: EvidenceRef[]
  verificationEvents: VerificationEventRef[]

  labels: string[]
  uncertainty?: string[]
  counterclaims?: ClaimRef[]

  lifecycle: {
    status: 'draft' | 'needs-review' | 'human-accepted' | 'superseded' | 'rejected'
    createdAt: string
    updatedAt?: string
    acceptedAt?: string
  }
}
```

The `statement` is not enough. Scope and qualifiers prevent a supported narrow claim from being expanded into an unsupported generalization.

## Evidence record

Evidence should point to inspectable material, not only to a bibliography entry.

```ts
type EvidenceRecord = {
  id: string
  source: {
    sourceDossierPath?: string
    externalUrl?: string
    title?: string
    authorOrPublisher?: string
    sourceType?: string
    publicationDate?: string
    accessedAt?: string
    versionOrRevision?: string
    license?: string
  }

  anchor?: {
    kind: 'heading' | 'page' | 'quote' | 'time-range' | 'image-region' | 'dom' | string
    value: string
    quoteHash?: string
  }

  role: 'supports' | 'contradicts' | 'qualifies' | 'background' | 'defines'
  sourceClass?: 'primary' | 'secondary' | 'tertiary' | 'user-source' | 'unknown'
  independenceGroup?: string
  notes?: string[]
}
```

`independenceGroup` matters because ten websites repeating one press release are not ten independent confirmations.

A citation shows that the claim is traceable to a source. The source may still be wrong, outdated, misquoted, low quality, conflicted, or outside its domain of competence.

## Verification event and report

Verification records an action and its result. It should not overwrite the original claim or erase disagreement.

```ts
type VerificationEvent = {
  id: string
  claimId: string
  method:
    | 'source-anchor-check'
    | 'local-cross-check'
    | 'web-search-grounding'
    | 'primary-source-check'
    | 'calculation'
    | 'code-execution'
    | 'human-review'
    | string

  performedAt: string
  performedBy: {
    kind: 'user' | 'local-model' | 'cloud-model' | 'deterministic-tool'
    provider?: string
    model?: string
  }

  result: 'supported' | 'partially-supported' | 'contradicted' | 'insufficient' | 'inconclusive'
  evidenceAdded?: EvidenceRef[]
  scopeChecked?: string
  freshnessCheckedAt?: string
  limitations?: string[]
  actionTraceIds?: string[]

  // Optional denormalized display summary; ActionTrace remains authoritative for execution accounting.
  costSummary?: {
    inputTokens?: number
    outputTokens?: number
    webQueries?: number
    estimatedCurrency?: string
    estimatedAmount?: number
  }
}
```

A verification report can cover several claims and explain shared limitations:

```text
claims checked
sources consulted
source independence
support / contradiction / missing evidence
freshness
method limitations
provider and model trace
cost trace
suggested repair
```

## Answer bundle

A trustworthy AI response is more than prose.

```ts
type TruthAwareResponseBundle = {
  visibleBlocks: AiOutputBlock[]
  claims: ClaimRecord[]
  evidence: EvidenceRecord[]
  verification: VerificationEvent[]
  uncertainties: Array<{
    claimId?: string
    message: string
    severity?: 'info' | 'important' | 'blocking'
  }>
  patchProposals: PatchProposal[]
  actionTraceIds: string[]

  // Temporary compatibility field while provider integrations migrate.
  providerTrace?: ProviderTrace[]
}
```

The user should see a clean answer first. The claim and evidence structure should be available through progressive disclosure and should remain exportable.

Execution receipts remain orthogonal to truth metadata:

```text
EvidenceRecord / VerificationEvent
  why and how a claim is supported, contradicted, or unresolved

ActionTrace
  which retrieval/model/tool/web/patch steps ran, their budgets, latency, privacy, and cost
```

A costly verification is not automatically strong evidence, and a local zero-external-cost result is not automatically correct.

## Persistence profiles

Atomik must not force every sentence into a heavy ontology. Use three levels.

### Lightweight note

```text
ordinary Markdown
optional citations
no durable claim ledger unless needed
```

### Evidence-aware note

```text
ordinary Markdown
source links and anchors
visible claim nature/status for important statements
optional adjacent machine sidecar for exact text ranges
```

### Promoted claim

```text
human-readable claim note or claim section
explicit evidence list
verification history
counterclaims/dispute notes
stable ID suitable for graph projection
```

An optional machine sidecar may map exact text offsets, source coordinates, or claim IDs. It must not be the only place where the user can discover that a statement is unsupported, disputed, or stale.

Possible folder shape later:

```text
truth/
  index.md
  claims/
    claim_<id>.md
  verification/
    verification_<id>.md
```

This folder is optional. The MVP can keep claim records in response bundles and note-adjacent metadata while rendering the important status in Markdown.

## Fact, interpretation, and values

Atomik should surface epistemic character without pretending neutrality is value-free.

For philosophy, ethics, politics, history, religion, art, and social theory:

```text
established event or textual fact
  separate from
scholarly interpretation
  separate from
ethical evaluation
  separate from
model-generated analogy
  separate from
user synthesis
```

A sentence may legitimately combine these, but the UI and generated prose should make the transitions intelligible.

Examples:

```text
Direct fact:
  “The text was published in 1867.”

Interpretation:
  “Many historians read this passage as a break with…”

Normative judgment:
  “Under a rights-based ethical framework, this practice is unjust.”

User synthesis:
  “My current reading is that the argument depends on…”
```

## Contradiction and dispute

Contradiction is not merely an error state. It can reveal:

```text
different time periods
different jurisdictions
different definitions
different populations
different source traditions
different translations
scholarly disagreement
measurement error
source copying
model synthesis error
```

The system should preserve the conflicting claims and ask what scope or evidence resolves them. It should not silently choose the most frequent web wording.

## High-stakes domains

For medical, legal, financial, safety-critical, and similarly consequential claims:

```text
use authoritative and current sources
show jurisdiction/population/date
surface limitations and disagreement
require stronger verification policy
avoid presenting generated content as professional advice
make human review prominent
```

A warning is not a substitute for evidence, and evidence is not a substitute for a qualified professional where professional judgment is required.

## Acceptance criteria

The truth architecture is working when:

```text
A model-only claim cannot masquerade as source-backed.
A citation can be opened at the relevant anchor.
A user can see whether a statement is fact, interpretation, analogy, or value judgment.
A stale claim can be found and rechecked.
A contradiction is preserved with its sources.
A correction creates a small reviewable patch.
Deleting a derived index does not delete the visible evidence trail.
A human acceptance event is not rendered as proof of factual truth.
```

## Common failure modes

```text
one confidence percentage for an entire answer
citations attached only at paragraph end with unclear claim mapping
citation laundering: a source exists but does not support the sentence
source-counting without independence analysis
using model agreement as external verification
marking all Wikipedia content as either authoritative or untrustworthy
hiding unsupported claims because the prose is fluent
turning every casual note into an exhausting formal schema
silently replacing disputed content with one preferred narrative
using “human accepted” as a truth badge
```
