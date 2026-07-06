# ADR-006: Versioned public knowledge and lexicographic baseline

Status: accepted
Date: 2026-06-22

## Context

Atomik aims to provide dynamic, inexpensive access to broad knowledge and to become a smart dictionary with clear etymology. Small local models benefit greatly from retrieval over a broad, structured local corpus. Wikipedia, Wiktionary, Wikidata, open dictionaries, official documentation, and specialist source packs are strong candidates.

Wikipedia is a major shared reference system but is not the best final source for every narrow, disputed, current, or high-stakes claim. Wiktionary contains rich human-authored lexical material, while Wikidata provides structured Lexemes, Forms, and Senses. Public content still requires snapshot, license, attribution, parser, and update discipline.

## Decision

Atomik supports versioned local knowledge packs as a non-canonical retrieval layer built from attributable source records.

Initial public baseline:

```text
selected Wikipedia content
selected Wiktionary content
Wikidata items and Lexemes
open/public-domain dictionaries and textbooks
user-installed specialist packs
```

Wikipedia is treated as an orientation, mainstream framing, terminology, citation, and reference-graph source. Specialist or authoritative sources are used when the claim requires them.

The smart dictionary combines:

```text
Wiktionary prose and etymology
Wikidata Lexemes, Forms, and Senses
specialist dictionaries/corpora where licensing permits
user-added source dossiers
```

Etymology is modeled as a sourced chain with attested/reconstructed/disputed status, language stages, borrowing/inheritance/derivation relations, alternatives, and uncertainty.

Every pack records source project, language, snapshot/revision date, license, attribution requirements, normalization version, and integrity data. Search indexes and embeddings remain rebuildable.

## Consequences

- Atomik gains a broad offline baseline without demanding encyclopedic knowledge from model weights.
- Pack size, update cadence, and device storage become product constraints.
- Licensing and attribution are part of the manifest and export path.
- Dictionary pages need richer schemas and Truth Lens support.
- Direct user imports can precede full dump ingestion.
- Wikimedia Enterprise may be used as an optional structured delivery provider, but the pack contract remains vendor-neutral.

## Alternatives considered

### Rely entirely on model pretraining

Rejected. It is opaque, stale, hard to cite, and weakens small local models.

### Treat Wikipedia as final authority

Rejected. Source fitness varies by claim, domain, recency, language edition, and controversy.

### Ignore Wikimedia and build a proprietary corpus first

Rejected. It duplicates a vast open knowledge effort and delays useful local retrieval.

### Use only Wiktionary for dictionary data

Rejected. Wikidata Lexemes add structure and identifiers, while specialist sources are still needed for depth and uncertainty.

### Download every language and project immediately

Rejected for early milestones because of storage, parsing, update, and attribution complexity. Start with selected imports and focused packs.

## Migration / rollback

Knowledge packs are optional and deletable. Deleting a pack or derived index must not delete user notes or imported source dossiers. Pack formats are versioned so parsers and normalizers can be replaced.

## Links

- `30_30-public-knowledge-dictionary.md`
- `29_29-verification-grounding-router.md`
- `07_07-source-adapters.md`
- `26_26-okf-agent-context.md`
