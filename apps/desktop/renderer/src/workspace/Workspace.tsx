import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type {
  PaneNode,
  WorkspaceState,
  WorkspaceTab
} from '../../../shared/ipc-contract'
import { DevDocs } from '../dev-docs/DevDocs'
import { frameCoalesced } from './frame-coalesce'
import {
  CloseIcon,
  PlusIcon,
  SplitHorizontalIcon,
  SplitVerticalIcon
} from '../icons'
import { ProjectView } from '../project/ProjectView'
import { noteDisplayName } from '../vault/scope'
import { VaultView } from '../vault/VaultView'
import { WebView } from '../web/WebView'
import {
  activateTab,
  addChatContext,
  addTab,
  closeEmptyPane,
  closePane,
  closeTab,
  closeTabsWithin,
  makeTab,
  noteModeOf,
  hasChatTab,
  paneCount,
  openChatPane,
  openChatTranscript,
  paneTreeHidden,
  paneTreeOf,
  paneTreeScopeOf,
  paneTreeWidth,
  pdfPageOf,
  relationsHiddenOf,
  relationsOpenOf,
  relocateTabPaths,
  revealNote,
  revealSource,
  saveModeOf,
  noteFontSizeOf,
  noteWidthOf,
  setFocus,
  setFraction,
  setPaneTreeScope,
  setSaveMode,
  setTabView,
  splitPane,
  tabDragSource,
  themeOf,
  updatePaneTree,
  updateTabParams,
  type NoteViewMode,
  type PaneNoteGuard,
  type PaneTreeScope
} from './model'
import {
  NewPaneChooser,
  NewTabChooser,
  NewTabFlow,
  type PaneKindPick,
  type TabPick
} from './NewTabChooser'
import { ChatView } from './ChatView'
import { chatHistoryOf, chatRenameTarget } from '../editor/chat-file'
import { TREE_DRAG_MIME } from '../vault/tree-menu'
import { PaneTreePanel } from './PaneTreePanel'
import { ChatIcon, HistoryIcon, SidebarToggleIcon } from '../icons'
import { useWorkspace } from './store'

// Code-split the two heavy views (perf audit 2026-07-15: zero dynamic
// imports meant pdf.js — 24% of a 3 MB bundle — plus qrcode and
// fix-webm-duration parsed at EVERY launch). Their chunks load on the
// first source/import tab; local files, so the Suspense gap is a blink.
const ImportView = lazy(() =>
  import('../import/ImportView').then((m) => ({ default: m.ImportView }))
)
const SourceImageView = lazy(() =>
  import('../source/SourceImageView').then((m) => ({ default: m.SourceImageView }))
)

type Dispatch = (operation: (state: WorkspaceState) => WorkspaceState) => void

const TAB_LABELS: Record<string, string> = {
  'dev-docs': 'Docs',
  vault: 'Vault',
  project: 'Project',
  capture: 'Import',
  'source-image': 'Image',
  'source-web': 'Web',
  chat: 'Chat',
  new: 'New tab'
}

/** A closing web tab tears down its native view (owned by main). */
function destroyTabView(tab: WorkspaceTab): void {
  if (tab.view === 'source-web') void window.atomik.webViewDestroy(tab.id)
}

/** What a New-tab pick opens, given the pane's type (S07e): 'note' is
 *  a note OF THE PANE — project panes open project note tabs, docs
 *  panes a doc tab; 'import' keeps the 'capture' view id so saved
 *  layouts keep opening. */
function tabForPick(
  pick: TabPick,
  scope: PaneTreeScope
): { view: string; params?: Record<string, string> } {
  if (pick === 'import') return { view: 'capture' }
  if (pick === 'web') return { view: 'source-web' }
  if (scope.kind === 'project') {
    return {
      view: 'project',
      params: {
        projectPath: scope.projectPath,
        ...(scope.projectTitle ? { projectTitle: scope.projectTitle } : {})
      }
    }
  }
  if (scope.kind === 'docs') return { view: 'dev-docs' }
  if (scope.kind === 'chat') return { view: 'chat' }
  return { view: 'vault' }
}

