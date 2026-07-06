---
type: Atomik Brainstorm Note
title: Creation flows (folder-first thinking) and drag-and-drop expectations
description: Owner hands-on signals from S06 dogfooding — how ordinary users will want to create structure, and where drag-and-drop fits. Provisional; nothing here is a decision.
tags: [brainstorm, ux, vault, projects, creation, drag-and-drop]
timestamp: 2026-07-06T00:00:00Z
---

# Creation flows and drag-and-drop expectations

Owner signals from hands-on use (2026-07-06), promoted from chat per 17.

## Kept: index/log shortcut pills in ProjectView

Deliberate keep, with rationale: in projects with many files, one-click
return to the map (index.md) and the history (log.md) earns its place even
though the tree lists both.

## Friction: folder-first thinking vs note-first folders

Owner's words: for ordinary users the natural path is "I want to segment my
thinking → create the folder `jardinage` FIRST → then think → then create
the first note." Today the model inverts that: folders are born with their
first note (slash paths in the create field; the tree prunes note-less
folders), and nothing in the UI even reveals the slash trick.

Real tension: file-first purity ("a folder exists insofar as it holds
notes") vs the container-first mental model most people carry from every
file manager. Options space, none chosen yet:

```text
A. discoverability only: placeholder "nom ou chemin/nom…" + hint
B. +folder affordance creating a PENDING folder in disposable UI state
   (visible in the tree, materialized on first note; disk stays clean)
C. +folder that mkdirs for real + tree stops pruning empty dirs
   (matches expectations; reintroduces empty-dir clutter in adopted vaults)
D. folder ships with an index.md by convention (04-friendly, but imposes
   a file the user did not ask for)
```

Leaning B (mental model served, file-first invariant intact), decide with
experiential data; candidate micro-unit after S07. Constraint: whatever
wins must not weaken no-silent-mutation.

## Drag-and-drop: three different features, three timelines

Owner asks whether DnD of files/folders is planned. Split it:

```text
1. move tabs between panes         deferred at S04, recorded in the
                                   module note; pure workspace-core work
2. move notes/folders in the tree  = rename/move; touches relative links,
                                   so it arrives WITH link-integrity
                                   repair (27 §rename refactor, 20) —
                                   deliberately post-MVP
3. drop OS files into the app      = source import; natural fit when the
                                   adapters exist (M3 capture, M4 PDF,
                                   M5 web) — 07/08 territory
```

(2) is the dangerous one to improvise: moving a note silently breaking its
backlinks would violate the diff/link discipline — hence its coupling to
the rename-refactor machinery rather than a quick tree gadget.
