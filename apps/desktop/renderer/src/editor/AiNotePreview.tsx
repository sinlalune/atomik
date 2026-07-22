import { useMemo, useState } from 'react'
import type { ClaimRecord, TraceSummary } from '../../../shared/ipc-contract'
import {
  composeSystemPrompt,
  composeUserMessage,
  requestAsText
} from '../../../shared/prompt-composition'
import type { SentRequest } from './ai-run'
import { copyText } from './clipboard'
import { noteMarkdown } from './note-markdown'

/**
 * New-note preview as a NATIVE note-tab simulation (S05c; S05h owner
 * refinement: "just use a native note tab simulated as an existing
 * tab with just the ai generated block in this note used on append
 * and replace"): a simulated tab strip over a REGULAR note column
 * (.note-scroll + .markdown-body), holding exactly ONE inline-AI
 * framed block — the same visual the append/replace widget uses.
 * Nothing is written until Accept — closing the tab is the reject.
 */
export function AiNotePreview({
  path,
  phase,
  proposal,
  claims,
  trace,
  sent,
  error,
  onAccept,
  onReject,
  onCancel
}: {
  path: string
  phase: 'running' | 'review' | 'error'
  proposal: string
  claims: ClaimRecord[]
  trace: TraceSummary | null
  sent: SentRequest | null
  error?: string
  onAccept: (editedText: string) => void
  onReject: () => void
  onCancel: () => void
}): React.JSX.Element {
  const [edited, setEdited] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const md = useMemo(() => noteMarkdown(), [])
  const text = edited ?? proposal

  return (
    <div className="ai-note-preview" role="dialog" aria-label={`New note preview — ${path}`}>
      <div className="ai-note-preview-strip">
        <span className="ai-note-preview-tab">
          <span className="ai-note-preview-name" title={path}>
            {path}
          </span>
          <button
            type="button"
            title="Close preview without creating the note"
            aria-label="Close preview"
            onClick={onReject}
          >
            ×
          </button>
        </span>
        <span className="ai-note-preview-hint">preview — not created yet</span>
      </div>
      {phase !== 'review' && (
        <div className="ai-note-preview-body">
          {phase === 'running' && (
            <div className="ai-note-preview-running">
              <span>AI · running…</span>
              <button type="button" onClick={onCancel} aria-label="Cancel this request">
                Cancel
              </button>
            </div>
          )}
          {phase === 'error' && (
            <div className="ai-note-preview-error">
              <span className="error">{error ?? 'the request failed'}</span>
              <button type="button" onClick={onReject} aria-label="Dismiss">
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
      {phase === 'review' && (
        // the note as it will exist: a regular reading column holding
        // the ONE generated block, framed like the inline widget
        <div className="note-scroll">
          <div className="markdown-body">
            <div className="cm-inline-ai phase-review">
              <div className="cm-inline-ai-head">
                <span className="cm-inline-ai-title">AI · new note</span>
                {trace && (
                  <span
                    className="cm-inline-ai-trace"
                    title={`trace ${trace.traceId} — ~${trace.estimatedInputTokens}→${trace.estimatedOutputTokens} tok · ${trace.estimatedExternalCost.amount} ${trace.estimatedExternalCost.currency}`}
                  >
                    {trace.location} · {trace.model} · {trace.wallMs}ms
                  </span>
                )}
              </div>
              <div className="cm-inline-ai-body">
                {editing ? (
                  <textarea
                    className="cm-inline-ai-proposal"
                    value={text}
                    rows={Math.min(24, Math.max(6, text.split('\n').length))}
                    aria-label="Note content — editable before accepting"
                    onChange={(event) => setEdited(event.target.value)}
                  />
                ) : (
                  <div
                    className="markdown-body cm-inline-ai-rendered"
                    dangerouslySetInnerHTML={{ __html: md.render(text) }}
                  />
                )}
              </div>
              {claims.length > 0 && (
                <div className="cm-inline-ai-claims">
                  {claims.slice(0, 8).map((claim) => (
                    <span
                      key={claim.id}
                      className={`truth-chip label-${claim.label}`}
                      title={claim.text}
                    >
                      {claim.label}
                    </span>
                  ))}
                </div>
              )}
              <div className="cm-inline-ai-actions">
                {sent && (
                  <button
                    type="button"
                    title="Copy the full request (system + user) for testing elsewhere"
                    onClick={() => {
                      const request = requestAsText(
                        composeSystemPrompt(sent.systemPrompt, sent.destination),
                        composeUserMessage(
                          sent.instruction,
                          [
                            {
                              content: sent.selection.content,
                              relPath: sent.selection.relPath
                            },
                            ...sent.linkedNotes
                          ],
                          sent.noteContext
                        )
                      )
                      void copyText(request).then((ok) => {
                        setCopyState(ok ? 'copied' : 'failed')
                        setTimeout(() => setCopyState('idle'), 1500)
                      })
                    }}
                  >
                    {copyState === 'copied'
                      ? 'copied ✓'
                      : copyState === 'failed'
                        ? 'copy failed'
                        : 'copy request'}
                  </button>
                )}
                <button
                  type="button"
                  aria-pressed={editing}
                  onClick={() => setEditing((current) => !current)}
                >
                  {editing ? 'preview' : 'edit'}
                </button>
                <button type="button" onClick={() => onAccept(text)}>
                  ✓ Create note
                </button>
                <button type="button" onClick={onReject}>
                  ✕ Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
