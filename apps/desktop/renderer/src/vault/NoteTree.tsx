import { useState } from 'react'
import type { VaultFolder } from '../../../shared/ipc-contract'
import { EyeIcon, EyeOffIcon } from '../icons'
import { noteDisplayName, splitPillNotes } from './scope'

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
  onOpen
}: {
  folder: VaultFolder
  activePath: string | null
  onOpen: (relPath: string) => void
}): React.JSX.Element {
  const { pills, rest } = splitPillNotes(folder.notes)
  const [showPillFiles, setShowPillFiles] = useState(false)
  const listed = showPillFiles ? folder.notes : rest

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
            <details open>
              <summary>{child.name}</summary>
              <NoteTree folder={child} activePath={activePath} onOpen={onOpen} />
            </details>
          </li>
        ))}
        {listed.map((note) => (
          <li key={note.relPath}>
            <button
              type="button"
              className={note.relPath === activePath ? 'active' : ''}
              title={note.relPath}
              onClick={() => onOpen(note.relPath)}
            >
              {noteDisplayName(note.name)}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
