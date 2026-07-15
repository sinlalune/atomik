---
type: Atomik Brief
title: WSLg window maximize — persistent offset (still unsolved)
timestamp: 2026-07-14T16:00:00Z
status: resolved 2026-07-15 — fix shipped and probe-verified; owner visual confirmation pending
tags: [electron, window, wslg, maximize, chromeless, dev-env]
base_commit: fa6fdf5
---

# Brief: the maximize window offset won't die

## One-line problem

On the owner's **WSL2 + WSLg** dev machine, maximizing the Atomik
window leaves a **visible offset** — the rendered content and/or the
click targets are shifted from where they should be. Multiple fixes
across 2026-07-14 have each traded one symptom for another; the offset
is still present after the latest (`fa6fdf5`). This is a
**dev-environment annoyance**, not a shipped-product bug (real
Windows/macOS/Linux maximize natively; the app just gets dogfooded on
WSLg).

## The window architecture (why this is hard)

The window is **chromeless / borderless** (`frame: false`, in
`apps/desktop/electron-main/security.ts` → `buildMainWindowOptions`)
because the owner wants a **custom app header** ("atomik" brand + ☰
menu + custom min/max/close), not a native title bar. Custom header ⇒
`frame:false` ⇒ WE own the window chrome ⇒ we hit
**microsoft/wslg#1015**: WSLg mis-handles maximize for borderless
windows (transparent gap + offset clicks; open upstream since 2023,
reproduces with plain Chrome).

Relevant code, all in `apps/desktop/electron-main/index.ts`:
- `isWindowMaximized(window)` → currently `window.isMaximized()`
- `toggleMaximize(window)` → currently plain `window.maximize()` /
  `unmaximize()`
- `window.on('maximize'|'unmaximize', sendWindowState)` pushes the
  boolean to the renderer (`atomik:window-state-changed`).
- Linux switch: `app.commandLine.appendSwitch('ozone-platform-hint',
  'auto')` (native Wayland under WSLg — kept).
- `frame: false`, no `hasShadow` set (Chromium default = shadow ON).

Renderer side:
- `WindowControls.tsx` renders min/max/close, mirrors the pushed
  boolean onto `<body data-maximized>`.
- CSS `body[data-maximized] .app-header { -webkit-app-region: no-drag }`
  drops the drag region while maximized (dragging a maximized
  borderless window glitches).
- `AppHeader.tsx` is the drag surface (`-webkit-app-region: drag`).

## What has been tried (chronological, this session)

The old baseline (pre-session) mapped **maximize → fullscreen** under
WSLg (`FULLSCREEN_IS_MAXIMIZE`). It avoided the offset but **hid the
Windows taskbar** and read like F11 — the owner called it a "crutch"
and asked to remove it.

1. **`fa...` earlier — native maximize + `setHasShadow` toggle**
   (`setHasShadow(false)` on the `maximize` event, `true` on
   `unmaximize`). Theory: the offset is the client-side shadow margins.
   → Owner: **offset PERSISTED**. So the offset is NOT (only) the
   shadow.

2. **`0070b6a` — manual `setBounds(screen.workArea)`** (don't use the
   WM maximize at all; position the window ourselves over the display
   work area, WeakMap holds restore bounds). Probe: `setBounds(area)`
   lands *exactly* (getBounds == area, no coordinate offset).
   → Owner: **"laggy + hides the taskbar"**. Two new problems.

3. **`fa6fdf5` (CURRENT) — plain native `window.maximize()`**, no
   shadow toggle, no manual bounds. Rationale below.
   → Owner: **"le problème est toujours présent"** (offset still
   there).

## The decisive probe (this is the key fact)

Ran a headless Electron probe on the owner's WSLg machine with a
`frame:false` window:

```
screen.getDisplayMatching(bounds).workArea → {x:0,y:0,w:1920,h:1080}   ← WRONG (full screen)
window.maximize() → getBounds()            → {x:0,y:0,w:1920,h:1032}   ← height 1032!
```

Interpretation:
- `screen.workArea` under WSLg **lies** — it reports the full 1080,
  ignoring the taskbar. That's why `setBounds(workArea)` covered the
  taskbar in attempt #2.
- **`window.maximize()` DOES reserve the taskbar** (1080 − 1032 = 48px,
  the Windows taskbar) because the WM proxies to Windows, which knows
  it. So for the taskbar, native maximize is correct — hence #3.
