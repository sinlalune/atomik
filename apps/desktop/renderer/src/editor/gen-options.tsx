import React from 'react'
import {
  PARAM_LIMITS,
  PROVIDER_CATALOG,
  type GenerationModelId
} from '../../../shared/generation-params'
import { type GenOptionDrafts } from './gen-params'

/** The foldable options block (S05d, shared since S06b) — the pure
 *  draft/params half lives in gen-params.ts (plain .ts, test-reachable
 *  without JSX); this file is only the fields UI. */

export function GenOptionsFields({
  drafts,
  onChange
}: {
  drafts: GenOptionDrafts
  onChange: (next: GenOptionDrafts) => void
}): React.JSX.Element {
  return (
    <details className="ai-menu-options">
      <summary>options</summary>
      <GenOptionFieldRows drafts={drafts} onChange={onChange} />
    </details>
  )
}

/** The bare field grid (S07b8c): the chat's model SHEET renders these
 *  without the details wrapper; the menus keep the disclosure. */
export function GenOptionFieldRows({
  drafts,
  onChange
}: {
  drafts: GenOptionDrafts
  onChange: (next: GenOptionDrafts) => void
}): React.JSX.Element {
  return (
    <div className="ai-menu-options-grid">
      <label>
        model
        <select
          aria-label="Model"
          value={drafts.model}
          onChange={(event) =>
            onChange({
              ...drafts,
              model: event.target.value as GenerationModelId
            })
          }
        >
          {Object.values(PROVIDER_CATALOG).map((provider) => (
            <optgroup key={provider.id} label={provider.name}>
              {provider.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.id})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label>
        temperature
        <input
          type="number"
          step="0.1"
          min={PARAM_LIMITS.temperature.min}
          max={PARAM_LIMITS.temperature.max}
          placeholder={String(PARAM_LIMITS.temperature.default)}
          aria-label="Temperature"
          value={drafts.temperature}
          onChange={(event) =>
            onChange({ ...drafts, temperature: event.target.value })
          }
        />
      </label>
      <label>
        top p
        <input
          type="number"
          step="0.05"
          min={PARAM_LIMITS.topP.min}
          max={PARAM_LIMITS.topP.max}
          placeholder={`${PARAM_LIMITS.topP.default} (default)`}
          aria-label="Top p"
          value={drafts.topP}
          onChange={(event) => onChange({ ...drafts, topP: event.target.value })}
        />
      </label>
      <label>
        max tokens
        <input
          type="number"
          step="50"
          min={PARAM_LIMITS.maxTokens.min}
          max={PARAM_LIMITS.maxTokens.max}
          placeholder={String(PARAM_LIMITS.maxTokens.default)}
          aria-label="Max tokens"
          value={drafts.maxTokens}
          onChange={(event) =>
            onChange({ ...drafts, maxTokens: event.target.value })
          }
        />
      </label>
    </div>
  )
}
