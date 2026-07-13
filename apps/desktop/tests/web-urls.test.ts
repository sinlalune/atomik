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
  })

  it('explicit http(s) is kept, whitespace trimmed', () => {
    expect(normalizeInputUrl(' https://example.org/page?q=1 ')).toBe(
      'https://example.org/page?q=1'
    )
    expect(normalizeInputUrl('http://localhost:8888/tree')).toBe(
      'http://localhost:8888/tree'
    )
  })

  it('anything that is not the web returns null', () => {
    expect(normalizeInputUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeInputUrl('file:///etc/passwd')).toBeNull()
    expect(normalizeInputUrl('data:text/html,x')).toBeNull()
    expect(normalizeInputUrl('')).toBeNull()
    expect(normalizeInputUrl('   ')).toBeNull()
    expect(normalizeInputUrl('not a url')).toBeNull()
  })
})
