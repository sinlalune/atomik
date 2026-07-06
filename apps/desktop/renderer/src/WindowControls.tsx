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
 * pane's tabstrip. Maximize state arrives by push (OS-initiated changes
 * included) and is mirrored onto <body data-maximized> so CSS can turn
 * the drag regions off while maximized — dragging a maximized frameless
 * window glitches under some window managers, and the drag region was
 * swallowing clicks (owner's maximized-mode bug report).
 */
export function WindowControls(): React.JSX.Element {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    const unsubscribe = window.atomik.onWindowStateChanged((state) =>
      setMaximized(state.maximized)
    )
    window.atomik
      .windowControl('get-state')
      .then((state) => setMaximized(state.maximized), () => undefined)
    return unsubscribe
  }, [])

  useEffect(() => {
    document.body.toggleAttribute('data-maximized', maximized)
  }, [maximized])

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
