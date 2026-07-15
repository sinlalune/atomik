import type { Rectangle } from 'electron'

/**
 * WSLg work-area truth (microsoft/wslg#1015; Windows-side probe
 * 2026-07-15): under WSLg, Electron's `screen.workArea` reports the
 * FULL monitor (1080 on a 1080 screen — it never learns the Windows
 * taskbar), while the WM maximize knows the taskbar but PRESENTS a
 * borderless window's content shifted by the client-side shadow margin
 * (+32px right/down on the owner's machine) with input left unshifted —
 * everything visible sits 32px away from where it clicks. The app
 * therefore never enters the WM-maximized state under WSLg and
 * positions the window itself, which needs the TRUE per-monitor work
 * area. Windows knows it; a one-shot `powershell.exe` query (dev-env
 * interop, same pattern as the explorer.exe open path) reports every
 * screen's bounds + work area in WINDOWS coordinates.
 *
 * Coordinate mapping (probe-verified on a two-monitor layout): WSLg
 * mirrors the whole Windows virtual desktop and normalizes its origin
 * to 0 — LinuxPoint = WindowsPoint − virtualScreenOrigin. So a Windows
 * screen matches the Electron display whose bounds equal
 * (screen bounds − vs origin), and its work area converts the same way.
 */

export interface WindowsScreen {
  bounds: Rectangle
  workArea: Rectangle
}

export interface WindowsScreens {
  vsX: number
  vsY: number
  screens: WindowsScreen[]
}

/** Windows 11 default taskbar height — the fallback bottom inset when
 *  the Windows-side query is unavailable (interop off, query pending,
 *  layout changed mid-flight). */
export const FALLBACK_TASKBAR_INSET = 48

/** The query run through powershell.exe (one execFile argument — no
 *  shell quoting involved). Emits one compact JSON object:
 *  {"vs":[vsX,vsY],"screens":[[bX,bY,bW,bH,wX,wY,wW,wH],…]}. */
export const WINDOWS_SCREENS_PS_COMMAND =
  'Add-Type -AssemblyName System.Windows.Forms; ' +
  '$vs=[System.Windows.Forms.SystemInformation]::VirtualScreen; ' +
  '$s=[System.Windows.Forms.Screen]::AllScreens | ForEach-Object { ' +
  ',@($_.Bounds.X,$_.Bounds.Y,$_.Bounds.Width,$_.Bounds.Height,' +
  '$_.WorkingArea.X,$_.WorkingArea.Y,$_.WorkingArea.Width,$_.WorkingArea.Height) }; ' +
  'ConvertTo-Json -Compress -Depth 3 @{ vs = @($vs.X,$vs.Y); screens = @($s) }'

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Strict parse of the query output; null on any surprise — a truncated
 *  or malformed string must never become a garbage rectangle. */
export function parseWindowsScreens(raw: string): WindowsScreens | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const vs = (data as Record<string, unknown>)['vs']
  const screens = (data as Record<string, unknown>)['screens']
  if (!Array.isArray(vs) || vs.length !== 2 || !vs.every(isFiniteNumber)) return null
  if (!Array.isArray(screens) || screens.length === 0) return null
  const parsed: WindowsScreen[] = []
  for (const entry of screens) {
    if (!Array.isArray(entry) || entry.length !== 8 || !entry.every(isFiniteNumber)) {
      return null
    }
    const [bx, by, bw, bh, wx, wy, ww, wh] = entry as number[]
    if (bw <= 0 || bh <= 0 || ww <= 0 || wh <= 0) return null
    parsed.push({
      bounds: { x: bx, y: by, width: bw, height: bh },
      workArea: { x: wx, y: wy, width: ww, height: wh }
    })
  }
  return { vsX: vs[0] as number, vsY: vs[1] as number, screens: parsed }
}

/**
 * The rectangle a WSLg maximize should fill for the display with these
 * LINUX-side bounds: the matching Windows screen's work area converted
 * to Linux coordinates; without a match, the display minus a bottom
 * taskbar strip (never a negative height).
 */
export function wslgWorkAreaFor(
  displayBounds: Rectangle,
  data: WindowsScreens | null
): Rectangle {
  if (data) {
    for (const s of data.screens) {
      if (
        s.bounds.x - data.vsX === displayBounds.x &&
        s.bounds.y - data.vsY === displayBounds.y &&
        s.bounds.width === displayBounds.width &&
        s.bounds.height === displayBounds.height
      ) {
        return {
          x: s.workArea.x - data.vsX,
          y: s.workArea.y - data.vsY,
          width: s.workArea.width,
          height: s.workArea.height
        }
      }
    }
  }
  return {
    x: displayBounds.x,
    y: displayBounds.y,
    width: displayBounds.width,
    height: Math.max(100, displayBounds.height - FALLBACK_TASKBAR_INSET)
  }
}
