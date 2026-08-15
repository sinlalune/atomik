# Learning layer — own what the agents build

This folder is the beginner-first layer of the documentation. Module notes
(`../modules/`) record contracts and decisions for someone who already knows
the stack; learning notes teach the stack itself, as it is actually used in
this repository, so the owner can take over any brick an agent built.

Every learning note must:

```text
start from zero on the technologies it covers
anchor every explanation to real files in this repository
name the architecture concepts it mobilizes (trust boundary, contract, ...)
explain the methodology used to build the code, not only the result
end with hands-on exercises that prove ownership
```

Learning notes are created just-in-time: when a coding-path step first
mobilizes a technology or pattern, the same work unit adds or extends the
matching note (17). They explain shapes and concepts, so they need updating
when the shape changes, not on every diff.

## Notes

- [01 — The Electron shell, from zero](./01-electron-shell-from-zero.md) —
  processes, security switches, IPC, the Dev Docs slice, the toolchain, and
  how agents work here. Covers CP-MVP-001 S02–S03.
- [02 — React state, the pane tree, and disposable persistence](./02-react-state-panes-and-disposable-persistence.md) —
  stores, pure functions and immutability, recursive layouts, atomic writes,
  debounce. Covers CP-MVP-001 S04.
- [03 — Vault IO: writing knowledge without betraying it](./03-vault-io-and-file-trust.md) —
  native dialogs as consent, edit vs exclusive create (wx/TOCTOU), byte
  fidelity, no-rewrite-on-open. Covers CP-MVP-001 S05.
- [04 — Project bundles: conventions, manifests, and safe adoption](./04-project-bundles-and-conventions.md) —
  convention over configuration, idempotent ensure, slugs/NFKD, scoping
  views without new channels. Covers CP-MVP-001 S06.
- [05 — The editor: CodeMirror, dirty state, and optimistic saves](./05-editor-codemirror-and-optimistic-saves.md) —
  CodeMirror 6 architecture, imperative libraries inside React, the mtime
  handshake and conflict banner. Covers CP-MVP-001 S07.
- [06 — The AI patch loop: contracts first, intelligence later](./06-ai-patch-loop-and-mock-first.md) —
  operation/bundle/patch contracts, mock-first, the provider seat, and why
  the AI channel cannot write. Covers CP-MVP-001 S08.
- [07 — Action traces: measuring without spying](./07-action-traces-and-cost-observability.md) —
  the one-line ledger, append-only JSONL, estimated vs actual, content-free
  telemetry. Covers CP-MVP-001 S09.
- [08 — Mechanical truth labels: evidence is computed, never claimed](./08-mechanical-truth-labels.md) —
  the labeling rule, quote hashes, form vs evidence, challenge → repair.
  Covers CP-MVP-001 S10.
- [09 — Lexical search and the acceptance ritual](./09-lexical-search-and-acceptance-runs.md) —
  why no embeddings first, the retrieval ladder, PASS/STRUCTURAL/DEFERRED
  honesty. Covers CP-MVP-001 S11.
- [10 — Live preview: decorating the raw buffer](./10-live-preview-decorations.md) —
  CodeMirror decorations, the syntax tree, the reveal rule, compartments,
  and why styling never touches bytes. Covers the MVP-001 owner-feedback
  batch (seamless editing) during CP-MVP-002.
- [11 — A local HTTP capture server, from zero](./11-local-http-capture-server.md) —
  node:http without a framework, capability tokens and constant-time
  compare, magic-byte validation, the inbox/vault boundary, testing a real
  server. Covers CP-MVP-002 S02.
- [12 — PDF as a source: engines, extraction, and anchors that survive](./12-pdf-source-and-anchors.md) —
  the dated pdf.js decision, two builds of one engine in two processes,
  rendering vs extraction as separate trusts, derived text with
  provenance, page anchors and citation return. Covers CP-MVP-003
  (backfilled 2026-07-21).
