import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { CompletionContext } from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import type { VaultFolder } from '../shared/ipc-contract'
import {
  bundleCompletions,
  derivedTextEntries,
  insertionFor,
  linkableNotesOf,
  noteLinkEntry,
  promptLayerEntries,
  quickActionsSource,
  quoteBlockFor,
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

describe('promptLayerEntries (S03e — prompts lead the @ menu in prompts/ folders)', () => {
  const promptTree: VaultFolder = {
    name: 'vault',
    relPath: '',
    notes: [{ name: 'welcome.md', relPath: 'welcome.md' }],
    folders: [
      {
        name: 'prompts',
        relPath: 'prompts',
        notes: [
          { name: 'tone.md', relPath: 'prompts/tone.md' },
          { name: 'personality.md', relPath: 'prompts/personality.md' },
          { name: 'index.md', relPath: 'prompts/index.md' }
        ],
        folders: []
      }
    ]
  }
  const files: Record<string, string> = {
    'prompts/tone.md': '---\nkind: system\ntitle: Tone\n---\n\nStay terse.',
    'prompts/personality.md':
      '---\nkind: message\ntitle: Personality\n---\n\nBe playful.'
  }
  const readNote = (relPath: string): Promise<string | null> =>
    Promise.resolve(files[relPath] ?? null)

  it('offers sibling prompts as layer insertions, chipped prompt, never itself', async () => {
    const entries = await promptLayerEntries('prompts/tone.md', promptTree, readNote)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      kind: 'prompt',
      title: 'Personality',
      insertion: { text: '{{prompt: personality}}' }
    })
    expect(entries[0]!.detail).toContain('message')
    expect(entries[0]!.detail).toContain('insert layer')
    expect(entries[0]!.boost).toBeGreaterThan(0)
  })

  it('offers nothing outside a prompts/ folder — a directive is inert there', async () => {
    expect(await promptLayerEntries('welcome.md', promptTree, readNote)).toEqual([])
  })

  it('boosts nearest scopes above root ones (folder → root order)', async () => {
    const nested: VaultFolder = {
      ...promptTree,
      folders: [
        ...promptTree.folders,
        {
          name: 'projects',
          relPath: 'projects',
          notes: [],
          folders: [
            {
              name: 'x',
              relPath: 'projects/x',
              notes: [],
              folders: [
                {
                  name: 'prompts',
                  relPath: 'projects/x/prompts',
                  notes: [
                    { name: 'local.md', relPath: 'projects/x/prompts/local.md' },
                    { name: 'draft.md', relPath: 'projects/x/prompts/draft.md' }
                  ],
                  folders: []
                }
              ]
            }
          ]
        }
      ]
    }
    const nestedFiles: Record<string, string> = {
      ...files,
      'projects/x/prompts/local.md': '---\nkind: message\n---\n\nLocal body.'
    }
    const entries = await promptLayerEntries(
      'projects/x/prompts/draft.md',
      nested,
      (relPath) => Promise.resolve(nestedFiles[relPath] ?? null)
    )
    // nearest (own folder) first, then root; the boost encodes it
    expect(entries.map((entry) => entry.insertion?.text)).toEqual([
      '{{prompt: local}}',
      '{{prompt: tone}}',
      '{{prompt: personality}}'
    ])
    expect(entries[0]!.boost!).toBeGreaterThan(entries[1]!.boost!)
  })
})

describe('sourceBundlesOf', () => {
  it('collects every folder holding a source.md, sorted by name', () => {
    expect(sourceBundlesOf(tree)).toEqual([
      { name: 'Pascal', dossierPath: 'sources/captures/Pascal/source.md' },
      { name: 'Zebra', dossierPath: 'sources/captures/Zebra/source.md' }
    ])
  })
})

