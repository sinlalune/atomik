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
  current_step: S07
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
   contract. Unknown fences remain escaped plain code inside common chrome.
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
  budgets, accessible diagnostics, and a source fallback; unsupported language
  identifiers stay escaped/plain and never trigger a guessed grammar.
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
- [x] S04 Mermaid: add local lazy secure SVG diagrams, sanitizer/security and
      resource caps, theme/a11y/source behavior, cancellation tests, docs,
      ledger, and a bare gate.
- [x] S05 Vega-Lite: add local lazy inline-data charts, schema/cap validation,
      blocked loaders/actions, view finalization, theme/a11y/source behavior,
      focused tests, docs, ledger, and a bare gate.
- [x] S06 Code presentation + decoration-only diagnostics: replace the fixed
      language switch with dynamic CodeMirror language data, add fine-grained
      lazy Shiki read highlighting and code-block chrome, then add bounded
      parser/local-analyzer diagnostics mapped to note ranges through
      CodeMirror lint decorations; explicitly regression-pin every excluded
      LSP capability.
- [ ] S07 Owner bench, environment defects, then parity/lifecycle hardening.
      Reordered on 2026-08-17: the first bench of this path found Mermaid and
      Vega-Lite had never rendered in the real app and code was dark-on-dark in
      two themes, all with green gates. Bench first, harden what the bench
      actually hits. Remaining: notes 01/04/05 and every security probe
      unexercised; large/malformed blocks, rapid edit/cancel/theme/tab
      switches, cache/teardown, responsive and keyboard/screen-reader benches,
      bundle-chunk inspection, all focused and bare integrated gates, docs and
      ledger. Open question the bench raised: whether a real-Electron smoke
      lane is the only mechanical guard against environment-class defects.
- [ ] S08 Owner bench + closure: acceptance and closing ceremony, rebase on the
      latest local trunk, repeat all bare gates, coherence audit, per-entry
      journal, `status: done`, and self-merge; then open CP-LANGUAGE-NOTES.

# Current checkpoint

```text
base commit : 98561b4
changed     : S02 exact package lock; pure syntax + escaped Markdown-it
              placeholders and bounded host; S03 KaTeX HTML+MathML adapter;
              safe per-expression macros; inline/display/fence read + live;
              S04 strict queued Mermaid config + source/resource/edge preflight;
              parsed static SVG postflight, ID namespace/a11y; read/live theme,
              touched-range reveal, shared cap, cancellation/staging cleanup;
              S05 structured inline-only Vega preflight, two-stage lazy runtime,
              deny loader, token theme, View finalization, shared SVG guard,
              read/live parity and three-renderer cap; S06 exact lazy
              CodeMirror language catalog, 37-language fine-grained Shiki map,
              safe token DOM + code chrome, source-only lazy lint decorations,
              bounded parser diagnostics and explicit no-LSP capability pin
tests       : S06 focused PASS (3 files / 102 tests); full PASS (75 files / 984
              passed + 1 skipped); Cairn/typecheck/build PASS — entry 2,454,528
              B (+70,920 from S05, +125,030 from S01), CSS 140,228 B (+4,185);
              lazy code 23,033 B, diagnostics 35,017 B, Shiki core 226,275 B,
              JS engine 111,669 B, themes 14,198/14,475 B; 28,570 B eager
              headroom remains under the 150 KiB ceiling
audit       : npm audit reports the same 4 inherited highs on trunk and S02
              (PDF.js + Vite/PostCSS/nanoid + Electron optional undici); zero
              rich-dependency advisory delta, no automatic rewrite applied
catalog     : docs/learning/index.md edit is deliberate under bedrock 17's
              first-use catalog rule; it is not generated ACTIVE/register state
receipt     : atomik-project/sessions/
              2026-08-17-cp-rich-markdown-s06-code-diagnostics.md
              2026-08-17-cp-rich-markdown-s07-owner-bench.md
bench       : S07 FIRST OWNER BENCH — the app could not start at all (Electron
              never unpacked in either tree; restored from the local July
              cache). It found Mermaid refusing every themed diagram
              (`light-dark()` handed to a JS color parser), Vega-Lite refusing
              every chart (`Function(...)` vs `script-src 'self'`), code
              dark-on-dark in `ember`/`hearth` (dark-ness defined three ways),
              and charts ignoring the theme (hex-only token reader). Fixed via
              adapters/css-color.ts, AST + vega-interpreter 2.3.2, and one
              rich-markdown/theme.ts; ADR-014 §8 records the decisions.
tests       : S07 focused PASS (rich-markdown 53); full PASS (75 files / 992
              passed + 1 skipped); Cairn/typecheck/build PASS — entry
              2,454,861 B (+333 from S06), CSS 140,228 B (unchanged);
              vega-interpreter 8,716 B as its own lazy chunk, so the CSP fix
              costs nothing at startup; 28,237 B eager headroom remains under
              the 150 KiB ceiling. Every new regression was verified by
              reverting its fix and watching it fail — the suite runs on
              linkedom, which has no getComputedStyle and no CSP, so coverage
              alone could not see any of this.
next action : finish the bench — notes 01/04/05, every security probe, and the
              byte-stability check — then harden what it hits; decide on a
              real-Electron smoke lane
blockers    : none; rebased onto trunk 783c7c6
```

# Blockers

None recorded.
