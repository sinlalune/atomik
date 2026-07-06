---
{
  "id": "13-electron-security",
  "title": "Electron security contract",
  "status": "foundational",
  "tags": [
    "electron",
    "security",
    "ipc",
    "sources",
    "provider-privacy",
    "grounding",
    "local-runtime",
    "operation-trace",
    "telemetry-privacy"
  ],
  "relations": [
    {
      "to": "12-electron-mvp",
      "kind": "constrains"
    },
    {
      "to": "09-web-source-tab",
      "kind": "protects"
    },
    {
      "to": "08-capture-source",
      "kind": "protects"
    },
    {
      "to": "23-references",
      "kind": "cites"
    },
    {
      "to": "29-verification-grounding-router",
      "kind": "protects-cloud-context-for"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "secures-runtime-and-trace-boundaries-for"
    }
  ],
  "agent": {
    "purpose": "Prevent dangerous Electron shortcuts during MVP implementation.",
    "inputs": [
      "webPreferences",
      "preload API",
      "IPC channel",
      "remote source view",
      "local file operation",
      "local inference worker/sidecar",
      "execution policy",
      "ActionTrace sink"
    ],
    "outputs": [
      "security checklist",
      "safe bridge",
      "permission policy",
      "local runtime isolation policy",
      "content-minimized telemetry policy"
    ],
    "invariants": [
      "No Node integration for remote content.",
      "Context isolation stays enabled.",
      "Do not disable webSecurity.",
      "Expose minimal APIs through contextBridge, not raw ipcRenderer.",
      "All upload endpoints use expiring tokens.",
      "Remote source content never gets direct access to project files or source dossiers.",
      "API keys and provider billing credentials never enter remote views or the renderer.",
      "Cloud context is minimized, user-policy checked, and auditable.",
      "Local model workers and sidecars receive only typed bounded jobs and never arbitrary renderer privileges.",
      "Raw prompts, note bodies, transcripts, retrieved excerpts, and outputs are absent from telemetry by default.",
      "Local-only mode, budgets, cancellation, and external approval are enforced below renderer state."
    ]
  }
}
---

# Electron security contract

## Core rule

```text
trusted Atomik UI is not the same as untrusted source content.
```

Official Electron guidance warns against loading remote code with Node.js integration enabled. Remote content should be displayed through isolated mechanisms such as WebContentsView or webview with Node integration disabled and context isolation enabled.

## Required settings for remote content

```ts
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true
}
```

## Forbidden shortcuts

```ts
nodeIntegration: true        // forbidden for remote content
contextIsolation: false      // forbidden
webSecurity: false           // forbidden
allowRunningInsecureContent  // forbidden
exposing ipcRenderer directly // forbidden
```

## IPC rule

IPC channels must be explicit and narrow:

```ts
// good: specific API
window.atomik.openVault()
window.atomik.openProject()
window.atomik.readNote(path)
window.atomik.proposePatch(patch)
window.atomik.createSourceDossier(input)

// bad: generic bridge
window.electron.ipcRenderer.send(channel, ...args)
```

## Source security rule

```text
raw web content = untrusted
local source.md dossier = trusted local file after user import/review
reader extraction = local derived file, still preserve provenance
```

The live web view must not be able to mutate `source.md`, notes, context packs, or project files directly.

## Capture upload security

Phone upload sessions require:

```text
random session id
one-time token
short expiration
size limit
image allowlist
temporary inbox
explicit desktop confirmation
```

## Security documentation rule

Every new IPC channel, preload API, WebContentsView, local server endpoint, permission handler, source adapter, or Git helper must be documented with its trust boundary and tests.

## Cloud verification security and privacy

```text
renderer
  sends typed AI/verification request and approved context references

trusted main/service layer
  resolves minimized excerpts
  applies redaction/privacy policy
  attaches provider credentials
  emits parent/child ActionTrace records with content capture disabled by default
  returns structured response without exposing keys
```

Security rules:

```text
never expose Gemini/provider keys through preload
never let remote web content trigger arbitrary provider calls
never send the whole vault when one claim/excerpt is sufficient
never place secrets in prompts, logs, patches, or source dossiers
make local-only/private mode enforceable below the UI
record content-minimized path IDs/counts and external byte totals for what left the device; do not duplicate excerpts into logs
```

Provider data-use, retention, region, and display terms are not merely legal-page concerns; they influence context minimization, UI separation, logging, and feature flags. Re-check the provider policy snapshot before production releases.


## Local inference worker and model security

Local does not mean trusted by default. Model runtimes, native libraries, downloaded weights, and sidecars are operational dependencies with their own attack surface.

```text
renderer
  -> typed request only
trusted main/service layer
  -> validates path scope, policy, budget, model allowlist, and cancellation
isolated worker/sidecar
  -> receives bounded excerpts or media handles
  -> cannot browse the vault or invoke arbitrary IPC
  -> returns typed result + usage/performance counters
trace sink
  -> records identifiers/counts/timing/outcome; contentRecorded=false by default
```

Requirements:

```text
verify downloaded model/runtime integrity when a trusted checksum/signature is available
record model/runtime revision and license metadata
store weights and caches outside canonical project files
apply size, time, memory, concurrency, and output limits
terminate cancelled or runaway workers
never let model output choose arbitrary filesystem paths or IPC channels
require explicit policy before any local failure falls back to cloud
```
