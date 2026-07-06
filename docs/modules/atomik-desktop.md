---
type: Atomik Module Note
title: 'Module: atomik-desktop'
description: Electron desktop shell — the secure main/preload/renderer split every later feature builds on.
tags: [module, electron, security, shell]
timestamp: 2026-07-06T00:00:00Z
---

# Module: atomik-desktop

## What it owns

- The Electron shell: app lifecycle, the trusted UI window, and the
  main/preload/renderer split (`apps/desktop/electron-main/`,
  `electron-preload/`, `renderer/` — directory names per 14).
- The security posture of that window: `SECURE_WEB_PREFERENCES`
  (`electron-main/security.ts`) pins 13's required settings; the renderer's
  CSP lives in `renderer/index.html`.
- The renderer-facing API surface: `shared/ipc-contract.ts` is the single
  source of truth (`ATOMIK_API_KEY`, `ATOMIK_CHANNELS`, `AtomikApi`,
  `DOCUMENTED_PRELOAD_SURFACE`). Three channels exist today, all read-only:
  `atomik:get-app-info` (shell identity), `atomik:list-dev-docs` (docs
  tree), `atomik:read-dev-doc` (one validated docs file).
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

## Tests

`apps/desktop/tests/` (vitest, node env): `security-contract.test.ts` (pinned
webPreferences + contract-file linkage), `preload-surface.test.ts` (exact
documented surface, no raw `ipcRenderer`, named-channel routing),
`app-info.test.ts` (pure mapper), `dev-docs-paths.test.ts` (traversal /
absolute / NUL / extension / non-string rejections), `dev-docs-list.test.ts`
(grouping, generated-artifact exclusion, symlink-escape refusal on a fixture
bundle), `markdown-helpers.test.ts` (frontmatter strip, relative-link
resolution). The smoke run proves boot + Dev Docs rendering (optionally
screenshot-captured); bridge correctness is covered by the unit suites.

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

- S04 tabs/panes (03): absorbs the interim two-view header nav; workspace
  state under `.atomik/` (disposable). S05 vault IO in main with atomic
  Git-friendly writes — a separate channel family with its own validation,
  not an extension of the read-only dev-docs one.
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
```

Dev-environment note (WSL2 Ubuntu noble): Electron needs `libnss3`,
`libnspr4`, `libasound2t64` system packages. Without root they can be
`apt-get download`-ed and `dpkg -x`-extracted, then passed via
`LD_LIBRARY_PATH`; for daily dev install them properly with apt.
