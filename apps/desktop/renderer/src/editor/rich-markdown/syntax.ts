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

export type SourceRange = { from: number; to: number }

export type DollarMathSpan = SourceRange & {
  source: string
  display: boolean
}

type SourceLine = SourceRange & {
  text: string
  next: number
}

function sourceLines(source: string): SourceLine[] {
  const lines: SourceLine[] = []
  let from = 0
  while (from <= source.length) {
    const newline = source.indexOf('\n', from)
    const rawTo = newline < 0 ? source.length : newline
    const to = rawTo > from && source[rawTo - 1] === '\r' ? rawTo - 1 : rawTo
    lines.push({ from, to, text: source.slice(from, to), next: rawTo + 1 })
    if (newline < 0) break
    from = newline + 1
  }
  return lines
}

function rangeContaining(
  ranges: readonly SourceRange[],
  position: number
): SourceRange | null {
  for (const range of ranges) {
    if (range.from > position) return null
    if (range.from <= position && position < range.to) return range
  }
  return null
}

/**
 * Finds the dollar forms shared by read and live projection. `excluded`
 * carries syntax-tree ranges that already own their contents (currently code
 * spans and fences). Only the proposed opener is tested: once a valid math
 * opener wins, TeX may itself contain backticks or dollar-like commands.
 */
export function discoverDollarMath(
  source: string,
  excluded: readonly SourceRange[] = []
): DollarMathSpan[] {
  const sortedExcluded = [...excluded].sort((a, b) => a.from - b.from)
  const lines = sourceLines(source)
  const spans: DollarMathSpan[] = []
  const displayLines = new Set<number>()

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!
    const trimmed = line.text.trim()
    if (!trimmed.startsWith('$$')) continue
    const leading = line.text.indexOf(trimmed)
    const opener = line.from + Math.max(0, leading)
    if (rangeContaining(sortedExcluded, opener)) continue

    const oneLine = displayMathOnLine(line.text)
    if (oneLine !== null) {
      spans.push({
        from: line.from,
        to: line.to,
        source: oneLine,
        display: true
      })
      displayLines.add(index)
      continue
    }
    if (trimmed !== '$$') continue

    let close = index + 1
    while (close < lines.length && lines[close]!.text.trim() !== '$$') {
      close += 1
    }
    if (close >= lines.length) continue
    const closing = lines[close]!
    spans.push({
      from: line.from,
      to: closing.to,
      source: source.slice(line.next, closing.from).replace(/\r?\n$/, ''),
      display: true
    })
    for (let covered = index; covered <= close; covered += 1) {
      displayLines.add(covered)
    }
    index = close
  }

  for (let index = 0; index < lines.length; index += 1) {
    if (displayLines.has(index)) continue
    const line = lines[index]!
    for (let at = line.from; at < line.to; at += 1) {
      if (source[at] !== '$' || rangeContaining(sortedExcluded, at)) continue
      const close = inlineMathClose(source, at, line.to)
      if (close < 0) continue
      spans.push({
        from: at,
        to: close + 1,
        source: source.slice(at + 1, close),
        display: false
      })
      at = close
    }
  }

  return spans.sort((a, b) => a.from - b.from)
}
