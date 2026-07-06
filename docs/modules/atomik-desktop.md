---
type: Atomik Module Note
title: 'Module: atomik-desktop'
description: Electron desktop shell — the secure main/preload/renderer split every later feature builds on.
tags: [module, electron, security, shell]
timestamp: 2026-07-06T00:00:00Z
---

# Module: atomik-desktop

> Learning layer: [Learning: the Electron shell, from zero](../learning/01-electron-shell-from-zero.md)
> teaches the technologies, concepts, and methodology behind this module for
> someone who did not build it. This note states the contracts.

## What it owns

- The Electron shell: app lifecycle, the trusted UI window, and the
  main/preload/renderer split (`apps/desktop/electron-main/`,
  `electron-preload/`, `renderer/` — directory names per 14).
- The security posture of that window: `SECURE_WEB_PREFERENCES`
  (`electron-main/security.ts`) pins 13's required settings; the renderer's
  CSP lives in `renderer/index.html`.
- The renderer-facing API surface: `shared/ipc-contract.ts` is the single
  source of truth (`ATOMIK_API_KEY`, `ATOMIK_CHANNELS`, `AtomikApi`,
  `DOCUMENTED_PRELOAD_SURFACE`). Thirteen channels exist today: shell
  identity, docs tree + doc read, workspace state read/write (fixed path,
  validated payload), the vault family — `open-vault` (native dialog in
  main; user-mediated capability), `get-vault`, `list-vault-files`,
  `read-note`, `write-note`, `create-note` — and the project pair
  `list-projects` / `create-project`.
- Vault IO (04/27, S05): `electron-main/vault.ts` (incubating vault-core,
  14) — tree listing (dot-dirs, `.git`, `.atomik`, `node_modules` skipped;
  symlinks not followed), validated vault-relative `.md` paths, byte-exact
  atomic writes, edit vs exclusive-create (`wx`) semantics, no code path
  writes on open. Last vault remembered in `.atomik/local-settings.json`,
  written by main only (no channel). `ATOMIK_VAULT_DIR` overrides for
  tests/smoke/dev.
- Project bundles (04, S06): `electron-main/project.ts` (incubating
  project-core, 14) — manifest-detected bundles
  (`project.atomik-project.json`; scan skips denied dirs and does not
  descend into projects), `createProject` as idempotent ENSURE (creates
  only missing manifest/index.md/log.md, `wx`; adoption never touches
  existing files; manifest identity wins on re-create). Deviation from
  04's example recorded: no `root` field in the manifest (derivable,
  staleness-prone). ProjectView scopes the existing vault tree via the
  pure `findSubtree` helper — reads stay on vault channels.
- The workspace layout (03): recursive pane tree (leaf tabs / splits with
  draggable fraction), pure operations in `renderer/src/workspace/model.ts`
  (incubating workspace-core, 14), thin zustand store with debounced
  persistence, disposable state in `.atomik/local-workspace.json`
  (`electron-main/workspace-state.ts`; `ATOMIK_STATE_DIR` overrides the
  location for tests/smoke).
- The Dev Docs tab (16 MVP slice): grouped docs tree + rendered Markdown
  with the bedrock diagrams inlined as SVG data URIs, reading the real
  files under `docs/`. `electron-main/dev-docs.ts` holds the pure logic —
  the seam where a future dev-docs-core kernel splits off (14).
  `#dev-docs:<relPath>` deep-links a page at startup.
- The `ATOMIK_SMOKE=1` launch hook: deterministic "app starts and Dev Docs
  opens the bundle" check for M0 acceptance. Waits for the rendered view,
  honors `ATOMIK_SMOKE_DOC` (which doc to open) and `ATOMIK_SMOKE_SHOT`
  (PNG capture path), prints `ATOMIK_SMOKE_OK`, exits 0 (1 on timeout).

## Why it exists

M0 of the roadmap (18): everything after this — Dev Docs tab, panes, vault,
AI patch loop — renders inside this shell and crosses this bridge. Getting
the trust boundary right first means later features inherit it instead of
retrofitting it.

## What it must not own

- Canonical knowledge (files are the source of record; vault IO arrives at
  S05 behind typed APIs, not ambient renderer access).
- Provider keys or billing credentials — never in renderer, preload-exposed
  values, or logs (13).
- Remote/untrusted content — the trusted window denies `window.open` and
  external navigation outright; isolated source views are an M5 concern.
- Kernel logic: `project-core`, `vault-core`, etc. stay Electron-free (14);
  this app is an adapter layer.

## Public contracts

- `shared/ipc-contract.ts` — every renderer-visible method is declared here
  first; `tests/preload-surface.test.ts` fails on drift between this contract
  and what `contextBridge` actually exposes.
