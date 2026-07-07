import type {
  PaneDirection,
  PaneNode,
  WorkspaceState,
  WorkspaceTab
} from '../../../shared/ipc-contract'

/**
 * Pure workspace-layout operations — the incubating workspace-core kernel
 * (14): tabs, panes, splits, focus. No React, no Electron, no IO, fully
 * unit-tested. Every operation returns a new state (immutability): React
 * re-renders on identity change, and no caller ever sees half-applied
 * mutations.
 */

type LeafNode = Extract<PaneNode, { kind: 'leaf' }>

const newId = (): string => crypto.randomUUID()

export function makeTab(
  view: string,
  params?: Record<string, string>
): WorkspaceTab {
  return params ? { id: newId(), view, params } : { id: newId(), view }
}

export function makeLeaf(tabs: WorkspaceTab[]): LeafNode {
  return { kind: 'leaf', id: newId(), tabs, activeTabId: tabs[0]?.id ?? null }
}

/**
 * First-launch layout. The `#dev-docs[:<relPath>]` hash (smoke, deep links)
 * selects a docs-only layout; the normal default is vault + docs, vault
 * active. A saved state always wins over the hash — this only shapes the
 * default.
 */
export function createDefaultState(hash: string): WorkspaceState {
  let root: LeafNode
  if (hash.startsWith('#dev-docs')) {
    const relPath = hash.startsWith('#dev-docs:')
      ? decodeURIComponent(hash.slice('#dev-docs:'.length))
      : ''
    root = makeLeaf([
      makeTab('dev-docs', relPath ? { docPath: relPath } : undefined)
    ])
  } else {
    root = makeLeaf([makeTab('vault'), makeTab('dev-docs')])
  }
  return { version: 1, root, focusedPaneId: root.id }
}

/** Tab kinds retired from the open set (03) map forward at load time.
 *  'home' was the M0 shell identity card, removed on MVP-001 owner
 *  feedback; a saved layout that still holds one opens as a vault tab. */
const RETIRED_VIEWS: Record<string, string> = { home: 'vault' }

export function migrateRetiredViews(state: WorkspaceState): WorkspaceState {
  const migrate = (node: PaneNode): PaneNode => {
    if (node.kind === 'split') {
      const first = migrate(node.first)
      const second = migrate(node.second)
      return first !== node.first || second !== node.second
        ? { ...node, first, second }
        : node
    }
    let changed = false
    const tabs = node.tabs.map((tab) => {
      const target = RETIRED_VIEWS[tab.view]
      if (!target) return tab
      changed = true
      return { ...tab, view: target }
    })
    return changed ? { ...node, tabs } : node
  }
  const root = migrate(state.root)
  return root === state.root ? state : { ...state, root }
}

export function firstLeafId(node: PaneNode): string {
  return node.kind === 'leaf' ? node.id : firstLeafId(node.first)
}

/** The leaf whose tabstrip occupies the window's top-right corner — the
 *  seat of the window controls in the chromeless frame. Horizontal splits
 *  put it in the second child, vertical splits in the first. */
export function topRightLeafId(node: PaneNode): string {
  if (node.kind === 'leaf') return node.id
  return topRightLeafId(
    node.direction === 'horizontal' ? node.second : node.first
  )
}

function mapNode(node: PaneNode, fn: (node: PaneNode) => PaneNode): PaneNode {
  const mapped = fn(node)
  if (mapped !== node) return mapped
  if (node.kind === 'split') {
    const first = mapNode(node.first, fn)
    const second = mapNode(node.second, fn)
    if (first !== node.first || second !== node.second) {
      return { ...node, first, second }
    }
  }
  return node
}

const clampFraction = (fraction: number): number =>
  Math.min(0.9, Math.max(0.1, fraction))

/** Tree panel width bounds (px). Wide enough to read, never most of the
 *  window; NaN (absent/garbled param) falls back to the default. */
export const TREE_WIDTH_DEFAULT = 240
export function clampTreeWidth(px: number): number {
  if (!Number.isFinite(px)) return TREE_WIDTH_DEFAULT
  return Math.round(Math.min(520, Math.max(160, px)))
}

