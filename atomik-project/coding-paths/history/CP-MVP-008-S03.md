---
type: Atomik Coding Path History
title: CP-MVP-008 S03 — Prompts folders
description: Completed-step record rolled out of CP-MVP-008.md at CP-OPS-002 S04. Verbatim; nothing summarized.
tags: [coding-path, history, cp-mvp-008]
timestamp: 2026-08-24T00:00:00Z
path: CP-MVP-008
step: S03
---

# CP-MVP-008 S03 — Prompts folders

Rolled out of [CP-MVP-008.md](../CP-MVP-008.md) at CP-OPS-002 S04, VERBATIM:
moved, never summarized. The live path file keeps its declaration, its index
over these records, its ledger and its next action; the execution detail lives
here. The convention is in [paths.md](../paths.md).

Text that says "the checkpoint below" or "this ledger" was written when these
entries sat in the path file; it points at the Work Ledger in
[CP-MVP-008.md](../CP-MVP-008.md). Deixis was the only casualty of the move, and
repairing it in place would have made the record no longer verbatim.

Entries in this record: S03, S03b, S03c, S03d, S03e, S03f.

- [x] S03 Prompts folders (scoped — owner amendment 2026-07-21) —
      done 2026-07-21: `renderer/src/editor/prompts.ts` (chain walk
      root + any folder + project — a project IS a folder, one rule
      covers all scopes; nearest-wins shadowing; frontmatter
      `kind: system | message`; injected `listVaultFiles`/`readNote`,
      zero new IPC); AiPanel: message prompts join the preset row
      scope-tagged, system selector → `AiOperation.systemPrompt`
      (bounded 8k main-side; replaces the IDENTITY line only — the
      grounding rules/destination brief compose main-side regardless,
      28); starters via explicit ☰ action, idempotent missing-only;
      prompts reload on vaultFilesChanged (edit→use). Tests 455→467/45
      (prompts.test.ts + validation/composition cases); typecheck/
      build/smoke green (smoke op now rides a systemPrompt). Pills +
      chat consumption land with their surfaces (S04/S06). No
      learning note: convention + scanner over proven patterns (S07k
      folder conventions, injected-verb testing) — no first
      mobilization; the S02 note covers the adapter seam.
- [x] S03b (owner directives, same day) — done 2026-07-21: (1) the
      tree context menu shows "New prompt…" inside any prompts/
      folder — kind radio (message | system) + name autofill the
      frontmatter (`buildPromptFileContent`; TreeMenu morph pattern,
      same createNote verb, file opens for editing); (2) BUILDABLE
      LAYERS: a full-line `{{prompt: name}}` inserts the named prompt
      as a layer (`expandPromptLayers`), system and message composing
      freely with the OUTER kind governing; layer names resolve
      through the SAME nearest-wins scoping (a project overrides a
      layer), depth 8, unknown/cycle/inline stay LITERAL (broken
      references visible, never dropped), expansion at load after
      shadowing. Tests 467→473/45; typecheck/build/smoke green.
- [x] S03c (owner directive, same day) — done 2026-07-21: `@` in the
      AI instruction field opens the prompt quick-action menu (the @
      citation-menu precedent, hand-rolled textarea popup, zero
      deps): token at start-or-after-whitespace `@` (emails inert),
      live name+title filter, full keyboard (arrows/Enter/Tab/
      Escape) + click; message → composed body inserted at the
      caret, system → selector set + token removed; kind + scope
      tags on every row (36 popover idiom). Pure helpers tested.
      Tests 473→477/45; typecheck/build/smoke green.
- [x] S03d (owner bench corrections, same day) — done 2026-07-21:
      (1) @ pick inserts the LAYER DIRECTIVE, not the flattened body
      (`insertDirectiveAt`, own-line padding preserves the full-line
      rule) — the instruction IS a buildable custom prompt; it
      composes at RUN TIME (`expandInstruction`) through the note's
      resolved scopes, the box keeps the layered form, unknown
      layers stay visibly literal; pills APPEND the directive
      (never overwrite typed text). (2) prompt pills visibly
      file-backed (dashed ring + @ glyph, scope in the tooltip).
      (3) CRLF tolerance in `parsePromptFile` — the likely cause of
      a prompt not showing: a Windows-side edit's line endings
      failed the fence match and the file vanished silently;
      nearest-first (folder → root) order verified and PINNED by
      test through the filter. Tests 477→481/45; gates green.
- [x] S03e (owner bench screenshots, same day) — done 2026-07-21:
      the owner's @ was the EDITOR's citation menu (authoring
      prompts/tone.md), not the AI panel — prompts surfaced only as
      generic note links, buried under sources. `promptLayerEntries`
      joins quick-actions.ts: when the edited note lives in a
      prompts/ folder the @ menu LEADS with the note's resolved
      prompts — `prompt` chip (accent), kind + scope in the detail,
      nearest-first folder→root via CodeMirror boost, picking
      inserts the LAYER DIRECTIVE (never a link), the file never
      offers itself; ordinary notes keep the unchanged citation
      menu (a directive is inert there). Tests 481→484/45; gates
      green.
- [x] S03f (owner brainstorm: "nesting system prompts was choosing
      multiple prompts and order them … personality > tone >
      objectives … modularity and/or interconnection … in the future
      agent behavior"; prompted exchange chose drag-and-drop +
      save-now) — done 2026-07-21: the system side becomes an
      ordered STACK of blocks in the AI panel — @ picker appends,
      pills drag to reorder, × removes; run composes bodies in stack
      order into ONE systemPrompt (blocks pre-expanded; deleted
      blocks drop silently; grounding rules still main-side on top);
      "save" persists the stack as a prompt FILE of directive lines
      in root prompts/ — round-trip PROVEN (expanding the saved file
      reproduces the composition). The same convention is the
      FORWARD PATH for agent behavior: a future vault-writing agent
      authors sub-agent prompts as these exact files (recorded for
      the roadmap conversation at the closing ceremony). Tests
      484→487/45; gates green.
