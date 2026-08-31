/**
 * The proportional face is BUNDLED and defined ONCE.
 *
 * Two rules, learned in that order:
 *
 * 1. It used to be four literals. Changing `:root` alone moved rendered notes
 *    to a new face and left the live editor on the old one — which the
 *    stylesheet forbids in its own words at `.cm-content` ("read <-> live never
 *    shifts the text") and in the `--note-*` block ("both consume THESE, never
 *    their own copies").
 * 2. It then briefly asked the OS for a platform-specific face. Electron is here
 *    for OS universality, and a per-OS stack hands that back: the change was
 *    invisible in a WSL2 dev loop, so it could not be reviewed on the machine
 *    that made it. Inter ships with the app instead.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'

const url = (rel: string) => new URL(rel, import.meta.url)
const STYLES = readFileSync(url('../renderer/src/styles.css'), 'utf8')

/** The literal that was duplicated across four rules. */
const INLINE_STACK = /font-family:\s*system-ui/

describe('note typography', () => {
  it('defines the proportional face exactly once', () => {
    expect(STYLES.match(/^\s*--note-text-font:/gm) ?? []).toHaveLength(1)
  })

  it('routes every proportional surface through the token', () => {
    // Four consumers: :root, the live editor's scroller, the live-preview
    // limit notice, and the inline AI widget.
    expect(STYLES.match(/font-family:\s*var\(--note-text-font\)/g) ?? []).toHaveLength(4)
  })

  it('leaves no rule writing a proportional stack inline', () => {
    // The token's own value still names system-ui as a fallback; a `font-family`
    // PROPERTY that does is a fifth copy.
    expect(STYLES).not.toMatch(INLINE_STACK)
  })

  it('keeps read and live on the same face by construction', () => {
    for (const selector of [
      /^:root \{[\s\S]*?font-family: var\(--note-text-font\);/m,
      /\.editor-host\.live \.cm-scroller \{[^}]*font-family: var\(--note-text-font\)/,
      /\.cm-inline-ai-rendered \{[^}]*font-family: var\(--note-text-font\)/
    ]) {
      expect(STYLES).toMatch(selector)
    }
  })

  it('leads with the bundled face, not with whatever the OS supplies', () => {
    const value = STYLES.match(/--note-text-font:([\s\S]*?);/)?.[1] ?? ''
    expect(value.trimStart().startsWith('Inter')).toBe(true)
    // The system stack stays as a fallback for a failed font load. It must not
    // be the expected outcome, and no OS-specific face may be named at all:
    // one of those is what made this change invisible on the dev platform.
    expect(value).toMatch(/system-ui/)
    expect(value).not.toMatch(/Segoe UI Variable|Helvetica Neue|ui-sans-serif/)
  })

  it('bundles both the roman and the italic file', () => {
    for (const file of ['InterVariable.woff2', 'InterVariable-Italic.woff2']) {
      const path = url(`../renderer/src/fonts/${file}`)
      expect(existsSync(path), `${file} is not in the repository`).toBe(true)
      // wOF2 magic — a text placeholder or an LFS pointer would pass existsSync.
      expect(readFileSync(path).subarray(0, 4).toString('latin1')).toBe('wOF2')
    }
    expect(existsSync(url('../renderer/src/fonts/LICENSE-Inter.txt'))).toBe(true)
  })

  it('declares the full weight axis and a real italic', () => {
    const faces = STYLES.match(/@font-face \{[^}]*\}/g) ?? []
    const inter = faces.filter((face) => /font-family:\s*Inter\b/.test(face))
    expect(inter).toHaveLength(2)
    // A variable range, so bold is drawn rather than synthesised; and a
    // separate italic file, so `em` is not a slant. S05f is what that costs.
    for (const face of inter) expect(face).toMatch(/font-weight:\s*100 900/)
    expect(inter.some((f) => /font-style:\s*normal/.test(f))).toBe(true)
    expect(inter.some((f) => /font-style:\s*italic/.test(f))).toBe(true)
    expect(inter.some((f) => /InterVariable-Italic\.woff2/.test(f))).toBe(true)
  })

  it('does not put tracking on :root, where content would inherit it', () => {
    const root = STYLES.match(/^:root \{[\s\S]*?\n\}/m)?.[0] ?? ''
    expect(root).not.toMatch(/^\s*letter-spacing:/m)
  })
})
