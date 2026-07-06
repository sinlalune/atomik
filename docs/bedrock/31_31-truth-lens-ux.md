---
{
  "id": "31-truth-lens-ux",
  "title": "Truth Lens and challenge-repair UX",
  "status": "planned",
  "eyebrow": "Trust interface",
  "summary": "The Truth Lens gives progressive, claim-level access to provenance, verification, freshness, disagreement, and repair actions without overwhelming ordinary reading or pretending that a green badge guarantees truth.",
  "tags": [
    "truth-lens",
    "ux",
    "citations",
    "verification",
    "repair",
    "accessibility",
    "operation-receipt",
    "cost-ux",
    "execution-location"
  ],
  "relations": [
    {
      "to": "03-workspace-tabs",
      "kind": "adds-inspector-view"
    },
    {
      "to": "06-ai-patch-pipeline",
      "kind": "renders-response-bundle"
    },
    {
      "to": "11-markdown-page-model",
      "kind": "annotates-visible-content"
    },
    {
      "to": "28-truth-evidence-model",
      "kind": "renders"
    },
    {
      "to": "29-verification-grounding-router",
      "kind": "invokes"
    },
    {
      "to": "30-public-knowledge-dictionary",
      "kind": "renders-dictionary-evidence"
    },
    {
      "to": "27-git-compatibility",
      "kind": "repairs-through-patches"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "surfaces-operation-receipts-from"
    }
  ],
  "agent": {
    "purpose": "Make epistemic status understandable and actionable through progressive disclosure rather than confidence theater or an exhausting wall of citations.",
    "inputs": [
      "claim records",
      "evidence records",
      "verification reports",
      "freshness state",
      "contradictions",
      "patch proposals"
    ],
    "outputs": [
      "subtle inline markers",
      "evidence drawer",
      "verification summary",
      "challenge workflow",
      "repair patch preview",
      "staleness queue",
      "compact operation badge",
      "expanded execution receipt"
    ],
    "invariants": [
      "The main reading experience remains calm and useful.",
      "No universal green check means objectively true.",
      "Unsupported, disputed, interpretive, normative, and stale claims remain distinguishable.",
      "Every status has an explanation and evidence path.",
      "A user can challenge a claim without leaving the current learning context.",
      "Repairs become explicit reviewable file patches.",
      "The interface remains useful offline and accessible without color alone.",
      "Cost disclosure does not expose raw private content and does not reduce epistemic status to price."
    ]
  }
}
---

# Truth Lens and challenge-repair UX

## Product role

Atomik should feel trustworthy because the user can inspect and repair knowledge, not because the interface looks authoritative.

The Truth Lens is a progressive-disclosure layer over generated and curated content:

```text
clean answer or note
  -> subtle claim markers
  -> answer-level truth summary
  -> claim evidence drawer
  -> verify / compare / challenge
  -> correction proposal
  -> patch preview
  -> accepted durable change + history
```

The lens should be available for AI answers, Markdown notes, dictionary entries, source dossiers, relation claims, and later visual scenes.

## Progressive disclosure

### Level 0 — normal reading

The content remains readable without metadata noise. Important conditions can appear in prose:

```text
“Current as of 2026-06-22”
“Interpretation”
“Disputed origin”
“Analogy”
“Needs citation”
```

### Level 1 — answer summary

A compact panel can show:

```text
Claims detected: 14
Direct factual claims: 8
Interpretive claims: 3
Analogies: 2
Normative claims: 1
Source-linked: 10
Cross-checked: 4
Needs evidence: 2
Disputed or contradicted: 1
Freshness checks required: 2
```

These are counts, not a single truth percentage.

### Level 2 — claim inspection

Selecting a sentence or marker opens:

```text
claim text
claim nature and scope
authorship
supporting evidence
contradicting or qualifying evidence
verification history
freshness date
source quality notes
known limitations
repair actions
```

### Level 3 — full audit

Power users can inspect:

```text
claim IDs and normalized forms
source anchors and quote hashes
provider/model trace
search query count and cost trace
source independence groups
verification method
patch and Git history
superseded claims
```

## Inline markers

Markers should be subtle and accessible. Use shape, text, icon, tooltip, and screen-reader labels—not color alone.

