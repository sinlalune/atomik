import QRCode from 'qrcode'
import { useCallback, useEffect, useState } from 'react'
import type {
  CaptureSessionInfo,
  CaptureUploadInfo
} from '../../../shared/ipc-contract'
import {
  captureTitleOf,
  defaultCaptureDestination,
  formatBytes,
  formatRemaining
} from './format'

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

  const refresh = useCallback(() => {
    void window.atomik.getCaptureSession().then(setSession, () => {})
  }, [])

  // A session may outlive this tab (it lives in main): restore on mount.
  useEffect(refresh, [refresh])

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
      refresh()
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [session?.active, refresh])

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
                <UploadRow
                  key={upload.id}
                  upload={upload}
                  onResolved={refresh}
                />
              ))}
            </ul>
            <p className="capture-hint">
              Inbox items — importing creates a capture source bundle in
              the open vault; discarding deletes the upload. Nothing
              enters the vault otherwise.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * One inbox item and its S04 decision. The form only PREFILLS destination
 * and title (visible, editable — the S08 dogfooding lesson); main
 * validates whatever is submitted and refuses to overwrite.
 */
function UploadRow({
  upload,
  onResolved
}: {
  upload: CaptureUploadInfo
  onResolved: () => void
}): React.JSX.Element {
  const [importing, setImporting] = useState(false)
  const [title, setTitle] = useState(() => captureTitleOf(upload.fileName))
  const [relPath, setRelPath] = useState(() =>
    defaultCaptureDestination(upload.fileName, Date.now())
  )
  const [error, setError] = useState<string | null>(null)

  const confirmImport = (): void => {
    setError(null)
    window.atomik.importCaptureUpload(upload.id, { relPath, title }).then(
      () => {
        setImporting(false)
        onResolved()
      },
      (cause) => setError(readableError(cause))
    )
  }

  const discard = (): void => {
    setError(null)
    window.atomik
      .discardCaptureUpload(upload.id)
      .then(onResolved, (cause) => setError(readableError(cause)))
  }

  return (
    <li className="capture-upload">
      <div className="capture-upload-row">
        <span className="capture-upload-name">{upload.fileName}</span>
        <span className="capture-upload-meta">
          {upload.mimeType} · {formatBytes(upload.bytes)}
        </span>
        {upload.resolution === 'imported' && (
          <span className="capture-upload-state">
            imported → {upload.importedTo}
          </span>
        )}
        {upload.resolution === 'discarded' && (
          <span className="capture-upload-state">discarded</span>
        )}
        {!upload.resolution && (
          <span className="capture-upload-actions">
            <button type="button" onClick={() => setImporting((open) => !open)}>
              {importing ? 'Cancel' : 'Import…'}
            </button>
            <button type="button" onClick={discard}>
              Discard
            </button>
          </span>
        )}
      </div>
      {!upload.resolution && importing && (
        <div className="capture-import-form">
          <label>
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            Vault folder
            <input
              value={relPath}
              onChange={(event) => setRelPath(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="vault-open-button"
            onClick={confirmImport}
          >
            Import into vault
          </button>
        </div>
      )}
      {error && <p className="capture-error">{error}</p>}
    </li>
  )
}

/** Electron wraps thrown main-process errors; show the human part. */
function readableError(cause: unknown): string {
  return String(cause).replace(/^Error: Error invoking remote method '[^']*': /, '')
}
