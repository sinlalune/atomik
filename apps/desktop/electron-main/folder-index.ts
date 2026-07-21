/* Deterministic folder index/log maintenance (CP-MVP-007 S07k — owner
 * decisions 2026-07-21, revising the 07-16 "option D" scoping): the
 * convention is now FULL — every folder carries index.md AND log.md,
 * the vault ROOT gets both at ADOPTION (the explicit openVault
 * dialog), and the file-management verbs keep the PARENT folder's
 * index Contents block and log current. The sync lives in MAIN, at
 * the verb level, so every caller — tree UI today, AI file management
 * later — produces the same bookkeeping.
 *
 * The Contents block lives between HTML-comment markers; everything
 * outside them is the owner's text and is NEVER touched. An index
 * without markers adopts them on the next operation (the operation is
 * explicit; nothing runs on open). Index rewrites are byte-compared —
 * an unchanged block writes nothing (27: no cosmetic bytes). Sync
 * writes are bookkeeping OF an operation, not operations themselves:
 * they never trigger further sync, and a failure surfaces loudly with
 * the operation already landed ("done; sync failed" is truthful —
 * silent bookkeeping loss is not).
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { basename, join, resolve, sep } from 'node:path'

export const CONTENTS_BEGIN = '<!-- atomik:contents -->'
export const CONTENTS_END = '<!-- atomik:end-contents -->'

const SKIP_SEGMENTS = new Set(['.git', '.atomik', 'node_modules'])
const CONVENTION_FILES = new Set(['index.md', 'log.md'])

export type FolderEntry =
  | { kind: 'folder'; name: string; hasIndex: boolean }
  | { kind: 'bundle'; name: string }
  | { kind: 'note'; name: string }

const byName = (a: { name: string }, b: { name: string }): number =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })

/** Direct children of a folder as convention entries: subfolders (a
 * folder directly containing source.md is a BUNDLE — one unit, S01
 * pin), then notes. The folder's own convention files, dotted names,
 * denied segments, and non-markdown files stay out. */
export function readFolderEntries(folderAbs: string): FolderEntry[] {
  const folders: FolderEntry[] = []
  const notes: FolderEntry[] = []
  for (const entry of readdirSync(folderAbs, { withFileTypes: true })) {
    const name = entry.name
    if (name.startsWith('.') || SKIP_SEGMENTS.has(name)) continue
    if (entry.isDirectory()) {
      folders.push(
        existsSync(join(folderAbs, name, 'source.md'))
          ? { kind: 'bundle', name }
          : {
              kind: 'folder',
              name,
              hasIndex: existsSync(join(folderAbs, name, 'index.md'))
            }
      )
    } else if (
      entry.isFile() &&
      name.endsWith('.md') &&
      !CONVENTION_FILES.has(name)
    ) {
      notes.push({ kind: 'note', name })
    }
  }
  folders.sort(byName)
  notes.sort(byName)
  return [...folders, ...notes]
}

/** The managed block, markers included. Pure. */
export function contentsBlock(entries: FolderEntry[]): string {
  const lines = entries.map((entry) => {
    if (entry.kind === 'bundle') {
      return `- [${entry.name}/](./${entry.name}/source.md) — source bundle`
    }
    if (entry.kind === 'folder') {
      return entry.hasIndex
        ? `- [${entry.name}/](./${entry.name}/index.md)`
        : `- ${entry.name}/`
    }
    return `- [${entry.name.slice(0, -3)}](./${entry.name})`
  })
  return [
    CONTENTS_BEGIN,
    '## Contents',
    '',
    ...(lines.length > 0 ? lines : ['*(empty)*']),
    CONTENTS_END
  ].join('\n')
}

/** Replace the marked block, or append it once when absent (adoption —
 * the enclosing operation is explicit). Pure. */
export function withContentsBlock(content: string, block: string): string {
  const begin = content.indexOf(CONTENTS_BEGIN)
  const end = content.indexOf(CONTENTS_END)
  if (begin !== -1 && end !== -1 && end >= begin) {
    return (
      content.slice(0, begin) + block + content.slice(end + CONTENTS_END.length)
    )
  }
  const base = content.endsWith('\n') ? content : `${content}\n`
  return `${base}\n${block}\n`
}

const yamlQuote = (value: string): string =>
  `'${value.replace(/'/g, "''")}'`

export function folderIndexSkeleton(
  title: string,
  iso: string,
  kind: 'folder' | 'vault'
): string {
  return [
    '---',
    `type: ${kind === 'vault' ? 'Atomik Vault Index' : 'Atomik Folder Index'}`,
    `title: ${yamlQuote(title)}`,
    'description: ',
    'tags: []',
    `timestamp: ${iso}`,
    '---',
    '',
    `# ${title}`,
    ''
  ].join('\n')
}