function tabLabel(tab: WorkspaceTab): string {
  if (tab.view === 'project' && tab.params?.['projectTitle']) {
    return tab.params['projectTitle']
  }
  if (tab.view === 'chat') {
    const file = tab.params?.['file']
    return file ? noteDisplayName(file) : 'Chat'
  }
  if (tab.view === 'source-image' && tab.params?.['dossierPath']) {
    // The bundle folder names the capture (…/<bundle>/source.md).
    const segments = tab.params['dossierPath'].split('/')
    return segments[segments.length - 2] ?? 'Image'
  }
  if (tab.view === 'source-web' && tab.params?.['url']) {
    try {
      return new URL(tab.params['url']).hostname || 'Web'
    } catch {
      return 'Web'
    }
  }
  const pathParam =
    tab.view === 'dev-docs'
      ? tab.params?.['docPath']
      : tab.view === 'vault'
        ? tab.params?.['notePath']
        : undefined
  if (pathParam) return noteDisplayName(pathParam)
  return TAB_LABELS[tab.view] ?? tab.view
}

function TabContent({
  tab,
  paneId,
  paneScope,
  registerGuard,
  onOpenChat,
  onAddChatContext,
  dispatch
}: {
  tab: WorkspaceTab
  paneId: string
  /** The pane's tree type — a 'new' tab morphs into a view OF this pane. */
  paneScope: PaneTreeScope
  /** Note views register their dirty state with the pane (S07d) so the
   *  pane tree can guard navigation and the refactor verbs. */
  registerGuard: (guard: PaneNoteGuard | null) => void
  /** Opens (or focuses) the CHAT PANE (S06c — the AI selection menu). */
  onOpenChat: () => void
  /** Adds a context entry to the chat pane (S06c5b). */
  onAddChatContext: (entry: string) => void
  dispatch: Dispatch
}): React.JSX.Element {
  const closeThisTab = (): void => {
    destroyTabView(tab)
    dispatch((state) => closeTab(state, paneId, tab.id))
  }
  // App-wide save policy (workspace settings; 'auto' when unset).
  const saveMode = useWorkspace((store) => saveModeOf(store.state))
  const onSaveModeToggle = (): void =>
    dispatch((state) =>
      setSaveMode(state, saveModeOf(state) === 'auto' ? 'manual' : 'auto')
    )
  const mode = noteModeOf(tab.params)
  const onModeChange = (next: NoteViewMode): void =>
    dispatch((state) => updateTabParams(state, tab.id, { mode: next }))
  // S07: the relations strip's disclosure is tab state (03), so a
  // reopened workspace finds the note surface as it was left.
  const relationsOpen = relationsOpenOf(tab.params)
  const onRelationsToggle = (): void =>
    dispatch((state) =>
      updateTabParams(state, tab.id, { relations: relationsOpen ? '0' : '1' })
    )
  // S07b: which node kinds the strip hides — same tab-state rung.
  const relationsHidden = relationsHiddenOf(tab.params)
  const onRelationsKindToggle = (kind: string): void => {
    const next = relationsHidden.includes(kind)
      ? relationsHidden.filter((k) => k !== kind)
      : [...relationsHidden, kind]
    dispatch((state) => updateTabParams(state, tab.id, { relhide: next.join(',') }))
  }
  // Any note's external http(s) link opens IN the workbench (S04b —
  // the web dossier's "Original URL" was a dead click; the web is one
  // tab away).
  const openWebUrl = (url: string): void =>
    dispatch((state) => addTab(state, paneId, makeTab('source-web', { url })))
  // Any view can open a capture bundle beside itself (03: "open source
  // dossier beside original" — here: original + dossier as one tab).
  const openSourceImage = (dossierPath: string): void =>
    dispatch((state) =>
      addTab(state, paneId, makeTab('source-image', { dossierPath }))
    )

  if (tab.view === 'new') {
    return (
      <NewTabFlow
        basePath={
          paneScope.kind === 'project'
            ? `${paneScope.projectPath}/generated.md`
            : 'generated.md'
        }
        onPick={(pick) => {
          const next = tabForPick(pick, paneScope)
          dispatch((state) => setTabView(state, tab.id, next.view, next.params))
        }}
        onCreated={(relPath) => {
          // the generated note opens IN this tab (S05e)
          const base = tabForPick('note', paneScope)
          dispatch((state) =>
            setTabView(state, tab.id, base.view, {
              ...(base.params ?? {}),
              notePath: relPath
            })
          )
        }}
        onClose={closeThisTab}
        closeLabel="Close tab"
      />
    )
  }
  if (tab.view === 'dev-docs') {
    return (
      <DevDocs
        docPath={tab.params?.['docPath']}
        onDocOpened={(relPath) =>
          dispatch((state) => updateTabParams(state, tab.id, { docPath: relPath }))
        }
      />
    )
  }
  if (tab.view === 'vault') {
    return (
      <VaultView
        onOpenSourceImage={openSourceImage}
        onOpenWebUrl={openWebUrl}
        historyKey={tab.id}
        notePath={tab.params?.['notePath']}
        onNoteOpened={(relPath) =>
          dispatch((state) => updateTabParams(state, tab.id, { notePath: relPath }))
        }
        registerGuard={registerGuard}
        onOpenChat={onOpenChat}
        onAddChatContext={onAddChatContext}
        mode={mode}
        onModeChange={onModeChange}
        saveMode={saveMode}
        onSaveModeToggle={onSaveModeToggle}
        relationsOpen={relationsOpen}
        onRelationsToggle={onRelationsToggle}
        relationsHidden={relationsHidden}
        onRelationsKindToggle={onRelationsKindToggle}
      />
    )
  }
  if (tab.view === 'chat') {
    return <ChatView tab={tab} paneId={paneId} dispatch={dispatch} />
  }
  if (tab.view === 'capture') {
    return (
      <Suspense fallback={<div className="view-loading" />}>
        <ImportView onOpenSourceImage={openSourceImage} />
      </Suspense>
    )
  }
  if (tab.view === 'source-web') {
    return (
      <WebView
        tabId={tab.id}
        initialUrl={tab.params?.['url']}
        onUrlChange={(url) =>
          dispatch((state) => updateTabParams(state, tab.id, { url }))
        }
        onImported={(dossierPath) =>
          // a web dossier is a SOURCE — it opens in the source view
          // (web-source panel + Extract reader button), not the editor
          dispatch((state) =>
            addTab(state, paneId, makeTab('source-image', { dossierPath }))
          )
        }
      />
    )
  }
  if (tab.view === 'source-image') {
    return (
      <Suspense fallback={<div className="view-loading" />}>
        <SourceImageView
          dossierPath={tab.params?.['dossierPath']}
          onDossierOpened={(relPath) =>
            dispatch((state) =>
              updateTabParams(state, tab.id, { dossierPath: relPath })
            )
          }
          onOpenWebUrl={openWebUrl}
          historyKey={tab.id}
          initialPdfPage={pdfPageOf(tab.params)}
          onPdfPageChange={(page) =>
            dispatch((state) =>
              updateTabParams(state, tab.id, { page: String(page) })
            )
          }
          dossierHidden={tab.params?.['dossierOff'] === '1'}
          onDossierToggle={(hidden) =>
            dispatch((state) =>
              updateTabParams(state, tab.id, { dossierOff: hidden ? '1' : '' })
            )
          }
        />
      </Suspense>
    )
  }
  if (tab.view === 'project') {
    return (
      <ProjectView
        onOpenWebUrl={openWebUrl}
        historyKey={tab.id}
        projectPath={tab.params?.['projectPath']}
        notePath={tab.params?.['notePath']}
        onCloseTab={closeThisTab}
        onProjectOpened={(project) =>
          // opening a project TYPES the pane (S07d): its tree panel
          // becomes the project tree until explicitly switched back
          dispatch((state) =>
            setPaneTreeScope(
              updateTabParams(state, tab.id, {
                projectPath: project.relPath,
                projectTitle: project.title
              }),
              paneId,
              {
                kind: 'project',
                projectPath: project.relPath,
                projectTitle: project.title
              }
            )
          )
        }
        onNoteOpened={(relPath) =>
          dispatch((state) => updateTabParams(state, tab.id, { notePath: relPath }))
        }
        registerGuard={registerGuard}
        onOpenChat={onOpenChat}
        onAddChatContext={onAddChatContext}
        mode={mode}
        onModeChange={onModeChange}
        saveMode={saveMode}
        onSaveModeToggle={onSaveModeToggle}
        relationsOpen={relationsOpen}
        onRelationsToggle={onRelationsToggle}
        relationsHidden={relationsHidden}
        onRelationsKindToggle={onRelationsKindToggle}
      />
    )
  }
  return <p className="pane-placeholder">unknown view: {tab.view}</p>
}

