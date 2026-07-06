import MarkdownIt from 'markdown-it'
import { useCallback, useMemo, useState } from 'react'
import type {
  AiDestination,
  AiResponseBundle,
  AiSelection,
  ClaimRecord,
  ProposedFileChange,
  TraceSummary,
  VaultNoteFile
} from '../../../shared/ipc-contract'
import { DockBottomIcon, DockRightIcon } from '../icons'
import { defaultNewNotePath, ensureMdExtension } from './ai-helpers'

export type BufferChange =
  | { kind: 'replace-range'; range: { from: number; to: number }; newText: string }
  | { kind: 'append'; newText: string }

export type AiPanelProps = {
  note: VaultNoteFile
  /** Current editor selection (offsets + text) at call time. */
  getSelection: () => { from: number; to: number; text: string }
  /** Full buffer text at call time. */
  getDoc: () => string
  /** Applies an accepted change into the editor buffer (undoable). */
  applyChange: (change: BufferChange) => void
  /** Saves the buffer (the editor's save: mtime handshake, conflicts). */
  requestSave: () => Promise<void>
  /** Reveals a source anchor range in the editor (S10 citations). */
  openAnchor: (range: { from: number; to: number }) => void
  /** Fired after a new-note patch is created on disk (refresh + open). */
  onNoteCreated?: (relPath: string) => void
  onClose: () => void
  /** Where the panel is docked; the host owns layout and resize. */
  dock: 'bottom' | 'right'
  onToggleDock: () => void
  style?: React.CSSProperties
}

type Phase = 'compose' | 'running' | 'review'

const PRESETS: Array<{ id: string; label: string; instruction: string }> = [
  { id: 'explain', label: 'explain', instruction: 'Explain this simply.' },
  { id: 'summarize', label: 'summarize', instruction: 'Summarize the selection.' },
  { id: 'rewrite', label: 'rewrite', instruction: 'Rewrite this more clearly.' }
]

/**
 * The S08 loop, docked inside the editor: selection → mocked operation →
 * response bundle → editable patch preview → accept (into the BUFFER,
 * undoable; the explicit save remains the moment a diff is born) or
 * reject. A dedicated ai-panel tab kind may replace this docking when
 * context assembly grows beyond selection-first (26).
 */
