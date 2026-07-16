import { describe, expect, it } from 'vitest'
import type { PaneNode, WorkspaceState } from '../shared/ipc-contract'
import {
  activateTab,
  addTab,
  clampTreeWidth,
  closeEmptyPane,
  closePane,
  closeTab,
  closeTabsWithin,
  createDefaultState,
  firstLeafId,
  makeTab,
  migratePaneTrees,
  migrateRetiredViews,
  noteModeOf,
  paneTreeHidden,
  paneTreeOf,
  paneTreeOpenFolders,
  paneTreeScopeOf,
  paneTreeWidth,
  pdfPageOf,
  relocateTabPaths,
  saveModeOf,
  setFocus,
  setFraction,
  setPaneTreeScope,
  setSaveMode,
  setTabView,
  setTheme,
  splitPane,
  themeOf,
  topRightLeafId,
  TREE_WIDTH_DEFAULT,
  updatePaneTree,
  updateTabParams
} from '../renderer/src/workspace/model'

function leaves(node: PaneNode): Array<Extract<PaneNode, { kind: 'leaf' }>> {
  return node.kind === 'leaf' ? [node] : [...leaves(node.first), ...leaves(node.second)]
}

describe('createDefaultState', () => {
  it('defaults to one vault-typed pane with a vault tab (S07e: docs are a New Pane away)', () => {
    const state = createDefaultState('')
    const [leaf] = leaves(state.root)
    expect(leaf!.tabs.map((tab) => tab.view)).toEqual(['vault'])
    expect(leaf!.tree).toEqual({ kind: 'vault' })
    expect(leaf!.activeTabId).toBe(leaf!.tabs[0]!.id)
    expect(state.focusedPaneId).toBe(leaf!.id)
  })

  it('the #dev-docs hash selects a docs-typed pane, with optional deep link', () => {
    const plain = createDefaultState('#dev-docs')
    expect(leaves(plain.root)[0]!.tabs.map((tab) => tab.view)).toEqual(['dev-docs'])
    expect(leaves(plain.root)[0]!.tree).toEqual({ kind: 'docs' })

    const deep = createDefaultState('#dev-docs:bedrock/00_00-orientation.md')
    expect(leaves(deep.root)[0]!.tabs[0]!.params).toEqual({
      docPath: 'bedrock/00_00-orientation.md'
    })
  })
})

describe('noteModeOf (tab mode param)', () => {
  it("defaults to 'live' — seamless is the default (MVP-001)", () => {
    expect(noteModeOf(undefined)).toBe('live')
    expect(noteModeOf({})).toBe('live')
    expect(noteModeOf({ mode: 'live' })).toBe('live')
    expect(noteModeOf({ mode: 'garbage' })).toBe('live')
  })

  it("honors read/source and migrates the retired 'edit' to source", () => {
    expect(noteModeOf({ mode: 'read' })).toBe('read')
    expect(noteModeOf({ mode: 'source' })).toBe('source')
    expect(noteModeOf({ mode: 'edit' })).toBe('source')
  })
})

describe('pdfPageOf (tab page param — PDF viewer restore, S07)', () => {
  it('reads a positive integer page', () => {
    expect(pdfPageOf({ page: '7' })).toBe(7)
    expect(pdfPageOf({ page: '1' })).toBe(1)
  })

  it('anything else reads as absent — the viewer starts at page 1', () => {
    expect(pdfPageOf(undefined)).toBeUndefined()
    expect(pdfPageOf({})).toBeUndefined()
    expect(pdfPageOf({ page: '0' })).toBeUndefined()
    expect(pdfPageOf({ page: '-3' })).toBeUndefined()
    expect(pdfPageOf({ page: '2.5' })).toBeUndefined()
    expect(pdfPageOf({ page: 'garbage' })).toBeUndefined()
  })
})

