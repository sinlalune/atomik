import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { assertInsideVault } from './vault'
import { isAllowedWebUrl } from './web-view'
import type { CaptureImportResult } from '../shared/ipc-contract'

/**
 * Web page as a source (CP-MVP-006 S04, bedrock 09): the EXPLICIT
 * Import-as-source action — never automatic — lands a bundle under
 * `sources/web/<slug>/`: `snapshot.mhtml` (the page as rendered,
 * sha256-recorded evidence; the S02 format decision), `source.md` the
 * canonical dossier carrying the 09 evidence metadata, `index.md` the
 * human map. Same discipline as pdf/capture import: every string that
 * originates in the PAGE is hostile until sanitized (frontmatter and
 * markdown-table injection die here), every file written `wx`, a
 * partial bundle is cleaned up, never an overwrite.
 */

/** Page-controlled metadata, probed read-only at import. ALL fields
 *  untrusted — they cross the sanitizers below before touching a file. */
export type WebPageMeta = {
  canonical?: string | null
  author?: string | null
  publisher?: string | null
  published?: string | null
  modified?: string | null
  description?: string | null
}

/** Writes the MHTML snapshot to an absolute path (savePage in prod,
 *  fakes in tests). */
export type SnapshotSaver = (absPath: string) => Promise<void>

/** Hostile text → one clean line: whitespace collapsed, control chars
 *  gone, the markdown-table and inline-code metacharacters stripped,
 *  length capped. Null when nothing survives. */
