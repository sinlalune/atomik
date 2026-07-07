import { useEffect, useState } from 'react'
import { resolveRelativePath } from '../dev-docs/markdown'
import { useVaultNote } from '../vault/useVaultNote'
import { resourceOf } from './dossier'

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
  const { note, html, error, openNote, onContentClick } = useVaultNote()
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  useEffect(() => {
    if (dossierPath) openNote(dossierPath)
    // openNote is stable; re-run only when the tab points elsewhere.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossierPath])

  // The image follows the note: parse `resource:` and fetch the asset.
  useEffect(() => {
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
        setImageUrl(`data:${asset.mimeType};base64,${asset.base64}`)
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
  }, [note])

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
        {imageUrl ? (
          <img src={imageUrl} alt={`Original of ${dossierPath}`} />
        ) : (
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
