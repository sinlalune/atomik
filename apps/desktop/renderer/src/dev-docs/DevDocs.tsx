import MarkdownIt from 'markdown-it'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DevDocFile, DevDocsGroup } from '../../../shared/ipc-contract'
import { resolveRelativePath, stripFrontmatter } from './markdown'

const DEFAULT_DOC = 'index.md'

/** `#dev-docs:<relPath>` deep-links a doc at startup (dev and smoke use). */
function initialDoc(): string {
  const hash = window.location.hash
  if (hash.startsWith('#dev-docs:')) {
    const relPath = decodeURIComponent(hash.slice('#dev-docs:'.length))
    if (relPath.length > 0) return relPath
  }
  return DEFAULT_DOC
}

const svgDataUri = (content: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`

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
export function DevDocs(): React.JSX.Element {
  const [groups, setGroups] = useState<DevDocsGroup[]>([])
  const [doc, setDoc] = useState<DevDocFile | null>(null)
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const md = useMemo(() => new MarkdownIt({ html: false, linkify: false }), [])

  const openDoc = useCallback((relPath: string) => {
    window.atomik.readDevDoc(relPath).then(
      (file) => {
        setDoc(file)
        setError(null)
      },
      (reason: unknown) => setError(String(reason))
    )
  }, [])

  useEffect(() => {
    window.atomik
      .listDevDocs()
      .then(setGroups, (reason: unknown) => setError(String(reason)))
    openDoc(initialDoc())
  }, [openDoc])

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
    <div className="devdocs">
      <nav className="devdocs-tree" aria-label="Documentation tree">
        {groups.map((group) => (
          <section key={group.id}>
            <h2>{group.label}</h2>
            <ul>
              {group.entries.map((entry) => (
                <li key={entry.relPath}>
                  <button
                    type="button"
                    className={doc?.relPath === entry.relPath ? 'active' : ''}
                    onClick={() => openDoc(entry.relPath)}
                  >
                    {entry.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
      <div
        className="devdocs-content"
        onClick={onContentClick}
        {...(rendered ? { 'data-devdocs-rendered': '1' } : {})}
      >
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
