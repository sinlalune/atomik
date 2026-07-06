import { useCallback, useEffect, useState } from 'react'
import {
  WindowCloseIcon,
  WindowMaximizeIcon,
  WindowMinimizeIcon,
  WindowRestoreIcon
} from './icons'

/**
 * Min / max-restore / close for the chromeless window (owner feedback on
 * MVP-001: the tabstrip IS the top row). Rendered inside the top-right
 * pane's tabstrip; the maximize icon follows the state each verb returns.
 * Known limit: maximizing through an OS shortcut is not observed live —
 * the icon refreshes on the next control click.
 */
export function WindowControls(): React.JSX.Element {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    window.atomik
      .windowControl('get-state')
      .then((state) => setMaximized(state.maximized), () => undefined)
  }, [])

  const run = useCallback((action: 'minimize' | 'toggle-maximize' | 'close') => {
    window.atomik
      .windowControl(action)
      .then((state) => setMaximized(state.maximized), () => undefined)
  }, [])

  return (
    <span className="window-controls">
      <button
        type="button"
        title="Minimize"
        aria-label="Minimize window"
        onClick={() => run('minimize')}
      >
        <WindowMinimizeIcon />
      </button>
      <button
        type="button"
        title={maximized ? 'Restore' : 'Maximize'}
        aria-label={maximized ? 'Restore window' : 'Maximize window'}
        onClick={() => run('toggle-maximize')}
      >
        {maximized ? <WindowRestoreIcon /> : <WindowMaximizeIcon />}
      </button>
      <button
        type="button"
        className="win-close"
        title="Close"
        aria-label="Close window"
        onClick={() => run('close')}
      >
        <WindowCloseIcon />
      </button>
    </span>
  )
}
