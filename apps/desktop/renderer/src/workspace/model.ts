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
  /** S06c2 (owner): the chat is a pane TYPE — its tabs are
   *  conversations, and it has no tree panel at all. */
  | { kind: 'chat' }

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
  if (tree['kind'] === 'chat') return { kind: 'chat' }
  return { kind: 'vault' }
}

/** S06c13 (owner: "close the last vault pane and have only tree panel
 *  and chat pane"): chat panes CAN carry the vault tree panel — but
 *  opt-in (absent 'off' reads hidden), so a chat beside a note pane
 *  never doubles the tree. Every other kind keeps opt-out. */
export const paneTreeHidden = (tree: PaneTree): boolean =>
  tree['kind'] === 'chat' ? tree['off'] !== '0' : tree['off'] === '1'

export function paneTreeWidth(tree: PaneTree): number {
  const raw = tree['w']
  return raw === undefined ? TREE_WIDTH_DEFAULT : clampTreeWidth(Number(raw))
}

export function paneTreeOpenFolders(tree: PaneTree): ReadonlySet<string> {
  return parseOpenFolders(tree['open'])
}

/** The transcript note behind a CHAT TAB's `file` param (S06c: the
 *  chat is its own pane; state rides ordinary tab params); empty or
 *  absent = no chat born yet (the file appears at the FIRST message,
 *  never on open). The S06 pane-chrome `chat` leaf map is RETIRED —
 *  still accepted by the state validator, no longer rendered. */
export function chatFileOf(params?: Record<string, string>): string | null {
  const file = params?.['file']
  return file !== undefined && file.length > 0 ? file : null
}

/** Context cap per chat (S06c3): the operation contract caps input
 *  selections at 8 — one primary + linked notes need room too. */
export const CHAT_CONTEXTS_MAX = 6

/**
 * The chat tab's PICKED contexts (S06c3: multiple, ordered — the
 *  first is the primary target for insert/append). Serialized as a
 *  JSON array in the `ctx` param; a legacy single-path value (the
 *  S06c shape) reads as a one-element list.
 */
export function chatContextsOf(params?: Record<string, string>): string[] {
  const raw = params?.['ctx']
  if (raw === undefined || raw.length === 0) return []
  if (raw.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (
        Array.isArray(parsed) &&
        parsed.every((entry): entry is string => typeof entry === 'string')
      ) {
        return parsed.slice(0, CHAT_CONTEXTS_MAX)
      }
    } catch {
      /* garbled — fall through to the legacy read */
    }
  }
  return [raw]
}

export function serializeChatContexts(paths: string[]): string {
  return JSON.stringify(paths.slice(0, CHAT_CONTEXTS_MAX))
}

/**
 * S06c14 (owner: "get rid of the autoloaded context to launch a new
 * subject"): the serialized EMPTY list is the explicit "no context"
 * pick — distinct from an ABSENT ctx param, which means AUTO (best
 * open note). Removing the last pill lands here naturally.
 */
export function chatContextsExplicitNone(
  params?: Record<string, string>
): boolean {
  return params?.['ctx'] === serializeChatContexts([])
}

/**
 * A context entry is a note path, optionally RANGED (S06c5: a dragged
 * editor selection lands as `path#from-to`) — the chat then quotes
 * exactly that slice, range-anchored for the truth checker. Parsing
 * is lenient: a malformed suffix reads as part of the path.
 */
export function parseChatContextEntry(entry: string): {
  path: string
  from?: number
  to?: number
} {
  const match = /^(.*)#(\d+)-(\d+)$/.exec(entry)
  if (match) {
    const from = Number(match[2])
    const to = Number(match[3])
    if (to >= from) return { path: match[1]!, from, to }
  }
  return { path: entry }
}

export function chatContextEntryForSelection(
  relPath: string,
  from: number,
  to: number
): string {
  return `${relPath}#${from}-${to}`
}

