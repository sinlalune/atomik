import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runSidecar } from './sidecar'
import type { TranscriptionAdapter, TranscriptionOutput } from './transcription'

/**
 * The OCR seat (CP-MVP-005 S03; owner decision on the CP-MVP-004
 * evaluation): Qwen3-VL 4B Q4_K_M (Apache-2.0) via llama-mtmd-cli as an
 * ISOLATED sidecar — bounded jobs (image path in, text out), hard
 * timeout with kill, no vault access, weights in the STATE DIR.
 *
 * THE PROVEN HARNESS (S07 addendum 5): the image is PRE-RESIZED in main
 * to the token budget (≈2 500 tokens, dimensions multiples of 28) —
 * never `--image-max-tokens`; llama.cpp's own large-image path stalls
 * this model (dated refs in the record). CUDA tier first with sticky
 * per-session demotion; the CPU floor answers everywhere else
 * (9.5 s GPU / 154 s CPU per dense page on the owner machine).
 */

export type OcrPaths = { binary: string; model: string; mmproj: string; cudaBinary?: string }

/** Injected so the Electron nativeImage implementation stays in main
 *  and tests can stub it (vitest has no Electron runtime). */
export type ImageResizer = (
  srcAbs: string,
  dstAbs: string,
  budgetTokens: number
) => Promise<{ width: number; height: number }>

const OCR_TIMEOUT_MS = 600_000
const TOKEN_BUDGET = 2_500
const PROMPT = 'Transcris fidèlement tout le texte de cette page.'

export function ocrSeatReady(paths: OcrPaths): boolean {
  return existsSync(paths.binary) && existsSync(paths.model) && existsSync(paths.mmproj)
}

export function createQwenVlOcrAdapter(
  paths: OcrPaths,
  resize: ImageResizer
): TranscriptionAdapter {
  let cudaHealthy = paths.cudaBinary !== undefined && existsSync(paths.cudaBinary)
  return {
    id: 'qwen3-vl-4b-ocr',
    transcribe: async (job): Promise<TranscriptionOutput> => {
      const work = mkdtempSync(join(tmpdir(), 'atomik-ocr-'))
      const sized = join(work, 'input.jpg')
      try {
        await resize(job.originalAbs, sized, TOKEN_BUDGET)
        const args = [
          '-m', paths.model, '--mmproj', paths.mmproj,
          '--image', sized, '-p', PROMPT,
          '--temp', '0', '-t', '8', '-c', '8192'
        ]
        let tier: 'cuda' | 'cpu' = cudaHealthy ? 'cuda' : 'cpu'
        let text: string
        if (tier === 'cuda') {
          try {
            text = (await runSidecar(paths.cudaBinary!, [...args, '-ngl', '99'], OCR_TIMEOUT_MS)).trim()
          } catch (cause) {
            cudaHealthy = false
            tier = 'cpu'
            // demotion must be VISIBLE (S04 finding): the tier answering
            // is in every trace, but the WHY only exists right here.
            console.warn('[atomik] ocr cuda tier demoted for this session:', String(cause))
            text = (await runSidecar(paths.binary, args, OCR_TIMEOUT_MS)).trim()
          }
        } else {
          text = (await runSidecar(paths.binary, args, OCR_TIMEOUT_MS)).trim()
        }
        return {
          markdown: text.length > 0 ? text : '*(no text recognized)*',
          model: 'Qwen3-VL-4B-Instruct (Q4_K_M)',
          modelVersion: 'bartowski GGUF, benched 2026-07-08',
          runtime: 'llama.cpp llama-mtmd-cli',
          runtimeVersion: tier === 'cuda' ? 'PR#24975@649864fc6+cuda' : 'PR#24975@649864fc6',
          location: 'local-model',
          // the cleaned scan the model actually read → lands in the
          // dossier as scan.jpg (S05c, owner request)
          scanJpeg: readFileSync(sized)
        }
      } finally {
        rmSync(work, { recursive: true, force: true })
      }
    }
  }
}
