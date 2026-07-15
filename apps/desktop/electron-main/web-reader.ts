import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { parseHTML } from 'linkedom'
import { Readability } from '@mozilla/readability'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import type { ActionTraceLedger } from './action-trace'
import { imageExtension, parseMhtml } from './mhtml'
import { readNote, resolveNotePath, writeNote } from './vault'

/**
 * Reader extraction for web sources (CP-MVP-006 S05, bedrock 09): the
 * captured snapshot.mhtml becomes a visibly DERIVED `reader.md` — the
 * page's main content as Markdown, TEXT AND IMAGES (figures + the SVG
 * math renders that matter for study material land in `media/`, hashed,
 * referenced relatively). Extraction runs in MAIN over the on-disk
 * snapshot (never a re-fetch; the display path never sources a derived
 * file). ONE ActionTrace per run (33). `wx` no-clobber: once a human
 * edits reader.md the correction lives there; Delete reader… is the
 * explicit re-run (owner's standing lifecycle rule).
 */

const MEDIA_DIRNAME = 'media'
/** Skip tracking/spacer pixels and anything implausibly large for a
 *  study figure (the snapshot already bounded the page). */
const MIN_IMAGE_BYTES = 64
const MAX_IMAGE_BYTES = 12 * 1024 * 1024

export type ReaderExtraction = {
  title: string
  markdown: string
  imageCount: number
}

type DomElement = {
  tagName: string
  textContent: string | null
  innerHTML: string
  querySelector: (s: string) => DomElement | null
  querySelectorAll: (s: string) => ArrayLike<DomElement>
}
type DomDocument = {
  querySelector: (s: string) => DomElement | null
  querySelectorAll: (s: string) => ArrayLike<DomElement>
}

/** Selectors for the main content container, strongest first. Covers
 *  Wikipedia (mw-parser-output), semantic HTML (main / [role=main] /
 *  article), and common CMS content wrappers. The first match with real
 *  text AND at least one heading wins — that heading requirement is what
 *  distinguishes a structured article from a chrome wrapper. */
const CONTENT_ROOTS = [
  '#mw-content-text .mw-parser-output',
  '#mw-content-text',
  'main .mw-parser-output',
  '[role="main"]',
  'main',
  'article',
  '#content .post',
  '.post-content',
  '.article-content',
  '.entry-content',
  '#bodyContent'
]

/** Chrome to strip from the picked content root before conversion — the
 *  cruft Readability would have removed, minus the headings it wrongly
 *  takes with it. Kept conservative: content-bearing tables (infoboxes)
 *  stay, only navigation/edit/reference furniture goes. */
const CHROME_SELECTORS = [
  'nav',
  'aside',
  'footer',
  'header[role]',
  'script',
  'style',
  'noscript',
  'form',
  'link',
  '.mw-editsection',
  '.mw-jump-link',
  '.noprint',
  '.navbox',
  '.vertical-navbox',
  '.toc',
  '#toc',
  '.mw-indicators',
  '.catlinks',
  '.printfooter',
  '.mw-references-wrap',
  '.reflist',
  '.sistersitebox',
  '.metadata.mbox-small',
  '[role="navigation"]',
  '[role="complementary"]',
  '.hatnote',
  '.shortdescription'
]

export function findContentRoot(document: DomDocument): DomElement | null {
  for (const selector of CONTENT_ROOTS) {
    const node = document.querySelector(selector)
    if (!node) continue
    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim()
    const hasHeading = node.querySelector('h1,h2,h3') !== null
    if (text.length >= 500 && hasHeading) return node
  }
  return null
}

export function stripChrome(root: DomElement): void {
  for (const selector of CHROME_SELECTORS) {
    for (const node of Array.from(root.querySelectorAll(selector))) {
      ;(node as unknown as { remove?: () => void }).remove?.()
    }
  }
}

/** Parse the on-disk snapshot and extract — the durable-import path. */
export function readerFromSnapshot(
  snapshot: Buffer,
  pageUrl: string
): { title: string; markdown: string; media: Array<{ name: string; bytes: Buffer }> } {
  const { html, resources } = parseMhtml(snapshot)
  return readerFromHtml(html, pageUrl, resources)
}

