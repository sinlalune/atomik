import { AppHeader } from './AppHeader'
import { Workspace } from './workspace/Workspace'

/**
 * The shell: a global header row (brand · menu · window controls) over
 * the workspace pane tree (owner request — restore the header; tabs sit
 * on the row below, per pane). The header is the chromeless window's
 * drag surface; the window controls live there once, not per pane.
 */
export function App(): React.JSX.Element {
  return (
    <div className="app">
      <AppHeader />
      <Workspace />
    </div>
  )
}
