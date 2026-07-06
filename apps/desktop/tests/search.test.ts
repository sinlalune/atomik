import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { resolveSearchScope, searchVault } from '../electron-main/search'

let vault: string

beforeAll(() => {
  vault = mkdtempSync(join(tmpdir(), 'atomik-search-'))
  const write = (rel: string, content: string): void => {
    const abs = join(vault, ...rel.split('/'))
    mkdirSync(join(abs, '..'), { recursive: true })
    writeFileSync(abs, content)
  }
  write(
    'attention-basics.md',
    '# Attention basics\n\nThe query vector is compared with key vectors.\n'
  )
  write(
    'ideas/jardin.md',
    '# Notes diverses\n\n## Plan jardinage\n\nSemer les tomates en mars.\n'
  )
  write('.hidden/skip.md', '# attention hidden\n')
  write('node_modules/pkg/skip.md', '# attention dep\n')
  write(
    'many-matches.md',
    `# repeat\n${Array.from({ length: 20 }, () => 'repeat me').join('\n')}\n`
  )
})

afterAll(() => {
  rmSync(vault, { recursive: true, force: true })
})

describe('searchVault (lexical, no embeddings — M1/S11)', () => {
  it('matches filenames, headings, and body text with kinds and lines', () => {
    const results = searchVault(vault, 'attention')
    expect(results).toHaveLength(1)
    const file = results[0]!
    expect(file.relPath).toBe('attention-basics.md')
    expect(file.matches.map((match) => match.kind)).toEqual([
      'filename',
      'heading'
    ])
    expect(file.matches[1]).toMatchObject({ line: 1, excerpt: '# Attention basics' })

    const body = searchVault(vault, 'key vectors')
    expect(body[0]!.matches[0]).toMatchObject({ kind: 'text', line: 3 })
  })

  it('is case-insensitive both ways', () => {
    expect(searchVault(vault, 'JARDINAGE')[0]!.matches[0]!.kind).toBe('heading')
    expect(searchVault(vault, 'semer')[0]!.matches[0]!.kind).toBe('text')
  })

  it('skips hidden and denied directories', () => {
    const paths = searchVault(vault, 'attention').map((r) => r.relPath)
    expect(paths.some((p) => p.includes('hidden'))).toBe(false)
    expect(paths.some((p) => p.includes('node_modules'))).toBe(false)
  })

  it('caps matches per file and returns [] on no hit', () => {
    expect(searchVault(vault, 'repeat')[0]!.matches.length).toBeLessThanOrEqual(6)
    expect(searchVault(vault, 'zzz-nothing')).toEqual([])
  })

  it('rejects invalid queries', () => {
    expect(() => searchVault(vault, 42)).toThrow()
    expect(() => searchVault(vault, '')).toThrow()
    expect(() => searchVault(vault, '   ')).toThrow()
    expect(() => searchVault(vault, 'x'.repeat(300))).toThrow()
  })
})

describe('scoped search (project / docs perimeters)', () => {
  it('confines the scan to the scope folder, relPaths stay root-relative', () => {
    // 'mars' lives in ideas/jardin.md; a scope elsewhere must not see it.
    expect(searchVault(vault, 'mars', 'ideas')[0]!.relPath).toBe(
      'ideas/jardin.md'
    )
    expect(searchVault(vault, 'attention', 'ideas')).toEqual([])
  })

  it('reads a missing scope folder as an empty perimeter', () => {
    expect(searchVault(vault, 'mars', 'ghost/folder')).toEqual([])
  })

  it('rejects traversal, absolute, hidden, and denied scopes', () => {
    for (const bad of [
      '..',
      'ideas/../..',
      '/etc',
      'a\\b',
      'a\0b',
      '.git',
      'sub/.hidden',
      'node_modules/pkg',
      '',
      'x/'.repeat(300)
    ]) {
      expect(() => resolveSearchScope(bad)).toThrow()
    }
    expect(resolveSearchScope('projects/demo')).toBe('projects/demo')
  })
})
