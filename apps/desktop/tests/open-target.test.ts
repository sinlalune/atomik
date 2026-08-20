import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { PaneNode, WorkspaceState } from '../shared/ipc-contract'
import {
  addTab,
  activateTab,
  createDefaultState,
  dockTab,
  firstLeafId,
  makeTab,
  moveTab,
  openNoteAt,
  openNoteInNewPane,
  openNoteInNewPaneAt,
  splitPane,
  updatePaneTree
} from '../renderer/src/workspace/model'
import {
  OPEN_TARGET_SPECS,
  openTargetForKey,
  type OpenTarget
} from '../renderer/src/workspace/open-target'

function leaves(node: PaneNode): Array<Extract<PaneNode, { kind: 'leaf' }>> {
  return node.kind === 'leaf'
    ? [node]
    : [...leaves(node.first), ...leaves(node.second)]
}

/** The split whose direct child holds the tab — the dock test fixture
 *  replaces a leaf with a split, so the fresh pane's parent is found
 *  by content, not position. */
function splitHolding(node: PaneNode, tabId: string): Extract<PaneNode, { kind: 'split' }> | null {
  if (node.kind !== 'split') return null
  const childHas = (child: PaneNode): boolean =>
    child.kind === 'leaf' && child.tabs.some((tab) => tab.id === tabId)
  if (childHas(node.first) || childHas(node.second)) return node
  return splitHolding(node.first, tabId) ?? splitHolding(node.second, tabId)
}

const paneIdOf = (state: WorkspaceState): string => firstLeafId(state.root)

function stateWithWebActiveTab(): WorkspaceState {
  let state = createDefaultState('')
  const paneId = paneIdOf(state)
  state = addTab(state, paneId, makeTab('source-web', { url: 'https://x.test' }))
  const webTabId = leaves(state.root)[0]!.tabs[1]!.id
  return activateTab(state, paneId, webTabId)
}

function forEachTarget(
  run: (target: OpenTarget) => void
): void {
  for (const spec of OPEN_TARGET_SPECS) run(spec.id)
}

