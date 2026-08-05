/**
 * Graph index seat (CP-MVP-009 S06) — the .atomik/graph.json sidecar
 * as a REBUILDABLE projection: delete the artifact, invalidate, and
 * the rebuild is byte-identical (03 lifecycle round trip).
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { invalidateGraphIndex, readGraphIndex } from '../electron-main/graph-index'

const roots: string[] = []

const makeVault = (): { vault: string; state: string } => {
  const base = mkdtempSync(join(tmpdir(), 'atomik-graph-'))
  roots.push(base)
  const vault = join(base, 'vault')
  const state = join(base, 'state')
  mkdirSync(vault)
  mkdirSync(join(vault, 'chats'))
  mkdirSync(state)
  writeFileSync(join(vault, 'ethos.md'), "# L'ethos\n\n[[hello]]{repose-sur} et [[ghost]]\n")
  writeFileSync(join(vault, 'chats', 'hello.md'), '# hello\n')
  return { vault, state }
}

afterEach(() => {
  invalidateGraphIndex()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('readGraphIndex', () => {
  it('builds lazily, persists graph.json, resolves and diagnoses', () => {
    const { vault, state } = makeVault()
    const index = readGraphIndex(vault, state)
    expect(existsSync(join(state, 'graph.json'))).toBe(true)
    const hello = index.edges.find((e) => e.targetRaw === 'hello')
    expect(hello?.object).toBe('chats/hello.md')
    expect(index.labels).toEqual({ 'repose-sur': 1 })
    expect(index.broken).toEqual([
      { subject: 'ethos.md', targetRaw: 'ghost', line: 3 }
    ])
  })

  it('delete → invalidate → rebuild is byte-identical (03 round trip)', () => {
    const { vault, state } = makeVault()
    readGraphIndex(vault, state)
    const file = join(state, 'graph.json')
    const first = readFileSync(file, 'utf8')
    rmSync(file)
    invalidateGraphIndex()
    readGraphIndex(vault, state)
    expect(readFileSync(file, 'utf8')).toBe(first)
  })

  it('invalidation picks up vault mutations', () => {
    const { vault, state } = makeVault()
    expect(readGraphIndex(vault, state).broken).toHaveLength(1)
    writeFileSync(join(vault, 'ghost.md'), '# Ghost\n')
    invalidateGraphIndex()
    const index = readGraphIndex(vault, state)
    expect(index.broken).toHaveLength(0)
    expect(index.edges.find((e) => e.targetRaw === 'ghost')?.object).toBe('ghost.md')
  })
})

describe('rename carries wikilinks (S06, tracked refactor per 27)', () => {
  it('rewrites [[stem]] in other notes and previews the count', async () => {
    const { vault } = makeVault()
    const { relocatePreview, relocateApply } = await import(
      '../electron-main/file-manage'
    )
    writeFileSync(
      join(vault, 'refs.md'),
      '# Refs\n\n[[hello]]{repose-sur} et [[hello]] encore\n'
    )
    const preview = relocatePreview(vault, 'chats/hello.md', 'chats/salut.md')
    expect(preview.edits.find((e) => e.relPath === 'refs.md')?.count).toBe(2)
    relocateApply(vault, 'chats/hello.md', 'chats/salut.md')
    const after = readFileSync(join(vault, 'refs.md'), 'utf8')
    expect(after).toContain('[[salut]]{repose-sur}')
    expect(after).not.toContain('[[hello]]')
  })

  it('a pure folder MOVE leaves stem wikilinks untouched', async () => {
    const { vault } = makeVault()
    const { relocateApply } = await import('../electron-main/file-manage')
    mkdirSync(join(vault, 'archive'))
    writeFileSync(join(vault, 'refs.md'), '# Refs\n\n[[hello]]\n')
    relocateApply(vault, 'chats/hello.md', 'archive/hello.md')
    expect(readFileSync(join(vault, 'refs.md'), 'utf8')).toContain('[[hello]]')
  })
})
