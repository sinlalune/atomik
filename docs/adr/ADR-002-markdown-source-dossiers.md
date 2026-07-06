# ADR-002: Markdown source dossiers as canonical source knowledge

Status: accepted
Date: 2026-06-17

## Context

Earlier drafts treated `source.atomik-source.json` as the canonical source record. The user clarified that digested sources should become Markdown: web text becomes reader notes, PDF quotes become quote notes, captures become transcripts, and audio/video becomes transcripts. Raw source material is unconsumed evidence; extracted and transformed material becomes the user's knowledge.

## Decision

Canonical source records live in `source.md` dossiers wherever possible. A dossier records provenance, extraction, anchors, and source understanding; it does not make every statement derived from the source epistemically supported.

```text
raw source asset
  -> source.md dossier
  -> extracted.md / transcript.md / quotes/*.md
  -> notes / synthesis / decisions
```

Optional sidecars may exist for precision, performance, extraction metadata, or migration, but must not be the only place user knowledge lives.

## Consequences

- Source folders are readable outside Atomik.
- Source state, provenance, and extraction links can be reviewed in Git diffs.
- Atomik can still handle non-Markdown originals and precise anchors.
- Source adapters must create/update Markdown dossiers rather than JSON-only records.
- Claims derived from a dossier can point to exact evidence anchors and carry separate verification status.

## Alternatives considered

- JSON-only source records: efficient for code, but poor for human/agent review and Git diffs.
- Markdown-only everything: too weak for raw assets and precise anchors.

## Migration / rollback

Legacy JSON source records can become optional sidecars. Atomik should be able to generate `source.md` from existing JSON fixtures.

## Links

- `07_07-source-adapters.md`
- `08_08-capture-source.md`
- `09_09-web-source-tab.md`
- `10_10-pdf-source-tab.md`
- `ADR-004-claim-level-truth-evidence.md`
