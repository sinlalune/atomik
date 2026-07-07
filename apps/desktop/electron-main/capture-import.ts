import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { assertInsideVault } from './vault'
import { resolveProjectDirPath } from './project'
import type {
  CaptureImportDestination,
  CaptureImportResult,
  CaptureUploadInfo
} from '../shared/ipc-contract'
import type { InboxUpload } from './capture-session'

/**
 * The explicit desktop confirmation (08, S04): one inbox item becomes a
 * capture source bundle inside the OPEN vault, per 07's canonical folder
 * shape — original preserved as evidence, `source.md` the canonical
 * dossier, `index.md` the human directory map. This is the ONLY code path
 * from the capture inbox into the vault, it runs in main on an explicit
 * renderer request, and it never overwrites: every file is written `wx`,
 * and a destination already holding any bundle file is refused before a
 * single byte lands (no partial imports on the happy path; a mid-write
 * race is cleaned up).
 */

const MAX_TITLE_LENGTH = 200

function checkedTitle(title: unknown): string {
  if (typeof title !== 'string') throw new Error('capture-import: rejected title')
  const clean = title.trim()
  if (clean.length === 0 || clean.length > MAX_TITLE_LENGTH) {
    throw new Error('capture-import: rejected title')
  }
  return clean
}

function checkedDestination(destination: unknown): CaptureImportDestination {
  if (typeof destination !== 'object' || destination === null) {
    throw new Error('capture-import: rejected destination')
  }
  const record = destination as Record<string, unknown>
  return {
    relPath: typeof record['relPath'] === 'string' ? record['relPath'] : '',
    title: checkedTitle(record['title'])
  }
}

/** 'image' or 'audio' — labels links and anchors honestly (08). */
function mediaKindOf(info: CaptureUploadInfo): 'image' | 'audio' {
  return info.mimeType.startsWith('audio/') ? 'audio' : 'image'
}

function sourceDossier(
  title: string,
  originalName: string,
  info: CaptureUploadInfo,
  iso: string
): string {
  const day = iso.slice(0, 10)
  const kind = mediaKindOf(info)
  return [
    '---',
    'type: Atomik Source',
    `title: ${title}`,
    'description: Phone capture imported from the atomik capture inbox.',
    `resource: ./${originalName}`,
    'tags: [capture]',
    `timestamp: ${iso}`,
    'atomik:',
    `  id: capture_${day.replaceAll('-', '_')}_${info.id}`,
    '  source_type: capture',
    '  status: captured',
    '  capture:',
    '    method: local-wifi-qr',
    `    mime_type: ${info.mimeType}`,
    `    original_name: ${info.fileName}`,
    `    received_at: ${new Date(info.receivedAtMs).toISOString()}`,
    '---',
    '',
    '# Source dossier',
    '',
    '## Original',
    '',
    `- [Original ${kind}](./${originalName})`,
    '',
    '## Extracted representations',
    '',
    '- None yet — transcription arrives with the adapter (S06).',
    '',
    '## Useful anchors',
    '',
    '| Anchor | Meaning | Target |',
    '|---|---|---|',
    `| \`original-${kind}\` | full original capture | \`./${originalName}\` |`,
    '',
    '## Notes created from this source',
    '',
    '- None yet.',
    ''
  ].join('\n')
}

function bundleIndex(title: string, originalName: string, iso: string): string {
  return [
    '---',
    'type: Atomik Index',
    `title: ${title}`,
    'description: Directory map of this capture source bundle.',
    'tags: [capture]',
    `timestamp: ${iso}`,
    '---',
    '',
    `# ${title}`,
    '',
    '- [source.md](./source.md) — the canonical source dossier.',
    `- [${originalName}](./${originalName}) — the preserved original (evidence).`,
    ''
  ].join('\n')
}


export function importCaptureUpload(
  vaultRoot: string,
  destination: unknown,
  upload: InboxUpload,
  now: () => number = Date.now
): CaptureImportResult {
  const { relPath, title } = checkedDestination(destination)
  const absDir = resolveProjectDirPath(vaultRoot, relPath)
  if (!absDir) throw new Error('capture-import: rejected destination path')

  const originalName = `original${extname(upload.filePath).toLowerCase()}`
  const targets = [originalName, 'source.md', 'index.md']
  if (targets.some((name) => existsSync(join(absDir, name)))) {
    throw new Error(
      `capture-import: destination already holds a bundle file — ${relPath}`
    )
  }

  // Read the original BEFORE touching the vault: a vanished inbox file
  // (double import race) must fail without side effects.
  const bytes = readFileSync(upload.filePath)

  mkdirSync(absDir, { recursive: true })
  assertInsideVault(vaultRoot, absDir)

  const iso = new Date(now()).toISOString()
  const written: string[] = []
  try {
    for (const [name, content] of [
      [originalName, bytes],
      ['source.md', sourceDossier(title, originalName, upload.info, iso)],
      ['index.md', bundleIndex(title, originalName, iso)]
    ] as Array<[string, string | Buffer]>) {
      writeFileSync(join(absDir, name), content, { flag: 'wx' })
      written.push(name)
    }
  } catch (error) {
    for (const name of written) rmSync(join(absDir, name), { force: true })
    throw error
  }

  const dossierPath = `${relPath.replace(/\/+$/, '')}/source.md`
  return { dossierPath }
}
