---
{
  "id": "08-capture-source",
  "title": "Capture source: phone photos and handwritten notes",
  "status": "mvp",
  "tags": [
    "capture",
    "phone",
    "handwriting",
    "mvp",
    "source-dossier",
    "truth",
    "uncertainty",
    "audio-capture",
    "speech-to-text",
    "mobile-local"
  ],
  "relations": [
    {
      "to": "07-source-adapters",
      "kind": "implements"
    },
    {
      "to": "12-electron-mvp",
      "kind": "uses-main-process"
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
      "to": "28-truth-evidence-model",
      "kind": "preserves-original-evidence-for"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "uses-device-capability-policy-from"
    }
  ],
  "agent": {
    "purpose": "Implement phone capture as a source adapter with secure local upload, preserved original image, Markdown source dossier, and optional transcription patches.",
    "inputs": [
      "capture session",
      "uploaded image",
      "source.md dossier",
      "optional transcript",
      "AI instruction"
    ],
    "outputs": [
      "image source dossier",
      "source tab",
      "transcription patch",
      "atomic note proposals",
      "audio source dossier",
      "local transcript",
      "transcription trace"
    ],
    "invariants": [
      "Use one-time tokens.",
      "Limit file size and MIME types.",
      "Save originals as source assets.",
      "Represent the source with source.md.",
      "Do not require perfect OCR for MVP; AI interpretation can come first.",
      "OCR/transcription/interpretation uncertainty remains visible and the original image remains inspectable evidence.",
      "Phone audio capture can remain local and must preserve the original recording.",
      "Transcription model output and user correction remain distinguishable."
    ]
  }
}
---

# Capture source: phone photos and handwritten notes

## Product framing

This is not merely OCR. It is:

```text
physical world -> Atomik source -> source.md dossier -> AI interpretation -> durable knowledge
```

It supports:

```text
handwritten math notes
whiteboards
book page photos
margin annotations
electronics sketches
circuit diagrams
art/museum notes
music theory sheets
lab notes
```

## MVP flow

```text
Electron starts local capture session
  -> desktop shows QR code
  -> phone scans QR
  -> phone opens minimal upload page
  -> user takes/selects photo
  -> image uploads to Electron
  -> Electron saves original image in project/vault
  -> Atomik creates source.md dossier
  -> image source tab opens
  -> user asks AI to transcribe/explain/extract
  -> accepted output becomes transcript.md or Markdown note
```

## Phone page input

The MVP can use a simple browser file input:

```html
<input type="file" accept="image/*" capture="environment" />
```

The `capture` hint is convenient for camera capture, but it has partial browser support and should degrade to file selection. Therefore the phone page should also work when the browser shows a file picker instead of opening the camera directly.

## File model

```text
vault/
  projects/
    ai-formation/
      sources/
        captures/
          2026-06-14-handwritten-attention/
            index.md
            source.md
            original.jpg
            transcript.md
            quotes/
            log.md
      notes/
        query-key-value-vectors.md
```

## Source dossier example

```md
---
type: Atomik Source
title: Handwritten notes on attention
description: Phone capture containing notes about query, key, and value vectors.
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

## Security requirements

```text
QR code includes one-time session token
token expires after a few minutes
upload endpoint accepts only active session
file size limit
image MIME allowlist
content validation after upload
desktop confirmation before permanent import
temporary inbox before vault write
```

## Later production options

```text
local Wi-Fi QR upload -> MVP
cloud relay fallback -> production reliability
WebRTC direct transfer -> advanced privacy/direct mode
native mobile app -> best camera UX, much later
```

## Git note

Small captures may be committed directly. Large or private image assets may be kept local while `source.md`, `transcript.md`, and derived notes remain versioned.

## Truth treatment for captures

A camera image is evidence of what the camera captured, not automatic proof that an OCR transcript or model interpretation is correct.

```text
original image
  preserved evidence

OCR/transcript
  derived representation with extraction confidence and correction history

model explanation
  generated interpretation that may introduce additional claims

accepted note
  user-owned synthesis with links back to image regions/transcript anchors
```

The Truth Lens should let the user compare a claim with the relevant image region and correct transcription errors through a small patch. Handwriting ambiguity must not be hidden behind polished prose.


## Audio capture companion path

The same local-network capture session may later accept a short audio recording in addition to an image. Audio capture should not wait for a complete mobile application.

```text
open capture page on phone
  -> record or choose audio
  -> upload through one-time local token
  -> save original audio
  -> create source.md
  -> run replaceable transcription adapter
  -> create transcript.md + optional segments sidecar
  -> inspect/correct transcript
  -> promote excerpts or notes
```

Desktop-first local speech recognition is the initial target. Mobile on-device transcription is a capability tier, not an MVP guarantee. The UI should expose whether transcription occurred on the phone, on the paired desktop, or through an explicitly approved cloud service, together with latency, model identity, and external cost.
