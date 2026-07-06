import { describe, expect, it } from 'vitest'
import { defaultNewNotePath, ensureMdExtension } from '../renderer/src/editor/ai-helpers'

describe('defaultNewNotePath', () => {
  it('places the new note beside its source, named after it', () => {
    expect(defaultNewNotePath('projects/test/test/sd.md')).toBe(
      'projects/test/test/sd-ai.md'
    )
    expect(defaultNewNotePath('welcome.md')).toBe('welcome-ai.md')
    expect(defaultNewNotePath('notes/Attention.MD')).toBe('notes/Attention-ai.md')
  })
})

describe('ensureMdExtension', () => {
  it('appends .md only when missing, case-insensitively', () => {
    expect(ensureMdExtension('bibi')).toBe('bibi.md')
    expect(ensureMdExtension('bibi.md')).toBe('bibi.md')
    expect(ensureMdExtension('bibi.MD')).toBe('bibi.MD')
  })
})
