import { describe, expect, it } from 'vitest'
import {
  defaultNewNotePath,
  ensureMdExtension,
  newNotePathForSelection
} from '../renderer/src/editor/ai-helpers'

describe('defaultNewNotePath', () => {
  it('places the new note beside its source, named after it', () => {
    expect(defaultNewNotePath('projects/test/test/sd.md')).toBe(
      'projects/test/test/sd-ai.md'
    )
    expect(defaultNewNotePath('welcome.md')).toBe('welcome-ai.md')
    expect(defaultNewNotePath('notes/Attention.MD')).toBe('notes/Attention-ai.md')
  })
})

describe('newNotePathForSelection (S04m — the selection names the file)', () => {
  it('names the note after the selected text, beside the source note', () => {
    expect(newNotePathForSelection('philosophy/philosophy.md', 'Ethymology')).toBe(
      'philosophy/Ethymology.md'
    )
    expect(newNotePathForSelection('welcome.md', 'Attention mechanism')).toBe(
      'Attention mechanism.md'
    )
  })

  it('sanitizes fs/link-hostile characters, collapses whitespace, caps at 60', () => {
    expect(
      newNotePathForSelection('a/n.md', 'love\nof   wisdom: a/b [test] #tag')
    ).toBe('a/love of wisdom a b test tag.md')
    const long = 'x'.repeat(100)
    expect(newNotePathForSelection('a/n.md', long)).toBe(`a/${'x'.repeat(60)}.md`)
    expect(newNotePathForSelection('a/n.md', '.hidden.')).toBe('a/hidden.md')
  })

  it('falls back to the -ai default when the selection yields nothing', () => {
    expect(newNotePathForSelection('a/n.md', '')).toBe('a/n-ai.md')
    expect(newNotePathForSelection('a/n.md', '  /:*?  ')).toBe('a/n-ai.md')
  })
})

describe('ensureMdExtension', () => {
  it('appends .md only when missing, case-insensitively', () => {
    expect(ensureMdExtension('bibi')).toBe('bibi.md')
    expect(ensureMdExtension('bibi.md')).toBe('bibi.md')
    expect(ensureMdExtension('bibi.MD')).toBe('bibi.MD')
  })
})
