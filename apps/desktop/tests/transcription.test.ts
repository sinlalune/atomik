import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ActionTraceLedger } from '../electron-main/action-trace'
import {
  dossierResource,
  mockTranscriptionAdapter,
  recordTranscriptCorrection,
  transcribeSource,
  withCorrectionRecorded,
  withTranscriptionRecorded
} from '../electron-main/transcription'

/**
 * S06: the transcription seat — contract + deterministic mock. The
 * transcript must be VISIBLY derived, the dossier must record model/
 * runtime/version + correction state, and the run must land ONE
 * ActionTrace line with the transcription fields (33) and no content.
 */

const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.from('pretend-photo-bytes')
])

let vault: string
let stateDir: string
let traces: ActionTraceLedger

function seedBundle(rel = 'sources/captures/pascal'): string {
  const dir = join(vault, rel)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'original.jpg'), JPEG)
  writeFileSync(
    join(dir, 'source.md'),
    [
      '---',
      'type: Atomik Source',
      'title: Pascal page',
      'resource: ./original.jpg',
      'atomik:',
      '  id: capture_x',
      '  source_type: capture',
      '  status: captured',
      '  capture:',
      '    method: local-wifi-qr',
      '---',
      '',
      '# Source dossier',
      '',
      '## Extracted representations',
      '',
      '- None yet — transcription arrives with the adapter (S06).',
      ''
    ].join('\n')
  )
  return `${rel}/source.md`
}

beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), 'atomik-transcribe-vault-'))
  stateDir = mkdtempSync(join(tmpdir(), 'atomik-transcribe-state-'))
  traces = new ActionTraceLedger(stateDir)
})

afterEach(() => {
  rmSync(vault, { recursive: true, force: true })
  rmSync(stateDir, { recursive: true, force: true })
})

function ledgerLines(): Array<Record<string, unknown>> {
  if (!existsSync(traces.ledgerPath())) return []
  return readFileSync(traces.ledgerPath(), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as Record<string, unknown>)
}

describe('mock adapter', () => {
  it('is deterministic and never pretends to have read the image', async () => {
    const job = { originalAbs: '/x/original.jpg', mimeType: 'image/jpeg', bytes: JPEG }
    const first = await mockTranscriptionAdapter.transcribe(job)
    const second = await mockTranscriptionAdapter.transcribe(job)
    expect(first).toEqual(second)
    expect(first.markdown).toContain('No text recognition ran')
    expect(first.markdown).toContain('sha256')
    expect(first.location).toBe('deterministic')
  })
})

