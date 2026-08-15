import { describe, expect, it } from 'vitest'
import {
  LANE_ENV,
  LANE_PORT_ENV,
  laneUserDataDir,
  resolveLaneRuntime,
  sanitizeLaneId
} from '../electron-main/lane'

const DEFAULT_PROFILE = '/home/dev/.config/atomik-desktop'

describe('lane runtime isolation (CP-OPS-001 S01)', () => {
  it('no ATOMIK_LANE leaves every runtime resource untouched', () => {
    expect(resolveLaneRuntime({}, DEFAULT_PROFILE)).toEqual({
      laneId: null,
      userDataDir: null,
      rendererPort: null,
      capturePort: null
    })
  })

  it('a lane claims its own Electron profile beside the default', () => {
    const lane = resolveLaneRuntime({ [LANE_ENV]: 'retrieval' }, DEFAULT_PROFILE)
    expect(lane.laneId).toBe('retrieval')
    expect(lane.userDataDir).toBe(`${DEFAULT_PROFILE}-lane-retrieval`)
    // Two lanes must never resolve to the same profile — that is the
    // whole defect this step closes (shared cookie jar, shared caches).
    const other = resolveLaneRuntime({ [LANE_ENV]: 'providers' }, DEFAULT_PROFILE)
    expect(other.userDataDir).not.toBe(lane.userDataDir)
  })

  it('a lane takes an ephemeral capture port, an explicit override wins', () => {
    expect(resolveLaneRuntime({ [LANE_ENV]: 'a' }, DEFAULT_PROFILE).capturePort).toBe(0)
    expect(
      resolveLaneRuntime(
        { [LANE_ENV]: 'a', ATOMIK_CAPTURE_PORT: '41500' },
        DEFAULT_PROFILE
      ).capturePort
    ).toBe(41500)
  })

  it('pins the renderer dev port only when the port is usable', () => {
    const pinned = resolveLaneRuntime(
      { [LANE_ENV]: 'a', [LANE_PORT_ENV]: '5180' },
      DEFAULT_PROFILE
    )
    expect(pinned.rendererPort).toBe(5180)
    for (const bad of ['0', '80', '70000', 'abc', '']) {
      expect(
        resolveLaneRuntime({ [LANE_ENV]: 'a', [LANE_PORT_ENV]: bad }, DEFAULT_PROFILE)
          .rendererPort
      ).toBeNull()
    }
  })

  it('lane ids are directory-safe; garbage reads as "not a lane"', () => {
    expect(sanitizeLaneId('  Retrieval  ')).toBe('retrieval')
    expect(sanitizeLaneId('lane-b')).toBe('lane-b')
    for (const bad of ['', '-a', 'a-', '../escape', 'a b', 'a/b', 'x'.repeat(25), 42, null]) {
      expect(sanitizeLaneId(bad)).toBeNull()
    }
    // A mistyped variable must never stop the app from starting.
    expect(resolveLaneRuntime({ [LANE_ENV]: '../escape' }, DEFAULT_PROFILE).userDataDir).toBeNull()
  })

  it('builds the profile path without touching the default directory', () => {
    expect(laneUserDataDir(DEFAULT_PROFILE, 'b')).toBe(`${DEFAULT_PROFILE}-lane-b`)
    expect(laneUserDataDir(DEFAULT_PROFILE, 'b').startsWith(DEFAULT_PROFILE)).toBe(true)
    expect(laneUserDataDir(DEFAULT_PROFILE, 'b')).not.toBe(DEFAULT_PROFILE)
  })
})