export function folderLogSkeleton(
  title: string,
  iso: string,
  kind: 'folder' | 'vault'
): string {
  return [
    '---',
    `type: ${kind === 'vault' ? 'Atomik Vault Log' : 'Atomik Folder Log'}`,
    `title: ${yamlQuote(`${title} — log`)}`,
    `timestamp: ${iso}`,
    '---',
    '',
    `# ${title} — log`,
    '',
    ''
  ].join('\n')
}

export const logLine = (iso: string, text: string): string =>
  `- ${iso.slice(0, 10)} ${iso.slice(11, 16)} — ${text}`

/** Parent of a vault-relative posix path ('' = the vault root). */
export const parentRelOf = (relPath: string): string =>
  relPath.includes('/') ? relPath.slice(0, relPath.lastIndexOf('/')) : ''

/* Callers hand over rels derived from paths their own gates already
 * validated; this containment check is defensive only (and local, so
 * this module imports nothing from vault.ts — no import cycle). */
function folderAbsOf(vaultRoot: string, folderRel: string): string {
  const abs = resolve(folderRel === '' ? vaultRoot : join(vaultRoot, folderRel))
  const root = resolve(vaultRoot)
  if (abs !== root && !abs.startsWith(root + sep)) {
    throw new Error('folder-index: folder escapes the vault')
  }
  return abs
}

/** Rewrite (or adopt) the folder's index Contents block from the
 * directory as it IS. Unchanged bytes write nothing. */
export function updateFolderIndex(vaultRoot: string, folderRel: string): void {
  const folderAbs = folderAbsOf(vaultRoot, folderRel)
  if (!existsSync(folderAbs) || !statSync(folderAbs).isDirectory()) return
  const indexAbs = join(folderAbs, 'index.md')
  const block = contentsBlock(readFolderEntries(folderAbs))
  const iso = new Date().toISOString()
  const kind = folderRel === '' ? 'vault' : 'folder'
  const title = kind === 'vault' ? basename(vaultRoot) : basename(folderAbs)
  if (!existsSync(indexAbs)) {
    writeFileSync(
      indexAbs,
      withContentsBlock(folderIndexSkeleton(title, iso, kind), block),
      { encoding: 'utf8', flag: 'wx' }
    )
    return
  }
  const before = readFileSync(indexAbs, 'utf8')
  const after = withContentsBlock(before, block)
  if (after !== before) writeFileSync(indexAbs, after, 'utf8')
}

/** Append one dated line to the folder's log.md, creating it (with its
 * skeleton) on first use. */
export function appendFolderLog(
  vaultRoot: string,
  folderRel: string,
  text: string
): void {
  const folderAbs = folderAbsOf(vaultRoot, folderRel)
  if (!existsSync(folderAbs) || !statSync(folderAbs).isDirectory()) return
  const logAbs = join(folderAbs, 'log.md')
  const iso = new Date().toISOString()
  const kind = folderRel === '' ? 'vault' : 'folder'
  const title = kind === 'vault' ? basename(vaultRoot) : basename(folderAbs)
  const line = `${logLine(iso, text)}\n`
  if (!existsSync(logAbs)) {
    writeFileSync(logAbs, `${folderLogSkeleton(title, iso, kind)}${line}`, {
      encoding: 'utf8',
      flag: 'wx'
    })
    return
  }
  const before = readFileSync(logAbs, 'utf8')
  const base = before.endsWith('\n') ? before : `${before}\n`
  writeFileSync(logAbs, `${base}${line}`, 'utf8')
}

/** One operation's bookkeeping: every named parent folder gets its
 * index re-derived once, and each entry appends its log line. */
export function recordFileOp(
  vaultRoot: string,
  entries: Array<{ folderRel: string; text: string }>
): void {
  const seen = new Set<string>()
  for (const entry of entries) {
    if (!seen.has(entry.folderRel)) {
      seen.add(entry.folderRel)
      updateFolderIndex(vaultRoot, entry.folderRel)
    }
    appendFolderLog(vaultRoot, entry.folderRel, entry.text)
  }
}

/** Vault adoption (the explicit openVault dialog, S07k): seed root
 * index.md + log.md when absent; an adopted vault is never rewritten
 * on later opens. */
export function adoptVaultRoot(vaultRoot: string): void {
  const indexAbs = join(vaultRoot, 'index.md')
  const logAbs = join(vaultRoot, 'log.md')
  if (!existsSync(indexAbs)) {
    updateFolderIndex(vaultRoot, '')
    appendFolderLog(vaultRoot, '', 'vault adopted (index/log seeded)')
    return
  }
  if (!existsSync(logAbs)) {
    appendFolderLog(vaultRoot, '', 'vault log seeded (index already present)')
  }
}
