import { useEffect, useState } from 'react'
import { resolveRelativePath } from '../dev-docs/markdown'
import { useVaultNote } from '../vault/useVaultNote'
import {
  resourceOf,
  rotationOf,
  withDossierRotation,
  type Rotation
} from './dossier'
import { applyRotation } from './rotate'

/**
 * The image source tab (08 "image tab views the original beside the
 * dossier"; 03 tab kind `source-image`). Left: the ORIGINAL, faithful and
 * untouched (07: viewer ≠ extractor). Right: the rendered source.md — the
 * canonical dossier, whose relative .md links (transcript later, notes)
 * open in place. The image arrives as a data URL through the read-only
 * asset channel; this view can never write anything.
 */

export function SourceImageView({
  dossierPath
}: {
  dossierPath: string | undefined
}): React.JSX.Element {
  const { note, html, error, openNote, applySaved, onContentClick } =
    useVaultNote()
  const [base, setBase] = useState<{ dataUrl: string; mimeType: string } | null>(
    null
  )
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

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

  // The image follows the note: parse `resource:` and fetch the asset.
  useEffect(() => {
    setBase(null)
    setImageUrl(null)
    setImageError(null)
    if (!note) return
    const resource = resourceOf(note.content)
    if (!resource) {
      setImageError('this dossier declares no resource — nothing to view')
      return
    }
    const rel = resolveRelativePath(note.relPath, resource)
    if (!rel) {
      setImageError(`unresolvable resource path — ${resource}`)
      return
    }
    let cancelled = false
    window.atomik.readSourceAsset(rel).then(
      (asset) => {
        if (cancelled) return
        setBase({
          dataUrl: `data:${asset.mimeType};base64,${asset.base64}`,
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
  }, [note?.relPath])

  // Display = base pixels + recorded rotation.
  useEffect(() => {
    if (!base) return
    let cancelled = false
    void applyRotation(base.dataUrl, rotation, base.mimeType).then((url) => {
      if (!cancelled) setImageUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [base, rotation])

  const [transcribing, setTranscribing] = useState(false)

  // S06: run the adapter, then re-read the dossier (it changed on disk —
  // status, transcription identity, and the transcript link are in it).
  const transcribe = (): void => {
    if (!note) return
    setTranscribing(true)
    window.atomik.transcribeSource(note.relPath).then(
      () => {
        setTranscribing(false)
        openNote(note.relPath)
      },
      (cause) => {
        setTranscribing(false)
        setImageError(
          String(cause).replace(
            /^Error: Error invoking remote method '[^']+': Error: /,
            ''
          )
        )
      }
    )
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

  if (!dossierPath) {
    return (
      <p className="pane-placeholder">
        no dossier — open an imported capture from the Capture tab
      </p>
    )
  }

  return (
    <div className="source-image-view">
      <div className="source-image-original">
        {!isAudio && (
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
          <audio controls src={imageUrl} />
        )}
        {imageUrl && !isAudio && (
          <img src={imageUrl} alt={`Original of ${dossierPath}`} />
        )}
        {!imageUrl && (
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
            {note && !note.content.includes('./transcript.md') && (
              <button
                type="button"
                className="note-bar-button"
                title="Run the transcription adapter (S06 mock — records model/runtime in the dossier)"
                disabled={transcribing}
                onClick={transcribe}
              >
                {transcribing ? 'Transcribing…' : 'Transcribe'}
              </button>
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
