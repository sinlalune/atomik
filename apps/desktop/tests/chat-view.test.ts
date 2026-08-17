import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CHAT_LOG_A11Y } from '../renderer/src/workspace/chat-presentation'

const css = readFileSync(
  new URL('../renderer/src/styles.css', import.meta.url),
  'utf8'
)
const view = readFileSync(
  new URL('../renderer/src/workspace/ChatView.tsx', import.meta.url),
  'utf8'
)

function cssRule(selector: string): string {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`missing CSS rule: ${selector}`)
  const end = css.indexOf('\n}', start)
  if (end < 0) throw new Error(`unterminated CSS rule: ${selector}`)
  return css.slice(start, end)
}

describe('chat message presentation (CP-FEEDBACK S02)', () => {
  it('exposes chronological additions as a polite conversation log', () => {
    expect(CHAT_LOG_A11Y).toEqual({
      role: 'log',
      'aria-label': 'Conversation',
      'aria-live': 'polite',
      'aria-relevant': 'additions'
    })
    expect(view).toContain('{...CHAT_LOG_A11Y}')
    expect(view).toContain('aria-busy={running}')
  })

  it('centres one conversation lane, with user right and Atomik left inside it', () => {
    expect(view).toContain('className="chat-thread"')

    const thread = cssRule('.chat-thread')
    expect(thread).toContain('width: 100%')
    expect(thread).toContain('max-width: var(--chat-measure)')
    expect(thread).toContain('margin-inline: auto')
    expect(thread).toContain('flex-direction: column')

    const user = cssRule('.chat-turn.role-you')
    expect(user).toContain('align-self: flex-end')
    expect(user).toContain('max-width: 85%')
    expect(user).not.toContain('margin-inline-end')
    expect(user).toContain('border: 1px solid var(--border)')
    expect(user).toContain('background: var(--code-bg)')

    const assistant = cssRule('.chat-turn.role-atomik')
    expect(assistant).toContain('align-self: stretch')
    expect(assistant).toContain('width: 100%')
    expect(assistant).toContain('margin-inline: 0')
    expect(assistant).not.toContain('margin-inline: auto')
    expect(assistant).toContain('border: 0')
    expect(assistant).toContain('background: transparent')

    const body = cssRule('.chat-turn-body')
    expect(body).toContain('margin-inline: 0')
  })
})
