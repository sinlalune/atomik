---
{
  "id": "30-public-knowledge-dictionary",
  "title": "Public knowledge baseline and smart dictionary",
  "status": "foundational",
  "eyebrow": "Knowledge packs",
  "summary": "Atomik may use versioned Wikimedia and other open knowledge packs as a broad local baseline while preserving attribution, freshness, uncertainty, specialist-source escalation, and a richer lexicographic/etymological model than flat definitions.",
  "tags": [
    "wikipedia",
    "wiktionary",
    "wikidata",
    "lexemes",
    "dictionary",
    "etymology",
    "knowledge-packs",
    "licensing"
  ],
  "relations": [
    { "to": "07-source-adapters", "kind": "adds-public-knowledge-adapters" },
    { "to": "11-markdown-page-model", "kind": "adds-lexicographic-pages" },
    { "to": "26-okf-agent-context", "kind": "feeds-local-retrieval" },
    { "to": "28-truth-evidence-model", "kind": "uses-epistemic-labels" },
    { "to": "29-verification-grounding-router", "kind": "provides-layer-b" },
    { "to": "31-truth-lens-ux", "kind": "surfaces-source-quality" },
    { "to": "32-truth-investigation-record", "kind": "derived-from" }
  ],
  "agent": {
    "purpose": "Use broad public knowledge as an attributable, versioned starting layer without confusing a general encyclopedia or community dictionary with final authority for every specialist claim.",
    "inputs": [
      "Wikimedia dump or API record",
      "Wikipedia article",
      "Wiktionary entry",
      "Wikidata item or Lexeme",
      "specialist dictionary",
      "open textbook",
      "user-installed knowledge pack"
    ],
    "outputs": [
      "versioned knowledge pack",
      "attribution record",
      "local retrieval index",
      "dictionary entry",
      "etymology chain",
      "specialist-source escalation",
      "freshness warning"
    ],
    "invariants": [
      "Wikipedia is a powerful orientation and consensus map, not universal final authority.",
      "Wiktionary and Wikidata Lexemes are complementary, not interchangeable.",
      "Every installed pack records source project, language, revision/snapshot date, license, and attribution requirements.",
      "Specialist claims may require sources beyond Wikimedia.",
      "Etymological uncertainty, reconstruction, disputed origin, and folk etymology remain visible.",
      "The local model retrieves and explains pack content; it does not silently convert pack presence into certainty.",
      "Generated normalized records remain traceable to the underlying source revision."
    ]
  }
}
---

# Public knowledge baseline and smart dictionary

## Position

Wikipedia, Wiktionary, and Wikidata are among the most useful shared knowledge structures available to a local-first learning tool. They should become an important baseline for Atomik, but not an unquestioned authority layer.

The balanced stance is:

```text
Wikipedia
  orientation source
  broad consensus map
  terminology and reference graph
  starting bibliography
  multilingual overview

Wiktionary
  community dictionary entry
  definitions, forms, pronunciations, usage, quotations, etymologies
  language-edition-specific structure and conventions

Wikidata
  structured identifiers and statements
  cross-project linking
  Lexemes, Forms, and Senses for lexical data

specialist sources
  domain depth
  primary scholarship
  professional standards
  contested or rapidly evolving topics
```

Atomik should help the user move from broad orientation to the best available source for the actual claim.

## Wikipedia as a pillar, not a terminus

Wikipedia is exceptionally valuable because it combines:

```text
breadth
multilingual coverage
community revision
citations and bibliographies
concept links
revision history
common terminology
```

For many ordinary topics, it is a practical representation of mainstream knowledge. For specialist, disputed, very recent, local, indigenous, technical, legal, medical, historical, or culturally sensitive topics, it may be incomplete, uneven, or downstream from better sources.

Atomik should display Wikipedia-derived content with useful but restrained language:

```text
“Broad reference baseline”
“Community-maintained overview”
“Snapshot dated YYYY-MM-DD”
“See cited/specialist sources for depth”
```

Avoid both extremes:

```text
“Wikipedia says it, therefore it is true.”
“Wikipedia is editable, therefore it is useless.”
```

## Source escalation ladder

The preferred source depends on the claim.

| Claim | Useful starting source | Escalate to |
|---|---|---|
| broad concept orientation | Wikipedia | textbooks, review articles, official references |
| current law or regulation | Wikipedia for context | official legislation, regulator, court or government source |
| software behavior | Wikipedia rarely | official docs, source code, release notes, tests |
| scientific effect | review overview | peer-reviewed primary/review evidence, official health/science bodies |
| historical date | encyclopedia | primary record and reputable historians |
| word meaning | Wiktionary | authoritative dictionaries, corpora, usage evidence |
| etymology | Wiktionary | historical dictionaries, linguistic scholarship, attestations |
| living public figure or event | Wikipedia for map | current official and reputable reporting sources |
| technical specialist concept | broad article | standards, manuals, papers, domain experts |

The router should select sources by fitness for the claim, not by a universal website ranking.

## Local knowledge packs

A knowledge pack is a versioned, attributable, rebuildable local corpus used for retrieval.

