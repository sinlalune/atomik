import type {
  PaneDirection,
  PaneNode,
  WorkspaceState,
  WorkspaceTab
} from '../../../shared/ipc-contract'
import { parseOpenFolders, serializeOpenFolders } from '../vault/tree-fold'

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
 * selects a docs-only layout (a docs-typed pane, S07e); the normal default
 * is one vault pane — docs are a New Pane away. A saved state always wins
 * over the hash — this only shapes the default.
 */
export function createDefaultState(hash: string): WorkspaceState {
  let root: LeafNode
  if (hash.startsWith('#dev-docs')) {
    const relPath = hash.startsWith('#dev-docs:')
      ? decodeURIComponent(hash.slice('#dev-docs:'.length))
      : ''
    root = {
      ...makeLeaf([
        makeTab('dev-docs', relPath ? { docPath: relPath } : undefined)
      ]),
      tree: { kind: 'docs' }
    }
  } else {
    root = { ...makeLeaf([makeTab('vault')]), tree: { kind: 'vault' } }
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

/**
 * The pane's ONE tree panel (S07d, owner directive): the tree is pane
 * chrome typed by the PANE — 'vault' or 'project' — and tabs are just
 * views served from it, so switching tabs never changes the panel.
 * Same flat string map as tab params. Keys: kind, projectPath,
 * projectTitle (project scope), off = '1' hidden, w = width px,
 * open = fold state (tree-fold serialization).
 */
export type PaneTree = Record<string, string>

export type PaneTreeScope =
  | { kind: 'vault' }
  | { kind: 'project'; projectPath: string; projectTitle?: string }
  | { kind: 'docs' }

/** What a note view registers with its pane (S07d bridge): the dirty
 *  editor's note path, read at decision time — the pane tree's
 *  navigation guard and the rename/move/delete dirty block use it. */
export type PaneNoteGuard = { dirtyPath: () => string | null }

/** Absent tree reads as the vault tree — the default pane type. */
export function paneTreeOf(node: LeafNode): PaneTree {
  return node.tree ?? { kind: 'vault' }
}

export function paneTreeScopeOf(tree: PaneTree): PaneTreeScope {
  const projectPath = tree['projectPath']
  if (tree['kind'] === 'project' && projectPath) {
    const title = tree['projectTitle']
    return title
      ? { kind: 'project', projectPath, projectTitle: title }
      : { kind: 'project', projectPath }
  }
  if (tree['kind'] === 'docs') return { kind: 'docs' }
  return { kind: 'vault' }
}

export const paneTreeHidden = (tree: PaneTree): boolean => tree['off'] === '1'

export function paneTreeWidth(tree: PaneTree): number {
  const raw = tree['w']
  return raw === undefined ? TREE_WIDTH_DEFAULT : clampTreeWidth(Number(raw))
}

export function paneTreeOpenFolders(tree: PaneTree): ReadonlySet<string> {
  return parseOpenFolders(tree['open'])
}

function mapLeaf(
  state: WorkspaceState,
  paneId: string,
  fn: (node: LeafNode) => LeafNode
): WorkspaceState {
  const root = mapNode(state.root, (node) =>
    node.kind === 'leaf' && node.id === paneId ? fn(node) : node
  )
  return root === state.root ? state : { ...state, root }
}

/** Merges panel preferences (off/w/open) into the pane's tree. */
export function updatePaneTree(
  state: WorkspaceState,
  paneId: string,
  patch: Record<string, string>
): WorkspaceState {
  return mapLeaf(state, paneId, (node) => ({
    ...node,
    tree: { ...paneTreeOf(node), ...patch }
  }))
}

/** Retypes the pane (vault / project / docs). Scope keys are REPLACED —
 *  a stale projectPath must not survive a switch — while panel
 *  preferences (off/w/open) ride along. */
export function setPaneTreeScope(
  state: WorkspaceState,
  paneId: string,
  scope: PaneTreeScope
): WorkspaceState {
  return mapLeaf(state, paneId, (node) => {
    const current = paneTreeOf(node)
    const kept: PaneTree = {}
    for (const key of ['off', 'w', 'open']) {
      const value = current[key]
      if (value !== undefined) kept[key] = value
    }
    const tree: PaneTree =
      scope.kind === 'project'
        ? {
            ...kept,
            kind: 'project',
            projectPath: scope.projectPath,
            ...(scope.projectTitle ? { projectTitle: scope.projectTitle } : {})
          }
        : { ...kept, kind: scope.kind }
    return { ...node, tree }
  })
}

/**
 * S07d load-time migration: leaves saved before the pane owned its tree
 * derive one from the ACTIVE tab — a project tab types the pane
 * 'project', a dev-docs tab types it 'docs' (S07e); the tab's
 * tree/treeW/treeOpen params carry over as the panel's off/w/open, so
 * the owner's widths and fold state survive. Empty leaves stay
 * UNTYPED — they present the New Pane chooser.
 */
export function migratePaneTrees(state: WorkspaceState): WorkspaceState {
  const root = mapNode(state.root, (node) => {
    if (node.kind !== 'leaf' || node.tree !== undefined) return node
    const active =
      node.tabs.find((tab) => tab.id === node.activeTabId) ?? node.tabs[0]
    if (!active) return node
    const tree: PaneTree = { kind: 'vault' }
    const projectPath = active.params?.['projectPath']
    if (active.view === 'project' && projectPath) {
      tree['kind'] = 'project'
      tree['projectPath'] = projectPath
      const title = active.params?.['projectTitle']
      if (title) tree['projectTitle'] = title
    } else if (active.view === 'dev-docs') {
      tree['kind'] = 'docs'
    }
    if (active.params?.['tree'] === 'off') tree['off'] = '1'
    const width = active.params?.['treeW']
    if (width !== undefined) tree['w'] = width
    const open = active.params?.['treeOpen']
    if (open !== undefined) tree['open'] = open
    return { ...node, tree }
  })
  return root === state.root ? state : { ...state, root }
}

/** Splits a leaf: it keeps its tabs as the first child; the second child
 *  is a fresh empty UNTYPED leaf, which takes focus and presents the
 *  New Pane chooser (S07e — the owner picks the pane's tree type). */
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

/**
 * S07e: the tabstrip's ✕ closes the whole PANE — a non-root leaf
 * collapses into its sibling; the root leaf instead empties and loses
 * its type, returning to the New Pane chooser (the workspace never
 * disappears). The caller destroys native views of the closed tabs.
 */
export function closePane(state: WorkspaceState, paneId: string): WorkspaceState {
  if (state.root.kind === 'leaf') {
    if (state.root.id !== paneId) return state
    if (state.root.tabs.length === 0 && state.root.tree === undefined) {
      return state
    }
    const root: LeafNode = {
      kind: 'leaf',
      id: state.root.id,
      tabs: [],
      activeTabId: null
    }
    return { ...state, root }
  }
  const remove = (node: PaneNode): PaneNode | null => {
    if (node.kind === 'leaf') return node.id === paneId ? null : node
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

/** The PDF page a source tab was on (03 recoverable UI state, like
 *  mode/treeW): a positive integer or absent — the viewer then starts
 *  at page 1. */
export function pdfPageOf(params?: Record<string, string>): number | undefined {
  const raw = Number(params?.['page'])
  return Number.isInteger(raw) && raw >= 1 ? raw : undefined
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
 * soft pastel palettes for bright screens; S07n: the ORGANIC-FUTURE
 * family from bedrock 36 — sage-stone/eucalyptus light, moss/biolum
 * dark). 'system' follows the OS; the pre-36 pastels are legacy until
 * the owner prunes them at a bench. Unknown values read as 'system'.
 */
export const THEMES = [
  'system',
  'light',
  'dark',
  'sage-stone',
  'eucalyptus',
  'moss',
  'biolum',
  // S05v warm family (owner request): single-hue terracotta/ember,
  // multicolor-wash sunset/hearth.
  'terracotta',
  'ember',
  'sunset',
  'hearth',
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

/**
 * Note font size (owner request, S05s): ONE setting drives
 * --note-font-size on :root — both modes and every derived token
 * (heading scale, block gap, list indent) follow, so read/live parity
 * survives any size. Stored in px in the settings string map; absent
 * means "the stylesheet default" (0.95rem). Unparsable values read as
 * absent; out-of-band values clamp to the readable band.
 */
export const NOTE_FONT_SIZE_MIN = 12
export const NOTE_FONT_SIZE_MAX = 24
export const NOTE_FONT_SIZE_DEFAULT = 15.2

function clampNoteFontSize(px: number): number {
  return Math.min(NOTE_FONT_SIZE_MAX, Math.max(NOTE_FONT_SIZE_MIN, px))
}

export function noteFontSizeOf(state: WorkspaceState | null): number | null {
  const raw = state?.settings?.['noteFontSize']
  if (raw === undefined) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? clampNoteFontSize(parsed) : null
}

export function setNoteFontSize(
  state: WorkspaceState,
  px: number | null
): WorkspaceState {
  if (px === null || !Number.isFinite(px)) {
    if (state.settings?.['noteFontSize'] === undefined) return state
    const settings = { ...state.settings }
    delete settings['noteFontSize']
    return { ...state, settings }
  }
  const clamped = clampNoteFontSize(px)
  if (noteFontSizeOf(state) === clamped) return state
  return {
    ...state,
    settings: { ...state.settings, noteFontSize: String(clamped) }
  }
}

/**
 * Note column width (owner request, S05u): same contract as the font
 * size — ONE setting overrides --note-column on :root, both modes'
 * reading column follows. Px in the settings map; absent = the
 * stylesheet default (46rem). The band keeps the column readable:
 * narrower than 30rem cramps notes, wider than the default padding
 * allows stops mattering on most panes.
 */
export const NOTE_WIDTH_MIN = 480
export const NOTE_WIDTH_MAX = 1200
export const NOTE_WIDTH_DEFAULT = 736

function clampNoteWidth(px: number): number {
  return Math.min(NOTE_WIDTH_MAX, Math.max(NOTE_WIDTH_MIN, px))
}

export function noteWidthOf(state: WorkspaceState | null): number | null {
  const raw = state?.settings?.['noteWidth']
  if (raw === undefined) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? clampNoteWidth(parsed) : null
}

export function setNoteWidth(
  state: WorkspaceState,
  px: number | null
): WorkspaceState {
  if (px === null || !Number.isFinite(px)) {
    if (state.settings?.['noteWidth'] === undefined) return state
    const settings = { ...state.settings }
    delete settings['noteWidth']
    return { ...state, settings }
  }
  const clamped = clampNoteWidth(px)
  if (noteWidthOf(state) === clamped) return state
  return {
    ...state,
    settings: { ...state.settings, noteWidth: String(clamped) }
  }
}

/** Replaces a tab's VIEW — the new-tab chooser morphing into its pick.
 *  Params reset to the given ones (S07e: a note tab in a project pane
 *  needs its projectPath); they described the previous view otherwise. */
export function setTabView(
  state: WorkspaceState,
  tabId: string,
  view: string,
  params?: Record<string, string>
): WorkspaceState {
  const root = mapNode(state.root, (node) => {
    if (node.kind !== 'leaf') return node
    const index = node.tabs.findIndex((tab) => tab.id === tabId)
    if (index === -1) return node
    const tabs = [...node.tabs]
    tabs[index] = params ? { id: tabId, view, params } : { id: tabId, view }
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

/**
 * CP-MVP-007 S04: a relocated note drags every tab param that pointed
 * at it. The prefix form covers folder moves (S05) for free; the pane
 * tree follows too (S07d — its scope and fold state name paths).
 * Identity-stable when nothing matches.
 */
export function relocateTabPaths(
  state: WorkspaceState,
  from: string,
  to: string
): WorkspaceState {
  const rewrite = (value: string): string =>
    value === from
      ? to
      : value.startsWith(`${from}/`)
        ? `${to}${value.slice(from.length)}`
        : value
  const rewriteFolds = (serialized: string): string | null => {
    const open = [...parseOpenFolders(serialized)]
    const rewritten = open.map(rewrite)
    return rewritten.some((value, index) => value !== open[index])
      ? serializeOpenFolders(new Set(rewritten))
      : null
  }
  const root = mapNode(state.root, (node) => {
    if (node.kind !== 'leaf') return node
    let changed = false
    const tabs = node.tabs.map((tab) => {
      const params: Record<string, string> = { ...tab.params }
      let touched = false
      for (const key of ['notePath', 'dossierPath', 'projectPath']) {
        const value = params[key]
        if (!value) continue
        const next = rewrite(value)
        if (next !== value) {
          params[key] = next
          touched = true
        }
      }
      // folder moves drag the FOLD state too (S05)
      const treeOpen = params['treeOpen']
      if (treeOpen) {
        const folds = rewriteFolds(treeOpen)
        if (folds !== null) {
          params['treeOpen'] = folds
          touched = true
        }
      }
      if (!touched) return tab
      changed = true
      return { ...tab, params }
    })
    // the PANE tree (S07d): project scope and fold state follow
    let tree = node.tree
    if (tree) {
      const patch: Record<string, string> = {}
      const projectPath = tree['projectPath']
      if (projectPath) {
        const next = rewrite(projectPath)
        if (next !== projectPath) patch['projectPath'] = next
      }
      const open = tree['open']
      if (open) {
        const folds = rewriteFolds(open)
        if (folds !== null) patch['open'] = folds
      }
      if (Object.keys(patch).length > 0) {
        tree = { ...tree, ...patch }
        changed = true
      }
    }
    return changed ? { ...node, tabs, ...(tree ? { tree } : {}) } : node
  })
  return root === state.root ? state : { ...state, root }
}

/**
 * S07d: a delete initiated from a pane's tree closes that pane's tabs
 * viewing the deleted note or anything under the deleted folder — a
 * tab is a view from the tree, and the tree item is gone. Other panes
 * keep the S03 behavior (humanized not-found on next read). Web tabs
 * never match (no vault path params), so no native view is orphaned.
 */
export function closeTabsWithin(
  state: WorkspaceState,
  paneId: string,
  relPath: string
): WorkspaceState {
  const gone = (tab: WorkspaceTab): boolean => {
    for (const key of ['notePath', 'dossierPath', 'projectPath']) {
      const value = tab.params?.[key]
      if (value && (value === relPath || value.startsWith(`${relPath}/`))) {
        return true
      }
    }
    return false
  }
  const leaf = ((): LeafNode | null => {
    let found: LeafNode | null = null
    mapNode(state.root, (node) => {
      if (node.kind === 'leaf' && node.id === paneId) found = node
      return node
    })
    return found
  })()
  if (!leaf) return state
  return leaf.tabs.filter(gone).reduce(
    (current, tab) => closeTab(current, paneId, tab.id),
    state
  )
}
