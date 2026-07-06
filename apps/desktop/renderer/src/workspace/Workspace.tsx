import { useCallback, useEffect, useRef } from 'react'
import type {
  PaneNode,
  WorkspaceState,
  WorkspaceTab
} from '../../../shared/ipc-contract'
import { DevDocs } from '../dev-docs/DevDocs'
import { ProjectView } from '../project/ProjectView'
import { ShellHome } from '../ShellHome'
import { VaultView } from '../vault/VaultView'
import {
  activateTab,
  addTab,
  closeTab,
  makeTab,
  setFocus,
  setFraction,
  splitPane,
  updateTabParams
} from './model'
import { useWorkspace } from './store'

type Dispatch = (operation: (state: WorkspaceState) => WorkspaceState) => void

const TAB_LABELS: Record<string, string> = {
  home: 'Shell',
  'dev-docs': 'Dev Docs',
  vault: 'Vault',
  project: 'Project'
}

function tabLabel(tab: WorkspaceTab): string {
  if (tab.view === 'project' && tab.params?.['projectTitle']) {
    return tab.params['projectTitle']
  }
  const pathParam =
    tab.view === 'dev-docs'
      ? tab.params?.['docPath']
      : tab.view === 'vault'
        ? tab.params?.['notePath']
        : undefined
  if (pathParam) return pathParam.slice(pathParam.lastIndexOf('/') + 1)
  return TAB_LABELS[tab.view] ?? tab.view
}

function TabContent({
  tab,
  dispatch
}: {
  tab: WorkspaceTab
  dispatch: Dispatch
}): React.JSX.Element {
  const treeCollapsed = tab.params?.['tree'] === 'off'
  const onTreeToggle = (): void =>
    dispatch((state) =>
      updateTabParams(state, tab.id, { tree: treeCollapsed ? 'on' : 'off' })
    )
  const mode = tab.params?.['mode'] === 'edit' ? ('edit' as const) : ('read' as const)
  const onModeChange = (next: 'read' | 'edit'): void =>
    dispatch((state) => updateTabParams(state, tab.id, { mode: next }))

  if (tab.view === 'home') return <ShellHome />
  if (tab.view === 'dev-docs') {
    return (
      <DevDocs
        docPath={tab.params?.['docPath']}
        onDocOpened={(relPath) =>
          dispatch((state) => updateTabParams(state, tab.id, { docPath: relPath }))
        }
        treeCollapsed={treeCollapsed}
        onTreeToggle={onTreeToggle}
      />
    )
  }
  if (tab.view === 'vault') {
    return (
      <VaultView
        notePath={tab.params?.['notePath']}
        onNoteOpened={(relPath) =>
          dispatch((state) => updateTabParams(state, tab.id, { notePath: relPath }))
        }
        treeCollapsed={treeCollapsed}
        onTreeToggle={onTreeToggle}
        mode={mode}
        onModeChange={onModeChange}
      />
    )
  }
  if (tab.view === 'project') {
    return (
      <ProjectView
        projectPath={tab.params?.['projectPath']}
        notePath={tab.params?.['notePath']}
        onProjectOpened={(project) =>
          dispatch((state) =>
            updateTabParams(state, tab.id, {
              projectPath: project.relPath,
              projectTitle: project.title
            })
          )
        }
        onNoteOpened={(relPath) =>
          dispatch((state) => updateTabParams(state, tab.id, { notePath: relPath }))
        }
        treeCollapsed={treeCollapsed}
        onTreeToggle={onTreeToggle}
        mode={mode}
        onModeChange={onModeChange}
      />
    )
  }
  return <p className="pane-placeholder">unknown view: {tab.view}</p>
}