function LeafPane({
  node,
  focused,
  rootLeafId,
  dispatch
}: {
  node: Extract<PaneNode, { kind: 'leaf' }>
  focused: boolean
  /** The root leaf (when the root IS a leaf) can never be closed. */
  rootLeafId: string | null
  dispatch: Dispatch
}): React.JSX.Element {
  const active = node.tabs.find((tab) => tab.id === node.activeTabId)

  // S07d/S07e (owner): ONE tree panel per pane, typed by the PANE —
  // vault, project, or docs — chosen at pane birth (New Pane chooser)
  // and standing from then on: tabs are just views served from it, so
  // switching tabs (web included) never changes the panel. It spans
  // the full pane height, the tabstrip starts at its right, and the
  // hide/show toggle sits at the panel's bottom right. An UNTYPED pane
  // (fresh split, or the root after its ✕) has no panel yet.
  const untyped = node.tree === undefined
  const tree = paneTreeOf(node)
  const scope = paneTreeScopeOf(tree)
  // a CHAT pane's tabs ARE the conversations (S06c2); since S06c13 it
  // CAN carry the vault tree panel — hidden by default (paneTreeHidden
  // reads absent 'off' as hidden for chat), shown when it is the
  // workspace's only tree or the owner toggles it
  const isChatPane = scope.kind === 'chat'
  const treeHidden = paneTreeHidden(tree)
  const treeWidth = untyped || treeHidden ? 0 : paneTreeWidth(tree)

  // Note views register their dirty editor here (cleared on unmount);
  // the pane tree reads it at decision time.
  const guardRef = useRef<PaneNoteGuard | null>(null)
  const registerGuard = useCallback((guard: PaneNoteGuard | null) => {
    guardRef.current = guard
  }, [])
  const dirtyPath = useCallback(
    () => guardRef.current?.dirtyPath() ?? null,
    []
  )
  // S06c3: double-clicking a chat tab renames its TRANSCRIPT — the
  // relocate verb rewrites links and broadcasts, and the tab's file
  // param follows through the ordinary relocation path.
  const [renamingTab, setRenamingTab] = useState<{
    tabId: string
    value: string
  } | null>(null)
  const commitRename = useCallback(
    (tab: WorkspaceTab, draft: string): void => {
      setRenamingTab(null)
      const from = tab.params?.['file']
      if (!from) return
      const to = chatRenameTarget(from, draft)
      if (!to) return
      window.atomik.relocateApply(from, to).catch((reason: unknown) => {
        window.alert(`rename failed — ${String(reason)}`)
      })
    },
    []
  )

  // S06c: the chat is its OWN pane — open (or focus) it from here.
  const openChat = useCallback(
    () => dispatch((state) => openChatPane(state, node.id)),
    [dispatch, node.id]
  )
  // S06c15: once a chat pane exists its TAB is the door — the button
  // would only duplicate it
  const chatOpen = useWorkspace((store) =>
    store.state ? hasChatTab(store.state) : false
  )
  // S06c5b: the selection menu's "+ chat context" lands here.
  const addChatCtx = useCallback(
    (entry: string) =>
      dispatch((state) => addChatContext(state, node.id, entry)),
    [dispatch, node.id]
  )
  const saveMode = useWorkspace((store) => saveModeOf(store.state))
  // S07b9: a chat pane's tree door exists only for the sole survivor
  const soleLeaf = useWorkspace((store) =>
    store.state ? paneCount(store.state) === 1 : false
  )
  // S07b15 (owner): past chats live in the TAB NAVIGATION now — the
  // list loads lazily on open (fresh each time, vault-verb only).
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyEntries, setHistoryEntries] = useState<Array<{
    name: string
    relPath: string
  }> | null>(null)

  // Tree → tabs routing: a note lands in the active note view (it
  // follows its notePath param) or opens a new note tab of the pane's
  // kind; a dossier lands in the active source tab or a new one; a doc
  // (docs panes) in the active dev-docs tab or a new one.
  const openNoteFromTree = (relPath: string): void => {
    // S07b7 (owner): a CHAT pane's tree is a browser, never a tab
    // feeder — the conversation keeps its pane; the note activates
    // where it is already open, else opens in a fresh pane beside.
    if (scope.kind === 'chat') {
      dispatch((state) => revealNote(state, node.id, relPath))
      return
    }
    if (active && (active.view === 'vault' || active.view === 'project')) {
      dispatch((state) => updateTabParams(state, active.id, { notePath: relPath }))
      return
    }
    dispatch((state) =>
      addTab(
        state,
        node.id,
        scope.kind === 'project'
          ? makeTab('project', {
              projectPath: scope.projectPath,
              ...(scope.projectTitle ? { projectTitle: scope.projectTitle } : {}),
              notePath: relPath
            })
          : makeTab('vault', { notePath: relPath })
      )
    )
  }
  const openSourceFromTree = (dossierPath: string): void => {
    // S07b7: same rule for sources — the chat pane never adopts them
    if (scope.kind === 'chat') {
      dispatch((state) => revealSource(state, node.id, dossierPath))
      return
    }
    if (active && active.view === 'source-image') {
      dispatch((state) => updateTabParams(state, active.id, { dossierPath }))
      return
    }
    dispatch((state) =>
      addTab(state, node.id, makeTab('source-image', { dossierPath }))
    )
  }
  const openDocFromTree = (relPath: string): void => {
    if (active && active.view === 'dev-docs') {
      dispatch((state) => updateTabParams(state, active.id, { docPath: relPath }))
      return
    }
    dispatch((state) =>
      addTab(state, node.id, makeTab('dev-docs', { docPath: relPath }))
    )
  }
  // A New Pane pick is the pane's standing type (S07e). Projects stay
  // untyped until a bundle is actually opened — the picker tab's
  // onProjectOpened types the pane with the real projectPath.
  const pickPaneKind = (kind: PaneKindPick): void => {
    if (kind === 'project') {
      dispatch((state) => addTab(state, node.id, makeTab('project')))
      return
    }
    if (kind === 'chat') {
      // S06c2: chat is a pane TYPE — its tabs are conversations
      dispatch((state) =>
        addTab(
          setPaneTreeScope(state, node.id, { kind: 'chat' }),
          node.id,
          makeTab('chat')
        )
      )
      return
    }
    if (kind === 'web') {
      // S06c12: a web pane is a vault pane born with a web tab — the
      // tree starts hidden (the web is the point; openNoteInNewPane
      // precedent), and the + serves any tab type as usual
      dispatch((state) =>
        addTab(
          updatePaneTree(
            setPaneTreeScope(state, node.id, { kind: 'vault' }),
            node.id,
            { off: '1' }
          ),
          node.id,
          makeTab('source-web')
        )
      )
      return
    }
    dispatch((state) =>
      addTab(
        setPaneTreeScope(state, node.id, { kind }),
        node.id,
        makeTab(kind === 'docs' ? 'dev-docs' : 'vault')
      )
    )
  }
  const closeThisPane = (): void => {
    node.tabs.forEach(destroyTabView)
    dispatch((state) => closePane(state, node.id))
  }

  return (
    <section
      className={`pane${focused ? ' focused' : ''}`}
      style={{
        // the tree never eats a narrow pane (S06b): its stored width
        // caps at a fraction of the pane
        gridTemplateColumns: `min(${treeWidth}px, ${treeWidth === 0 ? '0%' : '35%'}) minmax(0, 1fr)`
      }}
      onPointerDownCapture={() => dispatch((state) => setFocus(state, node.id))}
    >
      <header className="tabstrip">
        <div
          className="tabstrip-tabs"
          onWheel={(event) => {
            // No visible scrollbar (it sat in the drag region): translate
            // vertical wheel into horizontal tab scrolling. Only the TABS
            // scroll — actions and window controls stay pinned right,
            // whatever the tab count (owner report: overflowing tabs
            // pushed the window buttons off-screen).
            if (event.deltaY !== 0 && event.deltaX === 0) {
              event.currentTarget.scrollLeft += event.deltaY
            }
          }}
        >
          {node.tabs.map((tab) => (
            <span
              key={tab.id}
              className={`tab${tab.id === node.activeTabId ? ' active' : ''}`}
              // S06c5: a note-bearing TAB drags like a tree row — its
              // note drops into the chat as context ('copy': adding a
              // context never consumes its source)
              {...(tabDragSource(tab)
                ? {
                    draggable: true,
                    onDragStart: (event: React.DragEvent) => {
                      event.dataTransfer.setData(
                        TREE_DRAG_MIME,
                        JSON.stringify(tabDragSource(tab))
                      )
                      event.dataTransfer.effectAllowed = 'copy'
                    }
                  }
                : {})}
            >
              {renamingTab?.tabId === tab.id ? (
                <input
                  className="tab-rename"
                  value={renamingTab.value}
                  aria-label="Rename chat"
                  autoFocus
                  onChange={(event) =>
                    setRenamingTab({ tabId: tab.id, value: event.target.value })
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitRename(tab, renamingTab.value)
                    if (event.key === 'Escape') setRenamingTab(null)
                  }}
                  onBlur={() => commitRename(tab, renamingTab.value)}
                />
              ) : (
                <button
                  type="button"
                  className="tab-title"
                  title={
                    tab.view === 'chat' && tab.params?.['file']
                      ? `${tab.params['file']} — double-click renames`
                      : (tab.params?.['notePath'] ??
                        tab.params?.['dossierPath'] ??
                        tab.params?.['docPath'] ??
                        tab.params?.['url'] ??
                        tab.view)
                  }
                  onClick={() => dispatch((state) => activateTab(state, node.id, tab.id))}
                  onDoubleClick={() => {
                    // chat transcripts rename in place (S06c3); a chat
                    // with no file yet has nothing to rename
                    if (tab.view === 'chat' && tab.params?.['file']) {
                      setRenamingTab({ tabId: tab.id, value: tabLabel(tab) })
                    }
                  }}
                >
                  {tabLabel(tab)}
                </button>
              )}
              <button
                type="button"
                className="tab-close"
                aria-label="Close tab"
                title="Close tab"
                onClick={() => {
                  destroyTabView(tab)
                  dispatch((state) => closeTab(state, node.id, tab.id))
                }}
              >
                <CloseIcon />
              </button>
            </span>
          ))}
          <button
            type="button"
            className="tab-new"
            title={isChatPane ? 'New chat tab' : 'New tab'}
            aria-label={isChatPane ? 'New chat tab' : 'New tab'}
            onClick={() =>
              dispatch((state) =>
                addTab(state, node.id, makeTab(isChatPane ? 'chat' : 'new'))
              )
            }
          >
            <PlusIcon />
          </button>
        </div>
        <span className="tabstrip-actions">
          {isChatPane && (
            <span className="chat-history">
              <button
                type="button"
                title="Past chats (transcripts in chats/)"
                aria-label="Past chats"
                aria-expanded={historyOpen}
                onClick={() => {
                  setHistoryOpen((open) => !open)
                  if (!historyOpen) {
                    window.atomik.listVaultFiles().then(
                      (loaded) => setHistoryEntries(chatHistoryOf(loaded)),
                      () => setHistoryEntries([])
                    )
                  }
                }}
              >
                <HistoryIcon />
              </button>
              {historyOpen && (
                <div
                  className="chat-pop"
                  role="listbox"
                  aria-label="Past chats"
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setHistoryOpen(false)
                  }}
                >
                  {(historyEntries ?? []).length === 0 && (
                    <p className="chat-pop-empty">
                      {historyEntries === null
                        ? 'loading…'
                        : 'no transcripts in chats/ yet'}
                    </p>
                  )}
                  {(historyEntries ?? []).map((entry) => (
                    <button
                      key={entry.relPath}
                      type="button"
                      role="option"
                      aria-selected={entry.relPath === active?.params?.['file']}
                      className={
                        entry.relPath === active?.params?.['file'] ? 'active' : ''
                      }
                      title={entry.relPath}
                      onClick={() => {
                        setHistoryOpen(false)
                        const chatTab =
                          active?.view === 'chat'
                            ? active
                            : node.tabs.find((tab) => tab.view === 'chat')
                        if (chatTab) {
                          dispatch((state) =>
                            openChatTranscript(
                              state,
                              node.id,
                              chatTab.id,
                              entry.relPath
                            )
                          )
                        }
                      }}
                    >
                      {entry.name}
                    </button>
                  ))}
                </div>
              )}
            </span>
          )}
          {!untyped && !isChatPane && !chatOpen && (
            <button
              type="button"
              title="Open chat pane"
              aria-label="Open chat pane"
              onClick={openChat}
            >
              <ChatIcon />
            </button>
          )}
          <button
            type="button"
            title="Split side by side"
            aria-label="Split side by side"
            onClick={() =>
              dispatch((state) => splitPane(state, node.id, 'horizontal'))
            }
          >
            <SplitHorizontalIcon />
          </button>
          <button
            type="button"
            title="Split stacked"
            aria-label="Split stacked"
            onClick={() =>
              dispatch((state) => splitPane(state, node.id, 'vertical'))
            }
          >
            <SplitVerticalIcon />
          </button>
          <button
            type="button"
            title={
              node.id === rootLeafId
                ? 'Close pane (back to the vault tree)'
                : 'Close pane'
            }
            aria-label="Close pane"
            onClick={closeThisPane}
          >
            <CloseIcon />
          </button>
        </span>
      </header>
      {!untyped && !treeHidden && (
        <PaneTreePanel
          tree={tree}
          activePath={
            active?.params?.['notePath'] ??
            active?.params?.['dossierPath'] ??
            active?.params?.['docPath'] ??
            null
          }
          saveMode={saveMode}
          dirtyPath={dirtyPath}
          onPatch={(patch) =>
            dispatch((state) => updatePaneTree(state, node.id, patch))
          }
          onScopeChange={(nextScope) =>
            dispatch((state) => setPaneTreeScope(state, node.id, nextScope))
          }
          onOpenNote={openNoteFromTree}
          onOpenSource={openSourceFromTree}
          onOpenDoc={openDocFromTree}
          onDeleted={(relPath) =>
            dispatch((state) => closeTabsWithin(state, node.id, relPath))
          }
        />
      )}
      <div className="pane-content">
        {/* S07b9 (owner): a CHAT pane offers no tree door — except as
            the SOLE survivor, where the tree must stay reachable
            (the S06c13 last-pane rule, now scoped to exactly that). */}
        {!untyped &&
          treeHidden &&
          (scope.kind !== 'chat' || soleLeaf) && (
          <button
            type="button"
            className="tree-toggle pane-tree-show"
            title="Show tree panel"
            onClick={() =>
              dispatch((state) => updatePaneTree(state, node.id, { off: '0' }))
            }
          >
            <SidebarToggleIcon />
          </button>
        )}
        {active ? (
          <TabContent
            key={active.id}
            tab={active}
            paneId={node.id}
            paneScope={scope}
            registerGuard={registerGuard}
            onOpenChat={openChat}
            onAddChatContext={addChatCtx}
            dispatch={dispatch}
          />
        ) : untyped ? (
          <NewPaneChooser
            onPick={pickPaneKind}
            onClose={
              node.id !== rootLeafId
                ? () => dispatch((state) => closeEmptyPane(state, node.id))
                : undefined
            }
            closeLabel="Close pane"
          />
        ) : (
          <NewTabChooser
            onPick={(pick) => {
              const next = tabForPick(pick, scope)
              dispatch((state) =>
                addTab(state, node.id, makeTab(next.view, next.params))
              )
            }}
            onClose={
              node.id !== rootLeafId
                ? () => dispatch((state) => closeEmptyPane(state, node.id))
                : undefined
            }
            closeLabel="Close pane"
          />
        )}
      </div>
    </section>
  )
}

