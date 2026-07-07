import { execFile } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TranscriptionAdapter, TranscriptionOutput } from './transcription'

/**
 * The REAL seat (CP-MVP-004 S05; winner of the dated evaluation):
 * whisper.cpp `small` multilingual as an ISOLATED sidecar (13 §local
 * inference) — bounded jobs only (media path in, text out), hard
 * timeouts with kill, no vault access, model files in the STATE DIR.
 * ffmpeg (system) decodes originals to 16 kHz WAV first — whisper-cli
 * reads wav/mp3/flac only. When any piece is missing, main falls back
 * to the mock: capture must never block on a runtime (08).
 */

export type WhisperPaths = { binary: string; model: string; ffmpeg: string }

const DECODE_TIMEOUT_MS = 120_000
const TRANSCRIBE_TIMEOUT_MS = 600_000

function run(cmd: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { timeout: timeoutMs, killSignal: 'SIGKILL', maxBuffer: 32 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) reject(new Error(`transcription: ${cmd} failed — ${stderr.slice(0, 300) || error.message}`))
        else resolve(stdout)
      }
    )
  })
}

export function whisperSeatReady(paths: WhisperPaths): boolean {
  return existsSync(paths.binary) && existsSync(paths.model) && existsSync(paths.ffmpeg)
}

export function createWhisperCppAdapter(paths: WhisperPaths): TranscriptionAdapter {
  return {
    id: 'whisper.cpp-small',
    transcribe: async (job): Promise<TranscriptionOutput> => {
      const work = mkdtempSync(join(tmpdir(), 'atomik-whisper-'))
      const wav = join(work, 'input.wav')
      try {
        await run(paths.ffmpeg, ['-y', '-i', job.originalAbs, '-ar', '16000', '-ac', '1', wav], DECODE_TIMEOUT_MS)
        const audioSeconds = Math.max(0, (statSync(wav).size - 44) / 2 / 16000)
        const text = (
          await run(paths.binary, ['-m', paths.model, '-f', wav, '-t', '8', '-np', '-nt', '-l', 'auto'], TRANSCRIBE_TIMEOUT_MS)
        ).trim()
        return {
          markdown: text.length > 0 ? text : '*(no speech recognized)*',
          model: 'whisper-small-multilingual (ggml)',
          modelVersion: 'ggml-small 2026 snapshot',
          runtime: 'whisper.cpp',
          runtimeVersion: 'v1.8.6',
          location: 'local-model',
          audioSeconds
        }
      } finally {
        rmSync(work, { recursive: true, force: true })
      }
    }
  }
}