export function cleanMetaText(raw: unknown, cap = 240): string | null {
  if (typeof raw !== 'string') return null
  const line = raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[|`]/g, '')
    .trim()
  return line.length > 0 ? line.slice(0, cap).trim() : null
}

/** Title → bundle slug (the pdfSlug rules); empty titles fall back to
 *  the URL's host+path, then to a plain constant. */
export function webSlug(title: string, url: string): string {
  const slugify = (text: string): string =>
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/, '')
  const fromTitle = slugify(title)
  if (fromTitle.length > 0) return fromTitle
  try {
    const parsed = new URL(url)
    const fromUrl = slugify(`${parsed.hostname} ${parsed.pathname}`.slice(0, 80))
    if (fromUrl.length > 0) return fromUrl
  } catch {
    /* fall through */
  }
  return 'web-page'
}

const yamlQuote = (text: string): string =>
  `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

function webDossier(
  title: string,
  url: string,
  meta: { canonical: string | null; author: string | null; publisher: string | null; published: string | null; modified: string | null; description: string | null },
  sha256: string,
  sizeBytes: number,
  iso: string
): string {
  const host = new URL(url).hostname
  const row = (value: string | null): string => value ?? '—'
  return [
    '---',
    'type: Atomik Source',
    `title: ${yamlQuote(title)}`,
    `description: Web source imported from ${host}; the snapshot is the evidence.`,
    `resource: ${url}`,
    'tags: [web, source]',
    `timestamp: ${iso}`,
    'atomik:',
    `  id: source_web_${iso.slice(0, 10).replaceAll('-', '_')}_${sha256.slice(0, 8)}`,
    '  source_type: web',
    '  status: imported',
    `  original_url: ${url}`,
    ...(meta.canonical && meta.canonical !== url ? [`  canonical_url: ${meta.canonical}`] : []),
    `  accessed_at: ${iso}`,
    '  snapshot: ./snapshot.mhtml',
    `  snapshot_sha256: ${sha256}`,
    `  snapshot_bytes: ${sizeBytes}`,
    '---',
    '',
    '# Source dossier',
    '',
    '## Original',
    '',
    `- [Original URL](${url}) — accessed ${iso.slice(0, 10)}`,
    '- [Local snapshot](./snapshot.mhtml) — the page as rendered at import.',
    '',
    '## Web evidence',
    '',
    '| field | value |',
    '|---|---|',
    `| canonical | ${row(meta.canonical)} |`,
    `| author | ${row(meta.author)} |`,
    `| publisher | ${row(meta.publisher)} |`,
    `| published | ${row(meta.published)} |`,
    `| updated | ${row(meta.modified)} |`,
    '| license | not reviewed — record it here when known |',
    '',
    ...(meta.description ? ['## Page description', '', `> ${meta.description}`, ''] : []),
    '## Extracted representations',
    '',
    '- None yet — reader extraction arrives with the web pipeline (S05).',
    '',
    '## Useful anchors',
    '',
    '| Anchor | Meaning | Target |',
    '|---|---|---|',
    `| \`original-url\` | the live page | ${url} |`,
    '',
    '## Notes created from this source',
    '',
    '- None yet.',
    ''
  ].join('\n')
}

function webIndex(title: string, iso: string): string {
  return [
    '---',
    'type: Atomik Index',
    `title: ${yamlQuote(title)}`,
    'description: Directory map of this web source bundle.',
    'tags: [web]',
    `timestamp: ${iso}`,
    '---',
    '',
    `# ${title}`,
    '',
    '- [source.md](./source.md) — the canonical source dossier.',
    '- [snapshot.mhtml](./snapshot.mhtml) — the page as rendered at import (evidence).',
    ''
  ].join('\n')
}

export async function importWebSource(
  vaultRoot: string,
  input: { url: string; title: unknown; meta?: Partial<WebPageMeta> | null },
  saveSnapshot: SnapshotSaver,
  now: () => number = Date.now
): Promise<CaptureImportResult> {
  // a real web page only — about:blank and non-http(s) have no source value
  if (!isAllowedWebUrl(input.url) || !/^https?:/i.test(input.url)) {
    throw new Error('web-import: not a web page — open one first')
  }
  const url = input.url
  const title = cleanMetaText(input.title, 160) ?? new URL(url).hostname
  const meta = {
    canonical:
      typeof input.meta?.canonical === 'string' &&
      isAllowedWebUrl(input.meta.canonical) &&
      /^https?:/i.test(input.meta.canonical)
        ? input.meta.canonical.slice(0, 2000)
        : null,
    author: cleanMetaText(input.meta?.author, 120),
    publisher: cleanMetaText(input.meta?.publisher, 120),
    published: cleanMetaText(input.meta?.published, 60),
    modified: cleanMetaText(input.meta?.modified, 60),
    description: cleanMetaText(input.meta?.description, 300)
  }

  const slugBase = webSlug(title, url)
  let slug = slugBase
  for (let n = 2; existsSync(join(vaultRoot, 'sources', 'web', slug)); n++) {
    slug = `${slugBase}-${n}`
    if (n > 99) throw new Error('web-import: could not find a free bundle name')
  }
  const relDir = `sources/web/${slug}`
  const absDir = join(vaultRoot, 'sources', 'web', slug)
  mkdirSync(absDir, { recursive: true })
  assertInsideVault(vaultRoot, absDir)

  const snapshotAbs = join(absDir, 'snapshot.mhtml')
  try {
    await saveSnapshot(snapshotAbs)
  } catch (error) {
    rmSync(absDir, { recursive: true, force: true })
    throw error
  }
  if (!existsSync(snapshotAbs) || readFileSync(snapshotAbs).length === 0) {
    rmSync(absDir, { recursive: true, force: true })
    throw new Error('web-import: snapshot came out empty')
  }

  const bytes = readFileSync(snapshotAbs)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const iso = new Date(now()).toISOString()
  const written: string[] = []
  try {
    for (const [name, content] of [
      ['source.md', webDossier(title, url, meta, sha256, bytes.length, iso)],
      ['index.md', webIndex(title, iso)]
    ] as Array<[string, string]>) {
      writeFileSync(join(absDir, name), content, { flag: 'wx' })
      written.push(name)
    }
  } catch (error) {
    for (const name of written) rmSync(join(absDir, name), { force: true })
    rmSync(snapshotAbs, { force: true })
    throw error
  }

  return { dossierPath: `${relDir}/source.md` }
}
