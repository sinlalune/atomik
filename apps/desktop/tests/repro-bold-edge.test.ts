/**
 * CP-MVP-009 S05c regression suite — the owner's md-link vault shape:
 * pills inside **bold**, @ menu angle-bracket destinations. The edge
 * pill's replace range must contain NO nested decorations (nested
 * replaces corrupt CodeMirror's incremental redraw: a widget rebuilt
 * mid-line vanished — five owner bench rounds to isolate).
 */
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { ensureSyntaxTree } from '@codemirror/language'
import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import {
  computeLivePreviewDecorations,
  type LivePreviewKind
} from '../renderer/src/editor/live-preview'

const OWNER_DOC =
  "## L'ethos\n\nL'**ethos** désigne la **[crédibilité](<crédibilité.md>){definit}** ou la **[fiabilité](<fiabilité.md>)** d'un locuteur.\n\n[hello](<chats/2026-07-24-hello.md>)\n"

function decosOf(doc: string): { from: number; to: number; lp: LivePreviewKind }[] {
  const state = EditorState.create({
    doc,
    selection: EditorSelection.cursor(0),
    extensions: [markdown({ base: markdownLanguage })]
  })
  ensureSyntaxTree(state, state.doc.length, 5000)
  const set = computeLivePreviewDecorations(state)
  const out: { from: number; to: number; lp: LivePreviewKind }[] = []
  const iter = set.iter()
  while (iter.value) {
    out.push({ from: iter.from, to: iter.to, lp: (iter.value.spec as { lp: LivePreviewKind }).lp })
    iter.next()
  }
  return out
}

describe('S05c: edge pills over the owner vault shapes', () => {
  it('emits an edge decoration per link, typed links included', () => {
    const edges = decosOf(OWNER_DOC).filter((d) => d.lp === 'edge')
    expect(edges).toHaveLength(3)
  })

  it('NEVER nests another decoration inside an edge range', () => {
    const decos = decosOf(OWNER_DOC)
    const edges = decos.filter((d) => d.lp === 'edge')
    for (const edge of edges) {
      const nested = decos.filter(
        (d) =>
          d !== edge &&
          d.lp !== 'line' &&
          d.from >= edge.from &&
          d.to <= edge.to
      )
      expect(nested).toEqual([])
    }
  })
})