/** Splits a leaf: it keeps its tabs as the first child; the second child is
 *  a fresh empty leaf, which takes focus. */
export function splitPane(
  state: WorkspaceState,
  paneId: string,
  direction: PaneDirection
): WorkspaceState {
  const empty = makeLeaf([])
  const root = mapNode(state.root, (node) =>
    node.kind === 'leaf' && node.id === paneId
      ? {
          kind: 'split' as const,
          id: newId(),
          direction,
          fraction: 0.5,
          first: node,
          second: empty
        }
      : node
  )
  if (root === state.root) return state
  return { ...state, root, focusedPaneId: empty.id }
}

export function addTab(
  state: WorkspaceState,
  paneId: string,
  tab: WorkspaceTab
): WorkspaceState {
  const root = mapNode(state.root, (node) =>
    node.kind === 'leaf' && node.id === paneId
      ? { ...node, tabs: [...node.tabs, tab], activeTabId: tab.id }
      : node
  )
  if (root === state.root) return state
  return { ...state, root, focusedPaneId: paneId }
}

export function activateTab(
  state: WorkspaceState,
  paneId: string,
  tabId: string
): WorkspaceState {
  const root = mapNode(state.root, (node) =>
    node.kind === 'leaf' &&
    node.id === paneId &&
    node.tabs.some((tab) => tab.id === tabId)
      ? { ...node, activeTabId: tabId }
      : node
  )
  if (root === state.root) return state
  return { ...state, root, focusedPaneId: paneId }
}

/**
 * Removes a tab. A leaf left empty collapses: its parent split is replaced
 * by the sibling. The root leaf is the exception — it may stay empty (the
 * placeholder pane), so the tree never disappears.
 */
export function closeTab(
  state: WorkspaceState,
  paneId: string,
  tabId: string
): WorkspaceState {
  const remove = (node: PaneNode): PaneNode | null => {
    if (node.kind === 'leaf') {
      if (node.id !== paneId) return node
      const index = node.tabs.findIndex((tab) => tab.id === tabId)
      if (index === -1) return node
      const tabs = node.tabs.filter((tab) => tab.id !== tabId)
      if (tabs.length === 0) return null
      const activeTabId =
        node.activeTabId === tabId
          ? (tabs[Math.min(index, tabs.length - 1)]?.id ?? null)
          : node.activeTabId
      return { ...node, tabs, activeTabId }
    }
    const first = remove(node.first)
    const second = remove(node.second)
    if (first === null) return second
    if (second === null) return first
    if (first !== node.first || second !== node.second) {
      return { ...node, first, second }
    }
    return node
  }

  const removed = remove(state.root)
  const root = removed ?? makeLeaf([])
  if (root === state.root) return state
  const focusedPaneId = paneExists(root, state.focusedPaneId)
    ? state.focusedPaneId
    : firstLeafId(root)
  return { ...state, root, focusedPaneId }
}

function paneExists(node: PaneNode, paneId: string): boolean {
  if (node.id === paneId) return node.kind === 'leaf'
  return node.kind === 'split'
    ? paneExists(node.first, paneId) || paneExists(node.second, paneId)
    : false
}

export function setFraction(
  state: WorkspaceState,
  splitId: string,
  fraction: number
): WorkspaceState {
  const clamped = clampFraction(fraction)
  const root = mapNode(state.root, (node) =>
    node.kind === 'split' && node.id === splitId && node.fraction !== clamped
      ? { ...node, fraction: clamped }
      : node
  )
  if (root === state.root) return state
  return { ...state, root }
}

export function setFocus(state: WorkspaceState, paneId: string): WorkspaceState {
  if (state.focusedPaneId === paneId || !paneExists(state.root, paneId)) {
    return state
  }
  return { ...state, focusedPaneId: paneId }
}

/**
 * App-wide save policy (owner feedback on MVP-001: auto-save by default,
 * manual as the opt-out). Lives in workspace settings — a UI preference,
 * never knowledge; absent or unknown values read as 'auto'.
 */
export type SaveMode = 'auto' | 'manual'

