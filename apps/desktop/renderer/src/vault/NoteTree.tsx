import { useState } from 'react'
import type { VaultFolder } from '../../../shared/ipc-contract'
import { EyeIcon, EyeOffIcon } from '../icons'
import { noteDisplayName, splitPillNotes } from './scope'
import { TREE_DRAG_MIME, type TreeDragSource } from './tree-menu'

/** The payload riding a tree-node drag; null when it isn't ours. */
export function parseTreeDrag(data: string): TreeDragSource | null {
  try {
    const parsed: unknown = JSON.parse(data)
    if (typeof parsed !== 'object' || parsed === null) return null
    const record = parsed as Record<string, unknown>
    if (record['kind'] !== 'folder' && record['kind'] !== 'note') return null
    if (typeof record['relPath'] !== 'string' || record['relPath'].length === 0) {
      return null
    }
    return { kind: record['kind'], relPath: record['relPath'] }
  } catch {
    return null
  }
}

/**
 * The one recursive folder tree for vault-backed views (VaultView,
 * ProjectView — extracted when the pill row made the twins diverge-prone).
 * Every folder that holds the bundle-convention files (04: index.md /
 * log.md) shows them as PILLS on its top row and hides them from the
 * note list; the eye on the right of that same row reveals them
 * (owner feedback on MVP-001). The eye is per-folder, disposable state.
 */
export function NoteTree({
  folder,
  activePath,
  onOpen,
  openFolders,
  onFolderToggle,
  onFolderMenu,
  onNoteMenu,
  onDropNode
}: {
  folder: VaultFolder
  activePath: string | null
  onOpen: (relPath: string) => void
  /** CONTROLLED fold state (owner request: collapsed by default, state
   *  remembered per tab) — the set of open folder relPaths. */
  openFolders: ReadonlySet<string>
  onFolderToggle: (relPath: string, open: boolean) => void
  /** Context menu on a folder node (CP-MVP-007): right-click or
   *  Shift+F10 reports the folder and a screen position. */
  onFolderMenu?: (relPath: string, x: number, y: number) => void
  /** Same for note nodes (S03: delete). */
  onNoteMenu?: (relPath: string, x: number, y: number) => void
  /** Drop a dragged node onto a folder (S06) — the host runs the SAME
   *  previewed Move flow as the menu; providing this enables dragging. */
  onDropNode?: (source: TreeDragSource, destFolderRelPath: string) => void
}): React.JSX.Element {
  const { pills, rest } = splitPillNotes(folder.notes)
  const [showPillFiles, setShowPillFiles] = useState(false)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const listed = showPillFiles ? folder.notes : rest

  const dragProps = (source: TreeDragSource): React.HTMLAttributes<HTMLElement> =>
    onDropNode
      ? {
          draggable: true,
          onDragStart: (event: React.DragEvent) => {
            event.stopPropagation()
            event.dataTransfer.setData(TREE_DRAG_MIME, JSON.stringify(source))
            event.dataTransfer.effectAllowed = 'move'
          }
        }
      : {}

  const dropProps = (destRelPath: string): React.HTMLAttributes<HTMLElement> =>
    onDropNode
      ? {
          onDragOver: (event: React.DragEvent) => {
            if (!event.dataTransfer.types.includes(TREE_DRAG_MIME)) return
            event.preventDefault()
            event.stopPropagation()
            event.dataTransfer.dropEffect = 'move'
            setDragOver(destRelPath)
          },
          onDragLeave: () =>
            setDragOver((current) => (current === destRelPath ? null : current)),
          onDrop: (event: React.DragEvent) => {
            event.preventDefault()
            event.stopPropagation()
            setDragOver(null)
            const source = parseTreeDrag(event.dataTransfer.getData(TREE_DRAG_MIME))
            if (source) onDropNode(source, destRelPath)
          }
        }
      : {}

  return (
    <>
      {pills.length > 0 && (
        <div className="tree-pills">
          {pills.map((pill) => (
            <button
              key={pill.relPath}
              type="button"
              className={`pill${pill.relPath === activePath ? ' active' : ''}`}
              title={pill.relPath}
              onClick={() => onOpen(pill.relPath)}
            >
              {noteDisplayName(pill.name)}
            </button>
          ))}
          <button
            type="button"
            className="pill-eye"
            title={
              showPillFiles
                ? 'Hide index/log in the file list'
                : 'Show index/log in the file list'
            }
            onClick={() => setShowPillFiles((current) => !current)}
          >
            {showPillFiles ? <EyeIcon /> : <EyeOffIcon />}
          </button>
        </div>
      )}
      <ul>
        {folder.folders.map((child) => (
          <li key={child.relPath}>
            <details
              open={openFolders.has(child.relPath)}
              onToggle={(event) =>
                onFolderToggle(child.relPath, event.currentTarget.open)
              }
            >
              <summary
                className={dragOver === child.relPath ? 'drop-target' : undefined}
                {...dragProps({ kind: 'folder', relPath: child.relPath })}
                {...dropProps(child.relPath)}
                onContextMenu={
                  onFolderMenu
                    ? (event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        onFolderMenu(child.relPath, event.clientX, event.clientY)
                      }
                    : undefined
                }
                onKeyDown={
                  onFolderMenu
                    ? (event) => {
                        if (
                          event.key === 'ContextMenu' ||
                          (event.key === 'F10' && event.shiftKey)
                        ) {
                          event.preventDefault()
                          const rect = event.currentTarget.getBoundingClientRect()
                          onFolderMenu(child.relPath, rect.left + 16, rect.bottom)
                        }
                      }
                    : undefined
                }
              >
                {child.name}
              </summary>
              <NoteTree
                folder={child}
                activePath={activePath}
                onOpen={onOpen}
                openFolders={openFolders}
                onFolderToggle={onFolderToggle}
                onFolderMenu={onFolderMenu}
                onNoteMenu={onNoteMenu}
                onDropNode={onDropNode}
              />
            </details>
          </li>
        ))}
        {listed.map((note) => (
          <li key={note.relPath}>
            <button
              type="button"
              className={note.relPath === activePath ? 'active' : ''}
              title={note.relPath}
              {...dragProps({ kind: 'note', relPath: note.relPath })}
              onClick={() => onOpen(note.relPath)}
              onContextMenu={
                onNoteMenu
                  ? (event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      onNoteMenu(note.relPath, event.clientX, event.clientY)
                    }
                  : undefined
              }
              onKeyDown={
                onNoteMenu
                  ? (event) => {
                      if (
                        event.key === 'ContextMenu' ||
                        (event.key === 'F10' && event.shiftKey)
                      ) {
                        event.preventDefault()
                        const rect = event.currentTarget.getBoundingClientRect()
                        onNoteMenu(note.relPath, rect.left + 16, rect.bottom)
                      }
                    }
                  : undefined
              }
            >
              {noteDisplayName(note.name)}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
