import { describe, expect, it } from 'vitest'
import { noteFollowTarget } from '../renderer/src/vault/note-follow'

describe('noteFollowTarget — tab-param follow without flashes (S07a)', () => {
  it('opens on a genuine prop transition', () => {
    const state = { prevProp: undefined as string | undefined }
    expect(noteFollowTarget(state, 'a.md', null)).toBe('a.md')
    expect(noteFollowTarget(state, 'b.md', 'a.md')).toBe('b.md')
  })

  it('the owner flash: a STALE prop re-render never re-opens the old note', () => {
    const state = { prevProp: undefined as string | undefined }
    expect(noteFollowTarget(state, 'old.md', null)).toBe('old.md')
    // user opened new.md directly; the tab param still says old.md and
    // refresh-push re-renders fire the effect repeatedly
    expect(noteFollowTarget(state, 'old.md', 'new.md')).toBeNull()
    expect(noteFollowTarget(state, 'old.md', 'new.md')).toBeNull()
    // the param finally lands on new.md — already open, nothing to do
    expect(noteFollowTarget(state, 'new.md', 'new.md')).toBeNull()
    // a real later transition still follows
    expect(noteFollowTarget(state, 'third.md', 'new.md')).toBe('third.md')
  })

  it('undefined prop (fresh tab) opens nothing and is remembered', () => {
    const state = { prevProp: 'x.md' as string | undefined }
    expect(noteFollowTarget(state, undefined, 'x.md')).toBeNull()
    expect(noteFollowTarget(state, undefined, 'x.md')).toBeNull()
  })
})
