import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { CompletionContext } from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import type { VaultFolder } from '../shared/ipc-contract'
import {
  insertionFor,
  quickActionsSource,
  relativePathBetween,
  sourceBundlesOf
} from '../renderer/src/editor/quick-actions'

/** Owner request: "@" opens quick actions; @captures lists and inserts. */

const tree: VaultFolder = {
  name: 'vault',
  relPath: '',
  notes: [{ name: 'top.md', relPath: 'top.md' }],
  folders: [
    {
      name: 'captures',
      relPath: 'sources/captures',
      notes: [],
      folders: [
        {
          name: 'Pascal',
          relPath: 'sources/captures/Pascal',
          notes: [
            { name: 'index.md', relPath: 'sources/captures/Pascal/index.md' },
            { name: 'source.md', relPath: 'sources/captures/Pascal/source.md' }
          ],
          folders: []
        },
        {
          name: 'Zebra',
          relPath: 'sources/captures/Zebra',
          notes: [{ name: 'source.md', relPath: 'sources/captures/Zebra/source.md' }],
          folders: []
        }
      ]
    },
    {
      name: 'notes',
      relPath: 'notes',
      notes: [{ name: 'plain.md', relPath: 'notes/plain.md' }],
      folders: []
    }
  ]
}

describe('sourceBundlesOf', () => {
  it('collects every folder holding a source.md, sorted by name', () => {
    expect(sourceBundlesOf(tree)).toEqual([
      { name: 'Pascal', dossierPath: 'sources/captures/Pascal/source.md' },
      { name: 'Zebra', dossierPath: 'sources/captures/Zebra/source.md' }
    ])
  })
})

describe('relativePathBetween', () => {
  it('walks up from the note folder and down to the target', () => {
    expect(
      relativePathBetween('notes/deep/idea.md', 'sources/captures/P/original.jpg')
    ).toBe('../../sources/captures/P/original.jpg')
    expect(relativePathBetween('top.md', 'sources/x.jpg')).toBe('sources/x.jpg')
    expect(
      relativePathBetween('sources/captures/note.md', 'sources/captures/P/original.jpg')
    ).toBe('P/original.jpg')
  })
})

describe('insertionFor', () => {
  const bundle = { name: 'Pascal 2', dossierPath: 'sources/captures/Pascal 2/source.md' }

  it('inserts an image embed with an angle-bracketed destination', () => {
    expect(
      insertionFor('notes/idea.md', bundle, 'sources/captures/Pascal 2/original.jpg')
    ).toBe('![Pascal 2](<../sources/captures/Pascal 2/original.jpg>)')
  })

  it('falls back to a dossier link when the bundle has no image', () => {
    expect(insertionFor('notes/idea.md', bundle, null)).toBe(
      '[Pascal 2](<../sources/captures/Pascal 2/source.md>)'
    )
  })
})

describe('quickActionsSource', () => {
  const source = quickActionsSource('notes/idea.md', () =>
    Promise.resolve(sourceBundlesOf(tree))
  )

  async function complete(doc: string, pos: number, explicit = false) {
    const state = EditorState.create({
      doc,
      extensions: [markdown({ base: markdownLanguage })]
    })
    return source(new CompletionContext(state, pos, explicit))
  }

  it('offers the capture bundles after "@"', async () => {
    const result = await complete('see @Pa', 7)
    expect(result).not.toBeNull()
    expect(result!.from).toBe(4)
    expect(result!.options.map((option) => option.label)).toEqual([
      '@Pascal',
      '@Zebra'
    ])
    expect(result!.options[0]!.detail).toBe('capture')
  })

  it('stays quiet without "@" unless explicitly invoked', async () => {
    expect(await complete('plain text', 5)).toBeNull()
    expect(await complete('plain text', 5, true)).not.toBeNull()
  })
})