describe('save mode (workspace settings)', () => {
  it('defaults to auto — absent state, absent settings, unknown values', () => {
    expect(saveModeOf(null)).toBe('auto')
    expect(saveModeOf(createDefaultState(''))).toBe('auto')
    const garbled = {
      ...createDefaultState(''),
      settings: { saveMode: 'yolo' }
    }
    expect(saveModeOf(garbled)).toBe('auto')
  })

  it('setSaveMode round-trips and no-ops on the current value', () => {
    const state = createDefaultState('')
    const manual = setSaveMode(state, 'manual')
    expect(saveModeOf(manual)).toBe('manual')
    expect(setSaveMode(manual, 'manual')).toBe(manual)
    expect(saveModeOf(setSaveMode(manual, 'auto'))).toBe('auto')
  })
})

describe('theme (workspace settings)', () => {
  it("defaults to 'system' — absent state, absent settings, unknown values", () => {
    expect(themeOf(null)).toBe('system')
    expect(themeOf(createDefaultState(''))).toBe('system')
    expect(
      themeOf({ ...createDefaultState(''), settings: { theme: 'neon' } })
    ).toBe('system')
  })

  it('setTheme round-trips, coexists with saveMode, no-ops on same value', () => {
    const state = setSaveMode(createDefaultState(''), 'manual')
    const green = setTheme(state, 'green')
    expect(themeOf(green)).toBe('green')
    expect(saveModeOf(green)).toBe('manual')
    expect(setTheme(green, 'green')).toBe(green)
    expect(themeOf(setTheme(green, 'system'))).toBe('system')
  })
})

describe('topRightLeafId (window-controls seat)', () => {
  it('is the root leaf when there is no split', () => {
    const state = createDefaultState('')
    expect(topRightLeafId(state.root)).toBe(firstLeafId(state.root))
  })

  it('follows the second child of horizontal splits and the first of vertical', () => {
    const state = createDefaultState('')
    const rootLeaf = firstLeafId(state.root)
    const horizontal = splitPane(state, rootLeaf, 'horizontal')
    // horizontal: [ original | new empty ] -> the new right pane
    expect(topRightLeafId(horizontal.root)).toBe(horizontal.focusedPaneId)

    // stack the right pane: [ original | (right-top / right-bottom) ]
    const stacked = splitPane(horizontal, horizontal.focusedPaneId, 'vertical')
    const rightSplit = (stacked.root as Extract<PaneNode, { kind: 'split' }>)
      .second as Extract<PaneNode, { kind: 'split' }>
    expect(topRightLeafId(stacked.root)).toBe(firstLeafId(rightSplit.first))
  })
})

describe('setTabView (new-tab chooser morphing)', () => {
  it('replaces the view and clears params; unknown tab is a no-op', () => {
    const base = createDefaultState('')
    const leafId = firstLeafId(base.root)
    const chooser = makeTab('new')
    const state = addTab(base, leafId, chooser)
    const picked = setTabView(state, chooser.id, 'project')
    const tabs = leaves(picked.root)[0]!.tabs
    const morphed = tabs.find((tab) => tab.id === chooser.id)!
    expect(morphed.view).toBe('project')
    expect(morphed.params).toBeUndefined()
    expect(setTabView(picked, 'ghost-tab', 'vault')).toBe(picked)
  })
})

describe('closeEmptyPane', () => {
  it('collapses an empty split pane into its sibling', () => {
    const base = createDefaultState('')
    const split = splitPane(base, firstLeafId(base.root), 'horizontal')
    const emptyPaneId = split.focusedPaneId
    const closed = closeEmptyPane(split, emptyPaneId)
    expect(closed.root.kind).toBe('leaf')
    expect(closed.focusedPaneId).toBe(firstLeafId(closed.root))
  })

  it('never closes panes with tabs, nor the root leaf', () => {
    const base = createDefaultState('')
    const rootLeaf = firstLeafId(base.root)
    expect(closeEmptyPane(base, rootLeaf)).toBe(base)
    const split = splitPane(base, rootLeaf, 'horizontal')
    expect(closeEmptyPane(split, rootLeaf)).toBe(split)
  })
})

