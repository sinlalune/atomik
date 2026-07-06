---
{
  "id": "12-electron-mvp",
  "title": "Electron MVP architecture",
  "status": "foundational",
  "tags": [
    "electron",
    "desktop",
    "architecture",
    "project-bundle",
    "providers",
    "truth-lens",
    "local-model-runtime",
    "execution-policy",
    "operation-trace"
  ],
  "relations": [
    {
      "to": "13-electron-security",
      "kind": "must-obey"
    },
    {
      "to": "03-workspace-tabs",
      "kind": "hosts"
    },
    {
      "to": "04-file-first-model",
      "kind": "persists"
    },
    {
      "to": "08-capture-source",
      "kind": "serves"
    },
    {
      "to": "14-app-kernels",
      "kind": "implements"
    },
    {
      "to": "31-truth-lens-ux",
      "kind": "hosts-minimal-ui-for"
    },
    {
      "to": "29-verification-grounding-router",
      "kind": "calls-provider-through-secure-boundary"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "hosts-local-runtime-for"
    }
  ],
  "agent": {
    "purpose": "Guide implementation of the first desktop shell without mixing trusted app UI and untrusted content.",
    "inputs": [
      "Electron main process",
      "React renderer",
      "preload bridge",
      "source webviews",
      "local project files"
    ],
    "outputs": [
      "secure desktop shell",
      "filesystem APIs",
      "IPC channels",
      "source tabs",
      "project bundle access",
      "local inference worker boundary",
      "capability probe"
    ],
    "invariants": [
      "Use Electron first for MVP.",
      "Keep main/renderer/preload roles separate.",
      "Use WebContentsView for remote web source views.",
      "Do not use BrowserView as a new foundation.",
      "Keep canonical knowledge in files, not Electron state.",
      "Provider keys never enter the renderer; cloud verification receives only policy-approved minimized context.",
      "Local model runtimes execute outside remote views and never receive ambient vault access.",
      "Cancellation and budgets are enforced in the trusted service layer."
    ]
  }
}
---

# Electron MVP architecture

## Platform decision

Atomik should start as an **Electron desktop MVP** because the early need includes:

```text
local files
project folders
Markdown editing
source tabs
browser-like web views
PDF/image viewers
phone photo upload server
AI key management
multi-pane desktop workspace
Git-friendly local diffs later
```

A browser prototype would be faster for a pure DSL playground, but the current priority is a daily-use learning workbench.

## Process model

```text
main process
  owns filesystem access
  owns native dialogs
  starts local capture server
  manages WebContentsView source tabs
  holds secure configuration and AI key access
  coordinates indexing workers later
  may call optional Git helpers later

renderer process
  runs trusted Atomik React UI
  editor, tabs, panes, AI panel, dev docs
  renders project folders and source dossiers
  never receives broad filesystem powers directly

preload bridge
  exposes narrow, typed APIs through contextBridge
  validates renderer requests before IPC

remote web content
  isolated
  no Node access
  no direct IPC
  no direct vault access
```

## Recommended MVP stack

```text
Electron
Vite
React
TypeScript
CodeMirror 6
markdown-it or unified/remark
Zustand or Jotai
Vitest
Playwright later
```

## Why not Tauri first?

Tauri remains attractive later, especially with Rust learning goals. But Electron removes friction for browser-like source tabs and keeps the first implementation in the TypeScript/React ecosystem.

## Filesystem APIs

The preload API should expose narrow operations such as:

```text
openVault()
openProject()
listProjectFiles(projectRoot)
readMarkdown(path)
writePatch(patch)
createSourceDossier(sourceInput)
readWorkspaceState()
writeWorkspaceState(state)
```

It should not expose raw filesystem or shell access to the renderer.

## Future compatibility

Keep kernels platform-independent when possible:

```text
project-core, context-core, markdown-core, graph-core, ai-core contracts should not depend on Electron.
electron-main and electron-preload are adapter layers.
git-core is optional and should degrade gracefully when Git is unavailable.
```

## Provider and Truth Lens slice

The first Electron implementation can keep the truth UI small:

```text
AI response badge row
source-backed / model-only / needs citation / web-checked / interpretive
open evidence action
verify claim action
repair patch preview
```

Cloud provider calls and API keys belong behind a narrow main-process or trusted service boundary. The renderer sends a typed operation and approved context packet; it never receives raw provider credentials.


## Local inference service boundary

Local embeddings, transcription, reranking, or autocomplete should not run inside an untrusted renderer or remote source view.

```text
renderer
  -> narrow typed request
preload
  -> validated IPC
trusted main/service layer
  -> capability probe + execution policy + budget
worker process / native sidecar / WebGPU worker when appropriate
  -> local runtime
```

Requirements:

```text
no ambient vault access for model runtimes
explicit file/excerpt inputs only
cancellation and timeout support
memory/device capability checks
model files and indexes outside canonical project knowledge
ActionTrace emitted for every run
remote source content cannot trigger a privileged local-model action directly
cloud fallback requires policy approval
```

The first implementation can use mocks and a process adapter. Do not block the editor on downloading a model. Local model installation, versioning, integrity checks, and device compatibility must remain replaceable infrastructure.
