import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  webProvenanceFor,
  webProvenanceFromDossier
} from '../electron-main/web-provenance'

const DOSSIER = [
  '---',
  'type: Atomik Source',
  'title: "MDN \\"Attention\\" — a guide"',
  'description: Web source imported from example.org; the snapshot is the evidence.',
  'resource: https://example.org/guide',
  'tags: [web, source]',
  'timestamp: 2026-07-13T10:00:00Z',
  'atomik:',
  '  id: source_web_2026_07_13_abcd1234',
  '  source_type: web',
  '  status: extracted',
  '  original_url: https://example.org/guide',
  '  accessed_at: 2026-07-13T10:00:00Z',
  '  snapshot: ./snapshot.mhtml',
  '---',
  '',
  '# Source dossier',
  ''
].join('\n')

describe('webProvenanceFromDossier (pure: dossier → provenance)', () => {
  it('reads url, accessed_at, and the unquoted title', () => {
    const provenance = webProvenanceFromDossier(
      DOSSIER,
      'sources/web/guide/source.md'
    )
    expect(provenance).toEqual({
      url: 'https://example.org/guide',
      dossierPath: 'sources/web/guide/source.md',
      accessedAt: '2026-07-13T10:00:00Z',
      title: 'MDN "Attention" — a guide'
    })
  })

  it('returns null when the dossier declares no original_url', () => {
    const notWeb = DOSSIER.replace(/^ {2}original_url: .*$\n/m, '')
    expect(
      webProvenanceFromDossier(notWeb, 'sources/web/guide/source.md')
    ).toBeNull()
  })

  it('missing optional fields are omitted, not invented', () => {
    const bare = [
      '---',
      'atomik:',
      '  original_url: https://example.org/bare',
      '---'
    ].join('\n')
    expect(
      webProvenanceFromDossier(bare, 'sources/web/bare/source.md')
    ).toEqual({
      url: 'https://example.org/bare',
      dossierPath: 'sources/web/bare/source.md'
    })
  })
})

describe('webProvenanceFor (fs resolve — best-effort by design)', () => {
  let vault: string

  beforeEach(() => {
    vault = mkdtempSync(join(tmpdir(), 'atomik-prov-'))
    mkdirSync(join(vault, 'sources/web/guide'), { recursive: true })
    writeFileSync(join(vault, 'sources/web/guide/source.md'), DOSSIER)
  })

  afterEach(() => {
    rmSync(vault, { recursive: true, force: true })
  })

  it('resolves a web-reader relPath to its dossier provenance', () => {
    const map = webProvenanceFor(vault, ['sources/web/guide/reader.md'])
    expect(map.get('sources/web/guide/reader.md')?.url).toBe(
      'https://example.org/guide'
    )
    expect(map.get('sources/web/guide/reader.md')?.dossierPath).toBe(
      'sources/web/guide/source.md'
    )
  })

  it('ignores non-web paths and never throws on a missing dossier', () => {
    const map = webProvenanceFor(vault, [
      'notes/attention.md',
      'sources/pdf/paper/extracted.md',
      'sources/web/ghost/reader.md',
      'sources/web/guide/source.md'
    ])
    expect(map.size).toBe(0)
  })

  it('the relPath shape is strict: traversal never reaches the fs', () => {
    // the slug segment rejects '/' and a leading '.'; a matching path
    // can therefore never climb out of sources/web/.
    const map = webProvenanceFor(vault, [
      'sources/web/../reader.md',
      'sources/web/../../../etc/reader.md',
      '/etc/passwd',
      'sources/web/a/b/reader.md'
    ])
    expect(map.size).toBe(0)
  })
})
