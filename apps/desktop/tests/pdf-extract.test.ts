import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ActionTraceLedger } from '../electron-main/action-trace'
import { extractPdfSource, resetExtraction } from '../electron-main/pdf-extract'
import { importPdfFromPath } from '../electron-main/pdf-import'

describe('PDF extraction (CP-MVP-003 S05) — text layer + OCR seat fallback', () => {
  let vault: string
  let stateDir: string
  let inbox: string
  let traces: ActionTraceLedger
  beforeEach(() => {
    vault = mkdtempSync(join(tmpdir(), 'atomik-pdfx-vault-'))
    stateDir = mkdtempSync(join(tmpdir(), 'atomik-pdfx-state-'))
    inbox = mkdtempSync(join(tmpdir(), 'atomik-pdfx-inbox-'))
    traces = new ActionTraceLedger(stateDir)
  })
  afterEach(() => {
    for (const dir of [vault, stateDir, inbox]) rmSync(dir, { recursive: true, force: true })
  })

  const seedPdfBundle = (): string => {
    const abs = join(inbox, 'doc.pdf')
    writeFileSync(abs, '%PDF-1.7 fake')
    return importPdfFromPath(vault, abs).dossierPath
  }
  const fakeOcr = {
    id: 'fake-ocr',
    transcribe: () =>
      Promise.resolve({
        markdown: 'texte OCR de la page', model: 'Qwen-fake', modelVersion: '1',
        runtime: 'r', runtimeVersion: 'rt+cuda', location: 'local-model' as const
      })
  }
  const fakeRasterize = (_pdf: string, _page: number, dst: string): Promise<void> => {
    writeFileSync(dst, 'jpg')
    return Promise.resolve()
  }

  it('lands extracted.md with per-page text, OCR fallback pages, dossier + index + trace', async () => {
    const dossierPath = seedPdfBundle()
    const reader = () =>
      Promise.resolve({ pages: ['Le devis total est de 1 234,56 € pour la prestation.', ''] })
    const { extractedPath } = await extractPdfSource(
      vault, dossierPath, reader, fakeOcr, fakeRasterize, traces
    )
    expect(extractedPath).toBe('sources/pdf/doc/extracted.md')
    const extracted = readFileSync(join(vault, extractedPath), 'utf8')
    expect(extracted).toContain('type: Atomik Extracted Text')
    expect(extracted).toContain('## Page 1\n\nLe devis total est de 1 234,56 €')
    expect(extracted).toContain('*(image-only page — OCR by Qwen-fake)*')
    expect(extracted).toContain('texte OCR de la page')
    expect(extracted).toContain('ocr_pages: [2]')
    const dossier = readFileSync(join(vault, 'sources/pdf/doc/source.md'), 'utf8')
    expect(dossier).toContain('status: extracted')
    expect(dossier).toContain('extracted_text: ./extracted.md')
    expect(dossier).toContain('- [Extracted text](./extracted.md) — derived, uncorrected.')
    expect(readFileSync(join(vault, 'sources/pdf/doc/index.md'), 'utf8')).toContain('](./extracted.md)')
    const trace = JSON.parse(readFileSync(traces.ledgerPath(), 'utf8').trim().split('\n').pop()!)
    expect(trace.action).toBe('extract')
    expect(trace.execution.location).toBe('local-model')
    expect(trace.outcome.status).toBe('completed')
  })

  it('is honest without a rasterizer, deterministic without OCR pages, and refuses to clobber', async () => {
    const dossierPath = seedPdfBundle()
    const reader = () => Promise.resolve({ pages: ['Assez de texte pour être une vraie page.', ''] })
    await extractPdfSource(vault, dossierPath, reader, null, null, traces)
    const extracted = readFileSync(join(vault, 'sources/pdf/doc/extracted.md'), 'utf8')
    expect(extracted).toContain('install poppler-utils to enable the OCR fallback')
    const trace = JSON.parse(readFileSync(traces.ledgerPath(), 'utf8').trim().split('\n').pop()!)
    expect(trace.execution.location).toBe('deterministic')
    await expect(
      extractPdfSource(vault, dossierPath, reader, null, null, traces)
    ).rejects.toThrow('already exists')
    // a pre-flight refusal is not a run: no extra trace line lands
    const lines = readFileSync(traces.ledgerPath(), 'utf8').trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(existsSync(join(vault, 'sources/pdf/doc/extracted.md'))).toBe(true)
  })

  it('lifecycle: extract → delete → extract records cleanly (the day-to-day loop)', async () => {
    const dossierPath = seedPdfBundle()
    const reader = () => Promise.resolve({ pages: ['Assez de texte pour être une vraie page.'] })
    await extractPdfSource(vault, dossierPath, reader, null, null, traces)

    resetExtraction(vault, dossierPath)
    expect(existsSync(join(vault, 'sources/pdf/doc/extracted.md'))).toBe(false)
    const dossier = readFileSync(join(vault, 'sources/pdf/doc/source.md'), 'utf8')
    expect(dossier).toContain('status: imported')
    expect(dossier).not.toContain('extracted_text:')
    expect(dossier).toContain('- None yet — extraction arrives with the PDF pipeline (S05).')
    expect(readFileSync(join(vault, 'sources/pdf/doc/index.md'), 'utf8')).not.toContain('extracted.md')

    await extractPdfSource(vault, dossierPath, reader, null, null, traces)
    const again = readFileSync(join(vault, 'sources/pdf/doc/source.md'), 'utf8')
    expect(again).toContain('status: extracted')
    expect((again.match(/extracted_text:/g) ?? [])).toHaveLength(1)
    expect(() => {
      resetExtraction(vault, dossierPath)
      resetExtraction(vault, dossierPath)
    }).toThrow('no extraction')
  })
})
