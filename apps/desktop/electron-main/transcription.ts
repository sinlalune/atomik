import { createHash } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'
import type { TranscribeResult } from '../shared/ipc-contract'
import type { ActionTraceLedger } from './action-trace'
import { assertInsideVault, readNote, resolveNotePath, writeNote } from './vault'

/**
 * The transcription seat (07 §audio/video adapter, 08 §truth treatment;
 * S06) — mock-first like the AI seat (S08 pattern): the ADAPTER CONTRACT
 * is the deliverable, the deterministic mock proves the pipeline, and a
 * REAL local runtime may take the seat only through a dated capability
 * evaluation (34) — never by default.
 *
 * Truth slice (08): `transcript.md` is a DERIVED representation and says
 * so in its own frontmatter and banner; the mock never pretends to read
 * the image (a fabricated transcript would be the exact dishonesty 08
 * forbids: model output presented as verbatim). The dossier records
 * model/runtime/version + correction state; every run emits an
 * ActionTrace with the transcription fields (33).
 */

export type TranscriptionJob = {
  /** Absolute path of the original media. */
  originalAbs: string
  mimeType: string
  bytes: Buffer
}

export type TranscriptionOutput = {
  /** Markdown BODY of the transcript (the pipeline composes the file). */
  markdown: string
  model: string
  modelVersion: string
  runtime: string
  runtimeVersion: string
  location: 'deterministic' | 'local-model' | 'cloud-model'
}

export interface TranscriptionAdapter {
  readonly id: string
  transcribe(job: TranscriptionJob): Promise<TranscriptionOutput>
}

/**
 * Deterministic mock: same bytes → same output, and the output states
 * plainly that no recognition ran. It proves the pipeline (file shapes,
 * dossier updates, traces, correction flow) without fabricating content.
 */
export const mockTranscriptionAdapter: TranscriptionAdapter = {
  id: 'mock',
  transcribe: (job) => {
    const sha256 = createHash('sha256').update(job.bytes).digest('hex')
    return Promise.resolve({
      markdown: [
        'No text recognition ran: this transcript was produced by the',
        'deterministic MOCK adapter, which proves the capture→transcript',
        'pipeline without pretending to read the original. Replace it by',
        'a real local runtime through a dated capability evaluation (34).',
        '',
        '```text',
        `original : ${basename(job.originalAbs)}`,
        `mime     : ${job.mimeType}`,
        `bytes    : ${job.bytes.length}`,
        `sha256   : ${sha256}`,
        '```',
        '',
        'Write the actual transcription below this line, then the dossier',
        'correction state flips to human-corrected (S07).',
        ''
      ].join('\n'),
      model: 'atomik-mock-transcriber',
      modelVersion: '0.1.0',
      runtime: 'deterministic',
      runtimeVersion: 'built-in',
      location: 'deterministic'
    })
  }
}

const IMAGE_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif'
}

/** Frontmatter `resource:` of a dossier (main-side twin of the renderer
 *  parse; kept local — main must not import renderer modules). */
export function dossierResource(content: string): string | null {
  const fence = /^---\n([\s\S]*?)\n---/.exec(content)
  if (!fence) return null
  const line = /^resource:\s*(.+)\s*$/m.exec(fence[1]!)
  return line ? line[1]!.trim().replace(/^<|>$/g, '') : null
}

/** The transcript file: visibly derived from its first byte (08). */
export function transcriptDocument(
  output: TranscriptionOutput,
  originalName: string,
  traceId: string,
  iso: string
): string {
  return [
    '---',
    'type: Atomik Transcript',
    `description: DERIVED representation of ./${originalName} — model output, not verified verbatim.`,
    `resource: ./${originalName}`,
    'tags: [transcript, derived]',
    `timestamp: ${iso}`,
    'atomik:',
    '  derived: true',
    '  source: ./source.md',
    '  correction_state: model-output',
    '  transcription:',
    `    adapter: ${output.model === 'atomik-mock-transcriber' ? 'mock' : output.model}`,
    `    model: ${output.model}`,
    `    model_version: ${output.modelVersion}`,
    `    runtime: ${output.runtime}`,
    `    runtime_version: ${output.runtimeVersion}`,
    `    location: ${output.location}`,
    `    transcribed_at: ${iso}`,
    `    action_trace_id: ${traceId}`,
    '---',
    '',
    '# Transcript — model output, uncorrected',
    '',
    `> Derived from [the original](./${originalName}) by ${output.model}`,
    `> ${output.modelVersion} (${output.location}). The original stays the`,
    '> evidence; correct this text freely — your corrections are the point.',
    '',
    output.markdown
  ].join('\n')
}

