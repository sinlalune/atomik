---
type: Cairn Folder Index
title: Architecture
description: Accepted architecture: one page per feature, interface, contract or flow, each with its dependency sentence and its diagram.
tags: [index, cairn, architecture]
timestamp: 2026-09-21T00:00:00Z
---

# Architecture

One page per thing the architecture decides — a feature, an interface, a
contract, or a **flow**: how one thing moves end to end through the components
the other pages name, from what starts it to what it leaves behind. Flow pages
live here with the rest and have no folder of their own; a flow inside a single
folder is that folder's module note's business, not a page.

A page that names components states **in one sentence** which way dependencies
point between them — a sentence a reader can check against an import line — and
carries **one Mermaid diagram** saying the same thing. The reader checks
whichever of the two they can read, so the two must agree.

Promotion units write these pages.
