---
type: Atomik Brainstorm Note
title: Panes, tabs, and where navigation lives
description: Owner reactions to the first real S04 workspace — one strong keep-signal, one open question. Provisional; nothing here is a decision.
tags: [brainstorm, workspace, tabs, panes, navigation, ux]
timestamp: 2026-07-06T00:00:00Z
---

# Panes, tabs, and where navigation lives

Owner reactions from first hands-on use of the S04 workspace (2026-07-06),
promoted from chat per the context-migration rule (17). Provisional.

## Keep-signal: tab groups per pane

The owner's words: having several tabs *per split* "change tout par rapport
à d'autres outils" — experienced as a differentiator, something to love,
not merely tolerate.

Design reading: each pane is a **workspace within the workspace** — its own
tab group, its own navigation state. That composes with the learning loop
(02): one pane holds the source you're digesting across several tabs, the
other holds the notes you're writing. Protect this when S05+ reshapes
navigation:

```text
do not regress tab-groups-per-pane into one global tab strip
any future sidebar/tree redesign must preserve per-pane tab groups
pane = a working context; tab = a view within that context (03)
```

## Open question, to meditate: one tree or one tree per view?

Today each dev-docs tab embeds its own docs tree (16's self-contained MVP
layout), so a split shows the tree twice. The 03 cockpit target says ONE
navigation tree at the workspace level. But first use suggests the interim
behavior may be partly a feature: each pane navigating independently is
what makes side-by-side corpus reading work.

Options space (not decided):

```text
A. workspace-level single sidebar (03 target); content views are tree-less
B. per-view tree, collapsible per pane (today's behavior + a toggle)
C. hybrid: one sidebar drives the FOCUSED pane; panes keep independent
   histories (closest to "pane = working context")
```

Decide no earlier than S05 (vault file tree arrives and forces the
question); the experiential gate (S12) should supply real friction data.
Whatever wins, the keep-signal above is a constraint on it.
