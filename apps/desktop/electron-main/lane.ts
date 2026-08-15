/**
 * LANE RUNTIME ISOLATION (CP-OPS-001 S01).
 *
 * Concurrent execution lanes (one integration parent, N accepted lanes,
 * one gate) need two agents to run the dev app AT THE SAME TIME from
 * different worktrees. Most of the app's own state is already safe:
 * `resolveStateDir` puts `.atomik/` beside the checkout, so a worktree
 * gets its own workspace layout, AI settings, graph index and traces for
 * free (workspace-state.ts).
 *
 * What is NOT safe is everything Electron/Chromium keeps in `userData`:
 * cookies, localStorage, the network and GPU caches, and the web-source
 * partition. Two instances sharing one profile directory corrupt each
 * other's caches and share the web tab's cookie jar — a real defect, not
 * a nuisance. `userData` is keyed on the package name (`atomik-desktop`),
 * so every worktree resolves to the SAME directory by default.
 *
 * One environment variable fixes it: `ATOMIK_LANE=<slug>` gives the lane
 * its own profile, its own renderer dev port, and an ephemeral capture
 * port. Unset (the owner's dogfooding instance, tests, smoke, CI) means
 * unchanged behaviour to the byte.
 *
 * Pure and env-injected: the resolver takes an env record and the default
 * profile directory, so it is unit-testable without Electron.
 */

/** `ATOMIK_LANE=<slug>` — the lane's short identity. */
export const LANE_ENV = 'ATOMIK_LANE'
/** `ATOMIK_LANE_PORT=<port>` — the lane's renderer dev-server port. */
export const LANE_PORT_ENV = 'ATOMIK_LANE_PORT'

const MAX_LANE_ID = 24
const MIN_PORT = 1024
const MAX_PORT = 65535

export interface LaneRuntime {
  /** Sanitized lane id, or null when this process is not a lane. */
  laneId: string | null
  /** Profile directory to claim, or null to leave Electron's default. */
  userDataDir: string | null
  /** Renderer dev-server port, or null for the tool's default. */
  rendererPort: number | null
  /**
   * Capture-server port, or null to leave the stable default (41414).
   * A lane takes 0 (ephemeral) so two instances never race for the
   * firewall-friendly port; the capture manager already falls back on
   * EADDRINUSE, but a lane should not depend on losing a race first.
   */
  capturePort: number | null
}

/**
 * Lane ids become directory names, so they are strict: lowercase
 * alphanumerics and dashes, no leading or trailing dash, capped. Garbage
 * reads as "not a lane" rather than throwing — a mistyped variable must
 * never stop the app from starting.
 */
export function sanitizeLaneId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const id = raw.trim().toLowerCase()
  if (id.length === 0 || id.length > MAX_LANE_ID) return null
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(id)) return null
  return id
}

function parsePort(raw: unknown): number | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null
  const port = Number(raw)
  if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) return null
  return port
}

/** `<default>-lane-<id>` — a sibling of the default profile, so the lane's
 *  Chromium state is visible and disposable next to the real one. */
export function laneUserDataDir(defaultDir: string, laneId: string): string {
  return `${defaultDir}-lane-${laneId}`
}

export function resolveLaneRuntime(
  env: Record<string, string | undefined>,
  defaultUserDataDir: string
): LaneRuntime {
  const laneId = sanitizeLaneId(env[LANE_ENV])
  if (!laneId) {
    return { laneId: null, userDataDir: null, rendererPort: null, capturePort: null }
  }
  // An explicit ATOMIK_CAPTURE_PORT still wins: a lane benching the phone
  // capture flow needs its one firewall rule as much as the main tree.
  const explicitCapture = parsePort(env['ATOMIK_CAPTURE_PORT'])
  return {
    laneId,
    userDataDir: laneUserDataDir(defaultUserDataDir, laneId),
    rendererPort: parsePort(env[LANE_PORT_ENV]),
    capturePort: explicitCapture ?? 0
  }
}
