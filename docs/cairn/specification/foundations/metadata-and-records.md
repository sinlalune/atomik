---
type: Cairn Foundation
title: 'Foundation: Metadata and machine-readable records'
description: How Markdown frontmatter lets one file serve people and deterministic tools, and how Cairn records human judgements without pretending to automate them.
tags: [cairn, foundation, markdown, frontmatter, schema, ceremony]
timestamp: 2026-08-25T00:00:00Z
---

# Metadata and machine-readable records

## Markdown plus frontmatter

Markdown is plain text with lightweight structure such as headings, lists, links,
tables, and code fences. It remains useful in a basic text editor and produces a
readable diff in Git.

**Frontmatter** is a metadata block at the very beginning of a Markdown file:

```yaml
---
type: Cairn Session Record
title: CP-EXAMPLE-001 closing ceremony
path: CP-EXAMPLE-001
ceremony: closing
---
```

People read the title and document body. Tools read exact keys. One file can
therefore carry both explanation and a deterministic contract.

## Schema

A **schema** defines which fields exist, where they appear, which values are
allowed, and which fields become required in a given state.

For a coding path, `status: running` requires a branch and a base commit. For a
ceremony record, `path` and `ceremony` are root-level keys. These locations are
part of the contract, not formatting preferences.

A parser may be intentionally smaller than a complete YAML implementation. When
that is true, the published templates must stay within the parser's documented
subset and tests should parse the templates themselves.

## Exact identity

Machine records join through exact identifiers. `CP-EXAMPLE-001` is not the
same subject as `CP-EXAMPLE-0010`, even though one string contains the other.

Use the path id as a stable key in:

- the path frontmatter;
- its branch declaration;
- opening and closing records;
- audit and journal filenames;
- the generated active-path view.

Human-friendly filenames help navigation, but the declared metadata establishes
identity.

## Turning a judgement into a checkable record

The statement “the owner accepts this work” is a judgement. A deterministic
script cannot reproduce it. The statement “a file for this exact path declares
an opening acceptance” is a checkable fact.

Cairn therefore separates the layers:

```text
human or agent performs the judgement
  → writes a durable record
  → deterministic checker validates identity, kind, and minimum completeness
```

The checker does not claim that the judgement was correct. It proves that the
required human step left an inspectable artifact.

## Why filenames are not enough

A filename can aid discovery but often cannot express the proposition being
checked. Both an opening and a closing record may contain the same path id. A
search for a matching filename proves only that *some* record exists.

Declared metadata distinguishes the kind:

```yaml
path: CP-EXAMPLE-001
ceremony: opening
```

The same pattern applies to audits: the record declares the path, commit, and
outcome rather than asking a tool to infer them from prose.

## Generated documentation as an executable contract

When a document publishes a table that can be derived from code, generate it.
When it publishes a template, parse the shipped template in a test. Both moves
turn drift into a visible failing check instead of a future reader's surprise.

Return to [The coding path](../index.md#3-the-coding-path) or
[Human records](../index.md#9-human-records).
