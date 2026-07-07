/**
 * The single "+" flow (owner round 3): a new tab opens ON this chooser
 * — pick what the tab becomes, or close it if it was a misclick. The
 * same surface serves a split's empty pane (closeLabel differs).
 */
const OPTIONS: ReadonlyArray<{ view: string; label: string; hint: string }> = [
  { view: 'project', label: 'Project', hint: 'work inside a project bundle' },
  { view: 'vault', label: 'Vault', hint: 'browse and edit the whole vault' },
  { view: 'capture', label: 'Capture', hint: 'photograph notes with your phone' },
  { view: 'dev-docs', label: 'Dev Docs', hint: 'read the documentation corpus' }
]

export function NewTabChooser({
  onPick,
  onClose,
  closeLabel
}: {
  onPick: (view: string) => void
  onClose?: (() => void) | undefined
  closeLabel?: string
}): React.JSX.Element {
  return (
    <div className="vault-empty new-tab-chooser">
      <h2>New tab</h2>
      <ul className="project-list">
        {OPTIONS.map((option) => (
          <li key={option.view}>
            <button type="button" onClick={() => onPick(option.view)}>
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
