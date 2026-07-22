import MarkdownIt from 'markdown-it'
import { useMemo, useState } from 'react'
import type { ClaimRecord, TraceSummary } from '../../../shared/ipc-contract'
import {
  composeSystemPrompt,
  composeUserMessage,
  requestAsText
} from '../../../shared/prompt-composition'
import type { SentRequest } from './ai-run'
import { copyText } from './clipboard'

/**
 * New-note preview as a TAB SIMULATION (S05c, owner directive: "the
 * preview on new notes should be in a new tab display simulation, not
 * on the current tab"): the proposal renders the way the note WILL
 * look, under a simulated tab carrying its future path. Nothing is
 * written until Accept — closing the tab is the reject.
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
  const md = useMemo(
    () => new MarkdownIt({ html: false, linkify: false, breaks: true }),
    []
  )
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
        {phase === 'review' &&
          (editing ? (
            <textarea
              className="ai-note-preview-editor"
              value={text}
              aria-label="Note content — editable before accepting"
              onChange={(event) => setEdited(event.target.value)}
            />
          ) : (
            <div
              className="ai-note-preview-rendered"
              dangerouslySetInnerHTML={{ __html: md.render(text) }}
            />
          ))}
      </div>
      {phase === 'review' && (
        <div className="ai-note-preview-footer">
          {claims.length > 0 && (
            <span className="ai-note-preview-claims">
              {claims.slice(0, 8).map((claim) => (
                <span key={claim.id} className={`truth-chip label-${claim.label}`} title={claim.text}>
                  {claim.label}
                </span>
              ))}
            </span>
          )}
          {trace && (
            <span
              className="cm-inline-ai-trace"
              title={`trace ${trace.traceId} — ~${trace.estimatedInputTokens}→${trace.estimatedOutputTokens} tok · ${trace.estimatedExternalCost.amount} ${trace.estimatedExternalCost.currency}`}
            >
              {trace.location} · {trace.model} · {trace.wallMs}ms
            </span>
          )}
          <span className="ai-note-preview-actions">
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
          </span>
        </div>
      )}
    </div>
  )
}
