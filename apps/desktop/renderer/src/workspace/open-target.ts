import type { PaneDirection } from '../../../shared/ipc-contract'

/**
 * The one contextual open-target vocabulary (contract 6, CP-OPEN-DOCK):
 * where a note may land when opened from a tree row, a link pill, or a
 * tab move. Exactly four targets, each with a pointer gesture (Mod+click
 * → OpenTargetMenu) and a keyboard equivalent — designed together with
 * docking, never accumulated as one-off menus.
 *
 * This module carries only the TYPE, the UI metadata, and pure helpers.
 * The layout logic lives in model.ts (openNoteAt) so it stays pure and
 * unit-tested next to the ops it compiles from.
 */

export type OpenTarget = 'tab-current' | 'tab-new' | 'pane-right' | 'pane-below'

export interface OpenTargetSpec {
  id: OpenTarget
  /** Menu label. */
  label: string
  /** Shortcut hint shown in the menu and titles (Ctrl = Cmd on macOS). */
  kbd: string
  /** Split direction, only for the two pane targets. */
  direction: PaneDirection | null
}

export const OPEN_TARGET_SPECS: readonly OpenTargetSpec[] = [
  {
    id: 'tab-current',
    label: 'Open here',
    kbd: 'Enter',
    direction: null
  },
  {
    id: 'tab-new',
    label: 'Open in new tab',
    kbd: 'Ctrl/Cmd+Enter',
    direction: null
  },
  {
    id: 'pane-right',
    label: 'Open in new pane right',
    kbd: 'Ctrl/Cmd+Shift+Enter',
    direction: 'horizontal'
  },
  {
    id: 'pane-below',
    label: 'Open in new pane below',
    kbd: 'Ctrl/Cmd+Alt+Enter',
    direction: 'vertical'
  }
]

/** The keyboard target of a row/link key event, or null when the event
 *  is not an open-target shortcut. Pure so tests can pin the grammar:
 *  Enter = here (handled by the row's native click), Mod+Enter = new
 *  tab, Mod+Shift+Enter = pane right, Mod+Alt+Enter = pane below. */
export function openTargetForKey(event: {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}): OpenTarget | null {
  if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return null
  if (event.altKey) return 'pane-below'
  if (event.shiftKey) return 'pane-right'
  return 'tab-new'
}

export function openTargetSpec(target: OpenTarget): OpenTargetSpec {
  return OPEN_TARGET_SPECS.find((spec) => spec.id === target) as OpenTargetSpec
}
