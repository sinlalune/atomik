import { useEffect, useRef, useState } from 'react'
import type { AiSettingsPublic } from '../../shared/ipc-contract'
import { MenuIcon } from './icons'
import { acquireWebOverlay } from './web/overlay'
import { setTheme, themeOf, THEMES, type Theme } from './workspace/model'
import { useWorkspace } from './workspace/store'

/**
 * The app menu (owner request: one menu button in the header holding the
 * theme selection and settings) — replaces the loose theme-picker + AI
 * gear that used to sit in a pane's tabstrip. A ☰ button opens a single
 * dropdown: theme choice + the Mistral API key (presence + input; the
 * raw key goes DOWN the typed channel once and never comes back, 13).
 */
export function AppMenu(): React.JSX.Element {
  // subscribe to the THEME string, not the whole store — the menu was
  // re-rendering on every workspace dispatch (divider drags included)
  const theme = useWorkspace((store) => themeOf(store.state))
  const dispatch = useWorkspace((store) => store.dispatch)

  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<AiSettingsPublic | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    window.atomik.getAiSettings().then(setSettings, (cause) => setError(String(cause)))
    const onDown = (event: MouseEvent): void => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    // an open menu could sit UNDER a native web view — hide those
    const releaseOverlay = acquireWebOverlay()
    return () => {
      document.removeEventListener('mousedown', onDown)
      releaseOverlay()
    }
  }, [open])

  const submitKey = (key: string | null): void => {
    setBusy(true)
    setError(null)
    window.atomik.setMistralApiKey(key).then(
      (next) => {
        setBusy(false)
        setSettings(next)
        setDraft('')
      },
      (cause) => {
        setBusy(false)
        setError(String(cause))
      }
    )
  }

  return (
    <div className="app-menu" ref={panelRef}>
      <button
        type="button"
        className="app-menu-toggle"
        title="Menu"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MenuIcon />
      </button>
      {open && (
        <div className="app-menu-panel">
          <h4>Theme</h4>
          <div className="app-menu-themes">
            {THEMES.map((candidate) => (
              <button
                key={candidate}
                type="button"
                className={`app-menu-theme${candidate === theme ? ' active' : ''}`}
                onClick={() =>
                  dispatch((current) => setTheme(current, candidate as Theme))
                }
              >
                {candidate}
              </button>
            ))}
          </div>

          <h4>AI · Mistral key</h4>
          <p className="app-menu-status">
            {settings === null
              ? 'checking…'
              : settings.mistralKeyPresent
                ? `key set · ${settings.mistralKeyHint ?? '••••'}`
                : 'no key — cloud transcribe/OCR need one'}
          </p>
          <div className="app-menu-row">
            <input
              type="password"
              value={draft}
              placeholder="paste a Mistral API key"
              onChange={(event) => setDraft(event.target.value)}
              disabled={busy}
            />
            <button
              type="button"
              disabled={busy || draft.trim().length === 0}
              onClick={() => submitKey(draft.trim())}
            >
              Save
            </button>
          </div>
          {settings?.mistralKeyPresent && (
            <button
              type="button"
              className="app-menu-clear"
              disabled={busy}
              onClick={() => submitKey(null)}
            >
              Clear key
            </button>
          )}
          {error && <p className="app-menu-error error">{error}</p>}
          <p className="app-menu-note">
            The key stays in the main process; it never returns to this
            window.
          </p>
        </div>
      )}
    </div>
  )
}
