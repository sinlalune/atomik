import { resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveDevDocPath, resolveDocsRoot } from '../electron-main/dev-docs'

const ROOT = resolve('/repo/docs')

/**
 * Security-relevant: readDevDoc is renderer-reachable, so path validation is
 * the trust boundary (13: IPC inputs are validated in the trusted layer).
 */
describe('resolveDevDocPath', () => {
  it('accepts well-formed bundle paths', () => {
    expect(resolveDevDocPath(ROOT, 'index.md')).toBe(resolve(ROOT, 'index.md'))
    expect(resolveDevDocPath(ROOT, 'bedrock/00_00-orientation.md')).toBe(
      resolve(ROOT, 'bedrock', '00_00-orientation.md')
    )
    expect(
      resolveDevDocPath(ROOT, 'bedrock/archive/04_04-old-draft.md')
    ).toContain(`archive${sep}`)
    expect(resolveDevDocPath(ROOT, 'diagrams/D01_four_authorities.svg')).not.toBeNull()
    expect(resolveDevDocPath(ROOT, 'contracts/operation_trace_contract_v0_1.json')).not.toBeNull()
  })

  it('tolerates redundant ./ segments that stay inside the root', () => {
    expect(resolveDevDocPath(ROOT, 'bedrock/./12_12-electron-mvp.md')).toBe(
      resolve(ROOT, 'bedrock', '12_12-electron-mvp.md')
    )
  })

  it('rejects traversal in every spelling', () => {
    expect(resolveDevDocPath(ROOT, '../secrets.md')).toBeNull()
    expect(resolveDevDocPath(ROOT, 'bedrock/../../outside.md')).toBeNull()
    expect(resolveDevDocPath(ROOT, '..')).toBeNull()
    expect(resolveDevDocPath(ROOT, 'bedrock/../..')).toBeNull()
  })

  it('rejects absolute paths, backslashes, and NUL bytes', () => {
    expect(resolveDevDocPath(ROOT, '/etc/passwd')).toBeNull()
    expect(resolveDevDocPath(ROOT, 'bedrock\\13.md')).toBeNull()
    expect(resolveDevDocPath(ROOT, 'index.md\0.png')).toBeNull()
  })

  it('rejects non-strings, empty, and oversized input', () => {
    expect(resolveDevDocPath(ROOT, 42)).toBeNull()
    expect(resolveDevDocPath(ROOT, null)).toBeNull()
    expect(resolveDevDocPath(ROOT, { relPath: 'index.md' })).toBeNull()
    expect(resolveDevDocPath(ROOT, '')).toBeNull()
    expect(resolveDevDocPath(ROOT, `${'a/'.repeat(300)}x.md`)).toBeNull()
  })

  it('rejects extensions outside the allowlist', () => {
    expect(resolveDevDocPath(ROOT, 'index.html')).toBeNull()
    expect(resolveDevDocPath(ROOT, 'notes.txt')).toBeNull()
    expect(resolveDevDocPath(ROOT, 'script.js')).toBeNull()
    expect(resolveDevDocPath(ROOT, 'bedrock')).toBeNull()
  })
})

describe('resolveDocsRoot', () => {
  it('maps apps/desktop to the repository docs folder', () => {
    expect(resolveDocsRoot(resolve('/repo/apps/desktop'))).toBe(
      resolve('/repo/docs')
    )
  })
})
