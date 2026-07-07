import fixWebmDuration from 'fix-webm-duration'
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
import { mediaObjectUrl } from '../source/rotate'
import { SourcesTreePanel } from '../source/SourcesTree'

/**
 * The capture tab (08 §MVP flow, S03): start a session, show its QR, watch
 * uploads arrive in the inbox. Pure view over the three typed channels —
 * session state, tokens, and every security gate live in main
 * (capture-session.ts); the renderer only ever sees CaptureSessionInfo.
 * Uploads listed here are INBOX items; the confirm-into-vault step is S04.
 */

const POLL_MS = 2000

export function CaptureView({
  onOpenSourceImage,
  treeCollapsed,
  onTreeToggle,
  treeWidth,
  onTreeResize,
  openFolders = new Set<string>(),
  onOpenFoldersChange
}: {
  /** Opens the imported bundle in an image source tab (S05). */
  onOpenSourceImage?: (dossierPath: string) => void
  treeCollapsed?: boolean
  onTreeToggle?: () => void
  treeWidth?: number
  onTreeResize?: (px: number) => void
  openFolders?: ReadonlySet<string>
  onOpenFoldersChange?: (next: ReadonlySet<string>) => void
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
    <div
      className={`vault${treeCollapsed ? ' no-tree' : ''}`}
      style={
        !treeCollapsed && treeWidth !== undefined
          ? { gridTemplateColumns: `${treeWidth}px 1fr` }
          : undefined
      }
    >
      {!treeCollapsed && (
        <SourcesTreePanel
          activePath={null}
          onOpen={(relPath) => onOpenSourceImage?.(relPath)}
          onTreeToggle={onTreeToggle}
          onTreeResize={onTreeResize}
          openFolders={openFolders}
          onOpenFoldersChange={onOpenFoldersChange}
        />
      )}
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
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('default')
  const [trackLabel, setTrackLabel] = useState<string | null>(null)
  const [level, setLevel] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const startedAtRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const meterTimerRef = useRef<number | undefined>(undefined)

  // Which microphones exist (owner question: "which device records?").
  // Labels only appear once mic permission has been granted at least
  // once, so the list is refreshed again after a successful start.
  const refreshDevices = useCallback(() => {
    navigator.mediaDevices?.enumerateDevices().then(
      (all) => setDevices(all.filter((d) => d.kind === 'audioinput')),
      () => {}
    )
  }, [])
  useEffect(refreshDevices, [refreshDevices])

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => setNowMs(Date.now()), 500)
    return () => clearInterval(timer)
  }, [recording])

  const teardownMeter = (): void => {
    window.clearInterval(meterTimerRef.current)
    void audioContextRef.current?.close().catch(() => {})
    audioContextRef.current = null
    setLevel(0)
    setTrackLabel(null)
  }

  // Unmount while recording: stop the tracks, drop the take.
  useEffect(
    () => () => {
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop())
      window.clearInterval(meterTimerRef.current)
      void audioContextRef.current?.close().catch(() => {})
    },
    []
  )

  const startRecording = (): void => {
    setError(null)
    navigator.mediaDevices
      .getUserMedia({
        // Processing (echo cancel/noise suppress) adds resampling load on
        // the fragile WSLg bridge; a memo recorder doesn't need it.
        audio: {
          ...(deviceId !== 'default' ? { deviceId: { exact: deviceId } } : {}),
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })
      .then(
        (stream) => {
          const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
          const chunks: Blob[] = []
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) chunks.push(event.data)
          }
          recorder.onstop = () => {
            stream.getTracks().forEach((track) => track.stop())
            teardownMeter()
            setRecording(false)
            // MediaRecorder streams WebM without a Duration element —
            // external players misjudge it (delayed start, ~early
            // cutoff). We know the elapsed time; patch the container.
            const durationMs = Date.now() - startedAtRef.current
            void fixWebmDuration(
              new Blob(chunks, { type: 'audio/webm' }),
              durationMs,
              { logger: false }
            )
              .then((fixed) => fixed.arrayBuffer())
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
          startedAtRef.current = Date.now()
          // Name the device actually in use, and meter it live: a flat
          // bar during recording means a silent take BEFORE import.
          setTrackLabel(stream.getAudioTracks()[0]?.label || 'unnamed microphone')
          const context = new AudioContext()
          const analyser = context.createAnalyser()
          analyser.fftSize = 512
          context.createMediaStreamSource(stream).connect(analyser)
          audioContextRef.current = context
          const samples = new Uint8Array(analyser.fftSize)
          meterTimerRef.current = window.setInterval(() => {
            analyser.getByteTimeDomainData(samples)
            let peak = 0
            for (const value of samples) {
              peak = Math.max(peak, Math.abs(value - 128))
            }
            setLevel(peak / 128)
          }, 120)
          recorder.start(1000)
          setStartedAtMs(Date.now())
          setNowMs(Date.now())
          setRecording(true)
          refreshDevices()
        },
        (cause) => setError(micErrorMessage(cause))
      )
  }

  const stopRecording = (): void => {
    recorderRef.current?.stop()
  }

  return (
    <>
      {!recording && devices.length > 0 && (
        <select
          className="capture-mic-select"
          title="Microphone used by Record here"
          value={deviceId}
          onChange={(event) => setDeviceId(event.target.value)}
        >
          <option value="default">Default microphone</option>
          {devices
            .filter((device) => device.deviceId && device.deviceId !== 'default')
            .map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || 'microphone (name hidden until first use)'}
              </option>
            ))}
        </select>
      )}
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
      {recording && (
        <div className="capture-recording-status">
          <span>recording from: {trackLabel}</span>
          <div className="capture-level" title="Input level — a flat bar means a silent take">
            <div style={{ width: `${Math.min(100, Math.round(level * 140))}%` }} />
          </div>
        </div>
      )}
      {error && <p className="capture-error">{error}</p>}
    </>
  )
}

/** Mic failures have distinct causes; say which one it was. */
function micErrorMessage(cause: unknown): string {
  const name = (cause as DOMException | undefined)?.name
  if (name === 'NotFoundError') {
    return 'no microphone found — under WSL this usually means the libpulse0 system package is missing (sudo apt-get install libpulse0), then restart atomik'
  }
  if (name === 'NotAllowedError') return 'microphone permission denied'
  return `microphone unavailable — ${String((cause as Error | undefined)?.message ?? cause)}`
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
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
        <span className="capture-upload-name" title={upload.fileName}>
          {upload.fileName}
        </span>
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
            <button
              type="button"
              onClick={() => {
                if (previewUrl) return setPreviewUrl(null)
                window.atomik.getCaptureUploadData(upload.id).then(
                  (data) =>
                    setPreviewUrl(
                      data.mimeType.startsWith('audio/')
                        ? mediaObjectUrl(data.base64, data.mimeType)
                        : `data:${data.mimeType};base64,${data.base64}`
                    ),
                  (cause) => setError(readableError(cause))
                )
              }}
            >
              {previewUrl ? 'Hide' : upload.mimeType.startsWith('audio/') ? 'Listen' : 'Preview'}
            </button>
            <button type="button" onClick={() => setImporting((open) => !open)}>
              {importing ? 'Cancel' : 'Import…'}
            </button>
            <button type="button" onClick={discard}>
              Discard
            </button>
          </span>
        )}
      </div>
      {previewUrl && (
        <div className="capture-preview">
          {upload.mimeType.startsWith('audio/') ? (
            <audio controls autoPlay src={previewUrl} />
          ) : (
            <img src={previewUrl} alt={upload.fileName} />
          )}
        </div>
      )}
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
