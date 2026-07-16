import { describe, expect, it } from 'vitest'
import { childRelPath } from '../renderer/src/vault/tree-menu'

describe('childRelPath — names typed into the tree menu (CP-MVP-007 S02)', () => {
  it('builds note paths, appending .md exactly once', () => {
    expect(childRelPath('notes', 'idea', 'note')).toBe('notes/idea.md')
    expect(childRelPath('notes', 'idea.md', 'note')).toBe('notes/idea.md')
    expect(childRelPath('notes', 'Idea.MD', 'note')).toBe('notes/Idea.MD')
  })

  it('builds folder paths and handles the vault root', () => {
    expect(childRelPath('', 'jardinage', 'folder')).toBe('jardinage')
    expect(childRelPath('projects/demo', 'refs', 'folder')).toBe('projects/demo/refs')
    expect(childRelPath('', 'root-note', 'note')).toBe('root-note.md')
  })

  it('refuses separators, hidden names, empties, oversizes', () => {
    expect(childRelPath('notes', 'a/b', 'folder')).toBeNull()
    expect(childRelPath('notes', 'a\\b', 'note')).toBeNull()
    expect(childRelPath('notes', '.secret', 'folder')).toBeNull()
    expect(childRelPath('notes', '   ', 'note')).toBeNull()
    expect(childRelPath('notes', 'x'.repeat(200), 'folder')).toBeNull()
  })

  it('trims surrounding whitespace before judging', () => {
    expect(childRelPath('notes', '  idea  ', 'note')).toBe('notes/idea.md')
  })
})
