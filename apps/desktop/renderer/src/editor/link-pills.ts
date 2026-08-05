/**
 * Link pills (CP-MVP-009 S03, owner UI vision: "every links notes or
 * other type of linked documents … has a color pill depending on its
 * type and a little icon"). Pure helpers shared by the note-markdown
 * factory (render-time kind classing + icons) and the read view
 * (wikilink resolution + broken diagnostics).
 *
 * Doctrine (20 recast + ADR-011): every rendered link is an edge of
 * the semantic graph. The pill shows the NODE KIND of the target,
 * derived from the resolved target string — never stored in the note.
 * Unresolved wikilinks are a visible diagnostic, never auto-created,
 * never silently repaired.
 */

export type LinkKind =
  | 'note'
  | 'folder'
  | 'chat'
  | 'prompt'
  | 'pdf'
  | 'pdf-anchor'
  | 'web'
  | 'capture'
  | 'source'
  | 'media'

const MEDIA_EXT_RE = /\.(png|jpe?g|gif|webp|avif|mp3|wav|m4a|ogg|mp4|webm)$/

/** Node kind from a link target string (href or resolved vault path).
 *  Returns null for targets that are NOT graph edges and stay plain:
 *  same-document hashes, mailto, empty. */
export function classifyLinkKind(href: string): LinkKind | null {
  if (href === '' || href.startsWith('#') || /^mailto:/i.test(href)) return null
  const raw = href.toLowerCase()
  if (/^https?:/.test(raw)) return 'web'
  const [path = '', hash = ''] = raw.split('#')
  if (path.includes('sources/pdf/')) {
    return hash.includes('page=') ? 'pdf-anchor' : 'pdf'
  }
  if (path.includes('sources/web/')) return 'web'
  if (path.includes('sources/captures/')) return 'capture'
  if (path.endsWith('source.md')) return 'source'
  if (path.endsWith('.pdf')) return 'pdf'
  if (MEDIA_EXT_RE.test(path)) return 'media'
  if (path.endsWith('/index.md') || path === 'index.md') return 'folder'
  if (path.startsWith('chats/') || path.includes('/chats/')) return 'chat'
  if (path.startsWith('prompts/') || path.includes('/prompts/')) return 'prompt'
  return 'note'
}

/* Icons live in CSS as per-kind ::before masks (styles.css §Link
 * pills) so resolution swaps ONE class and the icon follows — no SVG
 * strings travel through the rendered HTML. */

/** A wikilink resolution candidate — quick-actions' NoteLink shape,
 *  proximity-ordered by the caller (nearest wins, the house rule). */
export type WikiCandidate = { name: string; relPath: string }

/** Resolve a `[[target]]` against proximity-ordered candidates:
 *  a target with `/` matches its vault-relative path (`.md` optional),
 *  a bare target matches the filename stem — both case-insensitive,
 *  first (= nearest) match wins. Null = broken (diagnostic). */
export function resolveWikiTarget(
  candidates: readonly WikiCandidate[],
  target: string
): string | null {
  const needle = target.trim().toLowerCase()
  if (needle.length === 0) return null
  if (needle.includes('/')) {
    const withMd = needle.endsWith('.md') ? needle : `${needle}.md`
    for (const c of candidates) {
      if (c.relPath.toLowerCase() === withMd) return c.relPath
    }
    return null
  }
  for (const c of candidates) {
    if (c.name.toLowerCase() === needle) return c.relPath
  }
  return null
}

const WIKI_ANCHOR_RE = /<a ([^>]*?)data-wiki="([^"]*)"([^>]*)>/g

const unescapeHtml = (s: string): string =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

const escapeAttr = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** Post-render wikilink resolution over the factory's HTML: a resolved
 *  target gains `data-rel` and its real kind class; an unresolved one
 *  gains the broken modifier. Same string-swap idiom as note-images. */
export function decorateWikiLinks(
  html: string,
  resolve: (target: string) => string | null
): string {
  return html.replace(WIKI_ANCHOR_RE, (whole, _before: string, target: string) => {
    const rel = resolve(unescapeHtml(target))
    if (rel === null) {
      return whole.replace('class="link-pill link-pill--note"', 'class="link-pill link-pill--note link-pill--broken"')
    }
    const kind = classifyLinkKind(rel) ?? 'note'
    const reclassed = whole.replace('link-pill--note', `link-pill--${kind}`)
    return reclassed.replace(
      `data-wiki="${target}"`,
      `data-wiki="${target}" data-rel="${escapeAttr(rel)}"`
    )
  })
}

/** Kebab label → human words ("repose-sur" → "repose sur") for the
 *  graph-relation sentence (S05d owner vision: hovering the in-pill
 *  graph icon reads "L'ethos repose sur la fiabilité"). */
export function humanizeLabel(label: string): string {
  return label.replace(/-/g, ' ')
}

/** The relation as a sentence: subject → label → target, reversed for
 *  `{^label}` edges. */
export function edgeSentence(
  subject: string,
  label: string,
  target: string,
  reverse: boolean
): string {
  const human = humanizeLabel(label)
  return reverse
    ? `${target} ${human} ${subject}`
    : `${subject} ${human} ${target}`
}

const EDGE_MARK_RE =
  /(<a [^>]*class="link-pill[^>]*>)([^<]*)(<span class="edge-mark[^"]*" data-edge-label="([^"]*)"(?:( data-edge-rev="1"))? title=")[^"]*(")/g

/** Post-render title upgrade for the in-pill graph marks: the factory
 *  emits "⟶ label"; a surface that knows the SUBJECT (the note being
 *  rendered) rewrites it into the full relation sentence
 *  ("L'ethos repose sur fiabilité"). String-swap idiom like the
 *  wikilink pass. */
export function decorateEdgeMarks(html: string, subject: string): string {
  return html.replace(
    EDGE_MARK_RE,
    (_whole, open: string, text: string, markOpen: string, label: string, rev: string | undefined, closeQuote: string) => {
      const sentence = edgeSentence(
        subject,
        unescapeHtml(label),
        unescapeHtml(text),
        rev !== undefined
      )
      return `${open}${text}${markOpen}${escapeAttr(sentence)}${closeQuote}`
    }
  )
}
