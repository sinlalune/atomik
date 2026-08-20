import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { stripHtmlComments } from '../shared/html-comments'
import { noteMarkdown } from '../renderer/src/editor/note-markdown'

const view = readFileSync(
  new URL('../renderer/src/workspace/ChatView.tsx', import.meta.url),
  'utf8'
)

describe('html comments never render (CP-MVP-011 S07j)', () => {
  it('hides the bookkeeping the app writes onto chat headings', () => {
    // The owner's bench screenshot: a rendered transcript reading
    // `you <!-- sent: system=2646|history=34:history · 1 turn … -->`.
    const html = noteMarkdown().render(
      [
        '## you <!-- sent: system=2646|instruction=15:your message -->',
        '',
        'macron et la réforme des retraites',
        '',
        '## atomik <!-- run: ms=6112 --> <!-- trace:[[chats/x/turn-02]] -->',
        '',
        'answer',
        ''
      ].join('\n')
    )
    expect(html).not.toContain('sent:')
    expect(html).not.toContain('&lt;!--')
    expect(html).not.toContain('run: ms=6112')
    expect(html).toContain('>you<')
    expect(html).toContain('macron et la réforme des retraites')
  })

  it('keeps a comment that a note is TEACHING, inside a fence or code span', () => {
    const source = [
      'Inline `<!-- like this -->` stays.',
      '',
      '```html',
      '<!-- and so does this -->',
      '```',
      ''
    ].join('\n')
    const stripped = stripHtmlComments(source)
    expect(stripped).toContain('`<!-- like this -->`')
    expect(stripped).toContain('<!-- and so does this -->')
  })

  it('drops a comment that spans lines, fence markers included', () => {
    const stripped = stripHtmlComments(
      ['before', '<!-- one', '```', 'two -->', 'after', ''].join('\n')
    )
    expect(stripped).not.toContain('two')
    expect(stripped).toContain('before')
    expect(stripped).toContain('after')
    // the fence opened INSIDE the comment was not a fence, so `after` is prose
    expect(stripped).not.toContain('```')
  })

  it('leaves a comment-only line out rather than as a blank', () => {
    const stripped = stripHtmlComments(
      ['# Title', '<!-- a note to self -->', 'prose', ''].join('\n')
    )
    expect(stripped.split('\n').filter((line) => line === '')).toHaveLength(1)
    expect(stripped).toContain('# Title')
    expect(stripped).toContain('prose')
  })

  it('renders raw html as text still — stripping comments is not html: true', () => {
    // 13: model output is rendered here; enabling raw html to hide comments
    // would have been the wrong fix.
    const html = noteMarkdown().render('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('an exchange that died says so (CP-MVP-011 S07j)', () => {
  it('traces the failure and marks the question unanswered', () => {
    expect(view).toContain("outcome: { status: 'failed', error: String(reason) }")
    expect(view).toContain('`unanswered:${serializeTraceMeta(failedTrace)}`')
    // a marker pointing at no record would claim a record exists
    expect(view).toContain('if (existing && failedTrace)')
  })

  it('never lets the failure record replace the failure itself', () => {
    const at = view.indexOf("outcome: { status: 'failed'")
    const after = view.slice(at)
    expect(after.slice(0, after.indexOf('setRunning(false)'))).toContain(
      '} catch {'
    )
    expect(view).toContain('className="chat-unanswered"')
  })
})
