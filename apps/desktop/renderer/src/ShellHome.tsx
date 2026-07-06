import { useEffect, useState } from 'react'
import type { AppInfo } from '../../shared/ipc-contract'

/**
 * Shell identity card (S02). Proves main -> preload -> renderer end to end
 * by rendering the one read-only bridge call.
 */
export function ShellHome(): React.JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.atomik.getAppInfo().then(setInfo, (reason: unknown) => {
      setError(String(reason))
    })
  }, [])

  return (
    <main className="shell-home">
      <h1>atomik</h1>
      <p className="tagline">
        Local-first AI learning workbench — M0 shell (CP-MVP-001)
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
        Next on the path: vault (S05) · project bundles (S06) · editor (S07) ·
        AI patch loop (S08)
      </p>
    </main>
  )
}
