import {
  normalizeLabel,
  parseEdges,
  type EdgeDecoration,
  type ParsedEdge
} from '../../../shared/edge-grammar'

/**
 * Edge authoring ops (CP-MVP-009 S05, owner vision: "after the link
 * label a little plus icon that will propose to add an edge, an input
 * field display by widening temporarly the pills"). PURE text ops over
 * the note's raw markdown — each gesture produces ONE single-span
 * change {from, to, insert}, so the CM dispatch (live) and any future
 * string-splice consumer (studio canvas, agents) share the exact same
 * diff shape (03: one gesture, one clean diff).
 *
 * Authoring belongs to the EDITING surface: read renders its task
 * checkboxes disabled for the same reason — an edit happens in the
 * editor. Chat surfaces stay render-only (owner Q5 ruling).
 */

export type EdgeChange = { from: number; to: number; insert: string }

/** The edge whose rendered widget starts exactly at `start`, or null
 *  (offsets move — always re-find against the CURRENT content). */
export function findEdgeAt(content: string, start: number): ParsedEdge | null {
  for (const edge of parseEdges(content)) {
    if (edge.start === start) return edge
    if (edge.start > start) break
  }
  return null
}

const braceOf = (decoration: EdgeDecoration): string =>
  `{${decoration.reverse ? '^' : ''}${decoration.label}}`

/** Add a decoration to an untyped edge. Free input is kebab-normalized
 *  (ADR-011 alphabet); empty/invalid input = no change. */
export function addLabel(
  edge: ParsedEdge,
  rawLabel: string,
  reverse = false
): EdgeChange | null {
  if (edge.decoration) return null
  const label = normalizeLabel(rawLabel)
  if (label.length === 0) return null
  return { from: edge.end, to: edge.end, insert: `{${reverse ? '^' : ''}${label}}` }
}

/** Replace the label of a typed edge, keeping its direction. Empty
 *  input means REMOVE (the input-clears-it gesture). */
export function editLabel(edge: ParsedEdge, rawLabel: string): EdgeChange | null {
  if (!edge.decoration) return null
  const label = normalizeLabel(rawLabel)
  const braceFrom = edge.end - braceOf(edge.decoration).length
  if (label.length === 0) return { from: braceFrom, to: edge.end, insert: '' }
  if (label === edge.decoration.label) return null
  return {
    from: braceFrom,
    to: edge.end,
    insert: braceOf({ label, reverse: edge.decoration.reverse })
  }
}

/** Toggle the direction marker (⇄): {label} ⇄ {^label}. */
export function flipDirection(edge: ParsedEdge): EdgeChange | null {
  if (!edge.decoration) return null
  const braceFrom = edge.end - braceOf(edge.decoration).length
  return {
    from: braceFrom,
    to: edge.end,
    insert: braceOf({ label: edge.decoration.label, reverse: !edge.decoration.reverse })
  }
}

/** Delete the decoration (the edge reverts to an untyped link). */
export function removeLabel(edge: ParsedEdge): EdgeChange | null {
  if (!edge.decoration) return null
  return { from: edge.end - braceOf(edge.decoration).length, to: edge.end, insert: '' }
}
