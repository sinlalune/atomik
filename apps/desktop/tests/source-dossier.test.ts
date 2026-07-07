import { describe, expect, it } from 'vitest'
import {
  hasImageResource,
  resourceOf,
  rotationOf,
  withDossierRotation
} from '../renderer/src/source/dossier'

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

describe('dossier rotation (owner correction: sideways phone photos)', () => {
  const dossier = [
    '---',
    'type: Atomik Source',
    'resource: ./original.jpg',
    'atomik:',
    '  id: capture_x',
    '  capture:',
    '    method: local-wifi-qr',
    '---',
    '',
    '# Source dossier',
    ''
  ].join('\n')

  it('reads 0 when unrecorded, and only quarter turns otherwise', () => {
    expect(rotationOf(dossier)).toBe(0)
    expect(rotationOf(withDossierRotation(dossier, 90))).toBe(90)
    expect(rotationOf(dossier.replace('---\n\n', '---\n\nrotation: 90\n'))).toBe(0)
  })

  it('seats the rotation under capture: and replaces it on re-rotation', () => {
    const rotated = withDossierRotation(dossier, 90)
    expect(rotated).toContain('  capture:\n    rotation: 90\n    method: local-wifi-qr')
    const again = withDossierRotation(rotated, 180)
    expect(rotationOf(again)).toBe(180)
    expect(again.match(/rotation:/g)).toHaveLength(1)
    // the body is untouched
    expect(again).toContain('# Source dossier')
  })

  it('leaves non-dossier content alone', () => {
    expect(withDossierRotation('# plain note\n', 90)).toBe('# plain note\n')
  })
})
