import { useEffect, useRef, useState } from 'react'
import { childRelPath, type TreeMenuTarget } from './tree-menu'

/**
 * The tree context menu (CP-MVP-007 S02): right-click (or Shift+F10)
 * on a folder node — or the tree background for the scope root — and
 * manage files where you are. S02 ships the creation half (New note
 * here / New folder…); rename/move/delete arrive with their verbs.
 *
 * One popup does everything: picking an action flips it to a name
 * input in place; errors from the main verb land inside the popup
 * (every host gets the same behavior for free). The host owns
 * position and the async actions; the OS/main side stays the real
 * validation gate.
 */
export function TreeMenu({
  target,
  scopeLabel,
  onClose,
  onNewNote,
  onNewFolder,
  onDelete
}: {
  target: TreeMenuTarget
  /** Shown for the root target ('' relPath) instead of the folder name. */
  scopeLabel: string
  onClose: () => void
  onNewNote: (relPath: string) => Promise<void>
  onNewFolder: (relPath: string) => Promise<void>
  /** Trash the target (S03). The host owns the confirm (it holds the
   *  tree for the summary); resolving without deleting is a cancel. */
  onDelete?: (target: TreeMenuTarget) => Promise<void>
}): React.JSX.Element {
  const [mode, setMode] = useState<'menu' | 'note' | 'folder'>('menu')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mode !== 'menu') inputRef.current?.focus()
  }, [mode])

  // Keep the popup on-screen (a right-click near the bottom edge must
  // not push the input out of view).
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    const dx = Math.min(0, window.innerWidth - 8 - rect.right)
    const dy = Math.min(0, window.innerHeight - 8 - rect.bottom)
    panel.style.transform = `translate(${dx}px, ${dy}px)`
  }, [mode])

  const folderLabel =
    target.relPath.length > 0
      ? (target.relPath.split('/').pop() ?? target.relPath)
      : scopeLabel

  const runDelete = async (): Promise<void> => {
    if (!onDelete || busy) return
    setBusy(true)
    setError(null)
    try {
      await onDelete(target)
      onClose()
    } catch (reason) {
      setBusy(false)
      setError(String(reason))
    }
  }

  const submit = async (): Promise<void> => {
    if (busy || mode === 'menu') return
    const kind = mode === 'note' ? 'note' : 'folder'
    const relPath = childRelPath(target.relPath, name, kind)
    if (!relPath) {
      setError('one name, no “/”, no leading dot')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await (kind === 'note' ? onNewNote(relPath) : onNewFolder(relPath))
      onClose()
    } catch (reason) {
      setBusy(false)
      setError(String(reason))
    }
  }

  return (
    <div
      className="tree-menu-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div
        ref={panelRef}
        className="tree-menu"
        style={{ left: target.x, top: target.y }}
        role="menu"
        aria-label={`Folder actions — ${folderLabel}`}
      >
        <div className="tree-menu-head" title={target.relPath || scopeLabel}>
          {folderLabel}
        </div>
        {mode === 'menu' ? (
          <>
            {target.kind === 'folder' && (
              <>
                <button type="button" role="menuitem" onClick={() => setMode('note')}>
                  New note here
                </button>
                <button type="button" role="menuitem" onClick={() => setMode('folder')}>
                  New folder…
                </button>
              </>
            )}
            {onDelete && !(target.kind === 'folder' && target.relPath === '') && (
              <button
                type="button"
                role="menuitem"
                className="tree-menu-danger"
                disabled={busy}
                onClick={() => void runDelete()}
              >
                {busy
                  ? 'deleting…'
                  : target.kind === 'note'
                    ? 'Delete note…'
                    : 'Delete folder…'}
              </button>
            )}
          </>
        ) : (
          <div className="tree-menu-form">
            <input
              ref={inputRef}
              value={name}
              disabled={busy}
              placeholder={mode === 'note' ? 'note name…' : 'folder name…'}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submit()
              }}
            />
            <button type="button" disabled={busy} onClick={() => void submit()}>
              {busy ? '…' : '+'}
            </button>
          </div>
        )}
        {error && <div className="tree-menu-error">{error}</div>}
      </div>
    </div>
  )
}
