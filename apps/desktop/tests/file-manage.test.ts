import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { deleteFolder, deleteNote, type TrashFn } from '../electron-main/file-manage'

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
