import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { importPdfFromPath, pdfSlug } from '../electron-main/pdf-import'

describe('PDF as source (CP-MVP-003 S03) — bundle through the gates', () => {
  let vault: string
  let inbox: string
  beforeEach(() => {
    vault = mkdtempSync(join(tmpdir(), 'atomik-pdf-vault-'))
    inbox = mkdtempSync(join(tmpdir(), 'atomik-pdf-inbox-'))
  })
  afterEach(() => {
    rmSync(vault, { recursive: true, force: true })
    rmSync(inbox, { recursive: true, force: true })
  })

  const fakePdf = (name: string, content = '%PDF-1.7 fake body'): string => {
    const abs = join(inbox, name)
    writeFileSync(abs, content)
    return abs
  }

  it('slugs file names honestly', () => {
    expect(pdfSlug('Attention Is All You Need.pdf')).toBe('attention-is-all-you-need')
    expect(pdfSlug('Éléments d’analyse (T2).PDF')).toBe('elements-d-analyse-t2')
    expect(pdfSlug('???.pdf')).toBe('document')
  })

  it('lands the bundle: original untouched, dossier with sha256, index map', () => {
    const { dossierPath } = importPdfFromPath(vault, fakePdf('My Paper.pdf'))
    expect(dossierPath).toBe('sources/pdf/my-paper/source.md')
    const dir = join(vault, 'sources/pdf/my-paper')
    expect(readFileSync(join(dir, 'original.pdf'), 'latin1')).toContain('%PDF-1.7')
    const dossier = readFileSync(join(dir, 'source.md'), 'utf8')
    expect(dossier).toContain('source_type: pdf')
    expect(dossier).toContain('resource: ./original.pdf')
    expect(dossier).toMatch(/original_sha256: [0-9a-f]{64}/)
    expect(dossier).toContain('- None yet — extraction arrives with the PDF pipeline (S05).')
    expect(readFileSync(join(dir, 'index.md'), 'utf8')).toContain('[original.pdf](./original.pdf)')
  })

  it('bytes outrank labels: refuses a non-PDF before touching the vault', () => {
    expect(() => importPdfFromPath(vault, fakePdf('evil.pdf', 'MZ not a pdf'))).toThrow('magic mismatch')
    expect(existsSync(join(vault, 'sources'))).toBe(false)
  })

  it('never overwrites: same name lands a numbered sibling', () => {
    importPdfFromPath(vault, fakePdf('paper.pdf'))
    const second = importPdfFromPath(vault, fakePdf('paper.pdf'))
    expect(second.dossierPath).toBe('sources/pdf/paper-2/source.md')
    expect(existsSync(join(vault, 'sources/pdf/paper/original.pdf'))).toBe(true)
    expect(existsSync(join(vault, 'sources/pdf/paper-2/original.pdf'))).toBe(true)
  })
})
