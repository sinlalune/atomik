import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '../icons'
import { humanizeLabel } from '../editor/link-pills'
import {
  CENTER_W,
  NODE_W,
  filterNeighborhood,
  kindsPresent,
  layoutRelations,
  neighborhoodOf,
  relationsSummary,
  type Neighborhood,
  type PlacedNode,
  type RelationsLayout
} from './relations-graph'

export type RelationsStripProps = {
  /** The note whose 1-hop neighbourhood is drawn. */
  notePath: string
  /** Changes when the note's content changes — the index is
   *  invalidated by every write verb, so a save must repaint. */
  revision?: string | number
  open: boolean
  onToggle: () => void
  /** Opens a neighbour (through the host's GUARDED navigation). */
  onOpenNote: (relPath: string) => void
  /** Node kinds the strip is hiding, persisted per tab (S07b). */
  hiddenKinds?: readonly string[]
  onToggleKind?: (kind: string) => void
}

/**
 * Relations strip (CP-MVP-009 S07): the note seen from the OTHER end
 * of its edges — who points at it, what it points at, with the label
 * as authored. A mini-graph rather than a list, per the owner's S07
 * ruling ("why not directly an ontology in a canvas"): this is the
 * note-scale v0 of the studio's graph layer, reading the same
 * nodes/edges index the canvas will project later (bedrock 21).
 *
 * Bottom strip, collapsible; the open/closed bit is recoverable UI
 * state persisted on the TAB (03), never knowledge. Nothing here
 * writes: it is a projection with one interaction — click a node to
 * open it.
 */
