# Log — documentation plane

## 2026-07-06

- First module learning note added: `modules/atomik-desktop.md` (CP-MVP-001 S02 — Electron shell, secure split, typed bridge; dated dependency facts inside).
- `modules/atomik-desktop.md` updated for S03: Dev Docs channels and their trust boundary, docs data flow, React innerHTML lesson, markdown-it dependency fact. The docs bundle is now readable inside the app itself (16).
- Learning layer added on owner feedback: `learning/` (beginner-first notes anchored to real files) with `01-electron-shell-from-zero.md` covering S02–S03; new doc type registered in 17, template added to 24, linked from the module note, surfaced as a Dev Docs group. Module notes state contracts; learning notes teach the stack so the owner can take over.
- S04: `modules/atomik-desktop.md` gains the workspace layout contracts (pane tree schema, validation caps, atomic persistence, `.atomik/` decision); `learning/02-react-state-panes-and-disposable-persistence.md` teaches stores, immutability, recursion, atomic writes, and debounce from zero.
- S05: `modules/atomik-desktop.md` gains the vault contracts (channel family, denylist + symlink policy, byte fidelity, edit vs exclusive create, no-rewrite-on-open proof); `learning/03-vault-io-and-file-trust.md` teaches consent dialogs, wx/TOCTOU, and the file-trust promises from zero.
- S06: `modules/atomik-desktop.md` gains the project-bundle contracts (manifest detection, idempotent ensure, adoption guarantees, the no-`root`-field deviation from 04's example); `learning/04-project-bundles-and-conventions.md` teaches convention-over-configuration, idempotence, and slugs from zero.
- S07: `modules/atomik-desktop.md` gains the editor contracts (raw-buffer fidelity, mtime handshake, EditorView-in-a-ref discipline); `learning/05-editor-codemirror-and-optimistic-saves.md` teaches CodeMirror 6, imperative libs inside React, and optimistic locking from zero.
- S08: `modules/atomik-desktop.md` gains the AI-loop contracts (pure-compute channel, provider seat, buffer-apply semantics, open block kinds); `learning/06-ai-patch-loop-and-mock-first.md` teaches contract-first pipelines and why the AI channel cannot write.

## 2026-07-05

- v0.6 released: execution-state plane (35, ADR-009, bootstrap 22, CP-MVP-001), reuse economy, note lifecycle, diagram docs (`diagrams/`), milestone→path register.
- Bundle restructured to the ADR-009 repository layout; start-polish pass applied (superseded 04 draft archived, `docs/index.md`/`log.md` seeded, references made explicit).
