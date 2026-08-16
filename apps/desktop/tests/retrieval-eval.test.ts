import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  compileContextPacket,
  DEFAULT_SENSITIVITY,
  type ContextPacket,
  type PacketDeps
} from '../shared/context-packet'
import { buildGraphIndex } from '../shared/graph-core'
import {
  buildRetrievalIndex,
  serializeRetrievalIndex,
  type RetrievalSensitivity
} from '../shared/retrieval-core'

/**
 * The retrieval evaluation set (CP-MVP-010 S10) — bedrock 33
 * §Evaluation gates made runnable.
 *
 * ```bash
 * npm run retrieval-eval                       # the fixture vault
 * ATOMIK_EVAL_VAULT=/path/to/vault npm run retrieval-eval
 * ```
 *
 * Two things live here, and they answer different questions:
 *
 * ```text
 * the FIXTURE set     is the baseline correct?   recall@5, MRR, rejects
 * a REAL vault        is it fast enough?         build ms, p95 ms, size
 * ```
 *
 * The fixture is the one that can FAIL a build: it is reproducible, and
 * each case exists because a real question exposed a real rule. Twelve
 * owner bench rounds shaped those rules; this is where they stop being
 * judgement and start being measurements — and the entry condition any
 * heavier stage (stemming, a parser, embeddings) has to beat before
 * 33's ladder will let it in.
 */

type EvalCase = {
  id: string
  query: string
  reach?: RetrievalSensitivity
  scope?: string
  expect?: string[]
  reject?: string[]
  missing?: string[]
  /** Ceiling on the packet: some cases are about RESTRAINT. */
  maxEntries?: number
  why: string
}

const FIXTURE = join(__dirname, 'fixtures', 'eval-vault')
const K = 5

function collect(root: string): { path: string; content?: string }[] {
  const files: { path: string; content?: string }[] = []
  const walk = (dir: string, rel: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const abs = join(dir, entry.name)
      const child = rel === '' ? entry.name : `${rel}/${entry.name}`
      if (entry.isDirectory()) {
        walk(abs, child)
      } else if (entry.name.endsWith('.json')) {
        continue
      } else if (extname(entry.name).toLowerCase() === '.md') {
        if (statSync(abs).size <= 2 * 1024 * 1024) {
          files.push({ path: child, content: readFileSync(abs, 'utf8') })
        }
      } else {
        files.push({ path: child })
      }
    }
  }
  walk(root, '')
  return files
}

function depsFor(root: string): PacketDeps & { fileCount: number; buildMs: number } {
  const files = collect(root)
  const started = performance.now()
  const index = buildRetrievalIndex(files)
  const graph = buildGraphIndex(files)
  const buildMs = performance.now() - started
  const contents = new Map(
    files.filter((file) => file.content !== undefined).map((f) => [f.path, f.content as string])
  )
  return {
    index,
    graph,
    read: (path) => contents.get(path),
    fileCount: files.length,
    buildMs
  }
}

const compile = (
  deps: PacketDeps,
  testCase: EvalCase
): { packet: ContextPacket; ms: number } => {
  const started = performance.now()
  const packet = compileContextPacket(
    {
      query: testCase.query,
      sensitivity: testCase.reach ?? DEFAULT_SENSITIVITY,
      ...(testCase.scope ? { scope: { folder: testCase.scope } } : {})
    },
    deps
  )
  return { packet, ms: performance.now() - started }
}

