---
{
  "id": "09-web-source-tab",
  "title": "Web source tab",
  "status": "planned",
  "tags": [
    "web",
    "browser",
    "electron",
    "sources",
    "source-dossier",
    "verification",
    "grounding",
    "licensing"
  ],
  "relations": [
    {
      "to": "07-source-adapters",
      "kind": "implements"
    },
    {
      "to": "12-electron-mvp",
      "kind": "requires"
    },
    {
      "to": "13-electron-security",
      "kind": "constrained-by"
    },
    {
      "to": "06-ai-patch-pipeline",
      "kind": "feeds"
    },
    {
      "to": "29-verification-grounding-router",
      "kind": "separates-provider-grounding-from-import"
    },
    {
      "to": "32-truth-investigation-record",
      "kind": "constrained-by-provider-research"
    }
  ],
  "agent": {
    "purpose": "Implement web browsing as an isolated source viewer while saving reader text, snapshots, anchors, and source.md dossiers as local knowledge files.",
    "inputs": [
      "URL",
      "web contents",
      "reader extraction",
      "selection"
    ],
    "outputs": [
      "web source dossier",
      "snapshot",
      "reader text",
      "selection anchors"
    ],
    "invariants": [
      "Remote content never gets Node access.",
      "Rendering and extraction are separate concerns.",
      "If live embedding fails, reader/snapshot mode may still work.",
      "AI receives extracted/selected content, not privileged DOM access.",
      "Digested web content is Markdown-first.",
      "Every imported page records access date and available revision/publication metadata.",
      "Grounding-provider links are not automatically harvested, crawled, or indexed."
    ]
  }
}
---

# Web source tab

## Why Electron matters

A browser-based MVP cannot reliably embed and inspect arbitrary web pages. A desktop Electron MVP gives more control over browser-like source tabs while still requiring strict security boundaries.

## MVP behavior

```text
URL bar
navigation controls
isolated web view
reader/extraction button
save snapshot
create source.md dossier
select text when possible
ask AI about extracted/selected content
create note with URL/provenance
```

## Two paths, kept separate

```text
live web view
  shows the original page in an isolated WebContentsView

extracted source view
  stores readable text, metadata, and anchors for AI/note generation

source dossier
  durable Markdown description of the web source and its extraction state
```

## Security stance

Remote websites are untrusted. They must not run with Node integration or direct access to Atomik files, IPC channels, AI keys, or app internals.

A saved snapshot is still source material. A Markdown reader extraction is safer and easier for AI to consume, but it should link back to the URL and snapshot when available.

## Future source folder

```text
sources/web/photosynthesis-overview/
  index.md
  source.md
  snapshot.html
  reader.md
  quotes/
  anchors.json      # optional DOM/text-offset sidecar
  log.md
```

## Source dossier example

```md
---
type: Atomik Source
title: Photosynthesis overview
description: Reader extraction of a web page used for study notes.
resource: https://example.org/page
tags: [biology, photosynthesis]
timestamp: 2026-06-17T00:00:00Z
atomik:
  id: source_web_photosynthesis_overview
  source_type: web
  status: extracted
  snapshot: ./snapshot.html
  extracted_text: ./reader.md
---

# Source dossier

## Original

- [Original URL](https://example.org/page)
- [Local snapshot](./snapshot.html)

## Extracted representations

- [Reader text](./reader.md)

## Notes created from this source

- [Photosynthesis converts light energy into chemical energy](../../../notes/photosynthesis-light-energy.md)
```

## Horse-style trails

Web exploration should not become disposable browser history. The user should be able to save a trail:

```text
web page -> extracted reader.md -> note -> next source -> question -> synthesis
```

The trail is a Markdown object and can be rendered as a reading path, tree, or graph later.

## Live grounding is a separate path

The web source tab must not be confused with a search-provider grounding tool.

```text
isolated live web view
  displays an actual destination page

Atomik reader/snapshot import
  creates durable local source material

provider-grounded result
  transient result for one user prompt, governed by provider display/storage/reuse terms
```

A grounded answer may help the user discover a source. The user can then open that destination and explicitly choose **Import as source**. Only that separate action creates `source.md`, `snapshot.html`, `reader.md`, anchors, access date, and license notes.

Atomik must not use grounding-returned links as an automated crawl seed or local index feed.

## Web evidence metadata

```text
URL
canonical URL if available
page title
author/publisher
published/updated date if available
accessed_at
snapshot hash
reader extraction hash
anchor mapping
license/copyright note
redirect chain when relevant
```

A live page may change or disappear. Claims that depend on it should expose the captured revision or access date.
