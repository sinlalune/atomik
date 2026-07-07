import { resolveRelativePath } from '../dev-docs/markdown'

/**
 * Inline vault images into rendered note HTML (owner request: "use that
 * photo in notes"). The sandboxed renderer cannot load files, so every
 * relative <img> whose extension the asset channel serves is swapped for
 * a data URL fetched through `read-source-asset` — same validation, same
 * read-only trust boundary as the image tab. External/data URLs and
 * non-image paths stay untouched.
 */

const INLINABLE = /\.(jpe?g|png|webp|heic|heif)$/i

/** Rendered-src → vault-relative path, for every inlinable image. Pure. */
export function vaultImageSources(
  renderedHtml: string,
  noteRelPath: string
): Map<string, string> {
  const sources = new Map<string, string>()
  for (const match of renderedHtml.matchAll(/<img src="([^"]+)"/g)) {
    const src = match[1]!
    if (/^(data:|https?:|\/)/.test(src)) continue
    if (!INLINABLE.test(src)) continue
    const rel = resolveRelativePath(noteRelPath, decodeURIComponent(src))
    if (rel) sources.set(src, rel)
  }
  return sources
}

/** Applies fetched data URLs; failed fetches keep their original src. */
export function inlineImageSources(
  renderedHtml: string,
  dataUrls: ReadonlyMap<string, string>
): string {
  let html = renderedHtml
  for (const [src, dataUrl] of dataUrls) {
    html = html.replaceAll(`<img src="${src}"`, `<img src="${dataUrl}"`)
  }
  return html
}
