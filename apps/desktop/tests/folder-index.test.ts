import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CONTENTS_BEGIN,
  CONTENTS_END,
  adoptVaultRoot,
  contentsBlock,
  parentRelOf,
  readFolderEntries,
  recordFileOp,
  updateFolderIndex,
  withContentsBlock
} from '../electron-main/folder-index'
import { createNote } from '../electron-main/vault'
import { createFolder } from '../electron-main/project'
import { deleteNote, relocateApply, type TrashFn } from '../electron-main/file-manage'

let vault = ''
beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), 'atomik-folder-index-'))
})
afterEach(() => {
  rmSync(vault, { recursive: true, force: true })
})

/* Like the OS trash, the fake REMOVES the entry from the folder (the
 * re-derived Contents must reflect the departure). */
const fakeTrash: TrashFn = async (abs) => {
  rmSync(abs, { recursive: true, force: true })
}
const read = (rel: string): string => readFileSync(join(vault, rel), 'utf8')

describe('contentsBlock / withContentsBlock (pure)', () => {
  it('lists folders first, then notes, bundles as one unit line', () => {
    const block = contentsBlock([
      { kind: 'folder', name: 'zeta', hasIndex: true },
      { kind: 'bundle', name: 'paper' },
      { kind: 'note', name: 'alpha.md' }
    ])
    const lines = block.split('\n')
    expect(lines[0]).toBe(CONTENTS_BEGIN)
    expect(lines.at(-1)).toBe(CONTENTS_END)
    expect(block.indexOf('paper/')).toBeLessThan(block.indexOf('alpha'))
    expect(block).toContain('- [zeta/](./zeta/index.md)')
    expect(block).toContain('- [paper/](./paper/source.md) — source bundle')
    expect(block).toContain('- [alpha](./alpha.md)')
  })

  it('an empty folder renders an explicit empty marker', () => {
    expect(contentsBlock([])).toContain('*(empty)*')
  })

  it('replaces ONLY the marked span; owner text survives byte-for-byte', () => {
    const owner = `# My folder\n\nmy own words\n\n${CONTENTS_BEGIN}\nSTALE-ENTRY\n${CONTENTS_END}\n\nmore of my words\n`
    const next = withContentsBlock(owner, contentsBlock([]))
    expect(next).toContain('my own words')
    expect(next).toContain('more of my words')
    expect(next).not.toContain('STALE-ENTRY')
  })

  it('adopts by appending when markers are absent', () => {
    const next = withContentsBlock('# Hand-made\n', contentsBlock([]))
    expect(next.startsWith('# Hand-made\n')).toBe(true)
    expect(next).toContain(CONTENTS_BEGIN)
  })
})

describe('readFolderEntries', () => {
  it('classifies folders, bundles, notes; skips conventions, dots, non-md', () => {
    mkdirSync(join(vault, 'plain'))
    mkdirSync(join(vault, 'bundle'))
    writeFileSync(join(vault, 'bundle/source.md'), 'x')
    mkdirSync(join(vault, '.atomik'))
    writeFileSync(join(vault, 'note.md'), 'x')
    writeFileSync(join(vault, 'index.md'), 'x')
    writeFileSync(join(vault, 'log.md'), 'x')
    writeFileSync(join(vault, 'photo.jpg'), 'x')
    const entries = readFolderEntries(vault)
    expect(entries).toEqual([
      { kind: 'bundle', name: 'bundle' },
      { kind: 'folder', name: 'plain', hasIndex: false },
      { kind: 'note', name: 'note.md' }
    ])
  })
})

describe('parentRelOf', () => {
  it('maps root-level entries to the vault root', () => {
    expect(parentRelOf('a.md')).toBe('')
    expect(parentRelOf('folder/a.md')).toBe('folder')
    expect(parentRelOf('a/b/c.md')).toBe('a/b')
  })
})