function LeafPane({
  node,
  focused,
  dispatch
}: {
  node: Extract<PaneNode, { kind: 'leaf' }>
  focused: boolean
  dispatch: Dispatch
}): React.JSX.Element {
  const active = node.tabs.find((tab) => tab.id === node.activeTabId)
  return (
    <section
      className={`pane${focused ? ' focused' : ''}`}
      onPointerDownCapture={() => dispatch((state) => setFocus(state, node.id))}
    >
      <header className="tabstrip">
        {node.tabs.map((tab) => (
          <span
            key={tab.id}
            className={`tab${tab.id === node.activeTabId ? ' active' : ''}`}
          >
            <button
              type="button"
              className="tab-title"
              title={tab.params?.['docPath'] ?? tab.view}
              onClick={() => dispatch((state) => activateTab(state, node.id, tab.id))}
            >
              {tabLabel(tab)}
            </button>
            <button
              type="button"
              className="tab-close"
              aria-label="Close tab"
              onClick={() => dispatch((state) => closeTab(state, node.id, tab.id))}
            >
              ×
            </button>
          </span>
        ))}
        <span className="tabstrip-actions">
          <button
            type="button"
            title="New Project tab"
            onClick={() =>
              dispatch((state) => addTab(state, node.id, makeTab('project')))
            }
          >
            +project
          </button>
          <button
            type="button"
            title="New Vault tab"
            onClick={() =>
              dispatch((state) => addTab(state, node.id, makeTab('vault')))
            }
          >
            +vault
          </button>
          <button
            type="button"
            title="New Dev Docs tab"
            onClick={() =>
              dispatch((state) => addTab(state, node.id, makeTab('dev-docs')))
            }
          >
            +docs
          </button>
          <button
            type="button"
            title="New Shell tab"
            onClick={() =>
              dispatch((state) => addTab(state, node.id, makeTab('home')))
            }
          >
            +shell
          </button>
          <button
            type="button"
            title="Split side by side"
            onClick={() =>
              dispatch((state) => splitPane(state, node.id, 'horizontal'))
            }
          >
            ◫
          </button>
          <button
            type="button"
            title="Split stacked"
            onClick={() =>
              dispatch((state) => splitPane(state, node.id, 'vertical'))
            }
          >
            ⬓
          </button>
        </span>
      </header>
      <div className="pane-content">
        {active ? (
          <TabContent key={active.id} tab={active} dispatch={dispatch} />
        ) : (
          <p className="pane-placeholder">
            empty pane — open a tab with +docs or +shell
          </p>
        )}
      </div>
    </section>
  )
}

function SplitPaneView({
  node,
  focusedPaneId,
  dispatch
}: {
  node: Extract<PaneNode, { kind: 'split' }>
  focusedPaneId: string
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
      const onMove = (move: PointerEvent): void => {
        const rect = container.getBoundingClientRect()
        const fraction = horizontal
          ? (move.clientX - rect.left) / rect.width
          : (move.clientY - rect.top) / rect.height
        dispatch((state) => setFraction(state, node.id, fraction))
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
          dispatch={dispatch}
        />
      </div>
    </div>
  )
}

function PaneNodeView({
  node,
  focusedPaneId,
  dispatch
}: {
  node: PaneNode
  focusedPaneId: string
  dispatch: Dispatch
}): React.JSX.Element {
  return node.kind === 'leaf' ? (
    <LeafPane node={node} focused={node.id === focusedPaneId} dispatch={dispatch} />
  ) : (
    <SplitPaneView node={node} focusedPaneId={focusedPaneId} dispatch={dispatch} />
  )
}

export function Workspace(): React.JSX.Element {
  const state = useWorkspace((store) => store.state)
  const load = useWorkspace((store) => store.load)
  const dispatch = useWorkspace((store) => store.dispatch)

  useEffect(() => {
    void load()
  }, [load])

  if (!state) return <p className="workspace-loading">loading workspace…</p>

  return (
    <div className="workspace">
      <PaneNodeView
        node={state.root}
        focusedPaneId={state.focusedPaneId}
        dispatch={dispatch}
      />
    </div>
  )
}
