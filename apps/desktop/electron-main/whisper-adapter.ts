import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runSidecar } from './sidecar'
import type { TranscriptionAdapter, TranscriptionOutput } from './transcription'

/**
 * The REAL seat (CP-MVP-004 S05; winner of the dated evaluation):
 * whisper.cpp `small` multilingual as an ISOLATED sidecar (13 §local
 * inference) — bounded jobs only (media path in, text out), hard
 * timeouts with kill, no vault access, model files in the STATE DIR.
 * ffmpeg (system) decodes originals to 16 kHz WAV first — whisper-cli
 * reads wav/mp3/flac only. When any piece is missing, main falls back
 * to the mock: capture must never block on a runtime (08).
 *
 * CP-MVP-005 S02 adds the CUDA tier: an optional second binary tried
 * first and demoted (per session) on its first failure. The identity
 * in traces says which tier answered (`runtimeVersion` +cuda suffix).
 */

export type WhisperPaths = { binary: string; model: string; ffmpeg: string; cudaBinary?: string }

const DECODE_TIMEOUT_MS = 120_000
const TRANSCRIBE_TIMEOUT_MS = 600_000

const run = runSidecar

/** whisper.cpp -oj JSON → time anchors; tolerant of shape drift. */
export function parseWhisperSegments(
  json: string
): Array<{ startMs: number; endMs: number; text: string }> {
  try {
    const parsed = JSON.parse(json) as {
      transcription?: Array<{ offsets?: { from?: number; to?: number }; text?: string }>
    }
    return (parsed.transcription ?? [])
      .filter((s) => typeof s.text === 'string' && s.offsets)
      .map((s) => ({
        startMs: s.offsets!.from ?? 0,
        endMs: s.offsets!.to ?? 0,
        text: (s.text ?? '').trim()
      }))
  } catch {
    return []
  }
}

export function whisperSeatReady(paths: WhisperPaths): boolean {
  return existsSync(paths.binary) && existsSync(paths.model) && existsSync(paths.ffmpeg)
}

export function createWhisperCppAdapter(paths: WhisperPaths): TranscriptionAdapter {
  // CUDA is this machine's bonus tier (33): tried first while healthy,
  // demoted for the session on its first failure so later jobs pay no
  // failing attempt — the CPU floor stays the answer everywhere else.
  let cudaHealthy = paths.cudaBinary !== undefined && existsSync(paths.cudaBinary)
  return {
    id: 'whisper.cpp-small',
    transcribe: async (job): Promise<TranscriptionOutput> => {
      const work = mkdtempSync(join(tmpdir(), 'atomik-whisper-'))
      const wav = join(work, 'input.wav')
      try {
        await run(paths.ffmpeg, ['-y', '-i', job.originalAbs, '-ar', '16000', '-ac', '1', wav], DECODE_TIMEOUT_MS)
        const audioSeconds = Math.max(0, (statSync(wav).size - 44) / 2 / 16000)
        const outBase = join(work, 'out')
        const args = ['-m', paths.model, '-f', wav, '-t', '8', '-np', '-nt', '-l', 'auto', '-oj', '-of', outBase]
        let tier: 'cuda' | 'cpu' = cudaHealthy ? 'cuda' : 'cpu'
        let text: string
        if (tier === 'cuda') {
          try {
            text = (await run(paths.cudaBinary!, args, TRANSCRIBE_TIMEOUT_MS)).trim()
          } catch {
            cudaHealthy = false
            tier = 'cpu'
            text = (await run(paths.binary, args, TRANSCRIBE_TIMEOUT_MS)).trim()
          }
        } else {
          text = (await run(paths.binary, args, TRANSCRIBE_TIMEOUT_MS)).trim()
        }
        const segments = parseWhisperSegments(
          existsSync(`${outBase}.json`) ? readFileSync(`${outBase}.json`, 'utf8') : ''
        )
        return {
          markdown: text.length > 0 ? text : '*(no speech recognized)*',
          model: 'whisper-small-multilingual (ggml)',
          modelVersion: 'ggml-small 2026 snapshot',
          runtime: 'whisper.cpp',
          runtimeVersion: tier === 'cuda' ? 'v1.8.6+cuda' : 'v1.8.6',
          location: 'local-model',
          audioSeconds,
          ...(segments.length > 0 ? { segments } : {})
        }
      } finally {
        rmSync(work, { recursive: true, force: true })
      }
    }
  }
}
