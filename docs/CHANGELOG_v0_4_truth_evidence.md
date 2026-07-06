# Atomik Bedrock v0.4 — Truth, evidence, and verification

Release date: 2026-06-22  
Release theme: trustworthy generated knowledge without pretending that models, citations, files, or human acceptance are infallible.

## Constitutional correction

The previous file-first doctrine remains foundational, but its use of “truth” is now disambiguated:

```text
Files are the durable source of record for project state.
Evidence determines epistemic support for claims.
Verification records how that support was tested.
Users retain editorial authority over accepted knowledge.
```

Saving a statement to Markdown makes it durable, inspectable, patchable, and versionable. It does not make the statement factually correct. A citation establishes traceability, not automatic correctness. Human acceptance records workflow state, not final truth.

## New foundational documentation

- `28_28-truth-evidence-model.md` defines claim nature, evidence origin, verification state, freshness, workflow state, evidence records, claim records, verification reports, disagreement, uncertainty, and persistence profiles. It explicitly rejects a universal one-number truth score.
- `29_29-verification-grounding-router.md` defines local-first and risk-aware routing across project evidence, local public knowledge, live web verification, deterministic tools, and human review. It also records cost, privacy, provider-policy, and small-local-model boundaries.
- `30_30-public-knowledge-dictionary.md` defines versioned public knowledge packs, the role of Wikipedia/Wiktionary/Wikidata, licensing and freshness requirements, specialist-source escalation, and a structured lexicographic/etymological model.
- `31_31-truth-lens-ux.md` defines progressive disclosure, claim markers, evidence drawers, contradiction/freshness views, challenge-repair flows, accessibility, and the boundary between confidence theater and inspectable trust.
- `32_32-truth-investigation-record.md` preserves the dated investigation behind the architecture, including current Google grounding behavior and pricing observations, provider-use restrictions, privacy findings, Wikimedia findings, cost implications, unresolved risks, and explicit recheck triggers.

## New architecture decisions

- `ADR-004-claim-level-truth-evidence.md`: claim-level truth/evidence model; file authority is distinct from epistemic authority.
- `ADR-005-live-grounding-transient-verification.md`: live grounding is a transient verifier and source-discovery aid, not a harvested canonical knowledge pipeline.
- `ADR-006-public-knowledge-lexicographic-baseline.md`: versioned public knowledge packs and structured dictionary/etymology support form the broad local baseline, while specialist domains can escalate to stronger sources.

Existing ADR-001 through ADR-003 now cross-reference and respect these decisions.

## New machine contracts and fixtures

Machine-readable contracts:

- `truth_evidence_contract_v0_1.json`
- `verification_provider_policy_v0_1.json`
- `public_knowledge_pack_contract_v0_1.json`

Updated machine contracts retain their legacy filenames but now carry v0.4 or revised content:

- `architecture_kernels_v0_2.json`
- `mvp_roadmap_v0_2.json`
- `electron_security_contract_v0_2.json`
- `atomik_dsl_reserved_spec_v0_1.json`

New fixtures:

- `truth_claim_fixture.md`
- `verification_report_fixture.json`
- `dictionary_entry_fixture.md`

## Cross-cutting updates to the existing bedrock

All numbered pages `00` through `27` were reviewed and updated where relevant. The changes include:

```text
orientation and founding invariants
learning and challenge-repair loops
workspace and Truth Lens views
file authority versus epistemic authority
selection-to-claim candidates
AI response bundles and verification policy
source evidence and import boundaries
capture transcription uncertainty
web grounding versus web source import
PDF extraction fidelity
Markdown evidence profiles
Electron provider-key and privacy boundaries
kernel incubation rules
maintenance and documentation requirements
Dev Docs truth/recheck views
self-evolving documentation and volatile facts
roadmap sequencing
DSL/canvas epistemic boundaries
relation claims and graph projections
agent handoff requirements
official reference register
new documentation templates
truth-sensitive use cases
context retrieval versus evidential support
Git-friendly truth/evidence diffs
```

## Implementation sequence

The workbench-first thesis is preserved. Truth work is introduced in bounded layers rather than as a premature graph or ontology project:

```text
M0  Electron shell
M1  Markdown vault and project bundle
M2  AI over notes + minimum truth contract
M3  phone capture source
M4  PDF source
M5  web source import
M6  Truth Lens and challenge-repair
M7  live verification provider
M8  context and retrieval
M9  public knowledge packs + dictionary/etymology
M10 truth maintenance and stale-claim review
M11 Atomik DSL
M12 canvas
```

The minimum early contract records claim candidates, source anchors, unsupported claims, uncertainty, and a user-visible challenge action. Expensive claim graphs, automatic background rechecking, and full offline Wikimedia ingestion remain later milestones.

## Google grounding boundary recorded in the docs

The investigation dated 2026-06-22 records that current Gemini Search grounding behavior, pricing, terms, and data handling are volatile provider facts. The durable architecture therefore does not hard-code those observations.

The selected boundary is:

```text
Google Search grounding
  = live, user-visible verification and source discovery
  ≠ canonical Atomik memory
  ≠ a link-harvesting crawler
  ≠ a dataset-building pipeline
```

A destination page can become durable Atomik evidence only through a separate, user-visible source-adapter import that creates a local source dossier and respects licensing, privacy, and source fidelity.

## Local-model strategy preserved

The future local model is not required to contain the whole world in its parameters. The harness supplies project context, local public knowledge, schemas, validators, deterministic tools, and evidence anchors.

Small local models are prioritized for:

```text
routing
claim splitting and classification
source/anchor extraction
citation formatting
contradiction candidate detection
patch drafting
query planning
local retrieval assistance
```

Cloud or larger models remain optional escalation paths for difficult synthesis, multimodal interpretation, and live verification. Provider adapters stay replaceable.

## Generated artifacts

`docs_source.json` and the standalone `index.html` Dev Docs viewer are regenerated for v0.4 and include all 33 numbered documentation pages plus indexes for ADRs, machine contracts, fixtures, and the release record.

## Validation expectations

The release is considered valid only when:

```text
all JSON files parse
all numbered Markdown frontmatter parses
all documentation IDs are unique
all internal relation targets resolve
Markdown code fences are balanced
Dev Docs embedded JSON matches docs_source.json
source ZIP extraction reproduces the source tree byte-for-byte
RAG group markers and hashes reproduce each embedded file
lossless base64 file map round-trips every source file
```

## Important non-claims

This release does not claim that:

```text
all generated content is mistake-proof
all citations are correct
Wikipedia is the final authority for every subject
provider prices or terms will remain unchanged
one model confidence value can represent truth
human acceptance converts a claim into fact
visual polish or graph centrality establishes epistemic authority
```

Instead, Atomik is designed to make mistakes visible, challengeable, source-linked, and repairable.
