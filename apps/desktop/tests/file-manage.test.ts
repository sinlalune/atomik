import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import {
  deleteFolder,
  deleteNote,
  relocateApply,
  relocateFolderApply,
  relocateFolderPreview,
  relocatePreview,
  type TrashFn
} from '../electron-main/file-manage'

let vault: string
let trashed: string[]

/** The seam: records what would leave for the OS trash, then removes it
 *  so round-trip tests observe the vault as the user would. */
const fakeTrash: TrashFn = async (abs) => {
  trashed.push(abs)
  rmSync(abs, { recursive: true, force: true })
}

const failingTrash: TrashFn = async () => {
  throw new Error('gio: no trash available')
}

beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), 'atomik-manage-'))
  trashed = []
  mkdirSync(join(vault, 'notes/deep'), { recursive: true })
  writeFileSync(join(vault, 'notes/idea.md'), '# idea\n')
  writeFileSync(join(vault, 'notes/deep/leaf.md'), '# leaf\n')
  // a source bundle: its files delete only with the bundle
  mkdirSync(join(vault, 'sources/web/guide/media'), { recursive: true })
  writeFileSync(join(vault, 'sources/web/guide/source.md'), '# dossier\n')
  writeFileSync(join(vault, 'sources/web/guide/reader.md'), '# derived\n')
})

afterEach(() => {
  rmSync(vault, { recursive: true, force: true })
})

describe('deleteNote — user notes go to the trash (CP-MVP-007 S03)', () => {
  it('trashes a plain note (round trip: created then deleted)', async () => {
    const result = await deleteNote(vault, 'notes/idea.md', fakeTrash)
    expect(result.relPath).toBe('notes/idea.md')
    expect(trashed).toEqual([join(vault, 'notes/idea.md')])
    expect(existsSync(join(vault, 'notes/idea.md'))).toBe(false)
    expect(existsSync(join(vault, 'notes/deep/leaf.md'))).toBe(true)
  })

  it('refuses bundle-internal files — the bundle deletes as a unit', async () => {
    await expect(
      deleteNote(vault, 'sources/web/guide/reader.md', fakeTrash)
    ).rejects.toThrow(/bundle/)
    await expect(
      deleteNote(vault, 'sources/web/guide/source.md', fakeTrash)
    ).rejects.toThrow(/bundle/)
    expect(trashed).toEqual([])
  })

  it('rejects traversal, non-md, and missing targets before the trash', async () => {
    await expect(deleteNote(vault, '../escape.md', fakeTrash)).rejects.toThrow()
    await expect(deleteNote(vault, 'notes/../../x.md', fakeTrash)).rejects.toThrow()
    await expect(deleteNote(vault, 'sources/web/guide/media', fakeTrash)).rejects.toThrow()
    await expect(deleteNote(vault, 'notes/ghost.md', fakeTrash)).rejects.toThrow(/not found/)
    expect(trashed).toEqual([])
  })

  it('a failed trash surfaces and NEVER falls back to a hard delete', async () => {
    await expect(deleteNote(vault, 'notes/idea.md', failingTrash)).rejects.toThrow(/trash/)
    expect(existsSync(join(vault, 'notes/idea.md'))).toBe(true)
  })
})

describe('deleteFolder — whole folders, bundles as units', () => {
  it('trashes a folder with everything inside', async () => {
    const result = await deleteFolder(vault, 'notes', fakeTrash)
    expect(result.relPath).toBe('notes')
    expect(existsSync(join(vault, 'notes'))).toBe(false)
  })

  it('a bundle root deletes as ONE unit (evidence + derived together)', async () => {
    await deleteFolder(vault, 'sources/web/guide', fakeTrash)
    expect(trashed).toEqual([join(vault, 'sources/web/guide')])
    expect(existsSync(join(vault, 'sources/web/guide'))).toBe(false)
  })

  it('rejects the vault root, traversal, and missing folders', async () => {
    await expect(deleteFolder(vault, '', fakeTrash)).rejects.toThrow()
    await expect(deleteFolder(vault, '.', fakeTrash)).rejects.toThrow()
    await expect(deleteFolder(vault, '../..', fakeTrash)).rejects.toThrow()
    await expect(deleteFolder(vault, 'ghost', fakeTrash)).rejects.toThrow(/not found/)
    await expect(deleteFolder(vault, 'notes/idea.md', fakeTrash)).rejects.toThrow(/not found/)
    expect(trashed).toEqual([])
  })
})

