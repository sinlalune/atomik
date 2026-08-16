import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { VaultFolder, WorkspaceTab } from '../shared/ipc-contract'
import {
  createNote,
  listVaultFiles,
  readNote,
  writeNote
} from '../electron-main/vault'
import {
  relocateApply,
  relocatePreview
} from '../electron-main/file-manage'
import {
  createQuickNoteFile,
  finalizeQuickNoteName,
  isQuickNoteShortcut,
  nextQuickNotePath,
  quickNoteParent,
  quickNoteRenameDecision,
  quickNoteReviewLinkCount,
  quickNoteTitle,
  vaultNotePaths
} from '../renderer/src/workspace/quick-note'

const tab = (view: string, notePath?: string): WorkspaceTab => ({
  id: 'tab',
  view,
  ...(notePath ? { params: { notePath } } : {})
})

describe('quick note placement and provisional name (CP-FEEDBACK S03)', () => {
  it('recognizes Mod+N without stealing modified or repeated chords', () => {
    const chord = {
      key: 'n',
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      repeat: false
    }
    expect(isQuickNoteShortcut(chord)).toBe(true)
    expect(isQuickNoteShortcut({ ...chord, ctrlKey: false, metaKey: true })).toBe(
      true
    )
    expect(isQuickNoteShortcut({ ...chord, shiftKey: true })).toBe(false)
    expect(isQuickNoteShortcut({ ...chord, repeat: true })).toBe(false)
  })

  it('places beside an active note, then falls back to project or vault root', () => {
    expect(quickNoteParent(tab('vault', 'ideas/current.md'), { kind: 'vault' })).toBe(
      'ideas'
    )
    expect(
      quickNoteParent(tab('project'), {
        kind: 'project',
        projectPath: 'projects/atomik'
      })
    ).toBe('projects/atomik')
    expect(quickNoteParent(tab('source-web'), { kind: 'vault' })).toBe('')
  })

  it('chooses collision-safe Untitled names case-insensitively', () => {
    const occupied = new Set(['ideas/untitled.md', 'ideas/untitled 2.md'])
    expect(nextQuickNotePath('ideas', occupied)).toBe('ideas/Untitled 3.md')
    expect(nextQuickNotePath('', new Set())).toBe('Untitled.md')
  })

  it('collects every nested note path from the vault tree', () => {
    const tree: VaultFolder = {
      name: 'vault',
      relPath: '',
      notes: [{ name: 'Root.md', relPath: 'Root.md' }],
      folders: [
        {
          name: 'ideas',
          relPath: 'ideas',
          notes: [{ name: 'One.md', relPath: 'ideas/One.md' }],
          folders: []
        }
      ]
    }
    expect([...vaultNotePaths(tree)].sort()).toEqual(['ideas/one.md', 'root.md'])
  })

  it('waits for an H1 and ignores headings inside fences and lower levels', () => {
    expect(quickNoteTitle('## Section\ntext')).toBeNull()
    expect(quickNoteTitle('```md\n# Fake\n```\n\n # Real title #\n')).toBe(
      'Real title'
    )
  })

  it('renames once from the first H1, sanitizes it, and avoids collisions', () => {
    const occupied = new Set([
      'ideas/untitled.md',
      'ideas/my note.md'
    ])
    expect(
      quickNoteRenameDecision(
        'ideas/Untitled.md',
        '# [My / note](https://example.test)\n',
        occupied
      )
    ).toEqual({ kind: 'rename', to: 'ideas/My note 2.md' })
  })

  it('settles same-name and reserved convention headings without a rename loop', () => {
    expect(
      quickNoteRenameDecision(
        'Untitled.md',
        '# Untitled\n',
        new Set(['untitled.md'])
      )
    ).toEqual({ kind: 'settled' })
    expect(
      quickNoteRenameDecision('Untitled.md', '# index\n', new Set(['untitled.md']))
    ).toEqual({ kind: 'rename', to: 'index note.md' })
  })

  it('round-trips blank create, successful save, and transactional rename', async () => {
    const vault = mkdtempSync(join(tmpdir(), 'atomik-quick-note-'))
    try {
      const io = {
        listVaultFiles: async () => listVaultFiles(vault),
        createNote: async (relPath: string, content?: string) =>
          createNote(vault, relPath, content),
        relocatePreview: async (from: string, to: string) =>
          relocatePreview(vault, from, to),
        relocateApply: async (from: string, to: string) =>
          relocateApply(vault, from, to)
      }
      const relPath = await createQuickNoteFile('ideas', io)
      expect(relPath).toBe('ideas/Untitled.md')
      expect(readFileSync(join(vault, relPath), 'utf8')).toBe('')

      const opened = readNote(vault, relPath)
      writeNote(
        vault,
        opened.relPath,
        '# Durable title\n\nBody\n',
        opened.mtimeMs
      )
      const decision = quickNoteRenameDecision(
        opened.relPath,
        '# Durable title\n\nBody\n',
        vaultNotePaths(listVaultFiles(vault))
      )
      expect(decision).toEqual({
        kind: 'rename',
        to: 'ideas/Durable title.md'
      })
      if (decision.kind !== 'rename') throw new Error('expected rename')
      const preview = relocatePreview(vault, opened.relPath, decision.to)
      // The folder convention created one managed index link. It follows the
      // rename automatically and does not make normal quick-note naming modal.
      expect(preview.totalLinks).toBe(1)
      expect(quickNoteReviewLinkCount(opened.relPath, preview.edits)).toBe(0)
      let confirmations = 0
      expect(
        await finalizeQuickNoteName(
          opened.relPath,
          '# Durable title\n\nBody\n',
          io,
          () => {
            confirmations += 1
            return true
          }
        )
      ).toBe('renamed')
      expect(confirmations).toBe(0)

      expect(existsSync(join(vault, opened.relPath))).toBe(false)
      expect(readFileSync(join(vault, decision.to), 'utf8')).toBe(
        '# Durable title\n\nBody\n'
      )
    } finally {
      rmSync(vault, { recursive: true, force: true })
    }
  })

  it('keeps genuine backlinks behind review while subtracting one managed index link', () => {
    expect(
      quickNoteReviewLinkCount('ideas/Untitled.md', [
        { relPath: 'ideas/index.md', count: 1 },
        { relPath: 'ideas/log.md', count: 1 },
        { relPath: 'research.md', count: 2 }
      ])
    ).toBe(3)
  })
})
