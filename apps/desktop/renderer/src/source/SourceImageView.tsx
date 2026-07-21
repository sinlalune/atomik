import { useEffect, useState } from 'react'
import { resolveRelativePath } from '../dev-docs/markdown'
import { HistoryNav } from '../HistoryNav'
import {
  CloudIcon,
  ExternalLinkIcon,
  ImageIcon,
  MicIcon,
  ReaderIcon,
  RotateCcwIcon,
  RotateCwIcon,
  ScanTextIcon,
  TrashIcon
} from '../icons'
import { useVaultNote } from '../vault/useVaultNote'
import { useNavHistory } from '../vault/nav-history'
import { invalidateImage } from '../vault/image-cache'
import {
  resourceOf,
  rotationOf,
  withDossierRotation,
  withPageAnchor,
  type Rotation
} from './dossier'
import { pdfPageTarget, takePendingPdfPage } from './pdf-open'
import { applyRotation, mediaObjectUrl } from './rotate'
import { PdfView } from './PdfView'
import { SnapshotView } from './SnapshotView'

/**
 * The image source tab (08 "image tab views the original beside the
 * dossier"; 03 tab kind `source-image`). Left: the ORIGINAL, faithful and
 * untouched (07: viewer ≠ extractor). Right: the rendered source.md — the
 * canonical dossier, whose relative .md links (transcript later, notes)
 * open in place. The image arrives as a data URL through the read-only
 * asset channel; this view can never write anything. Navigation between
 * sources comes from the PANE tree (S07d) via the dossierPath param —
 * the view no longer carries its own tree panel.
 */

