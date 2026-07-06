/**
 * Pure helpers for the Dev Docs view. No DOM, no Electron — unit-testable
 * and ready to move into a future dev-docs-core kernel (14).
 */

/** Strips one leading frontmatter block (bedrock pages carry JSON inside). */
export function stripFrontmatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

/**
 * Resolves an href relative to the doc it appears in, staying inside the
 * docs bundle. Returns a '/'-separated docs-relative path, or null when the
 * href escapes the bundle root.
 */
export function resolveRelativePath(
  fromRelPath: string,
  href: string
): string | null {
  if (href.length === 0 || href.startsWith('/')) return null
  const baseSegments = fromRelPath.split('/').slice(0, -1)
  const segments = [...baseSegments]
  for (const part of href.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (segments.length === 0) return null
      segments.pop()
      continue
    }
    segments.push(part)
  }
  if (segments.length === 0) return null
  return segments.join('/')
}
