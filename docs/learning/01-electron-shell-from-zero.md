---
type: Atomik Learning Note
title: 'Learning: the Electron shell, from zero'
description: Beginner-first walkthrough of the technologies, architecture concepts, and methodology behind apps/desktop (CP-MVP-001 S02–S03).
tags: [learning, electron, ipc, security, toolchain, methodology]
timestamp: 2026-07-06T00:00:00Z
---

# Learning: the Electron shell, from zero

**Who this is for.** You own this codebase but did not write it. After this
note you should be able to read every file under `apps/desktop/`, explain
why it has that shape, and modify it without an agent.

**Scope.** Everything built in CP-MVP-001 S02 and S03. The companion
contract note is [Module: atomik-desktop](../modules/atomik-desktop.md) —
that one says *what the rules are*; this one teaches *why they exist and
how the pieces work*.

## 1. What Electron is, in one paragraph

A normal web page cannot touch your files — browsers forbid it. A normal
Node.js script can touch everything but has no UI. Electron ships both
engines in one desktop app: **Chromium** (the browser engine, for the UI)
and **Node.js** (for files, processes, the OS). Atomik needs local Markdown
files AND a rich editing UI, in TypeScript everywhere, which is why the
bedrock chose Electron for the MVP (`12_12-electron-mvp.md`).

That power combination is also the danger: a web page that *can* touch your
files is exactly what malware wants to be. Almost everything in this module
exists to keep the two worlds separated on purpose.

## 2. The three processes — the one idea that explains the whole layout

Electron runs your app as separate OS processes with different powers:

```text
main process          electron-main/index.ts
  Node.js world. The only process with OS powers: creates windows,
  reads files, will later hold vault access and provider keys.
  No UI of its own. Think: the kitchen.

renderer process      renderer/  (the React app)
  A web page in a locked-down browser. Renders the UI, reacts to
  clicks. Cannot read files, cannot use Node. Think: the dining room.

preload script        electron-preload/index.ts
  A tiny script injected into the renderer BEFORE the page loads,
  with a controlled channel back to main. It is the serving hatch
  between dining room and kitchen — the ONLY opening.
```

Why this split? If the UI is ever compromised — a malicious npm package in
the React dependency tree, an XSS bug, later a hostile web source rendered
inside Atomik — the attacker lands in a sandboxed page with no file access,
not in your vault. The blast radius is the dining room, never the kitchen.

Two named architecture concepts do the work here:

- **Trust boundary** — a line where the level of trust changes; everything
  crossing it must be checked. Renderer→main IPC is our main boundary.
- **Least privilege** — each part gets only the power it needs. The
  renderer renders; only main touches disk.

This is also why the directory names in `apps/desktop/` mirror the process
model (`14_14-app-kernels.md` fixed them): the folder layout *is* the
security architecture.

## 3. The four security switches, decoded

`electron-main/security.ts` pins these on every window:

```ts
nodeIntegration: false   // the page gets NO Node.js. A <script> that runs
                         // require('fs') just fails. Without this, any JS
                         // injection = full disk access.
contextIsolation: true   // the preload runs in a SEPARATE JS world; the
                         // page cannot reach into its variables and steal
                         // the powerful bits. Only what preload explicitly
                         // publishes crosses over.
sandbox: true            // Chromium's OS-level jail for the renderer
                         // process itself, same as Chrome tabs.
webSecurity: true        // keeps same-origin rules on; never disabled.
```

Electron's modern defaults already match most of this. We still write them
explicitly, because `tests/security-contract.test.ts` asserts this object
**exactly** — someone (human or agent) adding a risky flag makes the suite
fail. Concept: **mechanical enforcement** — a rule checked by a test is a
contract; a rule stated in prose is a hope. You will find this pattern all
over the project (the bedrock calls its documents "contracts" for the same
reason).

One more layer sits in `renderer/index.html`: a **Content-Security-Policy**
meta tag. CSP is a browser allowlist saying "this page may only load
scripts/styles/images from these origins". Ours is `'self'` plus data URIs
for images — so even a successful HTML injection cannot pull a script from
the network. Belt and suspenders.

## 4. IPC — how the page asks for things

IPC (inter-process communication) is how the dining room orders from the
kitchen. Electron's polite form is `invoke`/`handle`: an async function
call across processes, by channel name. Follow one call end to end — this
is the pattern every future feature repeats. (The original example here,
the S02 shell identity card and its `get-app-info` channel, was removed
on MVP-001 owner feedback — "get rid of shell relict". The pattern is
unchanged; the docs reader is now the simplest chain.)

