/**
 * Citations (CP-MVP-010 S08) — the link from a sentence back to the note
 * it stood on.
 *
 * A grounded answer that cannot be traced is worse than an ungrounded
 * one: it borrows the authority of the vault without offering the way to
 * check it. So the model is given a NUMBERED list of the notes it may
 * cite, and the numbers it emits are turned back into real links here.
 *
 * Two forms are supported, because a model will produce both:
 *
 * ```text
 * [1]                     a numbered marker  -> the nth source
 * [text](<notes/x.md>)    a phrase-level link -> already a link
 * ```
 *
 * PURE: string in, string out. The renderer's existing markdown factory
 * turns the result into pills, so a citation wears the same clothes as
 * every other link in Atomik (ADR-011, CP-MVP-009).
 */

export type CitationSource = {
  /** 1-based, the number the model was told to use. */
  number: number
  path: string
  title: string
}

/** The notes an answer was allowed to cite, in the order they were sent. */
export function citationSourcesOf(
  references: readonly { path: string; title: string }[]
): CitationSource[] {
  return references.map((reference, index) => ({
    number: index + 1,
    path: reference.path,
    title: reference.title
  }))
}

/** `1=notes/a.md|2=notes/b.md` — the transcript keeps its own citation
 *  map, so a reopened conversation still resolves its markers (the same
 *  comment idiom as the sent/run meta). */
export function serializeCitedMeta(sources: readonly CitationSource[]): string | null {
  if (sources.length === 0) return null
  return sources
    .map((source) => `${source.number}=${source.path.replace(/[|<>]/g, '')}`)
    .join('|')
}

export function parseCitedMeta(raw: string): { number: number; path: string }[] | null {
  const parsed: { number: number; path: string }[] = []
  for (const piece of raw.split('|')) {
    const match = /^\s*(\d+)=(.+?)\s*$/.exec(piece)
    if (!match) return null
    parsed.push({ number: Number(match[1]), path: match[2] as string })
  }
  return parsed.length > 0 ? parsed : null
}

/** A marker outside code: `[1]`, `[1,2]`, `[1, 2]`. Reference-style
 *  markdown links (`[text][1]`) and images are deliberately not matched. */
const MARKER_RE = /(?<![\]\w!])\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g

export type RewrittenAnswer = {
  markdown: string
  /** Numbers the model invented — no such source was ever sent. They
   *  stay visible as a diagnostic; a citation that silently vanished
   *  would be worse than one that admits it is broken. */
  unresolved: number[]
  /** Sources actually cited, for the answer's sources block. */
  cited: CitationSource[]
}

/**
 * Numbered markers become real links; everything else is left alone.
 * Fenced code and inline code are skipped — `arr[0]` is not a citation.
 */
export function rewriteCitations(
  answer: string,
  sources: readonly CitationSource[]
): RewrittenAnswer {
  const byNumber = new Map(sources.map((source) => [source.number, source]))
  const unresolved = new Set<number>()
  const cited = new Map<number, CitationSource>()

  const markdown = mapOutsideCode(answer, (segment) =>
    segment.replace(MARKER_RE, (whole, group: string) => {
      const numbers = group.split(',').map((piece) => Number(piece.trim()))
      const links = numbers.map((number) => {
        const source = byNumber.get(number)
        if (!source) {
          unresolved.add(number)
          return `[${number}]`
        }
        cited.set(number, source)
        return `[${number}](<${source.path}>)`
      })
      return numbers.length === links.length ? links.join('') : whole
    })
  )

  return {
    markdown,
    unresolved: [...unresolved].sort((a, b) => a - b),
    cited: [...cited.values()].sort((a, b) => a.number - b.number)
  }
}

/** Apply a transform to everything that is NOT code. */
function mapOutsideCode(text: string, transform: (segment: string) => string): string {
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*`)/g)
  return parts
    .map((part, index) => (index % 2 === 1 ? part : transform(part)))
    .join('')
}

/**
 * What the model is told about citing, appended to the reference list it
 * is given. Deliberately short: a rule the model can follow in one pass,
 * with the honest constraint that inventing a source is worse than
 * citing none.
 */
export const CITATION_INSTRUCTION =
  'Cite these notes inline with their number in square brackets — [1], [2] — ' +
  'right after the statement they support. You may also link a phrase directly ' +
  'to a note path. Never cite a number that is not in the list, and never cite ' +
  'a note you were not given.'
