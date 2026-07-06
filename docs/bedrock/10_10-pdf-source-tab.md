---
{
  "id": "10-pdf-source-tab",
  "title": "PDF source tab",
  "status": "planned",
  "tags": [
    "pdf",
    "sources",
    "study",
    "source-dossier",
    "evidence",
    "truth",
    "extraction-quality"
  ],
  "relations": [
    {
      "to": "07-source-adapters",
      "kind": "implements"
    },
    {
      "to": "06-ai-patch-pipeline",
      "kind": "feeds"
    },
    {
      "to": "04-file-first-model",
      "kind": "stores"
    },
    {
      "to": "25-use-cases",
      "kind": "supports"
    },
    {
      "to": "28-truth-evidence-model",
      "kind": "anchors-evidence-for"
    }
  ],
  "agent": {
    "purpose": "Model PDF as original document plus Markdown source dossier, extracted text, page anchors, and source-grounded note patches.",
    "inputs": [
      "PDF file",
      "page selection",
      "extracted text",
      "source.md dossier"
    ],
    "outputs": [
      "PDF source tab",
      "source dossier",
      "page anchors",
      "excerpt selection",
      "note patch"
    ],
    "invariants": [
      "Keep original PDF.",
      "Store source knowledge in source.md.",
      "Store page anchors and precise coordinates when needed.",
      "AI outputs cite source anchors.",
      "PDF comes after notes and capture unless needed sooner for daily usage.",
      "Rendered fidelity and extracted-text fidelity are separate; verification must be able to return to the original page."
    ]
  }
}
---

# PDF source tab

## Product role

PDF support is crucial for:

```text
math books
arXiv papers
Marx Capital
technical manuals
electronics books
research papers
scanned documents
```

## MVP behavior

```text
open PDF
view pages
create source.md dossier
extract text if available
select passage or page range
ask AI
create note with source reference
```

## File model

```text
sources/pdf/attention-is-all-you-need/
  index.md
  source.md
  original.pdf
  extracted.md
  quotes/
    scaled-dot-product-attention.md
  anchors.json       # optional coordinates/page-region sidecar
  log.md
```

## Source dossier example

```md
---
type: Atomik Source
title: Attention Is All You Need
description: Transformer paper used as the primary source for attention notes.
resource: ./original.pdf
tags: [ai, transformers, attention]
timestamp: 2026-06-17T00:00:00Z
atomik:
  id: source_pdf_attention
  source_type: pdf
  status: extracting
  original_path: ./original.pdf
  extracted_text: ./extracted.md
---

# Source dossier

## Original

- [Original PDF](./original.pdf)

## Extracted representations

- [Extracted text](./extracted.md)
- [Scaled dot-product attention quote](./quotes/scaled-dot-product-attention.md)

## Useful anchors

| Anchor | Meaning | Target |
|---|---|---|
| `p3` | page 3 | `./original.pdf#page=3` |
| `p3_s2` | section 2 on page 3 | `./original.pdf#page=3` |

## Notes created from this source

- [Query, key, and value vectors define attention lookup](../../../notes/query-key-value-vectors.md)
```

## Future OCR

Scanned PDFs can later reuse the same capture/vision pipeline as phone photos. Do not hardcode PDF text extraction as the only path.

## Git note

Small PDFs may be committed directly. Large PDFs should use Git LFS or remain local while `source.md`, `extracted.md`, quotes, and notes stay versioned.

## PDF evidence and extraction uncertainty

A precise PDF citation should preserve:

```text
source dossier
original file hash/version
page number
text quote or region
extraction method/version
quote hash when useful
```

The PDF renderer may look correct while text extraction is wrong, columns are reordered, formulas are lost, or footnotes are merged. A source-backed claim should let the user return to the original page, not only the extracted Markdown.

For scanned or OCR-derived PDFs, the Truth Lens should distinguish:

```text
original page evidence
OCR transcript
model interpretation
user correction
```