```text
knowledge-packs/
  wikimedia-en-2026-06/
    index.md
    pack.atomik-knowledge.json
    attribution.md
    source-manifest.json
    articles/
    lexemes/
    indexes/                 # rebuildable
    log.md
```

The pack manifest should include:

```ts
type KnowledgePackManifest = {
  id: string
  title: string
  kind: 'wikipedia' | 'wiktionary' | 'wikidata' | 'dictionary' | 'textbook' | string
  languages: string[]
  sourceProjects: string[]
  snapshotDate: string
  importedAt: string
  sourceUrls: string[]
  sourceRevisionPolicy: string
  license: {
    identifiers: string[]
    attributionPath: string
    shareAlike?: boolean
    notes?: string[]
  }
  content: {
    records: number
    byteSize?: number
    includedScopes?: string[]
    excludedScopes?: string[]
  }
  normalizationVersion?: string
  indexVersion?: string
  integrity?: {
    hashes?: Record<string, string>
  }
}
```

Indexes and embeddings are derived. The pack's source records, attribution, version, and normalization trace are the durable base.

## Ingestion options

### Wikimedia dumps

Wikimedia publishes content exports/dumps of public wikis. Dumps are appropriate for:

```text
offline use
versioned snapshots
bulk local retrieval
reproducible indexing
language-specific packs
```

They can be large and require parsers, template handling, redirect resolution, attribution, and update strategy. Start with selected article packs or smaller language/domain scopes before attempting a complete multilingual mirror.

### Wikimedia Enterprise

Wikimedia Enterprise provides structured, high-volume access to Wikipedia and other supported Wikimedia projects, including Wiktionary and Wikidata. It may reduce parser burden and support fresher structured access.

Treat it as an optional provider adapter:

```text
useful for structured delivery and updates
not required for file-first durability
not the only possible source
provider terms/pricing remain re-checkable
imported records still carry project, revision, license, and attribution
```

### Direct project APIs and user imports

For MVP and focused work:

```text
user imports one article or dictionary entry
Atomik stores source metadata and revision
reader extraction becomes Markdown
claims cite the imported revision
```

This is much cheaper to implement than full dumps and teaches the source/evidence workflow early.

## Licensing and attribution

Open does not mean attribution-free or structure-free.

For every public knowledge pack:

```text
record the license of each content class
record source project and language edition
record revision or snapshot date
preserve attribution required by the license
preserve share-alike obligations where applicable
separate text licensing from media licensing
avoid implying Wikimedia endorsement
```

Wikimedia text and media can carry different licenses. A pack that includes images, audio, or quotations must retain item-level licensing where necessary.

Atomik should generate an `attribution.md` suitable for export and a machine-readable manifest suitable for audit.

## Smart dictionary thesis

Atomik should not be only a word-to-one-definition lookup. A dictionary entry is a compact knowledge graph with historical and epistemic structure.

```text
word form
  -> language and variety
  -> grammatical category
  -> pronunciation
  -> morphological forms
  -> senses
  -> usage labels
  -> attestations and examples
  -> semantic relations
  -> etymology path
  -> cognates and borrowings
  -> sources and uncertainty
```

The dictionary should explain **how we know**, especially for etymology.

## Wiktionary and Wikidata Lexemes

Wiktionary pages are rich human-authored entries whose templates and conventions differ by language edition. Wikidata's lexicographical model stores lexical information in structured entities:

```text
Lexeme
  the lexical unit, language, and lexical category

Form
  an inflected or otherwise realized form with grammatical features

Sense
  a meaning of the lexeme, with glosses and statements
```

Use both:

```text
Wiktionary
  richer prose, etymology sections, quotations, pronunciations, usage notes

Wikidata Lexemes
  stable identifiers, structured forms/senses, cross-links, machine queries
```

Do not assume every Wiktionary entry has a complete matching Lexeme or that every Lexeme has rich etymological evidence.

## Dictionary entry contract

```ts
type DictionaryEntry = {
  id: string
  lemma: string
  language: {
    code: string
    name: string
    variety?: string
    script?: string
    historicalStage?: string
  }
  lexicalCategory?: string
  forms: Array<{
    written: string
    grammaticalFeatures?: string[]
    pronunciationRefs?: string[]
    sourceRefs?: string[]
  }>
  pronunciations?: Array<{
    notation: 'IPA' | 'audio' | string
    value: string
    regionOrVariety?: string
    sourceRefs?: string[]
  }>
  senses: Array<{
    id: string
    glosses: Record<string, string>
    definition?: string
    usageLabels?: string[]
    examples?: string[]
    semanticRelations?: Array<{ kind: string; target: string }>
    sourceRefs: string[]
    status?: string[]
  }>
  etymologies?: EtymologyPath[]
  sourceRefs: string[]
  snapshot?: {
    sourceProject?: string
    revision?: string
    checkedAt?: string
  }
}
```

## Etymology path contract

Etymology must be represented as a chain of claims, not a decorative sentence.

