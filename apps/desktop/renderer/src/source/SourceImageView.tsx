import { useEffect, useState } from 'react'
import { resolveRelativePath } from '../dev-docs/markdown'
import { useVaultNote } from '../vault/useVaultNote'
import {
  resourceOf,
  rotationOf,
  withDossierRotation,
  type Rotation
} from './dossier'
import { applyRotation, mediaObjectUrl } from './rotate'
import { PdfView } from './PdfView'
import { SourcesTreePanel } from './SourcesTree'

/**
 * The image source tab (08 "image tab views the original beside the
 * dossier"; 03 tab kind `source-image`). Left: the ORIGINAL, faithful and
 * untouched (07: viewer ≠ extractor). Right: the rendered source.md — the
 * canonical dossier, whose relative .md links (transcript later, notes)
 * open in place. The image arrives as a data URL through the read-only
 * asset channel; this view can never write anything.
 */

export function SourceImageView({
  dossierPath,
  onDossierOpened,
  treeCollapsed,
  onTreeToggle,
  treeWidth,
  onTreeResize,
  openFolders = new Set<string>(),
  onOpenFoldersChange
}: {
  dossierPath: string | undefined
  /** Reports tree navigation so the tab param follows. */
  onDossierOpened?: (relPath: string) => void
  treeCollapsed?: boolean
  onTreeToggle?: () => void
  treeWidth?: number
  onTreeResize?: (px: number) => void
  openFolders?: ReadonlySet<string>
  onOpenFoldersChange?: (next: ReadonlySet<string>) => void
}): React.JSX.Element {
  const { note, html, error, openNote, applySaved, onContentClick } =
    useVaultNote()
  const [base, setBase] = useState<{ dataUrl: string; mimeType: string } | null>(
    null
  )
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [assetRel, setAssetRel] = useState<string | null>(null)

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
      ({ mtimeMs }) => applySaved(content, mtimeMs),
      (cause) => setImageError(String(cause))
    )
  }

  const openFromTree = (relPath: string): void => {
    openNote(relPath)
    onDossierOpened?.(relPath)
  }

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
          activePath={note?.relPath ?? dossierPath ?? null}
          onOpen={openFromTree}
          onTreeToggle={onTreeToggle}
          onTreeResize={onTreeResize}
          openFolders={openFolders}
          onOpenFoldersChange={onOpenFoldersChange}
        />
      )}
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
        {!isAudio && isDossier && (
          // rotation is edited on the dossier only — anywhere else the
          // buttons would write into the WRONG note's frontmatter
          <div className="source-image-tools">
            <button
              type="button"
              title="Rotate left (recorded in the dossier; the original file is untouched)"
              onClick={() => rotate(-90)}
            >
              ⟲
            </button>
            <button
              type="button"
              title="Rotate right (recorded in the dossier; the original file is untouched)"
              onClick={() => rotate(90)}
            >
              ⟳
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
              title="Lecture via le lecteur système (contourne l'audio WSLg)"
              onClick={() => {
                if (assetRel) void window.atomik.openSourceExternally(assetRel)
              }}
            >
              Ouvrir en externe
            </button>
          </div>
        )}
        {isPdf && base && <PdfView dataUrl={base.dataUrl} />}
        {imageUrl && !isAudio && !isPdf && (
          <img src={imageUrl} alt={`Original of ${dossierPath}`} />
        )}
        {!imageUrl && !isPdf && (
          <p className="pane-placeholder">
            {imageError ?? 'loading original…'}
          </p>
        )}
      </div>
      <div className="source-image-dossier">
        <div className="note-bar">
          <span className="note-bar-path" title={note?.relPath ?? dossierPath}>
            {note?.relPath ?? dossierPath}
          </span>
          <span className="note-bar-actions">
            {note &&
              isPdf &&
              isDossier &&
              !note.content.includes('./extracted.md') && (
                <button
                  type="button"
                  className="note-bar-button"
                  title="Extract the text layer locally (image-only pages use the OCR seat when a rasterizer is installed) — lands extracted.md, derived and traced"
                  disabled={transcribing}
                  onClick={() =>
                    runTranscription(window.atomik.extractPdfSource, setTranscribing)
                  }
                >
                  {transcribing ? 'Extracting…' : 'Extract text'}
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
                onClick={() => setShown(shown === 'original' ? 'scan' : 'original')}
              >
                {shown === 'original' ? 'View scan' : 'View original'}
              </button>
            )}
            {note &&
              note.relPath.split('/').pop() === 'source.md' &&
              note.content.includes('./transcript.md') && (
                <button
                  type="button"
                  className="note-bar-button"
                  title="Delete transcript.md (and scan/segments) after confirmation — corrections are lost; enables a fresh Transcribe or Cloud OCR run"
                  disabled={transcribing || cloudBusy}
                  onClick={deleteTranscript}
                >
                  {transcribing ? 'Deleting…' : 'Delete transcript…'}
                </button>
              )}
            {note &&
              !isPdf &&
              note.relPath.split('/').pop() === 'source.md' &&
              !note.content.includes('./transcript.md') && (
              <>
                <button
                  type="button"
                  className="note-bar-button"
                  title="Run the LOCAL seat (images: Qwen3-VL 4B sidecar; audio: whisper.cpp) — nothing leaves this machine"
                  disabled={transcribing || cloudBusy}
                  onClick={transcribe}
                >
                  {transcribing ? 'Transcribing…' : 'Transcribe'}
                </button>
                <button
                  type="button"
                  className="note-bar-button"
                  title="SENDS this image to the Mistral OCR API (cloud) — explicit action, result marked cloud-derived; requires a configured key"
                  disabled={transcribing || cloudBusy}
                  onClick={transcribeCloud}
                >
                  {cloudBusy ? 'Cloud OCR…' : 'Cloud OCR'}
                </button>
              </>
            )}
          </span>
        </div>
        <div className="note-scroll" onClick={onContentClick}>
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
