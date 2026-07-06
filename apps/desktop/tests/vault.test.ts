import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  createNote,
  listVaultFiles,
  persistLastVaultRoot,
  readLastVaultRoot,
  readNote,
  resolveNotePath,
  writeNote
} from '../electron-main/vault'

let vault: string
let outside: string
let stateDir: string

beforeAll(() => {
  vault = mkdtempSync(join(tmpdir(), 'atomik-vault-'))
  outside = mkdtempSync(join(tmpdir(), 'atomik-vault-outside-'))
  stateDir = mkdtempSync(join(tmpdir(), 'atomik-vault-state-'))

  const write = (rel: string, content: string): void => {
    const abs = join(vault, ...rel.split('/'))
    mkdirSync(join(abs, '..'), { recursive: true })
    writeFileSync(abs, content)
  }

  write('welcome.md', '# Welcome\n')
  write('ideas/first.md', '# First idea\n')
  write('ideas/deep/second.md', '# Second\n')
  write('assets/picture.png', 'not-markdown')
  write('.git/config', '[core]')
  write('.atomik/workspace.json', '{}')
  write('node_modules/pkg/readme.md', '# skipped')
  write('.hidden/secret.md', '# skipped')
  mkdirSync(join(vault, 'empty-dir'), { recursive: true })

  writeFileSync(join(outside, 'target.md'), '# outside the vault\n')
  symlinkSync(join(outside, 'target.md'), join(vault, 'leak.md'))
})

afterAll(() => {
  rmSync(vault, { recursive: true, force: true })
  rmSync(outside, { recursive: true, force: true })
  rmSync(stateDir, { recursive: true, force: true })
})

const ROOT = resolve('/some/vault')

describe('resolveNotePath (13: renderer paths are untrusted)', () => {
  it('accepts vault-relative markdown paths', () => {
    expect(resolveNotePath(ROOT, 'welcome.md')).toBe(resolve(ROOT, 'welcome.md'))
    expect(resolveNotePath(ROOT, 'ideas/deep/second.md')).toBe(
      resolve(ROOT, 'ideas', 'deep', 'second.md')
    )
    expect(resolveNotePath(ROOT, 'ideas/./first.md')).toBe(
      resolve(ROOT, 'ideas', 'first.md')
    )
  })

  it('rejects traversal, absolute paths, and odd bytes', () => {
    expect(resolveNotePath(ROOT, '../escape.md')).toBeNull()
    expect(resolveNotePath(ROOT, 'ideas/../../escape.md')).toBeNull()
    expect(resolveNotePath(ROOT, '/etc/cron.md')).toBeNull()
    expect(resolveNotePath(ROOT, 'a\\b.md')).toBeNull()
    expect(resolveNotePath(ROOT, 'x.md\0.png')).toBeNull()
  })

  it('rejects non-strings, empty, oversized, and non-markdown', () => {
    expect(resolveNotePath(ROOT, 42)).toBeNull()
    expect(resolveNotePath(ROOT, null)).toBeNull()
    expect(resolveNotePath(ROOT, '')).toBeNull()
    expect(resolveNotePath(ROOT, `${'a/'.repeat(300)}x.md`)).toBeNull()
    expect(resolveNotePath(ROOT, 'notes.txt')).toBeNull()
    expect(resolveNotePath(ROOT, 'ideas')).toBeNull()
  })

  it('rejects protected and hidden segments', () => {
    expect(resolveNotePath(ROOT, '.git/hook.md')).toBeNull()
    expect(resolveNotePath(ROOT, '.atomik/x.md')).toBeNull()
    expect(resolveNotePath(ROOT, 'node_modules/pkg/x.md')).toBeNull()
    expect(resolveNotePath(ROOT, 'a/.git/x.md')).toBeNull()
    expect(resolveNotePath(ROOT, '.hidden/x.md')).toBeNull()
  })
})

describe('listVaultFiles', () => {
  it('lists markdown, prunes empty/non-md dirs, skips protected dirs', () => {
    const tree = listVaultFiles(vault)
    expect(tree.notes.map((note) => note.relPath)).toContain('welcome.md')
    // symlinks are not followed: a link to an outside file is neither
    // listed here nor readable through readNote
    expect(tree.notes.map((note) => note.relPath)).not.toContain('leak.md')
    expect(tree.folders.map((folder) => folder.name)).toEqual(['ideas'])
    const ideas = tree.folders[0]!
    expect(ideas.notes.map((note) => note.relPath)).toEqual(['ideas/first.md'])
    expect(ideas.folders[0]!.notes[0]!.relPath).toBe('ideas/deep/second.md')
  })
})

describe('readNote', () => {
  it('returns content and mtime', () => {
    const note = readNote(vault, 'welcome.md')
    expect(note.content).toBe('# Welcome\n')
    expect(typeof note.mtimeMs).toBe('number')
  })

  it('throws on missing notes and symlink escapes', () => {
    expect(() => readNote(vault, 'nope.md')).toThrow()
    // listed (it looks like a note) but unreadable: it resolves outside
    expect(() => readNote(vault, 'leak.md')).toThrow()
  })
})

describe('writeNote (edit semantics, byte-exact, atomic)', () => {
  it('overwrites an existing note with exactly the given bytes', () => {
    const content = '# Edited\n\nno trailing newline here'
    writeNote(vault, 'welcome.md', content)
    expect(readFileSync(join(vault, 'welcome.md'), 'utf8')).toBe(content)
    // no temp residue
    expect(readdirSync(vault).filter((f) => f.includes('.tmp-'))).toEqual([])
  })

  it('refuses to create through write, bad paths, and bad content', () => {
    expect(() => writeNote(vault, 'brand-new.md', 'x')).toThrow()
    expect(() => writeNote(vault, '../escape.md', 'x')).toThrow()
    expect(() => writeNote(vault, 'welcome.md', 42)).toThrow()
    expect(() => writeNote(vault, 'leak.md', 'overwrite outside?')).toThrow()
  })
})

describe('createNote (exclusive, parents made)', () => {
  it('creates nested notes with a readable default title', () => {
    createNote(vault, 'projects/new-area/my-first-note.md')
    expect(
      readFileSync(join(vault, 'projects/new-area/my-first-note.md'), 'utf8')
    ).toBe('# my first note\n')
  })

  it('honors explicit content byte-exactly', () => {
    createNote(vault, 'scratch.md', 'raw content, no newline')
    expect(readFileSync(join(vault, 'scratch.md'), 'utf8')).toBe(
      'raw content, no newline'
    )
  })

  it('never clobbers an existing note', () => {
    expect(() => createNote(vault, 'welcome.md')).toThrow()
  })
})

describe('last-vault settings', () => {
  it('roundtrips an existing directory and rejects junk', () => {
    persistLastVaultRoot(stateDir, vault)
    expect(readLastVaultRoot(stateDir)).toBe(vault)

    persistLastVaultRoot(stateDir, join(vault, 'welcome.md'))
    expect(readLastVaultRoot(stateDir)).toBeNull()

    writeFileSync(join(stateDir, 'local-settings.json'), 'not json')
    expect(readLastVaultRoot(stateDir)).toBeNull()
  })

  it('reads null when settings are absent', () => {
    const empty = mkdtempSync(join(tmpdir(), 'atomik-nosettings-'))
    expect(readLastVaultRoot(empty)).toBeNull()
    rmSync(empty, { recursive: true, force: true })
  })
})
