import { describe, expect, it } from 'vitest'
import type { PaneNode, WorkspaceState } from '../shared/ipc-contract'
import {
  activateTab,
  addChatContext,
  addTab,
  CHAT_CONTEXTS_MAX,
  chatContextEntryForSelection,
  chatContextsExplicitNone,
  chatContextsOf,
  chatFileOf,
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
  NOTE_FONT_SIZE_MAX,
  NOTE_FONT_SIZE_MIN,
  NOTE_WIDTH_MAX,
  NOTE_WIDTH_MIN,
  noteFontSizeOf,
  noteModeOf,
  noteWidthOf,
  openChatPane,
  openChatTranscript,
  openNoteInNewPane,
  openNoteTabPaths,
  parseChatContextEntry,
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
  setNoteFontSize,
  setNoteWidth,
  setPaneTreeScope,
  setSaveMode,
  setTabView,
  serializeChatContexts,
  setTheme,
  splitPane,
  tabDragSource,
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

describe('note font size (workspace settings, S05s)', () => {
  it('reads absent/garbage as null (stylesheet default), clamps stored values', () => {
    expect(noteFontSizeOf(null)).toBeNull()
    expect(noteFontSizeOf(createDefaultState(''))).toBeNull()
    const base = createDefaultState('')
    expect(
      noteFontSizeOf({ ...base, settings: { noteFontSize: 'huge' } })
    ).toBeNull()
    expect(noteFontSizeOf({ ...base, settings: { noteFontSize: '8' } })).toBe(
      NOTE_FONT_SIZE_MIN
    )
    expect(noteFontSizeOf({ ...base, settings: { noteFontSize: '99' } })).toBe(
      NOTE_FONT_SIZE_MAX
    )
  })

  it('setNoteFontSize round-trips as a string setting, clamps, no-ops, resets', () => {
    const state = setTheme(createDefaultState(''), 'dark')
    const sized = setNoteFontSize(state, 18)
    expect(noteFontSizeOf(sized)).toBe(18)
    expect(sized.settings?.['noteFontSize']).toBe('18')
    expect(themeOf(sized)).toBe('dark')
    expect(setNoteFontSize(sized, 18)).toBe(sized)
    expect(noteFontSizeOf(setNoteFontSize(sized, 5))).toBe(NOTE_FONT_SIZE_MIN)
    const reset = setNoteFontSize(sized, null)
    expect(noteFontSizeOf(reset)).toBeNull()
    expect(reset.settings?.['noteFontSize']).toBeUndefined()
    expect(setNoteFontSize(reset, null)).toBe(reset)
  })
})

describe('note width (workspace settings, S05u)', () => {
  it('same contract as font size: null default, clamped band, string round-trip, reset', () => {
    expect(noteWidthOf(null)).toBeNull()
    const base = createDefaultState('')
    expect(noteWidthOf(base)).toBeNull()
    expect(noteWidthOf({ ...base, settings: { noteWidth: 'wide' } })).toBeNull()
    expect(noteWidthOf({ ...base, settings: { noteWidth: '100' } })).toBe(
      NOTE_WIDTH_MIN
    )
    expect(noteWidthOf({ ...base, settings: { noteWidth: '5000' } })).toBe(
      NOTE_WIDTH_MAX
    )
    const sized = setNoteWidth(setNoteFontSize(base, 18), 900)
    expect(noteWidthOf(sized)).toBe(900)
    expect(sized.settings?.['noteWidth']).toBe('900')
    expect(noteFontSizeOf(sized)).toBe(18)
    expect(setNoteWidth(sized, 900)).toBe(sized)
    const reset = setNoteWidth(sized, null)
    expect(noteWidthOf(reset)).toBeNull()
    expect(reset.settings?.['noteWidth']).toBeUndefined()
    expect(noteFontSizeOf(reset)).toBe(18)
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

describe('chat pane state (S06c: tab params, not pane chrome)', () => {
  it('chatFileOf reads the transcript param; empty/absent = unborn', () => {
    expect(chatFileOf({ file: 'chats/2026-07-23-q.md' })).toBe(
      'chats/2026-07-23-q.md'
    )
    expect(chatFileOf({ file: '' })).toBeNull()
    expect(chatFileOf(undefined)).toBeNull()
  })

  it('openChatPane spawns a CHAT-TYPED pane beside the current one (S06c2)', () => {
    const state = createDefaultState('')
    const paneId = firstLeafId(state.root)
    const next = openChatPane(state, paneId)
    expect(next.root.kind).toBe('split')
    const [left, right] = leaves(next.root)
    expect(left!.id).toBe(paneId)
    expect(right!.tree).toEqual({ kind: 'chat' })
    expect(right!.tabs[0]!.view).toBe('chat')
    expect(next.focusedPaneId).toBe(right!.id)
  })

  it('openChatPane FOCUSES an existing chat tab instead of spawning another', () => {
    const state = createDefaultState('')
    const paneId = firstLeafId(state.root)
    const withChat = openChatPane(state, paneId)
    const chatPane = leaves(withChat.root)[1]!
    // trigger from the ORIGINAL pane again: no new split, focus moves
    const again = openChatPane(
      setFocus(withChat, paneId),
      paneId
    )
    expect(leaves(again.root).length).toBe(2)
    expect(again.focusedPaneId).toBe(chatPane.id)
  })

  it('openChatPane returns to the ACTIVE conversation, not the strip\'s first chat tab (S06c9)', () => {
    let state = createDefaultState('')
    const paneId = firstLeafId(state.root)
    state = openChatPane(state, paneId)
    const chatPaneId = leaves(state.root)[1]!.id
    // three conversations; the owner is on the LAST one
    state = updateTabParams(state, leaves(state.root)[1]!.tabs[0]!.id, {
      file: 'chats/a.md'
    })
    state = addTab(state, chatPaneId, makeTab('chat', { file: 'chats/b.md' }))
    state = addTab(state, chatPaneId, makeTab('chat', { file: 'chats/c.md' }))
    const activeId = leaves(state.root)[1]!.activeTabId
    expect(
      leaves(state.root)[1]!.tabs.find((tab) => tab.id === activeId)!
        .params?.['file']
    ).toBe('chats/c.md')
    // back in the note pane, the chat door must land on chats/c.md again
    const back = openChatPane(setFocus(state, paneId), paneId)
    expect(leaves(back.root).length).toBe(2)
    expect(back.focusedPaneId).toBe(chatPaneId)
    expect(leaves(back.root)[1]!.activeTabId).toBe(activeId)
  })

  it('the chat pane SURVIVES its origin pane closing (the S06c point)', () => {
    const state = createDefaultState('')
    const originId = firstLeafId(state.root)
    const withChat = openChatPane(state, originId)
    const chatPane = leaves(withChat.root)[1]!
    const closed = closePane(withChat, originId)
    const survivors = leaves(closed.root)
    // S06c13: the chat pane survives ALONE and carries the visible
    // vault tree — "tree panel + chat pane" (owner)
    expect(survivors.length).toBe(1)
    expect(survivors[0]!.id).toBe(chatPane.id)
    expect(survivors[0]!.tabs[0]!.view).toBe('chat')
    expect(paneTreeHidden(survivors[0]!.tree!)).toBe(false)
  })

  it('chatContextsOf round-trips a JSON list, reads legacy single paths, caps (S06c3)', () => {
    expect(chatContextsOf(undefined)).toEqual([])
    expect(chatContextsOf({ ctx: '' })).toEqual([])
    expect(chatContextsOf({ ctx: 'notes/a.md' })).toEqual(['notes/a.md'])
    const list = ['notes/a.md', 'sources/x/source.md']
    expect(chatContextsOf({ ctx: serializeChatContexts(list) })).toEqual(list)
    expect(chatContextsOf({ ctx: '[broken' })).toEqual(['[broken'])
    const many = Array.from({ length: 10 }, (_, i) => `n/${i}.md`)
    expect(
      chatContextsOf({ ctx: JSON.stringify(many) }).length
    ).toBe(CHAT_CONTEXTS_MAX)
  })

  it('relocateTabPaths rewrites paths INSIDE the ctx list (S06c3)', () => {
    const state = createDefaultState('')
    const paneId = firstLeafId(state.root)
    const withChat = openChatPane(state, paneId)
    const chatTabId = leaves(withChat.root)[1]!.tabs[0]!.id
    const withCtx = updateTabParams(withChat, chatTabId, {
      ctx: serializeChatContexts(['notes/a.md', 'notes/deep/b.md'])
    })
    const moved = relocateTabPaths(withCtx, 'notes', 'archive/notes')
    expect(
      chatContextsOf(leaves(moved.root)[1]!.tabs[0]!.params)
    ).toEqual(['archive/notes/a.md', 'archive/notes/deep/b.md'])
  })

  it('the empty ctx list is the explicit NO-CONTEXT pick (S06c14)', () => {
    // absent/empty param = AUTO; serialized empty list = deliberately none
    expect(chatContextsExplicitNone(undefined)).toBe(false)
    expect(chatContextsExplicitNone({ ctx: '' })).toBe(false)
    expect(chatContextsExplicitNone({ ctx: serializeChatContexts([]) })).toBe(true)
    expect(
      chatContextsExplicitNone({ ctx: serializeChatContexts(['a.md']) })
    ).toBe(false)
    expect(chatContextsOf({ ctx: serializeChatContexts([]) })).toEqual([])
  })

  it('context entries encode an optional selection range (S06c5)', () => {
    expect(chatContextEntryForSelection('notes/a.md', 12, 96)).toBe(
      'notes/a.md#12-96'
    )
    expect(parseChatContextEntry('notes/a.md#12-96')).toEqual({
      path: 'notes/a.md',
      from: 12,
      to: 96
    })
    expect(parseChatContextEntry('notes/a.md')).toEqual({ path: 'notes/a.md' })
    // lenient: a malformed suffix stays part of the path
    expect(parseChatContextEntry('notes/a#b.md')).toEqual({ path: 'notes/a#b.md' })
    expect(parseChatContextEntry('notes/a.md#9-3')).toEqual({
      path: 'notes/a.md#9-3'
    })
  })

  it('relocateTabPaths keeps the range suffix while rewriting the path (S06c5)', () => {
    const state = createDefaultState('')
    const paneId = firstLeafId(state.root)
    const withChat = openChatPane(state, paneId)
    const chatTabId = leaves(withChat.root)[1]!.tabs[0]!.id
    const withCtx = updateTabParams(withChat, chatTabId, {
      ctx: serializeChatContexts(['notes/a.md#12-96', 'notes/b.md'])
    })
    const moved = relocateTabPaths(withCtx, 'notes/a.md', 'archive/a.md')
    expect(chatContextsOf(leaves(moved.root)[1]!.tabs[0]!.params)).toEqual([
      'archive/a.md#12-96',
      'notes/b.md'
    ])
  })

  it('tabDragSource: note-bearing tabs drag their note; path-less views do not (S06c5)', () => {
    expect(tabDragSource(makeTab('vault', { notePath: 'a.md' }))).toEqual({
      kind: 'note',
      relPath: 'a.md'
    })
    expect(
      tabDragSource(makeTab('project', { projectPath: 'p', notePath: 'p/a.md' }))
    ).toEqual({ kind: 'note', relPath: 'p/a.md' })
    expect(
      tabDragSource(makeTab('source-image', { dossierPath: 's/source.md' }))
    ).toEqual({ kind: 'note', relPath: 's/source.md' })
    expect(tabDragSource(makeTab('chat', { file: 'chats/q.md' }))).toEqual({
      kind: 'note',
      relPath: 'chats/q.md'
    })
    expect(tabDragSource(makeTab('chat'))).toBeNull()
    expect(tabDragSource(makeTab('source-web', { url: 'https://x' }))).toBeNull()
    expect(tabDragSource(makeTab('capture'))).toBeNull()
  })

  it('addChatContext opens/focuses the chat pane and merges the entry (S06c5b)', () => {
    const state = createDefaultState('')
    const paneId = firstLeafId(state.root)
    // no chat pane yet: spawns one and lands the entry
    const first = addChatContext(state, paneId, 'notes/a.md#12-96')
    const chatLeaf = leaves(first.root)[1]!
    expect(chatLeaf.tabs[0]!.view).toBe('chat')
    expect(chatContextsOf(chatLeaf.tabs[0]!.params)).toEqual(['notes/a.md#12-96'])
    // existing chat pane: focuses it and appends; duplicates no-op
    const second = addChatContext(first, paneId, 'notes/b.md')
    expect(leaves(second.root).length).toBe(2)
    expect(chatContextsOf(leaves(second.root)[1]!.tabs[0]!.params)).toEqual([
      'notes/a.md#12-96',
      'notes/b.md'
    ])
    const third = addChatContext(second, paneId, 'notes/b.md')
    expect(chatContextsOf(leaves(third.root)[1]!.tabs[0]!.params)).toEqual([
      'notes/a.md#12-96',
      'notes/b.md'
    ])
  })

  it('openChatTranscript ROUTES (S06c7): existing tab focused, unborn loads in place, living chat gets a new tab', () => {
    let state = createDefaultState('')
    const paneId = firstLeafId(state.root)
    state = openChatPane(state, paneId)
    const chatPaneId = leaves(state.root)[1]!.id
    const unbornTabId = leaves(state.root)[1]!.tabs[0]!.id

    // unborn invoking tab: loads in place
    const inPlace = openChatTranscript(state, chatPaneId, unbornTabId, 'chats/a.md')
    const afterInPlace = leaves(inPlace.root)[1]!
    expect(afterInPlace.tabs).toHaveLength(1)
    expect(afterInPlace.tabs[0]!.params?.['file']).toBe('chats/a.md')

    // living conversation invoking: a NEW tab opens, the old one keeps its chat
    const newTabbed = openChatTranscript(
      inPlace,
      chatPaneId,
      unbornTabId,
      'chats/b.md'
    )
    const afterNew = leaves(newTabbed.root)[1]!
    expect(afterNew.tabs).toHaveLength(2)
    expect(afterNew.tabs[0]!.params?.['file']).toBe('chats/a.md')
    expect(afterNew.tabs[1]!.params?.['file']).toBe('chats/b.md')
    expect(afterNew.activeTabId).toBe(afterNew.tabs[1]!.id)

    // an existing tab for the file anywhere: ACTIVATED, never duplicated
    const routed = openChatTranscript(
      newTabbed,
      chatPaneId,
      afterNew.tabs[1]!.id,
      'chats/a.md'
    )
    const afterRoute = leaves(routed.root)[1]!
    expect(afterRoute.tabs).toHaveLength(2)
    expect(afterRoute.activeTabId).toBe(afterRoute.tabs[0]!.id)
  })

  it('openNoteTabPaths lists every open note-bearing tab — inactive tabs included, deduped (S06c2)', () => {
    let state = createDefaultState('')
    const paneId = firstLeafId(state.root)
    const noteTab = makeTab('vault', { notePath: 'notes/a.md' })
    const otherTab = makeTab('vault', { notePath: 'notes/b.md' })
    const dupTab = makeTab('project', {
      projectPath: 'p',
      notePath: 'notes/a.md'
    })
    const sourceTab = makeTab('source-image', {
      dossierPath: 'sources/scan/source.md'
    })
    const webTab = makeTab('source-web', { url: 'https://x.test' })
    for (const tab of [noteTab, otherTab, dupTab, sourceTab, webTab]) {
      state = addTab(state, paneId, tab)
    }
    // only ONE tab is active — the others must still be listed
    expect(openNoteTabPaths(state)).toEqual([
      { notePath: 'notes/a.md', kind: 'note' },
      { notePath: 'notes/b.md', kind: 'note' },
      { notePath: 'sources/scan/source.md', kind: 'source' }
    ])
  })

  it('relocateTabPaths — a renamed/moved transcript follows in the chat tab params (S06c)', () => {
    const state = createDefaultState('')
    const paneId = firstLeafId(state.root)
    const withChat = openChatPane(state, paneId)
    const chatPane = leaves(withChat.root)[1]!
    const chatTabId = chatPane.tabs[0]!.id
    const withFile = updateTabParams(withChat, chatTabId, {
      file: 'chats/2026-07-23-q.md'
    })
    const renamed = relocateTabPaths(
      withFile,
      'chats/2026-07-23-q.md',
      'archive/renamed.md'
    )
    expect(
      leaves(renamed.root)[1]!.tabs[0]!.params?.['file']
    ).toBe('archive/renamed.md')
  })
})

describe('openNoteInNewPane — a chat answer\'s note opens beside the chat (S06b)', () => {
  it('splits right, TYPES the new pane, and opens the note in it', () => {
    const state = createDefaultState('')
    const paneId = firstLeafId(state.root)
    const next = openNoteInNewPane(state, paneId, 'notes/plato.md', {
      kind: 'vault'
    })
    expect(next.root.kind).toBe('split')
    const split = next.root as Extract<PaneNode, { kind: 'split' }>
    expect(split.direction).toBe('horizontal')
    const [left, right] = leaves(next.root)
    expect(left!.id).toBe(paneId)
    // the note pane opens with its tree HIDDEN — the note is the point
    expect(right!.tree).toEqual({ kind: 'vault', off: '1' })
    expect(right!.tabs).toHaveLength(1)
    expect(right!.tabs[0]!.view).toBe('vault')
    expect(right!.tabs[0]!.params?.['notePath']).toBe('notes/plato.md')
    expect(next.focusedPaneId).toBe(right!.id)
  })

  it('a project pane opens a project note tab carrying the bundle scope', () => {
    const state = createDefaultState('')
    const paneId = firstLeafId(state.root)
    const next = openNoteInNewPane(state, paneId, 'projects/x/plato.md', {
      kind: 'project',
      projectPath: 'projects/x',
      projectTitle: 'X'
    })
    const right = leaves(next.root)[1]!
    expect(right.tabs[0]!.view).toBe('project')
    expect(right.tabs[0]!.params).toEqual({
      projectPath: 'projects/x',
      projectTitle: 'X',
      notePath: 'projects/x/plato.md'
    })
  })

  it('is identity on an unknown pane', () => {
    const state = createDefaultState('')
    expect(openNoteInNewPane(state, 'ghost', 'a.md', { kind: 'vault' })).toBe(
      state
    )
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

  it('keeps an empty VAULT-TYPED root leaf instead of deleting the tree (S06c11)', () => {
    let state = createDefaultState('#dev-docs')
    const leaf = leaves(state.root)[0]!
    state = closeTab(state, leaf.id, leaf.tabs[0]!.id)
    expect(state.root.kind).toBe('leaf')
    const root = state.root as Extract<PaneNode, { kind: 'leaf' }>
    expect(root.tabs).toEqual([])
    expect(root.tree).toEqual({ kind: 'vault' })
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

  it('the root pane empties onto the VAULT TREE — never a tree-less workspace (S06c11)', () => {
    const state = createDefaultState('h')
    const rootId = (state.root as { id: string }).id
    const closed = closePane(state, rootId)
    const leaf = closed.root as Extract<PaneNode, { kind: 'leaf' }>
    expect(leaf.tabs).toEqual([])
    expect(leaf.tree).toEqual({ kind: 'vault' })
    expect(closePane(closed, rootId)).toBe(closed)
  })

  it('the emptied root keeps its panel prefs while landing on the vault tree (S06c11)', () => {
    let state = createDefaultState('h')
    const rootId = (state.root as { id: string }).id
    state = updatePaneTree(state, rootId, { w: '320', open: 'notes' })
    const closed = closePane(state, rootId)
    const leaf = closed.root as Extract<PaneNode, { kind: 'leaf' }>
    expect(leaf.tree).toEqual({ kind: 'vault', w: '320', open: 'notes' })
  })

  it('closing the last vault pane leaves tree panel + chat pane (S06c13)', () => {
    // the owner's exact arrangement: vault pane + chat pane — closing
    // the vault pane collapses it away and the chat pane SHOWS the
    // vault tree (chat trees are hidden by default, opt-in 'off: 0')
    let state = createDefaultState('')
    const vaultId = firstLeafId(state.root)
    state = openChatPane(state, vaultId)
    const closed = closePane(state, vaultId)
    expect(closed.root.kind).toBe('leaf')
    const chat = closed.root as Extract<PaneNode, { kind: 'leaf' }>
    expect(chat.tree?.['kind']).toBe('chat')
    expect(chat.tabs[0]!.view).toBe('chat')
    expect(paneTreeHidden(chat.tree!)).toBe(false)
  })

  it('closing the vault pane\'s last TAB lands the same way (S06c13)', () => {
    let state = createDefaultState('')
    const vaultId = firstLeafId(state.root)
    state = openChatPane(state, vaultId)
    const vaultLeaf = leaves(state.root)[0]!
    const closed = closeTab(state, vaultId, vaultLeaf.tabs[0]!.id)
    expect(closed.root.kind).toBe('leaf')
    const chat = closed.root as Extract<PaneNode, { kind: 'leaf' }>
    expect(chat.tree?.['kind']).toBe('chat')
    expect(paneTreeHidden(chat.tree!)).toBe(false)
  })

  it('chat trees are hidden by default, shown on opt-in (S06c13)', () => {
    expect(paneTreeHidden({ kind: 'chat' })).toBe(true)
    expect(paneTreeHidden({ kind: 'chat', off: '0' })).toBe(false)
    expect(paneTreeHidden({ kind: 'chat', off: '1' })).toBe(true)
    // other kinds keep opt-out
    expect(paneTreeHidden({ kind: 'vault' })).toBe(false)
  })

  it('a LONE web pane closing its last web tab shows the vault tree (S06c12)', () => {
    // single web pane (vault-typed, tree hidden): the last tree-bearing
    // pane empties in place onto the VISIBLE tree
    let state = createDefaultState('')
    const paneId = firstLeafId(state.root)
    state = updatePaneTree(state, paneId, { off: '1', w: '300' })
    const webTab = makeTab('source-web')
    state = addTab(state, paneId, webTab)
    const vaultLeaf = leaves(state.root)[0]!
    let closed = closeTab(state, paneId, vaultLeaf.tabs[0]!.id)
    closed = closeTab(closed, paneId, webTab.id)
    const after = leaves(closed.root)[0]!
    expect(after.tabs).toEqual([])
    // 'off' dropped — the landing exists to show the tree; width kept
    expect(after.tree).toEqual({ kind: 'vault', w: '300' })
  })

  it('a chat pane itself still collapses away normally (S06c12)', () => {
    let state = createDefaultState('')
    const vaultId = firstLeafId(state.root)
    state = openChatPane(state, vaultId)
    const chatId = leaves(state.root)[1]!.id
    const closed = closePane(state, chatId)
    expect(closed.root.kind).toBe('leaf')
    expect((closed.root as { id: string }).id).toBe(vaultId)
  })

  it('closeEmptyPane on the emptied vault pane beside a chat also lands tree+chat (S06c13)', () => {
    let state = createDefaultState('')
    const vaultId = firstLeafId(state.root)
    state = openChatPane(state, vaultId)
    // empty the vault pane without collapsing it (extra tab first)
    state = addTab(state, vaultId, makeTab('vault'))
    const vaultLeaf = leaves(state.root)[0]!
    state = closeTab(state, vaultId, vaultLeaf.tabs[0]!.id)
    const remaining = leaves(state.root)[0]!
    state = closeTab(state, vaultId, remaining.tabs[0]!.id)
    // the vault pane is gone; the chat pane carries the visible tree
    expect(state.root.kind).toBe('leaf')
    const chat = state.root as Extract<PaneNode, { kind: 'leaf' }>
    expect(chat.tree?.['kind']).toBe('chat')
    expect(paneTreeHidden(chat.tree!)).toBe(false)
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
