import MarkdownIt from 'markdown-it'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { VaultNoteFile } from '../../../shared/ipc-contract'
import { resolveRelativePath, stripFrontmatter } from '../dev-docs/markdown'
import { applyRotation } from '../source/rotate'
import { pdfPageTarget, setPendingPdfPage } from '../source/pdf-open'
import { inlineImageSources, vaultImageSources } from './note-images'

/**
 * Shared note-reading logic for vault-backed views (VaultView,
 * ProjectView): open a note through the bridge, render it, follow
 * relative .md links, and never self-retry a failing path.
 */
export function useVaultNote(
  onNoteOpened?: (relPath: string) => void,
  /** How SOURCE targets open their viewer (S06/S06e): PDF citations,
   *  bare media originals, and dossier (source.md) links all route
   *  here when the host provides it — a source belongs in the source
   *  view, not the markdown editor. Absent → plain openNote. */
  onOpenSourceView?: (dossierRel: string) => void
): {
  note: VaultNoteFile | null
  html: string
  error: string | null
  setError: (error: string | null) => void
  openNote: (relPath: string) => void
  /** Syncs the held note after an editor save (content + fresh mtime). */
  applySaved: (content: string, mtimeMs: number) => void
  /** Drops everything held from the current vault (vault switch). */
  reset: () => void
  lastRequested: React.MutableRefObject<string | null>
  onContentClick: (event: React.MouseEvent<HTMLDivElement>) => void
} {
  const [note, setNote] = useState<VaultNoteFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastRequested = useRef<string | null>(null)

  // breaks:true — in the writing surface a single Enter IS a line break
  // (note-taking expectation; Obsidian's default). Dev Docs stay strict
  // CommonMark: the corpus is hard-wrapped for editing comfort and soft
  // breaks there must keep joining into paragraphs.
  const md = useMemo(
    () => new MarkdownIt({ html: false, linkify: false, breaks: true }),
    []
  )

  const openNote = useCallback(
    (relPath: string) => {
      lastRequested.current = relPath
      window.atomik.readNote(relPath).then(
        (file) => {
          setNote(file)
          setError(null)
          onNoteOpened?.(file.relPath)
        },
        (reason: unknown) =>
          // strip Electron's IPC wrapper; the main-side message suffices
          setError(
            String(reason).replace(
              /^Error: Error invoking remote method '[^']+': Error: /,
              ''
            )
          )
      )
    },
    [onNoteOpened]
  )

  const applySaved = useCallback((content: string, mtimeMs: number) => {
    setNote((current) => (current ? { ...current, content, mtimeMs } : current))
  }, [])

  const reset = useCallback(() => {
    lastRequested.current = null
    setNote(null)
    setError(null)
  }, [])

  const rawHtml = useMemo(
    () => (note ? md.render(stripFrontmatter(note.content)) : ''),
    [note, md]
  )

  // Vault images render as data URLs (the sandboxed renderer cannot load
  // files): paint the note immediately, swap the sources in when the
  // assets arrive. Failed fetches keep their src (visible broken image —
  // honest, like a broken link).
  const [html, setHtml] = useState('')
  useEffect(() => {
    setHtml(rawHtml)
    if (!note) return
    const sources = vaultImageSources(rawHtml, note.relPath)
    if (sources.size === 0) return
    let cancelled = false
    void Promise.all(
      [...sources].map(async ([src, rel]) => {
        try {
          const asset = await window.atomik.readSourceAsset(rel)
          const dataUrl = await applyRotation(
            `data:${asset.mimeType};base64,${asset.base64}`,
            asset.rotation,
            asset.mimeType
          )
          return [src, dataUrl] as const
        } catch {
          return [src, null] as const
        }
      })
    ).then((pairs) => {
      if (cancelled) return
      const dataUrls = new Map<string, string>()
      for (const [src, dataUrl] of pairs) {
        if (dataUrl !== null) dataUrls.set(src, dataUrl)
      }
      if (dataUrls.size > 0) setHtml(inlineImageSources(rawHtml, dataUrls))
    })
    return () => {
      cancelled = true
    }
  }, [rawHtml, note])

  const onContentClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const anchor = (event.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href') ?? ''
      if (href.startsWith('#')) return
      event.preventDefault()
      if (/^(https?:|mailto:)/.test(href)) return
      if (!note) return
      const [rawPath, rawHash = ''] = href.split('#')
      const pathPart = decodeURIComponent(rawPath ?? '')
      const rel = resolveRelativePath(note.relPath, pathPart)
      if (!rel) return
      // citation return (S06): a PDF page link opens the source VIEWER
      // at the page (falling back to the dossier markdown if the host
      // can't open a viewer).
      const pdfTarget = pdfPageTarget(rel, rawHash)
      if (pdfTarget) {
        setPendingPdfPage(pdfTarget.dossierRel, pdfTarget.page)
        if (onOpenSourceView) onOpenSourceView(pdfTarget.dossierRel)
        else openNote(pdfTarget.dossierRel)
        return
      }
      // S06e (owner): a bare original.pdf link (no page) opens the
      // source view of its bundle — it used to be a dead click.
      if (rel.toLowerCase().endsWith('.pdf')) {
        const dossierRel = rel.replace(/[^/]+\.pdf$/i, 'source.md')
        if (onOpenSourceView) onOpenSourceView(dossierRel)
        else openNote(dossierRel)
        return
      }
      // S06e (owner): a dossier link opens the SOURCE VIEW (dossier +
      // original side by side), not the markdown editor.
      if (rel.split('/').pop() === 'source.md' && onOpenSourceView) {
        onOpenSourceView(rel)
        return
      }
      if (rel.endsWith('.md')) openNote(rel)
    },
    [note, openNote, onOpenSourceView]
  )

  return {
    note,
    html,
    error,
    setError,
    openNote,
    applySaved,
    reset,
    lastRequested,
    onContentClick
  }
}
