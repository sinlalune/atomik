import { createHash } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'
import type { TranscribeResult } from '../shared/ipc-contract'
import type { ActionTraceLedger } from './action-trace'
import { assertInsideVault, readNote, resolveNotePath, sourceAssetRotation, writeNote } from './vault'

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
  /** Dossier-recorded display rotation (degrees CW) — the OCR seat
   *  uprights the image before recognition (S07 note); the original
   *  stays byte-untouched. */
  rotation?: number
}

export type TranscriptionOutput = {
  /** Markdown BODY of the transcript (the pipeline composes the file). */
  markdown: string
  model: string
  modelVersion: string
  runtime: string
  runtimeVersion: string
  location: 'deterministic' | 'local-model' | 'cloud-model'
  /** Runtime-reported duration; null when the adapter decodes nothing. */
  audioSeconds?: number
  /** Optional time anchors (07 sidecar rules): written as segments.json
   *  beside the transcript — a machine aid, never the canonical text. */
  segments?: Array<{ startMs: number; endMs: number; text: string }>
  /** Optional cleaned scan (CP-MVP-005 S05c): the pre-processed image
   *  the OCR model actually read — landed as scan.jpg beside the
   *  transcript. Machine-derived and regenerable; the ORIGINAL stays
   *  the evidence, always. */
  scanJpeg?: Buffer
}

export interface TranscriptionAdapter {
  readonly id: string
  transcribe(job: TranscriptionJob): Promise<TranscriptionOutput>
}

/**
 * Media router (CP-MVP-005 S03): one seat per media family — images go
 * to the OCR adapter, audio to the speech adapter. Pure composition;
 * identity in the output always comes from the adapter that answered.
 */
export function routeByMedia(
  audio: TranscriptionAdapter,
  ocr: TranscriptionAdapter
): TranscriptionAdapter {
  return {
    id: 'media-router',
    transcribe: (job) => (job.mimeType.startsWith('image/') ? ocr : audio).transcribe(job)
  }
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


const MEDIA_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  // the audio companion (S08) rides the SAME adapter contract
  '.m4a': 'audio/mp4',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
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
    ...(output.segments && output.segments.length > 0
      ? ['Time anchors: [segments.json](./segments.json) — machine sidecar (07); this file stays the canonical text.', '']
      : []),
    ...(output.scanJpeg
      ? ['Cleaned scan: [scan.jpg](./scan.jpg) — the flattened image the model read; the original stays the evidence.', '']
      : []),
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
    output.scanJpeg
      ? '- [Transcript](./transcript.md) — model output, uncorrected.\n- [Cleaned scan](./scan.jpg) — machine-derived image the model read.'
      : '- [Transcript](./transcript.md) — model output, uncorrected.'
  )
  return next
}

const INDEX_TRANSCRIPT_LINE = '- [transcript.md](./transcript.md) — derived transcript.'
const INDEX_SCAN_LINE = '- [scan.jpg](./scan.jpg) — cleaned scan the model read.'

/** index.md is the bundle's human directory map (S05h): transcription
 *  extends it, reset prunes it. Idempotent, tolerant of hand edits. */
export function withIndexLinks(index: string, hasScan: boolean): string {
  let next = index.trimEnd()
  if (!next.includes('](./transcript.md)')) next = `${next}\n${INDEX_TRANSCRIPT_LINE}`
  if (hasScan && !next.includes('](./scan.jpg)')) next = `${next}\n${INDEX_SCAN_LINE}`
  return `${next}\n`
}

export function withIndexLinksCleared(index: string): string {
  const kept = index
    .split('\n')
    .filter((line) => !line.includes('](./transcript.md)') && !line.includes('](./scan.jpg)'))
  return kept.join('\n')
}

/**
 * The dossier after a transcript deletion (S05h — the explicit re-run
 * affordance): the transcription block leaves the frontmatter, status
 * returns to captured, and the extracted-representations seat goes back
 * to its empty line so a re-run records cleanly. Pure.
 */