/**
 * The extraction core (S05e), shared by the durable snapshot import and
 * the LIVE reader-mode toggle (S06). Structure-first content pick,
 * chrome strip, table normalization, markdown. Images resolve against
 * `resources` (the snapshot's embedded parts, or data: URIs); the live
 * reader passes an EMPTY map, so its remote images simply drop — a
 * transient read is text+structure, durability is Import-as-source.
 */
export function readerFromHtml(
  html: string,
  pageUrl: string,
  resources: Map<string, { contentType: string; bytes: Buffer }>
): { title: string; markdown: string; media: Array<{ name: string; bytes: Buffer }> } {
  const { document } = parseHTML(html)
  const docTitle = (document.querySelector('title')?.textContent ?? '').trim()

  // Structure-first extraction (S05e, owner: "récupérer les balises de
  // hiérarchie"). Readability RASES the section headings on reference
  // HTML (Wikipedia Parsoid: h2/h3/h4 → gone), leaving a flat wall. So
  // FIRST try to grab the real content container ourselves and strip the
  // chrome — headings, lists, and structure survive. Only when no strong
  // container is found do we fall back to Readability (the generic
  // article path), then to the whole body.
  const root = findContentRoot(document)
  let title = docTitle || new URL(pageUrl).hostname
  let contentHtml: string
  if (root) {
    stripChrome(root)
    contentHtml = root.innerHTML
    const h1 = document.querySelector('h1')
    title = (h1?.textContent ?? '').trim() || title
  } else {
    const { document: readableDoc } = parseHTML(html)
    const article = new Readability(readableDoc as unknown as Document, {
      charThreshold: 200
    }).parse()
    title = (article?.title ?? '').trim() || title
    contentHtml =
      article?.content && article.content.trim().length > 0
        ? article.content
        : (document.body?.innerHTML ?? '')
  }

  // Re-parse the article fragment so we can rewrite <img> src to local
  // media paths BEFORE turndown sees them. linkedom drops a BARE <body>
  // (no <html>) on the floor — wrap it fully or the body comes back empty.
  const { document: frag } = parseHTML(`<html><body>${contentHtml}</body></html>`)
  const media: Array<{ name: string; bytes: Buffer }> = []
  // dedup by CONTENT hash, not by src URL: two different URLs can carry
  // identical bytes (a shared icon), and both must map to the ONE media
  // file — writing the same name twice with wx is the owner's EEXIST.
  const written = new Set<string>()
  for (const img of Array.from(frag.querySelectorAll('img'))) {
    const src = img.getAttribute('src') ?? ''
    let bytes: Buffer | null = null
    let ext = '.bin'
    if (src.startsWith('data:')) {
      const match = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(src)
      if (match) {
        bytes = match[2]
          ? Buffer.from(match[3]!, 'base64')
          : Buffer.from(decodeURIComponent(match[3]!), 'utf8')
        ext = imageExtension(match[1]!)
      }
    } else {
      const resource = resources.get(src)
      if (resource) {
        bytes = resource.bytes
        ext = imageExtension(resource.contentType)
      }
    }
    if (!bytes || bytes.length < MIN_IMAGE_BYTES || bytes.length > MAX_IMAGE_BYTES) {
      img.remove()
      continue
    }
    const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
    const name = `${digest}${ext}`
    if (!written.has(name)) {
      written.add(name)
      media.push({ name, bytes })
    }
    img.setAttribute('src', `./${MEDIA_DIRNAME}/${name}`)
    img.removeAttribute('srcset')
  }

  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-'
  })
  turndown.use(gfm)
  // gfm converts tables with a proper header ROW; everything else
  // (Wikipedia infoboxes: row-headers, colspan, multi-block cells)
  // would survive as raw HTML — literal tag soup in the vault renderer
  // (owner report). normalizeTables upgrades what CAN be a faithful
  // markdown table and flattens what can't; stripLeftoverHtml nets any
  // remainder.
  normalizeTables(frag)
  const markdown = stripLeftoverHtml(turndown.turndown(frag.body.innerHTML)).trim()
  return { title, markdown, media }
}

