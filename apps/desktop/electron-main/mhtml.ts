/**
 * A minimal MHTML (multipart/related) reader (CP-MVP-006 S05): the web
 * snapshot Blink writes with `savePage(…, 'MHTML')` is one file holding
 * the HTML plus every subresource as its own MIME part. Reader
 * extraction parses THIS on-disk snapshot — the page as it was captured,
 * images embedded — never a re-fetch (bedrock 09; the S02 decision).
 * Pure and dependency-free; unit-tested against a synthetic fixture and
 * proven on a real Wikipedia capture.
 */

export type MhtmlPart = {
  contentType: string
  /** The part's Content-Location (its original URL), or '' if absent. */
  location: string
  /** Decoded bytes (text parts decode to their utf8/latin1 bytes). */
  bytes: Buffer
}

export type ParsedMhtml = {
  /** The main HTML document, decoded to a string. */
  html: string
  /** Every subresource part keyed by its Content-Location. */
  resources: Map<string, MhtmlPart>
}

function decodeQuotedPrintable(body: string): Buffer {
  // soft line breaks, then =XX hex — operate on latin1 bytes so binary
  // parts survive (Blink QP-encodes some svg/text resources)
  const unfolded = body.replace(/=\r?\n/g, '')
  const out: number[] = []
  for (let i = 0; i < unfolded.length; i++) {
    const ch = unfolded[i]!
    if (ch === '=' && i + 2 < unfolded.length) {
      const hex = unfolded.slice(i + 1, i + 3)
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        out.push(parseInt(hex, 16))
        i += 2
        continue
      }
    }
    out.push(ch.charCodeAt(0) & 0xff)
  }
  return Buffer.from(out)
}

function decodePart(body: string, encoding: string): Buffer {
  const enc = encoding.toLowerCase()
  if (enc === 'base64') return Buffer.from(body.replace(/\s+/g, ''), 'base64')
  if (enc === 'quoted-printable') return decodeQuotedPrintable(body)
  return Buffer.from(body, 'latin1')
}

const header = (head: string, name: string): string => {
  const match = new RegExp(`^${name}:\\s*([^\\r\\n]*(?:\\r?\\n[ \\t][^\\r\\n]*)*)`, 'im').exec(head)
  return match ? match[1]!.replace(/\r?\n[ \t]+/g, '').trim() : ''
}

/** Parse a savePage MHTML buffer. Throws only on a missing boundary or
 *  absent HTML part — a snapshot with neither is not usable. */
export function parseMhtml(buffer: Buffer): ParsedMhtml {
  const raw = buffer.toString('latin1')
  const topEnd = raw.search(/\r?\n\r?\n/)
  const topHead = topEnd >= 0 ? raw.slice(0, topEnd) : raw
  const boundaryMatch = /boundary="?([^"\r\n;]+)"?/i.exec(topHead)
  if (!boundaryMatch) throw new Error('mhtml: no multipart boundary')
  const boundary = boundaryMatch[1]!

  const chunks = raw.split(`--${boundary}`)
  // drop the preamble (chunks[0]) and the closing "--" epilogue
  const parts: MhtmlPart[] = []
  let html: string | null = null
  for (const chunk of chunks.slice(1)) {
    if (chunk.startsWith('--') || chunk.trim().length === 0) continue
    const sepIdx = chunk.search(/\r?\n\r?\n/)
    if (sepIdx < 0) continue
    const head = chunk.slice(0, sepIdx)
    const bodyStart = sepIdx + (chunk[sepIdx] === '\r' ? 4 : 2)
    const body = chunk.slice(bodyStart)
    const contentType = header(head, 'Content-Type').split(';')[0]!.trim().toLowerCase()
    const encoding = header(head, 'Content-Transfer-Encoding') || '8bit'
    const location = header(head, 'Content-Location')
    if (contentType === 'text/html' && html === null) {
      html = decodePart(body, encoding).toString('utf8')
    } else if (contentType.startsWith('image/') && location) {
      parts.push({ contentType, location, bytes: decodePart(body, encoding) })
    }
  }
  if (html === null) throw new Error('mhtml: no text/html part')
  const resources = new Map<string, MhtmlPart>()
  for (const part of parts) resources.set(part.location, part)
  return { html, resources }
}

/** File extension for an image content-type (the media/ file gets it). */
export function imageExtension(contentType: string): string {
  const map: Record<string, string> = {
    'image/webp': '.webp',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'image/avif': '.avif',
    'image/bmp': '.bmp',
    'image/x-icon': '.ico'
  }
  return map[contentType.toLowerCase()] ?? '.bin'
}
