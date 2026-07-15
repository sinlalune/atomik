import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { WebEvidenceProvenance } from '../shared/ipc-contract'

/**
 * URL provenance for web-reader selections (09 "create note with
 * URL/provenance"; 28 §Evidence record — the externalUrl/sourceDossierPath/
 * accessedAt slice of the sketch). A selection made in
 * `sources/web/<slug>/reader.md` traces back to the sibling dossier; the
 * dossier's identity fields ride the EvidenceRecord so a note built from
 * the selection can cite the live page, not just a vault path.
 *
 * Resolution is CALLER-side (index.ts): truth.ts and ai-mock.ts stay pure
 * compute — they receive the resolved map as data and never touch the
 * filesystem.
 */

/** Strict shape: one dot-free slug segment, reader.md only — a matching
 *  path can never leave sources/web/. */
const WEB_READER_RELPATH = /^sources\/web\/([^/.][^/]*)\/reader\.md$/

/** Inverse of web-import's yamlQuote (titles are always double-quoted). */
function yamlUnquote(value: string): string {
  const fenced = /^"([\s\S]*)"$/.exec(value.trim())
  if (!fenced) return value.trim()
  return fenced[1]!.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
}

/** Pure: dossier frontmatter → provenance fields. Null when the dossier
 *  declares no original_url (not a web dossier / corrupted — no guessing). */
export function webProvenanceFromDossier(
  dossierContent: string,
  dossierRelPath: string
): WebEvidenceProvenance | null {
  const urlMatch = /^ {2}original_url: (\S+)$/m.exec(dossierContent)
  if (!urlMatch) return null
  const accessed = /^ {2}accessed_at: (\S+)$/m.exec(dossierContent)
  const title = /^title: (.+)$/m.exec(dossierContent)
  return {
    url: urlMatch[1]!,
    dossierPath: dossierRelPath,
    ...(accessed ? { accessedAt: accessed[1]! } : {}),
    ...(title ? { title: yamlUnquote(title[1]!) } : {})
  }
}

/**
 * Resolve provenance for every web-reader selection path. Best-effort by
 * design: an unreadable or non-web dossier yields no entry — the evidence
 * stays valid without a URL (labeling must never fail on provenance).
 */
export function webProvenanceFor(
  vaultRoot: string,
  relPaths: string[]
): Map<string, WebEvidenceProvenance> {
  const resolved = new Map<string, WebEvidenceProvenance>()
  for (const relPath of relPaths) {
    if (resolved.has(relPath)) continue
    const match = WEB_READER_RELPATH.exec(relPath)
    if (!match) continue
    const dossierRel = `sources/web/${match[1]!}/source.md`
    try {
      const dossierAbs = join(vaultRoot, dossierRel)
      if (!existsSync(dossierAbs)) continue
      const provenance = webProvenanceFromDossier(
        readFileSync(dossierAbs, 'utf8'),
        dossierRel
      )
      if (provenance) resolved.set(relPath, provenance)
    } catch {
      // best-effort: no provenance beats a failed AI operation
    }
  }
  return resolved
}
