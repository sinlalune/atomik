import { useEffect, useRef, useState } from 'react'
import { CheckIcon } from '../icons'
import {
  buildPromptFileContent,
  isPromptsFolder,
  type PromptKind
} from '../editor/prompts'
import { childRelPath, moveTargetRelPath, type TreeMenuTarget } from './tree-menu'

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
  onNewPrompt,
  onDelete,
  onRename,
  onMove
}: {
  target: TreeMenuTarget
  /** Shown for the root target ('' relPath) instead of the folder name. */
  scopeLabel: string
  onClose: () => void
  onNewNote: (relPath: string) => Promise<void>
  onNewFolder: (relPath: string) => Promise<void>
  /** Create a prompt file with autofilled frontmatter (S03b) — shown
   *  only inside a prompts/ folder; content is built from the UI
   *  choices (kind toggle + name). */
  onNewPrompt?: (relPath: string, content: string) => Promise<void>
  /** Trash the target (S03). The host owns the confirm (it holds the
   *  tree for the summary); resolving without deleting is a cancel. */
  onDelete?: (target: TreeMenuTarget) => Promise<void>
  /** Rename a note (S04) — the host runs the previewed refactor;
   *  resolving without applying is a cancel. */
  onRename?: (from: string, to: string) => Promise<void>
  /** Move to a typed destination folder (S05) — same previewed
   *  refactor, note or folder form chosen by the host. */
  onMove?: (target: TreeMenuTarget, to: string) => Promise<void>
}): React.JSX.Element {
  const [mode, setMode] = useState<
    'menu' | 'note' | 'folder' | 'rename' | 'move' | 'prompt'
  >('menu')
  const [name, setName] = useState('')
  const [promptKind, setPromptKind] = useState<PromptKind>('message')
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
    const relPath =
      mode === 'move'
        ? moveTargetRelPath(target.relPath, name)
        : childRelPath(
            mode === 'rename'
              ? target.relPath.split('/').slice(0, -1).join('/')
              : target.relPath,
            name,
            mode === 'folder' ? 'folder' : 'note'
          )
    if (!relPath) {
      setError(
        mode === 'move'
          ? 'a destination folder path (empty = vault root)'
          : 'one name, no “/”, no leading dot'
      )
      return
    }
    if ((mode === 'rename' || mode === 'move') && relPath === target.relPath) {
      onClose()
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (mode === 'rename') await onRename?.(target.relPath, relPath)
      else if (mode === 'move') await onMove?.(target, relPath)
      else if (mode === 'prompt')
        await onNewPrompt?.(
          relPath,
          buildPromptFileContent(promptKind, name.trim().replace(/\.md$/i, ''))
        )
      else if (mode === 'note') await onNewNote(relPath)
      else await onNewFolder(relPath)
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
        aria-label={`${target.kind === 'note' ? 'Note' : 'Folder'} actions — ${folderLabel}`}
      >
        <div className="tree-menu-head" title={target.relPath || scopeLabel}>
          {folderLabel}
        </div>
        {mode === 'menu' ? (
          <>
            {target.kind === 'folder' && (
              <>
                {onNewPrompt && isPromptsFolder(target.relPath) && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setMode('prompt')}
                  >
                    New prompt…
                  </button>
                )}
                <button type="button" role="menuitem" onClick={() => setMode('note')}>
                  New note here
                </button>
                <button type="button" role="menuitem" onClick={() => setMode('folder')}>
                  New folder…
                </button>
              </>
            )}
            {onRename && target.kind === 'note' && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const base = target.relPath.split('/').pop() ?? ''
                  setName(base.toLowerCase().endsWith('.md') ? base.slice(0, -3) : base)
                  setMode('rename')
                }}
              >
                Rename…
              </button>
            )}
            {onMove && target.relPath !== '' && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setName(target.relPath.split('/').slice(0, -1).join('/'))
                  setMode('move')
                }}
              >
                Move to…
              </button>
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
          <>
            {mode === 'prompt' && (
              <div
                className="tree-menu-kinds"
                role="radiogroup"
                aria-label="Prompt kind"
              >
                {(['message', 'system'] as const).map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    role="radio"
                    aria-checked={promptKind === candidate}
                    className={promptKind === candidate ? 'active' : ''}
                    disabled={busy}
                    onClick={() => setPromptKind(candidate)}
                  >
                    {candidate}
                  </button>
                ))}
              </div>
            )}
            <div className="tree-menu-form">
              <input
                ref={inputRef}
                value={name}
                disabled={busy}
                placeholder={
                  mode === 'rename'
                    ? 'new name…'
                    : mode === 'move'
                      ? 'destination folder (empty = root)…'
                      : mode === 'note'
                        ? 'note name…'
                        : mode === 'prompt'
                          ? 'prompt name…'
                          : 'folder name…'
                }
                aria-label={
                  mode === 'rename'
                    ? 'New name'
                    : mode === 'move'
                      ? 'Destination folder'
                      : mode === 'note'
                        ? 'Note name'
                        : mode === 'prompt'
                          ? 'Prompt name'
                          : 'Folder name'
                }
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void submit()
                }}
              />
              <button
                type="button"
                disabled={busy}
                title="Confirm"
                aria-label={
                  mode === 'rename'
                    ? 'Rename'
                    : mode === 'move'
                      ? 'Move'
                      : mode === 'note'
                        ? 'Create note'
                        : mode === 'prompt'
                          ? 'Create prompt'
                          : 'Create folder'
                }
                onClick={() => void submit()}
              >
                <CheckIcon />
              </button>
            </div>
          </>
        )}
        {error && <div className="tree-menu-error">{error}</div>}
      </div>
    </div>
  )
}
