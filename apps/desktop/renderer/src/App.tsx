import { useEffect, useState } from 'react'
import type { AppInfo } from '../../shared/ipc-contract'

/**
 * M0 shell (CP-MVP-001 S02). Renders the shell identity fetched over the one
 * typed bridge method, proving main -> preload -> renderer end to end.
 * Dev Docs tab arrives at S03, tabs/panes at S04, vault access at S05.
 */
export function App(): React.JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.atomik.getAppInfo().then(setInfo, (reason: unknown) => {
      setError(String(reason))
    })
  }, [])

  return (
    <main className="shell">
      <h1>Atomik</h1>
      <p className="tagline">
        Local-first AI learning workbench — M0 shell (CP-MVP-001 S02)
      </p>
      {error ? (
        <p className="error">bridge error: {error}</p>
      ) : info ? (
        <dl className="app-info">
          <dt>app</dt>
          <dd>
            {info.name} {info.version}
          </dd>
          <dt>electron</dt>
          <dd>{info.electron}</dd>
          <dt>chromium</dt>
          <dd>{info.chrome}</dd>
          <dt>node (main)</dt>
          <dd>{info.node}</dd>
          <dt>platform</dt>
          <dd>{info.platform}</dd>
        </dl>
      ) : (
        <p>loading…</p>
      )}
      <p className="next">
        Next on the path: Dev Docs tab (S03) · tabs &amp; panes (S04) · vault
        (S05)
      </p>
    </main>
  )
}