/**
 * Table triage (owner: "why not a markdown table?"): a GFM pipe table
 * REQUIRES a header row and single-line cells. So —
 * - header-row tables: left for gfm (it converts them faithfully);
 * - REGULAR row-header tables (consistent column count, no
 *   colspan/rowspan, no nested table, no block children in cells):
 *   PROMOTED — an empty <thead> row is prepended so gfm converts them
 *   into a real pipe table, inline formatting preserved;
 * - everything else (infobox monsters): flattened to one readable
 *   "cells — joined" paragraph per row — a broken pipe grid would be
 *   worse than text. In-cell <br> becomes " · " either way.
 */
/**
 * Repeat merged cells into a full grid (owner: "why not just repeat the
 * headers in each column, even if less aesthetic"): every colspan/rowspan
 * is duplicated (a clone per covered column, carried down per covered
 * row), so a table that was irregular only because of spans becomes a
 * clean rectangle the promotion path can turn into a real pipe table.
 * Rebuilds each <tr>'s cells from a span-aware matrix. Flat tables only.
 */
function expandCellSpans(table: Element): void {
  const directRows = Array.from(table.querySelectorAll('tr'))
  const matrix: Element[][] = []
  const carry: Array<{ cell: Element; rowsLeft: number } | null> = []
  directRows.forEach((row, r) => {
    matrix[r] = matrix[r] ?? []
    const cells = Array.from(row.children).filter(
      (cell) => cell.tagName === 'TH' || cell.tagName === 'TD'
    )
    let col = 0
    const place = (cell: Element, rowSpan: number): void => {
      while (matrix[r]![col] !== undefined) col += 1
      matrix[r]![col] = cell
      for (let extra = 1; extra < rowSpan; extra++) {
        carry[col] = { cell, rowsLeft: rowSpan - extra }
      }
      col += 1
    }
    // first, drop any cells carried down from a rowspan above
    for (let c = 0; c < carry.length; c++) {
      const pending = carry[c]
      if (pending && pending.rowsLeft > 0) {
        matrix[r]![c] = pending.cell.cloneNode(true) as Element
        pending.rowsLeft -= 1
        if (pending.rowsLeft === 0) carry[c] = null
      }
    }
    for (const cell of cells) {
      const colSpan = Math.max(1, Math.min(50, Number(cell.getAttribute('colspan') ?? '1') || 1))
      const rowSpan = Math.max(1, Math.min(500, Number(cell.getAttribute('rowspan') ?? '1') || 1))
      for (let n = 0; n < colSpan; n++) {
        place(n === 0 ? cell : (cell.cloneNode(true) as Element), rowSpan)
      }
    }
  })
  // rebuild each row from the matrix, spans stripped
  directRows.forEach((row, r) => {
    const line = matrix[r] ?? []
    for (const child of Array.from(row.children)) child.remove()
    for (const cell of line) {
      if (!cell) continue
      cell.removeAttribute('colspan')
      cell.removeAttribute('rowspan')
      row.appendChild(cell)
    }
  })
}

