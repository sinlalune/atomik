import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, isAbsolute, join, normalize, relative, resolve } from 'node:path'
import { assertInsideVault } from './vault'
import type { ProjectInfo } from '../shared/ipc-contract'

/**
 * Project bundles (04) — the incubating project-core kernel (14): manifest,
 * index.md/log.md conventions, membership later. A project is a vault
 * folder holding `project.atomik-project.json`; index.md and log.md carry
 * the knowledge, the manifest binds the folder for fast app loading.
 *
 * createProject is an idempotent ENSURE: it creates only the missing
 * pieces (manifest, index.md, log.md) with exclusive writes and never
 * touches existing files — adopting a folder that already has content is
 * always safe.
 */

export const PROJECT_MANIFEST = 'project.atomik-project.json'
export const OKF_PROFILE = 'atomik-okf-v0.1'

const DENIED_SEGMENTS = new Set(['.git', '.atomik', 'node_modules'])
const MAX_PATH_LENGTH = 500
const MAX_TITLE_LENGTH = 200
const MAX_SCAN_DEPTH = 12

/** Folder-path variant of the note validator: relative, visible segments
 *  only, never the vault root itself. */
export function resolveProjectDirPath(
  vaultRoot: string,
  relPath: unknown
): string | null {
  if (typeof relPath !== 'string') return null
  if (relPath.length === 0 || relPath.length > MAX_PATH_LENGTH) return null
  if (relPath.includes('\\') || relPath.includes('\0')) return null
  if (isAbsolute(relPath)) return null
  const segments = relPath.split('/')
  const denied = segments.some(
    (segment) =>
      DENIED_SEGMENTS.has(segment) ||
      (segment.startsWith('.') && segment !== '.')
  )
  if (denied) return null
  const abs = resolve(vaultRoot, normalize(relPath))
  const rel = relative(vaultRoot, abs)
  if (rel.length === 0 || rel.startsWith('..') || isAbsolute(rel)) return null
  return abs
}

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug.length > 0 ? slug : 'project'
}

type ManifestSummary = { id: string | null; title: string | null }

function parseManifest(absManifest: string): ManifestSummary {
  try {
    const parsed: unknown = JSON.parse(readFileSync(absManifest, 'utf8'))
    if (typeof parsed !== 'object' || parsed === null) {
      return { id: null, title: null }
    }
    const record = parsed as Record<string, unknown>
    return {
      id: typeof record['id'] === 'string' ? record['id'] : null,
      title: typeof record['title'] === 'string' ? record['title'] : null
    }
  } catch {
    return { id: null, title: null }
  }
}

function projectInfo(vaultRelPath: string, absDir: string): ProjectInfo {
  const summary = parseManifest(join(absDir, PROJECT_MANIFEST))
  const fallback = basename(absDir)
  return {
    relPath: vaultRelPath,
    id: summary.id ?? `project_${slugify(fallback)}`,
    title: summary.title ?? fallback
  }
}

/** Manifest-detected bundles. Projects do not nest: the scan does not
 *  descend into a found project. */
export function listProjects(vaultRoot: string): ProjectInfo[] {
  const found: ProjectInfo[] = []
  const walk = (dir: string, relPath: string, depth: number): void => {
    if (depth > MAX_SCAN_DEPTH) return
    if (existsSync(join(dir, PROJECT_MANIFEST))) {
      found.push(projectInfo(relPath, dir))
      return
    }
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.') || DENIED_SEGMENTS.has(entry.name)) continue
      walk(
        join(dir, entry.name),
        relPath === '' ? entry.name : `${relPath}/${entry.name}`,
        depth + 1
      )
    }
  }
  // the vault root itself is never a project; scan its children
  const rootEntries = readdirSync(vaultRoot, { withFileTypes: true }).sort(
    (a, b) => a.name.localeCompare(b.name)
  )
  for (const entry of rootEntries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('.') || DENIED_SEGMENTS.has(entry.name)) continue
    walk(join(vaultRoot, entry.name), entry.name, 1)
  }
  return found
}

function checkedTitle(title: unknown): string {
  if (typeof title !== 'string') throw new Error('project: rejected title')
  const trimmed = title.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_TITLE_LENGTH) {
    throw new Error('project: rejected title')
  }
  return trimmed
}

/** Exclusive-create a file only when absent; existing content is sacred. */
function ensureFile(abs: string, content: string): void {
  if (existsSync(abs)) return
  writeFileSync(abs, content, { encoding: 'utf8', flag: 'wx' })
}

export function createProject(
  vaultRoot: string,
  relPath: unknown,
  title: unknown
): ProjectInfo {
  const absDir = resolveProjectDirPath(vaultRoot, relPath)
  if (!absDir) throw new Error('project: rejected path')
  const cleanTitle = checkedTitle(title)

  mkdirSync(absDir, { recursive: true })
  assertInsideVault(vaultRoot, absDir)

  const now = new Date()
  const iso = now.toISOString()
  const day = iso.slice(0, 10)

  ensureFile(
    join(absDir, PROJECT_MANIFEST),
    `${JSON.stringify(
      {
        id: `project_${slugify(cleanTitle)}`,
        type: 'atomik-project',
        title: cleanTitle,
        createdAt: iso,
        resources: [],
        pinned: [],
        okf: { compatible: true, profile: OKF_PROFILE }
      },
      null,
      2
    )}\n`
  )

  ensureFile(
    join(absDir, 'index.md'),
    [
      '---',
      'type: Atomik Project',
      `title: ${cleanTitle}`,
      'description: ',
      'tags: []',
      `timestamp: ${iso}`,
      '---',
      '',
      `# ${cleanTitle}`,
      '',
      '## What is inside',
      '',
      '- [log.md](./log.md) — chronological history of this project.',
      ''
    ].join('\n')
  )

  ensureFile(
    join(absDir, 'log.md'),
    [
      `# Log — ${cleanTitle}`,
      '',
      `## ${day}`,
      '',
      '- Project bundle created in atomik.',
      ''
    ].join('\n')
  )

  return projectInfo(relative(vaultRoot, absDir).split('\\').join('/'), absDir)
}
