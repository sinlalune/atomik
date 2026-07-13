import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  cleanMetaText,
  importWebSource,
  webSlug,
  type SnapshotSaver
} from '../electron-main/web-import'

describe('web page as source (CP-MVP-006 S04) — bundle through the gates', () => {
  let vault: string
  beforeEach(() => {
    vault = mkdtempSync(join(tmpdir(), 'atomik-web-vault-'))
  })
  afterEach(() => {
    rmSync(vault, { recursive: true, force: true })
  })

  const fakeSnapshot: SnapshotSaver = (abs) => {
    writeFileSync(abs, 'MIME-Version: 1.0\nfake mhtml body', { flag: 'wx' })
    return Promise.resolve()
  }

  it('slugs titles honestly, falls back to the URL, then to a constant', () => {
    expect(webSlug('Attention Is All You Need', 'https://arxiv.org/x')).toBe(
      'attention-is-all-you-need'
    )
    expect(webSlug('Éléments d’analyse (T2)', 'https://x.org/')).toBe(
      'elements-d-analyse-t2'
    )
    expect(webSlug('', 'https://colab.research.google.com/notebooks/intro')).toBe(
      'colab-research-google-com-notebooks-intro'
    )
    expect(webSlug('???', 'not a url')).toBe('web-page')
  })

  it('sanitizes hostile page text: one line, no table/code metachars, capped', () => {
    expect(cleanMetaText('  a\n\nb\tc  ')).toBe('a b c')
    expect(cleanMetaText('x | y `z`')).toBe('x  y z')
    expect(cleanMetaText('a'.repeat(500), 10)).toBe('aaaaaaaaaa')
    expect(cleanMetaText('\n \t ')).toBeNull()
    expect(cleanMetaText(42)).toBeNull()
    expect(cleanMetaText('bell\u0007and\u0000nul')).toBe('bell and nul')
  })

  it('lands the bundle: hashed snapshot, dossier with 09 evidence metadata, index map', async () => {
    const { dossierPath } = await importWebSource(
      vault,
      {
        url: 'https://example.org/article',
        title: 'A Fine Article',
        meta: {
          canonical: 'https://example.org/article-canonical',
          author: 'Ada L.',
          publisher: 'Example Press',
          published: '2026-01-15',
          description: 'What the page says about itself.'
        }
      },
      fakeSnapshot
    )
    expect(dossierPath).toBe('sources/web/a-fine-article/source.md')
    const dir = join(vault, 'sources/web/a-fine-article')
    expect(readFileSync(join(dir, 'snapshot.mhtml'), 'utf8')).toContain('MIME-Version')
    const dossier = readFileSync(join(dir, 'source.md'), 'utf8')
    expect(dossier).toContain('source_type: web')
    expect(dossier).toContain('resource: https://example.org/article')
    expect(dossier).toContain('canonical_url: https://example.org/article-canonical')
    expect(dossier).toMatch(/snapshot_sha256: [0-9a-f]{64}/)
    expect(dossier).toMatch(/accessed_at: \d{4}-/)
    expect(dossier).toContain('| author | Ada L. |')
    expect(dossier).toContain('| license | not reviewed')
    expect(dossier).toContain('- None yet — reader extraction arrives with the web pipeline (S05).')
    expect(readFileSync(join(dir, 'index.md'), 'utf8')).toContain(
      '[snapshot.mhtml](./snapshot.mhtml)'
    )
  })

  it('a hostile title cannot inject frontmatter or markdown', async () => {
    const { dossierPath } = await importWebSource(
      vault,
      {
        url: 'https://evil.example/page',
        title: 'x"\natomik:\n  status: extracted\n| pwn | row |',
        meta: { author: 'a | b\ninjected: yes' }
      },
      fakeSnapshot
    )
    const dossier = readFileSync(join(vault, dossierPath), 'utf8')
    // the title landed as ONE quoted line; the injected keys never
    // became structure
    expect(dossier).not.toContain('\ninjected: yes')
    expect(dossier).not.toContain('\n  status: extracted')
    expect(dossier).toContain('| author | a  b injected: yes |')
    const fence = /^---\n([\s\S]*?)\n---/.exec(dossier)!
    expect(fence[1]).toContain('status: imported')
  })

  it('refuses non-pages before touching the vault', async () => {
    for (const url of ['about:blank', 'file:///etc/passwd', 'not a url', '']) {
      await expect(
        importWebSource(vault, { url, title: 't' }, fakeSnapshot)
      ).rejects.toThrow('not a web page')
    }
    expect(existsSync(join(vault, 'sources'))).toBe(false)
  })

  it('drops a javascript: canonical instead of recording it', async () => {
    const { dossierPath } = await importWebSource(
      vault,
      {
        url: 'https://example.org/p',
        title: 'p',
        // eslint-disable-next-line no-script-url
        meta: { canonical: 'javascript:alert(1)' }
      },
      fakeSnapshot
    )
    const dossier = readFileSync(join(vault, dossierPath), 'utf8')
    expect(dossier).not.toContain('javascript:')
    expect(dossier).not.toContain('canonical_url:')
  })

  it('never overwrites: same title lands a numbered sibling', async () => {
    await importWebSource(vault, { url: 'https://a.example/1', title: 'Page' }, fakeSnapshot)
    const second = await importWebSource(
      vault,
      { url: 'https://a.example/2', title: 'Page' },
      fakeSnapshot
    )
    expect(second.dossierPath).toBe('sources/web/page-2/source.md')
    expect(existsSync(join(vault, 'sources/web/page/snapshot.mhtml'))).toBe(true)
    expect(existsSync(join(vault, 'sources/web/page-2/snapshot.mhtml'))).toBe(true)
  })

  it('a failed or empty snapshot leaves NO half bundle behind', async () => {
    const failing: SnapshotSaver = () => Promise.reject(new Error('savePage: boom'))
    await expect(
      importWebSource(vault, { url: 'https://x.example/p', title: 'Boom' }, failing)
    ).rejects.toThrow('boom')
    expect(existsSync(join(vault, 'sources/web/boom'))).toBe(false)

    const empty: SnapshotSaver = (abs) => {
      writeFileSync(abs, '')
      return Promise.resolve()
    }
    await expect(
      importWebSource(vault, { url: 'https://x.example/p', title: 'Empty' }, empty)
    ).rejects.toThrow('empty')
    expect(existsSync(join(vault, 'sources/web/empty'))).toBe(false)
  })
})