export function normalizeTables(root: { querySelectorAll: (s: string) => ArrayLike<Element> }): void {
  for (const table of Array.from(root.querySelectorAll('table'))) {
    const doc = table.ownerDocument
    if (!doc) continue
    // multi-line cells break pipe tables and smear flatten output alike
    for (const br of Array.from(table.querySelectorAll('br'))) {
      br.parentNode?.replaceChild(doc.createTextNode(' · '), br)
    }
    const nested = table.querySelector('table') !== null
    // EXPAND merged cells (owner: "repeat the headers in each column"):
    // colspan/rowspan get duplicated into a full grid, so a table that
    // only looked irregular because of spans becomes REGULAR and gets
    // promoted to a real pipe table. Skip nested tables (they flatten).
    if (!nested) expandCellSpans(table)
    const rows = Array.from(table.querySelectorAll('tr'))
    // DIRECT cell children only — a descendant query would pull a nested
    // table's cells into the parent row (duplication)
    const grid = rows.map((row) =>
      Array.from(row.children).filter(
        (cell) => cell.tagName === 'TH' || cell.tagName === 'TD'
      )
    )
    const firstCells = grid[0] ?? []
    const hasHeaderRow = firstCells.length > 0 && firstCells.every((c) => c.tagName === 'TH')
    if (hasHeaderRow) continue // gfm converts these cleanly

    const blockCells = grid.some((cells) =>
      cells.some((cell) => cell.querySelector('div,p,ul,ol,blockquote,h1,h2,h3') !== null)
    )
    const columnCounts = new Set(grid.map((cells) => cells.length))
    const regular =
      !nested &&
      !blockCells &&
      columnCounts.size === 1 &&
      (grid[0]?.length ?? 0) >= 2

    if (regular) {
      // promote: an empty header row makes it a valid GFM table; gfm
      // then converts cells with their inline markdown (links, images)
      const thead = doc.createElement('thead')
      const headRow = doc.createElement('tr')
      for (let i = 0; i < grid[0]!.length; i++) {
        headRow.appendChild(doc.createElement('th'))
      }
      thead.appendChild(headRow)
      table.insertBefore(thead, table.firstChild)
      continue
    }

    // flatten to one readable paragraph per row. Build with REAL nodes,
    // not a string: text as text nodes, images as CLONED <img> elements
    // (turndown then emits proper `![](./media/…)` — a stringified ref
    // set as textContent would be escaped to literal `\![\]\(…\)`, the
    // owner's bug). Consecutive identical cells (colspan expansion's
    // "X — X") are deduped.
    const block = doc.createElement('div')
    for (const cells of grid) {
      const p = doc.createElement('p')
      let prevText: string | null = null
      for (const cell of cells) {
        const text = (cell.textContent ?? '').replace(/\s+/g, ' ').trim()
        const images = Array.from(cell.querySelectorAll('img'))
        if (text.length === 0 && images.length === 0) continue
        if (images.length === 0 && text === prevText) continue // colspan dup
        prevText = text
        if (p.childNodes.length > 0) p.appendChild(doc.createTextNode(' — '))
        if (text.length > 0) p.appendChild(doc.createTextNode(text))
        for (const img of images) {
          p.appendChild(doc.createTextNode(' '))
          p.appendChild(img.cloneNode(true))
        }
      }
      if (p.childNodes.length > 0) block.appendChild(p)
    }
    table.parentNode?.replaceChild(block, table)
  }
}

/** Safety net: whatever raw HTML turndown still passed through (stray
 *  tables, spans, comments) is stripped to its text so the vault
 *  renderer never shows literal tags. A reader is lossy by design; the
 *  user corrects. Fast-paths when there is no markup. */
