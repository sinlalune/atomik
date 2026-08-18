/** Clipboard with the Electron-renderer fallback (S04l/S05c): the
 *  async API can reject silently; execCommand still works. Returns
 *  whether the text made it.
 *
 *  `doc` lets renderer surfaces that own a document — the rich-markdown
 *  adapters — share THIS implementation. CP-RICH-MARKDOWN S07 owner bench:
 *  the code frame shipped its own copy that fell back only when the async
 *  API was absent, not when it rejected, so every Copy said "Copy failed".
 *  One clipboard, one fallback. */
export async function copyText(
  text: string,
  doc: Document = document
): Promise<boolean> {
  const clipboard = doc.defaultView?.navigator?.clipboard
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text)
      return true
    } catch {
      /* fall through */
    }
  }
  try {
    const area = doc.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    const parent = doc.body ?? doc.documentElement
    parent.appendChild(area)
    area.select?.()
    const ok = doc.execCommand?.('copy') ?? false
    area.remove()
    return ok
  } catch {
    return false
  }
}
