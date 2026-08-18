/**
 * CP-RICH-MARKDOWN S07 — the read/live microbench, made repeatable.
 *
 * S01 pinned the closure target ("within 10% of these medians") using a
 * "temporary, deleted vite-node script". A baseline you cannot re-run cannot
 * gate a closure, and bedrock 03 says a derived artifact ships its lifecycle.
 * So the same measurement now lives here, next to the numbers it produces.
 *
 *   npm --workspace atomik-desktop run bench:rich
 *
 * It reproduces S01's method: deterministic 200,000 B and 1,000,000 B
 * technical corpora, one warm-up per operation, sorted samples, median as the
 * comparison value. Exits non-zero if any median exceeds its S01 ceiling.
 */
import { markdownLanguage } from '@codemirror/lang-markdown'
import { noteMarkdown } from '../renderer/src/editor/note-markdown.ts'

/** S01 medians (2026-08-17) and the +10% closure ceiling. */
const BASELINE = {
  read_200kb: 40.95,
  parse_200kb: 22.35,
  walk_200kb: 3.12,
  read_1mb: 152.69,
  parse_1mb: 108.45,
  walk_1mb: 13.02
}
const CEILING = 1.1

/** Deterministic technical Markdown: headings, emphasis, inline code, links,
 *  task lists, tables, TypeScript fences, blockquotes, and semantic edges —
 *  the same shape S01 described. No randomness, so runs are comparable. */
function corpus(targetBytes) {
  const parts = []
  let bytes = 0
  let n = 0
  while (bytes < targetBytes) {
    const block = `## Section ${n}

Prose with *emphasis*, \`inline code\`, and a [link](notes/target-${n}.md).
A semantic edge to [[Concept ${n}]]{depends-on} and a plain [[Concept ${n + 1}]].

- [ ] a task item ${n}
- [x] a done item ${n}

| key | value |
| --- | ----: |
| alpha | ${n} |
| beta | ${n * 2} |

> A blockquote for section ${n}.

\`\`\`typescript
export function step${n}(input: string): number {
  return input.length + ${n}
}
\`\`\`
`
    parts.push(block)
    bytes += Buffer.byteLength(block)
    n += 1
  }
  return parts.join('\n')
}

function median(samples) {
  const sorted = [...samples].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function time(fn, runs) {
  fn() // warm-up, as S01 did
  const samples = []
  for (let i = 0; i < runs; i += 1) {
    const start = performance.now()
    fn()
    samples.push(performance.now() - start)
  }
  return samples
}

const corpora = {
  '200kb': corpus(200_000),
  '1mb': corpus(1_000_000)
}

const md = noteMarkdown()
const results = {}
for (const [size, text] of Object.entries(corpora)) {
  const runs = size === '200kb' ? 7 : 5
  results['read_' + size] = time(() => md.render(text), runs)
  results['parse_' + size] = time(
    () => markdownLanguage.parser.parse(text),
    runs
  )
  // The live recompute SHAPE: a full walk of the parsed tree.
  const tree = markdownLanguage.parser.parse(text)
  results['walk_' + size] = time(() => {
    let nodes = 0
    tree.iterate({ enter: () => { nodes += 1 } })
    return nodes
  }, runs)
}

let failed = false
console.log('operation        median      S01    ceiling  verdict')
for (const [key, samples] of Object.entries(results)) {
  const value = median(samples)
  const base = BASELINE[key]
  const ceiling = base * CEILING
  const ok = value <= ceiling
  if (!ok) failed = true
  console.log(
    key.padEnd(16) +
      value.toFixed(2).padStart(7) +
      base.toFixed(2).padStart(9) +
      ceiling.toFixed(2).padStart(9) +
      (ok ? '  ok' : '  OVER')
  )
}
console.log('\nsamples:')
for (const [key, samples] of Object.entries(results)) {
  console.log(
    key.padEnd(16) + [...samples].sort((a, b) => a - b).map((s) => s.toFixed(2)).join(' ')
  )
}

if (failed) {
  console.error('\nbench FAIL — a median exceeded its S01 +10% ceiling')
  process.exit(1)
}
console.log('\nbench PASS — every median within 10% of the S01 baseline')
