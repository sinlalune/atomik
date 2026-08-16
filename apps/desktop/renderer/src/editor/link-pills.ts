import { classifyLinkKind, type LinkKind } from '../../../shared/graph-core'

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

/**
 * The two web-looking destinations need a non-colour cue. Keep the wording in
 * one renderer helper so read and live expose the same accessible distinction.
 */
export function linkKindDescription(kind: LinkKind): string | null {
  if (kind === 'web') return 'External web link'
  if (kind === 'web-source') return 'Captured web source'
  return null
}

function withLinkKindDescription(open: string, kind: LinkKind): string {
  const description = linkKindDescription(kind)
  if (description === null) return open
  if (/\saria-description="[^"]*"/.test(open)) {
    return open.replace(
      /\saria-description="[^"]*"/,
      ` aria-description="${description}"`
    )
  }
  return open.replace(/>$/, ` aria-description="${description}">`)
}

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
    return withLinkKindDescription(reclassed, kind).replace(
      `data-wiki="${target}"`,
      `data-wiki="${target}" data-rel="${escapeAttr(rel)}"`
    )
  })
}

const stemOf = (path: string): string =>
  (path.split('/').pop() ?? path).replace(/\.md$/i, '')

/**
 * What a pill SHOWS (S07b owner bench: "we need to display first
 * title of note pills instead of file name … easier to modify that
 * directly file name").
 *
 * The @ menu writes `[crédibilité](<crédibilité.md>)` and a wikilink
 * writes its target — both name the FILE. When the pill names the
 * file, show the note's first heading instead: the title is the thing
 * the owner edits, the filename is not.
 *
 * Authored text that is NOT the file's name is deliberate wording and
 * stays untouched — a pill inside a sentence keeps the sentence's
 * words. Pure, so read and live can never disagree.
 */
export function pillDisplayText(
  authored: string,
  target: string | null,
  title: string | null
): string {
  if (title === null || title.length === 0 || target === null) return authored
  const written = authored.trim().toLowerCase()
  if (written.length === 0) return authored
  // The rendered href is percent-encoded (markdown-it normalizes
  // `<crédibilité.md>`), so compare against the DECODED path or an
  // accented filename never matches its own pill text.
  let decoded = target
  try {
    decoded = decodeURIComponent(target)
  } catch {
    /* malformed escape: compare raw */
  }
  const path = decoded.toLowerCase()
  const namesTheFile =
    written === stemOf(path) ||
    written === path ||
    written === path.replace(/\.md$/i, '')
  return namesTheFile ? title : authored
}

const PILL_TEXT_RE = /(<a ([^>]*class="link-pill[^"]*"[^>]*)>)([^<]*)/g

const escapeText = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Post-render title swap for every pill in the read view: the pill's
 *  own target (`data-rel` for resolved wikilinks, `data-wiki` for
 *  unresolved ones, the raw `href` for md links) decides what it
 *  names, and `titleOf` supplies the note's heading. Same string-swap
 *  idiom as decorateWikiLinks; runs AFTER it, so `data-rel` is
 *  already there. */
export function decorateLinkTitles(
  html: string,
  titleOf: (target: { rel: string | null; href: string | null }) => string | null
): string {
  return html.replace(
    PILL_TEXT_RE,
    (_whole, open: string, attrs: string, text: string) => {
      const rel = attrOf(attrs, 'data-rel')
      const href = attrOf(attrs, 'href')
      const wiki = attrOf(attrs, 'data-wiki')
      const target = rel ?? (href === '#' ? wiki : href)
      if (target === null) return `${open}${text}`
      const title = titleOf({ rel, href: href === '#' ? null : href })
      const shown = pillDisplayText(unescapeHtml(text), target, title)
      return `${open}${escapeText(shown)}`
    }
  )
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
