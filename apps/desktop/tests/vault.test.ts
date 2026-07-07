import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  utimesSync,
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
  readSourceAsset,
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

  it('a missing note reads as a human message, never a raw ENOENT', () => {
    // vault-switch reality: a tab restored against a different vault asks
    // for a path that only existed in the previous one
    expect(() => readNote(vault, 'brainstorm/gone.md')).toThrow(
      /note not found in this vault — brainstorm\/gone\.md/
    )
    expect(() => readNote(vault, 'brainstorm/gone.md')).not.toThrow(/ENOENT/)
  })
})

describe('writeNote (edit semantics, byte-exact, atomic)', () => {
  it('overwrites an existing note with exactly the given bytes', () => {
    const content = '# Edited\n\nno trailing newline here'
    const result = writeNote(vault, 'welcome.md', content)
    expect(readFileSync(join(vault, 'welcome.md'), 'utf8')).toBe(content)
    expect(typeof result.mtimeMs).toBe('number')
    // no temp residue
    expect(readdirSync(vault).filter((f) => f.includes('.tmp-'))).toEqual([])
  })

  it('refuses to create through write, bad paths, and bad content', () => {
    expect(() => writeNote(vault, 'brand-new.md', 'x')).toThrow()
    expect(() => writeNote(vault, '../escape.md', 'x')).toThrow()
    expect(() => writeNote(vault, 'welcome.md', 42)).toThrow()
    expect(() => writeNote(vault, 'leak.md', 'overwrite outside?')).toThrow()
  })

  it('detects concurrent modification through expectedMtimeMs', () => {
    const read = readNote(vault, 'welcome.md')
    // out-of-band change with a deterministically different mtime
    const abs = join(vault, 'welcome.md')
    writeFileSync(abs, '# changed elsewhere\n')
    const future = new Date(Date.now() + 5000)
    utimesSync(abs, future, future)

    expect(() =>
      writeNote(vault, 'welcome.md', '# mine\n', read.mtimeMs)
    ).toThrow(/conflict/)

    // a fresh read unlocks the save, and the returned mtime chains onward
    const fresh = readNote(vault, 'welcome.md')
    const saved = writeNote(vault, 'welcome.md', '# mine\n', fresh.mtimeMs)
    expect(readFileSync(abs, 'utf8')).toBe('# mine\n')
    expect(typeof saved.mtimeMs).toBe('number')

    // omitted mtime writes unconditionally; wrong type is rejected
    writeNote(vault, 'welcome.md', '# forced\n')
    expect(() =>
      writeNote(vault, 'welcome.md', 'x', 'not-a-number')
    ).toThrow()
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

describe('readSourceAsset (S05 image tab)', () => {
  it('reads an image original as base64 with its MIME', () => {
    const asset = readSourceAsset(vault, 'assets/picture.png')
    expect(asset.mimeType).toBe('image/png')
    expect(Buffer.from(asset.base64, 'base64').toString()).toBe('not-markdown')
    expect(asset.relPath).toBe('assets/picture.png')
  })

  it('refuses non-image extensions — .md stays on the note channel', () => {
    for (const relPath of ['welcome.md', 'assets/data.json', 'assets/movie.mp4']) {
      expect(() => readSourceAsset(vault, relPath)).toThrow(/rejected asset type/)
    }
  })

  it('applies the same path discipline as notes', () => {
    for (const relPath of [
      '../outside.png',
      '/etc/pw.png',
      '.git/x.png',
      'a\\b.png',
      42,
      ''
    ]) {
      expect(() => readSourceAsset(vault, relPath)).toThrow(/rejected path/)
    }
  })

  it('answers a missing asset with a human message', () => {
    expect(() => readSourceAsset(vault, 'assets/gone.jpg')).toThrow(
      /asset not found in this vault/
    )
  })
})

describe('sourceAssetRotation (S05 rotation metadata)', () => {
  it('reads the sibling dossier rotation when the resource names the asset', () => {
    const dir = join(vault, 'sources', 'rot')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'original.png'), Buffer.from([0x89, 0x50]))
    writeFileSync(
      join(dir, 'source.md'),
      '---\nresource: ./original.png\natomik:\n  capture:\n    rotation: 90\n---\nbody\n'
    )
    expect(readSourceAsset(vault, 'sources/rot/original.png').rotation).toBe(90)
    // another asset in the same folder is NOT covered by that dossier
    writeFileSync(join(dir, 'other.png'), Buffer.from([0x89, 0x50]))
    expect(readSourceAsset(vault, 'sources/rot/other.png').rotation).toBe(0)
  })

  it('defaults to 0 without a dossier or with garbage values', () => {
    expect(readSourceAsset(vault, 'assets/picture.png').rotation).toBe(0)
    const dir = join(vault, 'sources', 'rot2')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'original.png'), Buffer.from([0x89, 0x50]))
    writeFileSync(
      join(dir, 'source.md'),
      '---\nresource: ./original.png\nrotation: 45\n---\n'
    )
    expect(readSourceAsset(vault, 'sources/rot2/original.png').rotation).toBe(0)
  })
})