describe('transcribeSource pipeline', () => {
  it('creates a visibly derived transcript.md and updates the dossier', async () => {
    const dossierPath = seedBundle()
    const result = await transcribeSource(
      vault,
      dossierPath,
      mockTranscriptionAdapter,
      traces
    )
    expect(result.transcriptPath).toBe('sources/captures/pascal/transcript.md')

    const transcript = readFileSync(join(vault, result.transcriptPath), 'utf8')
    expect(transcript).toContain('type: Atomik Transcript')
    expect(transcript).toContain('derived: true')
    expect(transcript).toContain('correction_state: model-output')
    expect(transcript).toContain('model: atomik-mock-transcriber')
    expect(transcript).toContain(`action_trace_id: ${result.traceId}`)
    expect(transcript).toContain('# Transcript — model output, uncorrected')

    const dossier = readFileSync(join(vault, dossierPath), 'utf8')
    expect(dossier).toContain('  status: transcribed')
    expect(dossier).toContain('    model: atomik-mock-transcriber')
    expect(dossier).toContain('    runtime: deterministic')
    expect(dossier).toContain('    correction_state: model-output')
    expect(dossier).toContain(`    action_trace_id: ${result.traceId}`)
    expect(dossier).toContain('- [Transcript](./transcript.md) — model output, uncorrected.')
    expect(dossier).not.toContain('None yet — transcription arrives')
  })

  it('emits one transcribe trace with the 33 fields and zero content', async () => {
    const dossierPath = seedBundle()
    const result = await transcribeSource(vault, dossierPath, mockTranscriptionAdapter, traces)
    const lines = ledgerLines()
    expect(lines).toHaveLength(1)
    const line = lines[0]!
    expect(line['id']).toBe(result.traceId)
    expect(line['action']).toBe('transcribe')
    const execution = line['execution'] as Record<string, unknown>
    expect(execution['location']).toBe('deterministic')
    expect(execution['model']).toBe('atomik-mock-transcriber')
    expect(execution['runtime']).toBe('deterministic')
    const input = line['input'] as Record<string, unknown>
    expect(input['bytes']).toBe(JPEG.length)
    expect(input['audioSeconds']).toBeNull()
    expect((input['contentHashes'] as string[])[0]).toMatch(/^[a-f0-9]{64}$/)
    expect((line['privacy'] as Record<string, unknown>)['contentRecorded']).toBe(false)
    expect((line['outcome'] as Record<string, unknown>)['status']).toBe('completed')
    // No transcript prose in telemetry.
    const raw = readFileSync(traces.ledgerPath(), 'utf8')
    expect(raw).not.toContain('No text recognition ran')
  })

  it('refuses to clobber an existing transcript (corrections live there)', async () => {
    const dossierPath = seedBundle()
    writeFileSync(
      join(vault, 'sources/captures/pascal/transcript.md'),
      'human corrected content\n'
    )
    await expect(
      transcribeSource(vault, dossierPath, mockTranscriptionAdapter, traces)
    ).rejects.toThrow(/already exists/)
    expect(
      readFileSync(join(vault, 'sources/captures/pascal/transcript.md'), 'utf8')
    ).toBe('human corrected content\n')
    // the dossier stayed untouched too
    expect(readFileSync(join(vault, dossierPath), 'utf8')).toContain('status: captured')
  })

  it('rejects non-dossier paths and missing resources', async () => {
    await expect(
      transcribeSource(vault, '../outside/source.md', mockTranscriptionAdapter, traces)
    ).rejects.toThrow(/rejected dossier path/)
    const dir = join(vault, 'plain')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.md'), '# no frontmatter\n')
    await expect(
      transcribeSource(vault, 'plain/source.md', mockTranscriptionAdapter, traces)
    ).rejects.toThrow(/declares no resource/)
  })

  it('records a failed line when the adapter throws', async () => {
    const dossierPath = seedBundle()
    const failing = {
      id: 'boom',
      transcribe: () => Promise.reject(new Error('adapter exploded'))
    }
    await expect(
      transcribeSource(vault, dossierPath, failing, traces)
    ).rejects.toThrow('adapter exploded')
    const lines = ledgerLines()
    expect(lines).toHaveLength(1)
    expect((lines[0]!['outcome'] as Record<string, unknown>)['status']).toBe('failed')
    expect(existsSync(join(vault, 'sources/captures/pascal/transcript.md'))).toBe(false)
  })
})

describe('pure pieces', () => {
  it('dossierResource strips angle brackets and needs frontmatter', () => {
    expect(dossierResource('---\nresource: <./a b.jpg>\n---\n')).toBe('./a b.jpg')
    expect(dossierResource('resource: ./x.jpg\n')).toBeNull()
  })

  it('withTranscriptionRecorded is a no-op on non-frontmatter content', () => {
    const output = {
      markdown: '',
      model: 'm',
      modelVersion: '1',
      runtime: 'r',
      runtimeVersion: '1',
      location: 'deterministic' as const
    }
    expect(withTranscriptionRecorded('# plain\n', output, 't', 'iso')).toBe('# plain\n')
  })
})