describe('retrieval evaluation (33 §Evaluation gates)', () => {
  const deps = depsFor(FIXTURE)
  const cases = (
    JSON.parse(readFileSync(join(FIXTURE, 'queries.json'), 'utf8')) as {
      cases: EvalCase[]
    }
  ).cases

  it('reports recall@5, MRR and latency over the whole set', () => {
    const rows: string[] = []
    const latencies: number[] = []
    let recallHits = 0
    let recallTotal = 0
    let reciprocalSum = 0
    let ranked = 0
    const failures: string[] = []

    for (const testCase of cases) {
      const { packet, ms } = compile(deps, testCase)
      latencies.push(ms)
      const found = packet.entries.slice(0, K).map((entry) => entry.path)

      for (const wanted of testCase.expect ?? []) {
        recallTotal += 1
        if (found.includes(wanted)) recallHits += 1
        else failures.push(`${testCase.id}: missed ${wanted}`)
      }
      for (const unwanted of testCase.reject ?? []) {
        if (packet.entries.some((entry) => entry.path === unwanted)) {
          failures.push(`${testCase.id}: returned ${unwanted}`)
        }
      }
      for (const term of testCase.missing ?? []) {
        if (!packet.coverage.missingTerms.includes(term)) {
          failures.push(`${testCase.id}: did not report "${term}" as missing`)
        }
      }
      if (
        testCase.maxEntries !== undefined &&
        packet.entries.length > testCase.maxEntries
      ) {
        failures.push(
          `${testCase.id}: ${packet.entries.length} entries, max ${testCase.maxEntries}`
        )
      }
      const first = (testCase.expect ?? [])[0]
      if (first !== undefined) {
        const rank = found.indexOf(first)
        ranked += 1
        if (rank >= 0) reciprocalSum += 1 / (rank + 1)
      }

      rows.push(
        `${testCase.id.padEnd(18)} ${String(packet.entries.length).padStart(2)} entries` +
          ` · ${packet.coverage.verdict.padEnd(7)} · ${ms.toFixed(1)}ms`
      )
    }

    const sorted = [...latencies].sort((a, b) => a - b)
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0
    const recall = recallTotal === 0 ? 1 : recallHits / recallTotal
    const mrr = ranked === 0 ? 1 : reciprocalSum / ranked

    console.log(
      [
        '',
        `RETRIEVAL EVALUATION — fixture vault, ${deps.fileCount} files`,
        ...rows,
        '',
        `recall@${K}      ${(recall * 100).toFixed(1)}%  (${recallHits}/${recallTotal})`,
        `MRR            ${mrr.toFixed(3)}`,
        `index build    ${deps.buildMs.toFixed(1)} ms`,
        `index size     ${(serializeRetrievalIndex(deps.index).length / 1024).toFixed(1)} KiB`,
        `query mean     ${(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1)} ms`,
        `query p95      ${p95.toFixed(1)} ms`,
        ...(failures.length > 0 ? ['', 'FAILURES:', ...failures] : []),
        ''
      ].join('\n')
    )

    // The baseline this path is accepted on. Each number is a claim the
    // next path inherits: beating them is what a heavier stage must do.
    expect(failures).toEqual([])
    expect(recall).toBe(1)
    expect(mrr).toBeGreaterThanOrEqual(0.9)
    // ADR-013's thresholds — the numbers that would reopen the SQLite
    // decision. On a fixture they are trivially met; the point is that
    // they are CHECKED rather than remembered.
    expect(deps.buildMs).toBeLessThan(2000)
    expect(p95).toBeLessThan(50)
  })

  it('every case says why it exists', () => {
    for (const testCase of cases) {
      expect(testCase.why.length).toBeGreaterThan(10)
      expect(
        testCase.expect ?? testCase.reject ?? testCase.missing ?? testCase.maxEntries
      ).toBeDefined()
    }
  })
})

/**
 * The same measurements on a REAL vault, which is the only place the
 * cost numbers mean anything. No ground truth, so no assertions: it
 * prints, and the result belongs in a dated bench record (33).
 */
describe.runIf(process.env['ATOMIK_EVAL_VAULT'])('real-vault bench', () => {
  it('reports build time, index size and query latency', () => {
    const root = process.env['ATOMIK_EVAL_VAULT'] as string
    const deps = depsFor(root)
    const queries = [
      'ethos',
      'que peux tu me dire de platon',
      'what plato brought to philosophy',
      'xml',
      'credibilite'
    ]
    const latencies = queries.map((query) => compile(deps, { id: query, query, why: 'bench' }).ms)
    const sorted = [...latencies].sort((a, b) => a - b)
    console.log(
      [
        '',
        `REAL VAULT — ${root}`,
        `files          ${deps.fileCount}`,
        `documents      ${deps.index.docs.length}`,
        `terms          ${Object.keys(deps.index.terms).length}`,
        `nodes / edges  ${deps.graph.nodes.length} / ${deps.graph.edges.length}`,
        `broken links   ${deps.graph.broken.length}`,
        `index build    ${deps.buildMs.toFixed(1)} ms`,
        `index size     ${(serializeRetrievalIndex(deps.index).length / 1024).toFixed(1)} KiB`,
        `query p95      ${(sorted.at(-1) ?? 0).toFixed(1)} ms`,
        ''
      ].join('\n')
    )
    expect(deps.fileCount).toBeGreaterThan(0)
  })
})
