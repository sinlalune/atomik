import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  capturePage,
  CaptureSessionManager,
  detectLanHost,
  sanitizeClientFileName,
  type CaptureSessionOptions
} from '../electron-main/capture-session'
import { formatBytes, formatRemaining } from '../renderer/src/capture/format'

/**
 * S02: every 13 §capture requirement is exercised against the REAL HTTP
 * surface (fetch over loopback) — one-time expiring tokens, size and MIME
 * limits with magic-byte validation, the temporary inbox under the state
 * dir, and the closed-outside-sessions endpoint.
 */

const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.from('atomik-test-jpeg-payload')
])
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('atomik-test-png-payload')
])

let inboxRoot: string
let manager: CaptureSessionManager | null = null
let nowMs = 1_000_000

function makeManager(options: Partial<CaptureSessionOptions> = {}): CaptureSessionManager {
  inboxRoot = mkdtempSync(join(tmpdir(), 'atomik-capture-inbox-'))
  nowMs = 1_000_000
  manager = new CaptureSessionManager({
    inboxRoot,
    host: '127.0.0.1',
    // Ephemeral in tests: suites must not race each other (or the owner's
    // live app) for the stable default port.
    port: 0,
    now: () => nowMs,
    ...options
  })
  return manager
}

afterEach(async () => {
  await manager?.dispose()
  manager = null
  rmSync(inboxRoot, { recursive: true, force: true })
})

function uploadUrlOf(pageUrl: string): string {
  return pageUrl.replace('/c/', '/u/')
}

async function upload(
  url: string,
  body: Buffer,
  headers: Record<string, string> = {}
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'image/jpeg', ...headers },
    body: new Uint8Array(body)
  })
}

