import { describe, expect, it } from 'vitest'
import type { PaneNode, WorkspaceState } from '../shared/ipc-contract'
import {
  activateTab,
  addTab,
  clampTreeWidth,
  closeEmptyPane,
  closeTab,
  createDefaultState,
  firstLeafId,
  makeTab,
  migrateRetiredViews,
  noteModeOf,
  saveModeOf,
  setFocus,
  setFraction,
  setSaveMode,
  setTabView,
  setTheme,
  splitPane,
  themeOf,
  topRightLeafId,
  TREE_WIDTH_DEFAULT,
  updateTabParams
} from '../renderer/src/workspace/model'

function leaves(node: PaneNode): Array<Extract<PaneNode, { kind: 'leaf' }>> {
  return node.kind === 'leaf' ? [node] : [...leaves(node.first), ...leaves(node.second)]
}

describe('createDefaultState', () => {
  it('defaults to one pane with vault + dev-docs, vault active', () => {
    const state = createDefaultState('')
    const [leaf] = leaves(state.root)
    expect(leaf!.tabs.map((tab) => tab.view)).toEqual(['vault', 'dev-docs'])
    expect(leaf!.activeTabId).toBe(leaf!.tabs[0]!.id)
    expect(state.focusedPaneId).toBe(leaf!.id)
  })

  it('the #dev-docs hash selects a docs-only layout, with optional deep link', () => {
    const plain = createDefaultState('#dev-docs')
    expect(leaves(plain.root)[0]!.tabs.map((tab) => tab.view)).toEqual(['dev-docs'])

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
    const state = createDefaultState('')
    const leaf = leaves(state.root)[0]!
    const closed = closeTab(state, leaf.id, leaf.tabs[0]!.id)
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
    expect(after.tabs).toHaveLength(3)
    expect(after.activeTabId).toBe(tab.id)
  })

  it('activateTab ignores foreign tab ids', () => {
    const state = createDefaultState('')
    const leaf = leaves(state.root)[0]!
    expect(activateTab(state, leaf.id, 'ghost')).toBe(state)
  })

  it('updateTabParams merges params wherever the tab lives', () => {
    const state = createDefaultState('')
    const tab = leaves(state.root)[0]!.tabs[1]!
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
