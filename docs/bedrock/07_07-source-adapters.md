---
{
  "id": "07-source-adapters",
  "title": "Source adapter and dossier model",
  "status": "foundational",
  "tags": [
    "sources",
    "adapters",
    "inputs",
    "dossiers",
    "okf",
    "evidence",
    "licensing",
    "source-quality",
    "audio",
    "transcription",
    "local-inference",
    "action-trace"
  ],
  "relations": [
    {
      "to": "08-capture-source",
      "kind": "includes"
    },
    {
      "to": "09-web-source-tab",
      "kind": "includes"
    },
    {
      "to": "10-pdf-source-tab",
      "kind": "includes"
    },
    {
      "to": "04-file-first-model",
      "kind": "implements"
    },
    {
      "to": "05-resource-selection-model",
      "kind": "normalizes"
    },
    {
      "to": "28-truth-evidence-model",
      "kind": "provides-evidence-records"
    },
    {
      "to": "29-verification-grounding-router",
      "kind": "imports-destination-sources-for"
    },
    {
      "to": "30-public-knowledge-dictionary",
      "kind": "extends-to-knowledge-packs"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "uses-local-execution-policy-from"
    }
  ],
  "agent": {
    "purpose": "Model new input types as source adapters that preserve originals, produce Markdown source dossiers, expose anchors/selections, and never directly mutate notes.",
    "inputs": [
      "source file or URL",
      "adapter capability",
      "raw asset",
      "extraction result",
      "audio/video media",
      "transcription runtime capability"
    ],
    "outputs": [
      "source.md dossier",
      "viewer",
      "extracted Markdown",
      "anchors",
      "selection provider",
      "optional sidecar",
      "evidence records",
      "license/attribution metadata",
      "source quality dimensions",
      "transcript segments",
      "extraction ActionTrace"
    ],
    "invariants": [
      "A source keeps original and extracted representations separate.",
      "Source dossiers are Markdown-first.",
      "Source adapters do not directly mutate notes.",
      "Selections from sources carry anchors/provenance.",
      "Evidence roles and source class can be represented without declaring the source infallible.",
      "Every adapter should degrade gracefully when extraction fails.",
      "Machine sidecars support precision/performance but must not hide user knowledge.",
      "Provider-grounding links are not automatically crawled or indexed; durable imports are explicit source-adapter actions.",
      "Transcripts remain distinguishable from original audio/video evidence.",
      "Extraction and transcription record model/runtime/version and correction state.",
      "Local and cloud extraction paths share one adapter contract."
    ]
  }
}
---

# Source adapter and dossier model

## Source adapter responsibilities

Each source adapter should provide:

```text
original access
viewer
extraction
source.md dossier creation/update
anchors
selection provider
metadata
provenance
license and attribution notes
evidence/source-quality dimensions
AI operation context
extraction/transcription model and runtime metadata
operation trace
optional precision/performance sidecars
```

## Source material ladder

Do not treat a source as only one JSON record. Atomik should separate:

```text
raw source asset
  unconsumed material / evidence / original object

source dossier
  Markdown description of the source, extraction state, provenance, anchors, links

extract / quote / transcript / reader text
  digested source representation in Markdown

note / synthesis / decision
  transformed and augmented knowledge that now belongs to the user
```

This means the canonical source knowledge is usually `source.md`, not a hidden database row or mandatory JSON file.

## Initial source priority

```text
1. Markdown notes
2. Phone photo / capture source
3. PDF source
4. Web source
5. Code/repo source
6. Video/audio transcript
7. Datasets/notebooks
```

Phone photo capture is promoted early because it is technically feasible and immediately expands Atomik into the physical world: handwritten notes, whiteboards, book pages, sketches, circuits, art notes, and music theory pages.

## Canonical source folder shape

```text
sources/<kind>/<slug>/
  index.md        directory map for humans/agents
  source.md       canonical source dossier
  original.*      preserved raw asset when local
  extracted.md    extracted text when available
  transcript.md   audio/video/capture transcript when relevant
  segments.json   optional timestamps/speaker/word alignment sidecar
  quotes/         promoted excerpts
  anchors.json    optional precision sidecar
  log.md          optional source-level extraction history
```

## Source dossier shape