describe('capture session server (S02, 08/13 §capture)', () => {
  it('start() opens an active session with a QR-able upload URL and an inbox dir', async () => {
    const session = await makeManager().start()
    expect(session.active).toBe(true)
    expect(session.uploads).toEqual([])
    expect(session.uploadUrl).toMatch(
      /^http:\/\/127\.0\.0\.1:\d+\/c\/[a-f0-9]{16}\?t=[a-f0-9]{32}$/
    )
    expect(session.expiresAtMs).toBe(nowMs + 5 * 60_000)
    expect(readdirSync(join(inboxRoot, session.id))).toEqual([])
  })

  it('serves the phone page only to the correct token', async () => {
    const session = await makeManager().start()
    const ok = await fetch(session.uploadUrl)
    expect(ok.status).toBe(200)
    expect(await ok.text()).toContain('atomik capture')
    const bad = await fetch(session.uploadUrl.replace(/t=.*$/, `t=${'0'.repeat(32)}`))
    expect(bad.status).toBe(403)
  })

  it('phone page: camera-hinted image input degrading to a picker, posting to /u/ (S03)', () => {
    const page = capturePage()
    // One ordinary file input carries the whole flow: `capture` is a HINT
    // (camera where supported, regular picker elsewhere), accept scopes it.
    expect(page).toContain('type="file"')
    expect(page).toContain('accept="image/*"')
    expect(page).toContain('capture="environment"')
    // The upload URL is derived from the page's own address (token kept,
    // never embedded a second time), and the client name travels as the
    // display-metadata header the server sanitizes.
    expect(page).toContain("location.href.replace('/c/', '/u/')")
    expect(page).toContain('x-atomik-filename')
    // Empty picker MIME falls back to the extension before the server gates.
    expect(page).toContain("'image/heic'")
    // Self-contained: nothing loads from anywhere else.
    expect(page).not.toMatch(/src="http|href="http/)
  })

  it('accepts a valid upload: bytes land in the inbox byte-exact, with a meta sidecar', async () => {
    const session = await makeManager().start()
    const response = await upload(uploadUrlOf(session.uploadUrl), JPEG, {
      'x-atomik-filename': 'whiteboard.jpg'
    })
    expect(response.status).toBe(200)
    const body = (await response.json()) as { ok: boolean; uploadId: string }
    expect(body.ok).toBe(true)

    const inspected = manager!.inspect()!
    expect(inspected.uploads).toHaveLength(1)
    const info = inspected.uploads[0]!
    expect(info.id).toBe(body.uploadId)
    expect(info.fileName).toBe('whiteboard.jpg')
    expect(info.mimeType).toBe('image/jpeg')
    expect(info.bytes).toBe(JPEG.length)
    expect(info.receivedAtMs).toBe(nowMs)

    const files = readdirSync(join(inboxRoot, session.id)).sort()
    expect(files).toEqual([`01-${info.id}.jpg`, `01-${info.id}.jpg.meta.json`])
    expect(readFileSync(join(inboxRoot, session.id, files[0]!))).toEqual(JPEG)
    const meta = JSON.parse(
      readFileSync(join(inboxRoot, session.id, files[1]!), 'utf8')
    ) as Record<string, unknown>
    expect(meta['storedName']).toBe(`01-${info.id}.jpg`)
    expect(meta['fileName']).toBe('whiteboard.jpg')
  })

  it('numbers uploads sequentially within a session', async () => {
    const session = await makeManager().start()
    await upload(uploadUrlOf(session.uploadUrl), JPEG)
    await upload(uploadUrlOf(session.uploadUrl), PNG, { 'content-type': 'image/png' })
    const files = readdirSync(join(inboxRoot, session.id)).sort()
    expect(files.filter((f) => !f.endsWith('.meta.json'))).toEqual([
      expect.stringMatching(/^01-[a-f0-9]{12}\.jpg$/),
      expect.stringMatching(/^02-[a-f0-9]{12}\.png$/)
    ])
  })

  it('rejects the wrong upload token and writes nothing', async () => {
    const session = await makeManager().start()
    const forged = uploadUrlOf(session.uploadUrl).replace(/t=.*$/, `t=${'f'.repeat(32)}`)
    const response = await upload(forged, JPEG)
    expect(response.status).toBe(403)
    expect(readdirSync(join(inboxRoot, session.id))).toEqual([])
  })

  it('rejects MIME types outside the allowlist', async () => {
    const session = await makeManager().start()
    const response = await upload(uploadUrlOf(session.uploadUrl), JPEG, {
      'content-type': 'text/plain'
    })
    expect(response.status).toBe(415)
  })

  it('rejects bytes whose magic does not match the declared type', async () => {
    const session = await makeManager().start()
    // Declared JPEG, actual PNG bytes: content validation must win.
    const response = await upload(uploadUrlOf(session.uploadUrl), PNG)
    expect(response.status).toBe(415)
    expect(readdirSync(join(inboxRoot, session.id))).toEqual([])
  })

  it('enforces the size limit', async () => {
    const session = await makeManager({ maxUploadBytes: 64 }).start()
    const big = Buffer.concat([JPEG, Buffer.alloc(256)])
    const response = await upload(uploadUrlOf(session.uploadUrl), big)
    expect(response.status).toBe(413)
    expect(readdirSync(join(inboxRoot, session.id))).toEqual([])
  })

  it('caps the number of uploads per session', async () => {
    const session = await makeManager({ maxUploads: 1 }).start()
    expect((await upload(uploadUrlOf(session.uploadUrl), JPEG)).status).toBe(200)
    expect((await upload(uploadUrlOf(session.uploadUrl), JPEG)).status).toBe(429)
  })

  it('expires: past the TTL every request is refused and inspect() reports inactive', async () => {
    const session = await makeManager().start()
    nowMs += 5 * 60_000 + 1
    expect(manager!.inspect()!.active).toBe(false)
    expect((await fetch(session.uploadUrl)).status).toBe(403)
    expect((await upload(uploadUrlOf(session.uploadUrl), JPEG)).status).toBe(403)
  })

  it('stop() closes the endpoint entirely; uploads stay inspectable and on disk', async () => {
    const session = await makeManager().start()
    await upload(uploadUrlOf(session.uploadUrl), JPEG)
    await manager!.stop()
    const inspected = manager!.inspect()!
    expect(inspected.active).toBe(false)
    expect(inspected.uploads).toHaveLength(1)
    // No port stays open outside a session: the connection itself fails.
    await expect(fetch(session.uploadUrl)).rejects.toThrow()
    expect(readdirSync(join(inboxRoot, session.id))).toHaveLength(2)
  })

  it('one-time tokens: a new start() invalidates the previous session and its token', async () => {
    const first = await makeManager().start()
    const second = await manager!.start()
    expect(second.id).not.toBe(first.id)
    // Old id + old token against the live endpoint: refused.
    const firstToken = new URL(first.uploadUrl).searchParams.get('t')!
    const secondBase = new URL(second.uploadUrl)
    const stale = `http://${secondBase.host}/u/${first.id}?t=${firstToken}`
    expect((await upload(stale, JPEG)).status).toBe(403)
    // The first session's inbox files survive for the S04 decision.
    expect(readdirSync(join(inboxRoot, first.id))).toEqual([])
  })

  it('answers unknown routes with 404', async () => {
    const session = await makeManager().start()
    const base = new URL(session.uploadUrl)
    expect((await fetch(`http://${base.host}/`)).status).toBe(404)
    expect((await fetch(`http://${base.host}/c/nothexnothexnot!`)).status).toBe(404)
  })

  it('inspect() is null before any session', () => {
    expect(makeManager().inspect()).toBeNull()
  })

  it('getUpload/resolveUpload: each inbox item is decided exactly once', async () => {
    const session = await makeManager().start()
    const response = await upload(uploadUrlOf(session.uploadUrl), JPEG)
    const { uploadId } = (await response.json()) as { uploadId: string }

    const item = manager!.getUpload(uploadId)!
    expect(item.info.id).toBe(uploadId)
    expect(readFileSync(item.filePath)).toEqual(JPEG)
    expect(manager!.getUpload('unknown')).toBeNull()
    expect(manager!.getUpload(42)).toBeNull()

    manager!.resolveUpload(uploadId, 'imported', 'sources/captures/x/source.md')
    // Inbox cleared, decision visible, second decision impossible.
    expect(readdirSync(join(inboxRoot, session.id))).toEqual([])
    const info = manager!.inspect()!.uploads[0]!
    expect(info.resolution).toBe('imported')
    expect(info.importedTo).toBe('sources/captures/x/source.md')
    expect(manager!.getUpload(uploadId)).toBeNull()
    expect(() => manager!.resolveUpload(uploadId, 'discarded')).toThrow(
      /already resolved/
    )
  })

  it('discard deletes the inbox files and marks the item', async () => {
    const session = await makeManager().start()
    const response = await upload(uploadUrlOf(session.uploadUrl), JPEG)
    const { uploadId } = (await response.json()) as { uploadId: string }
    manager!.resolveUpload(uploadId, 'discarded')
    expect(readdirSync(join(inboxRoot, session.id))).toEqual([])
    expect(manager!.inspect()!.uploads[0]!.resolution).toBe('discarded')
  })

  it('binds the requested stable port (one firewall rule suffices)', async () => {
    const port = 42000 + Math.floor(Math.random() * 1000)
    const session = await makeManager({ port }).start()
    expect(new URL(session.uploadUrl).port).toBe(String(port))
    expect((await fetch(session.uploadUrl)).status).toBe(200)
  })

  it('falls back to an ephemeral port when the stable one is taken', async () => {
    const port = 43000 + Math.floor(Math.random() * 1000)
    const blocker = await makeManager({ port }).start()
    const second = new CaptureSessionManager({
      inboxRoot: mkdtempSync(join(tmpdir(), 'atomik-capture-inbox2-')),
      host: '127.0.0.1',
      port
    })
    try {
      const session = await second.start()
      expect(new URL(session.uploadUrl).port).not.toBe(String(port))
      expect((await fetch(session.uploadUrl)).status).toBe(200)
      expect((await fetch(blocker.uploadUrl)).status).toBe(200)
    } finally {
      await second.dispose()
    }
  })
})