export function RelationsStrip({
  notePath,
  revision,
  open,
  onToggle,
  onOpenNote,
  hiddenKinds = [],
  onToggleKind
}: RelationsStripProps): React.JSX.Element {
  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(null)
  const [width, setWidth] = useState(720)
  const canvasRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    void window.atomik
      .readGraphIndex()
      .then((index) => {
        if (cancelled) return
        setNeighborhood(neighborhoodOf(index, notePath))
      })
      .catch(() => {
        if (!cancelled) setNeighborhood(null)
      })
    return () => {
      cancelled = true
    }
  }, [notePath, revision])

  // The graph is laid out in the strip's own px space: re-measure on
  // pane resize so the columns keep their distance from the center.
  useLayoutEffect(() => {
    const el = canvasRef.current
    if (!el || !open) return
    // clientWidth INCLUDES padding: laying the figure out at that width
    // made the strip scroll sideways by exactly one gutter (first pin).
    const measure = (): void => {
      const style = getComputedStyle(el)
      const pad = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      setWidth(Math.max(el.clientWidth - pad, 0))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [open, neighborhood])

  // The filter is a VIEW act: the neighbourhood keeps the whole truth
  // (the bar's counts), the figure draws the kept kinds.
  const hidden = new Set(hiddenKinds)
  const shown = neighborhood ? filterNeighborhood(neighborhood, hidden) : null
  const summary = neighborhood
    ? relationsSummary(neighborhood, shown ?? undefined)
    : 'reading index…'
  const empty =
    neighborhood !== null &&
    neighborhood.inbound.length === 0 &&
    neighborhood.outbound.length === 0
  const allFiltered =
    shown !== null && !empty && shown.inbound.length === 0 && shown.outbound.length === 0
  const layout: RelationsLayout | null =
    shown && !empty && !allFiltered ? layoutRelations(shown, width) : null

  return (
    <section className={`relations-strip${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="relations-bar"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`Relations — ${summary}`}
        title="Relations of this note (inbound and outbound edges)"
      >
        <span className="relations-bar-title">Relations</span>
        <span className="relations-bar-count">{summary}</span>
        <span className="relations-bar-chevron" aria-hidden="true">
          {open ? <ChevronDownIcon /> : <ChevronUpIcon />}
        </span>
      </button>
      {open && neighborhood !== null && !empty && onToggleKind && (
        <KindFilter
          neighborhood={neighborhood}
          hidden={hidden}
          onToggleKind={onToggleKind}
        />
      )}
      {open && (
        <div className="relations-canvas" ref={canvasRef}>
          {neighborhood === null ? (
            <p className="relations-empty">reading the graph index…</p>
          ) : empty ? (
            <p className="relations-empty">
              No note links to this one, and it links to no note yet — write a{' '}
              <code>[[link]]</code> to start the graph.
            </p>
          ) : allFiltered ? (
            <p className="relations-empty">
              Every neighbour is hidden by the type filter.
            </p>
          ) : (
            layout && (
              <RelationsFigure layout={layout} onOpenNote={onOpenNote} />
            )
          )}
        </div>
      )}
    </section>
  )
}

/** The type filter (S07b owner bench: folder indexes and sources link
 *  a lot, and the picture should show what the owner is after). Only
 *  the kinds actually present are offered, each a pill of its own kind
 *  wearing the same recipe as the nodes it governs; pressed = shown. */
function KindFilter({
  neighborhood,
  hidden,
  onToggleKind
}: {
  neighborhood: Neighborhood
  hidden: ReadonlySet<string>
  onToggleKind: (kind: string) => void
}): React.JSX.Element | null {
  const kinds = kindsPresent(neighborhood)
  if (kinds.length < 2) return null
  return (
    <div className="relations-filter" role="group" aria-label="Filter neighbours by type">
      {kinds.map(({ kind, count }) => {
        const on = !hidden.has(kind)
        return (
          <button
            key={kind}
            type="button"
            className={`link-pill link-pill--${kind} relations-kind${on ? '' : ' is-off'}`}
            aria-pressed={on}
            title={`${on ? 'Hide' : 'Show'} ${kind} neighbours`}
            onClick={() => onToggleKind(kind)}
          >
            {kind}
            <span className="relations-kind-count">{count}</span>
          </button>
        )
      })}
    </div>
  )
}

/** The connector's caption: every TYPED label written between the two
 *  notes, as authored (no invented inverse — owner ruling). An untyped
 *  link captions nothing; the quieter curve is its whole statement. */
function edgeLabelText(labels: { label: string | null; count: number }[]): string {
  return labels
    .filter((entry): entry is { label: string; count: number } => entry.label !== null)
    .map((entry) => humanizeLabel(entry.label) + (entry.count > 1 ? ` ×${entry.count}` : ''))
    .join(' · ')
}

function RelationsFigure({
  layout,
  onOpenNote
}: {
  layout: RelationsLayout
  onOpenNote: (relPath: string) => void
}): React.JSX.Element {
  return (
    <div className="relations-figure" style={{ height: `${layout.height}px` }}>
      <svg
        className="relations-edges"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width={layout.width}
        height={layout.height}
        aria-hidden="true"
      >
        <defs>
          <marker
            id="relations-arrow"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M1 1 L7 4 L1 7" fill="none" stroke="currentColor" strokeWidth="1.3" />
          </marker>
        </defs>
        {layout.links.map((link) => {
          const text = edgeLabelText(link.labels)
          return (
            <g
              key={`${link.direction} ${link.path}`}
              className={`relations-edge${text === '' ? ' is-untyped' : ''}`}
            >
              <path d={link.d} markerEnd="url(#relations-arrow)" />
              {text !== '' && (
                <text x={link.labelX} y={link.labelY - 6} textAnchor="middle">
                  {text}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {layout.nodes.map((node) => (
        <RelationNode
          key={`${node.side} ${node.path}`}
          node={node}
          onOpenNote={onOpenNote}
        />
      ))}
    </div>
  )
}

function RelationNode({
  node,
  onOpenNote
}: {
  node: PlacedNode
  onOpenNote: (relPath: string) => void
}): React.JSX.Element {
  const style = {
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${node.side === 'center' ? CENTER_W : NODE_W}px`
  }
  // The pill recipe, unforked (36): one .link-pill + its kind modifier,
  // exactly like the pills inside the note's own text.
  const className = `link-pill link-pill--${node.kind} relations-node relations-node--${node.side}`
  if (node.side === 'center') {
    return (
      <span className={className} style={style} title={node.path}>
        <span className="relations-node-text">{node.title}</span>
      </span>
    )
  }
  return (
    <button
      type="button"
      className={className}
      style={style}
      title={`Open ${node.path}`}
      onClick={() => onOpenNote(node.path)}
    >
      <span className="relations-node-text">{node.title}</span>
    </button>
  )
}
