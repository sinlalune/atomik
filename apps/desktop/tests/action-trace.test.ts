import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AiOperation, AiResponseBundle } from '../shared/ipc-contract'
import { ActionTraceLedger } from '../electron-main/action-trace'
import { runAiOperation } from '../electron-main/ai-mock'

let stateDir: string
let ledger: ActionTraceLedger

function operation(id: string): AiOperation {
  return {
    id,
    input: [
      {
        relPath: 'welcome.md',
        kind: 'text',
        content: 'Attention compares queries with keys.',
        range: { from: 0, to: 37 }
      }
    ],
    instruction: 'Explain this simply.',
    preset: 'explain',
    target: { relPath: 'welcome.md', destination: { kind: 'append' } }
  }
}

function runOne(id: string): AiResponseBundle {
  return runAiOperation(operation(id))
}

function readLines(): Array<Record<string, unknown>> {
  const raw = readFileSync(ledger.ledgerPath(), 'utf8')
  return raw
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
}

beforeAll(() => {
  stateDir = mkdtempSync(join(tmpdir(), 'atomik-traces-'))
  ledger = new ActionTraceLedger(stateDir)
})

afterAll(() => {
  rmSync(stateDir, { recursive: true, force: true })
})

describe('ActionTraceLedger (S09 minimum, nothing more)', () => {
  it('appends exactly one complete line when a decision resolves it', () => {
    const bundle = runOne('op-1')
    const traceId = ledger.draftFor(operation('op-1'), bundle, 3)
    expect(existsSync(ledger.ledgerPath())).toBe(false) // no decision yet

    ledger.resolve(bundle.id, 'accepted')
    const lines = readLines()
    expect(lines).toHaveLength(1)
    const line = lines[0]!
    expect(line['id']).toBe(traceId)
    expect(line['operationId']).toBe('op-1')
    expect(typeof line['timestamp']).toBe('string')
    expect(line['action']).toBe('generate')
    expect(line['execution']).toMatchObject({
      location: 'deterministic',
      provider: 'atomik',
      model: 'mock'
    })
    const usage = line['usage'] as Record<string, number>
    expect(usage['estimatedInputTokens']).toBeGreaterThan(0)
    expect(usage['estimatedOutputTokens']).toBeGreaterThan(0)
    expect((line['performance'] as Record<string, number>)['wallMs']).toBe(3)
    expect(line['billing']).toEqual({
      currency: 'EUR',
      estimatedAmount: 0,
      basis: 'estimated'
    })
    expect(line['outcome']).toEqual({ status: 'completed', decision: 'accepted' })
    expect(line['privacy']).toEqual({ mode: 'offline', contentRecorded: false })
  })

  it('never records content: prompts and selections stay out of the line', () => {
    const raw = readFileSync(ledger.ledgerPath(), 'utf8')
    expect(raw).not.toContain('Explain this simply.')
    expect(raw).not.toContain('Attention compares')
  })

  it('appends (never rewrites): edited and rejected accumulate', () => {
    const edited = runOne('op-2')
    ledger.draftFor(operation('op-2'), edited, 1)
    ledger.resolve(edited.id, 'edited')

    const rejected = runOne('op-3')
    ledger.draftFor(operation('op-3'), rejected, 2)
    ledger.resolve(rejected.id, 'rejected')

    const decisions = readLines().map(
      (line) => (line['outcome'] as Record<string, unknown>)['decision']
    )
    expect(decisions).toEqual(['accepted', 'edited', 'rejected'])
  })

  it('rejects bad resolutions and unknown bundles', () => {
    const bundle = runOne('op-4')
    ledger.draftFor(operation('op-4'), bundle, 1)
    expect(() => ledger.resolve(bundle.id, 'maybe')).toThrow()
    expect(() => ledger.resolve('ghost-bundle', 'accepted')).toThrow()
    expect(() => ledger.resolve(42, 'accepted')).toThrow()
    ledger.resolve(bundle.id, 'accepted') // still resolvable exactly once
    expect(() => ledger.resolve(bundle.id, 'accepted')).toThrow()
  })

  it('records failures immediately and flushes undecided drafts on quit', () => {
    ledger.recordFailure('op-fail', 7)
    let last = readLines().at(-1)!
    expect(last['outcome']).toEqual({ status: 'failed' })

    const undecided = runOne('op-5')
    ledger.draftFor(operation('op-5'), undecided, 4)
    ledger.flush()
    last = readLines().at(-1)!
    expect(last['operationId']).toBe('op-5')
    expect(last['outcome']).toEqual({ status: 'completed' })

    const count = readLines().length
    ledger.flush() // drafts cleared: second flush appends nothing
    expect(readLines()).toHaveLength(count)
  })

  it('summary exposes badge data for pending drafts only', () => {
    const bundle = runOne('op-6')
    ledger.draftFor(operation('op-6'), bundle, 5)
    const summary = ledger.summary(bundle.id)!
    expect(summary.location).toBe('deterministic')
    expect(summary.wallMs).toBe(5)
    expect(summary.estimatedExternalCost).toEqual({ currency: 'EUR', amount: 0 })
    ledger.resolve(bundle.id, 'accepted')
    expect(ledger.summary(bundle.id)).toBeNull()
    expect(ledger.summary(42)).toBeNull()
  })
})