/** What a TAB contributes when dragged (S06c5): its note — vault and
 *  project tabs their notePath, source tabs their dossier note, chat
 *  tabs their transcript. Null for path-less views (web, import…). */
export function tabDragSource(
  tab: WorkspaceTab
): { kind: 'note'; relPath: string } | null {
  const relPath =
    tab.view === 'vault' || tab.view === 'project'
      ? tab.params?.['notePath']
      : tab.view === 'source-image'
        ? tab.params?.['dossierPath']
        : tab.view === 'chat'
          ? tab.params?.['file']
          : undefined
  return relPath ? { kind: 'note', relPath } : null
}

/**
 * Every note-bearing OPEN TAB (S06c2): the chat's context picklist
 * covers what the owner calls "open panes" — including tabs that are
 * not the active tab of their pane (only active tabs mount views, so
 * the registry alone misses them). Note tabs contribute their note,
 * source tabs their dossier note. Order = tree order; duplicates
 * collapse to the first occurrence.
 */
export function openNoteTabPaths(
  state: WorkspaceState
): Array<{ notePath: string; kind: 'note' | 'source' }> {
  const seen = new Set<string>()
  const found: Array<{ notePath: string; kind: 'note' | 'source' }> = []
  const walk = (node: PaneNode): void => {
    if (node.kind === 'split') {
      walk(node.first)
      walk(node.second)
      return
    }
    for (const tab of node.tabs) {
      const notePath =
        tab.view === 'vault' || tab.view === 'project'
          ? tab.params?.['notePath']
          : tab.view === 'source-image'
            ? tab.params?.['dossierPath']
            : undefined
      if (!notePath || seen.has(notePath)) continue
      seen.add(notePath)
      found.push({
        notePath,
        kind: tab.view === 'source-image' ? 'source' : 'note'
      })
    }
  }
  walk(state.root)
  return found
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

/**
 * S06b (owner: a chat answer becomes a note that opens BESIDE the
 * chat): split the pane side by side, TYPE the fresh right pane with
 * the given scope (it must not sit on the New Pane chooser), and open
 * the note in it — one dispatch, built from the existing primitives.
 */
export function openNoteInNewPane(
  state: WorkspaceState,
  paneId: string,
  relPath: string,
  scope: PaneTreeScope
): WorkspaceState {
  const split = splitPane(state, paneId, 'horizontal')
  if (split === state) return state
  const newPaneId = split.focusedPaneId
  // the new pane exists to SHOW the note — its tree starts hidden
  // (one toggle away), so the note keeps the width the split gave it
  const typed = updatePaneTree(
    setPaneTreeScope(split, newPaneId, scope),
    newPaneId,
    { off: '1' }
  )
  const tab =
    scope.kind === 'project'
      ? makeTab('project', {
          projectPath: scope.projectPath,
          ...(scope.projectTitle ? { projectTitle: scope.projectTitle } : {}),
          notePath: relPath
        })
      : makeTab('vault', { notePath: relPath })
  return addTab(typed, newPaneId, tab)
}

/**
 * S06c17: clicking a sourced claim REVEALS its source — a tab already
 * viewing that note (note or dossier param) is activated wherever it
 * lives; otherwise the note opens in a fresh pane beside the caller.
 */
export function revealNote(
  state: WorkspaceState,
  paneId: string,
  relPath: string
): WorkspaceState {
  let found: { paneId: string; tabId: string } | null = null
  mapNode(state.root, (node) => {
    if (!found && node.kind === 'leaf') {
      const tab = node.tabs.find(
        (candidate) =>
          candidate.params?.['notePath'] === relPath ||
          candidate.params?.['dossierPath'] === relPath
      )
      if (tab) found = { paneId: node.id, tabId: tab.id }
    }
    return node
  })
  if (found !== null) {
    const target: { paneId: string; tabId: string } = found
    return activateTab(state, target.paneId, target.tabId)
  }
  return openNoteInNewPane(state, paneId, relPath, { kind: 'vault' })
}

/** True when any leaf holds a chat tab — the tabstrip's chat-door
 *  button hides then (S06c15, owner: "the button is still here"):
 *  with a chat pane open, its tab IS the door. */
export function hasChatTab(state: WorkspaceState): boolean {
  let found = false
  mapNode(state.root, (node) => {
    if (!found && node.kind === 'leaf') {
      found = node.tabs.some((tab) => tab.view === 'chat')
    }
    return node
  })
  return found
}

/**
 * S06c (owner redirect: the chat lives in its OWN pane): opens the
 * chat as a first-class pane. An existing chat tab anywhere gets
 * FOCUSED (one conversation surface, not one per trigger); otherwise
 * the given pane splits side by side and the fresh right pane —
 * vault-typed, tree hidden (the chat is the point) — opens a chat
 * tab. Built from the existing primitives; the chat survives its
 * spawning pane exactly because it is a sibling, not chrome.
 *
 * S06c9 (owner: "chat content disappears after switching tabs", the
 * residual door): with several conversations open, this used to
 * activate the strip's FIRST chat tab — coming back through "Open
 * chat" then showed an old (or unborn) conversation instead of the
 * one the owner was on. The pane's ACTIVE chat tab now wins; the
 * first chat tab is only the fallback when none is active.
 */
export function openChatPane(
  state: WorkspaceState,
  paneId: string
): WorkspaceState {
  let existing: { paneId: string; tabId: string } | null = null
  mapNode(state.root, (node) => {
    if (!existing && node.kind === 'leaf') {
      const chats = node.tabs.filter((candidate) => candidate.view === 'chat')
      const tab =
        chats.find((candidate) => candidate.id === node.activeTabId) ?? chats[0]
      if (tab) existing = { paneId: node.id, tabId: tab.id }
    }
    return node
  })
  if (existing !== null) {
    const found: { paneId: string; tabId: string } = existing
    return activateTab(state, found.paneId, found.tabId)
  }
  const split = splitPane(state, paneId, 'horizontal')
  if (split === state) return state
  const newPaneId = split.focusedPaneId
  return addTab(
    setPaneTreeScope(split, newPaneId, { kind: 'chat' }),
    newPaneId,
    makeTab('chat')
  )
}

/**
 * S06c5b (owner: the selection-drag needed a visible door): adds a
 * context entry to the chat — opening/focusing the chat pane first
 * (openChatPane semantics), then merging the entry into the ACTIVE
 * chat tab's ctx list. Duplicate entries no-op past the focus.
 */
export function addChatContext(
  state: WorkspaceState,
  paneId: string,
  entry: string
): WorkspaceState {
  const opened = openChatPane(state, paneId)
  let chatTab: WorkspaceTab | null = null
  mapNode(opened.root, (node) => {
    if (!chatTab && node.kind === 'leaf' && node.id === opened.focusedPaneId) {
      const active = node.tabs.find((tab) => tab.id === node.activeTabId)
      if (active?.view === 'chat') chatTab = active
    }
    return node
  })
  if (chatTab === null) return opened
  const found: WorkspaceTab = chatTab
  const list = chatContextsOf(found.params)
  if (list.includes(entry) || list.length >= CHAT_CONTEXTS_MAX) return opened
  return updateTabParams(opened, found.id, {
    ctx: serializeChatContexts([...list, entry])
  })
}

/**
 * S06c7 (owner: "load old chat, switch tab, come back — wiped"): the
 * history pick used to REPLACE the invoking tab's conversation,
 * duplicating titles and shuffling which tab held what — "coming
 * back" then landed on the wrong (often unborn) tab. A transcript
 * pick now ROUTES: a chat tab already holding that file anywhere is
 * ACTIVATED (one conversation, one tab — never duplicated); an
 * unborn invoking tab loads it in place; otherwise a NEW chat tab
 * opens beside the others.
 */
export function openChatTranscript(
  state: WorkspaceState,
  paneId: string,
  invokingTabId: string,
  relPath: string
): WorkspaceState {
  let existing: { paneId: string; tabId: string } | null = null
  let invokingUnborn = false
  mapNode(state.root, (node) => {
    if (node.kind !== 'leaf') return node
    for (const tab of node.tabs) {
      if (tab.view !== 'chat') continue
      if (!existing && chatFileOf(tab.params) === relPath) {
        existing = { paneId: node.id, tabId: tab.id }
      }
      if (tab.id === invokingTabId && chatFileOf(tab.params) === null) {
        invokingUnborn = true
      }
    }
    return node
  })
  if (existing !== null) {
    const found: { paneId: string; tabId: string } = existing
    return activateTab(state, found.paneId, found.tabId)
  }
  if (invokingUnborn) {
    return updateTabParams(state, invokingTabId, { file: relPath })
  }
  return addTab(state, paneId, makeTab('chat', { file: relPath }))
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

/** A leaf whose panel can show a tree (hidden still counts, the
 *  toggle is one click). Since S06c13 chat panes carry the vault tree
 *  too; only untyped leaves (New Pane chooser) bear none. */
function isTreeBearingLeaf(node: PaneNode): node is LeafNode {
  return node.kind === 'leaf' && node.tree !== undefined
}

function treeBearingCount(node: PaneNode): number {
  if (node.kind === 'split') {
    return treeBearingCount(node.first) + treeBearingCount(node.second)
  }
  return isTreeBearingLeaf(node) ? 1 : 0
}

/** S06c11/12 landing state: tabs closed, VAULT tree SHOWN (a kept
 *  'off' would hide the very panel the landing exists for), width and
 *  fold prefs kept. */
function emptiedOntoVault(node: LeafNode): LeafNode {
  const kept: PaneTree = {}
  for (const key of ['w', 'open']) {
    const value = node.tree?.[key]
    if (value !== undefined) kept[key] = value
  }
  return {
    kind: 'leaf',
    id: node.id,
    tabs: [],
    activeTabId: null,
    tree: { ...kept, kind: 'vault' }
  }
}

/** Already the S06c11 landing state — closing it again is a no-op. */
function isVaultLanding(node: LeafNode): boolean {
  return (
    node.tabs.length === 0 &&
    node.tree?.['kind'] === 'vault' &&
    node.tree?.['off'] === undefined
  )
}

function findLeaf(node: PaneNode, paneId: string): LeafNode | null {
  if (node.kind === 'leaf') return node.id === paneId ? node : null
  return findLeaf(node.first, paneId) ?? findLeaf(node.second, paneId)
}

function leafCount(node: PaneNode): number {
  return node.kind === 'leaf' ? 1 : leafCount(node.first) + leafCount(node.second)
}

/**
 * S06c13 (owner: closing the last vault pane must leave "tree panel +
 * chat pane"): a close that REMOVED a pane must never leave the
 * workspace without a visible tree panel — if every survivor's tree is
 * hidden (chat panes default hidden) or absent, the first pane that
 * has one shows it.
 */
function ensureVisibleTree(state: WorkspaceState): WorkspaceState {
  let visible = false
  let firstTreed: string | null = null
  mapNode(state.root, (node) => {
    if (node.kind === 'leaf' && node.tree !== undefined) {
      if (firstTreed === null) firstTreed = node.id
      if (!paneTreeHidden(node.tree)) visible = true
    }
    return node
  })
  if (visible || firstTreed === null) return state
  return updatePaneTree(state, firstTreed, { off: '0' })
}

/**
 * S07e: the tabstrip's ✕ closes the whole PANE — a non-root leaf
 * collapses into its sibling; the root leaf instead empties (the
 * workspace never disappears). S06c11 (owner: "if we close everything
 * we should always have a current vault tree panel available"): the
 * emptied root lands VAULT-TYPED — tree panel shown, width/fold prefs
 * kept — instead of the untyped New Pane chooser. S06c12 (owner: "if
 * chat pane is open and it is the last tab the left vault tree pane
 * disappears"): the same landing applies to the workspace's LAST
 * tree-bearing pane wherever it sits — closing it empties it in place
 * rather than collapsing it into a treeless (chat) sibling. The
 * caller destroys native views of the closed tabs.
 */
export function closePane(state: WorkspaceState, paneId: string): WorkspaceState {
  if (state.root.kind === 'leaf') {
    if (state.root.id !== paneId) return state
    if (isVaultLanding(state.root)) return state
    return { ...state, root: emptiedOntoVault(state.root) }
  }
  const target = findLeaf(state.root, paneId)
  if (
    target &&
    isTreeBearingLeaf(target) &&
    treeBearingCount(state.root) === 1
  ) {
    if (isVaultLanding(target)) return state
    return mapLeaf(state, paneId, emptiedOntoVault)
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
  return ensureVisibleTree({ ...state, root: removed, focusedPaneId })
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
  // S06c12: the last tree-bearing pane never collapses away — its
  // last tab closing lands it on the vault tree instead
  const closing = findLeaf(state.root, paneId)
  const keepInPlace =
    closing !== null &&
    isTreeBearingLeaf(closing) &&
    treeBearingCount(state.root) === 1
  const remove = (node: PaneNode): PaneNode | null => {
    if (node.kind === 'leaf') {
      if (node.id !== paneId) return node
      const index = node.tabs.findIndex((tab) => tab.id === tabId)
      if (index === -1) return node
      const tabs = node.tabs.filter((tab) => tab.id !== tabId)
      if (tabs.length === 0) {
        return keepInPlace ? emptiedOntoVault(node) : null
      }
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
  // total collapse (last tab anywhere): the workspace lands on an
  // empty VAULT-TYPED pane — the tree stays available (S06c11)
  const root = removed ?? { ...makeLeaf([]), tree: { kind: 'vault' } }
  if (root === state.root) return state
  const focusedPaneId = paneExists(root, state.focusedPaneId)
    ? state.focusedPaneId
    : firstLeafId(root)
  const next = { ...state, root, focusedPaneId }
  // a removed leaf may have carried the only visible tree (S06c13)
  return leafCount(root) < leafCount(state.root)
    ? ensureVisibleTree(next)
    : next
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
  // S06c12: even an explicit ✕ cannot remove the last tree-bearing
  // pane — it re-lands on the visible vault tree instead
  const target = findLeaf(state.root, paneId)
  if (
    target &&
    target.tabs.length === 0 &&
    isTreeBearingLeaf(target) &&
    treeBearingCount(state.root) === 1
  ) {
    if (isVaultLanding(target)) return state
    return mapLeaf(state, paneId, emptiedOntoVault)
  }
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
  return ensureVisibleTree({ ...state, root: removed, focusedPaneId })
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
      // 'file' = a chat tab's transcript (S06c): renames/moves follow
      for (const key of ['notePath', 'dossierPath', 'projectPath', 'file']) {
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
      // a chat tab's picked contexts follow too (S06c3: 'ctx' is a
      // JSON list of note paths; S06c5: entries may carry a #from-to
      // selection suffix — only the PATH half rewrites)
      const ctx = params['ctx']
      if (ctx) {
        const contexts = chatContextsOf({ ctx })
        const rewritten = contexts.map((entry) => {
          const parsed = parseChatContextEntry(entry)
          const next = rewrite(parsed.path)
          if (next === parsed.path) return entry
          return parsed.from !== undefined && parsed.to !== undefined
            ? chatContextEntryForSelection(next, parsed.from, parsed.to)
            : next
        })
        if (rewritten.some((value, index) => value !== contexts[index])) {
          params['ctx'] = serializeChatContexts(rewritten)
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
