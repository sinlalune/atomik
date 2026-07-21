import { BookIcon, CodeIcon, PenIcon } from '../icons'
import type { NoteViewMode } from '../workspace/model'

const MODE_TITLES: Record<NoteViewMode, string> = {
  read: 'Read — rendered view',
  live: 'Live — seamless editing',
  source: 'Source — raw Markdown'
}

const MODE_ICONS: Record<NoteViewMode, () => React.JSX.Element> = {
  read: BookIcon,
  live: PenIcon,
  source: CodeIcon
}

/** The read / live / source segmented control, shared by the rendered
 *  view's bar and the editor's bar. S07o (owner): icon-first — the
 *  label lives in the hover title and the accessible name. */
export function ModeSwitch({
  mode,
  onSelect
}: {
  mode: NoteViewMode
  onSelect: (mode: NoteViewMode) => void
}): React.JSX.Element {
  return (
    <span className="mode-switch">
      {(['read', 'live', 'source'] as const).map((candidate) => {
        const Icon = MODE_ICONS[candidate]
        return (
          <button
            key={candidate}
            type="button"
            className={`icon-button${candidate === mode ? ' active' : ''}`}
            title={MODE_TITLES[candidate]}
            aria-label={MODE_TITLES[candidate]}
            aria-pressed={candidate === mode}
            onClick={() => {
              if (candidate !== mode) onSelect(candidate)
            }}
          >
            <Icon />
          </button>
        )
      })}
    </span>
  )
}
