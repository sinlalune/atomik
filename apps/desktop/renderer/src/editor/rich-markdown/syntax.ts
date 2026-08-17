import type { RichRendererKind } from './contracts'

const FENCE_KINDS: Readonly<Record<string, RichRendererKind>> = {
  math: 'math',
  latex: 'math',
  tex: 'math',
  katex: 'math',
  mermaid: 'mermaid',
  'vega-lite': 'vega-lite',
  vegalite: 'vega-lite',
  vl: 'vega-lite'
}

export function firstFenceInfo(info: string): string {
  return info.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? ''
}

export function richKindForFence(info: string): RichRendererKind | null {
  return FENCE_KINDS[firstFenceInfo(info)] ?? null
}

export function isEscapedAt(source: string, index: number): boolean {
  let slashes = 0
  for (let at = index - 1; at >= 0 && source[at] === '\\'; at -= 1) {
    slashes += 1
  }
  return slashes % 2 === 1
}

/** Returns the closing `$` for an inline expression, or -1. `open` must
 * point at the proposed opening dollar. This is pure so Markdown-it, live
 * mode and focused tests share the ambiguity rule. */
export function inlineMathClose(
  source: string,
  open: number,
  end = source.length
): number {
  if (
    source[open] !== '$' ||
    source[open + 1] === '$' ||
    isEscapedAt(source, open) ||
    open + 1 >= end ||
    /\s/.test(source[open + 1]!)
  ) {
    return -1
  }

  for (let at = open + 1; at < end; at += 1) {
    const char = source[at]!
    if (char === '\n' || char === '\r') return -1
    if (
      char === '$' &&
      source[at - 1] !== '$' &&
      source[at + 1] !== '$' &&
      !isEscapedAt(source, at) &&
      !/\s/.test(source[at - 1]!)
    ) {
      return at
    }
  }
  return -1
}

/** Complete single-line display form: `$$ expression $$`. */
export function displayMathOnLine(line: string): string | null {
  const trimmed = line.trim()
  if (
    trimmed.length <= 4 ||
    !trimmed.startsWith('$$') ||
    !trimmed.endsWith('$$')
  ) {
    return null
  }
  const content = trimmed.slice(2, -2)
  return content.trim().length > 0 ? content : null
}