export function AiPanel({
  note,
  getSelection,
  getDoc,
  applyChange,
  requestSave,
  openAnchor,
  onNoteCreated,
  onClose,
  dock,
  onToggleDock,
  style
}: AiPanelProps): React.JSX.Element {
  const [instruction, setInstruction] = useState('')
  const [preset, setPreset] = useState<string | undefined>(undefined)
  const [destination, setDestination] = useState<AiDestination['kind']>('append')
  // Prefilled and fully visible: the destination path is never a surprise.
  const [newNotePath, setNewNotePath] = useState(() =>
    defaultNewNotePath(note.relPath)
  )
  const [phase, setPhase] = useState<Phase>('compose')
  const [bundle, setBundle] = useState<AiResponseBundle | null>(null)
  const [editedText, setEditedText] = useState('')
  const [proposedText, setProposedText] = useState('')
  const [trace, setTrace] = useState<TraceSummary | null>(null)
  const [ranSelection, setRanSelection] = useState<AiSelection | null>(null)
  const [docAtRun, setDocAtRun] = useState('')
  const [applied, setApplied] = useState<string | null>(null)
  const [challengedIds, setChallengedIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const md = useMemo(
    () => new MarkdownIt({ html: false, linkify: false, breaks: true }),
    []
  )

  const pickPreset = useCallback(
    (id: string) => {
      setPreset(id)
      const spec = PRESETS.find((candidate) => candidate.id === id)
      if (spec && instruction.trim().length === 0) {
        setInstruction(spec.instruction)
      }
    },
    [instruction]
  )

  const run = useCallback(async () => {
    const text = instruction.trim()
    if (text.length === 0) return
    const raw = getSelection()
    const doc = getDoc()
    // no selection -> the whole note is the selection (05: scope shrinks
    // to the note; replace-selection is disabled below in that case)
    const selection: AiSelection = {
      relPath: note.relPath,
      kind: 'text',
      content: raw.text.length > 0 ? raw.text : doc,
      range:
        raw.text.length > 0
          ? { from: raw.from, to: raw.to }
          : { from: 0, to: doc.length }
    }
    const target =
      destination === 'new-note'
        ? {
            relPath: note.relPath,
            destination: {
              kind: 'new-note' as const,
              newNotePath: ensureMdExtension(
                newNotePath.trim().length > 0
                  ? newNotePath.trim()
                  : defaultNewNotePath(note.relPath)
              )
            }
          }
        : { relPath: note.relPath, destination: { kind: destination } }

    setPhase('running')
    setError(null)
    setApplied(null)
    try {
      const result = await window.atomik.runAiOperation({
        id: crypto.randomUUID(),
        input: [selection],
        instruction: text,
        ...(preset ? { preset } : {}),
        target
      })
      setBundle(result)
      setRanSelection(selection)
      setDocAtRun(doc)
      const proposal = result.patchProposals[0]?.files[0]?.newText ?? ''
      setEditedText(proposal)
      setProposedText(proposal)
      setPhase('review')
      // badge data; telemetry must never break the loop
      window.atomik.getAiTraceSummary(result.id).then(
        (summary) => setTrace(summary),
        () => setTrace(null)
      )
    } catch (reason) {
      setError(String(reason))
      setPhase('compose')
    }
  }, [destination, getDoc, getSelection, instruction, newNotePath, note.relPath, preset])

  const proposalFile: ProposedFileChange | undefined =
    bundle?.patchProposals[0]?.files[0]

  const reportDecision = useCallback(
    (decision: 'accepted' | 'edited' | 'rejected') => {
      if (!bundle) return
      // fire-and-forget: the ledger line must never block or break the UX
      window.atomik.resolveAiTrace(bundle.id, decision).catch(() => undefined)
    },
    [bundle]
  )

  const accept = useCallback(async () => {
    if (!bundle || !proposalFile || !ranSelection) return
    setError(null)
    const decision = editedText === proposedText ? 'accepted' : 'edited'
    try {
      if (proposalFile.kind === 'create') {
        await window.atomik.createNote(proposalFile.relPath, editedText)
        setApplied(`created ${proposalFile.relPath}`)
        reportDecision(decision)
        onNoteCreated?.(proposalFile.relPath)
      } else {
        if (
          getDoc() !== docAtRun &&
          !window.confirm(
            'The buffer changed since this operation ran — apply anyway?'
          )
        ) {
          return
        }
        if (proposalFile.kind === 'replace-range') {
          applyChange({
            kind: 'replace-range',
            range: proposalFile.range,
            newText: editedText
          })
        } else {
          applyChange({ kind: 'append', newText: editedText })
        }
        // Accepting IS the decision: the reviewed patch is saved right
        // away (one accepted operation = one clear diff). Ctrl+Z + save
        // reverts; a stale file surfaces the editor's conflict banner.
        await requestSave()
        setApplied('applied and saved — Ctrl+Z then save to revert')
        reportDecision(decision)
      }
    } catch (reason) {
      setError(String(reason))
    }
  }, [applyChange, bundle, docAtRun, editedText, getDoc, proposalFile, proposedText, ranSelection, requestSave, onNoteCreated, reportDecision])

  const reject = useCallback(() => {
    if (!applied) reportDecision('rejected')
    setBundle(null)
    setRanSelection(null)
    setApplied(null)
    setTrace(null)
    setChallengedIds([])
    setPhase('compose')
  }, [applied, reportDecision])

  /** S10 challenge → repair patch preview: the claim is qualified inside
   *  the (editable) proposal — a mechanical repair the user reviews and
   *  accepts through the normal patch path. */
  const challenge = useCallback((claim: ClaimRecord) => {
    const marker = ' **[⚠ challenged — needs a source]**'
    setEditedText((current) =>
      current.includes(claim.text)
        ? current.replace(claim.text, `${claim.text}${marker}`)
        : `${current}\n\n> ⚠ Challenged claim (${claim.label}): "${claim.text}" — do not trust this patch until it is sourced.\n`
    )
    setChallengedIds((current) => [...current, claim.id])
  }, [])

  const openEvidence = useCallback(
    (claim: ClaimRecord) => {
      const record = bundle?.evidence.find(
        (candidate) => candidate.id === claim.evidenceIds[0]
      )
      if (record) openAnchor(record.source.range)
    },
    [bundle, openAnchor]
  )

  const selectionEmpty = getSelection().text.length === 0

  return (
    <section className="ai-panel" aria-label="AI operation panel" style={style}>
      <header className="ai-panel-bar">
        <span className="ai-panel-title">AI · mock provider</span>
        <span className="ai-panel-controls">
          <button
            type="button"
            className="tab-close"
            title={dock === 'bottom' ? 'Dock right' : 'Dock bottom'}
            onClick={onToggleDock}
          >
            {dock === 'bottom' ? <DockRightIcon /> : <DockBottomIcon />}
          </button>
          <button
            type="button"
            className="tab-close"
            aria-label="Close AI panel"
            onClick={onClose}
          >
            ×
          </button>
        </span>
      </header>
      <div className="ai-panel-body">
        {phase !== 'review' && (
          <div className="ai-compose">
            <div className="ai-presets">
              {PRESETS.map((spec) => (
                <button
                  key={spec.id}
                  type="button"
                  className={preset === spec.id ? 'active' : ''}
                  onClick={() => pickPreset(spec.id)}
                >
                  {spec.label}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              placeholder="Ask about the selection (or the whole note)…"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
            />
            <div className="ai-destination">
              <label>
                <input
                  type="radio"
                  name="ai-dest"
                  checked={destination === 'replace-selection'}
                  disabled={selectionEmpty}
                  onChange={() => setDestination('replace-selection')}
                />
                replace selection
              </label>
              <label>
                <input
                  type="radio"
                  name="ai-dest"
                  checked={destination === 'append'}
                  onChange={() => setDestination('append')}
                />
                append to note
              </label>
              <label>
                <input
                  type="radio"
                  name="ai-dest"
                  checked={destination === 'new-note'}
                  onChange={() => setDestination('new-note')}
                />
                new note
              </label>
              {destination === 'new-note' && (
                <input
                  className="ai-newnote"
                  title="Path from the vault root — prefilled beside this note"
                  value={newNotePath}
                  onChange={(event) => setNewNotePath(event.target.value)}
                />
              )}
            </div>
            <div className="ai-actions">
              {error && <span className="error editor-msg">{error}</span>}
              <button
                type="button"
                disabled={phase === 'running' || instruction.trim().length === 0}
                onClick={() => void run()}
              >
                {phase === 'running' ? 'running…' : 'Run'}
              </button>
            </div>
          </div>
        )}
        {phase === 'review' && bundle && proposalFile && (
          <div className="ai-review">
            {trace && (
              <span
                className="ai-trace-badge"
                title={`trace ${trace.traceId} — one line in .atomik/usage/private/actions.jsonl on decision; contentRecorded=false`}
              >
                {trace.location} · {trace.estimatedExternalCost.currency === 'EUR' ? '€' : ''}
                {trace.estimatedExternalCost.amount} external · {trace.wallMs} ms ·
                ~{trace.estimatedInputTokens}→{trace.estimatedOutputTokens} tok (est)
              </span>
            )}
            {bundle.blocks.map((block) => (
              <article
                key={block.id}
                className={`ai-block markdown-body role-${block.role ?? 'text'}`}
                dangerouslySetInnerHTML={{ __html: md.render(block.content) }}
              />
            ))}
            {bundle.claims.length > 0 && (
              <div className="ai-claims">
                {bundle.claims.map((claim) => (
                  <div
                    key={claim.id}
                    className={`ai-claim${challengedIds.includes(claim.id) ? ' challenged' : ''}`}
                  >
                    <span className={`truth-chip label-${claim.label}`}>
                      {claim.label}
                    </span>
                    <span className="ai-claim-text" title={claim.text}>
                      {claim.text}
                    </span>
                    <span className="ai-claim-actions">
                      {claim.label === 'source-backed' &&
                        claim.evidenceIds.length > 0 && (
                          <button
                            type="button"
                            title="Open the source anchor in the editor"
                            onClick={() => openEvidence(claim)}
                          >
                            source
                          </button>
                        )}
                      {!applied && !challengedIds.includes(claim.id) && (
                        <button
                          type="button"
                          title="Challenge: qualify this claim in the patch preview"
                          onClick={() => challenge(claim)}
                        >
                          challenge
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="ai-proposal">
              <div className="ai-proposal-head">
                patch → {proposalFile.kind === 'create'
                  ? `create ${proposalFile.relPath}`
                  : proposalFile.kind === 'replace-range'
                    ? 'replace the selection'
                    : 'append to this note'}
                <span className="ai-proposal-hint">
                  {challengedIds.length > 0
                    ? '(repair patch preview — challenged claims qualified below)'
                    : '(editable before accepting)'}
                </span>
              </div>
              <textarea
                rows={6}
                value={editedText}
                onChange={(event) => setEditedText(event.target.value)}
              />
            </div>
            <div className="ai-actions">
              {error && <span className="error editor-msg">{error}</span>}
              {applied && <span className="ai-applied">{applied}</span>}
              <button type="button" onClick={() => void accept()} disabled={!!applied}>
                Accept
              </button>
              <button type="button" onClick={reject}>
                {applied ? 'New operation' : 'Reject'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
