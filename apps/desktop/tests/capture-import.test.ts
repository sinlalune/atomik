import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { importCaptureUpload } from '../electron-main/capture-import'
import {
  CaptureSessionManager,
  type InboxUpload
} from '../electron-main/capture-session'
import {
  captureSlug,
  captureTitleOf,
  defaultCaptureDestination
} from '../renderer/src/capture/format'

/**
 * S04: the ONLY inbox→vault path — explicit, wx-guarded, per 07/08 bundle
 * conventions. Failure modes must leave the vault byte-identical.
 */

const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.from('capture-import-original-bytes')
])

let vault: string
let inbox: string

const FIXED_NOW = Date.UTC(2026, 6, 7, 12)

function inboxUpload(overrides: Partial<InboxUpload['info']> = {}): InboxUpload {
  const filePath = join(inbox, '01-abcdef123456.jpg')
  writeFileSync(filePath, JPEG)
  return {
    filePath,
    info: {
      id: 'abcdef123456',
      fileName: 'whiteboard.jpg',
      mimeType: 'image/jpeg',
      bytes: JPEG.length,
      receivedAtMs: FIXED_NOW,
      ...overrides
    }
  }
}

beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), 'atomik-import-vault-'))
  inbox = mkdtempSync(join(tmpdir(), 'atomik-import-inbox-'))
})

afterEach(() => {
  rmSync(vault, { recursive: true, force: true })
  rmSync(inbox, { recursive: true, force: true })
})

const NOW = (): number => FIXED_NOW

describe('importCaptureUpload (S04, 07/08 bundle)', () => {
  it('creates the bundle: original byte-exact + source.md + index.md', () => {
    const result = importCaptureUpload(
      vault,
      { relPath: 'sources/captures/2026-07-07-whiteboard', title: 'Whiteboard session' },
      inboxUpload(),
      NOW
    )
    expect(result.dossierPath).toBe('sources/captures/2026-07-07-whiteboard/source.md')

    const dir = join(vault, 'sources/captures/2026-07-07-whiteboard')
    expect(readdirSync(dir).sort()).toEqual(['index.md', 'original.jpg', 'source.md'])
    expect(readFileSync(join(dir, 'original.jpg'))).toEqual(JPEG)

    const dossier = readFileSync(join(dir, 'source.md'), 'utf8')
    expect(dossier).toContain('type: Atomik Source')
    expect(dossier).toContain('title: Whiteboard session')
    expect(dossier).toContain('resource: ./original.jpg')
    expect(dossier).toContain('source_type: capture')
    expect(dossier).toContain('status: captured')
    expect(dossier).toContain('method: local-wifi-qr')
    expect(dossier).toContain('mime_type: image/jpeg')
    expect(dossier).toContain('original_name: whiteboard.jpg')
    expect(dossier).toContain('id: capture_2026_07_07_abcdef123456')
    expect(dossier).toContain('[Original image](./original.jpg)')

    const index = readFileSync(join(dir, 'index.md'), 'utf8')
    expect(index).toContain('[source.md](./source.md)')
    expect(index).toContain('[original.jpg](./original.jpg)')
  })

  it('never overwrites: a destination holding any bundle file is refused untouched', () => {
    const dir = join(vault, 'sources/captures/taken')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.md'), 'pre-existing dossier\n')

    expect(() =>
      importCaptureUpload(
        vault,
        { relPath: 'sources/captures/taken', title: 'Clobber attempt' },
        inboxUpload(),
        NOW
      )
    ).toThrow(/already holds/)
    // Nothing else appeared, the pre-existing file is byte-identical.
    expect(readdirSync(dir)).toEqual(['source.md'])
    expect(readFileSync(join(dir, 'source.md'), 'utf8')).toBe('pre-existing dossier\n')
  })

  it('rejects traversal, absolute, and hidden destination paths', () => {
    for (const relPath of ['../outside', '/etc/atomik', '.git/captures', 'a/.hidden/b', '']) {
      expect(() =>
        importCaptureUpload(vault, { relPath, title: 'Nope' }, inboxUpload(), NOW)
      ).toThrow(/rejected destination/)
    }
    expect(readdirSync(vault)).toEqual([])
  })

  it('rejects empty and oversized titles', () => {
    for (const title of ['', '   ', 'x'.repeat(201), 42 as unknown as string]) {
      expect(() =>
        importCaptureUpload(
          vault,
          { relPath: 'sources/captures/t', title },
          inboxUpload(),
          NOW
        )
      ).toThrow(/rejected title/)
    }
    expect(readdirSync(vault)).toEqual([])
  })

  it('a vanished inbox file fails before any vault write', () => {
    const upload = inboxUpload()
    rmSync(upload.filePath)
    expect(() =>
      importCaptureUpload(
        vault,
        { relPath: 'sources/captures/gone', title: 'Gone' },
        upload,
        NOW
      )
    ).toThrow()
    expect(existsSync(join(vault, 'sources'))).toBe(false)
  })
})

describe('the full capture loop', () => {
  // Composed exactly like electron-main/index.ts wires it: phone POST over
  // real HTTP -> inbox -> explicit import -> vault bundle, inbox cleared.
  it('phone upload to vault bundle, end to end', async () => {
    const inboxRoot = mkdtempSync(join(tmpdir(), 'atomik-e2e-inbox-'))
    const manager = new CaptureSessionManager({ inboxRoot, host: '127.0.0.1' })
    try {
      const session = await manager.start()
      const response = await fetch(session.uploadUrl.replace('/c/', '/u/'), {
        method: 'POST',
        headers: {
          'content-type': 'image/jpeg',
          'x-atomik-filename': 'board.jpg'
        },
        body: new Uint8Array(JPEG)
      })
      const { uploadId } = (await response.json()) as { uploadId: string }

      const item = manager.getUpload(uploadId)!
      const result = importCaptureUpload(
        vault,
        { relPath: 'sources/captures/e2e', title: 'E2E board' },
        item
      )
      manager.resolveUpload(uploadId, 'imported', result.dossierPath)

      expect(readdirSync(join(vault, 'sources/captures/e2e')).sort()).toEqual([
        'index.md',
        'original.jpg',
        'source.md'
      ])
      expect(readFileSync(join(vault, 'sources/captures/e2e/original.jpg'))).toEqual(JPEG)
      expect(readdirSync(join(inboxRoot, session.id))).toEqual([])
      expect(manager.inspect()!.uploads[0]!.resolution).toBe('imported')
    } finally {
      await manager.dispose()
      rmSync(inboxRoot, { recursive: true, force: true })
    }
  })
})

describe('capture import defaults (renderer)', () => {
  it('slugs and titles from phone file names', () => {
    expect(captureTitleOf('IMG_2042.HEIC')).toBe('IMG 2042')
    expect(captureTitleOf('whiteboard-monday.jpg')).toBe('whiteboard monday')
    expect(captureTitleOf('.jpg')).toBe('Phone capture')
    expect(captureSlug('Notes de Théo!')).toBe('notes-de-theo')
    expect(captureSlug('!!!')).toBe('capture')
  })

  it('proposes the 08 file-model folder', () => {
    expect(defaultCaptureDestination('IMG_2042.HEIC', FIXED_NOW)).toBe(
      'sources/captures/2026-07-07-img-2042'
    )
  })
})
