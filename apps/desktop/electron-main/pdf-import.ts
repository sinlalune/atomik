import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { assertInsideVault } from './vault'
import type { CaptureImportResult } from '../shared/ipc-contract'

/**
 * PDF as a source (CP-MVP-003 S03, bedrock 10): an explicit file pick
 * becomes a bundle under `sources/pdf/<slug>/` — `original.pdf`
 * preserved untouched as evidence (sha256 recorded in the dossier, 10
 * §evidence), `source.md` the canonical dossier, `index.md` the human
 * map. Same discipline as capture-import: bytes validated BEFORE the
 * vault is touched (magic outranks label), every file written `wx`, a
 * partial write is cleaned up, never an overwrite.
 */

const MAX_PDF_BYTES = 200 * 1024 * 1024

/** File name → bundle slug: lowercase, [a-z0-9-], sensible fallbacks. */
export function pdfSlug(fileName: string): string {
  const stem = basename(fileName).replace(/\.pdf$/i, '')
  const slug = stem
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug.length > 0 ? slug : 'document'
}

function pdfDossier(title: string, sha256: string, sizeBytes: number, iso: string): string {
  return [
    '---',
    'type: Atomik Source',
    `title: ${title}`,
    'description: PDF imported as a source; the original stays the evidence.',
    'resource: ./original.pdf',
    'tags: [pdf, source]',
    `timestamp: ${iso}`,
    'atomik:',
    `  id: source_pdf_${iso.slice(0, 10).replaceAll('-', '_')}_${sha256.slice(0, 8)}`,
    '  source_type: pdf',
    '  status: imported',
    '  original_path: ./original.pdf',
    `  original_sha256: ${sha256}`,
    `  original_bytes: ${sizeBytes}`,
    '---',
    '',
    '# Source dossier',
    '',
    '## Original',
    '',
    '- [Original PDF](./original.pdf)',
    '',
    '## Extracted representations',
    '',
    '- None yet — extraction arrives with the PDF pipeline (S05).',
    '',
    '## Useful anchors',
    '',
    '| Anchor | Meaning | Target |',
    '|---|---|---|',
    '| `original-pdf` | the full original document | `./original.pdf` |',
    '',
    '## Notes created from this source',
    '',
    '- None yet.',
    ''
  ].join('\n')
}

function pdfIndex(title: string, iso: string): string {
  return [
    '---',
    'type: Atomik Index',
    `title: ${title}`,
    'description: Directory map of this PDF source bundle.',
    'tags: [pdf]',
    `timestamp: ${iso}`,
    '---',
    '',
    `# ${title}`,
    '',
    '- [source.md](./source.md) — the canonical source dossier.',
    '- [original.pdf](./original.pdf) — the preserved original (evidence).',
    ''
  ].join('\n')
}

export function importPdfFromPath(
  vaultRoot: string,
  absPdfPath: string,
  now: () => number = Date.now
): CaptureImportResult {
  // cap check BEFORE the read: the old order slurped an oversized file
  // into memory just to refuse it (perf audit 2026-07-15 — up to a
  // main-thread 200 MB read for nothing); stat is free. The byte check
  // stays: the file can change between stat and read.
  if (statSync(absPdfPath).size > MAX_PDF_BYTES) {
    throw new Error('pdf-import: file too large')
  }
  // read + validate BEFORE touching the vault — bytes outrank labels
  const bytes = readFileSync(absPdfPath)
  if (bytes.length > MAX_PDF_BYTES) throw new Error('pdf-import: file too large')
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new Error('pdf-import: not a PDF (magic mismatch)')
  }

  const slugBase = pdfSlug(absPdfPath)
  let slug = slugBase
  for (let n = 2; existsSync(join(vaultRoot, 'sources', 'pdf', slug)); n++) {
    slug = `${slugBase}-${n}`
    if (n > 99) throw new Error('pdf-import: could not find a free bundle name')
  }
  const relDir = `sources/pdf/${slug}`
  const absDir = join(vaultRoot, 'sources', 'pdf', slug)
  mkdirSync(absDir, { recursive: true })
  assertInsideVault(vaultRoot, absDir)

  const iso = new Date(now()).toISOString()
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const title = basename(absPdfPath).replace(/\.pdf$/i, '')
  const written: string[] = []
  try {
    for (const [name, content] of [
      ['original.pdf', bytes],
      ['source.md', pdfDossier(title, sha256, bytes.length, iso)],
      ['index.md', pdfIndex(title, iso)]
    ] as Array<[string, string | Buffer]>) {
      writeFileSync(join(absDir, name), content, { flag: 'wx' })
      written.push(name)
    }
  } catch (error) {
    for (const name of written) rmSync(join(absDir, name), { force: true })
    throw error
  }

  return { dossierPath: `${relDir}/source.md` }
}