describe('migrateRetiredViews', () => {
  it("maps saved 'home' tabs to vault tabs, anywhere in the tree", () => {
    const state = createDefaultState('')
    const withHome = splitPane(
      addTab(state, firstLeafId(state.root), makeTab('home')),
      firstLeafId(state.root),
      'horizontal'
    )
    const migrated = migrateRetiredViews(withHome)
    const views = leaves(migrated.root).flatMap((leaf) =>
      leaf.tabs.map((tab) => tab.view)
    )
    expect(views).not.toContain('home')
    expect(views.filter((view) => view === 'vault')).toHaveLength(2)
  })

  it('returns the same state identity when nothing is retired', () => {
    const state = createDefaultState('')
    expect(migrateRetiredViews(state)).toBe(state)
  })
})

describe('clampTreeWidth', () => {
  it('clamps to the readable band and rounds', () => {
    expect(clampTreeWidth(80)).toBe(160)
    expect(clampTreeWidth(301.6)).toBe(302)
    expect(clampTreeWidth(9000)).toBe(520)
  })

  it('falls back to the default on non-finite input (garbled param)', () => {
    expect(clampTreeWidth(Number('not-a-width'))).toBe(TREE_WIDTH_DEFAULT)
    expect(clampTreeWidth(Infinity)).toBe(TREE_WIDTH_DEFAULT)
  })
})

describe('splitPane', () => {
  it('keeps the original leaf first and focuses a fresh empty leaf', () => {
    const state = createDefaultState('')
    const originalLeaf = leaves(state.root)[0]!
    const split = splitPane(state, originalLeaf.id, 'horizontal')
    expect(split.root.kind).toBe('split')
    const root = split.root as Extract<PaneNode, { kind: 'split' }>
    expect(root.direction).toBe('horizontal')
    expect(root.fraction).toBe(0.5)
    expect(root.first).toBe(originalLeaf)
    expect((root.second as Extract<PaneNode, { kind: 'leaf' }>).tabs).toEqual([])
    expect(split.focusedPaneId).toBe(root.second.id)
  })

  it('is a no-op for unknown pane ids', () => {
    const state = createDefaultState('')
    expect(splitPane(state, 'nope', 'vertical')).toBe(state)
  })
})

describe('closeTab', () => {
  it('activates the next neighbor when the active tab closes', () => {
    let state = createDefaultState('')
    const leafId = leaves(state.root)[0]!.id
    state = addTab(state, leafId, makeTab('dev-docs'))
    const leaf = leaves(state.root)[0]!
    state = activateTab(state, leafId, leaf.tabs[0]!.id)
    const closed = closeTab(state, leafId, leaf.tabs[0]!.id)
    const after = leaves(closed.root)[0]!
    expect(after.tabs.map((tab) => tab.view)).toEqual(['dev-docs'])
    expect(after.activeTabId).toBe(after.tabs[0]!.id)
  })

  it('collapses an emptied child leaf back into its sibling', () => {
    let state = createDefaultState('')
    const original = leaves(state.root)[0]!
    state = splitPane(state, original.id, 'horizontal')
    const emptyLeaf = leaves(state.root)[1]!
    state = addTab(state, emptyLeaf.id, makeTab('home'))
    const added = leaves(state.root)[1]!

    state = closeTab(state, added.id, added.tabs[0]!.id)
    expect(state.root.kind).toBe('leaf')
    expect(state.root.id).toBe(original.id)
    expect(state.focusedPaneId).toBe(original.id)
  })

  it('keeps an empty root leaf instead of deleting the tree', () => {
    let state = createDefaultState('#dev-docs')
    const leaf = leaves(state.root)[0]!
    state = closeTab(state, leaf.id, leaf.tabs[0]!.id)
    expect(state.root.kind).toBe('leaf')
    expect((state.root as Extract<PaneNode, { kind: 'leaf' }>).tabs).toEqual([])
    expect(state.focusedPaneId).toBe(firstLeafId(state.root))
  })
})