describe('linkableNotesOf', () => {
  const bundleTree: VaultFolder = {
    name: 'vault',
    relPath: '',
    notes: [{ name: 'me.md', relPath: 'me.md' }],
    folders: [
      {
        name: 'gaul',
        relPath: 'sources/web/gaul',
        notes: [
          { name: 'source.md', relPath: 'sources/web/gaul/source.md' },
          { name: 'reader.md', relPath: 'sources/web/gaul/reader.md' },
          { name: 'ai-summary.md', relPath: 'sources/web/gaul/ai-summary.md' }
        ],
        folders: []
      }
    ]
  }

  it('excludes the edited note and bundle CONTRACT files, keeps ordinary bundle residents (S07e-e rule)', () => {
    expect(linkableNotesOf(bundleTree, 'me.md')).toEqual([
      { name: 'ai-summary', relPath: 'sources/web/gaul/ai-summary.md' }
    ])
  })

  it('keeps convention files outside bundles linkable', () => {
    const plain: VaultFolder = {
      name: 'vault',
      relPath: '',
      notes: [{ name: 'index.md', relPath: 'index.md' }],
      folders: []
    }
    expect(linkableNotesOf(plain, 'other.md')).toEqual([
      { name: 'index', relPath: 'index.md' }
    ])
  })

  it('orders by the inverse tree hierarchy: current folder first, then up to the root', () => {
    const deep: VaultFolder = {
      name: 'vault',
      relPath: '',
      notes: [{ name: 'root.md', relPath: 'root.md' }],
      folders: [
        {
          name: 'projects',
          relPath: 'projects',
          notes: [{ name: 'parent.md', relPath: 'projects/parent.md' }],
          folders: [
            {
              name: 'crud',
              relPath: 'projects/crud',
              notes: [
                { name: 'sibling.md', relPath: 'projects/crud/sibling.md' },
                { name: 'edited.md', relPath: 'projects/crud/edited.md' }
              ],
              folders: []
            },
            {
              name: 'other',
              relPath: 'projects/other',
              notes: [{ name: 'cousin.md', relPath: 'projects/other/cousin.md' }],
              folders: []
            }
          ]
        }
      ]
    }
    expect(
      linkableNotesOf(deep, 'projects/crud/edited.md').map((note) => note.name)
    ).toEqual(['sibling', 'parent', 'cousin', 'root'])
  })
})

