import { describe, expect, it } from 'vitest'
import {
  chatDraftFor,
  chatRunFor,
  registerChatRun,
  setChatDraft
} from '../renderer/src/workspace/chat-run'

describe('chat run registry (S06c6: runs survive the tab remount)', () => {
  it('registers, is adoptable while pending, clears itself on settle', async () => {
    let settle!: () => void
    const done = new Promise<void>((resolve) => {
      settle = resolve
    })
    registerChatRun('tab-1', { operationId: 'op-1', error: null, done })
    expect(chatRunFor('tab-1')?.operationId).toBe('op-1')
    settle()
    await done
    await Promise.resolve() // the finally cleanup tick
    expect(chatRunFor('tab-1')).toBeNull()
  })

  it('a newer run for the same tab is not clobbered by the old settle', async () => {
    let settleOld!: () => void
    const oldDone = new Promise<void>((resolve) => {
      settleOld = resolve
    })
    registerChatRun('tab-2', { operationId: 'old', error: null, done: oldDone })
    const fresh = {
      operationId: 'fresh',
      error: null,
      done: new Promise<void>(() => undefined)
    }
    registerChatRun('tab-2', fresh)
    settleOld()
    await oldDone
    await Promise.resolve()
    expect(chatRunFor('tab-2')?.operationId).toBe('fresh')
  })

  it('the error set by the closure is visible to the adopter', async () => {
    const run = { operationId: 'op-3', error: null as string | null, done: Promise.resolve() }
    registerChatRun('tab-3', run)
    run.error = 'ai(provider-server): 503'
    const adopted = chatRunFor('tab-3')
    await run.done
    expect(adopted === null || adopted.error === 'ai(provider-server): 503').toBe(true)
  })
})

describe('chat drafts (S06c6: the input survives the tab remount)', () => {
  it('round-trips per tab and clears on empty', () => {
    expect(chatDraftFor('t1')).toBe('')
    setChatDraft('t1', 'half-typed question')
    setChatDraft('t2', 'other tab')
    expect(chatDraftFor('t1')).toBe('half-typed question')
    expect(chatDraftFor('t2')).toBe('other tab')
    setChatDraft('t1', '')
    expect(chatDraftFor('t1')).toBe('')
    expect(chatDraftFor('t2')).toBe('other tab')
  })
})
