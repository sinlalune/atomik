import QRCode from 'qrcode'
import { useCallback, useEffect, useRef, useState } from 'react'
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

export function CaptureView({
  onOpenSourceImage
}: {
  /** Opens the imported bundle in an image source tab (S05). */
  onOpenSourceImage?: (dossierPath: string) => void
}): React.JSX.Element {
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
        {expired && session.uploadUrl !== '' && (
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
          <DesktopRecorder onRecorded={refresh} />
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
                  onOpenSourceImage={onOpenSourceImage}
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
 * Desktop mic capture (owner request): MediaRecorder in the trusted
 * renderer, the resulting bytes handed to main over one typed channel —
 * where they pass the SAME gates as a phone upload and land in the SAME
 * inbox, awaiting the same explicit import. No network endpoint opens.
 */
function DesktopRecorder({
  onRecorded
}: {
  onRecorded: () => void
}): React.JSX.Element {
  const [recording, setRecording] = useState(false)
  const [startedAtMs, setStartedAtMs] = useState(0)
  const [nowMs, setNowMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => setNowMs(Date.now()), 500)
    return () => clearInterval(timer)
  }, [recording])

  // Unmount while recording: stop the tracks, drop the take.
  useEffect(
    () => () => {
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop())
    },
    []
  )

  const startRecording = (): void => {
    setError(null)
    navigator.mediaDevices.getUserMedia({ audio: true }).then(
      (stream) => {
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        const chunks: Blob[] = []
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data)
        }
        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop())
          setRecording(false)
          void new Blob(chunks, { type: 'audio/webm' })
            .arrayBuffer()
            .then((buffer) => {
              const stamp = new Date().toISOString().slice(0, 16).replace(':', '-')
              return window.atomik.addLocalCapture(
                new Uint8Array(buffer),
                'audio/webm',
                `desktop-recording-${stamp}.webm`
              )
            })
            .then(onRecorded, (cause) => setError(readableError(cause)))
        }
        recorderRef.current = recorder
        recorder.start()
        setStartedAtMs(Date.now())
        setNowMs(Date.now())
        setRecording(true)
      },
      () => setError('microphone unavailable or permission denied')
    )
  }

  const stopRecording = (): void => {
    recorderRef.current?.stop()
  }

  return (
    <>
      <button
        type="button"
        className="vault-open-button"
        title="Record audio with this device's microphone — it lands in the same inbox as phone uploads"
        onClick={recording ? stopRecording : startRecording}
      >
        {recording
          ? `■ Stop (${formatRemaining(nowMs, startedAtMs)})`
          : '● Record here'}
      </button>
      {error && <p className="capture-error">{error}</p>}
    </>
  )
}

/**
 * One inbox item and its S04 decision. The form only PREFILLS destination
 * and title (visible, editable — the S08 dogfooding lesson); main
 * validates whatever is submitted and refuses to overwrite.
 */
function UploadRow({
  upload,
  onResolved,
  onOpenSourceImage
}: {
  upload: CaptureUploadInfo
  onResolved: () => void
  onOpenSourceImage?: ((dossierPath: string) => void) | undefined
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
            {onOpenSourceImage && upload.importedTo && (
              <button
                type="button"
                className="capture-upload-view"
                onClick={() => onOpenSourceImage(upload.importedTo!)}
              >
                View
              </button>
            )}
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
