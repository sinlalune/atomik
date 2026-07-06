import { describe, expect, it } from 'vitest'
import type { VaultFolder } from '../shared/ipc-contract'
import { findSubtree, noteDisplayName } from '../renderer/src/vault/scope'

const tree: VaultFolder = {
  name: 'vault',
  relPath: '',
  notes: [{ name: 'welcome.md', relPath: 'welcome.md' }],
  folders: [
    {
      name: 'projects',
      relPath: 'projects',
      notes: [],
      folders: [
        {
          name: 'demo',
          relPath: 'projects/demo',
          notes: [{ name: 'index.md', relPath: 'projects/demo/index.md' }],
          folders: []
        }
      ]
    }
  ]
}

describe('findSubtree', () => {
  it('returns the root for the empty path and nested folders by path', () => {
    expect(findSubtree(tree, '')).toBe(tree)
    expect(findSubtree(tree, 'projects/demo')?.notes[0]?.relPath).toBe(
      'projects/demo/index.md'
    )
  })

  it('returns null for unknown paths', () => {
    expect(findSubtree(tree, 'projects/ghost')).toBeNull()
    expect(findSubtree(tree, 'welcome.md')).toBeNull()
  })
})

describe('noteDisplayName', () => {
  it('drops the implied .md and any leading path', () => {
    expect(noteDisplayName('welcome.md')).toBe('welcome')
    expect(noteDisplayName('projects/demo/index.md')).toBe('index')
    expect(noteDisplayName('notes/Read Me.MD')).toBe('Read Me')
  })

  it('leaves non-.md names untouched (display never invents truncation)', () => {
    expect(noteDisplayName('diagram.svg')).toBe('diagram.svg')
    expect(noteDisplayName('md')).toBe('md')
    expect(noteDisplayName('note.md.bak')).toBe('note.md.bak')
  })
})