```text
1. renderer/src/dev-docs/DevDocs.tsx
     window.atomik.readDevDoc(relPath)   // looks like a normal async call

2. electron-preload/index.ts
     readDevDoc: (relPath) =>
       ipcRenderer.invoke('atomik:read-dev-doc', relPath)
                                          // the hatch forwards by NAME

3. electron-main/index.ts
     ipcMain.handle('atomik:read-dev-doc', (_event, relPath) =>
       readDevDoc(docsRoot, relPath))     // the kitchen answers

4. electron-main/dev-docs.ts
     readDevDoc(...)                      // pure logic, path-validated,
                                          // unit-tested

5. the promise resolves back in React with the DevDocFile object
```

Three design rules make this safe and maintainable:

- **Named, narrow channels.** One channel does one thing. We never expose
  `ipcRenderer` itself — that would be a master key ("call anything in the
  kitchen"), the generic bridge that `13_13-electron-security.md` forbids.
- **Single source of truth.** `shared/ipc-contract.ts` declares the channel
  names, the TypeScript types, and `DOCUMENTED_PRELOAD_SURFACE` — the
  complete list of what the renderer may call. Main, preload, renderer, and
  the tests all import from this one file, so they cannot drift apart.
- **Drift alarm.** `tests/preload-surface.test.ts` loads the real preload
  against a fake Electron and compares what it exposed with the documented
  list. Add an undocumented method and the suite fails. Mechanical
  enforcement again.

Beginner gotcha worth knowing now: `console.log` in main-process files
prints to the **terminal** you launched from; `console.log` in renderer
files prints to the **DevTools console** in the window. Two worlds, two
consoles.

## 5. Worked example — the Dev Docs tab (S03)

One click in the docs tree exercises every layer. `readDevDoc` is our first
IPC call that takes an **argument**, and renderer-supplied arguments are
exactly what crosses the trust boundary — so this is where input validation
first appears.

```text
click "00_00-orientation.md"
  -> DevDocs.tsx: window.atomik.readDevDoc('bedrock/00_00-orientation.md')
  -> preload forwards on 'atomik:read-dev-doc'
  -> electron-main/dev-docs.ts: resolveDevDocPath() validates the path
  -> file read from docs/, sent back
  -> markdown.ts strips frontmatter, markdown-it renders HTML
  -> diagram <img> tags are inlined as SVG data URIs
  -> React displays the final HTML string
```

**Path traversal, explained.** The renderer sends a *string*. If main
naively did `readFile('docs/' + relPath)`, a compromised renderer could
send `../../home/you/.ssh/id_rsa` — `..` walks UP the directory tree, out
of `docs/`, to anywhere. That attack class is called **path traversal**.
`resolveDevDocPath` therefore refuses absolute paths, backslashes, NUL
bytes and oversized input, allowlists extensions (`.md`, `.svg`, `.json`),
resolves the path and *proves* the result still lives inside `docs/`, and
finally re-checks after symlink resolution (a symlink inside `docs/` could
point outside — `realpathSync` exposes where a path REALLY leads).
`tests/dev-docs-paths.test.ts` and `dev-docs-list.test.ts` try all these
attacks on purpose. When you later meet vault IO (S05), expect the same
validation pattern with a different root.

**A lesson we hit for real.** First implementation: render the Markdown,
then patch the diagram `<img>` tags directly in the page DOM. It silently
failed — React re-committed its version of the HTML and erased our edits.
Diagnosis went: screenshot showed a broken image → a probe traced the
effect (it DID set the data URI) → conclusion: the node got replaced after
we touched it. Concept: **the virtual DOM owns its subtree** — React treats
the DOM as its render target, so hand-edits under React-owned nodes are
undefined behavior. Fix: transform the HTML *string* (in a detached
document) BEFORE handing it to React, one-way. The debugging method —
observe, instrument, localize, then fix the design rather than the symptom
— matters more than the specific bug.

## 6. The toolchain — so the npm scripts aren't magic

```text
TypeScript   the typed layer over JavaScript. strict mode ON. Types here
             are executable documentation: AtomikApi IS the API doc, and
             `tsc --noEmit` (npm run typecheck) proves code matches it.

Vite         dev server + bundler. In dev it serves the renderer with HMR
             (hot module replacement: save a file, the UI updates without
             restarting). At build it bundles renderer/src into out/.

electron-vite  one config (electron.vite.config.ts), three builds: main,
             preload, renderer. Chosen over hand-rolled glue in S02
             (alternatives are recorded in the module note).

CommonJS     apps/desktop deliberately has NO "type": "module". Sandboxed
             preload scripts can only load as CommonJS bundles — ESM there
             would force sandbox:false, and sandbox is contract.

npm workspaces  the monorepo mechanism: the root package.json declares
             apps/* and packages/*; later kernels (vault-core, ...) become
             packages/ without new tooling (14).

Vitest       the test runner. Tests live in apps/desktop/tests/. Run one
             file: npx vitest run tests/preload-surface.test.ts
```

Command map — what actually happens:

```text
npm run dev         electron-vite: builds main+preload, serves renderer
                    with HMR, launches Electron pointed at the dev server
npm run build       three production bundles into apps/desktop/out/
npm test            vitest run — all suites, no Electron needed (mocked)
npm run typecheck   tsc over the node config, then the web config
npm run smoke       build + launch the REAL app; it opens Dev Docs, waits
                    for render, prints ATOMIK_SMOKE_OK, exits 0. Env vars:
                    ATOMIK_SMOKE_DOC picks the page, ATOMIK_SMOKE_SHOT
                    writes a PNG screenshot for visual review.
```

## 7. The methodology — how agents work in this repository

Understanding the process lets you audit or continue it:

```text
one step = one work unit = one commit
  code + tests + docs (module/learning notes) + Work Ledger + log.md
  land together (35, 17). You can take over at ANY commit boundary
  because no progress exists outside files.

contract first
  security.ts and ipc-contract.ts were written WITH their tests before
  features leaned on them. The tests pin the contract; features grow
  inside it.

conditional reading
  before touching an area, the agent (re)reads the bedrock page the
  coding path names for it (e.g. 13 §IPC before any new channel).

verify like a user, not only like a compiler
  every step ends: typecheck -> unit tests -> build -> smoke (launch
  the real app, screenshot, look at it). "Tests pass" is not "it works".

state lives in the ledger
  atomik-project/coding-paths/CP-MVP-001.md is the execution state:
  base commit, current step, test state, next action. Read it first
  when you come back after time away; git log tells the same story
  commit by commit.
```

## 8. Take over — prove ownership in ~20 minutes

Do these in order; each proves a layer is yours.

1. **Run and touch the UI.** `npm run dev`, then edit the empty-pane
   placeholder text in `renderer/src/workspace/Workspace.tsx` and save —
   the window updates live (HMR). You changed the renderer.
2. **Watch the constitution defend itself.** In
   `electron-main/security.ts`, change `sandbox: true` to `false`. Run
   `npm test`: `security-contract.test.ts` fails and names the rule.
   Revert. You now know rules here are enforced, not suggested.
3. **Extend the bridge the wrong way, then the right way.** Add
   `ping: () => Promise.resolve('pong')` to the `api` object in
   `electron-preload/index.ts`. `npm test` → the surface test rejects the
   undocumented method. Now do it properly: declare a channel in
   `shared/ipc-contract.ts`, add it to `AtomikApi` and
   `DOCUMENTED_PRELOAD_SURFACE`, wrap it in preload, `ipcMain.handle` it in
   `electron-main/index.ts`, extend the surface test's routing block, and
   re-read `13_13-electron-security.md` §IPC — you just followed the same
   trigger the agents follow. Then remove it all (or keep it as scratch).
4. **See the two consoles.** `console.log('kitchen')` in the
   `readDevDoc` handler (terminal) and `console.log('dining room')` in
   `DevDocs.tsx` (DevTools console, Ctrl+Shift+I). Delete both after.
5. **Read the state like an agent.** Open
   `atomik-project/coding-paths/CP-MVP-001.md`, find the checkpoint, then
   `git show --stat HEAD` — match the ledger's story to the diff.

## 9. Vocabulary you now own

```text
process        an OS-level running program; Electron apps are several
main/renderer/preload   kitchen / dining room / serving hatch
IPC            inter-process communication; invoke/handle = async call
contextBridge  the API that publishes preload functions to the page
trust boundary line where trust changes; everything crossing is checked
least privilege        each part gets only the power it needs
path traversal ../ escape attack on file paths built from input
CSP            browser allowlist for where a page may load content from
HMR            hot module replacement — live UI updates in dev
bundle         the single optimized JS file a build produces
monorepo       several packages, one repository, one toolchain
work unit      code+tests+docs+ledger+log landing as one commit
ledger         the durable execution checkpoint inside the coding path
smoke test     launch the real thing and check it actually runs
```

## 10. What arrives next, and what to learn then

- **S04 tabs & split panes** → React state management (the workspace-core
  boundary in 03/14) and the difference between durable knowledge and
  disposable UI state (`.atomik/`).
- **S05 vault IO** → atomic file writes, Git-friendly write discipline
  (27), and a second, stricter validated channel family.
- **S08 AI patch loop** → the operation/response-bundle/patch contracts of
  06 — the heart of the product.

Each of these steps must extend this learning layer in its work unit.