describe('relocate — rename/move as the previewed refactor (CP-MVP-007 S04)', () => {
  beforeEach(() => {
    writeFileSync(
      join(vault, 'notes/citing.md'),
      '# citing\n\nSee [idea](idea.md) and [again](<./idea.md#part>).\n'
    )
    mkdirSync(join(vault, 'essays'), { recursive: true })
    writeFileSync(
      join(vault, 'essays/far.md'),
      'Linked from afar: [idea](../notes/idea.md). Web link stays: [w](https://example.org/idea.md).\n'
    )
    writeFileSync(
      join(vault, 'notes/idea-with-links.md'),
      'Points at [leaf](deep/leaf.md) and [far](../essays/far.md).\n'
    )
  })

  it('preview lists every touched note without writing anything', () => {
    const before = readFileSync(join(vault, 'notes/citing.md'), 'utf8')
    const preview = relocatePreview(vault, 'notes/idea.md', 'notes/renamed.md')
    expect(preview.totalLinks).toBe(3)
    expect(preview.edits.map((edit) => edit.relPath).sort()).toEqual([
      'essays/far.md',
      'notes/citing.md'
    ])
    expect(readFileSync(join(vault, 'notes/citing.md'), 'utf8')).toBe(before)
    expect(existsSync(join(vault, 'notes/idea.md'))).toBe(true)
  })

  it('apply = move + inbound updates in one operation; hash and scheme untouched', () => {
    relocateApply(vault, 'notes/idea.md', 'essays/idea.md')
    expect(existsSync(join(vault, 'notes/idea.md'))).toBe(false)
    const citing = readFileSync(join(vault, 'notes/citing.md'), 'utf8')
    expect(citing).toContain('[idea](../essays/idea.md)')
    expect(citing).toContain('[again](<../essays/idea.md#part>)')
    const far = readFileSync(join(vault, 'essays/far.md'), 'utf8')
    expect(far).toContain('[idea](idea.md)')
    expect(far).toContain('https://example.org/idea.md')
  })

  it("a MOVED note's own outgoing links re-point from its new home", () => {
    relocateApply(vault, 'notes/idea-with-links.md', 'essays/idea-with-links.md')
    const moved = readFileSync(join(vault, 'essays/idea-with-links.md'), 'utf8')
    expect(moved).toContain('[leaf](../notes/deep/leaf.md)')
    expect(moved).toContain('[far](far.md)')
  })

  it('a same-folder rename never rewrites the moved note itself', () => {
    const before = readFileSync(join(vault, 'notes/idea-with-links.md'), 'utf8')
    relocateApply(vault, 'notes/idea-with-links.md', 'notes/idea-links-2.md')
    expect(readFileSync(join(vault, 'notes/idea-links-2.md'), 'utf8')).toBe(before)
  })

  it('refuses convention files, bundle files, bundle targets, collisions', () => {
    writeFileSync(join(vault, 'notes/index.md'), '# map\n')
    expect(() => relocatePreview(vault, 'notes/index.md', 'notes/map.md')).toThrow(/convention/)
    expect(() => relocatePreview(vault, 'notes/idea.md', 'notes/log.md')).toThrow(/convention/)
    expect(() =>
      relocatePreview(vault, 'sources/web/guide/reader.md', 'notes/reader.md')
    ).toThrow(/bundle/)
    expect(() =>
      relocatePreview(vault, 'notes/idea.md', 'sources/web/guide/idea.md')
    ).toThrow(/inside a source bundle/)
    expect(() => relocatePreview(vault, 'notes/idea.md', 'notes/citing.md')).toThrow(/already exists/)
    expect(() => relocatePreview(vault, 'notes/idea.md', 'notes/idea.md')).toThrow(/same path/)
  })

  it('rolls back the move when a link rewrite fails midway', () => {
    const citingAbs = join(vault, 'notes/citing.md')
    const before = readFileSync(citingAbs, 'utf8')
    // a directory squatting the citing note's temp-free write path is
    // hard to fake; instead make the citing note unwritable
    const { chmodSync } = require('node:fs') as typeof import('node:fs')
    chmodSync(citingAbs, 0o444)
    try {
      expect(() => relocateApply(vault, 'notes/idea.md', 'notes/renamed.md')).toThrow()
      expect(existsSync(join(vault, 'notes/idea.md'))).toBe(true)
      expect(existsSync(join(vault, 'notes/renamed.md'))).toBe(false)
      expect(readFileSync(citingAbs, 'utf8')).toBe(before)
    } finally {
      chmodSync(citingAbs, 0o644)
    }
  })
})

