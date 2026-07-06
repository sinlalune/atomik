import { describe, expect, it } from 'vitest'
import { buildAppInfo } from '../electron-main/app-info'

describe('buildAppInfo', () => {
  it('maps identity fields one to one', () => {
    const info = buildAppInfo({
      name: 'atomik-desktop',
      version: '0.1.0',
      versions: { electron: '99.0.0', chrome: '150.0.0.0', node: '24.0.0' },
      platform: 'linux'
    })
    expect(info).toEqual({
      name: 'atomik-desktop',
      version: '0.1.0',
      electron: '99.0.0',
      chrome: '150.0.0.0',
      node: '24.0.0',
      platform: 'linux'
    })
  })

  it('degrades missing runtime versions to "unknown" instead of throwing', () => {
    const info = buildAppInfo({
      name: 'atomik-desktop',
      version: '0.1.0',
      versions: {},
      platform: 'linux'
    })
    expect(info.electron).toBe('unknown')
    expect(info.chrome).toBe('unknown')
    expect(info.node).toBe('unknown')
  })
})