export function withTranscriptionCleared(dossier: string): string {
  const fence = /^---\n([\s\S]*?)\n---/.exec(dossier)
  if (!fence) return dossier
  const frontmatter = fence[1]!
    .replace(/\n {2}transcription:(?:\n {4}.*)*/g, '')
    .replace(/^( {2}status:) transcribed$/m, (_m, key: string) => `${key} captured`)
  let next = dossier.replace(fence[0], () => `---\n${frontmatter}\n---`)
  next = next.replace(
    /^- \[Transcript\]\(\.\/transcript\.md\) — (?:model output, uncorrected|human-corrected)\.(?:\n- \[Cleaned scan\]\(\.\/scan\.jpg\) — machine-derived image the model read\.)?$/m,
    '- None yet — transcription arrives with the adapter (S06).'
  )
  return next
}

/**
 * The explicit deletion behind the re-run affordance: transcript,
 * segments, and scan leave the bundle; the dossier and index are
 * restored to their pre-transcription shape. The confirmation lives in
 * the renderer — this function assumes the user already said yes.
 */
export function resetTranscription(
  vaultRoot: string,
  dossierRelPath: unknown,
  now: () => number = Date.now
): void {
  const dossierAbs = resolveNotePath(vaultRoot, dossierRelPath)
  if (!dossierAbs || basename(dossierAbs) !== 'source.md') {
    throw new Error('transcription: rejected dossier path')
  }
  const dir = dirname(dossierAbs)
  const transcriptAbs = join(dir, 'transcript.md')
  if (!existsSync(transcriptAbs)) {
    throw new Error('transcription: no transcript to delete')
  }
  const dossier = readNote(vaultRoot, dossierRelPath)
  rmSync(transcriptAbs, { force: true })
  rmSync(join(dir, 'segments.json'), { force: true })
  rmSync(join(dir, 'scan.jpg'), { force: true })
  writeNote(
    vaultRoot,
    dossierRelPath,
    withTranscriptionCleared(dossier.content),
    dossier.mtimeMs
  )
  try {
    const indexRel = (dossierRelPath as string).replace(/source\.md$/, 'index.md')
    const index = readNote(vaultRoot, indexRel)
    writeNote(vaultRoot, indexRel, withIndexLinksCleared(index.content), index.mtimeMs)
  } catch {
    // the map is best-effort — its absence or a race never blocks
  }
  void now
}

/**
 * The dossier after a human correction (S07): the correction state flips
 * to human-corrected with its date, and the extracted-representations
 * line says so. Pure; a no-op on anything not in model-output state.
 */
export function withCorrectionRecorded(dossier: string, iso: string): string {
  const fence = /^---\n([\s\S]*?)\n---/.exec(dossier)
  if (!fence) return dossier
  if (!/^ {4}correction_state: model-output$/m.test(fence[1]!)) return dossier
  const frontmatter = fence[1]!.replace(
    /^ {4}correction_state: model-output$/m,
    `    correction_state: human-corrected\n    corrected_at: ${iso}`
  )
  let next = dossier.replace(fence[0], () => `---\n${frontmatter}\n---`)
  next = next.replace(
    /^- \[Transcript\]\(\.\/transcript\.md\) — model output, uncorrected\.$/m,
    '- [Transcript](./transcript.md) — human-corrected.'
  )
  return next
}

/**
 * The PDF twin (CP-MVP-003 S06): editing extracted.md flips the dossier
 * to a corrected extraction. The extraction block gains a corrected_at
 * (it carried no correction_state), and the representations line says
 * so. Pure; idempotent (a second save is a no-op).
 */
export function withExtractionCorrectionRecorded(dossier: string, iso: string): string {
  const fence = /^---\n([\s\S]*?)\n---/.exec(dossier)
  if (!fence) return dossier
  if (!/^ {2}extracted_text: \.\/extracted\.md$/m.test(fence[1]!)) return dossier
  if (/^ {2}extraction_corrected_at:/m.test(fence[1]!)) return dossier
  const frontmatter = fence[1]!.replace(
    /^( {2}extracted_text: \.\/extracted\.md)$/m,
    `$1\n  extraction_corrected_at: ${iso}`
  )
  let next = dossier.replace(fence[0], () => `---\n${frontmatter}\n---`)
  next = next.replace(
    /^- \[Extracted text\]\(\.\/extracted\.md\) — derived, uncorrected\.$/m,
    '- [Extracted text](./extracted.md) — human-corrected.'
  )
  return next
}