```ts
type EtymologyPath = {
  id: string
  appliesToSenseIds?: string[]
  status: 'attested' | 'reconstructed' | 'partly-reconstructed' | 'disputed' | 'unknown'
  steps: Array<{
    fromForm?: string
    fromLanguage?: string
    toForm: string
    toLanguage: string
    relation:
      | 'inherited-from'
      | 'borrowed-from'
      | 'calque-of'
      | 'derived-from'
      | 'compound-of'
      | 'semantic-shift-from'
      | 'reconstructed-from'
      | string
    approximateDate?: string
    attestation?: string
    reconstructionMarker?: string
    sourceRefs: string[]
    uncertainty?: string[]
  }>
  alternatives?: Array<{
    description: string
    sourceRefs: string[]
    status: 'minority' | 'disputed' | 'folk-etymology' | 'rejected' | string
  }>
}
```

## Etymology rules

```text
Mark reconstructed forms explicitly, commonly with the scholarly reconstruction convention.
Do not turn “possibly” or “perhaps” into a definite chain.
Distinguish inherited development from borrowing.
Distinguish word-form history from sense history.
Distinguish a source's proposal from scholarly consensus.
Preserve alternate hypotheses when reputable sources disagree.
Label folk etymology as folk etymology rather than repeating it as history.
Keep language stages and transliteration explicit.
Link each important transition to evidence or a source.
Avoid deriving a word merely because two forms look similar.
```

A simple entry can still read naturally:

```md
# philosophy

**Language:** English  
**Part of speech:** noun

## Current senses

1. The systematic study of fundamental questions concerning existence, knowledge, reason, value, mind, and language.

## Etymology

Borrowed through Old French and Latin traditions from Ancient Greek *philosophía*, conventionally analyzed from elements meaning “love” and “wisdom.”

**Status:** broadly supported summary; historical transmission simplified.  
**Evidence:** source links and language-stage notes available in the Truth Lens.
```

The user-facing summary can be elegant while the evidence drawer retains the full path and uncertainty.

## Specialist dictionary sources

Wiktionary can be the baseline, not the ceiling.

Potential source classes:

```text
historical dictionaries
language academies
corpora
etymological dictionaries
philological editions
terminology standards
scientific nomenclature databases
indigenous language resources
user-provided local dictionaries
```

Before importing, record:

```text
license and permitted reuse
language/region coverage
revision date
editorial method
whether examples can be redistributed
whether entries may be cached or indexed
attribution requirements
```

Some excellent dictionaries are not openly licensed. Atomik can still support user-side links or locally supplied personal source files without redistributing restricted content.

## Cultural, ethical, and historical care

Dictionary and encyclopedia content can encode value judgments and power relations.

Atomik should surface:

```text
historical or offensive usage labels
self-identification versus externally imposed terms
colonial or obsolete names
contested transliterations
regional variation
prescriptive versus descriptive claims
changes in accepted terminology
source community and editorial perspective
```

The system should not erase uncomfortable history, normalize slurs through decontextualized examples, or present one institution's preferred terminology as timeless universal fact.

## Freshness and pack updates

Every pack is a snapshot.

```text
pack snapshot date
article/entry revision date when available
last local index build
last verification against upstream
update channel
known parser/normalization limitations
```

A 2026 snapshot may be excellent for ancient philosophy and stale for a 2026 election, software API, or ongoing war. The verification router should use subject volatility, not pack age alone.

## Build order

### MVP

```text
manual import of a Wikipedia/Wiktionary page as a source dossier
source revision/access date
citations back to imported content
basic dictionary page template
etymology claim type and uncertainty labels
```

### Next

```text
selected Wikimedia article/entry packs
Wikidata item and Lexeme lookup
local full-text retrieval
attribution export
specialist source-pack manifest
```

### Later

```text
versioned language snapshots
incremental updates
cross-language lexeme graph
corpus examples with licensing controls
etymology visualization
local small-model lexicographic parsing
community-shared knowledge packs
```

## Acceptance tests

```text
A Wikipedia-derived claim shows article revision/snapshot information.
A specialist claim can escalate beyond Wikipedia.
A local pack can be deleted and rebuilt without deleting user notes.
Attribution remains available when an entry is exported.
A Wiktionary entry and Wikidata Lexeme can coexist without being merged blindly.
A reconstructed etymon is visibly marked.
Two reputable etymologies can remain disputed.
A dictionary definition does not silently inherit a moral judgment from generated prose.
Pack freshness influences routing for current claims.
```

## Official references to re-check

- Wikimedia downloads: https://dumps.wikimedia.org/
- Wikimedia dump licensing information: https://dumps.wikimedia.org/legal.html
- Wikimedia Foundation Terms of Use: https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use
- Wikidata lexicographical data: https://www.wikidata.org/wiki/Wikidata:Lexicographical_data
- Wikimedia Enterprise: https://enterprise.wikimedia.com/
- Wikimedia Enterprise project data: https://enterprise.wikimedia.com/project-data/
- Wikimedia Enterprise documentation: https://enterprise.wikimedia.com/docs/

Checked for this iteration: 2026-06-22.
