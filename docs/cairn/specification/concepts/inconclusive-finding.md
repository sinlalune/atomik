---
type: Cairn Concept
title: Inconclusive finding
description: A report that a predicate could not be evaluated because required evidence was absent.
tags: [cairn, concept, enforcement]
timestamp: 2026-08-25T00:00:00Z
---

# Inconclusive finding

An inconclusive finding means the checker cannot prove or disprove a predicate
because a required input is unavailable.

## In Cairn

A missing trunk ref, shallow history, unresolved subject commit, or absent
comparison state makes a critical registration, ancestry, transition,
acceptance, or integrity gate inconclusive. Those gates return non-zero and
name the evidence to fetch or provide.

## It does not prove

Inconclusive is not a softer form of pass and is not evidence that a path is
stale or safe.

Related: [blocking finding](./blocking-finding.md), [fetch and push](./fetch-and-push.md),
[exit code](./exit-code.md).

