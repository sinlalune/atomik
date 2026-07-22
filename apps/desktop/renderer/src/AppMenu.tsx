import { useEffect, useRef, useState } from 'react'
import type { AiEngine, AiSettingsPublic } from '../../shared/ipc-contract'
import { materializeStarterPrompts } from './editor/prompts'
import { MenuIcon } from './icons'
import { acquireWebOverlay } from './web/overlay'
import {
  NOTE_FONT_SIZE_DEFAULT,
  NOTE_FONT_SIZE_MAX,
  NOTE_FONT_SIZE_MIN,
  noteFontSizeOf,
  setNoteFontSize,
  setTheme,
  themeOf,
  THEMES,
  type Theme
} from './workspace/model'
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
  const noteFontSize = useWorkspace((store) => noteFontSizeOf(store.state))
  const dispatch = useWorkspace((store) => store.dispatch)

  // S05s: the number field edits a DRAFT and commits on blur/Enter —
  // committing per keystroke would clamp "1" to 12 before the user
  // can type "16". The slider commits directly (its values are
  // always in band).
  const [sizeDraft, setSizeDraft] = useState<string | null>(null)
  const fontSizeValue = noteFontSize ?? NOTE_FONT_SIZE_DEFAULT
  const commitSizeDraft = (): void => {
    if (sizeDraft !== null) {
      const parsed = Number(sizeDraft)
      if (sizeDraft.trim() !== '' && Number.isFinite(parsed)) {
        dispatch((current) => setNoteFontSize(current, parsed))
      }
      setSizeDraft(null)
    }
  }

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

  const [starterStatus, setStarterStatus] = useState<string | null>(null)

  // S03: the EXPLICIT starter action — the only path that ever writes
  // prompt files; opening the app or the menu never does.
  const createStarters = (): void => {
    setBusy(true)
    setStarterStatus(null)
    materializeStarterPrompts(window.atomik).then(
      (created) => {
        setBusy(false)
        setStarterStatus(
          created.length > 0
            ? `created ${created.join(', ')} in prompts/`
            : 'all starter prompts already present'
        )
      },
      (cause) => {
        setBusy(false)
        setStarterStatus(String(cause))
      }
    )
  }

  const pickEngine = (engine: AiEngine): void => {
    setBusy(true)
    setError(null)
    window.atomik.setAiEngine(engine).then(
      (next) => {
        setBusy(false)
        setSettings(next)
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

          <h4>Note text</h4>
          <div className="app-menu-row app-menu-fontsize">
            <input
              type="range"
              min={NOTE_FONT_SIZE_MIN}
              max={NOTE_FONT_SIZE_MAX}
              step={0.5}
              value={fontSizeValue}
              aria-label="Note font size"
              onChange={(event) => {
                setSizeDraft(null)
                const next = Number(event.target.value)
                dispatch((current) => setNoteFontSize(current, next))
              }}
            />
            <input
              type="number"
              min={NOTE_FONT_SIZE_MIN}
              max={NOTE_FONT_SIZE_MAX}
              step={0.5}
              value={sizeDraft ?? String(fontSizeValue)}
              aria-label="Note font size in pixels"
              onChange={(event) => setSizeDraft(event.target.value)}
              onBlur={commitSizeDraft}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitSizeDraft()
              }}
            />
            <span className="app-menu-unit">px</span>
            {noteFontSize !== null && (
              <button
                type="button"
                className="app-menu-clear"
                title="Back to the default note size"
                onClick={() => {
                  setSizeDraft(null)
                  dispatch((current) => setNoteFontSize(current, null))
                }}
              >
                reset
              </button>
            )}
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
              aria-label="Mistral API key"
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
          <h4>AI · Engine</h4>
          <div className="app-menu-themes">
            {(['mock', 'mistral'] as const).map((candidate) => (
              <button
                key={candidate}
                type="button"
                className={`app-menu-theme${settings?.generationEngine === candidate ? ' active' : ''}`}
                disabled={busy || settings === null}
                onClick={() => pickEngine(candidate)}
              >
                {candidate}
              </button>
            ))}
          </div>
          {settings?.generationEngine === 'mistral' &&
            !settings.mistralKeyPresent && (
              <p className="app-menu-status">
                mistral needs a key — runs will fail until one is set
              </p>
            )}
          <h4>AI · Prompts</h4>
          <button
            type="button"
            className="app-menu-clear"
            disabled={busy}
            title="Creates the missing starter prompt files in prompts/ at the vault root — existing files are never touched"
            onClick={createStarters}
          >
            Create starter prompts
          </button>
          {starterStatus && <p className="app-menu-status">{starterStatus}</p>}
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
