import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ActionTraceLedger } from '../electron-main/action-trace'
import { parseHTML } from 'linkedom'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import {
  extractWebReader,
  normalizeTables,
  readerFromSnapshot,
  resetWebReader,
  stripLeftoverHtml,
  withReaderCleared,
  withReaderCorrectionRecorded,
  withReaderRecorded
} from '../electron-main/web-reader'

/** Run the table pass + turndown in isolation (Readability strips small
 *  synthetic tables, so the full pipeline can't exercise this). */
function tableMarkdown(inner: string): string {
  const { document } = parseHTML(`<html><body>${inner}</body></html>`)
  normalizeTables(document as unknown as Parameters<typeof normalizeTables>[0])
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' })
  td.use(gfm)
  return td.turndown((document as unknown as { body: { innerHTML: string } }).body.innerHTML)
}

const CRLF = '\r\n'
/** A synthetic Blink-style MHTML: an article with a heading, a paragraph
 *  long enough for Readability to keep, and one embedded PNG. */
function articleSnapshot(): Buffer {
  const b = 'B0UND'
  const body =
    '<html><head><title>Gradient Descent</title></head><body><article>' +
    '<h1>Gradient Descent</h1>' +
    '<p>Gradient descent is an iterative optimization algorithm for finding a ' +
    'local minimum of a differentiable function. It takes repeated steps in the ' +
    'opposite direction of the gradient. This paragraph is deliberately long so ' +
    'the readability heuristic keeps it as the main content of the page.</p>' +
    '<p>The learning rate controls the step size and matters a great deal in ' +
    'practice; too large diverges, too small crawls. Here is a figure:</p>' +
    '<img src="https://ex.org/curve.png" alt="loss curve">' +
    '</article></body></html>'
  const lines = [
    'From: <Saved by Blink>',
    `Content-Type: multipart/related; boundary="${b}"`,
    '',
    `--${b}`,
    'Content-Type: text/html',
    'Content-Transfer-Encoding: 8bit',
    'Content-Location: https://ex.org/gd',
    '',
    body,
    `--${b}`,
    'Content-Type: image/png',
    'Content-Transfer-Encoding: base64',
    'Content-Location: https://ex.org/curve.png',
    '',
    Buffer.from('THE-REAL-PNG-BYTES-comfortably-over-the-64-byte-minimum-threshold-0123456789').toString('base64'),
    `--${b}--`,
    ''
  ]
  return Buffer.from(lines.join(CRLF), 'latin1')
}

const webDossier = (): string =>
  [
    '---',
    'type: Atomik Source',
    'resource: https://ex.org/gd',
    'atomik:',
    '  source_type: web',
    '  status: imported',
    '  original_url: https://ex.org/gd',
    '  snapshot: ./snapshot.mhtml',
    '---',
    '',
    '## Extracted representations',
    '',
    '- None yet — reader extraction arrives with the web pipeline (S05).',
    ''
  ].join('\n')

