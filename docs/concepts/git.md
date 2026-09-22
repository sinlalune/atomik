---
type: Cairn Concept
title: Git
description: A distributed version-control system that records linked snapshots of files.
tags: [cairn, concept, foundation, git]
timestamp: 2026-08-25T00:00:00Z
---

# Git

Git is a version-control system: it records linked snapshots of a
[repository](./repository.md) and lets several copies exchange those histories.

## Build the idea

Git separates editable files from recorded commits. Branch names point into the
commit graph, and remote repositories let participants publish and retrieve
those pointers.

## In Cairn

Cairn uses Git as transport, history, isolation, and evidence. It adds meanings
that Git does not have by itself: a branch becomes a coding path, a pushed
commit becomes a remote checkpoint, and ancestry becomes one closure predicate.

## It does not prove

Git does not decide who may write, whether code is correct, or whether a
judgement is sound.

Related: [repository](./repository.md), [commit](./commit.md),
[remote](./remote.md).
