---
type: Atomik Session Record
title: CP-MVP-007 S07f — Caps Lock/Ctrl probe: WSLg RDP lock-state defect, measured on the machine (not an app bug)
timestamp: 2026-07-20T00:00:00Z
---

# WSLg caps-lock probe — 2026-07-20

Owner report (bench, S07f): "maj lock doesn't register in the app, it
seems that ctrl+<key> actions neither, like copy/paste". Probed on the
live machine with an ISOLATED app instance (scratch vault/state/XDG —
the owner's running instance untouched), Windows-side input injection
(powershell interop, the wslg#1015 probe method), and X-server state
reads via libX11 ctypes. Electron 43 / Chromium ozone **x11**
(XWayland — confirmed from child process args), WSLg 1.0.71, layout
fr (0x40c) correctly negotiated per weston.log.

## Measurements

1. **Lock-state bridge, Windows→X, app unfocused**: toggling Windows
   caps via `keybd_event` while a Windows app held focus: **ON
   propagated** to the X indicator (0x2→0x3), **OFF did not** — X
   stayed CAPS=ON across 3 s and a second full ON/OFF cycle. One-way.
2. **In-app typing (full RDP path, injected into the focused isolated
   instance)**: typed `abc` (Win caps OFF) → arrived **`ABC`**; caps
   ON + `def` → arrived **`def`**. The base lock state the app sees
   was INVERTED at focus-in; the caps keypress itself crossed and
   toggled correctly relative to that wrong base. This is the owner's
   symptom: not a dead key — an inverted/stale base state imposed by
   the focus-in RDP sync.
3. **Ctrl chords, same injected session**: `Ctrl+A`, `Ctrl+C`, `End`,
   `Ctrl+V` ALL WORKED (buffer duplicated on disk; no leaked
   letters). Ctrl is NOT reproducibly broken in a fresh instance —
   the owner's copy/paste symptom likely rides the same
   focus-sync state fight (sync storms, wslg#894 focus flicker) or
   was clipboard-channel flakiness (wslg#15 class), not dead keys.
4. **The fight escalates**: after repeated Windows-side toggles,
   X-side caps got STUCK ON — even X-side XTEST `Caps_Lock` toggles
   were re-overridden (first XTEST realign worked; later ones lost to
   the sync). End state at probe close: **Windows caps OFF, X caps
   ON** — mismatched until Weston resets.

## Root cause (layer: WSLg, not the app)

`libweston/backend-rdp/rdp.c` (microsoft/weston-mirror, `working`):
`xf_input_keyboard_event` forwards CapsLock as a normal key toggle
AND `xf_input_synchronize_event` force-sets locked modifiers to the
RDP client's cached state on every sync (focus churn ⇒ sync storms,
wslg#894/#443). Two writers, one bit, client cache wins, and the
code's own TODO admits lock sync is one-way. Related: FreeRDP#8946
(caps inversion over RDP), electron#48402 / mutter#4351 (the
key-event-less locked-mod update class Chromium chokes on).

## What this means

- **No app fix**: rejected an in-app compensation (guessing true caps
  state from outside X is a race with the same sync). The app is a
  victim; docs record the defect like wslg#1015 (maximize) — except
  this one has no deterministic app-side workaround.
- **Owner recovery**: `wsl --shutdown` (from Windows, after saving —
  it kills the dev server and every WSL session) fully resets
  Weston's lock state. Short-term: pressing CapsLock while Atomik is
  focused toggles the app-visible state correctly RELATIVE to the
  wrong base — one press realigns typing case; if it flips back on
  alt-tab, the sync re-imposed the stale cache (shutdown is the real
  reset).
- **Machine state at probe close**: caps parity left MISMATCHED
  (Win OFF / X ON) — typing in any WSLg window inverts case until
  the reset. Flagged to the owner in the session summary.
- **Open**: the Ctrl/copy-paste half is unreproduced in a fresh
  instance; if it recurs in the owner's long-running session, capture
  whether Ctrl+A works while Ctrl+C/V fail (clipboard channel) or
  letters leak (modifier loss) — the two have different upstreams.