function SplitPaneView({
  node,
  focusedPaneId,
  rootLeafId,
  dispatch
}: {
  node: Extract<PaneNode, { kind: 'split' }>
  focusedPaneId: string
  rootLeafId: string | null
  dispatch: Dispatch
}): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)

  const onDividerPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      const container = containerRef.current
      if (!container) return
      const divider = event.currentTarget
      divider.setPointerCapture(event.pointerId)
      const horizontal = node.direction === 'horizontal'
      // Both the measure (reflow) and the dispatch (full workspace
      // render) run once per painted frame, not once per event (S07j).
      const applyPoint = frameCoalesced<{ x: number; y: number }>(
        ({ x, y }) => {
          const rect = container.getBoundingClientRect()
          const fraction = horizontal
            ? (x - rect.left) / rect.width
            : (y - rect.top) / rect.height
          dispatch((state) => setFraction(state, node.id, fraction))
        }
      )
      const onMove = (move: PointerEvent): void => {
        applyPoint({ x: move.clientX, y: move.clientY })
      }
      const onUp = (): void => {
        divider.removeEventListener('pointermove', onMove)
        divider.removeEventListener('pointerup', onUp)
      }
      divider.addEventListener('pointermove', onMove)
      divider.addEventListener('pointerup', onUp)
    },
    [dispatch, node.direction, node.id]
  )

  return (
    <div ref={containerRef} className={`pane-split ${node.direction}`}>
      <div className="pane-split-first" style={{ flexBasis: `${node.fraction * 100}%` }}>
        <PaneNodeView
          node={node.first}
          focusedPaneId={focusedPaneId}
          rootLeafId={rootLeafId}
          dispatch={dispatch}
        />
      </div>
      <div
        className="pane-divider"
        role="separator"
        aria-orientation={node.direction === 'horizontal' ? 'vertical' : 'horizontal'}
        onPointerDown={onDividerPointerDown}
      />
      <div className="pane-split-second">
        <PaneNodeView
          node={node.second}
          focusedPaneId={focusedPaneId}
          rootLeafId={rootLeafId}
          dispatch={dispatch}
        />
      </div>
    </div>
  )
}

