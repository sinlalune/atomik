/**
 * The proportional face is ONE token with four consumers.
 *
 * It used to be four literals. Changing `:root` alone moved rendered notes to
 * the new face and left the live editor on the old one — which the stylesheet
 * forbids twice in its own words: "so read <-> live never shifts the text"
 * (`.editor-host.live .cm-content`) and "both consume THESE, never their own
 * copies" (the `--note-*` block). These tests exist so the fifth copy cannot be
 * added quietly.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const STYLES = readFileSync(
  new URL('../renderer/src/styles.css', import.meta.url),
  'utf8'
)

/** The literal that was duplicated, in the exact shape it took. */
const LEGACY_STACK = /system-ui,\s*-apple-system,\s*'Segoe UI',\s*Roboto,\s*sans-serif/g

describe('note typography', () => {
  it('defines the proportional face exactly once', () => {
    const definitions = STYLES.match(/^\s*--note-text-font:/gm) ?? []
    expect(definitions).toHaveLength(1)
  })

  it('leads with the faces that make Windows resolve Segoe UI Variable', () => {
    const value = STYLES.match(/--note-text-font:([\s\S]*?);/)?.[1] ?? ''
    const order = ['Inter var', 'ui-sans-serif', 'system-ui', 'Segoe UI Variable Text']
    let cursor = -1
    for (const face of order) {
      const next = value.indexOf(face)
      expect(next, `${face} missing from --note-text-font`).toBeGreaterThan(-1)
      expect(next, `${face} is out of order`).toBeGreaterThan(cursor)
      cursor = next
    }
    // Plain 'Segoe UI' must remain BEHIND the variable face, or Windows 11
    // resolves the older one and the change does nothing there.
    expect(value.indexOf("'Segoe UI Variable Text'"))
      .toBeLessThan(value.lastIndexOf("'Segoe UI'"))
  })

  it('routes every proportional surface through the token', () => {
    // Four consumers: :root, the live editor's scroller, the live-preview
    // limit notice, and the inline AI widget.
    const consumers = STYLES.match(/font-family:\s*var\(--note-text-font\)/g) ?? []
    expect(consumers).toHaveLength(4)
  })

  it('leaves no copy of the old stack anywhere in the sheet', () => {
    expect(STYLES.match(LEGACY_STACK)).toBeNull()
  })

  it('keeps the read and live surfaces on the same face by construction', () => {
    for (const selector of [
      /^:root \{[\s\S]*?font-family: var\(--note-text-font\);/m,
      /\.editor-host\.live \.cm-scroller \{[^}]*font-family: var\(--note-text-font\)/,
      /\.cm-inline-ai-rendered \{[^}]*font-family: var\(--note-text-font\)/
    ]) {
      expect(STYLES).toMatch(selector)
    }
  })

  it('does not put tracking on :root, where content would inherit it', () => {
    // letter-spacing is the one property measured to change metrics (~0.5%),
    // and bedrock 36 keeps content typography off the chrome vocabulary.
    const root = STYLES.match(/^:root \{[\s\S]*?\n\}/m)?.[0] ?? ''
    expect(root).not.toMatch(/^\s*letter-spacing:/m)
  })
})
