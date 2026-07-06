import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  PROJECT_MANIFEST,
  createProject,
  listProjects,
  resolveProjectDirPath,
  slugify
} from '../electron-main/project'

let vault: string

beforeAll(() => {
  vault = mkdtempSync(join(tmpdir(), 'atomik-project-'))
  // a pre-existing bundle with a manifest
  mkdirSync(join(vault, 'projects', 'existing'), { recursive: true })
  writeFileSync(
    join(vault, 'projects', 'existing', PROJECT_MANIFEST),
    JSON.stringify({ id: 'project_existing', type: 'atomik-project', title: 'Existing' })
  )
  // a nested folder inside it (scan must NOT descend into a project)
  mkdirSync(join(vault, 'projects', 'existing', 'sub'), { recursive: true })
  writeFileSync(
    join(vault, 'projects', 'existing', 'sub', PROJECT_MANIFEST),
    JSON.stringify({ id: 'project_nested', title: 'Nested' })
  )
  // a malformed manifest: listed with fallback title
  mkdirSync(join(vault, 'broken'), { recursive: true })
  writeFileSync(join(vault, 'broken', PROJECT_MANIFEST), '{ not json')
  // denied areas are never scanned
  mkdirSync(join(vault, '.git', 'inside'), { recursive: true })
  writeFileSync(join(vault, '.git', 'inside', PROJECT_MANIFEST), '{}')
  // a folder the adoption test will claim, already holding knowledge
  mkdirSync(join(vault, 'atomik-plane'), { recursive: true })
  writeFileSync(join(vault, 'atomik-plane', 'index.md'), '# Pre-existing index\n')
})

afterAll(() => {
  rmSync(vault, { recursive: true, force: true })
})

const ROOT = resolve('/some/vault')

describe('resolveProjectDirPath', () => {
  it('accepts vault-relative folders and rejects the root itself', () => {
    expect(resolveProjectDirPath(ROOT, 'projects/demo')).toBe(
      resolve(ROOT, 'projects', 'demo')
    )
    expect(resolveProjectDirPath(ROOT, '.')).toBeNull()
    expect(resolveProjectDirPath(ROOT, '')).toBeNull()
  })

  it('rejects traversal, absolutes, and hidden/denied segments', () => {
    expect(resolveProjectDirPath(ROOT, '../outside')).toBeNull()
    expect(resolveProjectDirPath(ROOT, '/abs')).toBeNull()
    expect(resolveProjectDirPath(ROOT, '.git/x')).toBeNull()
    expect(resolveProjectDirPath(ROOT, 'a/.hidden/b')).toBeNull()
    expect(resolveProjectDirPath(ROOT, 42)).toBeNull()
  })
})

describe('slugify', () => {
  it('produces filesystem-friendly ids', () => {
    expect(slugify('AI Formation')).toBe('ai-formation')
    expect(slugify('Économie & société!')).toBe('economie-societe')
    expect(slugify('***')).toBe('project')
  })
})

describe('listProjects', () => {
  it('finds manifest bundles, skips denied dirs, does not descend into projects', () => {
    const projects = listProjects(vault)
    const paths = projects.map((project) => project.relPath)
    expect(paths).toContain('projects/existing')
    expect(paths).not.toContain('projects/existing/sub')
    expect(paths.some((path) => path.startsWith('.git'))).toBe(false)
  })

  it('falls back to the folder name on malformed manifests', () => {
    const broken = listProjects(vault).find((p) => p.relPath === 'broken')
    expect(broken?.title).toBe('broken')
    expect(broken?.id).toBe('project_broken')
  })
})

describe('createProject (idempotent ensure)', () => {
  it('creates manifest, index.md, and log.md for a fresh bundle', () => {
    const info = createProject(vault, 'projects/demo', 'Demo Project')
    expect(info).toEqual({
      relPath: 'projects/demo',
      id: 'project_demo-project',
      title: 'Demo Project'
    })
    const manifest = JSON.parse(
      readFileSync(join(vault, 'projects/demo', PROJECT_MANIFEST), 'utf8')
    ) as Record<string, unknown>
    expect(manifest['type']).toBe('atomik-project')
    expect(manifest['okf']).toEqual({ compatible: true, profile: 'atomik-okf-v0.1' })
    expect(typeof manifest['createdAt']).toBe('string')

    const index = readFileSync(join(vault, 'projects/demo', 'index.md'), 'utf8')
    expect(index).toContain('type: Atomik Project')
    expect(index).toContain('# Demo Project')

    const log = readFileSync(join(vault, 'projects/demo', 'log.md'), 'utf8')
    expect(log).toContain('# Log — Demo Project')
    expect(log).toContain('- Project bundle created in atomik.')
  })

  it('adopts an existing folder without touching existing files', () => {
    const before = readFileSync(join(vault, 'atomik-plane', 'index.md'), 'utf8')
    const info = createProject(vault, 'atomik-plane', 'Atomik Plane')
    expect(info.title).toBe('Atomik Plane')
    // pre-existing knowledge byte-identical
    expect(readFileSync(join(vault, 'atomik-plane', 'index.md'), 'utf8')).toBe(before)
    // missing pieces created
    expect(readFileSync(join(vault, 'atomik-plane', 'log.md'), 'utf8')).toContain(
      '# Log — Atomik Plane'
    )
  })

  it('is idempotent: a second call changes nothing', () => {
    const manifestPath = join(vault, 'projects/demo', PROJECT_MANIFEST)
    const before = readFileSync(manifestPath, 'utf8')
    const info = createProject(vault, 'projects/demo', 'Renamed Attempt')
    // existing manifest wins; nothing rewritten
    expect(readFileSync(manifestPath, 'utf8')).toBe(before)
    expect(info.title).toBe('Demo Project')
  })

  it('rejects bad paths and titles', () => {
    expect(() => createProject(vault, '../escape', 'X')).toThrow()
    expect(() => createProject(vault, 'projects/ok', '')).toThrow()
    expect(() => createProject(vault, 'projects/ok', '  ')).toThrow()
    expect(() => createProject(vault, 'projects/ok', 'x'.repeat(300))).toThrow()
  })
})
