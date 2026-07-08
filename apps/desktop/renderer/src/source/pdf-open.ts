/**
 * Citation return (CP-MVP-003 S06): a link to `…/original.pdf#page=N`
 * — from the dossier's own anchor table OR a knowledge note — opens the
 * PDF dossier at page N. The page can't ride the generic openNote call,
 * so it waits in this tiny registry keyed by the dossier's rel path;
 * the PDF view takes it on mount and clears it (a jump, not a mode).
 */

const pending = new Map<string, number>()

export function setPendingPdfPage(dossierRel: string, page: number): void {
  if (page >= 1) pending.set(dossierRel, page)
}

export function takePendingPdfPage(dossierRel: string): number | null {
  const page = pending.get(dossierRel)
  if (page === undefined) return null
  pending.delete(dossierRel)
  return page
}

/** Parse `…/original.pdf#page=N` → { dossierRel: sibling source.md, page }.
 *  `pathPart`/`hash` are already resolved to a vault-relative pdf path. */
export function pdfPageTarget(
  resolvedPdfRel: string,
  hash: string
): { dossierRel: string; page: number } | null {
  if (!resolvedPdfRel.toLowerCase().endsWith('.pdf')) return null
  const match = /(?:^|[#&])page=(\d+)/.exec(hash)
  if (!match) return null
  const page = Number(match[1])
  if (!Number.isInteger(page) || page < 1) return null
  const dossierRel = resolvedPdfRel.replace(/[^/]+\.pdf$/i, 'source.md')
  return { dossierRel, page }
}
