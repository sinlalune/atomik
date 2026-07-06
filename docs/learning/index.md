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
