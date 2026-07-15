import { useEffect } from 'react'
import { AppHeader } from './AppHeader'
import { Workspace } from './workspace/Workspace'
import { clearImageCache } from './vault/image-cache'

/**
 * The shell: a global header row (brand · menu · window controls) over
 * the workspace pane tree (owner request — restore the header; tabs sit
 * on the row below, per pane). The header is the chromeless window's
 * drag surface; the window controls live there once, not per pane.
 */
export function App(): React.JSX.Element {
  // Vault switch: the shared image cache keys by vault-relative path —
  // the same path in the NEW vault is a different file (serving the old
  // vault's bytes was a real bug, perf audit 2026-07-15). One global
  // subscription here; the always-mounted shell outlives every view.
  useEffect(() => window.atomik.onVaultChanged(() => clearImageCache()), [])
  return (
    <div className="app">
      <AppHeader />
      <Workspace />
    </div>
  )
}