describe('openNoteAt — the one open-target model (CP-OPEN-DOCK S02)', () => {
  it('tab-current: the pane\'s active note view adopts the note', () => {
    const state = createDefaultState('')
    const paneId = paneIdOf(state)
    const next = openNoteAt(state, paneId, 'notes/plato.md', { kind: 'vault' }, 'tab-current')
    expect(leaves(next.root)).toHaveLength(1)
    const tab = leaves(next.root)[0]!.tabs[0]!
    expect(tab.view).toBe('vault')
    expect(tab.params?.['notePath']).toBe('notes/plato.md')
    expect(next.focusedPaneId).toBe(paneId)
  })

  it('tab-current: a non-note active tab never adopts — a fresh note tab lands instead', () => {
    const state = stateWithWebActiveTab()
    const paneId = paneIdOf(state)
    const next = openNoteAt(state, paneId, 'notes/plato.md', { kind: 'vault' }, 'tab-current')
    const leaf = leaves(next.root)[0]!
    expect(leaf.tabs).toHaveLength(3)
    expect(leaf.tabs[1]!.view).toBe('source-web')
    expect(leaf.tabs[1]!.params?.['notePath']).toBeUndefined()
    expect(leaf.tabs[2]!.view).toBe('vault')
    expect(leaf.tabs[2]!.params?.['notePath']).toBe('notes/plato.md')
  })

  it('tab-current from a CHAT pane keeps the reveal convention (split beside)', () => {
    let state = createDefaultState('')
    const paneId = paneIdOf(state)
    state = splitPane(state, paneId, 'horizontal')
    const chatPane = leaves(state.root)[1]!
    state = addTab(state, chatPane.id, makeTab('chat'))
    const next = openNoteAt(state, chatPane.id, 'notes/plato.md', { kind: 'chat' }, 'tab-current')
    // revealNote: no tab views the note → it opens in a fresh vault pane beside
    expect(leaves(next.root)).toHaveLength(3)
    const fresh = leaves(next.root)[2]!
    expect(fresh.tabs[0]!.params?.['notePath']).toBe('notes/plato.md')
    expect(leaves(next.root)[1]!.tabs.map((tab) => tab.view)).toEqual(['chat'])
  })

  it('tab-new: a fresh note tab lands in the caller pane', () => {
    const state = createDefaultState('')
    const paneId = paneIdOf(state)
    const next = openNoteAt(state, paneId, 'notes/plato.md', { kind: 'vault' }, 'tab-new')
    expect(leaves(next.root)).toHaveLength(1)
    const leaf = leaves(next.root)[0]!
    expect(leaf.tabs).toHaveLength(2)
    expect(leaf.tabs[1]!.params?.['notePath']).toBe('notes/plato.md')
    expect(leaf.activeTabId).toBe(leaf.tabs[1]!.id)
  })

  it('pane-right: splits horizontally, TYPES the new pane, hides its tree', () => {
    const state = createDefaultState('')
    const paneId = paneIdOf(state)
    const next = openNoteAt(state, paneId, 'notes/plato.md', { kind: 'vault' }, 'pane-right')
    expect(next.root.kind).toBe('split')
    const split = next.root as Extract<PaneNode, { kind: 'split' }>
    expect(split.direction).toBe('horizontal')
    const [left, right] = leaves(next.root)
    expect(left!.id).toBe(paneId)
    expect(right!.tree).toEqual({ kind: 'vault', off: '1' })
    expect(right!.tabs[0]!.params?.['notePath']).toBe('notes/plato.md')
    expect(next.focusedPaneId).toBe(right!.id)
  })

  it('pane-below: splits vertically', () => {
    const state = createDefaultState('')
    const paneId = paneIdOf(state)
    const next = openNoteAt(state, paneId, 'notes/plato.md', { kind: 'vault' }, 'pane-below')
    const split = next.root as Extract<PaneNode, { kind: 'split' }>
    expect(split.direction).toBe('vertical')
  })

  it('a project scope carries its bundle into every target', () => {
    const scope = { kind: 'project' as const, projectPath: 'projects/x', projectTitle: 'X' }
    forEachTarget((target) => {
      let state = createDefaultState('')
      const paneId = paneIdOf(state)
      // a project-TYPED pane, so tab-current has a project tab to adopt
      state = addTab(state, paneId, makeTab('project', { projectPath: 'projects/x' }))
      const projectTabId = leaves(state.root)[0]!.tabs[1]!.id
      state = activateTab(state, paneId, projectTabId)
      const next = openNoteAt(state, paneId, 'projects/x/plato.md', scope, target)
      const holder = target === 'pane-right' || target === 'pane-below'
        ? leaves(next.root)[1]!
        : leaves(next.root)[0]!
      const tab =
        target === 'tab-new'
          ? holder.tabs[2]!
          : target === 'pane-right' || target === 'pane-below'
            ? holder.tabs[0]!
            : holder.tabs.find((candidate) => candidate.id === projectTabId)!
      expect(tab.view).toBe('project')
      // adoption keeps the adopted tab's own params; created tabs carry the scope
      expect(tab.params).toEqual(
        target === 'tab-current'
          ? { projectPath: 'projects/x', notePath: 'projects/x/plato.md' }
          : {
              projectPath: 'projects/x',
              projectTitle: 'X',
              notePath: 'projects/x/plato.md'
            }
      )
    })
  })

  it('a CHAT scope splits into a VAULT-typed pane for both pane targets', () => {
    forEachTarget((target) => {
      if (target !== 'pane-right' && target !== 'pane-below') return
      let state = createDefaultState('')
      const paneId = paneIdOf(state)
      state = addTab(state, paneId, makeTab('chat'))
      const next = openNoteAt(state, paneId, 'notes/plato.md', { kind: 'chat' }, target)
      const fresh = leaves(next.root)[1]!
      expect(fresh.tree).toEqual({ kind: 'vault', off: '1' })
      expect(fresh.tabs[0]!.view).toBe('vault')
    })
  })

  it('is identity on an unknown pane for every target', () => {
    forEachTarget((target) => {
      const state = createDefaultState('')
      expect(openNoteAt(state, 'ghost', 'a.md', { kind: 'vault' }, target)).toBe(state)
    })
  })

  it('every target leaves unrelated panes untouched', () => {
    let state = createDefaultState('')
    const paneId = paneIdOf(state)
    state = splitPane(state, paneId, 'horizontal')
    const right = leaves(state.root)[1]!
    state = addTab(state, right.id, makeTab('vault', { notePath: 'keep.md' }))
    forEachTarget((target) => {
      const next = openNoteAt(state, paneId, 'notes/new.md', { kind: 'vault' }, target)
      const kept = leaves(next.root).find((leaf) =>
        leaf.tabs.some((tab) => tab.params?.['notePath'] === 'keep.md')
      )
      expect(kept).toBeDefined()
    })
  })
})

