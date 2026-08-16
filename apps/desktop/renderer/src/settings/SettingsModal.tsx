import React, { useEffect, useState } from 'react'
import type {
  AiEngine,
  AiProviderKeyId,
  AiSettingsPublic
} from '../../../shared/ipc-contract'
import {
  PROVIDER_CATALOG
} from '../../../shared/generation-params'
import { acquireWebOverlay } from '../web/overlay'

export function SettingsModal(props: {
  open: boolean
  onClose: () => void
}): React.JSX.Element | null {
  const { open, onClose } = props
  const [settings, setSettings] = useState<AiSettingsPublic | null>(null)
  const [draftKeys, setDraftKeys] = useState<Partial<Record<AiProviderKeyId, string>>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    window.atomik.getAiSettings().then(
      (res) => setSettings(res),
      (cause) => setError(String(cause))
    )
    const releaseOverlay = acquireWebOverlay()
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      releaseOverlay()
    }
  }, [open, onClose])

  if (!open) return null

  const handleSetEngine = (engine: AiEngine): void => {
    setBusy(true)
    setError(null)
    setMessage(null)
    window.atomik.setAiEngine(engine).then(
      (next) => {
        setBusy(false)
        setSettings(next)
        setMessage(`Active engine switched to ${PROVIDER_CATALOG[engine]?.name ?? engine}`)
      },
      (cause) => {
        setBusy(false)
        setError(String(cause))
      }
    )
  }

  const handleSaveKey = (provider: AiProviderKeyId): void => {
    const key = draftKeys[provider]?.trim()
    if (!key) return
    setBusy(true)
    setError(null)
    setMessage(null)
    window.atomik.setProviderApiKey(provider, key).then(
      (next) => {
        setBusy(false)
        setSettings(next)
        setDraftKeys((prev) => ({ ...prev, [provider]: '' }))
        setMessage(`API key saved for ${PROVIDER_CATALOG[provider]?.name ?? provider}`)
      },
      (cause) => {
        setBusy(false)
        setError(String(cause))
      }
    )
  }

  const handleClearKey = (provider: AiProviderKeyId): void => {
    setBusy(true)
    setError(null)
    setMessage(null)
    window.atomik.setProviderApiKey(provider, null).then(
      (next) => {
        setBusy(false)
        setSettings(next)
        setMessage(`API key cleared for ${PROVIDER_CATALOG[provider]?.name ?? provider}`)
      },
      (cause) => {
        setBusy(false)
        setError(String(cause))
      }
    )
  }

  const handleSelectModel = (engine: AiEngine, modelId: string): void => {
    setBusy(true)
    setError(null)
    setMessage(null)
    window.atomik.setSelectedModel(engine, modelId).then(
      (next) => {
        setBusy(false)
        setSettings(next)
        setMessage(`Default model for ${PROVIDER_CATALOG[engine]?.name} set to ${modelId}`)
      },
      (cause) => {
        setBusy(false)
        setError(String(cause))
      }
    )
  }

  const providers = Object.values(PROVIDER_CATALOG)

  return (
    <div
      className="settings-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="settings-modal-dialog" role="dialog" aria-label="AI Settings">
        <div className="settings-modal-header">
          <h2>AI Model Providers & Settings</h2>
          <button
            type="button"
            className="settings-modal-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        {error && <div className="settings-alert settings-alert-error">{error}</div>}
        {message && <div className="settings-alert settings-alert-info">{message}</div>}

        <div className="settings-modal-body">
          <section className="settings-section">
            <h3>Active Generation Engine</h3>
            <p className="settings-desc">
              Select which engine powers AI operations (inline preview, chat, suggestions).
            </p>
            <div className="settings-engine-pills">
              {providers.map((p) => {
                const isActive = settings?.generationEngine === p.id
                const hasKey =
                  p.id === 'mock' ||
                  Boolean(settings?.keys?.[p.id as AiProviderKeyId]?.present)
                const isMissingKey = p.id !== 'mock' && !hasKey
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`settings-engine-btn ${isActive ? 'active' : ''} ${isMissingKey ? 'missing-key' : ''}`}
                    onClick={() => handleSetEngine(p.id)}
                    disabled={busy || settings === null}
                  >
                    <span className="engine-name">{p.name}</span>
                    {isActive && <span className="engine-badge active">Active</span>}
                    {isMissingKey && (
                      <span className="engine-badge warn">No Key</span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="settings-section">
            <h3>Provider Credentials & Model Catalogs</h3>
            <div className="settings-providers-list">
              {providers.map((p) => {
                const isMock = p.id === 'mock'
                const keyInfo = !isMock
                  ? settings?.keys?.[p.id as AiProviderKeyId]
                  : undefined
                const activeModel =
                  settings?.selectedModels?.[p.id] ?? p.defaultModel

                return (
                  <div key={p.id} className="settings-provider-card">
                    <div className="provider-card-header">
                      <div className="provider-card-title">
                        <h4>{p.name}</h4>
                        {settings?.generationEngine === p.id && (
                          <span className="provider-active-chip">Active Engine</span>
                        )}
                      </div>
                      {!isMock && (
                        <div className="provider-key-status">
                          {keyInfo?.present ? (
                            <span className="status-badge ok">
                              Key set: {keyInfo.hint}
                            </span>
                          ) : (
                            <span className="status-badge warn">No key</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="provider-card-body">
                      <div className="provider-form-row">
                        <label htmlFor={`model-select-${p.id}`}>Model</label>
                        <select
                          id={`model-select-${p.id}`}
                          value={activeModel}
                          disabled={busy}
                          onChange={(e) => handleSelectModel(p.id, e.target.value)}
                        >
                          {p.models.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label} ({m.id}) — in ${m.inputUsdPerMTok}/M · out $
                              {m.outputUsdPerMTok}/M
                            </option>
                          ))}
                        </select>
                      </div>

                      {!isMock && (
                        <div className="provider-form-row">
                          <label htmlFor={`key-input-${p.id}`}>API Key</label>
                          <div className="provider-key-input-group">
                            <input
                              id={`key-input-${p.id}`}
                              type="password"
                              placeholder={
                                keyInfo?.present
                                  ? `Enter new key to replace (${keyInfo.hint})`
                                  : `Paste ${p.name} API key`
                              }
                              value={draftKeys[p.id as AiProviderKeyId] ?? ''}
                              disabled={busy}
                              onChange={(e) =>
                                setDraftKeys({
                                  ...draftKeys,
                                  [p.id as AiProviderKeyId]: e.target.value
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter')
                                  handleSaveKey(p.id as AiProviderKeyId)
                              }}
                            />
                            <button
                              type="button"
                              className="settings-save-btn"
                              disabled={
                                busy ||
                                !(draftKeys[p.id as AiProviderKeyId]?.trim())
                              }
                              onClick={() =>
                                handleSaveKey(p.id as AiProviderKeyId)
                              }
                            >
                              Save
                            </button>
                            {keyInfo?.present && (
                              <button
                                type="button"
                                className="settings-clear-btn"
                                disabled={busy}
                                onClick={() =>
                                  handleClearKey(p.id as AiProviderKeyId)
                                }
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <div className="settings-modal-footer">
          <p className="settings-footer-note">
            API keys are stored exclusively in main-process state (0600 mode) and
            never enter renderer DOM, logs, or vault files (bedrock 13).
          </p>
          <button type="button" className="settings-done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
