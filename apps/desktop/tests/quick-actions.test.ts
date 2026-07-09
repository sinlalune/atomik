import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { CompletionContext } from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import type { VaultFolder } from '../shared/ipc-contract'
import {
  bundleCompletions,
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
      insertionFor('notes/idea.md', bundle, {
        kind: 'image',
        vaultRel: 'sources/captures/Pascal 2/original.jpg'
      }).text
    ).toBe('![Pascal 2](<../sources/captures/Pascal 2/original.jpg>)')
  })

  it('falls back to a dossier link when the bundle has no media', () => {
    expect(insertionFor('notes/idea.md', bundle, null).text).toBe(
      '[Pascal 2](<../sources/captures/Pascal 2/source.md>)'
    )
  })

  it('inserts a PDF citation with the page number pre-selected (S06)', () => {
    const pdf = { name: 'jf-quote', dossierPath: 'sources/pdf/jf-quote/source.md' }
    const insertion = insertionFor('notes/idea.md', pdf, {
      kind: 'pdf',
      vaultRel: 'sources/pdf/jf-quote/original.pdf'
    })
    expect(insertion.text).toBe(
      '[jf-quote](<../sources/pdf/jf-quote/original.pdf#page=1>)'
    )
    // the selected span is exactly the page digit, ready to type over
    expect(insertion.text.slice(insertion.selectFrom, insertion.selectTo)).toBe('1')
    expect(insertion.text.slice(insertion.selectTo)).toBe('>)')
  })
})

describe('quickActionsSource', () => {
  const PDF_DOSSIER = [
    '---',
    'type: Atomik Source',
    'resource: ./original.pdf',
    '---',
    '',
    '| Anchor | Meaning | Target |',
    '|---|---|---|',
    '| `p2` | page 2 | [page 2](./original.pdf#page=2) |',
    ''
  ].join('\n')
  const readDossier = (dossierPath: string): Promise<string | null> =>
    Promise.resolve(
      dossierPath.startsWith('sources/pdf/') ? PDF_DOSSIER : '---\ntype: Atomik Source\n---'
    )
  const source = quickActionsSource(
    'notes/idea.md',
    () => Promise.resolve(sourceBundlesOf(tree)),
    readDossier
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
    expect(result!.options[0]!.detail).toBe('link to source.md')
  })

  it('offers the full choice set for a PDF bundle: citation, anchors, dossier', () => {
    const bundle = { name: 'jf-quote', dossierPath: 'sources/pdf/jf-quote/source.md' }
    const entries = bundleCompletions('notes/idea.md', bundle, PDF_DOSSIER)
    expect(entries.map((e) => e.label)).toEqual([
      '@jf-quote page…',
      '@jf-quote p2',
      '@jf-quote dossier'
    ])
    // the recorded anchor inserts an exact, fixed citation
    expect(entries[1]!.insertion.text).toBe(
      '[jf-quote — page 2](<../sources/pdf/jf-quote/original.pdf#page=2>)'
    )
    expect(entries[1]!.insertion.selectFrom).toBeUndefined()
    // the free-page citation keeps the digit selected
    expect(entries[0]!.insertion.selectFrom).toBeDefined()
    // the dossier link is always available
    expect(entries[2]!.insertion.text).toBe(
      '[jf-quote](<../sources/pdf/jf-quote/source.md>)'
    )
  })

  it('stays quiet without "@" unless explicitly invoked', async () => {
    expect(await complete('plain text', 5)).toBeNull()
    expect(await complete('plain text', 5, true)).not.toBeNull()
  })
})
