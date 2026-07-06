import { Workspace } from './workspace/Workspace'

/**
 * The shell frame: brand header + the pane workspace (03). Tabs and panes
 * replaced the interim two-view switch at S04.
 */
export function App(): React.JSX.Element {
  return (
    <div className="app">
      <header className="app-header">
        <span className="brand">atomik</span>
      </header>
      <div className="app-body">
        <Workspace />
      </div>
    </div>
  )
}