/**
 * The dossier after a transcription: status flips to `transcribed`, the
 * transcription identity lands in the frontmatter, and the extracted-
 * representations seat links the transcript. Pure.
 */
export function withTranscriptionRecorded(
  dossier: string,
  output: TranscriptionOutput,
  traceId: string,
  iso: string
): string {
  const fence = /^---\n([\s\S]*?)\n---/.exec(dossier)
  if (!fence) return dossier
  let frontmatter = fence[1]!
  frontmatter = frontmatter.replace(
    /^( {2}status:) .*$/m,
    (_match, key: string) => `${key} transcribed`
  )
  const block = [
    '  transcription:',
    `    model: ${output.model}`,
    `    model_version: ${output.modelVersion}`,
    `    runtime: ${output.runtime}`,
    `    runtime_version: ${output.runtimeVersion}`,
    `    location: ${output.location}`,
    `    transcribed_at: ${iso}`,
    '    correction_state: model-output',
    `    action_trace_id: ${traceId}`
  ].join('\n')
  frontmatter = `${frontmatter}\n${block}`
  let next = dossier.replace(fence[0], () => `---\n${frontmatter}\n---`)
  next = next.replace(
    /^- None yet — transcription arrives with the adapter \(S06\)\.$/m,
    '- [Transcript](./transcript.md) — model output, uncorrected.'
  )
  return next
}

/**
 * The pipeline: dossier → original → adapter → transcript.md + dossier
 * update + ActionTrace. Refuses to clobber an existing transcript (the
 * human corrections of S07 live there; delete it explicitly to re-run).
 */
export async function transcribeSource(
  vaultRoot: string,
  dossierRelPath: unknown,
  adapter: TranscriptionAdapter,
  traces: ActionTraceLedger,
  now: () => number = Date.now
): Promise<TranscribeResult> {
  const started = now()
  const dossierAbs = resolveNotePath(vaultRoot, dossierRelPath)
  if (!dossierAbs || basename(dossierAbs) !== 'source.md') {
    throw new Error('transcription: rejected dossier path')
  }
  const dossier = readNote(vaultRoot, dossierRelPath)

  const resource = dossierResource(dossier.content)
  if (!resource) throw new Error('transcription: dossier declares no resource')
  const mimeType = IMAGE_MIME[extname(resource).toLowerCase()]
  if (!mimeType) {
    throw new Error(`transcription: unsupported resource type — ${resource}`)
  }
  const originalAbs = resolve(dirname(dossierAbs), resource)
  assertInsideVault(vaultRoot, dirname(dossierAbs))
  if (!existsSync(originalAbs)) {
    throw new Error(`transcription: original not found — ${resource}`)
  }
  assertInsideVault(vaultRoot, originalAbs)

  const transcriptAbs = join(dirname(dossierAbs), 'transcript.md')
  if (existsSync(transcriptAbs)) {
    throw new Error(
      'transcription: transcript.md already exists — corrections live there; delete it to re-run'
    )
  }

  const bytes = readFileSync(originalAbs)
  const contentSha256 = createHash('sha256').update(bytes).digest('hex')
  // The id exists before the run so the FILES can reference the trace;
  // exactly one line is appended either way (completed or failed).
  const traceId = traces.newTraceId()
  try {
    const output = await adapter.transcribe({ originalAbs, mimeType, bytes })
    const iso = new Date(now()).toISOString()
    writeFileSync(
      transcriptAbs,
      transcriptDocument(output, basename(originalAbs), traceId, iso),
      { flag: 'wx' }
    )
    try {
      writeNote(
        vaultRoot,
        dossierRelPath,
        withTranscriptionRecorded(dossier.content, output, traceId, iso),
        dossier.mtimeMs
      )
    } catch (error) {
      rmSync(transcriptAbs, { force: true })
      throw error
    }
    traces.recordTranscription({
      id: traceId,
      output,
      inputBytes: bytes.length,
      contentSha256,
      wallMs: now() - started,
      status: 'completed'
    })
    const transcriptPath = `${(dossierRelPath as string).replace(/\/source\.md$/, '')}/transcript.md`
    return { transcriptPath, traceId }
  } catch (error) {
    traces.recordTranscription({
      id: traceId,
      output: null,
      inputBytes: bytes.length,
      contentSha256,
      wallMs: now() - started,
      status: 'failed'
    })
    throw error
  }
}
