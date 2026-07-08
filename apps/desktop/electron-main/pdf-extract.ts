import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import type { ActionTraceLedger } from './action-trace'
import type { TranscriptionAdapter } from './transcription'
import { readNote, resolveNotePath, writeNote } from './vault'

/**
 * PDF text extraction (CP-MVP-003 S05, bedrock 10): per-page text lands
 * as a DERIVED `extracted.md` beside the original — visibly derived,
 * extraction identity + trace id in the frontmatter, ONE ActionTrace
 * per run (33). Text-layer pages parse deterministically (pdf.js legacy
 * in MAIN — display and extraction stay separate claims); image-only
 * pages ride the SEATED OCR pipeline when a rasterizer exists
 * (pdftoppm, the ffmpeg precedent: system tool, graceful absence) and
 * say so honestly when it doesn't. Refuses to clobber: corrections
 * live in extracted.md once a human touches it.
 */

/** Injected pdf.js reader — one string per page ('' = no text layer). */
export type PdfTextReader = (bytes: Buffer) => Promise<{ pages: string[] }>

/** Injected page rasterizer (page → jpg on disk); null when the system
 *  has none — scanned pages then land an honest placeholder. */
export type PageRasterizer =
  | ((pdfAbs: string, page: number, dstJpgAbs: string) => Promise<void>)
  | null

/** A page whose text layer is this thin is treated as image-only. */
const TEXTLESS_THRESHOLD = 20

export type PdfExtractionOutput = {
  markdown: string
  pages: number
  ocrPages: number[]
  engine: string
}

export function extractedDocument(
  output: PdfExtractionOutput,
  traceId: string,
  iso: string,
  ocrIdentity: string | null
): string {
  return [
    '---',
    'type: Atomik Extracted Text',
    'description: DERIVED text of ./original.pdf — extraction output, not verified verbatim.',
    'resource: ./original.pdf',
    'tags: [pdf, extracted, derived]',
    `timestamp: ${iso}`,
    'atomik:',
    '  derived: true',
    '  source: ./source.md',
    '  correction_state: model-output',
    '  extraction:',
    `    engine: ${output.engine}`,
    ...(ocrIdentity && output.ocrPages.length > 0 ? [`    ocr: ${ocrIdentity}`] : []),
    `    pages: ${output.pages}`,
    ...(output.ocrPages.length > 0 ? [`    ocr_pages: [${output.ocrPages.join(', ')}]`] : []),
    `    extracted_at: ${iso}`,
    `    action_trace_id: ${traceId}`,
    '---',
    '',
    '# Extracted text — derived, uncorrected',
    '',
    '> Derived from [the original](./original.pdf). Rendered pages are the',
    '> evidence; this text is the extraction — correct it freely.',
    '',
    output.markdown
  ].join('\n')
}

/** Dossier updates after extraction — pure. */
export function withExtractionRecorded(dossier: string, iso: string, traceId: string): string {
  const fence = /^---\n([\s\S]*?)\n---/.exec(dossier)
  if (!fence) return dossier
  let frontmatter = fence[1]!.replace(
    /^( {2}status:) .*$/m,
    (_m, key: string) => `${key} extracted`
  )
  frontmatter = `${frontmatter}\n  extracted_text: ./extracted.md\n  extraction_trace_id: ${traceId}\n  extracted_at: ${iso}`
  let next = dossier.replace(fence[0], () => `---\n${frontmatter}\n---`)
  next = next.replace(
    /^- None yet — extraction arrives with the PDF pipeline \(S05\)\.$/m,
    '- [Extracted text](./extracted.md) — derived, uncorrected.'
  )
  return next
}

