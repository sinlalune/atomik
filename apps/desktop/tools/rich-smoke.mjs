/**
 * CP-RICH-MARKDOWN S07 — the real-Electron renderer probe.
 *
 * The unit suite runs on linkedom: no CSS engine, no Content Security Policy.
 * That is why S01–S06 shipped with Mermaid and Vega-Lite dead in the app and
 * every gate green — see ADR-014 §8. This seeds a vault and a workspace state,
 * launches the REAL app, and lets the main process assert that each renderer
 * actually rendered in a browser under this app's policies.
 *
 *   npm --workspace atomik-desktop run smoke:rich
 *
 * Exit code is the verdict. No test hook exists in the renderer: the fixture
 * is restored through the app's own workspace-restore path.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = fileURLToPath(new URL('..', import.meta.url))

// Good blocks come FIRST: the probes below are expected to be refused, and the
// probe asserts on the first block of each kind.
const NOTE = `# Rich renderer smoke

Inline math $E = mc^2$ and a display block:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}
$$

\`\`\`mermaid
flowchart LR
    A[Source] --> B[Projection]
\`\`\`

\`\`\`vega-lite
{
  "data": {"values": [{"a": "x", "b": 3}, {"a": "y", "b": 5}]},
  "mark": "bar",
  "encoding": {
    "x": {"field": "a", "type": "nominal"},
    "y": {"field": "b", "type": "quantitative"}
  }
}
\`\`\`

\`\`\`typescript
export function greet(name: string): string {
  return \`Hello, \${name}\`
}
\`\`\`

## Probes — every one of these must be refused

\`\`\`mermaid
flowchart LR
    X["<img src=x onerror='window.__atomikProbeFired = 1'>"] --> Y[Safe]
\`\`\`

\`\`\`vega-lite
{
  "data": {"url": "https://example.invalid/cars.json"},
  "mark": "point"
}
\`\`\`

\`\`\`html
<img src=x onerror="window.__atomikProbeFired = 1">
<script>window.__atomikProbeFired = 1</script>
\`\`\`
`

const vaultDir = mkdtempSync(join(tmpdir(), 'atomik-rich-vault-'))
const stateDir = mkdtempSync(join(tmpdir(), 'atomik-rich-state-'))
writeFileSync(join(vaultDir, 'smoke-rich.md'), NOTE)

const paneId = 'rich-smoke-pane'
const tabId = 'rich-smoke-tab'
writeFileSync(
  join(stateDir, 'local-workspace.json'),
  JSON.stringify({
    version: 1,
    root: {
      kind: 'leaf',
      id: paneId,
      tabs: [
        {
          id: tabId,
          view: 'vault',
          params: { notePath: 'smoke-rich.md', mode: 'read' }
        }
      ],
      activeTabId: tabId,
      tree: { kind: 'vault' }
    },
    focusedPaneId: paneId,
    settings: { theme: 'dark' }
  })
)

const child = spawn(
  join(appDir, '..', '..', 'node_modules', 'electron', 'dist', 'electron'),
  ['.'],
  {
    cwd: appDir,
    env: {
      ...process.env,
      ATOMIK_SMOKE: '1',
      ATOMIK_SMOKE_RICH: '1',
      ATOMIK_VAULT_DIR: vaultDir,
      ATOMIK_STATE_DIR: stateDir,
      ATOMIK_LANE: 'rich-smoke'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  }
)

let out = ''
child.stdout.on('data', (chunk) => {
  out += chunk
  process.stdout.write(chunk)
})
child.stderr.on('data', (chunk) => {
  out += chunk
  process.stderr.write(chunk)
})

const timer = setTimeout(() => {
  console.error('ATOMIK_SMOKE_RICH_FAIL timeout — the app never reported')
  child.kill('SIGKILL')
  process.exit(1)
}, 90_000)

child.on('exit', (code) => {
  clearTimeout(timer)
  if (out.includes('ATOMIK_SMOKE_RICH_OK')) {
    console.log('rich smoke PASS — every renderer produced output in a browser')
    process.exit(0)
  }
  console.error(`rich smoke FAIL (electron exit ${code})`)
  process.exit(1)
})
