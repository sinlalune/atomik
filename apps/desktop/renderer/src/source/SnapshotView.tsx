import { useEffect, useRef, useState } from 'react'
import { onWebOverlayChange, webOverlayCovered } from '../web/overlay'

/**
 * The web bundle's snapshot as the source preview (S07e-c, owner bench:
 * "open the snapshot as preview, as other sources do"). The MHTML
 * evidence renders in a main-owned isolated view positioned over this
 * placeholder — ephemeral partition, navigation denied, zero bridge.
 * Same geometry discipline as the web tab (WebView.tsx).
 */
export function SnapshotView({
  viewId,
  snapshotRelPath
}: {
  /** Registry id for this preview (derived from the tab id). */
  viewId: string
  /** Vault-relative …/snapshot.mhtml — main re-validates everything. */
  snapshotRelPath: string
}): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [covered, setCovered] = useState(webOverlayCovered())
  const lastRect = useRef('')

  const reportRect = (): void => {
    const host = hostRef.current
    if (!host) return
    const rect = host.getBoundingClientRect()
    const key = `${rect.x}|${rect.y}|${rect.width}|${rect.height}`
    if (key === lastRect.current) return
    lastRect.current = key
    void window.atomik.webViewSetBounds(viewId, {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    })
  }

  useEffect(() => {
    let cancelled = false
    setReady(false)
    setError(null)
    void window.atomik
      .webViewShowSnapshot(viewId, snapshotRelPath)
      .then(() => {
        if (cancelled) return
        setReady(true)
        lastRect.current = ''
        reportRect()
      })
      .catch((cause) => {
        if (!cancelled) setError(String(cause))
      })
    return () => {
      cancelled = true
      // the preview dies with its tab/dossier — nothing lives offscreen
      void window.atomik.webViewDestroy(viewId)
    }
    // one view per (tab, snapshot) identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId, snapshotRelPath])

  // overlay guard (S02 named cost: native views paint over the UI)
  useEffect(() => onWebOverlayChange(setCovered), [])

  useEffect(() => {
    if (!ready) return
    void window.atomik.webViewSetVisible(viewId, !covered)
    return () => {
      void window.atomik.webViewSetVisible(viewId, false)
    }
  }, [viewId, covered, ready])

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
  }, [viewId])
  // divider drags that only MOVE the pane (per-render check)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reportRect)

  return (
    <div className="snapshot-host" ref={hostRef}>
      {error ? (
        <p className="pane-placeholder">{error}</p>
      ) : (
        !ready && <p className="pane-placeholder">loading snapshot…</p>
      )}
    </div>
  )
}