export function stripLeftoverHtml(markdown: string): string {
  if (!/<[a-z!/][^>]*>/i.test(markdown)) return markdown
  return markdown
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(tr|table|div|p|li|h[1-6]|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#3[49];/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
}

export function readerDocument(
  extraction: ReaderExtraction,
  pageUrl: string,
  traceId: string,
  iso: string
): string {
  return [
    '---',
    'type: Atomik Reader Text',
    'description: DERIVED reader extraction of the web snapshot — not verified verbatim.',
    'resource: ./snapshot.mhtml',
    'tags: [web, reader, derived]',
    `timestamp: ${iso}`,
    'atomik:',
    '  derived: true',
    '  source: ./source.md',
    '  correction_state: model-output',
    '  extraction:',
    '    engine: readability + turndown (main)',
    `    source_url: ${pageUrl}`,
    `    images: ${extraction.imageCount}`,
    `    extracted_at: ${iso}`,
    `    action_trace_id: ${traceId}`,
    '---',
    '',
    '# Reader text — derived, uncorrected',
    '',
    '> Derived from [the snapshot](./snapshot.mhtml) of the original page.',
    '> The snapshot is the evidence; this reader text is the extraction —',
    '> correct it freely.',
    '',
    `# ${extraction.title}`,
    '',
    extraction.markdown,
    ''
  ].join('\n')
}

/** Dossier after extraction: status → extracted, reader pointer + trace
 *  recorded, the representations line flips. Pure. */
export function withReaderRecorded(dossier: string, iso: string, traceId: string): string {
  const fence = /^---\n([\s\S]*?)\n---/.exec(dossier)
  if (!fence) return dossier
  let frontmatter = fence[1]!.replace(
    /^( {2}status:) .*$/m,
    (_m, key: string) => `${key} extracted`
  )
  frontmatter = `${frontmatter}\n  reader_text: ./reader.md\n  reader_trace_id: ${traceId}\n  reader_extracted_at: ${iso}`
  let next = dossier.replace(fence[0], () => `---\n${frontmatter}\n---`)
  next = next.replace(
    /^- None yet — reader extraction arrives with the web pipeline \(S05\)\.$/m,
    '- [Reader text](./reader.md) — derived, uncorrected.'
  )
  return next
}

/** Dossier after a reader deletion — the pure inverse. */
export function withReaderCleared(dossier: string): string {
  const fence = /^---\n([\s\S]*?)\n---/.exec(dossier)
  if (!fence) return dossier
  const frontmatter = fence[1]!
    .replace(/\n {2}reader_text: \.\/reader\.md/g, '')
    .replace(/\n {2}reader_trace_id: [^\n]*/g, '')
    .replace(/\n {2}reader_extracted_at: [^\n]*/g, '')
    .replace(/\n {2}reader_corrected_at: [^\n]*/g, '')
    .replace(/^( {2}status:) extracted$/m, (_m, key: string) => `${key} imported`)
  let next = dossier.replace(fence[0], () => `---\n${frontmatter}\n---`)
  next = next.replace(
    /^- \[Reader text\]\(\.\/reader\.md\) — (?:derived, uncorrected|human-corrected)\.$/m,
    '- None yet — reader extraction arrives with the web pipeline (S05).'
  )
  return next
}

/**
 * The correction flip for reader.md (S05, the third derived file after
 * transcript.md and extracted.md): editing reader.md flips the dossier
 * to human-corrected. Pure, idempotent.
 */
export function withReaderCorrectionRecorded(dossier: string, iso: string): string {
  const fence = /^---\n([\s\S]*?)\n---/.exec(dossier)
  if (!fence) return dossier
  if (!/^ {2}reader_text: \.\/reader\.md$/m.test(fence[1]!)) return dossier
  if (/^ {2}reader_corrected_at:/m.test(fence[1]!)) return dossier
  const frontmatter = fence[1]!.replace(
    /^( {2}reader_text: \.\/reader\.md)$/m,
    `$1\n  reader_corrected_at: ${iso}`
  )
  let next = dossier.replace(fence[0], () => `---\n${frontmatter}\n---`)
  next = next.replace(
    /^- \[Reader text\]\(\.\/reader\.md\) — derived, uncorrected\.$/m,
    '- [Reader text](./reader.md) — human-corrected.'
  )
  return next
}

function readerParts(vaultRoot: string, dossierRelPath: unknown): { dir: string; dossierRel: string } {
  const dossierAbs = resolveNotePath(vaultRoot, dossierRelPath)
  if (!dossierAbs || basename(dossierAbs) !== 'source.md') {
    throw new Error('web-reader: rejected dossier path')
  }
  return { dir: dirname(dossierAbs), dossierRel: dossierRelPath as string }
}

/** What the compute stage produces — from `readerFromSnapshot` in-process
 *  or from the utility-process worker (whose structured clone hands the
 *  media bytes back as Uint8Array). */
export type ReaderComputeResult = {
  title: string
  markdown: string
  media: Array<{ name: string; bytes: Uint8Array }>
}

/** A reader-extraction job as sent to the worker (reader-worker.ts). */
export type ReaderJob =
  | { kind: 'snapshot'; snapshot: Uint8Array; pageUrl: string }
  | { kind: 'html'; html: string; pageUrl: string }

type ReaderPrep = {
  dir: string
  dossierRel: string
  dossierContent: string
  dossierMtimeMs: number
  pageUrl: string
  snapshot: Buffer
  readerAbs: string
}

/** Validation + reads BEFORE any compute: same checks, same order, same
 *  messages as ever — errors here happen before a trace id exists, so
 *  refusals never land a failure trace (unchanged behavior). */
function prepareWebReaderExtraction(vaultRoot: string, dossierRelPath: unknown): ReaderPrep {
  const { dir, dossierRel } = readerParts(vaultRoot, dossierRelPath)
  const dossier = readNote(vaultRoot, dossierRel)
  const urlMatch = /^ {2}original_url: (\S+)$/m.exec(dossier.content)
  if (!urlMatch) throw new Error('web-reader: dossier declares no original_url')
  const snapshotAbs = join(dir, 'snapshot.mhtml')
  if (!existsSync(snapshotAbs)) throw new Error('web-reader: snapshot.mhtml not found')
  const readerAbs = join(dir, 'reader.md')
  if (existsSync(readerAbs)) {
    throw new Error('web-reader: reader.md already exists — corrections live there; delete it to re-run')
  }
  return {
    dir,
    dossierRel,
    dossierContent: dossier.content,
    dossierMtimeMs: dossier.mtimeMs,
    pageUrl: urlMatch[1]!,
    snapshot: readFileSync(snapshotAbs),
    readerAbs
  }
}

/** Land a computed extraction: media/ + reader.md (wx), dossier flip
 *  through the mtime handshake (rollback on race), best-effort index
 *  line, ONE completed trace. */
function landWebReaderExtraction(
  vaultRoot: string,
  prep: ReaderPrep,
  computed: ReaderComputeResult,
  traces: ActionTraceLedger,
  traceId: string,
  started: number,
  now: () => number
): { readerPath: string; traceId: string; imageCount: number } {
  const { title, markdown, media } = computed
  const iso = new Date(now()).toISOString()
  // reader.md is guarded absent in prepare; a media/ here is the debris
  // of an earlier FAILED run — clear it so this extract self-heals (the
  // owner's bundle was wedged: orphan media/ but no reader.md meant
  // neither re-extract (EEXIST) nor delete (no reader) could proceed).
  const mediaDir = join(prep.dir, MEDIA_DIRNAME)
  rmSync(mediaDir, { recursive: true, force: true })
  if (media.length > 0) {
    mkdirSync(mediaDir, { recursive: true })
    for (const file of media) {
      writeFileSync(join(mediaDir, file.name), file.bytes, { flag: 'wx' })
    }
  }
  writeFileSync(
    prep.readerAbs,
    readerDocument({ title, markdown, imageCount: media.length }, prep.pageUrl, traceId, iso),
    { flag: 'wx' }
  )
  try {
    writeNote(
      vaultRoot,
      prep.dossierRel,
      withReaderRecorded(prep.dossierContent, iso, traceId),
      prep.dossierMtimeMs
    )
  } catch (error) {
    rmSync(prep.readerAbs, { force: true })
    rmSync(join(prep.dir, MEDIA_DIRNAME), { recursive: true, force: true })
    throw error
  }
  try {
    const indexRel = prep.dossierRel.replace(/source\.md$/, 'index.md')
    const index = readNote(vaultRoot, indexRel)
    if (!index.content.includes('](./reader.md)')) {
      writeNote(
        vaultRoot,
        indexRel,
        `${index.content.trimEnd()}\n- [reader.md](./reader.md) — derived reader text.\n`,
        index.mtimeMs
      )
    }
  } catch {
    /* the map is best-effort */
  }
  traces.recordTranscription({
    id: traceId,
    action: 'extract',
    output: {
      model: 'readability + turndown',
      modelVersion: '0.6.0',
      runtime: 'linkedom (main)',
      runtimeVersion: '0.18.13',
      location: 'deterministic'
    },
    inputBytes: prep.snapshot.length,
    contentSha256: createHash('sha256').update(prep.snapshot).digest('hex'),
    wallMs: now() - started,
    status: 'completed'
  })
  return {
    readerPath: prep.dossierRel.replace(/source\.md$/, 'reader.md'),
    traceId,
    imageCount: media.length
  }
}

/** Failure cleanup: leave NO partial bundle behind — a half-written
 *  media/ would fail the next extract with EEXIST (the owner hit exactly
 *  this) — and record the ONE failed trace. */
function recordWebReaderFailure(
  prep: ReaderPrep,
  traces: ActionTraceLedger,
  traceId: string,
  started: number,
  now: () => number
): void {
  rmSync(prep.readerAbs, { force: true })
  rmSync(join(prep.dir, MEDIA_DIRNAME), { recursive: true, force: true })
  traces.recordTranscription({
    id: traceId,
    action: 'extract',
    output: null,
    inputBytes: prep.snapshot.length,
    contentSha256: createHash('sha256').update(prep.snapshot).digest('hex'),
    wallMs: now() - started,
    status: 'failed'
  })
}

export function extractWebReader(
  vaultRoot: string,
  dossierRelPath: unknown,
  traces: ActionTraceLedger,
  now: () => number = Date.now
): { readerPath: string; traceId: string; imageCount: number } {
  const started = now()
  const prep = prepareWebReaderExtraction(vaultRoot, dossierRelPath)
  const traceId = traces.newTraceId()
  try {
    const computed = readerFromSnapshot(prep.snapshot, prep.pageUrl)
    return landWebReaderExtraction(vaultRoot, prep, computed, traces, traceId, started, now)
  } catch (error) {
    recordWebReaderFailure(prep, traces, traceId, started, now)
    throw error
  }
}

/** One extraction per bundle at a time: the async path opens a window
 *  between prepare and land where a second run's wx failure would clean
 *  up the FIRST run's fresh files. Same-process double-clicks die here;
 *  cross-process races stay on the wx guards as ever. */
const inFlightReaders = new Set<string>()

/**
 * The production path (perf audit 2026-07-15): same prepare/land/trace
 * semantics as `extractWebReader`, but the CPU slab — mhtml parse, DOM
 * builds, Readability, turndown; measured 834 ms in-main for a 650 KB
 * page — runs through an injected async `compute` (the utility-process
 * worker in index.ts; anything in tests). File IO, dossier handshake,
 * and traces stay in the caller's process.
 */
export async function extractWebReaderAsync(
  vaultRoot: string,
  dossierRelPath: unknown,
  traces: ActionTraceLedger,
  compute: (job: ReaderJob) => Promise<ReaderComputeResult>,
  now: () => number = Date.now
): Promise<{ readerPath: string; traceId: string; imageCount: number }> {
  const started = now()
  const prep = prepareWebReaderExtraction(vaultRoot, dossierRelPath)
  if (inFlightReaders.has(prep.readerAbs)) {
    throw new Error('web-reader: extraction already running for this bundle')
  }
  inFlightReaders.add(prep.readerAbs)
  try {
    const traceId = traces.newTraceId()
    try {
      const computed = await compute({
        kind: 'snapshot',
        snapshot: prep.snapshot,
        pageUrl: prep.pageUrl
      })
      return landWebReaderExtraction(vaultRoot, prep, computed, traces, traceId, started, now)
    } catch (error) {
      recordWebReaderFailure(prep, traces, traceId, started, now)
      throw error
    }
  } finally {
    inFlightReaders.delete(prep.readerAbs)
  }
}

/** The explicit re-run affordance (owner's standing lifecycle rule):
 *  reader.md AND media/ leave the bundle, the dossier and index return
 *  to their pre-extraction shape. The renderer confirms first. */
export function resetWebReader(vaultRoot: string, dossierRelPath: unknown): void {
  const { dir, dossierRel } = readerParts(vaultRoot, dossierRelPath)
  const readerAbs = join(dir, 'reader.md')
  if (!existsSync(readerAbs)) throw new Error('web-reader: no reader to delete')
  const dossier = readNote(vaultRoot, dossierRel)
  rmSync(readerAbs, { force: true })
  rmSync(join(dir, MEDIA_DIRNAME), { recursive: true, force: true })
  writeNote(vaultRoot, dossierRel, withReaderCleared(dossier.content), dossier.mtimeMs)
  try {
    const indexRel = dossierRel.replace(/source\.md$/, 'index.md')
    const index = readNote(vaultRoot, indexRel)
    const kept = index.content
      .split('\n')
      .filter((line) => !line.includes('](./reader.md)'))
      .join('\n')
    writeNote(vaultRoot, indexRel, kept, index.mtimeMs)
  } catch {
    /* the map is best-effort */
  }
}