- [13 — Local speech and OCR seats: capability tiers, not promises](./13-local-speech-and-ocr-seats.md) —
  whisper.cpp and llama.cpp as bounded sidecars, the adapter seam,
  measured tiers with sticky demotion, the explicit Mistral cloud rung,
  provider keys behind main. Covers CP-MVP-004/005 (backfilled
  2026-07-21).
- [14 — The web source tab: isolation, reader extraction, and snapshots as evidence](./14-web-source-tab-isolation-and-snapshots.md) —
  the hostile guest behind deny-by-default gates, MHTML snapshots as
  hashed evidence, structure-first reader extraction off the main
  process, explicit import and the truth/provider boundary. Covers
  CP-MVP-006 and the S07e wave (backfilled 2026-07-21).
- [15 — File management as refactor: trash seams, relocate previews, and DnD over a proven verb](./15-file-management-as-refactor.md) —
  OS trash behind a test seam, rename/move as a previewed backlink
  refactor with rollback, bundle-as-unit guards, DnD as an input binding,
  pane-chrome trees. Covers CP-MVP-007 (backfilled 2026-07-21).
- [16 — Design tokens, themes, and budgeted glass](./16-design-tokens-themes-and-glass.md) —
  the token contract, light-dark()/color-scheme theme blocks, color-mix
  glass tints with a backdrop-filter budget, semantic state colors,
  same-role-same-box parity, accessible names. Covers CP-MVP-007
  S07m/S07n and bedrock 36.
- [17 — The first real generation adapter: cloud LLM behind a seam](./17-cloud-generation-adapter.md) —
  chat completions onto the unchanged bundle contract, the typed
  adapter seam, timeout-vs-cancel via two abort sources, the
  eight-kind error taxonomy with no silent mock fallback, labeled
  usage + dated price snapshots, mechanical truth over real output,
  pinned model ids. Covers CP-MVP-008 S02.
- [18 — A chat surface without a chat backend](./18-chat-thread-and-transcript-files.md) —
  multi-turn as a validated `thread` on the unchanged operation
  contract, transcripts as vault notes born at the first message
  (lenient parse, exclusive create), absent-means-hidden pane-state
  migration, and the registered pane surface that gives chat the
  editor's own insert path. Covers CP-MVP-008 S06.
- [19 — Module registries and the native drag contract](./19-registries-and-native-drag.md) —
  three homes for cross-pane state (validated tab params, remount-
  surviving module stores, useSyncExternalStore registries), the
  effectAllowed/dropEffect matching rule behind "drag initiates but
  never lands", payload enrichment of browser-native text drags,
  and open-as-routing (one conversation = one tab). Covers
  CP-MVP-008 S06c–S06c7.
- [20 — Drawing a graph without a graph library](./20-drawing-a-graph-without-a-library.md) —
  computing a diagram as pure, testable data before painting it, the
  HTML-chips-over-SVG-edges split that reuses the existing pill
  recipe, the direction rule behind inbound vs outbound, and the
  geometry facts (bezier midpoints, clientWidth includes padding)
  that decide whether it looks right. Covers CP-MVP-009 S07.
- [21 — Running several agents at once](./21-concurrent-lanes-and-worktrees.md) —
  what a Git worktree does and does not isolate, why state keyed on the
  USER (Electron's `userData` profile) collides while state keyed on the
  DIRECTORY (`.atomik/` beside the checkout) does not, and the
  counter-intuitive finding that the prose a protocol forces every writer
  to touch conflicts far more than the code does. Covers CP-OPS-001
  S01–S03.

## Coverage stall (2026-07-07 → 2026-07-21) — repaid

The just-in-time rule stalled silently after note 11: the "learning notes"
line fell out of the definition-of-done boilerplate from CP-MVP-003 onward
(kept in 001/002/004, dropped in 003/005/006/007), and five shipped paths
went uncovered. The clause is restored in the coding-path template (24),
in bootstrap protocol step 9 (22), and in CP-MVP-008's definition of done;
notes 12–15 above repaid the debt as one docs-only unit on 2026-07-21
(owner decision, Q6 of the pre-CP-MVP-008 vision-alignment review). The
lesson stands: a recurring obligation lives in the per-step protocol, not
only in a checklist line that path-seeding can drop.
