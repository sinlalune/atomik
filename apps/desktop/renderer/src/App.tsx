import { Workspace } from './workspace/Workspace'

/**
 * The shell frame is the workspace itself (owner feedback on MVP-001:
 * minimalist chrome — no brand row, no native title bar; the tabstrip is
 * the window's top row and hosts the window controls).
 */
export function App(): React.JSX.Element {
  return (
    <div className="app">
      <Workspace />
    </div>
  )
}