- `electron-main/security.ts` — `SECURE_WEB_PREFERENCES` is asserted exactly
  (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`,
  `webSecurity: true`) by `tests/security-contract.test.ts`, which also
  checks linkage to `docs/contracts/electron_security_contract_v0_2.json`.
- Scripts: `npm run dev | build | preview | smoke | test | typecheck`
  (root `package.json` forwards to this workspace).

## Data flow

```text
renderer App.tsx
  -> window.atomik.getAppInfo()            (typed AtomikApi)
  -> preload: ipcRenderer.invoke('atomik:get-app-info')
  -> main: ipcMain.handle -> buildAppInfo(app/process identity)
  -> AppInfo back to renderer (read-only; no fs, no secrets)

renderer DevDocs.tsx
  -> window.atomik.listDevDocs() / readDevDoc(relPath)
  -> preload -> named channels
  -> main: resolveDevDocPath validates (relative-only, extension
     allowlist, traversal + symlink-escape guards) -> file from docs/
  -> renderer: markdown-it (html:false) -> relative SVG imgs inlined
     into the HTML string -> React renders the final string once

workspace layout (03: recoverable UI state, never knowledge)
  click/drag -> dispatch(pure operation from model.ts) -> new state
  -> React re-renders (identity change) -> debounced 500 ms
  -> writeWorkspaceState -> main validates shape + caps (depth<=16,
     <=64 tabs/leaf, 256 KB) -> atomic write (temp + rename, 27)
  restore: load() -> readWorkspaceState (null on missing/corrupt ->
  default layout; a broken layout file never crashes the app)

vault (04: files are the durable source of record)
  open: dialog in main -> vaultRoot held in main -> VaultInfo to renderer
  read: VaultView -> readNote(relPath) -> resolveNotePath (relative-only,
        .md-only, denylist, realpath containment) -> content + mtimeMs
  write: writeNote (target must exist) / createNote (wx, never clobbers)
        -> byte-exact atomic temp+rename; one edit = one clean Git diff
  open/list/read never write (proven: git status stays empty)
```

## Alternatives considered

- **electron-vite vs hand-rolled glue** (vite renderer + tsc/esbuild main +
  concurrently): chose electron-vite — one config, HMR for all three targets,
  maintained. Accepted risk: its vite-major coupling (see Common mistakes).
- **CommonJS vs `"type": "module"`**: CJS deliberately. Sandboxed preload
  scripts must load as CJS bundles; `sandbox: true` is contract (13), so ESM
  main/preload convenience loses.
- **npm workspaces vs pnpm**: npm — zero extra tooling for a two-package
  monorepo. Revisit only on real pain.
- **Project-references tsconfig**: rejected for now (`composite` + `noEmit`
  friction); two flat configs (`tsconfig.node.json`, `tsconfig.web.json`)
  and a two-step `typecheck` script.
- **zustand vs Jotai/Redux/Context** (12 lists zustand or Jotai): zustand —
  one store, selector subscriptions, no providers, ~1 kB; layout logic
  stays in pure `model.ts` functions so the store is replaceable.
- **Split creates an empty pane** (placeholder with +docs/+shell) rather
  than auto-cloning a tab: simpler invariants, explicit user intent.
- **`.atomik/` stays fully Git-ignored** (resolves the S01 observation):
  we persist `local-workspace.json` (machine-local per 03/27); a shared
  committed `workspace.json` only becomes relevant with collaboration and
  is deferred until then.

## Common mistakes

- Adding a preload method without extending `ipc-contract.ts` and the surface
  test in the same change — the test fails by design; re-read 13 §IPC first
  (CP-MVP-001 conditional trigger).
- Setting `"type": "module"` in `package.json` — silently breaks the
  sandboxed preload.
- Loosening any `webPreferences` key — `security-contract.test.ts` asserts
  the object exactly, additions included.
- Upgrading `@vitejs/plugin-react` to v6 or `vitest` to v4 while
  electron-vite pairs with vite 7: both require the rolldown-based vite 8 and
  reintroduce a dual-vite type conflict (hit and fixed at S02).
- Loading any remote URL in the trusted window — denied by handlers; remote
  content gets its own isolated view at M5.
- Mutating React-owned innerHTML after render (S03 lesson): a later commit
  of the same `dangerouslySetInnerHTML` content discards manual DOM edits.
  Pre-process the HTML string instead, then render it once.
- Treating `readDevDoc` casually: its path validation IS the trust boundary
  for renderer-reachable file reads. Widening `DOC_EXTENSIONS` or pointing
  it outside `docs/` is a reviewed security decision, not a tweak.
- Capitalizing the app name in UI surfaces: the product displays itself in
  lowercase — "atomik" (owner decision, 2026-07-06). Documentation prose
  keeps "Atomik".
- Storing knowledge in workspace state: tab `params` carry view arguments
  (a doc path), never content. Deleting `.atomik/` must never lose value.
- Letting the renderer name a persistence path: the workspace file path is
  fixed in main; renderer sends payloads only.
- An effect that reacts to a prop must not re-fire on its own failure
  (DevDocs `lastRequested` guard — a bad `docPath` would retry forever).
- Deferred pane operations from 03, recorded not forgotten: move tab
  between panes, pin tab, focus mode, resize keyboard access.
- "Improving" vault bytes: any normalization (trailing newline, frontmatter
  order, timestamps-on-read) breaks the one-edit-one-diff contract (27).
  `writeNote` writes exactly what it is given, full stop.
- Creating through `writeNote` or overwriting through `createNote`: the
  verbs are deliberately split; `wx` makes create exclusive at the OS
  level (no TOCTOU window).
- Silently generating a vault `.gitignore`: 27 sketches a default template,
  but touching a user's vault uninvited violates no-silent-mutation —
  deferred to an explicit, consented flow.

## Tests

`apps/desktop/tests/` (vitest, node env): `security-contract.test.ts` (pinned
webPreferences + contract-file linkage), `preload-surface.test.ts` (exact
documented surface, no raw `ipcRenderer`, named-channel routing),
`app-info.test.ts` (pure mapper), `dev-docs-paths.test.ts` (traversal /
absolute / NUL / extension / non-string rejections), `dev-docs-list.test.ts`
(grouping, generated-artifact exclusion, symlink-escape refusal on a fixture
bundle), `markdown-helpers.test.ts` (frontmatter strip, relative-link
resolution), `workspace-model.test.ts` (splits, collapse rules, focus
repair, fraction clamping), `workspace-state.test.ts` (atomic roundtrip, no
temp residue, forgiving reads, payload validation caps), `vault.test.ts`
(path matrix incl. denylist, tree pruning + symlink policy, byte-exact
write, wx create, settings memory), `project.test.ts` (folder-path matrix,
slugs, manifest scan incl. no-descend + malformed fallback, idempotent
ensure, byte-identical adoption), `vault-scope.test.ts` (findSubtree). The smoke run proves boot + Dev Docs
rendering and reports pane/vault counts; pre-seeded `ATOMIK_STATE_DIR` /
`ATOMIK_VAULT_DIR` fixtures prove layout restore and, with
`ATOMIK_SMOKE_VAULT_WRITE=1`, the full renderer→disk write chain (verified
byte-exact via cmp + a one-file Git diff); a write-free run proves
no-rewrite-on-open (git status stays empty).

## Example usage

```bash
npm run dev          # HMR dev shell
npm test             # 28 tests, 6 suites
npm run typecheck    # node + web configs
npm run smoke        # build + ATOMIK_SMOKE=1 electron .  -> ATOMIK_SMOKE_OK
# open a specific doc / capture proof:
ATOMIK_SMOKE=1 ATOMIK_SMOKE_DOC=bedrock/22_22-agent-handoff.md \
  ATOMIK_SMOKE_SHOT=/tmp/devdocs.png electron .
```

## Future extension points

- S07 editor (CodeMirror): `mtimeMs` from `readNote` becomes conflict
  detection; explicit save / safe autosave policy; read 11 first (trigger).
- Vault switching UI (owner-deferred "when necessary"): the channel
  supports it; the view lacks the affordance, and mounted vault/project
  views would need invalidation on switch.
- Manifest `resources`/`pinned` stay empty until real membership needs
  arrive (S08+ patch destinations; 04).
- Dev Docs later modes (16): agent/architecture/context/execution views,
  search, packaged-build docs path (docs/ currently resolves relative to
  the repo checkout — packaging must bundle or relocate it).
- Provider/AI calls (S08+): trusted main/service layer only; renderer sends
  typed operations; local runtimes get a worker/sidecar boundary (12).

## Agent checklist

```text
before any new IPC channel or preload method:
  re-read 13 §IPC; update shared/ipc-contract.ts + preload + tests same unit
never expose ipcRenderer, fs, or shell to the renderer
keep SECURE_WEB_PREFERENCES exact; changes are ADR-level security decisions
run typecheck + test + build + smoke before committing shell changes
update this note in the same work unit as any boundary change
```

## Dependency facts (dated)

Resolved 2026-07-06 from the npm registry (recheck on any dependency bump;
expect plugin-react/vitest to move forward together once electron-vite pairs
with vite 8):

```text
electron ^43.0.0 · electron-vite ^5.0.0 (pairs with vite ^7) · vite ^7.3.6
@vitejs/plugin-react ^5 (peers vite ^4.2–^8; v6 needs rolldown vite 8)
vitest ^3.2.7 (v4 needs vite 8) · react/react-dom ^19.2.x
typescript ^6.0.3 · @types/node ^24 · markdown-it ^14.3.0 (added S03)
zustand ^5.0.14 (added S04)
```

Dev-environment note (WSL2 Ubuntu noble): Electron needs `libnss3`,
`libnspr4`, `libasound2t64` system packages. Without root they can be
`apt-get download`-ed and `dpkg -x`-extracted, then passed via
`LD_LIBRARY_PATH`; for daily dev install them properly with apt.
