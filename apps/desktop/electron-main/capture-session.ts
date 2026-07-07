import { randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { networkInterfaces } from 'node:os'
import { join } from 'node:path'
import type { CaptureSessionInfo, CaptureUploadInfo } from '../shared/ipc-contract'

/**
 * Capture session server (08 §MVP flow, 13 §Capture upload security) —
 * incubating capture-core (14). A short-lived HTTP endpoint on the LAN
 * interface lets the owner's phone upload originals. Every 13 requirement
 * is enforced HERE, below the renderer:
 *
 *   random session id        randomBytes, new per session
 *   one-time token           minted per session, dies with it, never reused
 *   short expiration         DEFAULT_TTL_MS; lazy checks + an unref'd timer
 *   size limit               Content-Length early + streamed byte count
 *   image allowlist          declared MIME must be allowlisted AND the
 *                            received bytes must carry that type's magic
 *   temporary inbox          under the STATE DIR, never the vault; the
 *                            inbox→vault import is S04's explicitly
 *                            confirmed step in main
 *   desktop confirmation     nothing here writes the vault at all
 *
 * The server listens only while a session is active (start opens it, stop
 * closes it); no port stays open between sessions. The QR payload is
 * `uploadUrl` — it carries the token, so possession of the QR is the
 * capability, exactly like a native share dialog.
 */

const DEFAULT_TTL_MS = 5 * 60_000
const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const DEFAULT_MAX_UPLOADS = 20

/**
 * STABLE default port (owner dogfooding, WSL2 mirrored networking): a
 * random ephemeral port per session means no targeted firewall rule can
 * ever match — the owner would have to allow ALL inbound to WSL. With a
 * fixed default, one rule opens exactly one port once. If the port is
 * taken, the server falls back to an ephemeral one (the QR still works;
 * only the firewall convenience is lost). ATOMIK_CAPTURE_PORT overrides.
 */
export const DEFAULT_CAPTURE_PORT = 41414

/**
 * Content sniffing table ("content validation after upload", 08). BYTES
 * OUTRANK LABELS (owner report: Android declares .m4a as audio/mpeg —
 * client MIME labels are unreliable everywhere). The declared type only
 * pins the media FAMILY (image vs audio); what gets stored — extension
 * and canonical MIME — is what the bytes actually are. A file whose
 * content matches no known signature, or whose family contradicts the
 * declaration, is refused.
 */
type MediaSpec = {
  mime: string
  extension: string
  family: 'image' | 'audio'
  matches: (bytes: Buffer) => boolean
}

/** ISO-BMFF ftyp brands that mean a HEIC/HEIF image (vs m4a audio). */
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'])

const SNIFF_TABLE: MediaSpec[] = [
  {
    mime: 'image/jpeg',
    extension: 'jpg',
    family: 'image',
    matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  },
  {
    mime: 'image/png',
    extension: 'png',
    family: 'image',
    matches: (b) =>
      b.length >= 8 &&
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  },
  {
    mime: 'image/webp',
    extension: 'webp',
    family: 'image',
    matches: (b) =>
      b.length >= 12 &&
      b.toString('latin1', 0, 4) === 'RIFF' &&
      b.toString('latin1', 8, 12) === 'WEBP'
  },
  // ISO-BMFF splits by ftyp brand: heic-family brands are images…
  {
    mime: 'image/heic',
    extension: 'heic',
    family: 'image',
    matches: (b) => isIsoBmff(b) && HEIC_BRANDS.has(isoBrand(b))
  },
  // …every other brand a phone hands over is an m4a-style audio container.
  {
    mime: 'audio/mp4',
    extension: 'm4a',
    family: 'audio',
    matches: (b) => isIsoBmff(b) && !HEIC_BRANDS.has(isoBrand(b))
  },
  { mime: 'audio/webm', extension: 'webm', family: 'audio', matches: isEbml },
  {
    mime: 'audio/ogg',
    extension: 'ogg',
    family: 'audio',
    matches: (b) => b.length >= 4 && b.toString('latin1', 0, 4) === 'OggS'
  },
  {
    mime: 'audio/mpeg',
    extension: 'mp3',
    family: 'audio',
    matches: (b) =>
      b.length >= 3 &&
      ((b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || // ID3
        (b[0] === 0xff && ((b[1] ?? 0) & 0xe0) === 0xe0)) // frame sync
  },
  { mime: 'audio/wav', extension: 'wav', family: 'audio', matches: isWave }
]

/** The spec the BYTES identify as, or null for unknown content. */
export function sniffMedia(bytes: Buffer): MediaSpec | null {
  return SNIFF_TABLE.find((spec) => spec.matches(bytes)) ?? null
}

function declaredFamily(mimeType: string): 'image' | 'audio' | null {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  return null
}

function isIsoBmff(bytes: Buffer): boolean {
  return bytes.length >= 12 && bytes.toString('latin1', 4, 8) === 'ftyp'
}

function isoBrand(bytes: Buffer): string {
  return bytes.toString('latin1', 8, 12).trim().toLowerCase()
}

function isEbml(bytes: Buffer): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  )
}

