import { useState } from 'react'
import { DevDocs } from './dev-docs/DevDocs'
import { ShellHome } from './ShellHome'

type View = 'home' | 'dev-docs'

/**
 * Interim navigation: a plain two-view switch. The real tabs/panes system
 * (03) arrives at S04 and absorbs this. `#dev-docs` selects the docs view at
 * startup (used by the smoke check).
 */
export function App(): React.JSX.Element {
  const [view, setView] = useState<View>(
    window.location.hash.startsWith('#dev-docs') ? 'dev-docs' : 'home'
  )

  return (
    <div className="app">
      <header className="app-header">
        <span className="brand">Atomik</span>
        <nav aria-label="Views">
          <button
            type="button"
            className={view === 'home' ? 'active' : ''}
            onClick={() => setView('home')}
          >
            Shell
          </button>
          <button
            type="button"
            className={view === 'dev-docs' ? 'active' : ''}
            onClick={() => setView('dev-docs')}
          >
            Dev Docs
          </button>
        </nav>
      </header>
      <div className="app-body">
        {view === 'home' ? <ShellHome /> : <DevDocs />}
      </div>
    </div>
  )
}