describe('tab and focus operations', () => {
  it('addTab appends, activates, and focuses', () => {
    const state = createDefaultState('')
    const leaf = leaves(state.root)[0]!
    const tab = makeTab('dev-docs', { docPath: 'log.md' })
    const next = addTab(state, leaf.id, tab)
    const after = leaves(next.root)[0]!
    expect(after.tabs).toHaveLength(2)
    expect(after.activeTabId).toBe(tab.id)
  })

  it('activateTab ignores foreign tab ids', () => {
    const state = createDefaultState('')
    const leaf = leaves(state.root)[0]!
    expect(activateTab(state, leaf.id, 'ghost')).toBe(state)
  })

  it('updateTabParams merges params wherever the tab lives', () => {
    let state = createDefaultState('')
    const leafId = leaves(state.root)[0]!.id
    const tab = makeTab('dev-docs', { docPath: 'log.md' })
    state = addTab(state, leafId, tab)
    const next = updateTabParams(state, tab.id, { docPath: 'bedrock/18_18-roadmap.md' })
    expect(leaves(next.root)[0]!.tabs[1]!.params).toEqual({
      docPath: 'bedrock/18_18-roadmap.md'
    })
  })

  it('setFocus validates the pane exists', () => {
    const state = createDefaultState('')
    expect(setFocus(state, 'ghost')).toBe(state)
  })
})

describe('setFraction', () => {
  it('clamps into 0.1–0.9', () => {
    let state: WorkspaceState = createDefaultState('')
    state = splitPane(state, leaves(state.root)[0]!.id, 'vertical')
    const splitId = state.root.id
    expect((setFraction(state, splitId, 0).root as never as { fraction: number }).fraction).toBe(0.1)
    expect((setFraction(state, splitId, 1).root as never as { fraction: number }).fraction).toBe(0.9)
    expect((setFraction(state, splitId, 0.42).root as never as { fraction: number }).fraction).toBe(0.42)
  })
})

describe('relocateTabPaths — tabs follow a renamed/moved note (CP-MVP-007 S04)', () => {
  it('rewrites exact matches and folder prefixes; untouched state keeps identity', () => {
    const base = createDefaultState('h')
    const leafId = base.root.kind === 'leaf' ? base.root.id : ''
    let state = addTab(base, leafId, makeTab('vault', { notePath: 'notes/idea.md' }))
    state = addTab(state, leafId, makeTab('vault', { notePath: 'notes/deep/leaf.md' }))
    state = addTab(state, leafId, makeTab('vault', { notePath: 'other.md' }))

    const renamed = relocateTabPaths(state, 'notes/idea.md', 'essays/idea.md')
    const params = (renamed.root as { tabs: Array<{ params?: Record<string, string> }> }).tabs.map(
      (tab) => tab.params?.['notePath']
    )
    expect(params).toContain('essays/idea.md')
    expect(params).toContain('notes/deep/leaf.md')

    const folderMove = relocateTabPaths(state, 'notes', 'archive/notes')
    const moved = (folderMove.root as { tabs: Array<{ params?: Record<string, string> }> }).tabs.map(
      (tab) => tab.params?.['notePath']
    )
    expect(moved).toContain('archive/notes/idea.md')
    expect(moved).toContain('archive/notes/deep/leaf.md')
    expect(moved).toContain('other.md')

    expect(relocateTabPaths(state, 'ghost.md', 'x.md')).toBe(state)
  })
})

describe('relocateTabPaths — fold state follows a folder move (S05)', () => {
  it('rewrites treeOpen entries under the moved prefix', () => {
    const base = createDefaultState('h')
    const leafId = base.root.kind === 'leaf' ? base.root.id : ''
    const state = addTab(
      base,
      leafId,
      makeTab('vault', {
        notePath: 'notes/idea.md',
        treeOpen: JSON.stringify(['notes', 'notes/deep', 'other'])
      })
    )
    const moved = relocateTabPaths(state, 'notes', 'archive')
    const tab = (moved.root as { tabs: Array<{ params?: Record<string, string> }> }).tabs.find(
      (candidate) => candidate.params?.['notePath'] === 'archive/idea.md'
    )
    expect(tab).toBeDefined()
    expect(JSON.parse(tab!.params!['treeOpen']!)).toEqual([
      'archive',
      'archive/deep',
      'other'
    ])
  })
})

