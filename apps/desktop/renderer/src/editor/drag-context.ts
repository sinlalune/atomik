/**
 * Drag payloads that land in the chat as CONTEXT (CP-MVP-008 S06c5).
 * Tree rows and tabs travel as TREE_DRAG_MIME (tree-menu.ts); a
 * dragged EDITOR SELECTION travels as this module's MIME with its
 * note path + character range, so the chat can quote exactly what
 * was picked up — range-anchored, source-backed checkable.
 */

export const SELECTION_DRAG_MIME = 'application/x-atomik-selection'

export type SelectionDragSource = {
  relPath: string
  from: number
  to: number
}

export function serializeSelectionDrag(source: SelectionDragSource): string {
  return JSON.stringify(source)
}

export function parseSelectionDrag(data: string): SelectionDragSource | null {
  try {
    const parsed: unknown = JSON.parse(data)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as SelectionDragSource).relPath === 'string' &&
      (parsed as SelectionDragSource).relPath.length > 0 &&
      Number.isInteger((parsed as SelectionDragSource).from) &&
      Number.isInteger((parsed as SelectionDragSource).to) &&
      (parsed as SelectionDragSource).from >= 0 &&
      (parsed as SelectionDragSource).to >= (parsed as SelectionDragSource).from
    ) {
      return parsed as SelectionDragSource
    }
  } catch {
    /* not ours */
  }
  return null
}

/**
 * The drop effect a target must answer with (the S06c5 land-failure
 * fix): Chromium REFUSES the drop when dropEffect is not permitted by
 * the source's effectAllowed — the tree sets 'move', tabs set 'copy',
 * CodeMirror selections 'copyMove'. Prefer 'copy' (a context ADD never
 * consumes its source — and a 'move' answer would make CodeMirror
 * delete the dragged selection); fall back to 'move' when the source
 * allows nothing else.
 */
export function compatibleDropEffect(
  effectAllowed: string
): 'copy' | 'move' {
  return /copy|all|uninitialized/i.test(effectAllowed) ? 'copy' : 'move'
}