Possible compact labels:

```text
Source-backed
Primary source
Web-checked
Interpretation
Analogy
Normative
Disputed
Stale
Needs citation
Model-only
```

Avoid labels such as:

```text
True
Verified truth
100% reliable
AI certified
```

A claim can be supported and still later turn out wrong. The interface describes the procedure and evidence state.

## Answer-level summary design

Example:

```text
Truth Lens

Evidence coverage
  10 of 12 factual claims have inspectable evidence

Verification
  4 claims cross-checked
  2 claims rely on one secondary source

Epistemic character
  3 interpretations
  1 normative judgment
  2 explanatory analogies

Freshness
  2 current claims checked today
  1 claim should be rechecked after 30 days

Open issue
  1 etymology has competing hypotheses
```

The panel should explain why a claim is in each category and allow navigation to it.

## Evidence drawer

For each claim:

```text
Claim
  “...”

Scope
  time, jurisdiction, population, language, qualifiers

Support
  source dossier + anchor + relevant excerpt

Contradiction / qualification
  alternative source + reason

Verification
  method, date, result, limitations

Freshness
  current-as-of date and recheck policy

Actions
  open source
  compare sources
  verify now
  mark as interpretation
  add citation
  challenge
  propose correction
```

The drawer should open the actual local source at the anchor whenever possible, not only a generic URL.

## Challenge workflow

“Question this” is a first-class action.

```text
1. User selects a claim.
2. Atomik shows current claim type, scope, evidence, and last check.
3. User chooses the challenge reason:
     unsupported
     source does not say this
     outdated
     overgeneralized
     wrong interpretation
     biased or value-laden framing
     conflicting source
     mistranslation
     etymology doubtful
     other
4. Atomik builds a bounded verification plan.
5. Local evidence is checked first.
6. Targeted web verification is offered or run according to policy.
7. Atomik presents support, contradiction, and unresolved points.
8. A repair patch is proposed.
9. User accepts, edits, rejects, or preserves both views as disputed.
10. The verification and patch history remain inspectable.
```

The workflow should make it easier to correct a model than to silently copy its mistake into a note.

## Repair actions

Possible repairs:

```text
add a citation
replace an unsupported sentence
narrow scope
add date or jurisdiction
change fact label to interpretation
mark analogy and explain its limit
preserve two competing hypotheses
update stale statistic
correct translation
split mixed factual/normative prose
add uncertainty language
remove a fabricated source
```

A repair should not rewrite unrelated prose or flatten the user's style.

## Contradiction view

Contradictory claims should appear side by side:

| Claim A | Claim B | Possible explanation |
|---|---|---|
| statement + source | statement + source | date, scope, definition, method, translation, or genuine dispute |

The system should offer:

```text
resolve by scope
resolve by chronology
prefer primary source
keep both as disputed
ask user to choose framing
mark unresolved
```

Do not automatically pick the result with more search hits.

## Freshness UX

Freshness is claim-specific.

```text
stable mathematical definition
  no routine web refresh unless definition/scope is disputed

software API behavior
  recheck against current official docs

price or exchange rate
  live or near-live check

law
  jurisdiction + effective date + official source

etymology
  usually stable but may change with scholarship

ongoing event
  current-as-of timestamp prominently visible
```

The lens can maintain a staleness queue:

```text
claims whose policy window expired
sources whose URL or revision changed
statistics past their reference period
provider checks whose terms require revalidation
```

Rechecking should propose updates rather than silently rewriting knowledge.

## Source quality display

Avoid a universal ranking. Show dimensions:

```text
source class: primary / secondary / tertiary
publisher or institution
publication/revision date
author/editor information
methodology availability
peer review or editorial process
license and permanence
relationship to other sources
known conflicts of interest
scope match
```

The UI can offer plain-language summaries:

```text
“Primary official text for this legal provision.”
“Community encyclopedia overview; useful for orientation.”
“Specialist dictionary; etymology marked uncertain.”
“Three pages repeat the same press release.”
```

## Philosophy, ethics, and moral values

When prose shifts from description to evaluation, the lens should surface the frame without making the content unreadable.

Example:

```text
Direct fact
  “The policy was adopted in 2024.”

Interpretation
  “The policy represents a centralizing shift.”

Normative frame
  “From a rights-based perspective, the policy is objectionable because…”
```

The user should be able to choose whether the final note keeps the attribution, presents several frames, or records a personal synthesis.

## Dictionary and etymology lens

For a word entry, the lens can show:

```text
sense source
language variety
attestation
borrowed/inherited/derived relation
reconstructed form marker
alternative etymology
folk etymology warning
last source revision
```

A visually clear etymology chain should never hide that one transition is conjectural.

## High-stakes presentation

For Tier 3 claims:

```text
show authoritative source type
show jurisdiction/population/date
make limitations prominent
separate informational explanation from advice
make “open source” and “seek qualified review” available
prevent a mere model-only status from looking complete
```

Do not use fear-inducing banners for ordinary content. Escalation should be proportional and specific.

## Offline behavior

Truth Lens must remain useful without internet access:

```text
show local evidence
show installed knowledge-pack snapshot dates
show last external verification
mark current checks unavailable
allow local challenge and repair
queue optional web verification for later only as an explicit action
```

Do not present a stale local answer as current merely because live verification is unavailable.

## Accessibility

```text
status conveyed by text and icon, not color alone
keyboard navigation through claims and evidence
screen-reader descriptions for status and source anchors
plain-language label definitions
no tiny citation-only hit targets
user control over annotation density
reduced-motion support for highlights
```

## Cost and execution disclosure

The Truth Lens and AI panel should expose a compact receipt without turning normal reading into a monitoring dashboard.

```text
compact badge
  Local · €0 external · 1,240 context tokens · 84 ms

expanded receipt
  retrieval stages and selected context
  deterministic/local/cloud/web path
  provider/model/tool and version
  estimated vs actual tokens/work units
  cache usage, retries, and web queries
  latency and local resource measurements when available
  external estimated/reported/billed cost
  privacy mode and external bytes
  accepted/edited/rejected outcome
```

For local work, avoid a bare `€0` badge. Prefer:

```text
Local · €0 external · 3.2 s CPU · 420 MB peak RAM
```

The receipt is not evidence that the answer is true. Truth status and execution cost remain separate dimensions.

## Metrics that do not reward citation spam

Useful quality metrics:

```text
factual claims with inspectable evidence
citations whose anchors actually support the mapped claim
unresolved contradictions
stale high-risk claims
model-only claims accepted without review
repairs completed after challenge
source independence
external cost per accepted patch
context tokens per opened supporting citation
transcription correction effort per usable minute
autocomplete accepted characters per inference second
```

Bad target metrics:

```text
maximum number of citations
maximum percentage labeled “verified”
minimum visible uncertainty
number of web searches per answer
minimum cost regardless of correctness or usefulness
maximum local/cloud ratio as a vanity metric
```

The system should reward appropriate evidence and honest uncertainty, not decorative density.

## MVP slice

```text
answer-level labels:
  source-backed
  model-only
  needs citation
  checked with web
  interpretive

operation receipt:
  local/cloud/tool badge
  basic tokens/work units, latency, external cost, and privacy mode

claim selection:
  open mapped source anchor
  verify claim
  challenge claim

repair:
  propose replacement/add-citation patch
  preview diff
  accept/edit/reject
```

The MVP does not need a full global claim graph. It needs one useful end-to-end challenge and repair loop.

## Later

```text
automatic claim segmentation
contradiction inbox
staleness dashboard
source independence analysis
cross-language claim comparison
visual evidence graphs
reputation and source-pack policies
team review roles
claim-level Git blame and history
```

## Acceptance tests

```text
A normal note remains readable with the lens closed.
A model-only factual claim is visibly distinguishable when the lens opens.
The user can reach the exact source anchor from a claim.
Color-blind and keyboard-only users can identify statuses.
A challenge produces a verification report and patch proposal.
A disputed claim can preserve both positions.
A stale claim is not silently refreshed.
A human acceptance event is shown as editorial state, not proof.
A correction produces one meaningful diff.
A local result shows external cost and measured local work without implying it is free.
A receipt can be inspected without revealing raw prompt/source content by default.
```