describe('openNoteInNewPaneAt — the generalized sibling (CP-OPEN-DOCK S02)', () => {
  it('horizontal reproduces openNoteInNewPane semantics (fresh IDs aside)', () => {
    const state = createDefaultState('')
    const paneId = paneIdOf(state)
    const viaNew = openNoteInNewPane(state, paneId, 'notes/plato.md', { kind: 'vault' })
    const viaAt = openNoteInNewPaneAt(state, paneId, 'notes/plato.md', { kind: 'vault' }, 'horizontal')
    // both create a horizontal split with an identical first child
    expect(viaAt.root.kind).toBe('split')
    expect(viaNew.root.kind).toBe('split')
    const atSplit = viaAt.root as Extract<PaneNode, { kind: 'split' }>
    const newSplit = viaNew.root as Extract<PaneNode, { kind: 'split' }>
    expect(atSplit.direction).toBe(newSplit.direction)
    expect(atSplit.first).toEqual(newSplit.first)
    const [atSecond] = leaves(viaAt.root).slice(1)
    const [newSecond] = leaves(viaNew.root).slice(1)
    expect(atSecond!.tree).toEqual(newSecond!.tree)
    expect(atSecond!.tabs[0]!.view).toBe(newSecond!.tabs[0]!.view)
    expect(atSecond!.tabs[0]!.params).toEqual(newSecond!.tabs[0]!.params)
    expect(viaAt.focusedPaneId).toBe(atSecond!.id)
  })

  it('vertical splits below with the same typing and hidden-tree convention', () => {
    const state = createDefaultState('')
    const paneId = paneIdOf(state)
    const next = openNoteInNewPaneAt(state, paneId, 'notes/plato.md', { kind: 'vault' }, 'vertical')
    const split = next.root as Extract<PaneNode, { kind: 'split' }>
    expect(split.direction).toBe('vertical')
    const bottom = leaves(next.root)[1]!
    expect(bottom.tree).toEqual({ kind: 'vault', off: '1' })
    expect(bottom.tabs[0]!.params?.['notePath']).toBe('notes/plato.md')
    expect(next.focusedPaneId).toBe(bottom.id)
  })
})

describe('open-target vocabulary (CP-OPEN-DOCK S02)', () => {
  it('names exactly the four accepted targets, each with a shortcut hint', () => {
    expect(OPEN_TARGET_SPECS.map((spec) => spec.id)).toEqual([
      'tab-current',
      'tab-new',
      'pane-right',
      'pane-below'
    ])
    for (const spec of OPEN_TARGET_SPECS) {
      expect(spec.label.length).toBeGreaterThan(0)
      expect(spec.kbd.length).toBeGreaterThan(0)
    }
  })

  it('maps the four keyboard equivalents (Enter stays the native click)', () => {
    expect(openTargetForKey({ key: 'Enter', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false })).toBeNull()
    expect(openTargetForKey({ key: 'Enter', metaKey: true, ctrlKey: false, shiftKey: false, altKey: false })).toBe('tab-new')
    expect(openTargetForKey({ key: 'Enter', metaKey: false, ctrlKey: true, shiftKey: false, altKey: false })).toBe('tab-new')
    expect(openTargetForKey({ key: 'Enter', metaKey: true, ctrlKey: false, shiftKey: true, altKey: false })).toBe('pane-right')
    expect(openTargetForKey({ key: 'Enter', metaKey: true, ctrlKey: false, shiftKey: false, altKey: true })).toBe('pane-below')
    expect(openTargetForKey({ key: ' ', metaKey: true, ctrlKey: false, shiftKey: false, altKey: false })).toBeNull()
    expect(openTargetForKey({ key: 'Enter', metaKey: false, ctrlKey: false, shiftKey: true, altKey: false })).toBeNull()
  })
})

