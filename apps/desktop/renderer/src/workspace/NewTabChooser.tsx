import { useState } from 'react'
import { GeneratedNoteScreen } from './GeneratedNoteScreen'

/**
 * The two chooser surfaces (S07e, owner directive).
 *
 * New PANE: an empty untyped pane (fresh split, or the root after its ✕)
 * picks its TREE TYPE — vault, project, or docs. The choice is standing:
 * the pane's tree panel stays put (shown or hidden) and every tab type
 * displays it.
 *
 * New TAB (+ in a typed pane): only views SERVED here — note (of the
 * pane's kind), import, web. Docs never appear: a docs tree is a pane
 * type, chosen at pane birth.
 */

export type PaneKindPick = 'vault' | 'project' | 'docs' | 'chat' | 'web'

const PANE_OPTIONS: ReadonlyArray<{
  kind: PaneKindPick
  label: string
  hint: string
}> = [
  { kind: 'vault', label: 'Vault', hint: 'the whole vault tree — browse, manage, edit' },
  { kind: 'project', label: 'Projects', hint: 'work inside a project bundle' },
  { kind: 'docs', label: 'Docs', hint: 'read the documentation corpus' },
  // S06c (owner): the chat is a first-class pane, spawnable from birth
  { kind: 'chat', label: 'Chat', hint: 'converse with the AI over any open note' },
  // S06c12 (owner): the web is a pane choice too — a vault-typed pane
  // (tree hidden, one toggle away) born with a web tab; its + still
  // serves notes and imports like any vault pane
  { kind: 'web', label: 'Web', hint: 'browse the web, isolated; import pages as sources' }
]

export function NewPaneChooser({
  onPick,
  onClose,
  closeLabel
}: {
  onPick: (kind: PaneKindPick) => void
  onClose?: (() => void) | undefined
  closeLabel?: string
}): React.JSX.Element {
  return (
    <div className="vault-empty new-tab-chooser">
      <h2>New pane</h2>
      <ul className="project-list">
        {PANE_OPTIONS.map((option) => (
          <li key={option.kind}>
            <button type="button" onClick={() => onPick(option.kind)}>
              {option.label}
              <span className="project-path">{option.hint}</span>
            </button>
          </li>
        ))}
      </ul>
      {onClose && (
        <button type="button" className="chooser-close" onClick={onClose}>
          {closeLabel ?? 'Close'}
        </button>
      )}
    </div>
  )
}

export type TabPick = 'note' | 'import' | 'web'

/**
 * S05e (owner directive): the 'note' pick opens a STAGE — the blank
 * "New note" button plus the full generation composer — instead of
 * routing straight to the tree. The stage is transient UI; the tab
 * stays view 'new' until a real pick lands.
 */
export function NewTabFlow({
  basePath,
  onPick,
  onCreated,
  onClose,
  closeLabel
}: {
  /** Prompt-scoping/naming anchor ('generated.md', or inside a project). */
  basePath: string
  onPick: (pick: TabPick) => void
  onCreated: (relPath: string) => void
  onClose?: (() => void) | undefined
  closeLabel?: string
}): React.JSX.Element {
  const [stage, setStage] = useState<'chooser' | 'note'>('chooser')
  if (stage === 'note') {
    return (
      <GeneratedNoteScreen
        basePath={basePath}
        onPlainNewNote={() => onPick('note')}
        onBack={() => setStage('chooser')}
        onCreated={onCreated}
      />
    )
  }
  return (
    <NewTabChooser
      onPick={(pick) => {
        if (pick === 'note') setStage('note')
        else onPick(pick)
      }}
      onClose={onClose}
      closeLabel={closeLabel}
    />
  )
}

const TAB_OPTIONS: ReadonlyArray<{ pick: TabPick; label: string; hint: string }> = [
  { pick: 'note', label: 'Note', hint: 'a note from this pane’s tree' },
  { pick: 'import', label: 'Import', hint: 'bring sources in — phone, PDF, recording, web' },
  { pick: 'web', label: 'Web', hint: 'browse the web, isolated; import pages as sources' }
]

export function NewTabChooser({
  onPick,
  onClose,
  closeLabel
}: {
  onPick: (pick: TabPick) => void
  onClose?: (() => void) | undefined
  closeLabel?: string
}): React.JSX.Element {
  return (
    <div className="vault-empty new-tab-chooser">
      <h2>New tab</h2>
      <ul className="project-list">
        {TAB_OPTIONS.map((option) => (
          <li key={option.pick}>
            <button type="button" onClick={() => onPick(option.pick)}>
              {option.label}
              <span className="project-path">{option.hint}</span>
            </button>
          </li>
        ))}
      </ul>
      {onClose && (
        <button type="button" className="chooser-close" onClick={onClose}>
          {closeLabel ?? 'Close'}
        </button>
      )}
    </div>
  )
}