/**
 * The S07 hook, called by main after ANY successful note save: when the
 * saved file is a bundle's transcript.md and its dossier still records
 * model-output, the dossier flips to human-corrected — an editor save IS
 * the human touching the transcript (saves only fire on real edits). The
 * transcript's own bytes are never modified here: the save is the
 * user's, byte-exact (27); the DOSSIER is where correction state lives
 * (07/08). Returns whether a flip happened.
 */
export function recordTranscriptCorrection(
  vaultRoot: string,
  savedRelPath: string,
  now: () => number = Date.now
): boolean {
  const base = basename(savedRelPath)
  // one hook, two derived files: transcript.md and extracted.md (S06)
  const flip =
    base === 'transcript.md'
      ? { source: /transcript\.md$/, apply: withCorrectionRecorded }
      : base === 'extracted.md'
        ? { source: /extracted\.md$/, apply: withExtractionCorrectionRecorded }
        : null
  if (!flip) return false
  const dossierRel = savedRelPath.replace(flip.source, 'source.md')
  const dossierAbs = resolveNotePath(vaultRoot, dossierRel)
  if (!dossierAbs || !existsSync(dossierAbs)) return false
  const dossier = readNote(vaultRoot, dossierRel)
  const updated = flip.apply(dossier.content, new Date(now()).toISOString())
  if (updated === dossier.content) return false
  writeNote(vaultRoot, dossierRel, updated, dossier.mtimeMs)
  return true
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
  const mimeType = MEDIA_MIME[extname(resource).toLowerCase()]
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
    const output = await adapter.transcribe({
      originalAbs,
      mimeType,
      bytes,
      rotation: sourceAssetRotation(originalAbs)
    })
    const iso = new Date(now()).toISOString()
    writeFileSync(
      transcriptAbs,
      transcriptDocument(output, basename(originalAbs), traceId, iso),
      { flag: 'wx' }
    )
    const segmentsAbs = join(dirname(dossierAbs), 'segments.json')
    if (output.segments && output.segments.length > 0) {
      writeFileSync(
        segmentsAbs,
        `${JSON.stringify({ generatedBy: output.model, unit: 'ms', segments: output.segments }, null, 2)}\n`,
        { flag: 'wx' }
      )
    }
    const scanAbs = join(dirname(dossierAbs), 'scan.jpg')
    if (output.scanJpeg) {
      // plain write, not wx: a pure machine derivative — re-running the
      // adapter legitimately regenerates it (the transcript's wx above
      // stays the gate on re-runs).
      writeFileSync(scanAbs, output.scanJpeg)
    }
    try {
      writeNote(
        vaultRoot,
        dossierRelPath,
        withTranscriptionRecorded(dossier.content, output, traceId, iso),
        dossier.mtimeMs
      )
    } catch (error) {
      rmSync(transcriptAbs, { force: true })
      rmSync(segmentsAbs, { force: true })
      if (output.scanJpeg) rmSync(scanAbs, { force: true })
      throw error
    }
    try {
      // the human directory map follows (S05h) — best-effort, never
      // failing a completed transcription over the map
      const indexRel = (dossierRelPath as string).replace(/source\.md$/, 'index.md')
      const index = readNote(vaultRoot, indexRel)
      writeNote(vaultRoot, indexRel, withIndexLinks(index.content, Boolean(output.scanJpeg)), index.mtimeMs)
    } catch {
      /* tolerated */
    }
    traces.recordTranscription({
      id: traceId,
      output,
      inputBytes: bytes.length,
      contentSha256,
      audioSeconds: output.audioSeconds ?? null,
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
      audioSeconds: null,
      wallMs: now() - started,
      status: 'failed'
    })
    throw error
  }
}
