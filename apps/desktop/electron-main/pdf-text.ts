import { existsSync, renameSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { runSidecar } from './sidecar'
import type { PageRasterizer, PdfTextReader } from './pdf-extract'

/**
 * The concrete engines behind PDF extraction (CP-MVP-003 S05): pdf.js
 * legacy build parses the text layer in MAIN (extraction claims never
 * come from the display path), and poppler's pdftoppm — when the
 * system has it, the ffmpeg precedent — rasterizes image-only pages
 * for the seated OCR pipeline.
 */

export const readPdfTextWithPdfjs: PdfTextReader = async (bytes) => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const task = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
    // main-process parse: no worker file, run inline
    disableAutoFetch: true
  })
  try {
    const doc = await task.promise
    const pages: string[] = []
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const content = await page.getTextContent()
      const text = content.items
        .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
        .join('')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
      pages.push(text)
      page.cleanup()
    }
    return { pages }
  } finally {
    await task.destroy()
  }
}

/** pdftoppm writes `<base>-N.jpg`; we rename to the requested path. */
export function pdftoppmRasterizer(pdftoppmBin: string): PageRasterizer {
  if (!existsSync(pdftoppmBin)) return null
  return async (pdfAbs, page, dstJpgAbs) => {
    const base = join(dirname(dstJpgAbs), `raster-${page}`)
    await runSidecar(
      pdftoppmBin,
      ['-f', String(page), '-l', String(page), '-jpeg', '-r', '200', pdfAbs, base],
      120_000
    )
    const produced = [`${base}-${page}.jpg`, `${base}-${String(page).padStart(2, '0')}.jpg`, `${base}.jpg`]
      .find((candidate) => existsSync(candidate))
    if (!produced) throw new Error('pdf-extract: pdftoppm produced no page image')
    renameSync(produced, dstJpgAbs)
  }
}
