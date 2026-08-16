import { useCallback, useEffect, useState } from 'react'
import type { GraphIndex } from '../../../shared/ipc-contract'

/**
 * Vault-wide broken links (CP-MVP-010 S09) — the diagnostics list
 * CP-MVP-009 deferred with a trigger: *"the back half builds a
 * vault-wide scan anyway; when it exists the list becomes nearly free
 * and should ride it"*. It does, and this is it.
 *
 * It reads the graph index that retrieval already keeps current, so
 * there is no second scan and no new channel. A broken link is a
 * DIAGNOSTIC, never a repair: nothing here writes, auto-creates or
 * suggests — the owner decides what a dangling `[[target]]` meant
 * (bedrock 20).
 *
 * The clean-bill state matters as much as the list. A vault with no
 * broken links should SAY so, or the reader is left wondering whether
 * the check ran.
 */
export function BrokenLinksPanel({
  scope,
  onOpen
}: {
  /** Restrict to a folder (a project bundle); absent = whole vault. */
  scope?: string | undefined
  onOpen: (relPath: string) => void
}): React.JSX.Element | null {
  const [index, setIndex] = useState<GraphIndex | null>(null)
  const [open, setOpen] = useState(false)

  const refresh = useCallback(() => {
    window.atomik.readGraphIndex().then(setIndex, () => setIndex(null))
  }, [])

  useEffect(() => {
    refresh()
    // The index-changed push (S03) is what keeps this honest: a link
    // repaired in another pane must not leave a stale complaint here.
    return window.atomik.onIndexChanged(() => refresh())
  }, [refresh])

  if (!index) return null
  const prefix = scope === undefined ? '' : `${scope}/`
  const broken = index.broken.filter((entry) => entry.subject.startsWith(prefix))
  const titleOf = (path: string): string =>
    index.nodes.find((node) => node.path === path)?.title ??
    (path.split('/').pop() ?? path)

  return (
    <div className="broken-links">
      <button
        type="button"
        className="broken-links-head"
        aria-expanded={open}
        disabled={broken.length === 0}
        title={
          broken.length === 0
            ? 'Every link in this perimeter resolves'
            : 'Links pointing at something that is not there — click to list them'
        }
        onClick={() => setOpen((current) => !current)}
      >
        {broken.length === 0
          ? '✓ no broken links'
          : `${broken.length} broken link${broken.length === 1 ? '' : 's'}`}
      </button>
      {open && broken.length > 0 && (
        <ul>
          {broken.map((entry, position) => (
            <li key={`${entry.subject}:${entry.line}:${position}`}>
              <button
                type="button"
                title={`${entry.subject}:${entry.line}`}
                onClick={() => onOpen(entry.subject)}
              >
                {titleOf(entry.subject)}
              </button>
              <span className="broken-target">→ {entry.targetRaw}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
