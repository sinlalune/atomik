import { setTheme, themeOf, THEMES } from './workspace/model'
import { useWorkspace } from './workspace/store'

/**
 * App-wide theme selector (owner feedback round 2), seated in the top
 * row next to the window controls. The choice lives in the workspace
 * settings map — recoverable UI preference, persisted like the layout.
 */
export function ThemePicker(): React.JSX.Element {
  const state = useWorkspace((store) => store.state)
  const dispatch = useWorkspace((store) => store.dispatch)
  const theme = themeOf(state)

  return (
    <select
      className="theme-picker"
      title="Theme"
      aria-label="Theme"
      value={theme}
      onChange={(event) =>
        dispatch((current) =>
          setTheme(current, event.target.value as (typeof THEMES)[number])
        )
      }
    >
      {THEMES.map((candidate) => (
        <option key={candidate} value={candidate}>
          {candidate}
        </option>
      ))}
    </select>
  )
}
