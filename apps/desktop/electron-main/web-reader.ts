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

/** Pure-ish core: parse the snapshot, run Readability, map the article's
 *  images onto snapshot resources, emit Markdown + the media files to
 *  write. No fs here — the caller lands the bytes. */
export function readerFromSnapshot(
  snapshot: Buffer,
  pageUrl: string
): { title: string; markdown: string; media: Array<{ name: string; bytes: Buffer }> } {
  const { html, resources } = parseMhtml(snapshot)
  const { document } = parseHTML(html)
  // Readability MUTATES the document it parses — clone the title before,
  // and parse on a throwaway so the fallback can read the real body.
  const docTitle = (document.querySelector('title')?.textContent ?? '').trim()
  const { document: readableDoc } = parseHTML(html)
  const article = new Readability(readableDoc as unknown as Document, {
    charThreshold: 200
  }).parse()
  const title = (article?.title ?? '').trim() || docTitle || new URL(pageUrl).hostname
  // Readability returns null on sparse/app-like pages — fall back to the
  // page body so reader.md is never empty (an honest whole-page dump the
  // user can trim, better than nothing).
  const contentHtml =
    article?.content && article.content.trim().length > 0
      ? article.content
      : (document.body?.innerHTML ?? '')

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
  const markdown = turndown.turndown(frag.body.innerHTML).trim()
  return { title, markdown, media }
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

export function extractWebReader(
  vaultRoot: string,
  dossierRelPath: unknown,
  traces: ActionTraceLedger,
  now: () => number = Date.now
): { readerPath: string; traceId: string; imageCount: number } {
  const started = now()
  const { dir, dossierRel } = readerParts(vaultRoot, dossierRelPath)
  const dossier = readNote(vaultRoot, dossierRel)
  const urlMatch = /^ {2}original_url: (\S+)$/m.exec(dossier.content)
  if (!urlMatch) throw new Error('web-reader: dossier declares no original_url')
  const pageUrl = urlMatch[1]!
  const snapshotAbs = join(dir, 'snapshot.mhtml')
  if (!existsSync(snapshotAbs)) throw new Error('web-reader: snapshot.mhtml not found')
  const readerAbs = join(dir, 'reader.md')
  if (existsSync(readerAbs)) {
    throw new Error('web-reader: reader.md already exists — corrections live there; delete it to re-run')
  }

  const snapshot = readFileSync(snapshotAbs)
  const traceId = traces.newTraceId()
  try {
    const { title, markdown, media } = readerFromSnapshot(snapshot, pageUrl)
    const iso = new Date(now()).toISOString()
    // reader.md is guarded absent above; a media/ here is the debris of
    // an earlier FAILED run — clear it so this extract self-heals (the
    // owner's bundle was wedged: orphan media/ but no reader.md meant
    // neither re-extract (EEXIST) nor delete (no reader) could proceed).
    const mediaDir = join(dir, MEDIA_DIRNAME)
    rmSync(mediaDir, { recursive: true, force: true })
    if (media.length > 0) {
      mkdirSync(mediaDir, { recursive: true })
      for (const file of media) {
        writeFileSync(join(mediaDir, file.name), file.bytes, { flag: 'wx' })
      }
    }
    writeFileSync(
      readerAbs,
      readerDocument({ title, markdown, imageCount: media.length }, pageUrl, traceId, iso),
      { flag: 'wx' }
    )
    try {
      writeNote(vaultRoot, dossierRel, withReaderRecorded(dossier.content, iso, traceId), dossier.mtimeMs)
    } catch (error) {
      rmSync(readerAbs, { force: true })
      rmSync(join(dir, MEDIA_DIRNAME), { recursive: true, force: true })
      throw error
    }
    try {
      const indexRel = dossierRel.replace(/source\.md$/, 'index.md')
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
      inputBytes: snapshot.length,
      contentSha256: createHash('sha256').update(snapshot).digest('hex'),
      wallMs: now() - started,
      status: 'completed'
    })
    return {
      readerPath: dossierRel.replace(/source\.md$/, 'reader.md'),
      traceId,
      imageCount: media.length
    }
  } catch (error) {
    // leave NO partial bundle behind — a half-written media/ would fail
    // the next extract with EEXIST (the owner hit exactly this)
    rmSync(readerAbs, { force: true })
    rmSync(join(dir, MEDIA_DIRNAME), { recursive: true, force: true })
    traces.recordTranscription({
      id: traceId,
      action: 'extract',
      output: null,
      inputBytes: snapshot.length,
      contentSha256: createHash('sha256').update(snapshot).digest('hex'),
      wallMs: now() - started,
      status: 'failed'
    })
    throw error
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
