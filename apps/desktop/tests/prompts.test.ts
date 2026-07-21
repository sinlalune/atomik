import { describe, expect, it } from 'vitest'
import type { VaultFolder } from '../shared/ipc-contract'
import {
  applyAtInsertion,
  atPromptToken,
  buildPromptFileContent,
  filterPrompts,
  collectPromptRefs,
  expandPromptLayers,
  isPromptsFolder,
  loadPromptsFor,
  materializeStarterPrompts,
  parsePromptFile,
  promptFolderChainFor,
  promptTitleFor,
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

describe('expandPromptLayers ({{prompt: name}} — buildable layers, S03b)', () => {
  const byName = (entries: Record<string, string>): Map<string, { body: string }> =>
    new Map(Object.entries(entries).map(([name, body]) => [name, { body }]))

  it('expands full-line directives, nested, system and message alike', () => {
    const map = byName({
      tone: 'Stay terse.',
      cite: 'Quote exactly.\n{{prompt: tone}}'
    })
    expect(
      expandPromptLayers('Intro.\n{{prompt: cite}}\nOutro.', map)
    ).toBe('Intro.\nQuote exactly.\nStay terse.\nOutro.')
  })

  it('inline mentions stay inert; unknown names and cycles stay literal', () => {
    const map = byName({
      a: 'A says:\n{{prompt: b}}',
      b: 'B says:\n{{prompt: a}}'
    })
    expect(expandPromptLayers('see {{prompt: a}} inline', map)).toBe(
      'see {{prompt: a}} inline'
    )
    expect(expandPromptLayers('{{prompt: ghost}}', map)).toBe('{{prompt: ghost}}')
    // a → b → a: the second hop stays literal instead of recursing
    expect(expandPromptLayers('{{prompt: a}}', map)).toBe(
      'A says:\nB says:\n{{prompt: a}}'
    )
  })

  it('resolves layers through the note scopes: a project override wins', async () => {
    const tree = treeOf([
      'prompts/tone.md',
      'prompts/main.md',
      'projects/x/prompts/tone.md',
      'projects/x/notes/note.md'
    ])
    const files: Record<string, string> = {
      'prompts/tone.md': promptContent('message', 'Root tone.'),
      'prompts/main.md': promptContent('message', 'Do the thing.\n{{prompt: tone}}'),
      'projects/x/prompts/tone.md': promptContent('message', 'Project tone.')
    }
    const verbs = {
      listVaultFiles: () => Promise.resolve(tree),
      readNote: (relPath: string) => Promise.resolve({ content: files[relPath]! })
    }
    const inProject = await loadPromptsFor('projects/x/notes/note.md', verbs)
    expect(inProject.find((prompt) => prompt.name === 'main')?.body).toBe(
      'Do the thing.\nProject tone.'
    )
    const atRoot = await loadPromptsFor('welcome.md', verbs)
    expect(atRoot.find((prompt) => prompt.name === 'main')?.body).toBe(
      'Do the thing.\nRoot tone.'
    )
  })
})

describe('@ quick-action token in AI inputs (S03c)', () => {
  it('opens at @ that starts the text or follows whitespace, up to the caret', () => {
    expect(atPromptToken('@', 1)).toEqual({ start: 0, query: '' })
    expect(atPromptToken('sum @ke', 7)).toEqual({ start: 4, query: 'ke' })
    expect(atPromptToken('line\n@to', 8)).toEqual({ start: 5, query: 'to' })
  })

  it('stays inert mid-word, after whitespace inside the token, or before the @', () => {
    expect(atPromptToken('mail@example', 12)).toBeNull()
    expect(atPromptToken('@key done', 9)).toBeNull() // whitespace ended it
    expect(atPromptToken('no token here', 7)).toBeNull()
    // caret before the @: not this token
    expect(atPromptToken('ab @ke', 2)).toBeNull()
  })

  it('replaces the token and lands the caret after the insertion', () => {
    expect(applyAtInsertion('sum @ke tail', 4, 7, 'Key points body')).toEqual({
      text: 'sum Key points body tail',
      caret: 19
    })
    // system pick removes the token: empty replacement
    expect(applyAtInsertion('sum @sys', 4, 8, '')).toEqual({ text: 'sum ', caret: 4 })
  })

  it('filters by name and title, case-insensitive; empty query keeps all', () => {
    const prompts = [
      { name: 'key-points', title: 'Key points' },
      { name: 'tone', title: 'House style' }
    ] as Parameters<typeof filterPrompts>[0]
    expect(filterPrompts(prompts, '').length).toBe(2)
    expect(filterPrompts(prompts, 'KEY').map((prompt) => prompt.name)).toEqual([
      'key-points'
    ])
    expect(filterPrompts(prompts, 'style').map((prompt) => prompt.name)).toEqual([
      'tone'
    ])
    expect(filterPrompts(prompts, 'ghost')).toEqual([])
  })
})

describe('prompt creation autofill (S03b tree menu)', () => {
  it('recognizes prompts/ folders at any depth', () => {
    expect(isPromptsFolder('prompts')).toBe(true)
    expect(isPromptsFolder('projects/x/prompts')).toBe(true)
    expect(isPromptsFolder('prompts/nested')).toBe(false)
    expect(isPromptsFolder('my-prompts')).toBe(false)
  })

  it('titles from names', () => {
    expect(promptTitleFor('key-points')).toBe('Key points')
    expect(promptTitleFor('tone_of_voice')).toBe('Tone of voice')
  })

  it('builds content that parses back as the chosen kind, layer hint in the description', () => {
    for (const kind of ['system', 'message'] as const) {
      const parsed = parsePromptFile(buildPromptFileContent(kind, 'my-prompt'))
      expect(parsed?.kind).toBe(kind)
      expect(parsed?.title).toBe('My prompt')
      expect(parsed?.description).toContain('{{prompt: name}}')
      expect(parsed?.body.length).toBeGreaterThan(0)
    }
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