function isWave(bytes: Buffer): boolean {
  return (
    bytes.length >= 12 &&
    bytes.toString('latin1', 0, 4) === 'RIFF' &&
    bytes.toString('latin1', 8, 12) === 'WAVE'
  )
}

/** First non-internal IPv4 — the LAN address the phone can reach. Falls
 *  back to loopback (offline dev still works, just not from a phone). */
export function detectLanHost(
  interfaces: ReturnType<typeof networkInterfaces> = networkInterfaces()
): string {
  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) return address.address
    }
  }
  return '127.0.0.1'
}

/** Client file names are display metadata only (stored names are always
 *  server-chosen): strip path segments and anything exotic, cap length. */
export function sanitizeClientFileName(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback
  const base = raw.replace(/\\/g, '/').split('/').pop() ?? ''
  const cleaned = base
    .replace(/[^A-Za-z0-9._ -]/g, '')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 80)
  return cleaned.length > 0 ? cleaned : fallback
}

function tokenMatches(expected: string, presented: string): boolean {
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(presented, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

export type CaptureSessionOptions = {
  /** Parent of per-session inbox folders; lives under the state dir. */
  inboxRoot: string
  /** Bind address override (tests use loopback); default: detected LAN. */
  host?: string
  /** Port override; default DEFAULT_CAPTURE_PORT, falling back to an
   *  ephemeral port when taken. 0 = always ephemeral. */
  port?: number
  ttlMs?: number
  maxUploadBytes?: number
  maxUploads?: number
  /** Clock override for expiry tests. */
  now?: () => number
}

type ActiveSession = {
  id: string
  token: string
  dir: string
  expiresAtMs: number
  stopped: boolean
  /** Created by a desktop recording; never had a network endpoint. */
  local?: boolean
  uploads: CaptureUploadInfo[]
  /** uploadId → stored file name in the session's inbox dir. */
  storedNames: Map<string, string>
}

/** One inbox item handed to the S04 import (bytes stay on disk). */
export type InboxUpload = {
  info: CaptureUploadInfo
  /** Absolute path of the original bytes in the inbox. */
  filePath: string
}

export class CaptureSessionManager {
  private session: ActiveSession | null = null
  private server: Server | null = null
  private boundHost = ''
  private boundPort = 0
  private expiryTimer: NodeJS.Timeout | null = null

  constructor(private readonly options: CaptureSessionOptions) {}

  private now(): number {
    return (this.options.now ?? Date.now)()
  }

  private get ttlMs(): number {
    return this.options.ttlMs ?? DEFAULT_TTL_MS
  }

  private get maxUploadBytes(): number {
    return this.options.maxUploadBytes ?? DEFAULT_MAX_UPLOAD_BYTES
  }

  private get maxUploads(): number {
    return this.options.maxUploads ?? DEFAULT_MAX_UPLOADS
  }

  /** Opens the endpoint and mints a fresh session. Any previous session is
   *  stopped first — its token can never authorize again. */
  async start(): Promise<CaptureSessionInfo> {
    await this.stop()
    await this.ensureServer()
    const id = randomBytes(8).toString('hex')
    const token = randomBytes(16).toString('hex')
    const dir = join(this.options.inboxRoot, id)
    mkdirSync(dir, { recursive: true })
    this.session = {
      id,
      token,
      dir,
      expiresAtMs: this.now() + this.ttlMs,
      stopped: false,
      uploads: [],
      storedNames: new Map()
    }
    this.expiryTimer = setTimeout(() => void this.stop(), this.ttlMs)
    this.expiryTimer.unref()
    const info = this.inspect()
    if (!info) throw new Error('capture: session failed to start')
    return info
  }

  /** Invalidates the session and closes the endpoint. Inbox files stay on
   *  disk for S04's confirmation flow; only the ability to upload dies. */
  async stop(): Promise<void> {
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer)
      this.expiryTimer = null
    }
    if (this.session) this.session.stopped = true
    const server = this.server
    if (server) {
      this.server = null
      await new Promise<void>((resolve) => {
        server.close(() => resolve())
        server.closeAllConnections()
      })
    }
  }

  /** Last session's state (uploads survive stop); null before any start. */
  inspect(): CaptureSessionInfo | null {
    const session = this.session
    if (!session) return null
    return {
      id: session.id,
      uploadUrl: session.local
        ? ''
        : `http://${this.boundHost}:${this.boundPort}/c/${session.id}?t=${session.token}`,
      expiresAtMs: session.expiresAtMs,
      active: this.isActive(session),
      uploads: [...session.uploads]
    }
  }

  async dispose(): Promise<void> {
    await this.stop()
  }

  /** Unresolved inbox item for the S04 decision; null when unknown or
   *  already imported/discarded (each item is decided exactly once). */
  getUpload(uploadId: unknown): InboxUpload | null {
    const session = this.session
    if (!session || typeof uploadId !== 'string') return null
    const info = session.uploads.find((upload) => upload.id === uploadId)
    const storedName = session.storedNames.get(uploadId)
    if (!info || info.resolution || !storedName) return null
    return { info, filePath: join(session.dir, storedName) }
  }

  /** Records the desktop's decision and clears the inbox files — after an
   *  import the vault copy is canonical; after a discard nothing remains. */
  resolveUpload(
    uploadId: string,
    resolution: 'imported' | 'discarded',
    importedTo?: string
  ): void {
    const upload = this.getUpload(uploadId)
    if (!upload) throw new Error('capture: unknown or already resolved upload')
    const storedName = this.session!.storedNames.get(uploadId)!
    rmSync(join(this.session!.dir, storedName), { force: true })
    rmSync(join(this.session!.dir, `${storedName}.meta.json`), { force: true })
    upload.info.resolution = resolution
    if (importedTo !== undefined) upload.info.importedTo = importedTo
  }

  private isActive(session: ActiveSession): boolean {
    return !session.stopped && this.now() <= session.expiresAtMs && this.server !== null
  }

  private async ensureServer(): Promise<void> {
    if (this.server) return
    const host = this.options.host ?? detectLanHost()
    const server = createServer((req, res) => {
      void this.handle(req, res)
    })
    const preferred = this.options.port ?? DEFAULT_CAPTURE_PORT
    try {
      await listenOnce(server, preferred, host)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'EADDRINUSE' || preferred === 0) throw error
      await listenOnce(server, 0, host)
    }
    this.boundHost = host
    this.boundPort = (server.address() as AddressInfo).port
    this.server = server
  }

  /** The whole HTTP surface: GET /c/<id> (phone page) and POST /u/<id>
   *  (upload), both token-gated. Everything else is 404. Auth failures are
   *  a uniform 403 — no oracle for ids, tokens, or expiry. */
  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const pageMatch = /^\/c\/([a-f0-9]{16})$/.exec(url.pathname)
      const uploadMatch = /^\/u\/([a-f0-9]{16})$/.exec(url.pathname)
      const token = url.searchParams.get('t') ?? ''
      if (req.method === 'GET' && pageMatch) {
        const session = this.authorize(pageMatch[1]!, token)
        if (!session) return reject(res, 403)
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        res.end(capturePage())
        return
      }
      if (req.method === 'POST' && uploadMatch) {
        const session = this.authorize(uploadMatch[1]!, token)
        if (!session) return reject(res, 403)
        await this.handleUpload(req, res, session)
        return
      }
      reject(res, 404)
    } catch {
      reject(res, 500)
    }
  }

  private authorize(sessionId: string, token: string): ActiveSession | null {
    const session = this.session
    if (!session || !this.isActive(session)) return null
    if (session.id !== sessionId) return null
    if (!tokenMatches(session.token, token)) return null
    return session
  }

  private async handleUpload(
    req: IncomingMessage,
    res: ServerResponse,
    session: ActiveSession
  ): Promise<void> {
    if (session.uploads.length >= this.maxUploads) return reject(res, 429)
    const declared = String(req.headers['content-type'] ?? '')
      .split(';')[0]!
      .trim()
      .toLowerCase()
    const family = declaredFamily(declared)
    if (!family) return reject(res, 415)
    const declaredLength = Number(req.headers['content-length'])
    if (Number.isFinite(declaredLength) && declaredLength > this.maxUploadBytes) {
      return reject(res, 413)
    }
    const chunks: Buffer[] = []
    let total = 0
    for await (const chunk of req) {
      const buffer = chunk as Buffer
      total += buffer.length
      if (total > this.maxUploadBytes) {
        reject(res, 413)
        req.destroy()
        return
      }
      chunks.push(buffer)
    }
    const bytes = Buffer.concat(chunks)
    if (bytes.length === 0) return reject(res, 400)
    // Bytes outrank labels: unknown content, or content whose family
    // contradicts the declaration, is refused; what matches is stored
    // as what it IS.
    const spec = sniffMedia(bytes)
    if (!spec || spec.family !== family) return reject(res, 415)
    const info = this.storeUpload(
      session,
      bytes,
      spec,
      declared,
      req.headers['x-atomik-filename']
    )
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, uploadId: info.id }))
  }

  /** Shared inbox write: the phone path and the desktop mic land the
   *  same shape, same sidecar, same decide-once lifecycle. */
  private storeUpload(
    session: ActiveSession,
    bytes: Buffer,
    spec: { mime: string; extension: string },
    declared: string,
    clientFileName: unknown
  ): CaptureUploadInfo {
    const uploadId = randomBytes(6).toString('hex')
    const sequence = String(session.uploads.length + 1).padStart(2, '0')
    const storedName = `${sequence}-${uploadId}.${spec.extension}`
    const info: CaptureUploadInfo = {
      id: uploadId,
      fileName: sanitizeClientFileName(clientFileName, `capture.${spec.extension}`),
      // canonical SNIFFED type — what the bytes are, not what the client said
      mimeType: spec.mime,
      bytes: bytes.length,
      receivedAtMs: this.now()
    }
    writeFileSync(join(session.dir, storedName), bytes)
    writeFileSync(
      join(session.dir, `${storedName}.meta.json`),
      `${JSON.stringify({ ...info, storedName, declaredMimeType: declared }, null, 2)}\n`,
      'utf8'
    )
    session.uploads.push(info)
    session.storedNames.set(uploadId, storedName)
    return info
  }

  /**
   * Desktop capture (owner request): a recording made ON this machine
   * (renderer MediaRecorder) enters the SAME inbox through the SAME
   * gates — size cap, MIME allowlist, magic-byte validation — and the
   * same explicit import decides it. No session/server is required or
   * opened: a local inbox record is created lazily when none is usable
   * (the endpoint stays closed; nothing about the network posture
   * changes).
   */
  addLocalUpload(bytes: unknown, mimeType: unknown, fileName: unknown): CaptureUploadInfo {
    if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
      throw new Error('capture: rejected recording payload')
    }
    if (bytes.length > this.maxUploadBytes) {
      throw new Error('capture: recording too large')
    }
    const declared = String(mimeType ?? '')
      .split(';')[0]!
      .trim()
      .toLowerCase()
    const family = declaredFamily(declared)
    if (!family) throw new Error(`capture: rejected media type — ${declared}`)
    const buffer = Buffer.from(bytes)
    const spec = sniffMedia(buffer)
    if (!spec || spec.family !== family) {
      throw new Error('capture: bytes do not match the declared media family')
    }
    let session = this.session
    if (session && session.uploads.length >= this.maxUploads) {
      // Replacing a full session would orphan its undecided items.
      throw new Error('capture: session is full — decide the pending items first')
    }
    if (!session) {
      const id = randomBytes(8).toString('hex')
      session = {
        id,
        token: randomBytes(16).toString('hex'),
        dir: join(this.options.inboxRoot, id),
        expiresAtMs: this.now(),
        stopped: true, // never uploadable from outside
        local: true,
        uploads: [],
        storedNames: new Map()
      }
      mkdirSync(session.dir, { recursive: true })
      this.session = session
    }
    return this.storeUpload(session, buffer, spec, declared, fileName)
  }
}

