---
type: Cairn Concept
title: File
description: A named, durable unit of repository content.
tags: [cairn, concept, foundation]
timestamp: 2026-08-25T00:00:00Z
---

# File

A file is a named sequence of content stored at a path.

## Build the idea

Text in a conversation disappears from the project when the conversation ends.
A file can be opened by another process later, compared with an earlier
version, and included in a commit. Its path also gives other files a stable way
to refer to it.

## In Cairn

Cairn makes files the smallest durable records. A path file carries execution
state; a session file carries an acceptance; an audit file carries a judgement.
Each important statement has a canonical file rather than several manually
maintained copies.

## It does not prove

Persistence is not truth. A file can be incomplete or wrong, so Cairn combines
records with review and executable evidence.

Related: [Markdown](./markdown.md), [repository](./repository.md),
[project memory](./project-memory.md).