- A **restored** borderless window sits at `x:4` (getBounds), i.e. the
  shadow adds a ~4px margin. Maximized snaps to `x:0`. This shadow
  margin is a candidate offset source but toggling it (#1) didn't fix
  and may have made it worse.

**BUT** the coordinate-level bounds being correct (`1032`, `x:0`) does
**not** mean the visible/clickable content is aligned — the owner still
sees the offset. `capturePage` (headless screenshot) does **not**
render the native window frame/compositing, so I **cannot verify the
visual offset from here** — only the owner's eyes can. Every "fixed"
claim this session was bounds-level, never pixel-level confirmed.

## Where it stands now (`fa6fdf5`)

Plain native maximize. Taskbar is respected (per probe). Lag should be
gone (no `setBounds`). **The offset is still visible to the owner.**

## Concrete next steps for the fresh session

Do NOT re-run the same three attempts. Start by pinning down **what
"décalage/offset" actually is** — ask the owner (or have them
screenshot the *whole Windows desktop*, not `capturePage`):
- Is the **content** shifted inside the window (a transparent band on
  one edge)?
- Or are the **clicks** offset from what's drawn (click lands wrong)?
- Which edge, roughly how many px?
- Does it happen only via the custom maximize button, or also via
  Windows snap (Win+↑) / double-click title area?

Then the real options, in rough order of "keeps the custom header":

1. **Diagnose the shadow margin precisely.** Restored window is at
   `x:4`. Try constructing the window with `hasShadow: false` FROM THE
   START (not toggled) and re-probe restored vs maximized getBounds +
   have the owner eyeball it. History note: an earlier era found
   `hasShadow:false` made *restored* windows unresizable (the resize
   handles live in the shadow margin) — so if this fixes maximize but
   breaks restore-resize, that's the known trade-off to weigh.

2. **`setBounds` to a taskbar-corrected rectangle.** We know
   `window.maximize()` yields the right height (1032). So: read the
   maximized bounds once (or hardcode a taskbar inset derived from
   `size.height − maximized.height`), then on maximize do a manual
   `setBounds` to `{x:0, y:0, w:size.w, h:size.h − taskbarInset}` —
   combines attempt #2's exactness with attempt #3's taskbar
   awareness. Watch the lag (attempt #2 was laggy; maybe the lag was
   the `setHasShadow` call or the WebContentsView relayout, not
   `setBounds` itself — worth isolating).

3. **Native frame (`frame: true`).** The nuclear option: let Windows
   draw the title bar → maximize/restore/offset/taskbar all just work,
   zero WSLg fighting. COST: the custom "atomik + ☰ menu" header the
   owner just asked for would sit *below* a native title bar (two
   bars), OR the header's window-control buttons become redundant.
   The owner explicitly moved toward a custom header, so this needs
   their explicit sign-off. Could be offered as "native frame on
   Linux/WSLg only, custom frame elsewhere" — but that's inconsistent
   chrome across platforms.

4. **Accept it + document.** If the offset is small and WSLg-only,
   the honest move may be to stop spending on a dev-env quirk that
   won't affect shipped builds — document it in the dev-env note and
   move on. The owner should decide; they've spent real time on it.

## Ground rules for whoever picks this up

- **You cannot verify the fix headlessly.** `capturePage` won't show
  the native-frame offset. Every attempt must end with the owner
  eyeballing the real maximized window and reporting precisely.
- The active coding path is **CP-MVP-006 (M5 web source tab)** — this
  window work is a side micro-unit, not a path step. Keep it out of the
  path ledger; log it in `log.md` and the module note
  (`docs/modules/atomik-desktop.md`, the WSLg dev-env section already
  has the full maximize history).
- Gates: `npm test` (307/34), `npm run typecheck`, `npm run build`,
  `npm run smoke` — all green at `fa6fdf5`.
- The full attempt history is in the module note's "WSLg maximized
  gap/offset" paragraph and `atomik-project/log.md` (three 2026-07-14
  window entries). Read those before touching code.

## Files

- `apps/desktop/electron-main/index.ts` — `isWindowMaximized`,
  `toggleMaximize`, the `createMainWindow` maximize listeners, the
  Linux `ozone-platform-hint` switch.
- `apps/desktop/electron-main/security.ts` — `buildMainWindowOptions`
  (`frame:false`, no `hasShadow`).
- `apps/desktop/renderer/src/WindowControls.tsx`,
  `apps/desktop/renderer/src/AppHeader.tsx`, and the `.app-header` /
  `body[data-maximized]` CSS in `renderer/src/styles.css`.

## RESOLUTION (2026-07-15, fresh session)

The "cannot verify headlessly" wall fell: from WSL, `powershell.exe`
can screenshot the REAL composited Windows desktop, read the RAIL host
window rect, and inject clicks — a probe window with colored edge
bands turned the offset into numbers. What "décalage" actually was,
measured on both monitors: a WM-maximized borderless window keeps
CORRECT logical bounds but its content PRESENTS +32px right/down with
input unshifted — everything visible clicks 32px away; transparent
band left/top, content clipped right/bottom. Restored windows are
pixel-exact; a manual setBounds to the true work area is pixel- and
click-perfect with the shadow ON, in 0-1 ms (the "lag" was the
setHasShadow toggle). `screen.workArea` lies on BOTH monitors, and the
naive snap conversion loses the race against the WM's async restore
(ends 4px inset — why attempt #2's pattern was also subtly wrong).

Fix shipped (option 2 of this brief, corrected): under `IS_WSLG` never
enter the WM-maximized state — maximize = setBounds to the Windows
work area (powershell-queried per monitor, pure parse/matching in
`wslg-workarea.ts`, unit-tested, 48px fallback), restore = debounced
stable bounds, snap converts after 'unmaximize' settles + guarded
re-assert. Platform reality: the app runs XWayland (auto → x11; forced
wayland crashes, no DRM node) — the note's "native Wayland" claim was
stale. End-to-end verified by clicking the app's own □ Windows-side:
content = work area exactly, taskbar visible, exact restore
round-trip, ☰ opens where drawn. Full record: module note WSLg
section + log.md 2026-07-15. Owner's eyes are the last gate.
