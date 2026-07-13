import React, { useEffect, useRef, useState } from 'react'
import type { AiSettingsPublic } from '../../shared/ipc-contract'
import { acquireWebOverlay } from './web/overlay'

/**
 * Settings → AI (CP-MVP-005 S05b, owner directive): the Mistral API key
 * gets an input field instead of an env file. The raw key goes DOWN the
 * typed channel once and never comes back — the panel shows presence
 * and a ••••hint only (13). Seated in the top row next to the theme
 * picker; grows into the general settings menu when more sections land.
 */
export function AiSettings(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<AiSettingsPublic | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    window.atomik.getAiSettings().then(setSettings, (cause) => setError(String(cause)))
    const onDown = (event: MouseEvent): void => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    // an open panel could sit UNDER a native web view — hide those (S03)
    const releaseOverlay = acquireWebOverlay()
    return () => {
      document.removeEventListener('mousedown', onDown)
      releaseOverlay()
    }
  }, [open])

  const submit = (key: string | null): void => {
    setBusy(true)
    setError(null)
    window.atomik.setMistralApiKey(key).then(
      (next) => {
        setBusy(false)
        setSettings(next)
        setDraft('')
      },
      (cause) => {
        setBusy(false)
        setError(String(cause))
      }
    )
  }

  return (
    <div className="ai-settings" ref={panelRef}>
      <button
        type="button"
        className="ai-settings-toggle"
        title="Settings — AI"
        aria-label="Settings — AI"
        onClick={() => setOpen((value) => !value)}
      >
        ⚙
      </button>
      {open && (
        <div className="ai-settings-panel">
          <h3>AI settings</h3>
          <section>
            <h4>Mistral OCR (cloud rung)</h4>
            <p className="ai-settings-status">
              {settings === null
                ? 'Loading…'
                : settings.mistralKeyPresent
                  ? `Key configured (${settings.mistralKeyHint ?? '••••'}) — Cloud OCR enabled.`
                  : 'No key — Cloud OCR is disabled; nothing is ever sent without it.'}
            </p>
            <div className="ai-settings-row">
              <input
                type="password"
                placeholder="Mistral API key"
                value={draft}
                autoComplete="off"
                onChange={(event) => setDraft(event.target.value)}
              />
              <button
                type="button"
                disabled={busy || draft.trim().length === 0}
                onClick={() => submit(draft)}
              >
                Save
              </button>
              {settings?.mistralKeyPresent && (
                <button type="button" disabled={busy} onClick={() => submit(null)}>
                  Clear
                </button>
              )}
            </div>
            {error && <p className="error">{error}</p>}
            <p className="ai-settings-note">
              Stored on this machine only (state dir, mode 600) — never in
              the vault, never in git, never shown back in full.
            </p>
          </section>
        </div>
      )}
    </div>
  )
}
