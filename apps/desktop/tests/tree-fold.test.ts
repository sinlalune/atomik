import { describe, expect, it } from 'vitest'
import type { VaultFolder } from '../shared/ipc-contract'
import {
  allFolderPaths,
  parseOpenFolders,
  serializeOpenFolders,
  toggledFolder
} from '../renderer/src/vault/tree-fold'

/** Owner request: trees collapsed by default, fold state kept per tab. */

describe('tree fold state', () => {
  it('round-trips through the tab param', () => {
    const open = new Set(['sources', 'sources/captures'])
    expect(parseOpenFolders(serializeOpenFolders(open))).toEqual(open)
  })

  it('absent or garbled params read as all-collapsed', () => {
    expect(parseOpenFolders(undefined).size).toBe(0)
    expect(parseOpenFolders('').size).toBe(0)
    expect(parseOpenFolders('not json').size).toBe(0)
    expect(parseOpenFolders('{"a":1}').size).toBe(0)
    expect(parseOpenFolders('[1,2,"ok"]')).toEqual(new Set(['ok']))
  })

  it('clamps under the workspace param cap, dropping deepest first', () => {
    const many = new Set(
      Array.from({ length: 400 }, (_, i) => `folder/${'x'.repeat(20)}/${i}`)
    )
    const serialized = serializeOpenFolders(many)
    expect(serialized.length).toBeLessThanOrEqual(4000)
    expect(JSON.parse(serialized).length).toBeGreaterThan(0)
  })

  it('toggledFolder is identity-stable on no-ops (details mount events)', () => {
    const open: ReadonlySet<string> = new Set(['a'])
    expect(toggledFolder(open, 'a', true)).toBe(open)
    expect(toggledFolder(open, 'b', false)).toBe(open)
    expect([...toggledFolder(open, 'b', true)]).toEqual(['a', 'b'])
    expect([...toggledFolder(open, 'a', false)]).toEqual([])
  })

  it('allFolderPaths walks every nested folder', () => {
    const tree: VaultFolder = {
      name: 'root',
      relPath: '',
      notes: [],
      folders: [
        {
          name: 'a',
          relPath: 'a',
          notes: [],
          folders: [{ name: 'b', relPath: 'a/b', notes: [], folders: [] }]
        },
        { name: 'c', relPath: 'c', notes: [], folders: [] }
      ]
    }
    expect(allFolderPaths(tree)).toEqual(['a', 'a/b', 'c'])
  })
})
