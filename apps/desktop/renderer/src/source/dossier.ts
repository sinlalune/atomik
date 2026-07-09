/** Pure dossier introspection (07 shapes), shared by views and tests. */

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i

/** The dossier names its original via frontmatter `resource: ./x`. */
export function resourceOf(dossierContent: string): string | null {
  const fence = /^---\n([\s\S]*?)\n---/.exec(dossierContent)
  if (!fence) return null
  const line = /^resource:\s*(.+)\s*$/m.exec(fence[1]!)
  return line ? line[1]!.trim() : null
}

/** True when a note declares an image original — i.e. the image source
 *  tab has something to show for it. */
export function hasImageResource(dossierContent: string): boolean {
  const resource = resourceOf(dossierContent)
  return resource !== null && IMAGE_EXTENSIONS.test(resource)
}

const AUDIO_EXTENSIONS = /\.(m4a|webm|ogg|mp3|wav)$/i

/** Image OR audio original (S08): anything the source tab can present. */
export function hasMediaResource(dossierContent: string): boolean {
  const resource = resourceOf(dossierContent)
  return (
    resource !== null &&
    (IMAGE_EXTENSIONS.test(resource) || AUDIO_EXTENSIONS.test(resource))
  )
}

export type Rotation = 0 | 90 | 180 | 270

/**
 * Display rotation recorded in the dossier (owner correction: some phone
 * photos arrive sideways). The ORIGINAL bytes are evidence (07/08) and
 * are never rewritten — rotation is metadata every viewer applies.
 */
export function rotationOf(dossierContent: string): Rotation {
  const fence = /^---\n([\s\S]*?)\n---/.exec(dossierContent)
  if (!fence) return 0
  const line = /^\s*rotation:\s*(\d+)\s*$/m.exec(fence[1]!)
  const value = line ? Number(line[1]) : 0
  return value === 90 || value === 180 || value === 270 ? value : 0
}

/** The dossier with its rotation set: replaces the existing line, or
 *  seats a new one under `capture:` (the block the import authored). */
export function withDossierRotation(
  dossierContent: string,
  rotation: Rotation
): string {
  const fence = /^---\n([\s\S]*?)\n---/.exec(dossierContent)
  if (!fence) return dossierContent
  const frontmatter = fence[1]!
  let next: string
  if (/^\s*rotation:\s*\d+\s*$/m.test(frontmatter)) {
    next = frontmatter.replace(
      /^(\s*)rotation:\s*\d+\s*$/m,
      (_match, indent: string) => `${indent}rotation: ${rotation}`
    )
  } else if (/^ {2}capture:\s*$/m.test(frontmatter)) {
    next = frontmatter.replace(
      /^( {2}capture:\s*)$/m,
      (match) => `${match}\n    rotation: ${rotation}`
    )
  } else {
    next = `${frontmatter}\nrotation: ${rotation}`
  }
  return dossierContent.replace(fence[0], () => `---\n${next}\n---`)
}

export type PageAnchor = { anchor: string; meaning: string; page: number }

/** The dossier's recorded page anchors (S06c) — every Useful-anchors
 *  row whose target carries #page=N, whatever the target's format. */
export function pageAnchorsOf(dossierContent: string): PageAnchor[] {
  const anchors: PageAnchor[] = []
  const row = /^\| `([^`]+)` \| ([^|]+) \| [^|]*#page=(\d+)[^|]* \|$/gm
  for (const match of dossierContent.matchAll(row)) {
    anchors.push({
      anchor: match[1]!,
      meaning: match[2]!.trim(),
      page: Number(match[3])
    })
  }
  return anchors
}

/**
 * A page anchor added to the dossier's "Useful anchors" table (S06):
 * a durable, clickable citation to a page — the link the return path
 * consumes. Idempotent per page; pure. Returns the content unchanged
 * when the table is absent (a hand-emptied dossier is not our concern).
 */
export function withPageAnchor(dossierContent: string, page: number): string {
  // the Target is a REAL markdown link — the citation must be clickable
  const row = `| \`p${page}\` | page ${page} | [page ${page}](./original.pdf#page=${page}) |`
  if (dossierContent.includes(`#page=${page})`)) return dossierContent
  const header = /^\| Anchor \| Meaning \| Target \|\n\|[-| ]+\|\n/m.exec(dossierContent)
  if (!header) return dossierContent
  const insertAt = header.index + header[0].length
  return `${dossierContent.slice(0, insertAt)}${row}\n${dossierContent.slice(insertAt)}`
}