describe('updateFolderIndex / recordFileOp', () => {
  it('an unchanged block writes nothing (no cosmetic bytes)', () => {
    writeFileSync(join(vault, 'a.md'), 'x')
    updateFolderIndex(vault, '')
    const once = read('index.md')
    updateFolderIndex(vault, '')
    expect(read('index.md')).toBe(once)
  })

  it('recordFileOp appends log lines and dedups index rewrites per folder', () => {
    mkdirSync(join(vault, 'f'))
    recordFileOp(vault, [
      { folderRel: 'f', text: 'first thing' },
      { folderRel: 'f', text: 'second thing' }
    ])
    const log = read('f/log.md')
    expect(log).toContain('— first thing')
    expect(log).toContain('— second thing')
    expect(read('f/index.md')).toContain(CONTENTS_BEGIN)
  })
})

describe('vault adoption', () => {
  it('seeds root index + log once; re-adoption writes nothing', () => {
    writeFileSync(join(vault, 'existing.md'), 'x')
    adoptVaultRoot(vault)
    expect(read('index.md')).toContain('- [existing](./existing.md)')
    expect(read('log.md')).toContain('vault adopted')
    const index = read('index.md')
    const log = read('log.md')
    adoptVaultRoot(vault)
    expect(read('index.md')).toBe(index)
    expect(read('log.md')).toBe(log)
  })

  it('an existing hand-written root index is never rewritten by adoption', () => {
    writeFileSync(join(vault, 'index.md'), '# mine\n')
    adoptVaultRoot(vault)
    expect(read('index.md')).toBe('# mine\n')
    expect(read('log.md')).toContain('vault log seeded')
  })
})

describe('the verbs keep parent conventions current (S07k round-trips)', () => {
  it('createNote lands in the parent index contents and log', () => {
    mkdirSync(join(vault, 'notes'))
    createNote(vault, 'notes/idea.md')
    expect(read('notes/index.md')).toContain('- [idea](./idea.md)')
    expect(read('notes/log.md')).toContain('— created note idea.md')
  })

  it('a nested create records every materialized folder up the chain', () => {
    createNote(vault, 'a/b/deep.md')
    expect(read('index.md')).toContain('- [a/](./a/index.md)')
    expect(read('log.md')).toContain('— created folder a/')
    expect(read('a/index.md')).toContain('- [b/](./b/index.md)')
    expect(read('a/log.md')).toContain('— created folder b/')
    expect(read('a/b/index.md')).toContain('- [deep](./deep.md)')
    expect(read('a/b/log.md')).toContain('— created note deep.md')
  })

  it('createFolder is born with BOTH conventions and records in its parent', () => {
    createFolder(vault, 'research')
    expect(read('research/index.md')).toContain(CONTENTS_BEGIN)
    expect(read('research/log.md')).toContain('research — log')
    expect(read('index.md')).toContain('- [research/](./research/index.md)')
    expect(read('log.md')).toContain('— created folder research/')
  })

  it('deleteNote drops the entry from the parent index and logs the trash', async () => {
    mkdirSync(join(vault, 'n'))
    createNote(vault, 'n/tmp.md')
    expect(read('n/index.md')).toContain('- [tmp](./tmp.md)')
    await deleteNote(vault, 'n/tmp.md', fakeTrash)
    expect(read('n/index.md')).not.toContain('tmp')
    expect(read('n/log.md')).toContain('— deleted note tmp.md (OS trash)')
  })

  it('a cross-folder move records departure AND arrival', () => {
    mkdirSync(join(vault, 'a'))
    mkdirSync(join(vault, 'b'))
    writeFileSync(join(vault, 'a/x.md'), '# x\n')
    relocateApply(vault, 'a/x.md', 'b/x.md')
    expect(read('a/index.md')).not.toContain('[x]')
    expect(read('b/index.md')).toContain('- [x](./x.md)')
    expect(read('a/log.md')).toContain('moved note x.md → b/x.md')
    expect(read('b/log.md')).toContain('moved note in ← a/x.md')
  })

  it('a same-folder rename records ONE renamed line', () => {
    mkdirSync(join(vault, 'r'))
    writeFileSync(join(vault, 'r/old.md'), '# o\n')
    relocateApply(vault, 'r/old.md', 'r/new.md')
    const log = read('r/log.md')
    expect(log).toContain('renamed note old.md → new.md')
    expect(log).not.toContain('moved note in')
    expect(read('r/index.md')).toContain('- [new](./new.md)')
  })
})