```md
---
type: Atomik Source
title: Handwritten notes on attention
description: Phone capture used to extract notes on query, key, and value vectors.
resource: ./original.jpg
tags: [ai, attention, handwritten]
timestamp: 2026-06-17T00:00:00Z
atomik:
  id: capture_2026_06_14_001
  source_type: capture
  status: transcribed
  capture:
    method: local-wifi-qr
    mime_type: image/jpeg
---

# Source dossier

## Original

- [Original image](./original.jpg)

## Extracted representations

- [Transcript](./transcript.md)

## Useful anchors

| Anchor | Meaning | Target |
|---|---|---|
| `original-image` | full original capture | `./original.jpg` |

## Notes created from this source

- [Query, key, and value vectors define attention lookup](../../../notes/query-key-value-vectors.md)
```

## Optional sidecars

Optional machine-readable sidecars are allowed for:

```text
PDF page coordinates
image regions
OCR bounding boxes
audio/video time ranges
DOM selectors
extraction hashes
large anchor maps
performance indexes
legacy import metadata
```

But they are not allowed to become the only place where user knowledge lives.

## Remaining barriers

### Original fidelity

A PDF, audio file, video, scanned page, image, or web snapshot cannot always become Markdown without losing important evidence. The transcript is Markdown. The quotes are Markdown. The extracted claims are Markdown. The original artifact still matters.

### Precise anchoring

Some anchors are awkward in Markdown: PDF coordinates, image regions, audio time ranges, DOM selectors, OCR bounding boxes, transcript token offsets. Use readable Markdown references first, then sidecars when precision requires it.

### Re-extraction history

A web page changes. OCR improves. A transcript may be corrected. A PDF extraction may be wrong. Source-level `log.md` or dossier sections should record meaningful re-extraction events.

### Derived indexes

Search indexes, embeddings, graph indexes, and RAG stores are not canonical knowledge. They are rebuildable from project files.

### Security and viewer behavior

A live web page is untrusted runtime content; a Markdown extraction is trusted local knowledge. Source viewers still need isolation boundaries.

## Original vs extracted

Do not confuse:

```text
viewer = shows the source as faithfully as possible
extractor = produces text/anchors/metadata that AI and notes can use
source dossier = durable Markdown knowledge about the source
```

A PDF may render perfectly but extract badly. A web page may be blocked as a browser view but still extract through a reader pipeline. Keep those paths separate.

## Evidence adapter contract

A source adapter should be able to turn a selection into an evidence record:

```text
source dossier path or external URL
source revision / publication / access date
anchor and quote hash where useful
role: supports / contradicts / qualifies / background / defines
source class: primary / secondary / tertiary / user / unknown
license and attribution notes
independence group when several pages share one upstream origin
```

A source class is descriptive, not a universal quality rank. A primary source can be authoritative for its own text and still be biased or uninformative for a broader causal claim.

## Grounding-result boundary

Search-provider grounding and source import are separate:

```text
provider-grounded result
  transient, provider-governed result for one prompt

web/source adapter import
  explicit import of an actual destination page or document
  creates durable local dossier/extract/anchors
```

Source-core must not accept a list of provider-grounding links and silently crawl them into a database. The user may explicitly open and import a selected destination through the normal adapter.

## Knowledge-pack adapters

Later adapters may ingest versioned Wikipedia, Wiktionary, Wikidata, open dictionary, textbook, or official-documentation packs. Every pack records snapshot/revision, language, source project, license, attribution, normalization version, and integrity information. Derived indexes remain deletable.


## Audio and video transcription adapter

Speech-to-text is technically viable as a local source adapter on desktops and, with smaller runtimes, on mobile devices. The architecture must not bind the source model to one speech model or cloud API.

```text
original audio/video
  -> capability probe
  -> local transcription when adequate
  -> optional explicit cloud fallback
  -> transcript.md
  -> optional timestamp/speaker segments sidecar
  -> human corrections
  -> notes and claims linked to time anchors
```

The source dossier records:

```text
model and runtime name/version
language or language-detection result
execution location and device profile
transcription date
segment/timestamp format
known limitations
human correction state
ActionTrace id
```

A transcript is a derived representation. The original media remains the evidence object, and model cleanup or summarization must not be presented as verbatim transcription.