describe('open-target surfaces (source contracts, CP-OPEN-DOCK S02)', () => {
  const menuSource = readFileSync(
    new URL('../renderer/src/workspace/OpenTargetMenu.tsx', import.meta.url),
    'utf8'
  )
  const noteTreeSource = readFileSync(
    new URL('../renderer/src/vault/NoteTree.tsx', import.meta.url),
    'utf8'
  )
  const css = readFileSync(
    new URL('../renderer/src/styles.css', import.meta.url),
    'utf8'
  )
  const cssRule = (selector: string): string => {
    const start = css.indexOf(`${selector} {`)
    if (start < 0) throw new Error(`missing CSS rule: ${selector}`)
    const end = css.indexOf('\n}', start)
    return css.slice(start, end)
  }

  it('the menu is an accessible role=menu listing the four targets', () => {
    expect(menuSource).toContain('role="menu"')
    expect(menuSource).toContain('aria-label={`Open ${noteLabel} as`}')
    expect(menuSource).toContain('OPEN_TARGET_SPECS.map')
    expect(menuSource).toContain("event.key === 'Escape'")
    expect(menuSource).toContain("event.key === 'ArrowDown'")
    expect(menuSource).toContain("event.key === 'ArrowUp'")
  })

  it('tree rows route Mod+click and the shortcut grammar through the shared vocabulary', () => {
    expect(noteTreeSource).toContain('openTargetForKey')
    expect(noteTreeSource).toContain('onOpenAsMenu')
    expect(noteTreeSource).toContain('event.metaKey || event.ctrlKey')
  })

  it('the menu chrome consumes the 36 tokens (glass, radius, shadow, z)', () => {
    const menu = cssRule('.open-target-menu')
    expect(menu).toContain('var(--glass-pop)')
    expect(menu).toContain('var(--radius-lg)')
    expect(menu).toContain('var(--shadow-pop)')
    expect(menu).toContain('var(--z-menu)')
    expect(menu).toContain('backdrop-filter: blur(18px)')
  })

  it('the kbd hint keeps a quiet muted voice (state token, not a literal)', () => {
    const kbd = cssRule('.open-target-kbd')
    expect(kbd).toContain('var(--muted)')
  })
})

describe('moveTab — the one move primitive (CP-OPEN-DOCK S03)', () => {
  it('moves a tab into another pane, appended and activated', () => {
    let state = createDefaultState('')
    const leftId = paneIdOf(state)
    state = splitPane(state, leftId, 'horizontal')
    const rightId = state.focusedPaneId
    const moved = leaves(state.root)[0]!.tabs[0]!
    state = addTab(state, rightId, makeTab('vault', { notePath: 'stay.md' }))
    const next = moveTab(state, moved.id, rightId)
    const [left, right] = leaves(next.root)
    expect(left!.tabs).toHaveLength(0)
    expect(right!.tabs.map((tab) => tab.view)).toEqual(['vault', 'vault'])
    expect(right!.tabs[1]!.id).toBe(moved.id)
    expect(right!.activeTabId).toBe(moved.id)
    expect(next.focusedPaneId).toBe(rightId)
  })

  it('reorders within a strip to an explicit index', () => {
    let state = createDefaultState('')
    const paneId = paneIdOf(state)
    state = addTab(state, paneId, makeTab('vault', { notePath: 'b.md' }))
    state = addTab(state, paneId, makeTab('vault', { notePath: 'c.md' }))
    const tabs = leaves(state.root)[0]!.tabs
    const c = tabs[2]!
    const next = moveTab(state, c.id, paneId, 0)
    expect(leaves(next.root)[0]!.tabs.map((tab) => tab.params?.['notePath'])).toEqual(
      ['c.md', undefined, 'b.md']
    )
  })

  it('a no-op same-position move is identity', () => {
    let state = createDefaultState('')
    const paneId = paneIdOf(state)
    state = addTab(state, paneId, makeTab('vault', { notePath: 'b.md' }))
    const tabs = leaves(state.root)[0]!.tabs
    expect(moveTab(state, tabs[1]!.id, paneId, 1)).toBe(state)
  })

  it('an emptied source pane collapses into its sibling', () => {
    let state = createDefaultState('')
    const leftId = paneIdOf(state)
    state = splitPane(state, leftId, 'horizontal')
    const rightId = state.focusedPaneId
    // the right pane must count as tree-bearing too, else the left pane
    // is the LAST tree-bearing pane and the S06c12 rule keeps it in place
    state = updatePaneTree(state, rightId, { kind: 'vault' })
    state = addTab(state, rightId, makeTab('vault', { notePath: 'stay.md' }))
    const only = leaves(state.root)[0]!.tabs[0]!
    const next = moveTab(state, only.id, rightId)
    expect(next.root.kind).toBe('leaf')
    expect(leaves(next.root)).toHaveLength(1)
    expect(leaves(next.root)[0]!.tabs[1]!.id).toBe(only.id)
  })

  it('clamps out-of-range indexes instead of erroring', () => {
    let state = createDefaultState('')
    const paneId = paneIdOf(state)
    const moved = leaves(state.root)[0]!.tabs[0]!
    state = splitPane(state, paneId, 'horizontal')
    const rightId = state.focusedPaneId
    const appended = moveTab(state, moved.id, rightId, 99)
    expect(leaves(appended.root)[1]!.tabs).toHaveLength(1)
    const prepended = moveTab(state, moved.id, rightId, -1)
    expect(leaves(prepended.root)[1]!.tabs[0]!.id).toBe(moved.id)
  })

  it('is identity when the target pane does not exist', () => {
    const state = createDefaultState('')
    const tabId = leaves(state.root)[0]!.tabs[0]!.id
    expect(moveTab(state, tabId, 'ghost')).toBe(state)
  })
})