describe('web reader extraction (CP-MVP-006 S05)', () => {
  let vault: string
  let traces: ActionTraceLedger
  let dir: string
  const dossierRel = 'sources/web/gd/source.md'
  beforeEach(() => {
    vault = mkdtempSync(join(tmpdir(), 'atomik-reader-vault-'))
    traces = new ActionTraceLedger(mkdtempSync(join(tmpdir(), 'atomik-reader-traces-')))
    dir = join(vault, 'sources/web/gd')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.md'), webDossier())
    writeFileSync(join(dir, 'index.md'), '# gd\n')
    writeFileSync(join(dir, 'snapshot.mhtml'), articleSnapshot())
  })
  afterEach(() => rmSync(vault, { recursive: true, force: true }))

  it('readerFromSnapshot pulls title, markdown, and the embedded image', () => {
    const { title, markdown, media } = readerFromSnapshot(articleSnapshot(), 'https://ex.org/gd')
    expect(title).toContain('Gradient Descent')
    expect(markdown).toContain('Gradient descent is an iterative')
    expect(media).toHaveLength(1)
    // the markdown references the LOCAL media file, not the remote URL
    expect(markdown).toContain('media/')
    expect(markdown).not.toContain('https://ex.org/curve.png')
    expect(media[0]!.name).toMatch(/^[0-9a-f]{16}\.png$/)
  })

  it('lands reader.md + media/, flips the dossier, records ONE deterministic trace', () => {
    const { readerPath, imageCount } = extractWebReader(vault, dossierRel, traces)
    expect(readerPath).toBe('sources/web/gd/reader.md')
    expect(imageCount).toBe(1)
    const reader = readFileSync(join(dir, 'reader.md'), 'utf8')
    expect(reader).toContain('type: Atomik Reader Text')
    expect(reader).toContain('correction_state: model-output')
    expect(reader).toMatch(/action_trace_id: /)
    expect(readdirSync(join(dir, 'media'))).toHaveLength(1)
    const dossier = readFileSync(join(dir, 'source.md'), 'utf8')
    expect(dossier).toContain('status: extracted')
    expect(dossier).toContain('reader_text: ./reader.md')
    expect(dossier).toContain('- [Reader text](./reader.md) — derived, uncorrected.')
    expect(readFileSync(join(dir, 'index.md'), 'utf8')).toContain('](./reader.md)')
    const trace = JSON.parse(readFileSync(traces.ledgerPath(), 'utf8').trim().split('\n').pop()!)
    expect(trace.action).toBe('extract')
    expect(trace.execution.location).toBe('deterministic')
    expect(trace.outcome.status).toBe('completed')
  })

  it('refuses to clobber an existing reader.md', () => {
    extractWebReader(vault, dossierRel, traces)
    expect(() => extractWebReader(vault, dossierRel, traces)).toThrow('already exists')
  })

  it('two images with identical bytes collapse to ONE media file (the EEXIST bug)', () => {
    const b = 'DUP'
    const img = Buffer.from('same-bytes-shared-icon-comfortably-over-the-64-byte-minimum-1234567890').toString('base64')
    const dup = [
      'From: <Saved by Blink>',
      `Content-Type: multipart/related; boundary="${b}"`,
      '',
      `--${b}`,
      'Content-Type: text/html',
      'Content-Transfer-Encoding: 8bit',
      'Content-Location: https://ex.org/gd',
      '',
      '<html><body><article><h1>Two icons, one file</h1>' +
        '<p>A paragraph long enough for the whole-body fallback to keep it as content here.</p>' +
        '<img src="https://ex.org/a.png"><img src="https://ex.org/b.png"></article></body></html>',
      `--${b}`,
      'Content-Type: image/png',
      'Content-Transfer-Encoding: base64',
      'Content-Location: https://ex.org/a.png',
      '',
      img,
      `--${b}`,
      'Content-Type: image/png',
      'Content-Transfer-Encoding: base64',
      'Content-Location: https://ex.org/b.png',
      '',
      img,
      `--${b}--`,
      ''
    ].join('\r\n')
    const { media } = readerFromSnapshot(Buffer.from(dup, 'latin1'), 'https://ex.org/gd')
    expect(media).toHaveLength(1) // deduped by content hash, not by URL
  })

  it('self-heals a wedged bundle: orphan media/ + no reader.md still extracts', () => {
    // simulate a prior failed run: media/ exists, reader.md does not
    mkdirSync(join(dir, 'media'), { recursive: true })
    writeFileSync(join(dir, 'media', 'stale.webp'), 'orphan bytes')
    expect(() => extractWebReader(vault, dossierRel, traces)).not.toThrow()
    expect(existsSync(join(dir, 'media', 'stale.webp'))).toBe(false) // cleared
    expect(existsSync(join(dir, 'reader.md'))).toBe(true)
  })

  it('the lifecycle: extract → delete → extract, clean each time', () => {
    extractWebReader(vault, dossierRel, traces)
    resetWebReader(vault, dossierRel)
    expect(existsSync(join(dir, 'reader.md'))).toBe(false)
    expect(existsSync(join(dir, 'media'))).toBe(false)
    const dossier = readFileSync(join(dir, 'source.md'), 'utf8')
    expect(dossier).toContain('status: imported')
    expect(dossier).not.toContain('reader_text:')
    expect(dossier).toContain('- None yet — reader extraction arrives with the web pipeline (S05).')
    expect(readFileSync(join(dir, 'index.md'), 'utf8')).not.toContain('](./reader.md)')
    // a second extract lands cleanly — no double reader_text ever
    const { imageCount } = extractWebReader(vault, dossierRel, traces)
    expect(imageCount).toBe(1)
    expect((readFileSync(join(dir, 'source.md'), 'utf8').match(/reader_text:/g) ?? [])).toHaveLength(1)
    expect(() => resetWebReader(vault, dossierRel)).not.toThrow()
    resetWebReader // idempotency of the guard checked below
  })

  it('promotes a regular table to a markdown pipe table (owner: why not a table)', () => {
    const md = tableMarkdown(
      '<table><tr><td>Année</td><td>PIB</td></tr><tr><td>2020</td><td>21T</td></tr></table>'
    )
    expect(md).toContain('| --- | --- |')
    expect(md).toContain('| Année | PIB |')
    expect(md).toContain('| 2020 | 21T |')
    expect(/<table|<td|<tr/.test(md)).toBe(false)
  })

  it('flattens an infobox (row-headers / block cells / <br>) to readable dash lines', () => {
    const md = tableMarkdown(
      '<table><tr><th scope="row">Création</th><td><p>1975</p></td></tr>' +
        '<tr><th scope="row">Ancien</th><td>G5<br>G6</td></tr></table>'
    )
    expect(md).toContain('Création — 1975')
    expect(md).toContain('Ancien — G5 · G6') // <br> became " · "
    expect(/<table|<td|<tr/.test(md)).toBe(false)
  })

  it('repeats merged headers so spanned tables promote to a pipe table (owner idea)', () => {
    // colspan header repeated across its columns
    const colspan = tableMarkdown(
      '<table><tr><th colspan="2">Données</th></tr>' +
        '<tr><td>Année</td><td>PIB</td></tr><tr><td>2020</td><td>21T</td></tr></table>'
    )
    expect(colspan).toContain('| Données | Données |')
    expect(colspan).toContain('| 2020 | 21T |')
    expect(/<table|<td|<tr/.test(colspan)).toBe(false)
    // rowspan value carried down into each covered row
    const rowspan = tableMarkdown(
      '<table><tr><td>2020</td><td rowspan="2">France</td><td>21T</td></tr>' +
        '<tr><td>2021</td><td>23T</td></tr></table>'
    )
    expect(rowspan).toContain('| 2020 | France | 21T |')
    expect(rowspan).toContain('| 2021 | France | 23T |')
  })

  it('stripLeftoverHtml is the raw-HTML safety net: tables become text, no tag soup', () => {
    // fast path: plain markdown untouched
    expect(stripLeftoverHtml('plain **markdown**')).toBe('plain **markdown**')
    // stray inline tags stripped, text kept, whitespace collapsed
    expect(stripLeftoverHtml('<span>a</span> and <b>b</b>').trim()).toBe('a and b')
    // entities decoded alongside the tags they travel with (leftover HTML)
    expect(stripLeftoverHtml('<i>x&nbsp;y &amp; z</i>').trim()).toBe('x y & z')
    // the actual failure mode (owner report): a leftover infobox table
    // that turndown kept as raw HTML — reduced to readable text, no tags
    const rawTable =
      '<table about="#mwt2"><tbody>' +
      '<tr><th scope="row">Création</th><td>1975</td></tr>' +
      '<tr><th scope="row">Type</th><td>Conférence</td></tr>' +
      '</tbody></table>'
    const out = stripLeftoverHtml(rawTable)
    expect(/<table|<tbody|<tr|<td|<th/.test(out)).toBe(false)
    expect(out).toContain('Création')
    expect(out).toContain('1975')
    expect(out).toContain('Conférence')
  })

  it('reset without a reader refuses', () => {
    expect(() => resetWebReader(vault, dossierRel)).toThrow('no reader')
  })

  it('the correction-flip functions are pure and idempotent', () => {
    const recorded = withReaderRecorded(webDossier(), '2026-07-13T00:00:00Z', 'tr_1')
    expect(recorded).toContain('reader_text: ./reader.md')
    const flipped = withReaderCorrectionRecorded(recorded, '2026-07-13T01:00:00Z')
    expect(flipped).toContain('reader_corrected_at: 2026-07-13T01:00:00Z')
    expect(flipped).toContain('human-corrected')
    // idempotent: a second flip is a no-op
    expect(withReaderCorrectionRecorded(flipped, '2026-07-13T02:00:00Z')).toBe(flipped)
    // cleared returns to the pre-extraction shape
    const cleared = withReaderCleared(flipped)
    expect(cleared).toContain('status: imported')
    expect(cleared).not.toContain('reader_text:')
  })
})
