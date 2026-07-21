import { describe, expect, it } from 'vitest'
import type { VaultFolder } from '../shared/ipc-contract'
import {
  collectPromptRefs,
  loadPromptsFor,
  materializeStarterPrompts,
  parsePromptFile,
  promptFolderChainFor,
  scopeLabel,
  STARTER_PROMPTS
} from '../renderer/src/editor/prompts'

/** VaultFolder tree from note paths — the shape listVaultFiles returns. */
function treeOf(paths: string[]): VaultFolder {
  const root: VaultFolder = { name: '', relPath: '', folders: [], notes: [] }
  for (const path of paths) {
    const segments = path.split('/')
    let current = root
    for (const segment of segments.slice(0, -1)) {
      let next = current.folders.find((folder) => folder.name === segment)
      if (!next) {
        next = {
          name: segment,
          relPath: current.relPath.length > 0 ? `${current.relPath}/${segment}` : segment,
          folders: [],
          notes: []
        }
        current.folders.push(next)
      }
      current = next
    }
    current.notes.push({ name: segments.at(-1)!, relPath: path })
  }
  return root
}

const promptContent = (kind: string, body: string, title?: string): string =>
  ['---', `kind: ${kind}`, ...(title ? [`title: ${title}`] : []), '---', '', body].join('\n')

describe('promptFolderChainFor (nearest first)', () => {
  it('walks from the note folder to the root', () => {
    expect(promptFolderChainFor('a/b/c.md')).toEqual([
      'a/b/prompts',
      'a/prompts',
      'prompts'
    ])
    expect(promptFolderChainFor('c.md')).toEqual(['prompts'])
  })
})

describe('collectPromptRefs (scoped scan + shadowing)', () => {
  const tree = treeOf([
    'prompts/tone.md',
    'prompts/vault-only.md',
    'prompts/index.md',
    'prompts/log.md',
    'projects/x/prompts/tone.md',
    'projects/x/prompts/project-only.md',
    'projects/x/notes/prompts/nearest.md',
    'projects/x/notes/note.md',
    'elsewhere/prompts/far.md'
  ])

  it('resolves nearest-first, shadows by name, skips convention files', () => {
    const refs = collectPromptRefs(tree, 'projects/x/notes/note.md')
    expect(refs.map((ref) => ref.relPath)).toEqual([
      'projects/x/notes/prompts/nearest.md',
      'projects/x/prompts/tone.md', // shadows prompts/tone.md
      'projects/x/prompts/project-only.md',
      'prompts/vault-only.md'
    ])
    expect(refs.find((ref) => ref.name === 'tone')?.scopeFolder).toBe('projects/x')
    // off-chain folders never leak in
    expect(refs.some((ref) => ref.relPath.startsWith('elsewhere/'))).toBe(false)
  })

  it('root note sees only the root scope', () => {
    const refs = collectPromptRefs(tree, 'welcome.md')
    expect(refs.map((ref) => ref.name).sort()).toEqual(['tone', 'vault-only'])
    expect(refs.every((ref) => ref.scopeFolder === '')).toBe(true)
  })
})

describe('parsePromptFile', () => {
  it('parses kind/title/description and the body below the fence', () => {
    const parsed = parsePromptFile(
      '---\nkind: system\ntitle: Grounded\ndescription: Stays close.\n---\n\nBody line.\n'
    )
    expect(parsed).toEqual({
      kind: 'system',
      title: 'Grounded',
      description: 'Stays close.',
      body: 'Body line.'
    })
  })

  it('rejects non-prompts without erroring: no fence, bad kind, empty body', () => {
    expect(parsePromptFile('just a note')).toBeNull()
    expect(parsePromptFile('---\nkind: wizard\n---\nbody')).toBeNull()
    expect(parsePromptFile('---\nkind: message\n---\n\n  \n')).toBeNull()
  })
})

describe('loadPromptsFor (existing verbs only, injected)', () => {
  const tree = treeOf([
    'a/prompts/near.md',
    'prompts/near.md',
    'prompts/style.md',
    'prompts/broken.md',
    'prompts/plain.md',
    'a/note.md'
  ])
  const files: Record<string, string> = {
    'a/prompts/near.md': promptContent('message', 'Near body.', 'Near'),
    'prompts/near.md': promptContent('message', 'Far body.'),
    'prompts/style.md': promptContent('system', 'Style body.', 'House style'),
    'prompts/broken.md': promptContent('wizard', 'x'),
    'prompts/plain.md': 'no frontmatter at all'
  }
  const verbs = {
    listVaultFiles: () => Promise.resolve(tree),
    readNote: (relPath: string) => {
      const content = files[relPath]
      return content !== undefined
        ? Promise.resolve({ content })
        : Promise.reject(new Error('missing'))
    }
  }

  it('loads parsed prompts nearest-first, shadowed and invalid dropped', async () => {
    const prompts = await loadPromptsFor('a/note.md', verbs)
    expect(prompts.map((prompt) => prompt.relPath)).toEqual([
      'a/prompts/near.md',
      'prompts/style.md'
    ])
    expect(prompts[0]).toMatchObject({
      name: 'near',
      kind: 'message',
      title: 'Near',
      body: 'Near body.',
      scopeFolder: 'a'
    })
    expect(prompts[1]!.title).toBe('House style')
  })

  it('round-trips edit→use: a changed body is what the next load serves', async () => {
    files['a/prompts/near.md'] = promptContent('message', 'Edited body.', 'Near')
    const prompts = await loadPromptsFor('a/note.md', verbs)
    expect(prompts[0]!.body).toBe('Edited body.')
  })
})

describe('scopeLabel (shadowing stays visible)', () => {
  it('labels root, own folder, and other scopes', () => {
    expect(scopeLabel('', 'a/note.md')).toBe('vault')
    expect(scopeLabel('a', 'a/note.md')).toBe('this folder')
    expect(scopeLabel('projects/x', 'projects/x/notes/note.md')).toBe('projects/x')
  })
})

describe('materializeStarterPrompts (explicit, idempotent, lifecycle)', () => {
  it('creates only the missing starters and never touches existing files', async () => {
    const created: Array<{ relPath: string; content?: string }> = []
    const existingName = STARTER_PROMPTS[1]!.name
    const verbs = {
      listVaultFiles: () => Promise.resolve(treeOf([`prompts/${existingName}.md`])),
      createNote: (relPath: string, content?: string) => {
        created.push({ relPath, ...(content !== undefined ? { content } : {}) })
        return Promise.resolve()
      }
    }
    const names = await materializeStarterPrompts(verbs)
    expect(names).toEqual(
      STARTER_PROMPTS.filter((starter) => starter.name !== existingName).map(
        (starter) => starter.name
      )
    )
    expect(created.every((call) => call.relPath.startsWith('prompts/'))).toBe(true)
    // every starter parses as a valid prompt file (create→use holds)
    for (const call of created) {
      expect(parsePromptFile(call.content!)).not.toBeNull()
    }
  })

  it('is a no-op when everything exists (delete→re-run recreates only the gap)', async () => {
    const full = treeOf(STARTER_PROMPTS.map((starter) => `prompts/${starter.name}.md`))
    const calls: string[] = []
    const verbs = {
      listVaultFiles: () => Promise.resolve(full),
      createNote: (relPath: string) => {
        calls.push(relPath)
        return Promise.resolve()
      }
    }
    expect(await materializeStarterPrompts(verbs)).toEqual([])
    expect(calls).toEqual([])
  })
})
