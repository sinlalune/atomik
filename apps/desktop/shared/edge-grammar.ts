/**
 * Edge grammar (CP-MVP-009 S02, ADR-011): the ONE parser for inline
 * typed edges — `[[target]]{label}`, reverse `[[target]]{^label}`, and
 * the same `{label}` decoration immediately after a standard Markdown
 * link. Pure and dependency-free (15); the markdown-it rendering rule,
 * the Lezer editor extension, and the main-side index scan all consume
 * THIS module so the grammar can never fork per surface.
 *
 * Grammar law (ADR-011):
 * - labels are kebab-case `[a-z0-9-]+`; anything else leaves the brace
 *   group as ordinary prose (pandoc `{.attr}` stays prose on the dot,
 *   `{<label}` stays prose — reverse is `{^label}` only)
 * - the decoration must IMMEDIATELY follow `]]` or `)`; any whitespace
 *   between link and brace makes it prose (no false positives)
 * - a wikilink target may not contain `]]` or a newline
 * - images (`![alt](src)`) are embeds, not edges
 * - links inside fenced blocks or inline code spans are code, not edges
 *
 * Not yet decided (do not invent): alias syntax inside `[[…]]` — the
 * inner text is exposed raw as `target`; splitting rules arrive only
 * through a reviewed ADR amendment.
 */

export type EdgeDecoration = { label: string; reverse: boolean }

export type ParsedEdge = {
  kind: 'wikilink' | 'md-link'
  /** Raw link target: wikilink inner text, or the md link href. */
  target: string
  /** Visible text: wikilink inner text, or the md link text. */
  text: string
  /** null = untyped edge (default semantics). */
  decoration: EdgeDecoration | null
  /** Offset of the link's first character (the `[` of `[[` / `[`). */
  start: number
  /** Offset just past the link INCLUDING its decoration when present. */
  end: number
  /** 1-based line, 0-based column of `start`. */
  line: number
  col: number
}

export const LABEL_RE = /^[a-z0-9-]+$/

/** Parse `{label}` / `{^label}` starting exactly at `pos`. Returns null
 *  when the text at `pos` is not a valid decoration (prose). */
export function matchDecorationAt(
  src: string,
  pos: number
): { label: string; reverse: boolean; length: number } | null {
  if (src.charCodeAt(pos) !== 123 /* { */) return null
  const close = src.indexOf('}', pos + 1)
  if (close < 0) return null
  let inner = src.slice(pos + 1, close)
  if (inner.includes('\n')) return null
  let reverse = false
  if (inner.startsWith('^')) {
    reverse = true
    inner = inner.slice(1)
  }
  if (!LABEL_RE.test(inner)) return null
  return { label: inner, reverse, length: close + 1 - pos }
}

/** Parse a wikilink (with optional immediate decoration) starting
 *  exactly at `pos` (which must point at `[[`). */
export function matchWikilinkAt(
  src: string,
  pos: number
): { target: string; decoration: EdgeDecoration | null; length: number } | null {
  if (!src.startsWith('[[', pos)) return null
  const close = src.indexOf(']]', pos + 2)
  if (close < 0) return null
  const target = src.slice(pos + 2, close)
  if (target.length === 0 || target.includes('\n') || target.includes('[[')) return null
  let length = close + 2 - pos
  let decoration: EdgeDecoration | null = null
  const deco = matchDecorationAt(src, pos + length)
  if (deco) {
    decoration = { label: deco.label, reverse: deco.reverse }
    length += deco.length
  }
  return { target, decoration, length }
}

/** Serialize an edge back to its inline form (round-trips with the
 *  matchers above). */
export function serializeWikilink(
  target: string,
  decoration: EdgeDecoration | null
): string {
  const base = `[[${target}]]`
  if (!decoration) return base
  return `${base}{${decoration.reverse ? '^' : ''}${decoration.label}}`
}