describe('dockTab — the tear-out primitive (CP-OPEN-DOCK S03)', () => {
  function twoPaneFixture(): { state: WorkspaceState; leftId: string; rightId: string } {
    let state = createDefaultState('')
    const leftId = paneIdOf(state)
    state = splitPane(state, leftId, 'horizontal')
    const rightId = state.focusedPaneId
    state = addTab(state, leftId, makeTab('vault', { notePath: 'keeper.md' }))
    state = addTab(state, rightId, makeTab('vault', { notePath: 'stay.md' }))
    return { state, leftId, rightId }
  }

  it('right tears the tab into a fresh pane on the requested side', () => {
    const { state, rightId } = twoPaneFixture()
    const moved = leaves(state.root)[0]!.tabs[0]!
    const next = dockTab(state, moved.id, rightId, 'right')
    const [left] = leaves(next.root)
    expect(left!.tabs.map((tab) => tab.params?.['notePath'])).toEqual(['keeper.md'])
    const split = splitHolding(next.root, moved.id)!
    expect(split.direction).toBe('horizontal')
    expect(split.first).toBe(leaves(state.root)[1])
    const fresh = split.second as Extract<PaneNode, { kind: 'leaf' }>
    expect(fresh.tabs[0]!.id).toBe(moved.id)
    expect(next.focusedPaneId).toBe(fresh.id)
  })

  it('left and top put the fresh pane FIRST (the side is real)', () => {
    for (const side of ['left', 'top'] as const) {
      const { state, rightId } = twoPaneFixture()
      const moved = leaves(state.root)[0]!.tabs[0]!
      const next = dockTab(state, moved.id, rightId, side)
      const split = splitHolding(next.root, moved.id)!
      expect(split.direction).toBe(side === 'left' ? 'horizontal' : 'vertical')
      const fresh = split.first as Extract<PaneNode, { kind: 'leaf' }>
      expect(fresh.tabs[0]!.id).toBe(moved.id)
    }
  })

  it('the fresh pane inherits the SOURCE pane tree (project tabs keep their panel)', () => {
    let state = createDefaultState('')
    const leftId = paneIdOf(state)
    state = splitPane(state, leftId, 'horizontal')
    const rightId = state.focusedPaneId
    state = addTab(
      state,
      leftId,
      makeTab('project', { projectPath: 'projects/x', notePath: 'projects/x/a.md' })
    )
    const tree = leaves(state.root)[0]!.tree ?? {}
    const moved = leaves(state.root)[0]!.tabs[1]!
    state = addTab(state, rightId, makeTab('vault', { notePath: 'stay.md' }))
    const next = dockTab(state, moved.id, rightId, 'right')
    const split = splitHolding(next.root, moved.id)!
    const fresh = split.second as Extract<PaneNode, { kind: 'leaf' }>
    expect(fresh.tree).toEqual(tree)
    expect(fresh.tabs[0]!.view).toBe('project')
  })

  it('docking the sole tab of the last tree-bearing pane tears beside the landing pane (never loses the tab)', () => {
    const state = createDefaultState('')
    const paneId = paneIdOf(state)
    const soleTab = leaves(state.root)[0]!.tabs[0]!
    // keepInPlace empties the pane IN PLACE; the tab then tears into a
    // fresh pane beside that landing pane — nothing vanishes
    const next = dockTab(state, soleTab.id, paneId, 'right')
    expect(leaves(next.root)).toHaveLength(2)
    const fresh = leaves(next.root)[1]!
    expect(fresh.tabs[0]!.id).toBe(soleTab.id)
    expect(leaves(next.root)[0]!.tabs).toHaveLength(0)
  })
})