/**
 * Note view modes (owner feedback on MVP-001: seamless by default).
 * 'live' = editable with markdown rendered in place (the default),
 * 'source' = raw CodeMirror for IDE lovers, 'read' = rendered HTML.
 * The retired 'edit' param value maps to 'source'; anything unknown
 * lands on the default.
 */
export type NoteViewMode = 'read' | 'live' | 'source'

export function noteModeOf(params?: Record<string, string>): NoteViewMode {
  const raw = params?.['mode']
  if (raw === 'read') return 'read'
  if (raw === 'source' || raw === 'edit') return 'source'
  return 'live'
}

export function saveModeOf(state: WorkspaceState | null): SaveMode {
  return state?.settings?.['saveMode'] === 'manual' ? 'manual' : 'auto'
}

export function setSaveMode(
  state: WorkspaceState,
  mode: SaveMode
): WorkspaceState {
  if (saveModeOf(state) === mode) return state
  return { ...state, settings: { ...state.settings, saveMode: mode } }
}

/**
 * App-wide theme (owner feedback round 2: an explicit dark mode plus
 * soft pastel palettes for bright screens). 'system' follows the OS;
 * pastels are tinted light palettes. Unknown values read as 'system'.
 */
export const THEMES = [
  'system',
  'light',
  'dark',
  'green',
  'blue',
  'orange',
  'grey',
  'pink'
] as const

export type Theme = (typeof THEMES)[number]

export function themeOf(state: WorkspaceState | null): Theme {
  const raw = state?.settings?.['theme'] ?? ''
  return (THEMES as readonly string[]).includes(raw) ? (raw as Theme) : 'system'
}

export function setTheme(state: WorkspaceState, theme: Theme): WorkspaceState {
  if (themeOf(state) === theme) return state
  return { ...state, settings: { ...state.settings, theme } }
}

/** Replaces a tab's VIEW — the new-tab chooser morphing into its pick.
 *  Params reset: they described the previous view. */
export function setTabView(
  state: WorkspaceState,
  tabId: string,
  view: string
): WorkspaceState {
  const root = mapNode(state.root, (node) => {
    if (node.kind !== 'leaf') return node
    const index = node.tabs.findIndex((tab) => tab.id === tabId)
    if (index === -1) return node
    const tabs = [...node.tabs]
    tabs[index] = { id: tabId, view }
    return { ...node, tabs }
  })
  if (root === state.root) return state
  return { ...state, root }
}

/** Closes an EMPTY pane (a split's leftover): the parent split collapses
 *  into the sibling. Panes with tabs and the root leaf are untouched —
 *  the workspace never disappears. */
export function closeEmptyPane(
  state: WorkspaceState,
  paneId: string
): WorkspaceState {
  const remove = (node: PaneNode): PaneNode | null => {
    if (node.kind === 'leaf') {
      return node.id === paneId && node.tabs.length === 0 ? null : node
    }
    const first = remove(node.first)
    const second = remove(node.second)
    if (first === null) return second
    if (second === null) return first
    if (first !== node.first || second !== node.second) {
      return { ...node, first, second }
    }
    return node
  }
  const removed = remove(state.root)
  if (removed === null || removed === state.root) return state
  const focusedPaneId = paneExists(removed, state.focusedPaneId)
    ? state.focusedPaneId
    : firstLeafId(removed)
  return { ...state, root: removed, focusedPaneId }
}

/** Merges params into the tab, wherever it lives (tab ids are unique). */
export function updateTabParams(
  state: WorkspaceState,
  tabId: string,
  params: Record<string, string>
): WorkspaceState {
  const root = mapNode(state.root, (node) => {
    if (node.kind !== 'leaf') return node
    const index = node.tabs.findIndex((tab) => tab.id === tabId)
    if (index === -1) return node
    const tab = node.tabs[index] as WorkspaceTab
    const merged = { ...tab, params: { ...tab.params, ...params } }
    const tabs = [...node.tabs]
    tabs[index] = merged
    return { ...node, tabs }
  })
  if (root === state.root) return state
  return { ...state, root }
}
