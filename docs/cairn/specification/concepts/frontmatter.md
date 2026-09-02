---
type: Cairn Concept
title: Markdown and frontmatter
description: The plain-text record format Cairn uses, and the structured metadata block that makes parts of it machine-readable.
tags: [cairn, concept, foundation, markdown, metadata]
timestamp: 2026-08-26T00:00:00Z
---

# Markdown and frontmatter

Markdown is plain text whose punctuation marks headings, links, lists, tables,
and code blocks. Frontmatter is a structured metadata block placed between
delimiter lines at the start of such a document.

## Build the idea

A Markdown file is readable without a specialised editor. Git can compare its
lines, a website can render it, and a person or agent can edit it with ordinary
text tools.

Frontmatter divides one record into two audiences. The body explains a decision
in prose for a reader; the block at the top carries exact fields — an
identifier, a status, a subject commit, a timestamp — for a program.

## In Cairn

Path records, decisions, sessions, audits, briefs, and concept articles are
Markdown. Human explanation remains primary; the frontmatter block provides the
exact fields automation needs.

Fields that participate in a gate have a published [schema](./schema.md) and
exact placement. They are never inferred from headings or natural language.

## It does not prove

Markdown defines presentation syntax, not the meaning or validity of a record.
Parsing a field does not prove its claim. A full YAML-looking syntax also
requires a full YAML parser; a smaller parser must describe itself as a limited
format rather than borrow YAML's name.

Related: [schema](./schema.md), [path record](./path-record.md),
[project memory](./project-memory.md).
