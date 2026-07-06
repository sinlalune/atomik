import MarkdownIt from 'markdown-it'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { VaultNoteFile } from '../../../shared/ipc-contract'
import { resolveRelativePath, stripFrontmatter } from '../dev-docs/markdown'

/**
 * Shared note-reading logic for vault-backed views (VaultView,
 * ProjectView): open a note through the bridge, render it, follow
 * relative .md links, and never self-retry a failing path.
 */
export function useVaultNote(onNoteOpened?: (relPath: string) => void): {
  note: VaultNoteFile | null
  html: string
  error: string | null
  setError: (error: string | null) => void
  openNote: (relPath: string) => void
  /** Syncs the held note after an editor save (content + fresh mtime). */
  applySaved: (content: string, mtimeMs: number) => void
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
        (reason: unknown) => setError(String(reason))
      )
    },
    [onNoteOpened]
  )

  const applySaved = useCallback((content: string, mtimeMs: number) => {
    setNote((current) => (current ? { ...current, content, mtimeMs } : current))
  }, [])

  const html = useMemo(
    () => (note ? md.render(stripFrontmatter(note.content)) : ''),
    [note, md]
  )

  const onContentClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const anchor = (event.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href') ?? ''
      if (href.startsWith('#')) return
      event.preventDefault()
      if (/^(https?:|mailto:)/.test(href)) return
      if (!note) return
      const pathPart = decodeURIComponent(href.split('#')[0] ?? '')
      const rel = resolveRelativePath(note.relPath, pathPart)
      if (rel && rel.endsWith('.md')) openNote(rel)
    },
    [note, openNote]
  )

  return {
    note,
    html,
    error,
    setError,
    openNote,
    applySaved,
    lastRequested,
    onContentClick
  }
}
