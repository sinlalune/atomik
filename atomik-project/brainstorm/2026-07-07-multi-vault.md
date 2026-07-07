---
type: Atomik Brainstorm Note
title: One vault per pane/tab — possible, weird, or both?
description: Owner design question after vault switching shipped. Assessment of per-tab vaults vs window-per-vault vs one wider vault. Provisional; nothing here is a decision.
tags: [brainstorm, vault, workspace, multi-vault, ux]
timestamp: 2026-07-07T00:00:00Z
---

# One vault per pane/tab — possible, weird, or both?

Owner question (2026-07-07, promoted from chat per 17): "is it possible
to open different vaults per pane or tab, or is it too weird/complicated?"

## Assessment

Technically possible without breaking the trust model: main would hold a
`Map<vaultHandle, root>` and hand the renderer OPAQUE handles after each
dialog (the renderer still never names absolute paths); every vault
channel gains a handle argument; tabs persist their handle. The plumbing
is a bounded, mechanical change.

The REAL cost is semantic, and it is permanent — every feature must
answer "which vault?" forever:

```text
new note / capture import   -> into which vault?
search                      -> which perimeter (tab? pane? all?)
AI selections + evidence    -> anchors become (vault, path) pairs
truth model + M8 reuse loop -> assume ONE knowledge perimeter today;
                               cross-vault evidence is a big step
links                       -> fine (relative, stay inside one vault)
```

Precedents agree: Obsidian = one vault per WINDOW; VS Code = multi-root
in one tree. Nobody does vault-per-tab — not because it is hard, but
because the ambient "where am I writing?" context disappears.

## The ladder (cheap first)

1. **Now, zero cost:** the owner's actual case (atomik-project + docs)
   lives in ONE repo — opening the repo root as the vault shows both
   trees already (denylist hides .git/.atomik/node_modules). Try this
   before building anything.
2. **If real multi-vault need persists: window-per-vault** (Obsidian
   model). vaultRoot becomes per-webContents in main; workspace state
   becomes per-window; the just-built vault-changed push scopes
   naturally. Clean mental model, capability model intact, medium cost.
3. **Per-pane/per-tab vaults:** last resort, only for a demonstrated
   daily workflow needing side-by-side vaults in one window — and not
   before the truth/reuse semantics (M8) define what cross-vault
   evidence even means.

## Re-entry point

Re-ask when the owner hits a concrete two-vaults-side-by-side workflow
that the repo-root vault or a second window cannot serve.