function PaneNodeView({
  node,
  focusedPaneId,
  rootLeafId,
  dispatch
}: {
  node: PaneNode
  focusedPaneId: string
  rootLeafId: string | null
  dispatch: Dispatch
}): React.JSX.Element {
  return node.kind === 'leaf' ? (
    <LeafPane
      node={node}
      focused={node.id === focusedPaneId}
      rootLeafId={rootLeafId}
      dispatch={dispatch}
    />
  ) : (
    <SplitPaneView
      node={node}
      focusedPaneId={focusedPaneId}
      rootLeafId={rootLeafId}
      dispatch={dispatch}
    />
  )
}

export function Workspace(): React.JSX.Element {
  const state = useWorkspace((store) => store.state)
  const load = useWorkspace((store) => store.load)
  const dispatch = useWorkspace((store) => store.dispatch)

  useEffect(() => {
    void load()
  }, [load])

  // CP-MVP-007 S04: open tabs FOLLOW a renamed/moved note — every pane,
  // not just the one that triggered the refactor.
  useEffect(
    () =>
      window.atomik.onNoteRelocated(({ from, to }) =>
        dispatch((state) => relocateTabPaths(state, from, to))
      ),
    [dispatch]
  )

  // Theme lands on <html data-theme>; 'system' removes it so the
  // light-dark() tokens follow the OS again.
  const theme = themeOf(state)
  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset['theme']
    else document.documentElement.dataset['theme'] = theme
  }, [theme])

  // S05s: the note font size overrides --note-font-size on :root —
  // every derived note token (headings, block gap, indents) follows
  // in BOTH modes; absent = the stylesheet default.
  const noteFontSize = noteFontSizeOf(state)
  useEffect(() => {
    if (noteFontSize === null) {
      document.documentElement.style.removeProperty('--note-font-size')
    } else {
      document.documentElement.style.setProperty(
        '--note-font-size',
        `${noteFontSize}px`
      )
    }
  }, [noteFontSize])

  // S05u: the note column width — same contract, --note-column.
  const noteWidth = noteWidthOf(state)
  useEffect(() => {
    if (noteWidth === null) {
      document.documentElement.style.removeProperty('--note-column')
    } else {
      document.documentElement.style.setProperty(
        '--note-column',
        `${noteWidth}px`
      )
    }
  }, [noteWidth])

  if (!state) return <p className="workspace-loading">loading workspace…</p>

  return (
    <div className="workspace">
      <PaneNodeView
        node={state.root}
        focusedPaneId={state.focusedPaneId}
        rootLeafId={state.root.kind === 'leaf' ? state.root.id : null}
        dispatch={dispatch}
      />
    </div>
  )
}
