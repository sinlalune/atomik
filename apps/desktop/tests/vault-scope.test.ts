import { describe, expect, it } from 'vitest'
import type { VaultFolder } from '../shared/ipc-contract'
import {
  findSubtree,
  noteDisplayName,
  splitPillNotes
} from '../renderer/src/vault/scope'

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

describe('splitPillNotes', () => {
  it('lifts index.md and log.md out of the list, index first', () => {
    const { pills, rest } = splitPillNotes([
      { name: 'zebra.md', relPath: 'p/zebra.md' },
      { name: 'log.md', relPath: 'p/log.md' },
      { name: 'index.md', relPath: 'p/index.md' },
      { name: 'alpha.md', relPath: 'p/alpha.md' }
    ])
    expect(pills.map((n) => n.name)).toEqual(['index.md', 'log.md'])
    expect(rest.map((n) => n.name)).toEqual(['zebra.md', 'alpha.md'])
  })

  it('is case-insensitive and leaves near-misses in the list', () => {
    const { pills, rest } = splitPillNotes([
      { name: 'Index.MD', relPath: 'Index.MD' },
      { name: 'index-old.md', relPath: 'index-old.md' },
      { name: 'changelog.md', relPath: 'changelog.md' }
    ])
    expect(pills.map((n) => n.name)).toEqual(['Index.MD'])
    expect(rest).toHaveLength(2)
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
