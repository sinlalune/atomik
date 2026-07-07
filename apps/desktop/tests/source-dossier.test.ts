import { describe, expect, it } from 'vitest'
import { hasImageResource, resourceOf } from '../renderer/src/source/dossier'

/** S05: the image tab finds its original through the dossier frontmatter. */
describe('dossier resource parsing', () => {
  const dossier = [
    '---',
    'type: Atomik Source',
    'title: Whiteboard',
    'resource: ./original.jpg',
    '---',
    '',
    'resource: ./decoy.png',
    ''
  ].join('\n')

  it('reads resource from the frontmatter only', () => {
    expect(resourceOf(dossier)).toBe('./original.jpg')
  })

  it('answers null without frontmatter or resource line', () => {
    expect(resourceOf('# Just a note\n')).toBeNull()
    expect(resourceOf('---\ntitle: x\n---\nbody\n')).toBeNull()
  })

  it('hasImageResource gates on the extension', () => {
    expect(hasImageResource(dossier)).toBe(true)
    expect(
      hasImageResource('---\nresource: ./original.pdf\n---\n')
    ).toBe(false)
    expect(hasImageResource('# no dossier\n')).toBe(false)
  })
})
