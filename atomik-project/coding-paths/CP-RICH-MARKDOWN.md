---
type: Atomik Coding Path
title: Rich Markdown — KaTeX math, safe Mermaid and Vega-Lite projections, broad code highlighting, diagnostic decorations (labelled)
description: Makes Markdown notes a safe rich technical reading surface: accessible math, diagrams, charts, broadly highlighted fenced code, and decoration-only diagnostics, all lazy, bounded, source-faithful, and extensible without conflating third-party renderers with Atomik's reserved DSL/studio architecture.
tags: [coding-path, markdown, katex, mermaid, vega-lite, code, diagnostics, renderer, ui]
timestamp: 2026-08-17T00:00:00Z
atomik:
  id: CP-RICH-MARKDOWN
  status: running
  accepted: 2026-08-17
  current_step: S04
  base_commit: 98561b4
  branch: path/cp-rich-markdown
  writes:
    - package-lock.json
    - apps/desktop/package.json
    - apps/desktop/electron.vite.config.ts
    - apps/desktop/renderer/src/editor/EditorPane.tsx
    - apps/desktop/renderer/src/editor/AiNotePreview.tsx
    - apps/desktop/renderer/src/editor/inline-ai.ts
    - apps/desktop/renderer/src/editor/live-preview.ts
    - apps/desktop/renderer/src/editor/note-markdown.ts
    - apps/desktop/renderer/src/editor/rich-markdown/**
    - apps/desktop/renderer/src/project/ProjectView.tsx
    - apps/desktop/renderer/src/source/SourceImageView.tsx
    - apps/desktop/renderer/src/vault/VaultView.tsx
    - apps/desktop/renderer/src/workspace/ChatView.tsx
    - apps/desktop/renderer/src/styles.css
    - apps/desktop/tests/live-preview.test.ts
    - apps/desktop/tests/note-markdown.test.ts
    - apps/desktop/tests/rich-markdown.test.ts
    - docs/adr/ADR-014-rich-markdown-renderers.md
    - docs/index.md
    - docs/learning/24-rich-markdown-projection-registry.md
    - docs/learning/index.md
    - docs/modules/atomik-desktop-editor.md
    - docs/modules/atomik-desktop-shell.md
    - docs/modules/atomik-desktop-vault.md
    - docs/modules/atomik-desktop-sources.md
    - atomik-project/coding-paths/CP-RICH-MARKDOWN.md
    - atomik-project/coding-paths/index.md
    - atomik-project/sessions/2026-08-17-cp-rich-markdown-opening-check.md
    - atomik-project/sessions/2026-08-17-cp-rich-markdown-s01-baseline.md
    - atomik-project/sessions/**
    - atomik-project/audits/**
    - atomik-project/log/**
---

# Goal

Make technical Markdown read as richly as it is authored without turning a
note into executable or hidden state:

1. `$…$`, `$$…$$`, and an explicit math fence render through KaTeX with
   accessible output and safe resource/expansion limits.
2. `mermaid` fences render diagrams and `vega-lite`/`vl` fences render inline
   data visualizations through local, lazy, bounded adapters.
3. One renderer registry gives every rich block the same loading, theme,
   accessibility, cancellation, diagnostic, source-fallback, and lifecycle
   contract. Unknown fences remain normal code.
4. Fenced code gains broad on-demand language parsing and VS Code-quality
   read presentation, plus copy/language/wrap-or-expand affordances.
5. Code feedback stops at decoration: diagnostic ranges, severity, count, and
   accessible messages. No language-server process or IDE navigation/editing
   feature enters this path.

The owner-approved details and revised backlog order are recorded in
`atomik-project/sessions/2026-08-17-cp-rich-markdown-opening-check.md`.

# Definition of done

- Raw Markdown remains canonical and byte-stable. Rendering, highlighting, and
  diagnostics are disposable projections; switching among read/live/source or
  encountering an error never rewrites a note.
- One typed registry maps normalized fence identifiers to lazy renderer
  adapters. It owns cancellation/stale-result suppression, theme input,
  budgets, accessible diagnostics, and a source fallback; unsupported fences
  preserve the existing `<pre><code>` behavior.
- KaTeX supports inline/display math with HTML+MathML accessibility,
  `trust: false`, bounded expansion/size, no shared cross-note macro state, and
  visible source-preserving parse errors.
- Mermaid runs locally with strict security, HTML labels/click handlers and
  external navigation disabled, deterministic IDs, bounded text/edges/output,
  light/dark token mapping, and no renderer-triggered network access.
- Vega-Lite accepts parsed JSON objects with inline values/datasets only;
  rejects URL-backed data/config/patches and external action links before
  render; finalizes obsolete views and fails visibly to source.
- Read and live surfaces present the same successful math/diagram/chart/code
  meaning. In live mode a rich block renders only away from the active editing
  range; touching it reveals source. Source mode is always raw.
- Fenced code languages load on demand through CodeMirror language data; read
  highlighting uses a fine-grained lazy Shiki configuration rather than its
  full bundle. Aliases and unknown-language fallback are regression-pinned.
- Code blocks expose a responsive, keyboard-usable header with language,
  Copy, source/render where applicable, and wrap/expand controls. Copy never
  includes generated chrome.
- Decoration-only feedback uses a bounded local diagnostic source and
  CodeMirror lint-style rendering. Diagnostics map correctly from a fenced
  virtual range back to note offsets, disappear when fixed, and expose message,
  severity, source, and code without implementing any other LSP feature.
- Every async/heavy renderer is code-split and measured against the S01
  baseline. First rich render, repeat render/cache, theme change, large/invalid
  input, cancellation, and teardown are benched; caps fail loudly rather than
  hanging the renderer.
- Focused pure/DOM tests cover parsing boundaries, source fidelity, security
  rejection, budgets, stale results, aliases, error fallback, themes,
  accessibility, and diagnostic mapping. Module notes and the ADR change with
  their implementation steps.
- Owner bench acceptance, closing ceremony, final rebase, bare Cairn/typecheck/
  test/build gates, coherence audit, journal, `status: done`, and self-merge
  complete under the path protocol.

# Documentation coverage

## Required

- 04-file-first-model — Markdown/fenced source is canonical; renderer output is
  disposable derived state
- 11-markdown-page-model — one adaptive note surface, math/code/DSL fences,
  unknown-frontmatter and byte preservation
- 13-electron-security — no raw HTML/network execution, narrow local runtime,
  bounded untrusted note input
- 14-app-kernels — renderer adapters depend on shared contracts; no UI/runtime
  dependency leaks into canonical parsing kernels
- 15-maintainability — dependency and bundle-cost decisions, lazy seams,
  cancellation, small tested policy helpers
- 19-dsl-future + ADR-010 — third-party fenced projections stay distinct from
  the reserved Atomik DSL/Scene IR/studio architecture
- 27-git-compatibility — rendering and diagnostics never normalize or rewrite
  authored Markdown
- 36-ui-design-system — tokens/themes, responsive block chrome, focus,
  accessible diagnostics, motion and contrast floors
- 17-self-evolving-docs · 22-agent-handoff · 24-doc-templates ·
  35-coding-path-execution-state · coding-paths/paths.md — standing execution
  law

## Conditional

- 03-workspace-and-tabs — if expanded/source block state persists in tab params
- 12-electron-mvp — if a worker or main/preload channel becomes necessary
- 33-retrieval-local-execution-cost — if renderer work earns ActionTrace or
  durable performance receipts rather than the dated S01/S08 bench
- 28-truth-evidence-model + 31-truth-lens-ux — if diagram/chart presentation
  starts asserting epistemic status rather than rendering authored source
- 06-ai-patch-pipeline — if any generated fix/code action is proposed (excluded
  from v1, so this should not trigger)

## Deliberately excluded

- CP-LANGUAGE-NOTES — durable language siblings, revision hashes, switcher,
  and previewed translation remain the next path; it will protect rich spans
  from translation corruption
- CP-OPEN-DOCK and CP-PDF-READER — remain after Language Notes in the accepted
  backlog order
- Atomik DSL/studio implementation — M12/M13/D4 work under bedrock 19/21 and
  ADR-010, not a generic fenced-renderer adapter
- an unbounded “support every DSL” promise — Graphviz, WaveDrom, PlantUML,
  Typst, music/timing notations, and future formats enter only through later
  evaluated adapters
- full LSP — no server discovery/spawn/transport, virtual workspace,
  completion, signature help, protocol hover, definition/references, rename,
  formatting, code actions, or workspace symbols
- code execution, notebook cells, remote data loading, raw HTML, and
  renderer-originated network access

# Execution

- [x] S01 Bootstrap + ADR/security/performance pins: create the worktree, read
      every Required document, recheck exact dependency versions/licenses and
      APIs, measure current startup/build/read/live baselines, define renderer
      result/budget/diagnostic contracts, and record the third-party-renderer
      boundary in ADR-014 before installing or implementing.
- [x] S02 Registry + safe fallback: implement pure fence/math discovery and a
      typed lazy adapter registry with cancellation, stale-result suppression,
      theme input, budgets, teardown, accessible error/source fallback, and
      unknown-fence parity; tests and editor module note in the same unit.
- [x] S03 KaTeX: add safe inline/display/fenced math to read and live, MathML
      accessibility, edit-range reveal, error/source behavior, themes, focused
      tests, docs, ledger, and a bare gate.
- [ ] S04 Mermaid: add local lazy secure SVG diagrams, sanitizer/security and
      resource caps, theme/a11y/source behavior, cancellation tests, docs,
      ledger, and a bare gate.
- [ ] S05 Vega-Lite: add local lazy inline-data charts, schema/cap validation,
      blocked loaders/actions, view finalization, theme/a11y/source behavior,
      focused tests, docs, ledger, and a bare gate.
- [ ] S06 Code presentation + decoration-only diagnostics: replace the fixed
      language switch with dynamic CodeMirror language data, add fine-grained
      lazy Shiki read highlighting and code-block chrome, then add bounded
      parser/local-analyzer diagnostics mapped to note ranges through
      CodeMirror lint decorations; explicitly regression-pin every excluded
      LSP capability.
- [ ] S07 Parity, lifecycle, and performance hardening: large/malformed blocks,
      rapid edit/cancel/theme/tab switches, cache/teardown, responsive and
      keyboard/screen-reader benches, bundle-chunk inspection, all focused and
      bare integrated gates, docs, and ledger.
- [ ] S08 Owner bench + closure: acceptance and closing ceremony, rebase on the
      latest local trunk, repeat all bare gates, coherence audit, per-entry
      journal, `status: done`, and self-merge; then open CP-LANGUAGE-NOTES.

# Current checkpoint

```text
base commit : 98561b4
changed     : S02 exact package lock; pure syntax + escaped Markdown-it
              placeholders and bounded host; S03 KaTeX HTML+MathML adapter;
              safe per-expression macros; inline/display/fence read + live;
              edit-range reveal, theme rebuild, precedence and limit status
tests       : S03 focused PASS (3 files / 72 tests); full PASS (75 files / 954
              passed + 1 skipped); Cairn/typecheck/build PASS — entry
              2,382,051 B (+8,626 from S02), global CSS 134,861 B (+1,944);
              lazy KaTeX 485,408 B JS + 28,946 B CSS + local font assets
audit       : npm audit reports the same 4 inherited highs on trunk and S02
              (PDF.js + Vite/PostCSS/nanoid + Electron optional undici); zero
              rich-dependency advisory delta, no automatic rewrite applied
catalog     : docs/learning/index.md edit is deliberate under bedrock 17's
              first-use catalog rule; it is not generated ACTIVE/register state
next action : checkpoint S03, then begin S04 secure Mermaid adapter
blockers    : none; rebased onto trunk 783c7c6 and full gate is green
```

# Blockers

None recorded.