describe('sanitizeClientFileName', () => {
  it('strips path segments and exotic characters, keeps a readable name', () => {
    expect(sanitizeClientFileName('../../evil<>.jpg', 'capture.jpg')).toBe('evil.jpg')
    expect(sanitizeClientFileName('C:\\photos\\IMG 0042.HEIC', 'capture.heic')).toBe(
      'IMG 0042.HEIC'
    )
    expect(sanitizeClientFileName('.hidden', 'capture.jpg')).toBe('hidden')
  })

  it('falls back when nothing usable remains', () => {
    expect(sanitizeClientFileName('///', 'capture.jpg')).toBe('capture.jpg')
    expect(sanitizeClientFileName(undefined, 'capture.jpg')).toBe('capture.jpg')
    expect(sanitizeClientFileName('日本語のみ', 'capture.jpg')).toBe('capture.jpg')
  })
})

describe('capture view formatting', () => {
  it('formats the remaining session time as m:ss, never negative', () => {
    expect(formatRemaining(1_000_000 + 5 * 60_000, 1_000_000)).toBe('5:00')
    expect(formatRemaining(1_000_000 + 61_000, 1_000_000)).toBe('1:01')
    expect(formatRemaining(1_000_000 + 900, 1_000_000)).toBe('0:01')
    expect(formatRemaining(1_000_000, 1_000_000 + 1)).toBe('0:00')
  })

  it('formats byte counts for humans', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(3 * 1024 * 1024 + 200_000)).toBe('3.2 MB')
  })
})

describe('detectLanHost', () => {
  it('picks the first non-internal IPv4', () => {
    expect(
      detectLanHost({
        lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true } as never],
        eth0: [
          { address: 'fe80::1', family: 'IPv6', internal: false } as never,
          { address: '192.168.1.20', family: 'IPv4', internal: false } as never
        ]
      })
    ).toBe('192.168.1.20')
  })

  it('falls back to loopback when offline', () => {
    expect(
      detectLanHost({
        lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true } as never]
      })
    ).toBe('127.0.0.1')
  })
})

