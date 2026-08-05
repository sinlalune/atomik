import type {
  Completion,
  CompletionContext,
  CompletionResult
} from '@codemirror/autocomplete'
import type { EditorView } from '@codemirror/view'
import { normalizeLabel, parseEdges } from '../../../shared/edge-grammar'
import { vocabularyOf } from '../../../shared/graph-core'
import type { AtomikApi } from '../../../shared/ipc-contract'
import type { VaultFolder } from '../../../shared/ipc-contract'
import { linkableNotesOf } from './quick-actions'

/**
 * Edge autocompletes (CP-MVP-009 S04): `[[` offers note titles (same
 * nearest-wins provider as the @ menu), `{` right after a link offers
 * the labels already used — the owner's OWN vocabulary, never an
 * imposed ontology — plus the kebab-normalized form of free input as
 * a "new label" option ("Part of" → `part-of`, ADR-011 alphabet).
 *
 * The vocabulary is VAULT-WIDE since S06: the index's label registry
 * (usage counts) merges with the open document's labels (unsaved
 * edits included). This SOURCE composes into quick-actions' one
 * autocompletion config (CodeMirror allows a single `override`
 * facet) and mounts only in the NOTE editor — chat surfaces render
 * pills without authoring (per-surface capability, owner ruling).
 */

const atomik = (): AtomikApi | undefined =>
  (globalThis as unknown as { atomik?: AtomikApi }).atomik

/** Vault vocabulary first (most-used), then any document-local labels
 *  the index has not seen yet (unsaved edits). */
export function mergeVocabulary(vault: string[], doc: string[]): string[] {
  const seen = new Set(vault)
  return [...vault, ...doc.filter((label) => !seen.has(label))]
}

export type QueryAt = { start: number; query: string }

/** `[[…` context in the text before the cursor (start = offset of the
 *  first target char within that text). Null once the link closed or
 *  the target charset broke (ADR-011: no `[`, `]`, `{`, `}`, newline). */
export function wikiQueryAt(before: string): QueryAt | null {
  const match = /\[\[([^\][{}\n]*)$/.exec(before)
  if (!match) return null
  return { start: match.index + 2, query: match[1]! }
}

/** `{…` label context — only when the brace IMMEDIATELY follows a
 *  closed link (`]]` or `)`), the ADR-011 adjacency rule. The caret
 *  (reverse marker) stays out of the query. */
export function labelQueryAt(before: string): QueryAt | null {
  const match = /(?:\]\]|\))\{(\^?)([A-Za-z0-9-]*)$/.exec(before)
  if (!match) return null
  return {
    start: match.index + match[0]!.length - match[2]!.length,
    query: match[2]!
  }
}

/** Labels already used in the doc, most-used first (the document-local
 *  vocabulary until the S06 registry). */
export function labelsInDoc(doc: string): string[] {
  const counts = new Map<string, number>()
  for (const edge of parseEdges(doc)) {
    if (!edge.decoration) continue
    const label = edge.decoration.label
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label]) => label)
}

/** Insert `text` + `closing` unless the closer was auto-closed already
 *  (closeBrackets), then land the cursor just past the closer. */
const applyClosed =
  (text: string, closing: string) =>
  (view: EditorView, _completion: Completion, from: number, to: number): void => {
    const existing = view.state.doc.sliceString(to, to + closing.length)
    const insert = existing === closing ? text : `${text}${closing}`
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + text.length + closing.length }
    })
  }

export function edgeCompletionSource(
  notePath: string,
  listTree: () => Promise<VaultFolder>
) {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const line = context.state.doc.lineAt(context.pos)
    const before = context.state.doc.sliceString(line.from, context.pos)
    const wiki = wikiQueryAt(before)
    if (wiki) {
      const tree = await listTree()
      const notes = linkableNotesOf(tree, notePath)
      if (notes.length === 0) return null
      return {
        from: line.from + wiki.start,
        options: notes.map(
          (note): Completion => ({
            label: note.name,
            detail: note.relPath,
            type: 'variable',
            apply: applyClosed(note.name, ']]')
          })
        )
      }
    }
    const label = labelQueryAt(before)
    if (label) {
      const vault = await atomik()
        ?.readGraphIndex()
        .then((index) => vocabularyOf(index))
        .catch(() => [] as string[])
      const known = mergeVocabulary(
        vault ?? [],
        labelsInDoc(context.state.doc.toString())
      )
      const options: Completion[] = known.map(
        (l): Completion => ({ label: l, type: 'keyword', apply: applyClosed(l, '}') })
      )
      const normalized = normalizeLabel(label.query)
      if (normalized.length > 0 && !known.includes(normalized)) {
        options.push({
          label: normalized,
          detail: 'new label',
          type: 'keyword',
          apply: applyClosed(normalized, '}')
        })
      }
      if (options.length === 0) return null
      return { from: line.from + label.start, options }
    }
    return null
  }
}