export async function extractPdfSource(
  vaultRoot: string,
  dossierRelPath: unknown,
  reader: PdfTextReader,
  ocr: TranscriptionAdapter | null,
  rasterize: PageRasterizer,
  traces: ActionTraceLedger,
  now: () => number = Date.now
): Promise<{ extractedPath: string; traceId: string }> {
  const started = now()
  const dossierAbs = resolveNotePath(vaultRoot, dossierRelPath)
  if (!dossierAbs || basename(dossierAbs) !== 'source.md') {
    throw new Error('pdf-extract: rejected dossier path')
  }
  const dossier = readNote(vaultRoot, dossierRelPath)
  if (!/^resource: \.\/original\.pdf$/m.test(dossier.content)) {
    throw new Error('pdf-extract: dossier does not declare a PDF resource')
  }
  const dir = dirname(dossierAbs)
  const originalAbs = join(dir, 'original.pdf')
  if (!existsSync(originalAbs)) throw new Error('pdf-extract: original.pdf not found')
  const extractedAbs = join(dir, 'extracted.md')
  if (existsSync(extractedAbs)) {
    throw new Error('pdf-extract: extracted.md already exists — corrections live there; delete it to re-run')
  }

  const bytes = readFileSync(originalAbs)
  const contentSha256 = createHash('sha256').update(bytes).digest('hex')
  const traceId = traces.newTraceId()
  const engine = 'pdfjs-dist 6.1.200 text layer (main)'
  try {
    const { pages } = await reader(bytes)
    const ocrPages: number[] = []
    const sections: string[] = []
    let ocrIdentity: string | null = null
    for (let n = 1; n <= pages.length; n++) {
      const text = (pages[n - 1] ?? '').trim()
      if (text.length >= TEXTLESS_THRESHOLD) {
        sections.push(`## Page ${n}\n\n${text}\n`)
        continue
      }
      // image-only page: the OCR seat when the system can rasterize
      if (rasterize && ocr) {
        const work = mkdtempSync(join(tmpdir(), 'atomik-pdf-ocr-'))
        try {
          const jpg = join(work, `page-${n}.jpg`)
          await rasterize(originalAbs, n, jpg)
          const result = await ocr.transcribe({
            originalAbs: jpg,
            mimeType: 'image/jpeg',
            bytes: readFileSync(jpg)
          })
          ocrPages.push(n)
          ocrIdentity = `${result.model} (${result.runtimeVersion})`
          sections.push(`## Page ${n}\n\n*(image-only page — OCR by ${result.model})*\n\n${result.markdown}\n`)
        } finally {
          rmSync(work, { recursive: true, force: true })
        }
      } else {
        sections.push(
          `## Page ${n}\n\n*(image-only page — no text layer; install poppler-utils to enable the OCR fallback)*\n`
        )
      }
    }
    const iso = new Date(now()).toISOString()
    const output: PdfExtractionOutput = {
      markdown: sections.join('\n'),
      pages: pages.length,
      ocrPages,
      engine
    }
    writeFileSync(extractedAbs, extractedDocument(output, traceId, iso, ocrIdentity), { flag: 'wx' })
    try {
      writeNote(
        vaultRoot,
        dossierRelPath,
        withExtractionRecorded(dossier.content, iso, traceId),
        dossier.mtimeMs
      )
    } catch (error) {
      rmSync(extractedAbs, { force: true })
      throw error
    }
    try {
      const indexRel = (dossierRelPath as string).replace(/source\.md$/, 'index.md')
      const index = readNote(vaultRoot, indexRel)
      if (!index.content.includes('](./extracted.md)')) {
        writeNote(
          vaultRoot,
          indexRel,
          `${index.content.trimEnd()}\n- [extracted.md](./extracted.md) — derived text extraction.\n`,
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
        model: ocrPages.length > 0 ? `${engine} + ${ocrIdentity ?? 'ocr'}` : engine,
        modelVersion: '6.1.200',
        runtime: 'pdf.js legacy (main)',
        runtimeVersion: '6.1.200',
        location: ocrPages.length > 0 ? 'local-model' : 'deterministic'
      },
      inputBytes: bytes.length,
      contentSha256,
      wallMs: now() - started,
      status: 'completed'
    })
    return { extractedPath: `${(dossierRelPath as string).replace(/source\.md$/, 'extracted.md')}`, traceId }
  } catch (error) {
    traces.recordTranscription({
      id: traceId,
      action: 'extract',
      output: null,
      inputBytes: bytes.length,
      contentSha256,
      wallMs: now() - started,
      status: 'failed'
    })
    throw error
  }
}
