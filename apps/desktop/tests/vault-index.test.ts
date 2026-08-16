/**
 * Index maintenance (CP-MVP-010 S03): the one door every write verb
 * reports through, the two projections it keeps current, and the push it
 * sends. The properties that matter are that a PATCH is worth nothing
 * unless it lands the same index a REBUILD would, and that a change the
 * patch cannot model falls back to rebuilding rather than to guessing.
 */
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildGraphIndex, patchGraphIndexForSave } from '../shared/graph-core'
import { searchIndex, serializeRetrievalIndex } from '../shared/retrieval-core'
import { invalidateGraphIndex, readGraphIndex } from '../electron-main/graph-index'
import { invalidateRetrievalIndex, readRetrievalIndex } from '../electron-main/retrieval'
import { recordVaultChange } from '../electron-main/vault-index'
import type { IndexChangedEvent } from '../shared/ipc-contract'

const roots: string[] = []

const makeVault = (): { vault: string; state: string } => {
  const base = mkdtempSync(join(tmpdir(), 'atomik-vault-index-'))
  roots.push(base)
  const vault = join(base, 'vault')
  const state = join(base, 'state')
  mkdirSync(vault)
  mkdirSync(state)
  write(vault, 'ethos.md', "# L'éthos\n\nLa crédibilité de l'orateur. [[pathos]]{oppose-a}\n")
  write(vault, 'pathos.md', '# Pathos\n\nLes émotions de l\'auditoire.\n')
  return { vault, state }
}

const write = (vault: string, rel: string, content: string): void => {
  const abs = join(vault, ...rel.split('/'))
  mkdirSync(join(abs, '..'), { recursive: true })
  writeFileSync(abs, content)
}

afterEach(() => {
  invalidateGraphIndex()
  invalidateRetrievalIndex()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('the retrieval seat', () => {
  it('builds lazily, persists a rebuildable projection, and round-trips', () => {
    const { vault, state } = makeVault()
    const first = serializeRetrievalIndex(readRetrievalIndex(vault, state))

    // Delete the artifact AND the cache: the rebuild must be identical.
    unlinkSync(join(state, 'index', 'retrieval.json'))
    invalidateRetrievalIndex(vault)
    expect(serializeRetrievalIndex(readRetrievalIndex(vault, state))).toBe(first)
  })

  it('indexes non-markdown files by path, so a snapshot is findable', () => {
    const { vault, state } = makeVault()
    write(vault, 'sources/web/curlew/snapshot.mhtml', 'binary-ish')
    const index = readRetrievalIndex(vault, state)
    expect(searchIndex(index, 'curlew').map((hit) => hit.path)).toContain(
      'sources/web/curlew/snapshot.mhtml'
    )
  })
})

describe('recordVaultChange', () => {
  it('a save patches both indexes in place and announces itself', () => {
    const { vault, state } = makeVault()
    readRetrievalIndex(vault, state)
    readGraphIndex(vault, state)

    write(vault, 'ethos.md', "# L'éthos\n\nUne posture. [[pathos]]{depend-de}\n")
    const events: IndexChangedEvent[] = []
    recordVaultChange(vault, { kind: 'saved', path: 'ethos.md' }, (event) =>
      events.push(event)
    )

    expect(events).toEqual([{ reason: 'saved', paths: ['ethos.md'] }])
    // retrieval: the new word is findable, the old one is gone
    const retrieval = readRetrievalIndex(vault, state)
    expect(searchIndex(retrieval, 'posture').map((hit) => hit.path)).toEqual([
      'ethos.md'
    ])
    expect(searchIndex(retrieval, 'credibilite')).toEqual([])
    // graph: the edge label moved with it
    expect(readGraphIndex(vault, state).labels).toEqual({ 'depend-de': 1 })
  })

  it('a delete drops the document; a create adds it', () => {
    const { vault, state } = makeVault()
    readRetrievalIndex(vault, state)

    unlinkSync(join(vault, 'pathos.md'))
    recordVaultChange(vault, { kind: 'deleted', path: 'pathos.md' })
    expect(
      readRetrievalIndex(vault, state).docs.map((doc) => doc.path)
    ).toEqual(['ethos.md'])

    write(vault, 'logos.md', '# Logos\n\nLa raison.\n')
    recordVaultChange(vault, { kind: 'created', path: 'logos.md' })
    expect(searchIndex(readRetrievalIndex(vault, state), 'raison')[0]!.path).toBe(
      'logos.md'
    )
  })

  it('patched indexes stay identical to freshly built ones', () => {
    const { vault, state } = makeVault()
    readRetrievalIndex(vault, state)
    readGraphIndex(vault, state)

    write(vault, 'ethos.md', '# Ethos\n\nRéécrit sans lien.\n')
    write(vault, 'logos.md', '# Logos\n\nLa raison du discours.\n')
    recordVaultChange(vault, { kind: 'saved', path: 'ethos.md' })
    recordVaultChange(vault, { kind: 'created', path: 'logos.md' })

    const patchedRetrieval = serializeRetrievalIndex(readRetrievalIndex(vault, state))
    const patchedGraph = JSON.stringify(readGraphIndex(vault, state))
    invalidateRetrievalIndex()
    invalidateGraphIndex()
    expect(serializeRetrievalIndex(readRetrievalIndex(vault, state))).toBe(
      patchedRetrieval
    )
    expect(JSON.stringify(readGraphIndex(vault, state))).toBe(patchedGraph)
  })

  it('a relocate rebuilds instead of patching — the refactor rewrote other notes', () => {
    const { vault, state } = makeVault()
    readRetrievalIndex(vault, state)

    write(vault, 'ethos-2.md', "# L'éthos\n\nDéplacé.\n")
    unlinkSync(join(vault, 'ethos.md'))
    recordVaultChange(vault, { kind: 'relocated', from: 'ethos.md', to: 'ethos-2.md' })

    const paths = readRetrievalIndex(vault, state).docs.map((doc) => doc.path)
    expect(paths).toEqual(['ethos-2.md', 'pathos.md'])
  })
})

describe('patchGraphIndexForSave refuses what it cannot model', () => {
  const files = [
    { path: 'notes/ethos.md', content: '# Ethos\n\n[[pathos]]{oppose-a}\n' },
    { path: 'notes/pathos.md', content: '# Pathos\n' },
    { path: 'sources/web/curlew/source.md', content: '---\ntitle: Curlew\n---\n# Source dossier\n' },
    { path: 'sources/web/curlew/snapshot.mhtml' }
  ]
  const index = buildGraphIndex(files)

  it('patches a plain note save to exactly the rebuilt index', () => {
    const content = '# Ethos revu\n\n[[pathos]]{depend-de} et [[ghost]]\n'
    const patched = patchGraphIndexForSave(index, 'notes/ethos.md', content)
    const rebuilt = buildGraphIndex(
      files.map((file) =>
        file.path === 'notes/ethos.md' ? { path: file.path, content } : file
      )
    )
    expect(patched).toEqual(rebuilt)
    expect(patched!.broken).toHaveLength(1) // [[ghost]] stays a diagnostic
  })

  it('refuses a bundle contract file, an unknown path, and a non-note', () => {
    // source.md names its whole bundle: every sibling's title could move.
    expect(
      patchGraphIndexForSave(index, 'sources/web/curlew/source.md', '---\ntitle: Autre\n---\n')
    ).toBeNull()
    expect(patchGraphIndexForSave(index, 'notes/unknown.md', '# New\n')).toBeNull()
    expect(patchGraphIndexForSave(index, 'sources/web/curlew/snapshot.mhtml', '')).toBeNull()
  })
})