function listenOnce(server: Server, port: number, host: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => reject(error)
    server.once('error', onError)
    server.listen(port, host, () => {
      server.removeListener('error', onError)
      resolve()
    })
  })
}

function reject(res: ServerResponse, status: number): void {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ error: 'capture: request rejected' }))
}

/**
 * The phone upload page (S03, 08 §Phone page input). Self-contained HTML —
 * no framework, no external assets (the phone only ever talks to this one
 * endpoint). `capture="environment"` opens the camera where supported and
 * DEGRADES to the ordinary file picker elsewhere (the input works either
 * way); `accept="image/*"` scopes the picker. The page derives its upload
 * URL from its own address (`/c/` → `/u/`, token kept), so the token is
 * never embedded twice. Some pickers hand over files with an empty MIME —
 * the page falls back to the extension before the server's two gates.
 * Exported for tests.
 */
export function capturePage(): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>atomik capture</title>
<style>
  :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
  body { margin: 0; padding: 1.2rem; display: flex; flex-direction: column; gap: 1rem; align-items: center; }
  h1 { font-size: 1.1rem; font-weight: 600; margin: 0.5rem 0 0; }
  p { margin: 0; opacity: 0.7; font-size: 0.9rem; text-align: center; }
  label.take {
    display: block; text-align: center; padding: 1.1rem 2rem; border-radius: 12px;
    border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
    font-size: 1.05rem; cursor: pointer; width: 100%; max-width: 22rem; box-sizing: border-box;
  }
  input[type=file] { display: none; }
  ul { list-style: none; margin: 0; padding: 0; width: 100%; max-width: 22rem; }
  li { font-size: 0.9rem; padding: 0.45rem 0.2rem; border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent); }
  li.err { color: #c0392b; }
</style>
</head>
<body>
<h1>atomik capture</h1>
<p>Take a photo or pick one — it lands on your desktop for review. Nothing enters the vault without confirmation there.</p>
<label class="take">Take / choose photo
  <input id="file" type="file" accept="image/*" capture="environment">
</label>
<label class="take">Record / choose audio
  <input id="audio" type="file" accept="audio/*" capture>
</label>
<ul id="done"></ul>
<script>
  var done = document.getElementById('done')
  var uploadUrl = location.href.replace('/c/', '/u/')
  var extMime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
                  webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
                  m4a: 'audio/mp4', webm: 'audio/webm', ogg: 'audio/ogg',
                  mp3: 'audio/mpeg', wav: 'audio/wav' }
  function report (name, text, isError) {
    var li = document.createElement('li')
    li.textContent = name + ' — ' + text
    if (isError) li.className = 'err'
    done.prepend(li)
  }
  function mimeOf (file) {
    if (file.type) return file.type
    var ext = (file.name.split('.').pop() || '').toLowerCase()
    return extMime[ext] || ''
  }
  function wire (input) {
    input.addEventListener('change', function () {
      var file = input.files && input.files[0]
      if (!file) return
      input.value = ''
      fetch(uploadUrl, {
        method: 'POST',
        headers: { 'content-type': mimeOf(file), 'x-atomik-filename': file.name },
        body: file
      }).then(function (res) {
        if (res.ok) return report(file.name, 'uploaded', false)
        if (res.status === 413) return report(file.name, 'too large', true)
        if (res.status === 415) return report(file.name, 'not an accepted media type', true)
        if (res.status === 429) return report(file.name, 'session is full', true)
        report(file.name, 'refused — session may have expired', true)
      }).catch(function () {
        report(file.name, 'network error — is the desktop still on?', true)
      })
    })
  }
  wire(document.getElementById('file'))
  wire(document.getElementById('audio'))
</script>
</body>
</html>
`
}
