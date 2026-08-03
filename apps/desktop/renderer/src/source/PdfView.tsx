import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { AnchorIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons'
import { base64ToBytes } from './bytes'

/**
 * The PDF page viewer (CP-MVP-003 S04, bedrock 10): pdf.js in the
 * SANDBOXED renderer, worker from the local bundle (CSP forbids
 * remote). pdf.js 6.x removed the eval'd font path entirely, retiring
 * CVE-2024-4367 by construction (the S02 posture, now structural
 * upstream). Display only — extraction is main's job (S05); renderer
 * fidelity and extraction fidelity stay separate claims.
 */

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export function PdfView({
  dataUrl,
  requestedPage,
  initialPage,
  onPageChange,
  onAnchorPage,
  onAnchorPassage
}: {
  dataUrl: string
  /** Citation return (S06): a jump request; a NEW object each time (even
   *  for the same page) so a repeat click re-navigates. */
  requestedPage?: { page: number } | null
  /** Restore (S07, 03 recoverable UI state): the page the tab param
   *  recorded — read once at mount; a citation return outranks it. */
  initialPage?: number
  /** Reports page turns so the tab param can follow. */
  onPageChange?: (page: number) => void
  /** "Anchor this page" — records a durable page anchor in the dossier. */
  onAnchorPage?: (page: number) => void
  /** S07b6 (owner): "Anchor selection" — records a durable PASSAGE
   *  anchor (page + exact quote) in the dossier. */
  onAnchorPassage?: (page: number, quote: string) => void
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const textLayerRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const docRef = useRef<pdfjs.PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(requestedPage?.page ?? initialPage ?? 1)
  const [error, setError] = useState<string | null>(null)
  /** The live selection inside OUR text layer ('' = none). */
  const [selectedText, setSelectedText] = useState('')

  // page turns persist as the tab's page param — reopening the tab (or
  // the app) returns to this page
  useEffect(() => {
    onPageChange?.(page)
    // page-driven: the freshest callback of that render is the right one
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  // citation return: jump when a request arrives (and is real)
  useEffect(() => {
    const want = requestedPage?.page
    if (want && want >= 1) {
      setPage(numPages ? Math.min(want, numPages) : want)
    }
  }, [requestedPage, numPages])

  // the pane's real width — 0 at mount in a fresh tab (layout races the
  // effect; the owner's "blank until poked"), so the render effect waits
  // for the observer's first real measurement and follows pane resizes.
  const [hostWidth, setHostWidth] = useState(0)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let timer: number | undefined
    let measuredOnce = false
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      const apply = (): void =>
        setHostWidth((current) => (Math.abs(current - width) > 1 ? width : current))
      window.clearTimeout(timer)
      // the FIRST real measurement lands immediately (the blank-until-
      // poked race needs it); later changes settle 120 ms — a divider
      // drag was re-rastering the page at full res per pointermove
      // (perf audit 2026-07-15)
      if (!measuredOnce && width > 0) {
        measuredOnce = true
        apply()
      } else {
        timer = window.setTimeout(apply, 120)
      }
    })
    observer.observe(host)
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  // load the document from the gated bytes
  useEffect(() => {
    let cancelled = false
    const base64 = dataUrl.slice(dataUrl.indexOf('base64,') + 7)
    const bytes = base64ToBytes(base64)
    const task = pdfjs.getDocument({ data: bytes })
    task.promise.then(
      (doc) => {
        if (cancelled) return
        docRef.current = doc
        setNumPages(doc.numPages)
        setPage((current) => Math.min(Math.max(1, current), doc.numPages))
      },
      (cause: unknown) => {
        if (!cancelled) setError(`pdf: ${String(cause)}`)
      }
    )
    return () => {
      cancelled = true
      docRef.current = null
      // destroying the loading task tears down document and worker both
      void task.destroy()
    }
    // dataUrl identifies the document
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUrl])

  // render the current page, fitted to the host width (waits for a real
  // measurement — rendering into a 0-width pane is the blank-view bug).
  // Exactly ONE render at a time: pdf.js refuses overlapping render()
  // calls on the same canvas, so the previous task is CANCELLED first
  // (the owner hit the race by flipping pages during a resize).
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)
  const textLayerTaskRef = useRef<{ cancel: () => void } | null>(null)
  useEffect(() => {
    if (numPages === 0 || hostWidth < 40) return
    let cancelled = false
    void (async () => {
      const doc = docRef.current
      const canvas = canvasRef.current
      if (!doc || !canvas) return
      try {
        const pdfPage = await doc.getPage(page)
        if (cancelled) return
        const probe = pdfPage.getViewport({ scale: 1 })
        const scale = Math.max(0.25, (hostWidth - 24) / probe.width)
        const ratio = window.devicePixelRatio || 1
        const viewport = pdfPage.getViewport({ scale: scale * ratio })
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = `${viewport.width / ratio}px`
        canvas.style.height = `${viewport.height / ratio}px`
        const context = canvas.getContext('2d')
        if (!context) return
        renderTaskRef.current?.cancel()
        const task = pdfPage.render({ canvas, canvasContext: context, viewport })
        renderTaskRef.current = task
        await task.promise
        // S07b6: the TEXT LAYER over the raster — pdf.js positions
        // transparent spans over the painted glyphs, so the page text
        // selects like any text (the anchor + quote flows read the
        // selection). CSS-pixel viewport: spans live in layout space,
        // the devicePixelRatio belongs to the raster alone.
        const layer = textLayerRef.current
        if (layer && !cancelled) {
          textLayerTaskRef.current?.cancel()
          layer.replaceChildren()
          layer.style.width = canvas.style.width
          layer.style.height = canvas.style.height
          layer.style.setProperty('--total-scale-factor', String(scale))
          const textLayer = new pdfjs.TextLayer({
            textContentSource: pdfPage.streamTextContent(),
            container: layer,
            viewport: pdfPage.getViewport({ scale })
          })
          textLayerTaskRef.current = textLayer
          await textLayer.render()
        }
      } catch (cause) {
        // a cancelled render is the mechanism working, not an error
        const name = (cause as { name?: string } | null)?.name
        if (!cancelled && name !== 'RenderingCancelledException') {
          setError(`pdf render: ${String(cause)}`)
        }
      }
    })()
    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
      textLayerTaskRef.current?.cancel()
    }
  }, [page, numPages, hostWidth])

  // S07b6: track the document selection; only a selection that lives
  // inside OUR text layer arms the anchor-selection button.
  useEffect(() => {
    const onSelectionChange = (): void => {
      const layer = textLayerRef.current
      const selection = document.getSelection()
      const text = selection?.toString().trim() ?? ''
      const inLayer =
        !!layer &&
        !!selection &&
        selection.rangeCount > 0 &&
        layer.contains(selection.getRangeAt(0).commonAncestorContainer)
      setSelectedText(inLayer ? text : '')
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () =>
      document.removeEventListener('selectionchange', onSelectionChange)
  }, [])

  if (error) return <p className="error">{error}</p>
  return (
    <div className="pdf-view" ref={hostRef}>
      <div className="pdf-nav">
        <button
          type="button"
          className="note-bar-button icon-button"
          disabled={page <= 1}
          title="Previous page"
          aria-label="Previous page"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          <ChevronLeftIcon />
        </button>
        <span className="pdf-nav-status">
          page {page} / {numPages || '…'}
        </span>
        <button
          type="button"
          className="note-bar-button icon-button"
          disabled={numPages === 0 || page >= numPages}
          title="Next page"
          aria-label="Next page"
          onClick={() => setPage((p) => Math.min(numPages, p + 1))}
        >
          <ChevronRightIcon />
        </button>
        {onAnchorPage && numPages > 0 && (
          <button
            type="button"
            className="note-bar-button"
            title={`Record a durable anchor to page ${page} in the dossier`}
            onClick={() => onAnchorPage(page)}
          >
            <AnchorIcon /> Anchor page {page}
          </button>
        )}
        {onAnchorPassage && selectedText.length > 0 && (
          <button
            type="button"
            className="note-bar-button"
            title="Record a durable anchor to the highlighted passage (page + exact quote) in the dossier"
            onClick={() => onAnchorPassage(page, selectedText)}
          >
            <AnchorIcon /> Anchor selection
          </button>
        )}
      </div>
      <div className="pdf-page">
        <canvas ref={canvasRef} className="pdf-canvas" />
        <div ref={textLayerRef} className="textLayer" />
      </div>
    </div>
  )
}
