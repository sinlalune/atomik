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
 * selects a docs-only layout; the normal default is home + docs, home
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
    root = makeLeaf([makeTab('home'), makeTab('dev-docs')])
  }
  return { version: 1, root, focusedPaneId: root.id }
}

export function firstLeafId(node: PaneNode): string {
  return node.kind === 'leaf' ? node.id : firstLeafId(node.first)
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
