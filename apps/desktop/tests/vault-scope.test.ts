import { describe, expect, it } from 'vitest'
import type { VaultFolder } from '../shared/ipc-contract'
import { findSubtree } from '../renderer/src/vault/scope'

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
