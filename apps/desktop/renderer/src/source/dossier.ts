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
