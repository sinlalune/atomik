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

  it('wears cloud identity + labeled usage/billing when a real adapter reports them (S02)', () => {
    const bundle = runOne('op-cloud')
    ledger.draftFor(operation('op-cloud'), bundle, 900, {
      location: 'cloud-model',
      provider: 'mistral',
      model: 'mistral-small',
      modelVersion: 'mistral-small-2603',
      usage: { inputTokens: 120, outputTokens: 40, basis: 'provider-reported' },
      billing: {
        currency: 'USD',
        estimatedAmount: 0.000042,
        basis: 'estimated',
        priceSnapshotId: 'docs/research/model-research.md@2026-07-20'
      }
    })
    // the badge prefers provider-reported counts and carries the cost
    const summary = ledger.summary(bundle.id)!
    expect(summary.location).toBe('cloud-model')
    expect(summary.model).toBe('mistral-small')
    expect(summary.estimatedInputTokens).toBe(120)
    expect(summary.estimatedOutputTokens).toBe(40)
    expect(summary.estimatedExternalCost).toEqual({ currency: 'USD', amount: 0.000042 })

    ledger.resolve(bundle.id, 'accepted')
    const line = readLines().at(-1)!
    expect(line['execution']).toEqual({
      location: 'cloud-model',
      provider: 'mistral',
      model: 'mistral-small',
      modelVersion: 'mistral-small-2603'
    })
    // the LINE keeps both pairs, each labeled — reported is authoritative
    expect(line['usage']).toMatchObject({
      reportedInputTokens: 120,
      reportedOutputTokens: 40,
      basis: 'provider-reported'
    })
    expect((line['usage'] as Record<string, number>)['estimatedInputTokens']).toBeGreaterThan(0)
    expect(line['billing']).toMatchObject({
      currency: 'USD',
      basis: 'estimated',
      priceSnapshotId: 'docs/research/model-research.md@2026-07-20'
    })
    expect(line['privacy']).toEqual({ mode: 'cloud', contentRecorded: false })
  })

  it('records multi-provider trace receipts with dated price snapshots (CP-PROVIDERS S06)', () => {
    const providers = [
      { provider: 'openrouter', model: 'mistralai/mistral-small-24b-instruct-2501' },
      { provider: 'openai', model: 'gpt-4o-mini' },
      { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' },
      { provider: 'deepseek', model: 'deepseek-chat' },
      { provider: 'google', model: 'gemini-2.0-flash' }
    ]

    for (const p of providers) {
      const opId = `op-${p.provider}`
      const bundle = runOne(opId)
      ledger.draftFor(operation(opId), bundle, 500, {
        location: 'cloud-model',
        provider: p.provider,
        model: p.model,
        modelVersion: p.model,
        usage: { inputTokens: 200, outputTokens: 50, basis: 'provider-reported' },
        billing: {
          currency: 'USD',
          estimatedAmount: 0.00005,
          basis: 'estimated',
          priceSnapshotId: 'model-research@2026-08-16'
        }
      })

      ledger.resolve(bundle.id, 'accepted')
      const line = readLines().at(-1)!
      expect(line['execution']).toMatchObject({
        location: 'cloud-model',
        provider: p.provider,
        model: p.model
      })
      expect(line['billing']).toMatchObject({
        priceSnapshotId: 'model-research@2026-08-16'
      })
      expect(line['privacy']).toEqual({ mode: 'cloud', contentRecorded: false })
    }
  })

  it('names the failed engine on a cloud failure', () => {
    ledger.recordFailure('op-cloud-fail', 12, {
      location: 'cloud-model',
      provider: 'mistral',
      model: 'mistral-small',
      modelVersion: 'mistral-small-2603'
    })
    const last = readLines().at(-1)!
    expect(last['outcome']).toEqual({ status: 'failed' })
    expect(last['execution']).toMatchObject({ provider: 'mistral' })
    expect(last['privacy']).toEqual({ mode: 'cloud', contentRecorded: false })
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

  it('reserves a generation parent before Wikimedia children and reuses its id', () => {
    const op = operation('op-wiki-parent')
    const parentTraceId = ledger.beginGeneration(op.id)
    const childTraceId = ledger.recordWikimedia({
      parentTraceId,
      parentOperationId: op.id,
      tool: 'search_wiki',
      corpus: 'wikipedia',
      language: 'en',
      requests: 2,
      resultCount: 1,
      responseBytes: 512,
      wallMs: 8,
      status: 'completed'
    })
    const bundle = runAiOperation(op)
    expect(ledger.draftFor(op, bundle, 12, undefined, parentTraceId)).toBe(
      parentTraceId
    )
    ledger.resolve(bundle.id, 'accepted')

    const lines = readLines()
    const child = lines.find((line) => line['id'] === childTraceId)!
    const parent = lines.find((line) => line['id'] === parentTraceId)!
    expect(child['parentTraceId']).toBe(parentTraceId)
    expect(child['operationId']).toBe(op.id)
    expect(parent['operationId']).toBe(op.id)
    expect(parent['action']).toBe('generate')
  })

  it('refuses orphaned or mismatched Wikimedia receipts', () => {
    const record = {
      parentTraceId: 'trace_orphan',
      parentOperationId: 'op-orphan',
      tool: 'search_wiki' as const,
      corpus: 'wikipedia' as const,
      language: 'en',
      requests: 1,
      resultCount: 0,
      responseBytes: 10,
      wallMs: 1,
      status: 'failed' as const,
      errorKind: 'empty' as const
    }
    expect(() => ledger.recordWikimedia(record)).toThrow('no active generation parent')

    const parentTraceId = ledger.beginGeneration('op-right-parent')
    expect(() =>
      ledger.recordWikimedia({ ...record, parentTraceId })
    ).toThrow('no active generation parent')
    ledger.recordFailure('op-right-parent', 1, undefined, parentTraceId)
  })

  it('flushes an in-flight reserved parent as a failed generation line', () => {
    const parentTraceId = ledger.beginGeneration('op-interrupted-parent')
    ledger.flush()
    const line = readLines().find((candidate) => candidate['id'] === parentTraceId)!
    expect(line['operationId']).toBe('op-interrupted-parent')
    expect(line['outcome']).toEqual({ status: 'failed' })
  })
})

describe('retrieval traces (CP-MVP-010 S06)', () => {
  it('records one line per packet: stages, counts, tokens, latency', () => {
    const id = ledger.recordRetrieval({
      packetId: 'packet-42',
      stages: ['lexical', 'link'],
      candidates: 17,
      selected: 5,
      contextTokens: 812,
      coverage: 'thin',
      wallMs: 4,
      status: 'completed'
    })

    const line = readLines().at(-1)!
    expect(line['id']).toBe(id)
    expect(line['action']).toBe('retrieve')
    expect(line['packetId']).toBe('packet-42')
    expect(line['execution']).toEqual({
      location: 'deterministic',
      provider: 'atomik',
      model: 'lexical-bm25'
    })
    expect(line['usage']).toEqual({
      candidates: 17,
      selected: 5,
      estimatedContextTokens: 812,
      basis: 'estimated',
      stages: ['lexical', 'link'],
      coverage: 'thin'
    })
    // a local result reports zero EXTERNAL billing without claiming zero
    // cost — the wall time sits right beside it (33)
    expect(line['billing']).toEqual({
      currency: 'EUR',
      estimatedAmount: 0,
      basis: 'estimated'
    })
    expect((line['performance'] as Record<string, number>)['wallMs']).toBe(4)
    expect(line['privacy']).toEqual({ mode: 'offline', contentRecorded: false })
  })

  it('never records the query — user text is content like any other', () => {
    ledger.recordRetrieval({
      packetId: 'packet-43',
      stages: ['lexical'],
      candidates: 1,
      selected: 1,
      contextTokens: 10,
      coverage: 'covered',
      wallMs: 1,
      status: 'completed'
    })
    const raw = readFileSync(ledger.ledgerPath(), 'utf8')
    expect(raw).not.toContain('crédibilité')
    expect(raw).not.toContain('ethos')
  })

  it('parents model-requested search_vault receipts without changing inspector traces', () => {
    const parentTraceId = ledger.beginGeneration('op-vault-tool')
    const childTraceId = ledger.recordRetrieval({
      packetId: 'packet-tool',
      stages: ['lexical'],
      candidates: 2,
      selected: 1,
      contextTokens: 30,
      coverage: 'thin',
      wallMs: 2,
      status: 'completed',
      parentTraceId,
      parentOperationId: 'op-vault-tool',
      tool: 'search_vault'
    })
    const line = readLines().find((candidate) => candidate['id'] === childTraceId)!
    expect(line).toMatchObject({
      parentTraceId,
      operationId: 'op-vault-tool',
      action: 'retrieve',
      usage: { tool: 'search_vault' }
    })
    ledger.recordFailure('op-vault-tool', 3, undefined, parentTraceId)
  })
})
