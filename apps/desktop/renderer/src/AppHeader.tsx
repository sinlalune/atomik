import { AppMenu } from './AppMenu'
import { WindowControls } from './WindowControls'

/**
 * The app header (owner request: restore a real header — "atomik" on the
 * left, the menu button, then window controls; tabs move to the row
 * below). It is the window's primary drag surface (chromeless frame):
 * the empty space between the brand and the menu drags the window, and
 * every interactive child opts out via CSS. Global, single instance —
 * the per-pane tabstrips no longer carry the window controls.
 */
export function AppHeader(): React.JSX.Element {
  return (
    <header className="app-header">
      <span className="app-brand">atomik</span>
      <span className="app-header-spacer" />
      <AppMenu />
      <WindowControls />
    </header>
  )
}
