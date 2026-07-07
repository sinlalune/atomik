import QRCode from 'qrcode'
import { useCallback, useEffect, useState } from 'react'
import type { CaptureSessionInfo } from '../../../shared/ipc-contract'
import { formatBytes, formatRemaining } from './format'

/**
 * The capture tab (08 §MVP flow, S03): start a session, show its QR, watch
 * uploads arrive in the inbox. Pure view over the three typed channels —
 * session state, tokens, and every security gate live in main
 * (capture-session.ts); the renderer only ever sees CaptureSessionInfo.
 * Uploads listed here are INBOX items; the confirm-into-vault step is S04.
 */

const POLL_MS = 2000

export function CaptureView(): React.JSX.Element {
  const [session, setSession] = useState<CaptureSessionInfo | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  // A session may outlive this tab (it lives in main): restore on mount.
  useEffect(() => {
    void window.atomik.getCaptureSession().then(setSession, () => {})
  }, [])

  // The QR is derived state: recompute when the upload URL changes.
  useEffect(() => {
    if (!session?.active) {
      setQrDataUrl(null)
      return
    }
    let cancelled = false
    QRCode.toDataURL(session.uploadUrl, { margin: 1, width: 480 }).then(
      (url) => {
        if (!cancelled) setQrDataUrl(url)
      },
      () => {
        if (!cancelled) setError('QR rendering failed — use the address below.')
      }
    )
    return () => {
      cancelled = true
    }
  }, [session?.active, session?.uploadUrl])

  // While active: poll for arriving uploads and tick the countdown. The
  // channel is a cheap in-memory inspect; expiry flips `active` lazily.
  useEffect(() => {
    if (!session?.active) return
    const timer = setInterval(() => {
      setNowMs(Date.now())
      void window.atomik.getCaptureSession().then(setSession, () => {})
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [session?.active])

  const start = useCallback(() => {
    setError(null)
    window.atomik.startCaptureSession().then(
      (next) => {
        setNowMs(Date.now())
        setSession(next)
      },
      (cause) => setError(String(cause))
    )
  }, [])

  const stop = useCallback(() => {
    window.atomik
      .stopCaptureSession()
      .then(() => window.atomik.getCaptureSession())
      .then(setSession, (cause) => setError(String(cause)))
  }, [])

  const expired = session !== null && !session.active

  return (
    <div className="capture-view">
      <div className="capture-panel">
        <h2>Phone capture</h2>
        {!session && (
          <p>
            Photograph handwritten notes, whiteboards, or book pages with
            your phone. Originals land in a temporary inbox for review —
            nothing enters the vault without your confirmation.
          </p>
        )}
        {session?.active && (
          <>
            {qrDataUrl && (
              <img
                className="capture-qr"
                src={qrDataUrl}
                alt="QR code for the phone upload page"
              />
            )}
            <p>
              Scan with the phone camera, or open this address in its
              browser:
            </p>
            <code className="capture-url">{session.uploadUrl}</code>
            <p className="capture-hint">
              Phone and desktop must share a network. Session expires in{' '}
              {formatRemaining(session.expiresAtMs, nowMs)}.
            </p>
          </>
        )}
        {expired && (
          <p>
            Session ended — the upload address is dead. Start a new one to
            capture more.
          </p>
        )}
        {error && <p className="capture-error">{error}</p>}
        <div className="capture-actions">
          {session?.active ? (
            <button type="button" className="vault-open-button" onClick={stop}>
              Stop session
            </button>
          ) : (
            <button type="button" className="vault-open-button" onClick={start}>
              {expired ? 'Start new session' : 'Start capture session'}
            </button>
          )}
        </div>
        {session && session.uploads.length > 0 && (
          <div className="capture-uploads">
            <h3>Received ({session.uploads.length})</h3>
            <ul>
              {session.uploads.map((upload) => (
                <li key={upload.id}>
                  <span className="capture-upload-name">{upload.fileName}</span>
                  <span className="capture-upload-meta">
                    {upload.mimeType} · {formatBytes(upload.bytes)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="capture-hint">
              Waiting in the inbox — review and import into the vault
              arrives with the next step (S04).
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
