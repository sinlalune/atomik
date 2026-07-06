import type { NoteViewMode } from '../workspace/model'

const MODE_TITLES: Record<NoteViewMode, string> = {
  read: 'Rendered view',
  live: 'Seamless editing (live preview)',
  source: 'Raw Markdown (IDE mode)'
}

/** The read / live / source segmented control, shared by the rendered
 *  view's bar and the editor's bar. */
export function ModeSwitch({
  mode,
  onSelect
}: {
  mode: NoteViewMode
  onSelect: (mode: NoteViewMode) => void
}): React.JSX.Element {
  return (
    <span className="mode-switch">
      {(['read', 'live', 'source'] as const).map((candidate) => (
        <button
          key={candidate}
          type="button"
          className={candidate === mode ? 'active' : ''}
          title={MODE_TITLES[candidate]}
          onClick={() => {
            if (candidate !== mode) onSelect(candidate)
          }}
        >
          {candidate}
        </button>
      ))}
    </span>
  )
}
