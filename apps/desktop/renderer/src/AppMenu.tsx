import { useEffect, useRef, useState } from 'react'
import type {
  AiEngine,
  AiSettingsPublic,
  PaneNode,
  WorkspaceTab
} from '../../shared/ipc-contract'
import { materializeStarterPrompts } from './editor/prompts'
import { MenuIcon } from './icons'
import { acquireWebOverlay } from './web/overlay'
import {
  NOTE_FONT_SIZE_DEFAULT,
  NOTE_FONT_SIZE_MAX,
  NOTE_FONT_SIZE_MIN,
  NOTE_WIDTH_DEFAULT,
  NOTE_WIDTH_MAX,
  NOTE_WIDTH_MIN,
  migratePaneTrees,
  migrateRetiredViews,
  noteFontSizeOf,
  noteWidthOf,
  setNoteFontSize,
  setNoteWidth,
  setTheme,
  themeOf,
  THEMES,
  type Theme
} from './workspace/model'
import { useWorkspace } from './workspace/store'

/**
 * One slider + number + reset row for a px-valued note setting (S05s
 * size, S05u width). The number field edits a DRAFT and commits on
 * blur/Enter — committing per keystroke would clamp "1" to the band
 * minimum before the user can finish typing "16". The slider commits
 * directly (its values are always in band). Reset appears only while
 * the setting overrides the stylesheet default.
 */
function NotePxRow(props: {
  label: string
  min: number
  max: number
  step: number
  value: number | null
  fallback: number
  onCommit: (px: number | null) => void
}): React.JSX.Element {
  const { label, min, max, step, value, fallback, onCommit } = props
  const [draft, setDraft] = useState<string | null>(null)
  const shown = value ?? fallback
  const commitDraft = (): void => {
    if (draft !== null) {
      const parsed = Number(draft)
      if (draft.trim() !== '' && Number.isFinite(parsed)) onCommit(parsed)
      setDraft(null)
    }
  }
  return (
    <div className="app-menu-row app-menu-px">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        aria-label={label}
        onChange={(event) => {
          setDraft(null)
          onCommit(Number(event.target.value))
        }}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft ?? String(shown)}
        aria-label={`${label} in pixels`}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commitDraft()
        }}
      />
      <span className="app-menu-unit">px</span>
      {value !== null && (
        <button
          type="button"
          className="app-menu-clear"
          title={`Back to the default ${label.toLowerCase()}`}
          onClick={() => {
            setDraft(null)
            onCommit(null)
          }}
        >
          reset
        </button>
      )}
    </div>
  )
}

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
  const noteWidth = useWorkspace((store) => noteWidthOf(store.state))
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

  // S06c18 (owner): NAMED WORKSPACES — save the current layout under a
  // name, load one back later, delete it. Snapshots live in
  // .atomik/workspaces/ (validated, disposable). The current state is
  // read LAZILY (useWorkspace.getState) so the menu keeps its narrow
  // subscriptions.
  const [wsName, setWsName] = useState('')
  const [snapshots, setSnapshots] = useState<
    Array<{ name: string; savedAt: number }>
  >([])
  const refreshSnapshots = (): void => {
    window.atomik.listWorkspaceSnapshots().then(setSnapshots, () =>
      setSnapshots([])
    )
  }
  useEffect(() => {
    if (open) refreshSnapshots()
  }, [open])

  const saveSnapshot = (): void => {
    const current = useWorkspace.getState().state
    const name = wsName.trim()
    if (!current || name.length === 0) return
    setBusy(true)
    setError(null)
    window.atomik.saveWorkspaceSnapshot(name, current).then(
      () => {
        setBusy(false)
        setWsName('')
        refreshSnapshots()
      },
      (cause) => {
        setBusy(false)
        setError(String(cause))
      }
    )
  }

  const loadSnapshot = async (name: string): Promise<void> => {
    const snapshot = await window.atomik
      .readWorkspaceSnapshot(name)
      .catch(() => null)
    if (!snapshot) {
      setError(`couldn't load workspace "${name}" — it may be corrupt`)
      return
    }
    // the current layout's native web views die with their tabs
    const current = useWorkspace.getState().state
    if (current) {
      const walk = (node: PaneNode): WorkspaceTab[] =>
        node.kind === 'leaf'
          ? node.tabs
          : [...walk(node.first), ...walk(node.second)]
      for (const tab of walk(current.root)) {
        if (tab.view === 'source-web') void window.atomik.webViewDestroy(tab.id)
      }
    }
    dispatch(() => migratePaneTrees(migrateRetiredViews(snapshot)))
    setOpen(false)
  }

  const deleteSnapshot = (name: string): void => {
    window.atomik.deleteWorkspaceSnapshot(name).then(refreshSnapshots, (cause) =>
      setError(String(cause))
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

          <h4>Workspaces</h4>
          <div className="app-menu-row app-menu-workspace-save">
            <input
              type="text"
              value={wsName}
              placeholder="save current layout as…"
              aria-label="Workspace name"
              onChange={(event) => setWsName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveSnapshot()
              }}
            />
            <button
              type="button"
              disabled={busy || wsName.trim().length === 0}
              onClick={saveSnapshot}
            >
              Save
            </button>
          </div>
          {snapshots.length > 0 && (
            <div className="app-menu-workspaces">
              {snapshots.map((snapshot) => (
                <div key={snapshot.name} className="app-menu-workspace-row">
                  <button
                    type="button"
                    title={`Load workspace "${snapshot.name}" — replaces the current layout`}
                    onClick={() => void loadSnapshot(snapshot.name)}
                  >
                    {snapshot.name}
                  </button>
                  <button
                    type="button"
                    className="app-menu-clear"
                    title={`Delete workspace "${snapshot.name}"`}
                    aria-label={`Delete workspace ${snapshot.name}`}
                    onClick={() => deleteSnapshot(snapshot.name)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <h4>Note text · Size</h4>
          <NotePxRow
            label="Note font size"
            min={NOTE_FONT_SIZE_MIN}
            max={NOTE_FONT_SIZE_MAX}
            step={0.5}
            value={noteFontSize}
            fallback={NOTE_FONT_SIZE_DEFAULT}
            onCommit={(px) => dispatch((current) => setNoteFontSize(current, px))}
          />
          <h4>Note text · Width</h4>
          <NotePxRow
            label="Note text width"
            min={NOTE_WIDTH_MIN}
            max={NOTE_WIDTH_MAX}
            step={10}
            value={noteWidth}
            fallback={NOTE_WIDTH_DEFAULT}
            onCommit={(px) => dispatch((current) => setNoteWidth(current, px))}
          />

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