describe('human correction flow (S07)', () => {
  async function transcribedBundle(): Promise<string> {
    const dossierPath = seedBundle()
    await transcribeSource(vault, dossierPath, mockTranscriptionAdapter, traces)
    return dossierPath
  }

  it('an editor save of transcript.md flips the dossier to human-corrected', async () => {
    const dossierPath = await transcribedBundle()
    // the editor save itself: user content lands byte-exact first
    writeFileSync(
      join(vault, 'sources/captures/pascal/transcript.md'),
      'my corrected reading of the page\n'
    )
    const flipped = recordTranscriptCorrection(
      vault,
      'sources/captures/pascal/transcript.md',
      () => Date.UTC(2026, 6, 7, 15)
    )
    expect(flipped).toBe(true)
    const dossier = readFileSync(join(vault, dossierPath), 'utf8')
    expect(dossier).toContain('    correction_state: human-corrected')
    expect(dossier).toContain('    corrected_at: 2026-07-07T15:00:00.000Z')
    expect(dossier).toContain('- [Transcript](./transcript.md) — human-corrected.')
    expect(dossier).not.toContain('correction_state: model-output')
    // the transcript file itself keeps the user's exact bytes
    expect(
      readFileSync(join(vault, 'sources/captures/pascal/transcript.md'), 'utf8')
    ).toBe('my corrected reading of the page\n')
  })

  it('flips exactly once: a second save is a no-op', async () => {
    const dossierPath = await transcribedBundle()
    expect(recordTranscriptCorrection(vault, 'sources/captures/pascal/transcript.md')).toBe(true)
    const after = readFileSync(join(vault, dossierPath), 'utf8')
    expect(recordTranscriptCorrection(vault, 'sources/captures/pascal/transcript.md')).toBe(false)
    expect(readFileSync(join(vault, dossierPath), 'utf8')).toBe(after)
  })

  it('ignores non-transcript saves and orphan transcripts', async () => {
    const dossierPath = await transcribedBundle()
    expect(recordTranscriptCorrection(vault, dossierPath)).toBe(false)
    mkdirSync(join(vault, 'loose'), { recursive: true })
    writeFileSync(join(vault, 'loose/transcript.md'), 'orphan\n')
    expect(recordTranscriptCorrection(vault, 'loose/transcript.md')).toBe(false)
  })

  it('withCorrectionRecorded is pure and gated on model-output', () => {
    expect(withCorrectionRecorded('# plain\n', 'iso')).toBe('# plain\n')
    expect(
      withCorrectionRecorded('---\ntitle: x\n---\nbody\n', 'iso')
    ).toBe('---\ntitle: x\n---\nbody\n')
  })
})

describe('audio companion (S08) — same adapter contract', () => {
  it('transcribes an audio original through the identical pipeline', async () => {
    const dir = join(vault, 'sources/captures/memo')
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'original.m4a'),
      Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypM4A audio')])
    )
    writeFileSync(
      join(dir, 'source.md'),
      [
        '---',
        'type: Atomik Source',
        'title: Voice memo',
        'resource: ./original.m4a',
        'atomik:',
        '  id: capture_a',
        '  status: captured',
        '  capture:',
        '    method: local-wifi-qr',
        '---',
        '',
        '## Extracted representations',
        '',
        '- None yet — transcription arrives with the adapter (S06).',
        ''
      ].join('\n')
    )
    const result = await transcribeSource(
      vault,
      'sources/captures/memo/source.md',
      mockTranscriptionAdapter,
      traces
    )
    const transcript = readFileSync(join(vault, result.transcriptPath), 'utf8')
    expect(transcript).toContain('resource: ./original.m4a')
    expect(transcript).toContain('mime     : audio/mp4')
    const line = ledgerLines()[0]!
    expect(line['action']).toBe('transcribe')
    // honest: the mock decodes nothing, so no duration is manufactured
    expect((line['input'] as Record<string, unknown>)['audioSeconds']).toBeNull()
  })
})

describe('whisper.cpp seat (S05) — bounded sidecar', () => {
  it('pipes decode→transcribe with real subprocesses and reports identity', async () => {
    const { createWhisperCppAdapter, whisperSeatReady } = await import('../electron-main/whisper-adapter')
    const bin = mkdtempSync(join(tmpdir(), 'atomik-seat-'))
    const fakeFfmpeg = join(bin, 'ffmpeg')
    const fakeWhisper = join(bin, 'whisper-cli')
    // fake ffmpeg writes a 1s 16k wav; fake whisper prints a transcript
    writeFileSync(fakeFfmpeg, `#!/bin/bash\nout="\${@: -1}"\nhead -c 32044 /dev/zero > "$out"\n`, { mode: 0o755 })
    writeFileSync(fakeWhisper, '#!/bin/bash\necho "bonjour benchmark"\n', { mode: 0o755 })
    const paths = { binary: fakeWhisper, model: fakeFfmpeg, ffmpeg: fakeFfmpeg }
    expect(whisperSeatReady(paths)).toBe(true)
    const out = await createWhisperCppAdapter(paths).transcribe({
      originalAbs: '/x/original.m4a', mimeType: 'audio/mp4', bytes: JPEG
    })
    expect(out.markdown).toBe('bonjour benchmark')
    expect(out.runtime).toBe('whisper.cpp')
    expect(out.location).toBe('local-model')
    expect(out.audioSeconds).toBeCloseTo(1, 1)
    expect(whisperSeatReady({ ...paths, ffmpeg: '/nope' })).toBe(false)
    rmSync(bin, { recursive: true, force: true })
  })
})
