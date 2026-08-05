import { classifyLinkKind } from '../../../shared/graph-core'

/**
 * Link pills (CP-MVP-009 S03, owner UI vision: "every links notes or
 * other type of linked documents … has a color pill depending on its
 * type and a little icon"). Renderer-side helpers over the SHARED
 * graph core (S06 moved classification/resolution/titles to
 * shared/graph-core so the main-side index seat can never fork from
 * the surfaces).
 *
 * Doctrine (20 recast + ADR-011): every rendered link is an edge of
 * the semantic graph. The pill shows the NODE KIND of the target,
 * derived from the resolved target string — never stored in the note.
 * Unresolved wikilinks are a visible diagnostic, never auto-created,
 * never silently repaired.
 *
 * Icons live in CSS as per-kind ::before masks (styles.css §Link
 * pills) so resolution swaps ONE class and the icon follows — no SVG
 * strings travel through the rendered HTML.
 */

export {
  classifyLinkKind,
  firstHeadingOf,
  resolveRelativeTarget,
  resolveWikiTarget,
  wikiCandidatesFor
} from '../../../shared/graph-core'
export type { LinkKind, WikiCandidate } from '../../../shared/graph-core'

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
      return whole.replace(
        'class="link-pill link-pill--note"',
        'class="link-pill link-pill--note link-pill--broken"'
      )
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
  /(<a ([^>]*)class="link-pill[^>]*>)([^<]*)(<span class="edge-mark[^"]*" data-edge-label="([^"]*)"(?:( data-edge-rev="1"))? title=")[^"]*(")/g

const attrOf = (tag: string, name: string): string | null => {
  const match = new RegExp(`${name}="([^"]*)"`).exec(tag)
  return match ? unescapeHtml(match[1]!) : null
}

/** Post-render title upgrade for the in-pill graph marks: the factory
 *  emits "⟶ label"; a surface that knows the SUBJECT (the note being
 *  rendered) rewrites it into the full relation sentence
 *  ("L'ethos repose sur La crédibilité"). `titleOf` (S06/S06b) turns
 *  the anchor's own target — `data-rel` for resolved wikilinks, the
 *  raw `href` for md links — into the linked note's title through the
 *  index; the visible pill text is only the last-resort fallback. */
export function decorateEdgeMarks(
  html: string,
  subject: string,
  titleOf?: (target: { rel: string | null; href: string | null }) => string | null
): string {
  return html.replace(
    EDGE_MARK_RE,
    (
      _whole,
      open: string,
      attrs: string,
      text: string,
      markOpen: string,
      label: string,
      rev: string | undefined,
      closeQuote: string
    ) => {
      const rel = attrOf(attrs, 'data-rel')
      const href = attrOf(attrs, 'href')
      const target =
        titleOf?.({ rel, href: href === '#' ? null : href }) ?? unescapeHtml(text)
      const sentence = edgeSentence(
        subject,
        unescapeHtml(label),
        target,
        rev !== undefined
      )
      return `${open}${text}${markOpen}${escapeAttr(sentence)}${closeQuote}`
    }
  )
}