describe('pane tree — ONE panel per pane, typed by the pane (S07d)', () => {
  const rootLeaf = (state: WorkspaceState): Extract<PaneNode, { kind: 'leaf' }> =>
    state.root as Extract<PaneNode, { kind: 'leaf' }>

  it('absent tree reads as the vault tree with defaults', () => {
    const state = createDefaultState('h')
    const tree = paneTreeOf(rootLeaf(state))
    expect(paneTreeScopeOf(tree)).toEqual({ kind: 'vault' })
    expect(paneTreeHidden(tree)).toBe(false)
    expect(paneTreeWidth(tree)).toBe(TREE_WIDTH_DEFAULT)
    expect([...paneTreeOpenFolders(tree)]).toEqual([])
  })

  it('updatePaneTree merges panel preferences; width clamps on read', () => {
    const base = createDefaultState('h')
    const paneId = rootLeaf(base).id
    let state = updatePaneTree(base, paneId, { off: '1', w: '9000' })
    state = updatePaneTree(state, paneId, { open: JSON.stringify(['a']) })
    const tree = paneTreeOf(rootLeaf(state))
    expect(paneTreeHidden(tree)).toBe(true)
    expect(paneTreeWidth(tree)).toBe(520)
    expect([...paneTreeOpenFolders(tree)]).toEqual(['a'])
  })

  it('setPaneTreeScope retypes the pane, keeps prefs, drops stale scope keys', () => {
    const base = createDefaultState('h')
    const paneId = rootLeaf(base).id
    let state = updatePaneTree(base, paneId, { w: '300' })
    state = setPaneTreeScope(state, paneId, {
      kind: 'project',
      projectPath: 'projects/x',
      projectTitle: 'X'
    })
    expect(paneTreeScopeOf(paneTreeOf(rootLeaf(state)))).toEqual({
      kind: 'project',
      projectPath: 'projects/x',
      projectTitle: 'X'
    })
    expect(paneTreeWidth(paneTreeOf(rootLeaf(state)))).toBe(300)
    state = setPaneTreeScope(state, paneId, { kind: 'vault' })
    const tree = paneTreeOf(rootLeaf(state))
    expect(paneTreeScopeOf(tree)).toEqual({ kind: 'vault' })
    expect(tree['projectPath']).toBeUndefined()
    expect(paneTreeWidth(tree)).toBe(300)
  })

  it('a project scope without projectPath reads as vault (garbled state)', () => {
    expect(paneTreeScopeOf({ kind: 'project' })).toEqual({ kind: 'vault' })
  })

  it('splitPane leaves the new pane UNTYPED — it presents the New Pane chooser (S07e)', () => {
    const base = createDefaultState('h')
    const paneId = rootLeaf(base).id
    let state = setPaneTreeScope(base, paneId, {
      kind: 'project',
      projectPath: 'projects/x'
    })
    state = splitPane(state, paneId, 'horizontal')
    const [first, second] = leaves(state.root)
    expect(paneTreeScopeOf(paneTreeOf(first!))).toEqual({
      kind: 'project',
      projectPath: 'projects/x'
    })
    expect(second!.tree).toBeUndefined()
  })

  it('the docs scope round-trips and drops stale project keys', () => {
    const base = createDefaultState('h')
    const paneId = rootLeaf(base).id
    let state = setPaneTreeScope(base, paneId, {
      kind: 'project',
      projectPath: 'projects/x'
    })
    state = setPaneTreeScope(state, paneId, { kind: 'docs' })
    const tree = paneTreeOf(rootLeaf(state))
    expect(paneTreeScopeOf(tree)).toEqual({ kind: 'docs' })
    expect(tree['projectPath']).toBeUndefined()
  })
})

