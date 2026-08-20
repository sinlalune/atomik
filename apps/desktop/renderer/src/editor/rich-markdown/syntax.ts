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

/**
 * The two halves of a MULTI-LINE display block (CP-RENDER-REPAIRS S01).
 *
 * Both scanners used to require the delimiter to own its line
 * (`trimmed !== '$$'`), so `$$\begin{aligned}` — the form LaTeX writes, the
 * form models emit by default, and the form in the owner's own vault — fell
 * through to a paragraph in read mode AND live mode. The delimiter still has
 * to start the line, which is what keeps a `$$` in the middle of prose from
 * opening anything; what it no longer has to do is stand alone on it.
 *
 * These live beside `displayMathOnLine` and are shared by both scanners on
 * purpose: the two drifted identically once because each carried its own copy
 * of the rule, and one definition cannot disagree with itself.
 *
 * `displayMathOnLine` is tried FIRST everywhere — a line that opens and closes
 * on its own is complete, not an opener.
 */
export function displayMathOpen(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('$$')) return null
  return trimmed.slice(2)
}

/** Closing half: a line ENDING in `$$`. Returns what precedes the delimiter. */
export function displayMathClose(line: string): string | null {
  const trimmed = line.trim()
  if (trimmed.length < 2 || !trimmed.endsWith('$$')) return null
  return trimmed.slice(0, -2)
}

/** Joins an opener's trailing text, the untouched middle, and a closer's
 *  leading text into the expression a renderer receives. */
export function joinDisplayMath(
  openTail: string,
  middle: readonly string[],
  closeHead: string
): string {
  return [openTail, ...middle, closeHead]
    .filter((part, index, all) =>
      index === 0 || index === all.length - 1 ? part.trim().length > 0 : true
    )
    .join('\n')
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
    const openTail = displayMathOpen(line.text)
    if (openTail === null) continue

    let close = index + 1
    while (close < lines.length && displayMathClose(lines[close]!.text) === null) {
      close += 1
    }
    if (close >= lines.length) continue
    const closing = lines[close]!
    const middle = lines.slice(index + 1, close).map((between) => between.text)
    spans.push({
      from: line.from,
      to: closing.to,
      source: joinDisplayMath(
        openTail,
        middle,
        displayMathClose(closing.text) ?? ''
      ),
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
