import { describe, expect, it } from 'vitest'
import type { VaultFolder } from '../shared/ipc-contract'
import {
  applyAtInsertion,
  atPromptToken,
  buildPromptFileContent,
  composeSystemStack,
  expandInstruction,
  expandPromptLayers,
  filterPrompts,
  insertDirectiveAt,
  layerDirectiveFor,
  reorderStack,
  stackFileContent,
  composeMenuInstruction,
  extractNoteLinks,
  groupPromptsByScope,
  linkedNoteCandidates,
  toggleStackBlock,
  visibleMenuPrompts,
  builtinBlockFileContent,
  collectBuiltinRefs,
  collectPromptRefs,
  isPromptsFolder,
  loadBuiltinOverridesFor,
  loadPromptsFor,
  materializeBuiltinBlocks,
  materializeStarterPrompts,
  parseBuiltinBlockFile,
  parsePromptFile,
  promptFolderChainFor,
  promptTitleFor,
  scopeLabel,
  STARTER_PROMPTS
} from '../renderer/src/editor/prompts'
import {
  BUILTIN_BLOCK_DEFAULTS,
  BUILTIN_BLOCK_IDS,
  composeSystemPrompt
} from '../shared/prompt-composition'

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

  it('tolerates CRLF endings — a Windows-edited prompt must not vanish', () => {
    const parsed = parsePromptFile(
      '---\r\nkind: message\r\ntitle: Crlf\r\n---\r\n\r\nBody here.\r\n'
    )
    expect(parsed?.kind).toBe('message')
    expect(parsed?.title).toBe('Crlf')
    expect(parsed?.body).toBe('Body here.')
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

  it('inserts the LAYER DIRECTIVE, padded onto its own line mid-text (S03d)', () => {
    // mid-line token: newlines added so the full-line rule holds
    expect(insertDirectiveAt('sum @ke tail', 4, 7, 'key-points')).toEqual({
      text: 'sum \n{{prompt: key-points}}\n tail',
      caret: 28
    })
    // clean line start and end: no padding
    expect(insertDirectiveAt('@ke', 0, 3, 'key-points')).toEqual({
      text: '{{prompt: key-points}}',
      caret: 22
    })
    expect(layerDirectiveFor('tone')).toBe('{{prompt: tone}}')
  })

  it('expandInstruction composes the instruction at run time via note scopes', () => {
    const prompts = [
      { name: 'tone', body: 'Stay terse.' },
      { name: 'cite', body: 'Quote exactly.\n{{prompt: tone}}' }
    ] as Parameters<typeof expandInstruction>[1]
    expect(
      expandInstruction('Do the thing.\n{{prompt: cite}}', prompts)
    ).toBe('Do the thing.\nQuote exactly.\nStay terse.')
    // unknown layer stays visible in what is sent — never dropped
    expect(expandInstruction('{{prompt: ghost}}', prompts)).toBe('{{prompt: ghost}}')
  })

  it('keeps the nearest-first order through the filter (folder → root)', () => {
    const prompts = [
      { name: 'alpha', title: 'Alpha', scopeFolder: 'a/b' },
      { name: 'alpha-root', title: 'Alpha root', scopeFolder: '' }
    ] as Parameters<typeof filterPrompts>[0]
    expect(filterPrompts(prompts, 'alpha').map((prompt) => prompt.scopeFolder)).toEqual([
      'a/b',
      ''
    ])
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

describe('system stack (S03f — ordered composable blocks)', () => {
  const stackPrompts = [
    { relPath: 'prompts/personality.md', name: 'personality', body: 'Be playful.' },
    { relPath: 'prompts/tone.md', name: 'tone', body: 'Stay terse.' },
    { relPath: 'prompts/objectives.md', name: 'objectives', body: 'Aim for clarity.' }
  ] as Parameters<typeof composeSystemStack>[1]

  it('reorders blocks; out-of-range moves are no-ops', () => {
    expect(reorderStack(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(reorderStack(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(reorderStack(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
    expect(reorderStack(['a', 'b'], 5, 0)).toEqual(['a', 'b'])
  })

  it('composes bodies in stack order; a deleted block drops silently', () => {
    expect(
      composeSystemStack(
        ['prompts/personality.md', 'prompts/tone.md', 'prompts/objectives.md'],
        stackPrompts
      )
    ).toBe('Be playful.\n\nStay terse.\n\nAim for clarity.')
    expect(
      composeSystemStack(
        ['prompts/tone.md', 'prompts/ghost.md', 'prompts/personality.md'],
        stackPrompts
      )
    ).toBe('Stay terse.\n\nBe playful.')
  })

  it('a saved stack is a prompt file whose expansion reproduces the composition', () => {
    const content = stackFileContent('research-agent', [
      'personality',
      'tone',
      'objectives'
    ])
    const parsed = parsePromptFile(content)
    expect(parsed?.kind).toBe('system')
    expect(parsed?.title).toBe('Research agent')
    // round-trip: expanding the saved file = the stack's composition
    const byName = new Map(
      stackPrompts.map((prompt) => [prompt.name, { body: prompt.body }])
    )
    expect(expandPromptLayers(parsed!.body, byName)).toBe(
      'Be playful.\nStay terse.\nAim for clarity.'
    )
  })
})

describe('note links as insertions (S04o)', () => {
  it('extracts .md links (angle-bracketed or plain, anchors stripped), deduped, capped', () => {
    const text = [
      'Add a [Ethymology](<../philosophy/Ethymology.md>) block',
      'plus [same](<../philosophy/Ethymology.md>) again,',
      'a [plain](notes/plain.md) one, an anchored [a](notes/a.md#sec),',
      'a [web link](https://example.com) and an [image](pic.png).'
    ].join('\n')
    expect(extractNoteLinks(text)).toEqual([
      { label: 'Ethymology', target: '../philosophy/Ethymology.md' },
      { label: 'plain', target: 'notes/plain.md' },
      { label: 'a', target: 'notes/a.md' }
    ])
    const many = Array.from(
      { length: 6 },
      (_, index) => `[n${index}](notes/n${index}.md)`
    ).join(' ')
    expect(extractNoteLinks(many)).toHaveLength(4)
  })

  it('resolves targets against the note folder, then vault root, then raw', () => {
    expect(
      linkedNoteCandidates('../philosophy/Ethymology.md', 'philosophy/philosophy.md')
    ).toEqual(['philosophy/Ethymology.md', '../philosophy/Ethymology.md'])
    expect(linkedNoteCandidates('sub/note.md', 'a/base.md')).toEqual([
      'a/sub/note.md',
      'sub/note.md'
    ])
    // over-escaping the root: no folder-resolved candidate survives
    expect(linkedNoteCandidates('../../x.md', 'a/base.md')).toEqual([
      'x.md',
      '../../x.md'
    ])
  })
})

describe('selection-menu helpers (S04)', () => {
  it('groups by scope label preserving nearest-first order', () => {
    const prompts = [
      { name: 'a', title: 'A', scopeFolder: 'projects/x' },
      { name: 'b', title: 'B', scopeFolder: 'projects/x' },
      { name: 'c', title: 'C', scopeFolder: '' }
    ] as Parameters<typeof groupPromptsByScope>[0]
    const groups = groupPromptsByScope(prompts, 'projects/x/note.md')
    expect(groups.map((group) => group.scope)).toEqual(['this folder', 'vault'])
    expect(groups[0]!.prompts.map((prompt) => prompt.name)).toEqual(['a', 'b'])
  })

  it('pill toggling: click order builds the stack, second click removes', () => {
    let stack: string[] = []
    stack = toggleStackBlock(stack, 'p/tone.md')
    stack = toggleStackBlock(stack, 'p/personality.md')
    expect(stack).toEqual(['p/tone.md', 'p/personality.md'])
    stack = toggleStackBlock(stack, 'p/tone.md')
    expect(stack).toEqual(['p/personality.md'])
  })

  it('composes the menu instruction: directives + built-ins in click order, input last (S04c)', () => {
    const prompts = [
      { relPath: 'prompts/key-points.md', name: 'key-points' }
    ] as Parameters<typeof composeMenuInstruction>[1]
    const builtins = [{ id: 'explain', instruction: 'Explain this simply.' }]
    expect(
      composeMenuInstruction(
        ['builtin:explain', 'prompts/key-points.md'],
        prompts,
        builtins,
        '  focus on dates  '
      )
    ).toBe('Explain this simply.\n{{prompt: key-points}}\nfocus on dates')
    // unknown entries drop; input alone is runnable; nothing = empty
    expect(composeMenuInstruction(['prompts/ghost.md'], prompts, builtins, 'ask')).toBe('ask')
    expect(composeMenuInstruction([], prompts, builtins, '')).toBe('')
  })

  it('caps the visible labels but never drops a picked prompt (S04c)', () => {
    const prompts = Array.from({ length: 9 }, (_, index) => ({
      relPath: `prompts/p${index}.md`,
      name: `p${index}`,
      title: `P${index}`
    })) as Parameters<typeof visibleMenuPrompts>[0]
    const shown = visibleMenuPrompts(prompts, new Set(['prompts/p8.md']), '', 4)
    expect(shown.map((prompt) => prompt.name)).toEqual(['p0', 'p1', 'p2', 'p3', 'p8'])
    // the query narrows; picked stays even when it does not match
    const searched = visibleMenuPrompts(prompts, new Set(['prompts/p8.md']), 'p1', 4)
    expect(searched.map((prompt) => prompt.name)).toEqual(['p1', 'p8'])
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

describe('built-in block overrides (S07b3 — every token sent is a file)', () => {
  it('parseBuiltinBlockFile: body below optional frontmatter; empty = null', () => {
    expect(parseBuiltinBlockFile('---\nkind: builtin\n---\n\nBe terse.\n')).toBe(
      'Be terse.'
    )
    expect(parseBuiltinBlockFile('Raw body, no fence.')).toBe(
      'Raw body, no fence.'
    )
    expect(parseBuiltinBlockFile('---\nkind: builtin\n---\n\n   \n')).toBeNull()
    // CRLF from a Windows-side editor still parses
    expect(
      parseBuiltinBlockFile('---\r\nkind: builtin\r\n---\r\n\r\nRule.\r\n')
    ).toBe('Rule.')
  })

  it('collectBuiltinRefs: nearest scope wins per block; unknown names skipped', () => {
    const tree = treeOf([
      'prompts/built-in/identity.md',
      'prompts/built-in/closing-rule.md',
      'prompts/built-in/not-a-block.md',
      'philosophy/prompts/built-in/identity.md',
      'philosophy/note.md'
    ])
    const refs = collectBuiltinRefs(tree, 'philosophy/note.md')
    expect(refs).toEqual({
      identity: 'philosophy/prompts/built-in/identity.md',
      'closing-rule': 'prompts/built-in/closing-rule.md'
    })
  })

  it('loadBuiltinOverridesFor: reads bodies; unreadable or empty degrades to the default (absent)', async () => {
    const tree = treeOf([
      'prompts/built-in/identity.md',
      'prompts/built-in/grounding-rules.md',
      'prompts/built-in/closing-rule.md'
    ])
    const files: Record<string, string> = {
      'prompts/built-in/identity.md': '---\nkind: builtin\n---\n\nYou are Juju.',
      'prompts/built-in/grounding-rules.md': '---\nkind: builtin\n---\n\n'
    }
    const verbs = {
      listVaultFiles: () => Promise.resolve(tree),
      readNote: (relPath: string) => {
        const content = files[relPath]
        return content !== undefined
          ? Promise.resolve({ content })
          : Promise.reject(new Error('gone'))
      }
    }
    expect(await loadBuiltinOverridesFor('note.md', verbs)).toEqual({
      identity: 'You are Juju.'
    })
  })

  it('an override replaces exactly its section of the composed system prompt', () => {
    const overridden = composeSystemPrompt(undefined, 'append', {
      identity: 'You are Juju.',
      'closing-rule': '- Answer in French.'
    })
    expect(overridden).toContain('You are Juju.')
    expect(overridden).toContain('- Answer in French.')
    expect(overridden).not.toContain(
      'You are the AI assistant inside Atomik'
    )
    expect(overridden).not.toContain('no meta commentary')
    // untouched sections stay byte-identical
    expect(overridden).toContain(BUILTIN_BLOCK_DEFAULTS['grounding-rules'])
    expect(overridden).toContain(BUILTIN_BLOCK_DEFAULTS['output-append'])
  })

  it('materialized defaults are inert: fresh files compose byte-identically to no overrides', async () => {
    const bodies: Record<string, string> = {}
    for (const id of BUILTIN_BLOCK_IDS) {
      bodies[id] = parseBuiltinBlockFile(builtinBlockFileContent(id))!
    }
    for (const destination of ['append', 'replace-selection', 'new-note'] as const) {
      expect(composeSystemPrompt(undefined, destination, bodies)).toBe(
        composeSystemPrompt(undefined, destination)
      )
    }
  })

  it('built-in block files never join the prompt menus (subfolder is not a direct child)', () => {
    const tree = treeOf(['prompts/built-in/identity.md', 'prompts/real.md'])
    const refs = collectPromptRefs(tree, 'note.md')
    expect(refs.map((ref) => ref.name)).toEqual(['real'])
  })

  it('materializeBuiltinBlocks: creates only the missing files, delete→re-run recreates the gap', async () => {
    const created: string[] = []
    const verbs = {
      listVaultFiles: () =>
        Promise.resolve(treeOf(['prompts/built-in/identity.md'])),
      createNote: (relPath: string) => {
        created.push(relPath)
        return Promise.resolve()
      }
    }
    const names = await materializeBuiltinBlocks(verbs)
    expect(names).toEqual(
      BUILTIN_BLOCK_IDS.filter((id) => id !== 'identity')
    )
    expect(
      created.every((relPath) => relPath.startsWith('prompts/built-in/'))
    ).toBe(true)
    const full = treeOf(
      BUILTIN_BLOCK_IDS.map((id) => `prompts/built-in/${id}.md`)
    )
    expect(
      await materializeBuiltinBlocks({
        listVaultFiles: () => Promise.resolve(full),
        createNote: () => Promise.reject(new Error('must not be called'))
      })
    ).toEqual([])
  })
})
