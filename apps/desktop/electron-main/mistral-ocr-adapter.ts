import type { TranscriptionAdapter } from './transcription'

/**
 * The cloud OCR rung (CP-MVP-005 S05; owner decision): Mistral OCR as
 * an EXPLICIT per-capture action — never a silent fallback (13:
 * "require explicit policy before any local failure falls back to
 * cloud"). The key lives main-process only (the AI settings store in
 * the state dir — S05b — with the env var as a dev override); the
 * renderer sees typed channels and never the raw key.
 * Output is visibly cloud-derived (28): `location: 'cloud-model'` +
 * provider identity land in the transcript frontmatter, the dossier,
 * and the trace. The model id is PINNED — a dated seat, benched
 * letter-perfect on the bench scans (2026-07-08); upgrades are a new
 * dated decision, not a silent alias drift.
 */

export const MISTRAL_OCR_MODEL = 'mistral-ocr-4-0'
/** Pinned live 2026-07-09 (owner key, /v1/models) — dated, no alias. */
export const VOXTRAL_MODEL = 'voxtral-mini-2602'
const API_URL = 'https://api.mistral.ai/v1/ocr'
const TRANSCRIBE_URL = 'https://api.mistral.ai/v1/audio/transcriptions'
const TIMEOUT_MS = 180_000

type OcrResponse = { pages?: Array<{ markdown?: string }>; model?: string }

type TranscribeResponse = {
  text?: string
  model?: string
  usage?: { audio_seconds?: number }
}

/** The cloud SPEECH rung (S06f, owner request): Voxtral transcription
 *  behind the same explicit posture as the OCR rung — the cloud
 *  handler routes audio here, images to OCR, one honest button each. */
export function createVoxtralTranscribeAdapter(
  key: string,
  fetchImpl: typeof fetch = fetch
): TranscriptionAdapter {
  return {
    id: 'mistral-voxtral',
    transcribe: async (job) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
      try {
        const form = new FormData()
        form.set('model', VOXTRAL_MODEL)
        form.set(
          'file',
          new Blob([new Uint8Array(job.bytes)], { type: job.mimeType }),
          job.originalAbs.split('/').pop() ?? 'audio'
        )
        const response = await fetchImpl(TRANSCRIBE_URL, {
          method: 'POST',
          headers: { authorization: `Bearer ${key}` },
          body: form,
          signal: controller.signal
        })
        if (!response.ok) {
          const detail = (await response.text()).slice(0, 200)
          throw new Error(`cloud transcribe: HTTP ${response.status} — ${detail}`)
        }
        const parsed = (await response.json()) as TranscribeResponse
        const text = (parsed.text ?? '').trim()
        return {
          markdown: text.length > 0 ? text : '*(no speech recognized)*',
          model: 'voxtral-mini',
          modelVersion: parsed.model ?? VOXTRAL_MODEL,
          runtime: 'mistral-api',
          runtimeVersion: VOXTRAL_MODEL,
          location: 'cloud-model',
          ...(parsed.usage?.audio_seconds !== undefined
            ? { audioSeconds: parsed.usage.audio_seconds }
            : {})
        }
      } finally {
        clearTimeout(timer)
      }
    }
  }
}

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
