import { useEffect, useRef, useState } from 'react'
import type { WebViewState } from '../../../shared/ipc-contract'
import { onWebOverlayChange, webOverlayCovered } from './overlay'
import { normalizeInputUrl } from './urls'

/**
 * The web tab (CP-MVP-006 S03, bedrock 09; tab kind `source-web`). This
 * component is TRUSTED UI only: URL bar, nav buttons, honest states. The
 * page itself is an isolated WebContentsView owned by main and positioned
 * over `.web-host` — no bridge, no vault access, typed snapshots in, URL
 * strings and geometry out. The URL rides the tab param (03 recoverable
 * UI state) so the tab restores where you were; the running page itself
 * survives tab switches (the view hides, it doesn't die — a Colab
 * session keeps computing while you read a PDF beside it).
 */

export function WebView({
  tabId,
  initialUrl,
  onUrlChange,
  onImported
}: {
  /** The tab id doubles as the view id in main's registry. */
  tabId: string
  /** The tab param's url, read once at mount (restore). */
  initialUrl?: string
  /** Reports navigations so the tab param follows. */
  onUrlChange?: (url: string) => void
  /** A landed import — the host opens the new dossier (S04). */
  onImported?: (dossierPath: string) => void
}): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [state, setState] = useState<WebViewState | null>(null)
  const [input, setInput] = useState(initialUrl ?? '')
  const [inputError, setInputError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<string | null>(null)
  const [covered, setCovered] = useState(webOverlayCovered())
  const inputFocused = useRef(false)
  const initialUrlRef = useRef(initialUrl)
  const lastRect = useRef('')

  // one rect report per frame, and only when the rect actually moved
  const reportRect = (): void => {
    const host = hostRef.current
    if (!host) return
    const rect = host.getBoundingClientRect()
    const key = `${rect.x}|${rect.y}|${rect.width}|${rect.height}`
    if (key === lastRect.current) return
    lastRect.current = key
    void window.atomik.webViewSetBounds(tabId, {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    })
  }

  // snapshots pushed from main; the URL bar follows unless being edited
  useEffect(
    () =>
      window.atomik.onWebViewState((snapshot) => {
        if (snapshot.id !== tabId) return
        setState(snapshot)
        if (!inputFocused.current && snapshot.url && snapshot.url !== 'about:blank') {
          setInput(snapshot.url)
        }
      }),
    [tabId]
  )

  // the tab param follows navigation (03 — like the PDF page param)
  useEffect(() => {
    if (state?.url && state.url !== 'about:blank') onUrlChange?.(state.url)
    // navigation-driven; the freshest callback is the right one
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.url])

  // restore: a saved url creates the view at mount; a fresh tab waits
  // for the first address instead of parking a blank native view
  useEffect(() => {
    const url = initialUrlRef.current
    if (!url) return
    void window.atomik
      .webViewEnsure(tabId, url)
      .then(({ state: snapshot }) => {
        setState(snapshot)
        lastRect.current = ''
        reportRect()
      })
      .catch((cause) => setInputError(String(cause)))
    // mount-only: the param later follows OUR navigation reports
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId])

  // overlay guard (S02 named cost: native views paint over the UI)
  useEffect(() => onWebOverlayChange(setCovered), [])

  // the view exists once state does; visible = mounted, uncovered
  const ready = state !== null
  useEffect(() => {
    if (!ready) return
    void window.atomik.webViewSetVisible(tabId, !covered)
    return () => {
      void window.atomik.webViewSetVisible(tabId, false)
    }
  }, [tabId, covered, ready])

  // geometry: element resizes, window resizes, and divider drags that
  // only MOVE the pane (per-render check catches those)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const observer = new ResizeObserver(reportRect)
    observer.observe(host)
    window.addEventListener('resize', reportRect)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', reportRect)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reportRect)

  const go = (raw: string): void => {
    const url = normalizeInputUrl(raw)
    if (!url) {
      setInputError('web addresses only — http(s)')
      return
    }
    setInputError(null)
    setInput(url)
    void window.atomik
      .webViewEnsure(tabId, url)
      .then(({ state: snapshot, created }) => {
        setState(snapshot)
        if (!created) return window.atomik.webViewNavigate(tabId, url)
        lastRect.current = ''
        reportRect()
        return undefined
      })
      .catch((cause) => setInputError(String(cause)))
  }

  const control = (action: 'back' | 'forward' | 'reload' | 'stop'): void => {
    void window.atomik.webViewControl(tabId, action).catch(() => {})
  }

  // The EXPLICIT import (09): this button is the ONLY road from the live
  // page to the vault — snapshot + dossier land main-side, gated.
  const importSource = (): void => {
    setImporting(true)
    setImported(null)
    setInputError(null)
    window.atomik.webViewImportSource(tabId).then(
      ({ dossierPath }) => {
        setImporting(false)
        setImported(dossierPath)
        onImported?.(dossierPath)
      },
      (cause) => {
        setImporting(false)
        setInputError(String(cause))
      }
    )
  }

  const importable =
    ready && !importing && !state?.loading && Boolean(state?.url) &&
    state?.url !== 'about:blank'

  return (
    <div className="web-view-tab">
      <div className="web-nav">
        <button
          type="button"
          className="note-bar-button"
          disabled={!state?.canGoBack}
          title="Back"
          onClick={() => control('back')}
        >
          ‹
        </button>
        <button
          type="button"
          className="note-bar-button"
          disabled={!state?.canGoForward}
          title="Forward"
          onClick={() => control('forward')}
        >
          ›
        </button>
        <button
          type="button"
          className="note-bar-button"
          disabled={!ready}
          title={state?.loading ? 'Stop' : 'Reload'}
          onClick={() => control(state?.loading ? 'stop' : 'reload')}
        >
          {state?.loading ? '✕' : '⟳'}
        </button>
        <form
          className="web-url"
          onSubmit={(event) => {
            event.preventDefault()
            go(input)
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onFocus={(event) => {
              inputFocused.current = true
              event.target.select()
            }}
            onBlur={() => {
              inputFocused.current = false
            }}
            placeholder="type an address — colab.research.google.com"
            spellCheck={false}
            aria-label="Address"
          />
        </form>
        <button
          type="button"
          className="note-bar-button web-import"
          disabled={!importable}
          title="Import this page as a source — snapshot + dossier into sources/web/"
          onClick={importSource}
        >
          {importing ? 'importing…' : 'Import as source'}
        </button>
      </div>
      {inputError && <p className="web-hint error">{inputError}</p>}
      {imported && (
        <p className="web-hint">
          imported → <code>{imported}</code> — the dossier opened in a new tab
        </p>
      )}
      {state?.failure && (
        <p className="web-hint error">
          {state.failure}{' '}
          <button
            type="button"
            className="note-bar-button"
            onClick={() => control('reload')}
          >
            retry
          </button>
        </p>
      )}
      <div className="web-host" ref={hostRef}>
        {!ready && (
          <p className="pane-placeholder">
            Type an address above — the page opens here, isolated from your
            vault. Import as source lands in S04.
          </p>
        )}
      </div>
    </div>
  )
}
