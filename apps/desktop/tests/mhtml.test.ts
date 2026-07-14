import { describe, expect, it } from 'vitest'
import { imageExtension, parseMhtml } from '../electron-main/mhtml'

const CRLF = '\r\n'
function buildMhtml(): Buffer {
  const b = 'BOUNDARY'
  const lines = [
    'From: <Saved by Blink>',
    'Snapshot-Content-Location: https://ex.org/p',
    'MIME-Version: 1.0',
    `Content-Type: multipart/related; boundary="${b}"`,
    '',
    `--${b}`,
    'Content-Type: text/html',
    'Content-Transfer-Encoding: quoted-printable',
    'Content-Location: https://ex.org/p',
    '',
    '<html><body><h1>T=C3=A9tra</h1><img src=3D"https://ex.org/fig.png"></body></html>',
    `--${b}`,
    'Content-Type: image/png',
    'Content-Transfer-Encoding: base64',
    'Content-Location: https://ex.org/fig.png',
    '',
    Buffer.from('PNGBYTES').toString('base64'),
    `--${b}--`,
    ''
  ]
  return Buffer.from(lines.join(CRLF), 'latin1')
}

describe('MHTML snapshot parsing (CP-MVP-006 S05)', () => {
  it('decodes the quoted-printable HTML part and collects image resources', () => {
    const { html, resources } = parseMhtml(buildMhtml())
    expect(html).toContain('<h1>Tétra</h1>') // =C3=A9 → é, soft-decoded
    expect(html).toContain('src="https://ex.org/fig.png"') // =3D → =
    const fig = resources.get('https://ex.org/fig.png')
    expect(fig?.contentType).toBe('image/png')
    expect(fig?.bytes.toString('utf8')).toBe('PNGBYTES')
  })

  it('throws on a snapshot with no boundary or no HTML part', () => {
    expect(() => parseMhtml(Buffer.from('not mhtml'))).toThrow('boundary')
    const noHtml = Buffer.from(
      ['Content-Type: multipart/related; boundary="B"', '', '--B--', ''].join(CRLF),
      'latin1'
    )
    expect(() => parseMhtml(noHtml)).toThrow('no text/html')
  })

  it('maps content types to file extensions', () => {
    expect(imageExtension('image/svg+xml')).toBe('.svg')
    expect(imageExtension('image/webp')).toBe('.webp')
    expect(imageExtension('image/jpeg')).toBe('.jpg')
    expect(imageExtension('image/unknown')).toBe('.bin')
  })
})
