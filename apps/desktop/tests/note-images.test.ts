import { describe, expect, it } from 'vitest'
import {
  inlineImageSources,
  vaultImageSources
} from '../renderer/src/vault/note-images'

/** Owner request: photos referenced from notes render in read mode. */
describe('vaultImageSources', () => {
  const html = [
    '<p><img src="../sources/captures/pascal/original.jpg" alt="page"></p>',
    '<p><img src="diagram.png" alt="d"></p>',
    '<p><img src="https://example.com/x.jpg" alt="ext"></p>',
    '<p><img src="data:image/png;base64,AAAA" alt="inline"></p>',
    '<p><img src="/absolute.jpg" alt="abs"></p>',
    '<p><img src="notes.pdf" alt="not-an-image"></p>'
  ].join('\n')

  it('collects only relative vault images, resolved from the note', () => {
    const sources = vaultImageSources(html, 'notes/pascal.md')
    expect([...sources]).toEqual([
      ['../sources/captures/pascal/original.jpg', 'sources/captures/pascal/original.jpg'],
      ['diagram.png', 'notes/diagram.png']
    ])
  })

  it('decodes percent-encoded destinations (spaces in folder names)', () => {
    const sources = vaultImageSources(
      '<img src="Pascal%202/original.jpg">',
      'sources/captures/note.md'
    )
    expect(sources.get('Pascal%202/original.jpg')).toBe(
      'sources/captures/Pascal 2/original.jpg'
    )
  })

  it('never escapes the vault root', () => {
    expect(vaultImageSources('<img src="../../x.jpg">', 'top.md').size).toBe(0)
  })

  it('inlines fetched data URLs and leaves failures untouched', () => {
    const out = inlineImageSources(html, new Map([['diagram.png', 'data:image/png;base64,BB']]))
    expect(out).toContain('<img src="data:image/png;base64,BB" alt="d">')
    expect(out).toContain('<img src="../sources/captures/pascal/original.jpg" alt="page">')
  })
})
