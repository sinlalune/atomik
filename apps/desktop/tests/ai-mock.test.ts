import { describe, expect, it } from 'vitest'
import type { AiOperation } from '../shared/ipc-contract'
import { isValidAiOperation, runAiOperation } from '../electron-main/ai-mock'

function validOp(overrides: Partial<AiOperation> = {}): AiOperation {
  return {
    id: 'op-1',
    input: [
      {
        relPath: 'notes/attention.md',
        kind: 'text',
        content: 'Attention compares queries with keys.',
        range: { from: 10, to: 47 }
      }
    ],
    instruction: 'Explain this simply.',
    preset: 'explain',
    target: {
      relPath: 'notes/attention.md',
      destination: { kind: 'replace-selection' }
    },
    ...overrides
  }
}

describe('isValidAiOperation (channel input is untrusted)', () => {
  it('accepts a well-formed operation', () => {
    expect(isValidAiOperation(validOp())).toBe(true)
  })

  it('rejects structural garbage', () => {
    expect(isValidAiOperation(null)).toBe(false)
    expect(isValidAiOperation('run')).toBe(false)
    expect(isValidAiOperation({})).toBe(false)
    expect(isValidAiOperation(validOp({ id: '' }))).toBe(false)
    expect(isValidAiOperation(validOp({ instruction: '' }))).toBe(false)
    expect(
      isValidAiOperation(validOp({ instruction: 'x'.repeat(5000) }))
    ).toBe(false)
    expect(isValidAiOperation(validOp({ input: [] }))).toBe(false)
  })

  it('rejects malformed selections and destinations', () => {
    const badRange = validOp()
    badRange.input[0]!.range = { from: 20, to: 10 }
    expect(isValidAiOperation(badRange)).toBe(false)

    const negative = validOp()
    negative.input[0]!.range = { from: -1, to: 5 }
    expect(isValidAiOperation(negative)).toBe(false)

    const oversized = validOp()
    oversized.input[0]!.content = 'x'.repeat(100_001)
    expect(isValidAiOperation(oversized)).toBe(false)

    expect(
      isValidAiOperation(
        validOp({
          target: {
            relPath: 'notes/attention.md',
            destination: { kind: 'new-note', newNotePath: '' }
          }
        })
      )
    ).toBe(false)
  })
})

describe('runAiOperation (mock bundle)', () => {
  it('throws on invalid operations', () => {
    expect(() => runAiOperation({ id: 'x' })).toThrow(/rejected/)
  })

  it('produces a 06-shaped bundle with the truth arrays present', () => {
    const bundle = runAiOperation(validOp())
    expect(bundle.operationId).toBe('op-1')
    expect(bundle.blocks.map((block) => block.role)).toEqual([
      'answer',
      'question'
    ])
    expect(bundle.patchProposals).toHaveLength(1)
    expect(bundle.patchProposals[0]!.status).toBe('pending')
    expect(bundle.claims).toEqual([])
    expect(bundle.evidence).toEqual([])
    expect(bundle.verification).toEqual([])
    expect(bundle.uncertainties[0]!.severity).toBe('info')
    expect(bundle.actionTraceIds).toEqual([])
  })

  it('maps destinations to the right proposed file change', () => {
    const replace = runAiOperation(validOp()).patchProposals[0]!.files[0]!
    expect(replace.kind).toBe('replace-range')
    if (replace.kind === 'replace-range') {
      expect(replace.range).toEqual({ from: 10, to: 47 })
      expect(replace.relPath).toBe('notes/attention.md')
    }

    const append = runAiOperation(
      validOp({
        target: { relPath: 'notes/attention.md', destination: { kind: 'append' } }
      })
    ).patchProposals[0]!.files[0]!
    expect(append.kind).toBe('append')

    const create = runAiOperation(
      validOp({
        target: {
          relPath: 'notes/attention.md',
          destination: { kind: 'new-note', newNotePath: 'notes/attention-ai.md' }
        }
      })
    ).patchProposals[0]!.files[0]!
    expect(create.kind).toBe('create')
    expect(create.relPath).toBe('notes/attention-ai.md')
  })

  it('is content-deterministic and clearly marked as mock', () => {
    const first = runAiOperation(validOp())
    const second = runAiOperation(validOp())
    expect(first.blocks[0]!.content).toBe(second.blocks[0]!.content)
    expect(first.blocks[0]!.content).toContain('[mock · explain]')
    expect(first.blocks[0]!.content).toContain('Explain this simply.')
    expect(first.patchProposals[0]!.files[0]!.newText).toBe(
      second.patchProposals[0]!.files[0]!.newText
    )
  })
})