describe('closePane — the tabstrip ✕ (S07e)', () => {
  it('collapses a non-root pane, tabs and all, into its sibling', () => {
    let state = createDefaultState('h')
    const rootId = (state.root as { id: string }).id
    state = splitPane(state, rootId, 'horizontal')
    const second = leaves(state.root)[1]!
    state = addTab(state, second.id, makeTab('vault', { notePath: 'a.md' }))
    const closed = closePane(state, second.id)
    expect(closed.root.kind).toBe('leaf')
    expect((closed.root as { id: string }).id).toBe(rootId)
    expect(closed.focusedPaneId).toBe(rootId)
  })

  it('the root pane empties and loses its type — back to the New Pane chooser', () => {
    const state = createDefaultState('h')
    const rootId = (state.root as { id: string }).id
    const closed = closePane(state, rootId)
    const leaf = closed.root as Extract<PaneNode, { kind: 'leaf' }>
    expect(leaf.tabs).toEqual([])
    expect(leaf.tree).toBeUndefined()
    expect(closePane(closed, rootId)).toBe(closed)
  })
})

describe('setTabView — the chooser morph carries pane params (S07e)', () => {
  it('applies the given params so a project-pane note tab knows its project', () => {
    const base = createDefaultState('h')
    const leafId = (base.root as { id: string }).id
    const chooser = makeTab('new')
    const state = addTab(base, leafId, chooser)
    const picked = setTabView(state, chooser.id, 'project', {
      projectPath: 'projects/x'
    })
    const morphed = leaves(picked.root)[0]!.tabs.find(
      (tab) => tab.id === chooser.id
    )!
    expect(morphed.view).toBe('project')
    expect(morphed.params).toEqual({ projectPath: 'projects/x' })
  })
})

describe('migratePaneTrees — pre-S07d layouts derive the pane tree', () => {
  /** A saved-before-S07d leaf: no `tree` field, params still on tabs. */
  const legacyState = (
    tabs: Array<{ id: string; view: string; params?: Record<string, string> }>,
    activeTabId: string | null
  ): WorkspaceState => ({
    version: 1,
    focusedPaneId: 'p1',
    root: { kind: 'leaf', id: 'p1', tabs, activeTabId }
  })

  it('derives from the ACTIVE tab: project tab types the pane, tree params carry over', () => {
    const state = legacyState(
      [
        { id: 't1', view: 'vault', params: { notePath: 'a.md' } },
        {
          id: 't2',
          view: 'project',
          params: {
            projectPath: 'projects/x',
            projectTitle: 'X',
            tree: 'off',
            treeW: '333',
            treeOpen: JSON.stringify(['projects/x'])
          }
        }
      ],
      't2'
    )
    const migrated = migratePaneTrees(state)
    const tree = paneTreeOf(migrated.root as Extract<PaneNode, { kind: 'leaf' }>)
    expect(paneTreeScopeOf(tree)).toEqual({
      kind: 'project',
      projectPath: 'projects/x',
      projectTitle: 'X'
    })
    expect(paneTreeHidden(tree)).toBe(true)
    expect(paneTreeWidth(tree)).toBe(333)
    expect([...paneTreeOpenFolders(tree)]).toEqual(['projects/x'])
  })

  it('an active dev-docs tab types the pane docs (S07e)', () => {
    const migrated = migratePaneTrees(
      legacyState([{ id: 't1', view: 'dev-docs' }], 't1')
    )
    const tree = paneTreeOf(migrated.root as Extract<PaneNode, { kind: 'leaf' }>)
    expect(paneTreeScopeOf(tree)).toEqual({ kind: 'docs' })
  })

  it('defaults to vault, leaves EMPTY panes untyped, keeps identity when done', () => {
    const migrated = migratePaneTrees(
      legacyState([{ id: 't1', view: 'vault' }], 't1')
    )
    expect((migrated.root as Extract<PaneNode, { kind: 'leaf' }>).tree).toEqual({
      kind: 'vault'
    })
    expect(migratePaneTrees(migrated)).toBe(migrated)

    const empty = migratePaneTrees(legacyState([], ''))
    expect((empty.root as Extract<PaneNode, { kind: 'leaf' }>).tree).toBeUndefined()
  })
})

