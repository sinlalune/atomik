---
type: Cairn Concept
title: Frontmatter
description: A structured metadata block at the beginning of a text document.
tags: [cairn, concept, foundation, metadata]
timestamp: 2026-08-25T00:00:00Z
---

# Frontmatter

Frontmatter is metadata placed between delimiter lines at the start of a
[Markdown](./markdown.md) [file](./file.md).

## Build the idea

The document body can explain a decision in prose while tools read exact fields
such as an identifier, status, subject commit, or timestamp.

## In Cairn

Path, session, audit, and decision records use frontmatter. Fields that
participate in a gate have a published schema and exact placement; they are not
inferred from headings or natural language.

## It does not prove

Parsing a field does not prove its claim. A full YAML-looking syntax also
requires a full YAML parser; a smaller parser must describe itself as a limited
format.

Related: [Markdown](./markdown.md), [schema](./schema.md),
[path record](./path-record.md).