describe('relocate FOLDER — prefix-wide refactor, bundles as units (S05)', () => {
  beforeEach(() => {
    writeFileSync(
      join(vault, 'notes/deep/inner.md'),
      'Sibling [leaf](leaf.md); outside [idea](../idea.md).\n'
    )
    writeFileSync(
      join(vault, 'outside.md'),
      'Inbound [leaf](notes/deep/leaf.md) and [dossier](sources/web/guide/source.md).\n'
    )
  })

  it('moves the folder; inbound targets follow prefix-wide; internal links keep their bytes', () => {
    relocateFolderApply(vault, 'notes/deep', 'archive')
    expect(existsSync(join(vault, 'notes/deep'))).toBe(false)
    expect(readFileSync(join(vault, 'outside.md'), 'utf8')).toContain(
      '[leaf](archive/leaf.md)'
    )
    const inner = readFileSync(join(vault, 'archive/inner.md'), 'utf8')
    expect(inner).toContain('[leaf](leaf.md)')
    expect(inner).toContain('[idea](../notes/idea.md)')
  })

  it('a bundle root moves as a unit and its inbound dossier links follow', () => {
    relocateFolderApply(vault, 'sources/web/guide', 'sources/web/guide-kept')
    expect(readFileSync(join(vault, 'outside.md'), 'utf8')).toContain(
      '[dossier](sources/web/guide-kept/source.md)'
    )
    expect(existsSync(join(vault, 'sources/web/guide-kept/reader.md'))).toBe(true)
  })

  it('refuses folders inside a bundle, bundle targets, self-nesting, collisions', () => {
    expect(() =>
      relocateFolderPreview(vault, 'sources/web/guide/media', 'media-out')
    ).toThrow(/inside a source bundle/)
    expect(() =>
      relocateFolderPreview(vault, 'notes/deep', 'sources/web/guide/deep')
    ).toThrow(/inside a source bundle/)
    expect(() => relocateFolderPreview(vault, 'notes', 'notes/deep/sub')).toThrow(
      /into itself/
    )
    mkdirSync(join(vault, 'occupied'), { recursive: true })
    expect(() => relocateFolderPreview(vault, 'notes/deep', 'occupied')).toThrow(
      /already exists/
    )
    expect(() => relocateFolderPreview(vault, 'ghost', 'x')).toThrow(/not found/)
  })

  it('preview writes nothing', () => {
    const before = readFileSync(join(vault, 'outside.md'), 'utf8')
    const preview = relocateFolderPreview(vault, 'notes/deep', 'archive')
    expect(preview.totalLinks).toBeGreaterThan(0)
    expect(readFileSync(join(vault, 'outside.md'), 'utf8')).toBe(before)
    expect(existsSync(join(vault, 'notes/deep'))).toBe(true)
  })
})
