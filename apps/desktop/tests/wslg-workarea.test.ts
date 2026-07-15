import { describe, expect, it } from 'vitest'
import {
  FALLBACK_TASKBAR_INSET,
  parseWindowsScreens,
  wslgWorkAreaFor
} from '../electron-main/wslg-workarea'

/** The owner's real two-monitor layout as the powershell query reports
 *  it (probe 2026-07-15): primary at Windows (0,0), secondary at
 *  (-1920,0), 48px taskbar on both — while WSLg presents the virtual
 *  desktop origin-normalized (secondary at Linux 0, primary at 1920). */
const OWNER_MACHINE = JSON.stringify({
  vs: [-1920, 0],
  screens: [
    [0, 0, 1920, 1080, 0, 0, 1920, 1032],
    [-1920, 0, 1920, 1080, -1920, 0, 1920, 1032]
  ]
})

describe('parseWindowsScreens', () => {
  it('parses the query output', () => {
    const parsed = parseWindowsScreens(OWNER_MACHINE)
    expect(parsed).toEqual({
      vsX: -1920,
      vsY: 0,
      screens: [
        {
          bounds: { x: 0, y: 0, width: 1920, height: 1080 },
          workArea: { x: 0, y: 0, width: 1920, height: 1032 }
        },
        {
          bounds: { x: -1920, y: 0, width: 1920, height: 1080 },
          workArea: { x: -1920, y: 0, width: 1920, height: 1032 }
        }
      ]
    })
  })

  it('parses a single-screen layout', () => {
    const parsed = parseWindowsScreens(
      JSON.stringify({ vs: [0, 0], screens: [[0, 0, 1920, 1080, 0, 0, 1920, 1032]] })
    )
    expect(parsed?.screens).toHaveLength(1)
    expect(parsed?.screens[0]?.workArea.height).toBe(1032)
  })

  it.each([
    ['not JSON', 'PS C:\\> oops'],
    ['null', 'null'],
    ['missing vs', JSON.stringify({ screens: [[0, 0, 1, 1, 0, 0, 1, 1]] })],
    ['vs wrong arity', JSON.stringify({ vs: [0], screens: [[0, 0, 1, 1, 0, 0, 1, 1]] })],
    ['vs not numbers', JSON.stringify({ vs: ['0', 0], screens: [[0, 0, 1, 1, 0, 0, 1, 1]] })],
    ['no screens', JSON.stringify({ vs: [0, 0], screens: [] })],
    ['short screen tuple', JSON.stringify({ vs: [0, 0], screens: [[0, 0, 1920, 1080]] })],
    ['non-number field', JSON.stringify({ vs: [0, 0], screens: [[0, 0, 1920, 1080, 0, 0, 1920, null]] })],
    ['zero-sized work area', JSON.stringify({ vs: [0, 0], screens: [[0, 0, 1920, 1080, 0, 0, 0, 0]] })]
  ])('rejects %s', (_name, raw) => {
    expect(parseWindowsScreens(raw)).toBeNull()
  })
})

describe('wslgWorkAreaFor', () => {
  const data = parseWindowsScreens(OWNER_MACHINE)

  it('converts the matching screen work area to Linux coordinates (primary)', () => {
    expect(wslgWorkAreaFor({ x: 1920, y: 0, width: 1920, height: 1080 }, data)).toEqual({
      x: 1920,
      y: 0,
      width: 1920,
      height: 1032
    })
  })

  it('converts the matching screen work area to Linux coordinates (secondary)', () => {
    expect(wslgWorkAreaFor({ x: 0, y: 0, width: 1920, height: 1080 }, data)).toEqual({
      x: 0,
      y: 0,
      width: 1920,
      height: 1032
    })
  })

  it('keeps horizontal insets (a vertical taskbar)', () => {
    const vertical = parseWindowsScreens(
      JSON.stringify({ vs: [0, 0], screens: [[0, 0, 1920, 1080, 64, 0, 1856, 1080]] })
    )
    expect(wslgWorkAreaFor({ x: 0, y: 0, width: 1920, height: 1080 }, vertical)).toEqual({
      x: 64,
      y: 0,
      width: 1856,
      height: 1080
    })
  })

  it('falls back to a bottom taskbar strip when no screen matches', () => {
    expect(wslgWorkAreaFor({ x: 0, y: 0, width: 2560, height: 1440 }, data)).toEqual({
      x: 0,
      y: 0,
      width: 2560,
      height: 1440 - FALLBACK_TASKBAR_INSET
    })
  })

  it('falls back when the query never answered', () => {
    expect(wslgWorkAreaFor({ x: 5, y: 7, width: 1920, height: 1080 }, null)).toEqual({
      x: 5,
      y: 7,
      width: 1920,
      height: 1080 - FALLBACK_TASKBAR_INSET
    })
  })

  it('never returns a degenerate height for a tiny display', () => {
    const area = wslgWorkAreaFor({ x: 0, y: 0, width: 320, height: 120 }, null)
    expect(area.height).toBe(100)
  })
})