/** Normalize free label input to the grammar's kebab alphabet:
 *  lowercase, diacritics stripped ("définit" → "definit"), separators
 *  and invalid runs collapsed to single hyphens ("Part of" → "part-of"). */
export function normalizeLabel(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/* ------------------------------------------------------------------ */
/* Whole-document scan (index + diagnostics consumer)                  */
/* ------------------------------------------------------------------ */

const FENCE_RE = /^(```|~~~)/

/** Scan a full markdown document for edges — every wikilink (typed or
 *  not) and every standard md link (typed or not), skipping fenced
 *  blocks and inline code spans. Images are skipped. */
export function parseEdges(markdown: string): ParsedEdge[] {
  const edges: ParsedEdge[] = []
  const lines = markdown.split('\n')
  let offset = 0
  let inFence = false
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]!
    if (FENCE_RE.test(line.trimStart())) {
      inFence = !inFence
      offset += line.length + 1
      continue
    }
    if (!inFence) scanLine(line, li + 1, offset, edges)
    offset += line.length + 1
  }
  return edges
}

function scanLine(line: string, lineNo: number, lineOffset: number, out: ParsedEdge[]): void {
  let inCode = false
  for (let i = 0; i < line.length; i++) {
    const ch = line.charCodeAt(i)
    if (ch === 96 /* ` */) {
      inCode = !inCode
      continue
    }
    if (inCode) continue
    if (ch !== 91 /* [ */) continue
    if (i > 0 && line.charCodeAt(i - 1) === 33 /* ! */) {
      // image embed: skip past its bracket pair so its (src) never scans
      const closeBracket = line.indexOf(']', i)
      if (closeBracket > 0) i = closeBracket
      continue
    }
    const wiki = matchWikilinkAt(line, i)
    if (wiki) {
      out.push({
        kind: 'wikilink',
        target: wiki.target,
        text: wiki.target,
        decoration: wiki.decoration,
        start: lineOffset + i,
        end: lineOffset + i + wiki.length,
        line: lineNo,
        col: i
      })
      i += wiki.length - 1
      continue
    }
    const md = matchMdLinkAt(line, i)
    if (md) {
      out.push({
        kind: 'md-link',
        target: md.target,
        text: md.text,
        decoration: md.decoration,
        start: lineOffset + i,
        end: lineOffset + i + md.length,
        line: lineNo,
        col: i
      })
      i += md.length - 1
    }
  }
}

/** Parse a standard md link `[text](href)` (with optional immediate
 *  decoration) starting exactly at `pos`. Angle-bracketed destinations
 *  (`[t](<path>)`— the form the app's own @ menu inserts) are unwrapped
 *  exactly like markdown-it does, so every grammar consumer sees the
 *  same target as the read renderer (owner bench round 5: kept-raw
 *  brackets misclassified live pills and broke their clicks). Nested
 *  brackets in the text are not supported (documented limitation,
 *  consistent with the grammar's no-newline rule). */
export function matchMdLinkAt(
  src: string,
  pos: number
): { text: string; target: string; decoration: EdgeDecoration | null; length: number } | null {
  if (src.charCodeAt(pos) !== 91 /* [ */ || src.startsWith('[[', pos)) return null
  const closeText = src.indexOf(']', pos + 1)
  if (closeText < 0 || src.charCodeAt(closeText + 1) !== 40 /* ( */) return null
  const text = src.slice(pos + 1, closeText)
  if (text.includes('\n') || text.includes('[')) return null
  const closeHref = src.indexOf(')', closeText + 2)
  if (closeHref < 0) return null
  let target = src.slice(closeText + 2, closeHref)
  if (target.includes('\n') || target.includes('(')) return null
  if (target.startsWith('<') && target.endsWith('>')) {
    target = target.slice(1, -1)
  }
  let length = closeHref + 1 - pos
  let decoration: EdgeDecoration | null = null
  const deco = matchDecorationAt(src, pos + length)
  if (deco) {
    decoration = { label: deco.label, reverse: deco.reverse }
    length += deco.length
  }
  return { text, target, decoration, length }
}