export function SourceImageView({
  dossierPath,
  onDossierOpened,
  initialPdfPage,
  onPdfPageChange,
  onOpenWebUrl,
  historyKey
}: {
  dossierPath: string | undefined
  /** Reports every opened dossier so the tab param follows. */
  onDossierOpened?: (relPath: string) => void
  /** PDF page restore (S07): the tab param's page, read at mount. */
  initialPdfPage?: number
  /** Reports PDF page turns so the tab param follows. */
  onPdfPageChange?: (page: number) => void
  /** Opens an external http(s) link in a web tab (S04b) — web dossiers
   *  carry an Original URL. */
  onOpenWebUrl?: (url: string) => void
  /** Keys this tab's ‹ › navigation trail (the tab id). */
  historyKey?: string
}): React.JSX.Element {
  // Every open reports (S07d): with the tree at the pane, the tab param
  // is the only trail — internal .md navigation must persist too.
  const { note, html, error, openNote, applySaved, onContentClick } =
    useVaultNote(onDossierOpened, undefined, onOpenWebUrl)
  const nav = useNavHistory(historyKey, note?.relPath, openNote)
  const [base, setBase] = useState<{ dataUrl: string; mimeType: string } | null>(
    null
  )
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [assetRel, setAssetRel] = useState<string | null>(null)

  // Audio plays through a blob: URL (rotate.ts) — revoke the PREVIOUS
  // one whenever base changes and on unmount, or every audio open
  // retains its full bytes for the session (perf audit 2026-07-15).
  useEffect(() => {
    const url = base?.dataUrl
    return () => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
    }
  }, [base])

  useEffect(() => {
    if (dossierPath) openNote(dossierPath)
    // openNote is stable; re-run only when the tab points elsewhere.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossierPath])

  // The rotation is dossier metadata (the original is evidence and stays
  // byte-untouched); the buttons edit the dossier, the canvas rotates
  // pixels for display only.
  const rotation = note ? rotationOf(note.content) : 0
  const isAudio = base !== null && base.mimeType.startsWith('audio/')

  // S05g: the cleaned scan (when transcription landed one) is viewable
  // beside the original — the original stays the evidence.
  const hasScan = note?.content.includes('./scan.jpg') ?? false
  const [shown, setShown] = useState<'original' | 'scan'>('original')
  useEffect(() => setShown('original'), [note?.relPath])

  // S05i: orientation is the DOSSIER's state — consumers inherit it.
  // A transcript (or any non-dossier note) carries no rotation of its
  // own; main returns the dossier-recorded one with the asset.
  const isDossier = note?.relPath.split('/').pop() === 'source.md'
  const [assetRotation, setAssetRotation] = useState(0)

  // CP-MVP-003 S04: PDFs render through the PdfView (pdf.js, display
  // only); rotation and the media transcribe buttons don't apply.
  const isPdf = base?.mimeType === 'application/pdf'

  // CP-MVP-006 S05: a web dossier's resource is a URL (no local asset);
  // its "original" is the live page + the snapshot, and its derived
  // file is reader.md (not transcript/extracted). Transcribe/OCR and
  // rotation never apply.
  const webUrl = (() => {
    const resource = note ? resourceOf(note.content) : null
    return resource && /^https?:/i.test(resource) ? resource : null
  })()
  const isWeb = webUrl !== null && isDossier
  const hasReader = note?.content.includes('./reader.md') ?? false

  // S06: citation return — a pending page (set by a cross-note PDF link
  // click) is taken when this dossier opens and handed to the viewer.
  const [requestedPage, setRequestedPage] = useState<{ page: number } | null>(null)
  useEffect(() => {
    if (note && note.relPath.split('/').pop() === 'source.md') {
      const pending = takePendingPdfPage(note.relPath)
      setRequestedPage(pending != null ? { page: pending } : null)
    }
  }, [note?.relPath])

  // A PDF page link INSIDE this dossier (its own anchor table) can't go
  // through openNote — re-opening the same note wouldn't re-fire the
  // effect above — so jump the viewer directly; delegate everything
  // else (cross-note PDF links, .md links) to the shared handler.
  const onDossierClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    const anchor = (event.target as HTMLElement).closest('a')
    if (anchor && note) {
      const href = anchor.getAttribute('href') ?? ''
      const [rawPath, rawHash = ''] = href.split('#')
      const rel = resolveRelativePath(note.relPath, decodeURIComponent(rawPath ?? ''))
      const target = rel ? pdfPageTarget(rel, rawHash) : null
      if (target && target.dossierRel === note.relPath) {
        event.preventDefault()
        setRequestedPage({ page: target.page })
        return
      }
    }
    onContentClick(event)
  }

  // S06: "anchor this page" writes a durable anchor row to the dossier.
  const anchorPage = (page: number): void => {
    if (!note) return
    const next = withPageAnchor(note.content, page)
    if (next === note.content) return
    window.atomik.writeNote(note.relPath, next, note.mtimeMs).then(
      ({ mtimeMs }) => applySaved(next, mtimeMs),
      (cause) => setImageError(String(cause))
    )
  }

  // The image follows the note: parse `resource:` and fetch the asset.
  useEffect(() => {
    setBase(null)
    setImageUrl(null)
    setImageError(null)
    if (!note) return
    const resource = shown === 'scan' ? './scan.jpg' : resourceOf(note.content)
    if (!resource) {
      setImageError('this dossier declares no resource — nothing to view')
      return
    }
    // web dossiers (S04/S05): the original is a URL, not a vault asset;
    // the left pane renders a dedicated web-source panel (below) instead
    // of an image/pdf. Nothing to fetch here.
    if (/^https?:/i.test(resource)) return
    const rel = resolveRelativePath(note.relPath, resource)
    if (!rel) {
      setImageError(`unresolvable resource path — ${resource}`)
      return
    }
    setAssetRel(rel)
    let cancelled = false
    window.atomik.readSourceAsset(rel).then(
      (asset) => {
        if (cancelled) return
        setAssetRotation(asset.rotation ?? 0)
        setBase({
          dataUrl: asset.mimeType.startsWith('audio/')
            ? mediaObjectUrl(asset.base64, asset.mimeType)
            : `data:${asset.mimeType};base64,${asset.base64}`,
          mimeType: asset.mimeType
        })
      },
      (cause) => {
        if (cancelled) return
        setImageError(
          String(cause).replace(
            /^Error: Error invoking remote method '[^']+': Error: /,
            ''
          )
        )
      }
    )
    return () => {
      cancelled = true
    }
    // the base bytes depend on the note identity, not its edited content
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.relPath, shown])

  // Display = base pixels + recorded rotation (the scan is already
  // upright — never re-rotate it). On the dossier the note's own
  // frontmatter is live (optimistic rotate); elsewhere the dossier's
  // value arrives with the asset. PDFs skip this path entirely.
  useEffect(() => {
    if (!base || base.mimeType === 'application/pdf') return
    let cancelled = false
    const displayRotation =
      shown === 'scan' ? 0 : isDossier ? rotation : assetRotation
    void applyRotation(base.dataUrl, displayRotation, base.mimeType).then((url) => {
      if (!cancelled) setImageUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [base, rotation, shown, isDossier, assetRotation])

  const [transcribing, setTranscribing] = useState(false)
  const [cloudBusy, setCloudBusy] = useState(false)

  // S06: run the adapter, then re-read the dossier (it changed on disk —
  // status, transcription identity, and the transcript link are in it).
  const runTranscription = (
    invoke: (relPath: string) => Promise<unknown>,
    setBusy: (b: boolean) => void
  ): void => {
    if (!note) return
    setBusy(true)
    invoke(note.relPath).then(
      () => {
        setBusy(false)
        openNote(note.relPath)
      },
      (cause) => {
        setBusy(false)
        setImageError(
          String(cause).replace(
            /^Error: Error invoking remote method '[^']+': Error: /,
            ''
          )
        )
      }
    )
  }
  const transcribe = (): void =>
    runTranscription(window.atomik.transcribeSource, setTranscribing)
  // CP-MVP-005 S05: the EXPLICIT cloud rung — this button is the only
  // path by which an image ever leaves the machine for OCR.
  const transcribeCloud = (): void =>
    runTranscription(window.atomik.transcribeSourceCloud, setCloudBusy)
  // S05h: the explicit re-run affordance — corrections live in the
  // transcript, so deleting it is a consciously confirmed act.
  const deleteTranscript = (): void => {
    if (!note) return
    const confirmed = window.confirm(
      'Delete this transcript (and its scan/segments)?\n\n' +
        'Any corrections you made in transcript.md are lost. The original ' +
        'stays untouched; Transcribe and Cloud OCR become available again.'
    )
    if (confirmed) runTranscription(window.atomik.resetTranscription, setTranscribing)
  }

  const rotate = (delta: 90 | -90): void => {
    if (!note) return
    const next = (((rotation + delta) % 360) + 360) % 360 as Rotation
    const content = withDossierRotation(note.content, next)
    window.atomik.writeNote(note.relPath, content, note.mtimeMs).then(
      ({ mtimeMs }) => {
        applySaved(content, mtimeMs)
        // the shared image cache bakes rotation into its data URLs —
        // drop this asset so live/read re-fetch with the new rotation
        // (stale-after-rotate was a real bug, perf audit 2026-07-15)
        if (assetRel) invalidateImage(assetRel)
      },
      (cause) => setImageError(String(cause))
    )
  }

  return (
    <div className="vault no-tree">
      {dossierPath ? renderContent() : (
        <p className="pane-placeholder">
          no dossier — pick a source from the tree, or open an imported
          capture from the Capture tab
        </p>
      )}
    </div>
  )

  function renderContent(): React.JSX.Element {
    return (
    <div className="source-image-view">
      <div className="source-image-original">
        {!isAudio && !isPdf && !isWeb && isDossier && (
          // rotation is edited on the dossier only (and is a PHOTO
          // correction — PDFs and web snapshots have no business with
          // it; S07e-d owner report: the buttons floated over the
          // snapshot preview) — anywhere else they would write into
          // the WRONG note's frontmatter
          <div className="source-image-tools">
            <button
              type="button"
              title="Rotate left (recorded in the dossier; the original file is untouched)"
              aria-label="Rotate left"
              onClick={() => rotate(-90)}
            >
              <RotateCcwIcon />
            </button>
            <button
              type="button"
              title="Rotate right (recorded in the dossier; the original file is untouched)"
              aria-label="Rotate right"
              onClick={() => rotate(90)}
            >
              <RotateCwIcon />
            </button>
          </div>
        )}
        {imageUrl && isAudio && (
          // The audio companion (S08): the original plays, untouched.
          <div className="capture-recording-status">
            <audio controls src={imageUrl} />
            <button
              type="button"
              className="note-bar-button"
              title="Play in the system player (bypasses WSLg audio)"
              onClick={() => {
                if (assetRel) void window.atomik.openSourceExternally(assetRel)
              }}
            >
              <ExternalLinkIcon /> Open externally
            </button>
          </div>
        )}
        {isPdf && base && (
          <PdfView
            dataUrl={base.dataUrl}
            requestedPage={requestedPage}
            initialPage={initialPdfPage}
            onPageChange={onPdfPageChange}
            onAnchorPage={isDossier ? anchorPage : undefined}
          />
        )}
        {isWeb && webUrl && (
          <div className="web-source-panel">
            <div className="web-source-bar">
              <p className="web-source-host" title={webUrl}>
                {new URL(webUrl).hostname}
              </p>
              <span className="web-source-actions">
                <button
                  type="button"
                  className="note-bar-button"
                  title="Open the live page in a Web tab"
                  onClick={() => onOpenWebUrl?.(webUrl)}
                >
                  Live <ExternalLinkIcon />
                </button>
                <button
                  type="button"
                  className="note-bar-button"
                  title="Open the saved snapshot (the evidence) in your system browser"
                  onClick={() => {
                    const rel = resolveRelativePath(note!.relPath, './snapshot.mhtml')
                    if (rel) void window.atomik.openSourceExternally(rel).catch(() => {})
                  }}
                >
                  Snapshot <ExternalLinkIcon />
                </button>
              </span>
            </div>
            {(() => {
              // The snapshot IS the original (S07e-c): it previews here
              // like an image or PDF would. Keyed per tab so two tabs on
              // different dossiers never share a native view.
              const rel = resolveRelativePath(note!.relPath, './snapshot.mhtml')
              return rel && historyKey ? (
                <SnapshotView
                  key={`${historyKey}:${rel}`}
                  viewId={`snap-${historyKey}`}
                  snapshotRelPath={rel}
                />
              ) : (
                <p className="web-source-note">
                  {hasReader
                    ? 'Reader text extracted — read and correct it in the dossier.'
                    : 'Extract the reader text to read, annotate, and cite this page.'}
                </p>
              )
            })()}
          </div>
        )}
        {imageUrl && !isAudio && !isPdf && !isWeb && (
          <img src={imageUrl} alt={`Original of ${dossierPath}`} />
        )}
        {!imageUrl && !isPdf && !isWeb && (
          <p className="pane-placeholder">
            {imageError ?? 'loading original…'}
          </p>
        )}
      </div>
      <div className="source-image-dossier">
        <div className="note-bar">
          <HistoryNav
            backOk={nav.backOk}
            forwardOk={nav.forwardOk}
            onBack={nav.back}
            onForward={nav.forward}
          />
          <span className="note-bar-path" title={note?.relPath ?? dossierPath}>
            {note?.relPath ?? dossierPath}
          </span>
          <span className="note-bar-actions">
            {note && isWeb && !hasReader && (
              <button
                type="button"
                className="note-bar-button"
                title="Extract the page's main content from the snapshot — text and images (incl. math figures) land in reader.md, derived and traced"
                  aria-label="Extract reader text"
                disabled={transcribing}
                onClick={() =>
                  runTranscription(window.atomik.extractWebReader, setTranscribing)
                }
              >
                <ReaderIcon />
              </button>
            )}
            {note && isWeb && hasReader && (
              <button
                type="button"
                className="note-bar-button"
                title="Delete reader.md and its media/ after confirmation — corrections in it are lost; enables a fresh extraction"
                  aria-label="Delete reader extraction"
                disabled={transcribing}
                onClick={() => {
                  const confirmed = window.confirm(
                    'Delete this reader extraction (reader.md + media/)?\n\n' +
                      'Any corrections you made there are lost. The snapshot ' +
                      'stays untouched; Extract reader text becomes available again.'
                  )
                  if (confirmed)
                    runTranscription(window.atomik.resetWebReader, setTranscribing)
                }}
              >
                  <TrashIcon />
              </button>
            )}
            {note &&
              isPdf &&
              isDossier &&
              !note.content.includes('./extracted.md') && (
                <button
                  type="button"
                  className="note-bar-button"
                  title="Extract the text layer locally (image-only pages use the OCR seat when a rasterizer is installed) — lands extracted.md, derived and traced"
                  aria-label="Extract text"
                  disabled={transcribing}
                  onClick={() =>
                    runTranscription(window.atomik.extractPdfSource, setTranscribing)
                  }
                >
                  <ScanTextIcon />
                </button>
              )}
            {note &&
              isPdf &&
              isDossier &&
              note.content.includes('./extracted.md') && (
                <button
                  type="button"
                  className="note-bar-button"
                  title="Delete extracted.md after confirmation — corrections in it are lost; enables a fresh extraction"
                  aria-label="Delete extraction"
                  disabled={transcribing}
                  onClick={() => {
                    const confirmed = window.confirm(
                      'Delete this extraction (extracted.md)?\n\n' +
                        'Any corrections you made there are lost. The original PDF ' +
                        'stays untouched; Extract text becomes available again.'
                    )
                    if (confirmed)
                      runTranscription(window.atomik.resetExtraction, setTranscribing)
                  }}
                >
                  <TrashIcon />
                </button>
              )}
            {note && hasScan && !isAudio && (
              <button
                type="button"
                className="note-bar-button"
                title={
                  shown === 'original'
                    ? 'Show the cleaned scan the model read (scan.jpg)'
                    : 'Show the original photo — the evidence'
                }
                aria-label={shown === 'original' ? 'View scan' : 'View original'}
                onClick={() => setShown(shown === 'original' ? 'scan' : 'original')}
              >
                <ImageIcon />
              </button>
            )}
            {note &&
              note.relPath.split('/').pop() === 'source.md' &&
              note.content.includes('./transcript.md') && (
                <button
                  type="button"
                  className="note-bar-button"
                  title="Delete transcript.md (and scan/segments) after confirmation — corrections are lost; enables a fresh Transcribe or Cloud OCR run"
                  aria-label="Delete transcript"
                  disabled={transcribing || cloudBusy}
                  onClick={deleteTranscript}
                >
                  <TrashIcon />
                </button>
              )}
            {note &&
              !isPdf &&
              !isWeb &&
              note.relPath.split('/').pop() === 'source.md' &&
              !note.content.includes('./transcript.md') && (
              <>
                <button
                  type="button"
                  className="note-bar-button"
                  title="Run the LOCAL seat (images: Qwen3-VL 4B sidecar; audio: whisper.cpp) — nothing leaves this machine"
                  aria-label="Transcribe locally"
                  disabled={transcribing || cloudBusy}
                  onClick={transcribe}
                >
                  {isAudio ? <MicIcon /> : <ScanTextIcon />}
                </button>
                <button
                  type="button"
                  className="note-bar-button"
                  title={
                    isAudio
                      ? 'SENDS this audio to Mistral Voxtral (cloud) — explicit action, result marked cloud-derived; requires a configured key'
                      : 'SENDS this image to the Mistral OCR API (cloud) — explicit action, result marked cloud-derived; requires a configured key'
                  }
                  aria-label={isAudio ? 'Cloud transcribe' : 'Cloud OCR'}
                  disabled={transcribing || cloudBusy}
                  onClick={transcribeCloud}
                >
                  <CloudIcon />
                </button>
              </>
            )}
          </span>
        </div>
        <div className="note-scroll" onClick={onDossierClick}>
          {error && <p className="error">{error}</p>}
          <article
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
    )
  }
}
