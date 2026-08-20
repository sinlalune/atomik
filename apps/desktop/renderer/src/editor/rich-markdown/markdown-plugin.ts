import type MarkdownIt from 'markdown-it'
import {
  displayMathClose,
  displayMathOnLine,
  displayMathOpen,
  inlineMathClose,
  joinDisplayMath,
  richKindForFence
} from './syntax'

const labelFor = (kind: 'math' | 'mermaid' | 'vega-lite' | 'code'): string => {
  switch (kind) {
    case 'math':
      return 'Math source'
    case 'mermaid':
      return 'Mermaid source'
    case 'vega-lite':
      return 'Vega-Lite source'
    case 'code':
      return 'Code source'
  }
}

function inlinePlaceholder(md: MarkdownIt, source: string): string {
  return [
    '<span class="rich-markdown-inline" data-rich-block data-rich-kind="math" data-rich-info="inline" aria-label="Inline math">',
    `<code data-rich-source>${md.utils.escapeHtml(source)}</code>`,
    '<span data-rich-output hidden></span>',
    '<span data-rich-status role="status" hidden></span>',
    '</span>'
  ].join('')
}

function blockPlaceholder(
  md: MarkdownIt,
  source: string,
  kind: 'math' | 'mermaid' | 'vega-lite' | 'code',
  info: string,
  attrs: string
): string {
  const escapedKind = md.utils.escapeHtml(kind)
  const escapedInfo = md.utils.escapeHtml(info)
  const escapedSource = md.utils.escapeHtml(source)
  const label = labelFor(kind)
  const languageClass = info ? ` class="language-${escapedInfo}"` : ''
  return [
    `<div${attrs} data-rich-block data-rich-kind="${escapedKind}" data-rich-info="${escapedInfo}" role="group" aria-label="${label}">`,
    `<pre data-rich-source><code${languageClass}>${escapedSource}</code></pre>`,
    '<div data-rich-output hidden></div>',
    '<p data-rich-status role="status" hidden></p>',
    '</div>\n'
  ].join('')
}

/** Synchronous discovery only. Heavy adapters are loaded after mount by the
 * registry; all authored bytes inserted here pass through escapeHtml. */
export function richMarkdownPlaceholders(md: MarkdownIt): void {
  md.inline.ruler.before('escape', 'atomik-math-inline', (state, silent) => {
    const close = inlineMathClose(state.src, state.pos, state.posMax)
    if (close < 0) return false
    if (!silent) {
      const token = state.push('atomik_math_inline', '', 0)
      token.content = state.src.slice(state.pos + 1, close)
    }
    state.pos = close + 1
    return true
  })

  md.renderer.rules['atomik_math_inline'] = (tokens, index) =>
    inlinePlaceholder(md, tokens[index]!.content)

  md.block.ruler.before(
    'fence',
    'atomik-math-block',
    (state, startLine, endLine, silent) => {
      const start = state.bMarks[startLine]! + state.tShift[startLine]!
      const finish = state.eMarks[startLine]!
      const line = state.src.slice(start, finish)
      const singleLine = displayMathOnLine(line)
      if (singleLine !== null) {
        if (silent) return true
        const token = state.push('atomik_math_block', '', 0)
        token.block = true
        token.content = singleLine
        token.map = [startLine, startLine + 1]
        token.meta = { info: 'display' }
        state.line = startLine + 1
        return true
      }
      // A MULTI-LINE block. The delimiter must start the line — that is what
      // keeps a `$$` mid-prose inert — but it no longer has to stand alone on
      // it, so `$$\begin{aligned}` opens a block like every other Markdown
      // tool (CP-RENDER-REPAIRS S01). The shape lives in `syntax.ts` so read
      // mode and live mode cannot drift apart again.
      const openTail = displayMathOpen(line)
      if (openTail === null) return false

      const lineTextAt = (at: number): string =>
        state.src.slice(state.bMarks[at]! + state.tShift[at]!, state.eMarks[at]!)

      let closeLine = startLine + 1
      while (closeLine < endLine) {
        if (displayMathClose(lineTextAt(closeLine)) !== null) break
        closeLine += 1
      }
      if (closeLine >= endLine) return false
      if (silent) return true

      const middle: string[] = []
      for (let at = startLine + 1; at < closeLine; at += 1) {
        middle.push(lineTextAt(at))
      }
      const token = state.push('atomik_math_block', '', 0)
      token.block = true
      token.content = joinDisplayMath(
        openTail,
        middle,
        displayMathClose(lineTextAt(closeLine)) ?? ''
      )
      token.map = [startLine, closeLine + 1]
      token.meta = { info: 'display' }
      state.line = closeLine + 1
      return true
    },
    { alt: ['paragraph', 'reference', 'blockquote', 'list'] }
  )

  md.renderer.rules['atomik_math_block'] = (tokens, index, _options, _env, self) => {
    const token = tokens[index]!
    token.attrJoin('class', 'rich-markdown-block')
    return blockPlaceholder(
      md,
      token.content,
      'math',
      'display',
      self.renderAttrs(token)
    )
  }

  md.renderer.rules.fence = (tokens, index, _options, _env, self) => {
    const token = tokens[index]!
    const kind = richKindForFence(token.info) ?? 'code'
    token.attrJoin('class', 'rich-markdown-block')
    return blockPlaceholder(
      md,
      token.content,
      kind,
      token.info.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? '',
      self.renderAttrs(token)
    )
  }
}
