import { noteMarkdown } from '../editor/note-markdown'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { VaultNoteFile } from '../../../shared/ipc-contract'
import { resolveRelativePath, stripFrontmatter } from '../dev-docs/markdown'
import { isMediaFilePath } from '../source/dossier'
import { applyRotation } from '../source/rotate'
import { pdfPageTarget, setPendingPdfPage } from '../source/pdf-open'
import { inlineImageSources, vaultImageSources } from './note-images'
import { getCachedImage, isCachedDataUrl, setCachedImage } from './image-cache'
import { decorateEdgeMarks, decorateWikiLinks, resolveWikiTarget } from '../editor/link-pills'
import { linkableNotesOf } from '../editor/quick-actions'

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
  onOpenSourceView?: (dossierRel: string) => void,
  /** How EXTERNAL http(s) links open (S04b, owner report: the web
   *  dossier's "Original URL" was a dead click): the host opens a web
   *  tab. Absent → the click stays inert (never in-place navigation). */
  onOpenWebUrl?: (url: string) => void
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
    () => noteMarkdown(),
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

  const rawHtml = useMemo(() => {
    if (!note) return ''
    const html = md.render(stripFrontmatter(note.content))
    // The graph marks read as a sentence with THIS note as subject
    // (S05d): "L'ethos repose sur fiabilité" on hover.
    const subject = (note.relPath.split('/').pop() ?? '').replace(/\.md$/i, '')
    return html.includes('edge-mark') ? decorateEdgeMarks(html, subject) : html
  }, [note, md])

  // Vault images render as data URLs (the sandboxed renderer cannot load
  // files): paint the note immediately, swap the sources in when the
  // assets arrive. Failed fetches keep their src (visible broken image —
  // honest, like a broken link).
  const [html, setHtml] = useState('')
  useEffect(() => {
    setHtml(rawHtml)
    if (!note) return
    let cancelled = false
    // Sequential decoration over one `current` so the async passes
    // (wikilink resolution, image data URLs) compose instead of
    // clobbering each other's setHtml.
    let current = rawHtml
    const apply = (next: string): void => {
      current = next
      if (!cancelled) setHtml(next)
    }
    // Wikilink resolution (CP-MVP-009 S03): nearest-wins over the
    // same proximity order as the @ menu; unresolved stays the broken
    // diagnostic pill (never auto-created).
    if (rawHtml.includes('data-wiki')) {
      window.atomik.listVaultFiles().then(
        (tree) => {
          if (cancelled) return
          const candidates = linkableNotesOf(tree, note.relPath)
          apply(
            decorateWikiLinks(current, (target) =>
              resolveWikiTarget(candidates, target)
            )
          )
        },
        () => {}
      )
    }
    const cleanup = (): void => {
      cancelled = true
    }
    const sources = vaultImageSources(rawHtml, note.relPath)
    if (sources.size === 0) return cleanup
    void Promise.all(
      [...sources].map(async ([src, rel]) => {
        // the SHARED bounded cache (with live mode): an autosave used to
        // re-fetch every inline image over IPC — now it hits here
        const cached = getCachedImage(rel)
        if (isCachedDataUrl(cached)) return [src, cached] as const
        if (cached === 'failed') return [src, null] as const
        try {
          const asset = await window.atomik.readSourceAsset(rel)
          const dataUrl = await applyRotation(
            `data:${asset.mimeType};base64,${asset.base64}`,
            asset.rotation,
            asset.mimeType
          )
          setCachedImage(rel, dataUrl)
          return [src, dataUrl] as const
        } catch {
          setCachedImage(rel, 'failed')
          return [src, null] as const
        }
      })
    ).then((pairs) => {
      if (cancelled) return
      const dataUrls = new Map<string, string>()
      for (const [src, dataUrl] of pairs) {
        if (dataUrl !== null) dataUrls.set(src, dataUrl)
      }
      if (dataUrls.size > 0) apply(inlineImageSources(current, dataUrls))
    })
    return cleanup
  }, [rawHtml, note])

  const onContentClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const anchor = (event.target as HTMLElement).closest('a')
      if (!anchor) return
      // Wikilink pills (S03) carry href="#" — route them by their
      // resolved data-rel BEFORE the hash guard. Unresolved (broken
      // pill) stays inert: a diagnostic, never an auto-create.
      const wiki = anchor.getAttribute('data-wiki')
      if (wiki !== null) {
        event.preventDefault()
        const rel = anchor.getAttribute('data-rel')
        if (rel && rel.endsWith('.md')) openNote(rel)
        return
      }
      const href = anchor.getAttribute('href') ?? ''
      if (href.startsWith('#')) return
      event.preventDefault()
      // S04b (owner: "Original URL did nothing"): the web is one tab
      // away — external links open there. mailto stays inert.
      if (/^https?:/i.test(href)) {
        onOpenWebUrl?.(href)
        return
      }
      if (/^mailto:/i.test(href)) return
      if (!note) return
      const [rawPath, rawHash = ''] = href.split('#')
      const pathPart = decodeURIComponent(rawPath ?? '')
      const rel = resolveRelativePath(note.relPath, pathPart)
      if (!rel) return
      // S04b: the snapshot is evidence, not a note — open it the way
      // the OS knows how (same escape hatch as audio originals).
      if (rel.toLowerCase().endsWith('.mhtml')) {
        void window.atomik.openSourceExternally(rel).catch(() => {})
        return
      }
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
      // S04b (owner, same class): image and audio ORIGINALS too — every
      // dossier's "Original photo/audio" link was equally dead.
      if (rel.toLowerCase().endsWith('.pdf') || isMediaFilePath(rel)) {
        const dossierRel = rel.replace(/[^/]+$/, 'source.md')
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
    [note, openNote, onOpenSourceView, onOpenWebUrl]
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
