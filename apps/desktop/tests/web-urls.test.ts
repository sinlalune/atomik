import { describe, expect, it } from 'vitest'
import { normalizeInputUrl } from '../renderer/src/web/urls'

describe('URL-bar input (CP-MVP-006 S03)', () => {
  it('a bare host gains https://', () => {
    expect(normalizeInputUrl('colab.research.google.com')).toBe(
      'https://colab.research.google.com/'
    )
    expect(normalizeInputUrl('arxiv.org/abs/1706.03762')).toBe(
      'https://arxiv.org/abs/1706.03762'
    )
    expect(normalizeInputUrl('localhost:8888/tree')).toBe(
      'http://localhost:8888/tree'
    )
    expect(normalizeInputUrl('127.0.0.1:3000')).toBe(
      'http://127.0.0.1:3000/'
    )
  })

  it('explicit http(s) is kept, whitespace trimmed', () => {
    expect(normalizeInputUrl(' https://example.org/page?q=1 ')).toBe(
      'https://example.org/page?q=1'
    )
    expect(normalizeInputUrl('http://localhost:8888/tree')).toBe(
      'http://localhost:8888/tree'
    )
  })

  it('ordinary text and single words become an encoded Google search', () => {
    for (const query of [
      'heterogeneous backlog feedback',
      'obsidian',
      'site:example.org knowledge graph',
      'traduire une note en français'
    ]) {
      const destination = normalizeInputUrl(query)
      expect(destination).not.toBeNull()
      const url = new URL(destination!)
      expect(url.origin).toBe('https://www.google.com')
      expect(url.pathname).toBe('/search')
      expect(url.searchParams.get('q')).toBe(query)
    }
  })

  it('explicit unsafe or non-web schemes still fail closed', () => {
    expect(normalizeInputUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeInputUrl('file:///etc/passwd')).toBeNull()
    expect(normalizeInputUrl('data:text/html,x')).toBeNull()
    expect(normalizeInputUrl('ftp://example.org/file')).toBeNull()
    expect(normalizeInputUrl('https://')).toBeNull()
    expect(normalizeInputUrl('')).toBeNull()
    expect(normalizeInputUrl('   ')).toBeNull()
  })
})