describe('audio companion (S08) — same session, same gates', () => {
  const M4A = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x18]),
    Buffer.from('ftypM4A '),
    Buffer.from('atomik-audio-payload')
  ])
  const WEBM = Buffer.concat([
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
    Buffer.from('atomik-webm-audio')
  ])
  const OGG = Buffer.concat([Buffer.from('OggS'), Buffer.from('x')])
  const MP3 = Buffer.concat([Buffer.from('ID3'), Buffer.from('x')])
  const WAV = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('WAVE')
  ])

  it('accepts phone audio formats with matching magic bytes', async () => {
    const session = await makeManager().start()
    const cases: Array<[string, Buffer, string]> = [
      ['audio/mp4', M4A, 'm4a'],
      ['audio/webm', WEBM, 'webm'],
      ['audio/ogg', OGG, 'ogg'],
      ['audio/mpeg', MP3, 'mp3'],
      ['audio/wav', WAV, 'wav']
    ]
    for (const [mime, bytes, extension] of cases) {
      const response = await upload(uploadUrlOf(session.uploadUrl), bytes, {
        'content-type': mime
      })
      expect(response.status, mime).toBe(200)
      const files = readdirSync(join(inboxRoot, session.id))
      expect(files.some((f) => f.endsWith(`.${extension}`)), extension).toBe(true)
    }
  })

  it('audio declared with image magic (and vice versa) is refused', async () => {
    const session = await makeManager().start()
    expect(
      (await upload(uploadUrlOf(session.uploadUrl), JPEG, { 'content-type': 'audio/mp4' })).status
    ).toBe(415)
    expect(
      (await upload(uploadUrlOf(session.uploadUrl), M4A, { 'content-type': 'image/jpeg' })).status
    ).toBe(415)
    // WAV is RIFF like WEBP — the sub-brand must still match.
    expect(
      (await upload(uploadUrlOf(session.uploadUrl), WAV, { 'content-type': 'image/webp' })).status
    ).toBe(415)
  })

  it('the phone page carries the audio input', () => {
    const page = capturePage()
    expect(page).toContain('accept="audio/*"')
    expect(page).toContain('Record / choose audio')
    expect(page).toContain("m4a: 'audio/mp4'")
  })
})

describe('desktop capture (owner request) — same inbox, same gates, no endpoint', () => {
  const WEBM = Buffer.concat([
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
    Buffer.from('desktop-recording')
  ])

  it('a recording lands in the inbox exactly like a phone upload', () => {
    const localManager = makeManager()
    const info = localManager.addLocalUpload(
      new Uint8Array(WEBM),
      'audio/webm;codecs=opus',
      'desktop-recording-2026-07-07.webm'
    )
    expect(info.mimeType).toBe('audio/webm')
    expect(info.fileName).toBe('desktop-recording-2026-07-07.webm')
    const inspected = localManager.inspect()!
    // local-only record: no endpoint, no URL, not active — but decidable
    expect(inspected.uploadUrl).toBe('')
    expect(inspected.active).toBe(false)
    expect(inspected.uploads).toHaveLength(1)
    const item = localManager.getUpload(info.id)!
    expect(readFileSync(item.filePath)).toEqual(WEBM)
    localManager.resolveUpload(info.id, 'imported', 'sources/captures/x/source.md')
    expect(localManager.inspect()!.uploads[0]!.resolution).toBe('imported')
  })

  it('joins an active phone session instead of replacing it', async () => {
    const session = await makeManager().start()
    await upload(uploadUrlOf(session.uploadUrl), JPEG)
    manager!.addLocalUpload(new Uint8Array(WEBM), 'audio/webm', 'memo.webm')
    const inspected = manager!.inspect()!
    expect(inspected.id).toBe(session.id)
    expect(inspected.active).toBe(true)
    expect(inspected.uploads).toHaveLength(2)
  })

  it('applies the same gates: type, magic, size, payload shape', () => {
    const localManager = makeManager()
    expect(() =>
      localManager.addLocalUpload(new Uint8Array(WEBM), 'text/plain', 'x.txt')
    ).toThrow(/rejected media type/)
    expect(() =>
      localManager.addLocalUpload(new Uint8Array(JPEG), 'audio/webm', 'x.webm')
    ).toThrow(/do not match/)
    expect(() =>
      localManager.addLocalUpload('nope' as unknown as Uint8Array, 'audio/webm', 'x')
    ).toThrow(/rejected recording payload/)
    const tinyCap = makeManager({ maxUploadBytes: 8 })
    expect(() =>
      tinyCap.addLocalUpload(new Uint8Array(WEBM), 'audio/webm', 'x.webm')
    ).toThrow(/too large/)
  })

  it('accepts the nonstandard audio/m4a alias over HTTP too', async () => {
    const M4A = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x18]),
      Buffer.from('ftypM4A '),
      Buffer.from('x')
    ])
    const session = await makeManager().start()
    const response = await upload(uploadUrlOf(session.uploadUrl), M4A, {
      'content-type': 'audio/m4a'
    })
    expect(response.status).toBe(200)
  })
})
