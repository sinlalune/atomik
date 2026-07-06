import MarkdownIt from 'markdown-it'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DevDocFile, DevDocsGroup } from '../../../shared/ipc-contract'
import { SidebarToggleIcon } from '../icons'
import { resolveRelativePath, stripFrontmatter } from './markdown'

const DEFAULT_DOC = 'index.md'

export type DevDocsProps = {
  /** Doc to show; changes are applied, identical values are ignored. */
  docPath?: string
  /** Reports every successfully opened doc (the tab persists it). */
  onDocOpened?: (relPath: string) => void
  /** Tree panel visibility, persisted per tab by the workspace. */
  treeCollapsed?: boolean
  onTreeToggle?: () => void
}

const svgDataUri = (content: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`

/** `.md` is implied in displayed names; other extensions stay. Labels can
 *  carry a subpath prefix (`archive/04_x.md`) which must survive. */
const docLabel = (label: string): string =>
  label.toLowerCase().endsWith('.md') ? label.slice(0, -3) : label

/**
 * Inlines relative SVG images (the bedrock diagrams) into the rendered HTML
 * string via a detached document, BEFORE React renders it. Post-render DOM
 * mutation is deliberately avoided: React owns the article's innerHTML and
 * re-committing it discards manual edits (found the hard way at S03).
 */
async function inlineSvgImages(
  rawHtml: string,
  docRelPath: string
): Promise<string> {
  const parsed = new DOMParser().parseFromString(rawHtml, 'text/html')
  const images = Array.from(parsed.querySelectorAll('img'))
  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute('src') ?? ''
      if (/^(https?:|data:)/.test(src)) return
      const rel = resolveRelativePath(docRelPath, src)
      if (!rel || !rel.endsWith('.svg')) return
      try {
        const file = await window.atomik.readDevDoc(rel)
        img.setAttribute('src', svgDataUri(file.content))
      } catch {
        // leave the image broken rather than failing the whole page
      }
    })
  )
  return parsed.body.innerHTML
}

/**
 * Dev Docs tab, MVP slice of 16: docs tree left, rendered Markdown center,
 * reading the real files under docs/ through the typed bridge. Advanced
 * modes (agent/architecture/context/execution views) are later milestones.
 */
export function DevDocs({
  docPath,
  onDocOpened,
  treeCollapsed,
  onTreeToggle
}: DevDocsProps): React.JSX.Element {
  const [groups, setGroups] = useState<DevDocsGroup[]>([])
  const [doc, setDoc] = useState<DevDocFile | null>(null)
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Guards the docPath effect against re-requesting a path that already
  // failed or is in flight (a failing prop would otherwise retry forever).
  const lastRequested = useRef<string | null>(null)

  const md = useMemo(() => new MarkdownIt({ html: false, linkify: false }), [])

  const openDoc = useCallback(
    (relPath: string) => {
      lastRequested.current = relPath
      window.atomik.readDevDoc(relPath).then(
        (file) => {
          setDoc(file)
          setError(null)
          onDocOpened?.(file.relPath)
        },
        (reason: unknown) => setError(String(reason))
      )
    },
    [onDocOpened]
  )

  useEffect(() => {
    window.atomik
      .listDevDocs()
      .then(setGroups, (reason: unknown) => setError(String(reason)))
  }, [])

  useEffect(() => {
    const target = docPath ?? DEFAULT_DOC
    if (lastRequested.current === target) return
    openDoc(target)
  }, [docPath, openDoc])

  // Markdown -> HTML -> inlined assets, all before handing the string to
  // React. `html !== null` is the rendered signal for the smoke check.
  useEffect(() => {
    setHtml(null)
    if (!doc || doc.kind !== 'markdown') return
    let cancelled = false
    const raw = md.render(stripFrontmatter(doc.content))
    void inlineSvgImages(raw, doc.relPath).then((finalHtml) => {
      if (!cancelled) setHtml(finalHtml)
    })
    return () => {
      cancelled = true
    }
  }, [doc, md])

  // Markdown cross-links stay inside the viewer; external links are inert
  // until a vetted opener exists (the main process denies navigation anyway).
  const onContentClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const anchor = (event.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href') ?? ''
      if (href.startsWith('#')) return
      event.preventDefault()
      if (/^(https?:|mailto:)/.test(href)) return
      if (!doc) return
      const pathPart = decodeURIComponent(href.split('#')[0] ?? '')
      const rel = resolveRelativePath(doc.relPath, pathPart)
      if (rel && /\.(md|json|svg)$/.test(rel)) openDoc(rel)
    },
    [doc, openDoc]
  )

  const rendered =
    doc !== null && (doc.kind !== 'markdown' ? true : html !== null)

  return (
    <div className={`devdocs${treeCollapsed ? ' no-tree' : ''}`}>
      {!treeCollapsed && (
        <nav className="devdocs-tree" aria-label="Documentation tree">
          <div className="tree-bar">
            <span className="tree-bar-label">documentation</span>
            {onTreeToggle && (
              <button
                type="button"
                className="tree-toggle"
                title="Hide tree panel"
                onClick={onTreeToggle}
              >
                <SidebarToggleIcon />
              </button>
            )}
          </div>
          {groups.map((group) => (
            <details key={group.id} open>
              <summary>{group.label}</summary>
              <ul>
                {group.entries.map((entry) => (
                  <li key={entry.relPath}>
                    <button
                      type="button"
                      className={doc?.relPath === entry.relPath ? 'active' : ''}
                      onClick={() => openDoc(entry.relPath)}
                    >
                      {docLabel(entry.label)}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </nav>
      )}
      <div
        className="devdocs-content"
        onClick={onContentClick}
        {...(rendered ? { 'data-devdocs-rendered': '1' } : {})}
      >
        {treeCollapsed && onTreeToggle && (
          <button
            type="button"
            className="tree-toggle tree-show"
            title="Show tree panel"
            onClick={onTreeToggle}
          >
            <SidebarToggleIcon />
          </button>
        )}
        {error ? (
          <p className="error">{error}</p>
        ) : !doc ? (
          <p>loading…</p>
        ) : doc.kind === 'markdown' ? (
          <article
            className="markdown-body"
            // Trusted local repository docs, rendered with html:false.
            dangerouslySetInnerHTML={{ __html: html ?? '' }}
          />
        ) : doc.kind === 'svg' ? (
          <img
            className="devdocs-svg"
            alt={doc.relPath}
            src={svgDataUri(doc.content)}
          />
        ) : (
          <pre className="devdocs-json">{doc.content}</pre>
        )}
      </div>
    </div>
  )
}