describe('relocateTabPaths — the pane tree and source/project params follow (S07d)', () => {
  it('rewrites the pane tree scope and fold state on a folder move', () => {
    const base = createDefaultState('h')
    const paneId = (base.root as { id: string }).id
    let state = setPaneTreeScope(base, paneId, {
      kind: 'project',
      projectPath: 'projects/x'
    })
    state = updatePaneTree(state, paneId, {
      open: JSON.stringify(['projects/x', 'projects/x/deep', 'other'])
    })
    const moved = relocateTabPaths(state, 'projects/x', 'archive/x')
    const tree = paneTreeOf(moved.root as Extract<PaneNode, { kind: 'leaf' }>)
    expect(tree['projectPath']).toBe('archive/x')
    expect([...paneTreeOpenFolders(tree)]).toEqual([
      'archive/x',
      'archive/x/deep',
      'other'
    ])
  })

  it('rewrites dossierPath and projectPath tab params too', () => {
    const base = createDefaultState('h')
    const leafId = (base.root as { id: string }).id
    let state = addTab(
      base,
      leafId,
      makeTab('source-image', { dossierPath: 'sources/img/pic/source.md' })
    )
    state = addTab(
      state,
      leafId,
      makeTab('project', { projectPath: 'projects/x', notePath: 'projects/x/a.md' })
    )
    const moved = relocateTabPaths(state, 'sources/img/pic', 'sources/img/photo')
    const dossiers = (moved.root as { tabs: Array<{ params?: Record<string, string> }> }).tabs.map(
      (tab) => tab.params?.['dossierPath']
    )
    expect(dossiers).toContain('sources/img/photo/source.md')
    const proj = relocateTabPaths(state, 'projects/x', 'projects/y')
    const projTab = (proj.root as { tabs: Array<{ params?: Record<string, string> }> }).tabs.find(
      (tab) => tab.params?.['projectPath'] !== undefined
    )
    expect(projTab!.params!['projectPath']).toBe('projects/y')
    expect(projTab!.params!['notePath']).toBe('projects/y/a.md')
  })
})

describe('closeTabsWithin — a delete closes the deleting pane\'s views (S07d)', () => {
  it('closes tabs whose note/dossier/project params sit under the deleted path', () => {
    const base = createDefaultState('h')
    const leafId = (base.root as { id: string }).id
    let state = addTab(base, leafId, makeTab('vault', { notePath: 'notes/a.md' }))
    state = addTab(state, leafId, makeTab('vault', { notePath: 'keep.md' }))
    state = addTab(
      state,
      leafId,
      makeTab('source-image', { dossierPath: 'notes/pic/source.md' })
    )
    const closed = closeTabsWithin(state, leafId, 'notes')
    const params = (closed.root as { tabs: Array<{ params?: Record<string, string> }> }).tabs.map(
      (tab) => tab.params?.['notePath'] ?? tab.params?.['dossierPath']
    )
    expect(params).toContain('keep.md')
    expect(params).not.toContain('notes/a.md')
    expect(params).not.toContain('notes/pic/source.md')
  })

  it('touches only the named pane and keeps identity when nothing matches', () => {
    const base = createDefaultState('h')
    const rootId = (base.root as { id: string }).id
    let state = splitPane(base, rootId, 'horizontal')
    const [first, second] = leaves(state.root)
    state = addTab(state, second!.id, makeTab('vault', { notePath: 'notes/a.md' }))
    const untouched = closeTabsWithin(state, first!.id, 'notes')
    const stillOpen = leaves(untouched.root).some((leaf) =>
      leaf.tabs.some((tab) => tab.params?.['notePath'] === 'notes/a.md')
    )
    expect(stillOpen).toBe(true)
    expect(closeTabsWithin(state, second!.id, 'ghost')).toBe(state)
  })
})