describe('noteLinkEntry', () => {
  it('builds the note pill row and inserts a relative angle-bracket link', () => {
    const entry = noteLinkEntry('notes/idea.md', {
      name: 'plain',
      relPath: 'notes/deep/plain.md'
    })
    expect(entry.kind).toBe('note')
    expect(entry.title).toBe('plain')
    expect(entry.label).toBe('@plain')
    expect(entry.detail).toBe('link')
    expect(entry.insertion!.text).toBe('[plain](<deep/plain.md>)')
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

  it('inserts a web citation pointing at the absolute live-page URL (S06)', () => {
    const web = { name: 'backprop', dossierPath: 'sources/web/backprop/source.md' }
    expect(
      insertionFor('notes/idea.md', web, {
        kind: 'web',
        url: 'https://en.wikipedia.org/wiki/Backpropagation'
      }).text
    ).toBe('[backprop](<https://en.wikipedia.org/wiki/Backpropagation>)')
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
    () => Promise.resolve(tree),
    readDossier
  )

  async function complete(doc: string, pos: number, explicit = false) {
    const state = EditorState.create({
      doc,
      extensions: [markdown({ base: markdownLanguage })]
    })
    return source(new CompletionContext(state, pos, explicit))
  }

  it('offers the capture bundles after "@", then linkable notes (S07h)', async () => {
    const result = await complete('see @Pa', 7)
    expect(result).not.toBeNull()
    expect(result!.from).toBe(4)
    expect(result!.options.map((option) => option.label)).toEqual([
      '@Pascal',
      '@Zebra',
      '@plain',
      '@top'
    ])
    expect(result!.options[0]!.detail).toBe('link to source.md')
    // Row format: kind pill (type) + doc title (displayLabel) + action
    // label (detail) — the pill renders from `type` in the icon slot.
    expect(result!.options[0]!.type).toBe('source')
    expect(result!.options[0]!.displayLabel).toBe('Pascal')
    expect(result!.options[2]!.type).toBe('note')
    expect(result!.options[2]!.displayLabel).toBe('plain')
    expect(result!.options[2]!.detail).toBe('link')
    expect(result!.options[3]!.displayLabel).toBe('top')
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
    expect(entries[1]!.insertion!.text).toBe(
      '[jf-quote — page 2](<../sources/pdf/jf-quote/original.pdf#page=2>)'
    )
    expect(entries[1]!.insertion!.selectFrom).toBeUndefined()
    // the free-page citation keeps the digit selected
    expect(entries[0]!.insertion!.selectFrom).toBeDefined()
    // the dossier link is always available
    expect(entries[2]!.insertion!.text).toBe(
      '[jf-quote](<../sources/pdf/jf-quote/source.md>)'
    )
  })

  it('offers the web choice set: url citation + dossier (CP-MVP-006 S06)', () => {
    const bundle = { name: 'backprop', dossierPath: 'sources/web/backprop/source.md' }
    const dossier = [
      '---',
      'type: Atomik Source',
      'resource: https://en.wikipedia.org/wiki/Backpropagation',
      '---'
    ].join('\n')
    const entries = bundleCompletions('notes/idea.md', bundle, dossier)
    expect(entries.map((e) => e.label)).toEqual([
      '@backprop url',
      '@backprop dossier'
    ])
    expect(entries[0]!.insertion!.text).toBe(
      '[backprop](<https://en.wikipedia.org/wiki/Backpropagation>)'
    )
    expect(entries[1]!.insertion!.text).toBe(
      '[backprop](<../sources/web/backprop/source.md>)'
    )
  })

  it('offers reader.md as a derived quote block for web bundles (S06)', async () => {
    const bundle = { name: 'backprop', dossierPath: 'sources/web/backprop/source.md' }
    const dossier = 'resource: https://x/\n- [Reader text](./reader.md) — derived, uncorrected.'
    const reads: string[] = []
    const readDossier = (path: string): Promise<string | null> => {
      reads.push(path)
      return Promise.resolve('---\ntype: X\n---\n\nBackprop is chain rule.')
    }
    const entries = derivedTextEntries('notes/idea.md', bundle, dossier, readDossier)
    expect(entries.map((e) => e.label)).toEqual(['@backprop reader'])
    const insertion = await entries[0]!.loadInsertion!()
    expect(reads).toEqual(['sources/web/backprop/reader.md'])
    expect(insertion.text).toContain('> **backprop — reader text**')
    expect(insertion.text).toContain('> Backprop is chain rule.')
  })

  it('offers derived-text quote blocks read at apply time (S06f)', async () => {
    const bundle = { name: 'jf-quote', dossierPath: 'sources/pdf/jf-quote/source.md' }
    const dossier = 'resource: ./original.pdf\n- [Extracted text](./extracted.md) — derived.'
    const reads: string[] = []
    const readDossier = (path: string): Promise<string | null> => {
      reads.push(path)
      return Promise.resolve('---\ntype: X\n---\n\nLigne un.\n\nLigne deux.')
    }
    const entries = derivedTextEntries('notes/idea.md', bundle, dossier, readDossier)
    expect(entries.map((e) => e.label)).toEqual(['@jf-quote extracted'])
    expect(reads).toHaveLength(0) // nothing read at MENU time
    const insertion = await entries[0]!.loadInsertion!()
    expect(reads).toEqual(['sources/pdf/jf-quote/extracted.md'])
    expect(insertion.text).toBe(
      [
        '> **jf-quote — extracted text** ([source](<../sources/pdf/jf-quote/extracted.md>))',
        '>',
        '> Ligne un.',
        '>',
        '> Ligne deux.',
        ''
      ].join('\n')
    )
    // frontmatter stripped, body quoted
    expect(insertion.text).not.toContain('type: X')
    // pure block helper is stable
    expect(quoteBlockFor('n', 'transcript', 'a\n\nb', 'x.md')).toContain('> **n — transcript**')
  })

  it('stays quiet without "@" unless explicitly invoked', async () => {
    expect(await complete('plain text', 5)).toBeNull()
    expect(await complete('plain text', 5, true)).not.toBeNull()
  })
})
