import { readFileSync } from 'node:fs'
import type { TranscriptionAdapter } from './transcription'

/**
 * The cloud OCR rung (CP-MVP-005 S05; owner decision): Mistral OCR as
 * an EXPLICIT per-capture action — never a silent fallback (13:
 * "require explicit policy before any local failure falls back to
 * cloud"). The key lives main-process only (env or the git-ignored
 * .env.local); the renderer sees a typed channel and nothing else.
 * Output is visibly cloud-derived (28): `location: 'cloud-model'` +
 * provider identity land in the transcript frontmatter, the dossier,
 * and the trace. The model id is PINNED — a dated seat, benched
 * letter-perfect on the bench scans (2026-07-08); upgrades are a new
 * dated decision, not a silent alias drift.
 */

export const MISTRAL_OCR_MODEL = 'mistral-ocr-4-0'
const API_URL = 'https://api.mistral.ai/v1/ocr'
const TIMEOUT_MS = 180_000

/** Env first, then the git-ignored .env.local (dev reality). Never the
 *  renderer, never the repo. */
export function resolveMistralKey(env: NodeJS.ProcessEnv, envLocalAbs: string): string | null {
  const fromEnv = env['MISTRAL_API_KEY']?.trim()
  if (fromEnv) return fromEnv
  try {
    const line = /^MISTRAL_API_KEY=(.+)$/m.exec(readFileSync(envLocalAbs, 'utf8'))
    const value = line?.[1]?.trim().replace(/^"|"$/g, '')
    return value && value.length > 0 ? value : null
  } catch {
    return null
  }
}

type OcrResponse = { pages?: Array<{ markdown?: string }>; model?: string }

export function createMistralOcrAdapter(
  key: string,
  fetchImpl: typeof fetch = fetch
): TranscriptionAdapter {
  return {
    id: 'mistral-ocr',
    transcribe: async (job) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
      try {
        const response = await fetchImpl(API_URL, {
          method: 'POST',
          headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            model: MISTRAL_OCR_MODEL,
            document: {
              type: 'image_url',
              image_url: `data:${job.mimeType};base64,${job.bytes.toString('base64')}`
            },
            include_image_base64: false
          }),
          signal: controller.signal
        })
        if (!response.ok) {
          const detail = (await response.text()).slice(0, 200)
          throw new Error(`cloud ocr: HTTP ${response.status} — ${detail}`)
        }
        const parsed = (await response.json()) as OcrResponse
        const markdown = (parsed.pages ?? [])
          .map((p) => p.markdown ?? '')
          .join('\n\n')
          .trim()
        return {
          markdown: markdown.length > 0 ? markdown : '*(no text recognized)*',
          model: 'mistral-ocr',
          modelVersion: parsed.model ?? MISTRAL_OCR_MODEL,
          runtime: 'mistral-api',
          runtimeVersion: MISTRAL_OCR_MODEL,
          location: 'cloud-model'
        }
      } finally {
        clearTimeout(timer)
      }
    }
  }
}
